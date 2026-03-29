const express = require('express');
const { pool } = require('../config/database');
const { auth, requireAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const router = express.Router();

// Helper to get cart items
const getCartItems = async (userId, sessionId) => {
  const query = `
    SELECT 
      ci.*,
      p.name as product_name,
      p.price as product_price,
      pv.name as variant_name,
      pv.price as variant_price
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE ${userId ? 'ci.user_id' : 'ci.session_id'} = $1
  `;
  const { rows } = await pool.query(query, [userId || sessionId]);
  return rows;
};

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const { shipping_address, guest_email, guest_name, guest_phone, notes, session_id } = req.body;
    const userId = req.user?.id;

    if (!shipping_address) {
      return res.status(400).json({ error: { message: 'Shipping address is required' } });
    }

    if (!userId) {
      if (!session_id) return res.status(400).json({ error: { message: 'Session ID required for guest checkout' } });
      if (!guest_email || !guest_name) return res.status(400).json({ error: { message: 'Guest email and name are required' } });
    }

    const cartItems = await getCartItems(userId, session_id);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Cart is empty' } });
    }

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += parseFloat(item.variant_price || item.product_price) * item.quantity;
    }
    const shipping_cost = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shipping_cost;

    const { rows: orderRows } = await pool.query(`
      INSERT INTO orders (user_id, guest_email, guest_name, guest_phone, shipping_address_text, subtotal, shipping_cost, total, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
    `, [userId || null, guest_email || null, guest_name || null, guest_phone || null, shipping_address, subtotal, shipping_cost, total, notes || null]);

    const orderId = orderRows[0].id;

    for (const item of cartItems) {
      const price = parseFloat(item.variant_price || item.product_price);
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, price, item.quantity, price * item.quantity]
      );
    }

    // Clear cart
    if (userId) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM cart_items WHERE session_id = $1', [session_id]);
    }

    // Send email
    try {
      let customerEmail = guest_email;
      let customerName = guest_name || 'Valued Customer';
      if (userId) {
        const { rows: userRows } = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
        if (userRows.length > 0) { customerEmail = userRows[0].email; customerName = userRows[0].name; }
      }
      if (customerEmail) {
        sendOrderConfirmationEmail({
          orderId, email: customerEmail, customerName,
          items: cartItems.map(i => ({ ...i, price: i.variant_price || i.product_price })),
          subtotal, shippingCost: shipping_cost, total, shippingAddress: shipping_address
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.status(201).json({ message: 'Order created successfully', order: { id: orderId, total, subtotal, shipping_cost } });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: { message: 'Failed to create order' } });
  }
});

// Checkout
router.post('/checkout', auth, async (req, res) => {
  console.log('\n📦 Checkout route hit!');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  try {
    const { shipping_address, guest_email, guest_name, guest_phone, notes, session_id, payment_method } = req.body;
    const userId = req.user?.id;
    const selectedPayment = payment_method || 'cod';

    if (!shipping_address) {
      return res.status(400).json({ error: { message: 'Shipping address is required' } });
    }

    if (!userId) {
      if (!session_id) return res.status(400).json({ error: { message: 'Session ID required for guest checkout' } });
      if (!guest_email || !guest_name) return res.status(400).json({ error: { message: 'Guest email and name are required' } });
    }

    const cartItems = await getCartItems(userId, session_id);
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Cart is empty' } });
    }

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += parseFloat(item.variant_price || item.product_price) * item.quantity;
    }
    const shipping_cost = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shipping_cost;

    const { rows: orderRows } = await pool.query(`
      INSERT INTO orders (user_id, guest_email, guest_name, guest_phone, shipping_address_text, subtotal, shipping_cost, total, notes, status, payment_status, payment_method)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
    `, [userId || null, guest_email || null, guest_name || null, guest_phone || null, shipping_address, subtotal, shipping_cost, total, notes || null, 'pending', 'pending', selectedPayment]);

    const orderId = orderRows[0].id;
    console.log('✅ Order created with ID:', orderId);

    for (const item of cartItems) {
      const price = parseFloat(item.variant_price || item.product_price);
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [orderId, item.product_id, item.variant_id, item.product_name, item.variant_name, price, item.quantity, price * item.quantity]
      );
    }

    if (userId) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM cart_items WHERE session_id = $1', [session_id]);
    }

    // Send email
    try {
      let customerEmail = guest_email;
      let customerName = guest_name || 'Valued Customer';
      if (userId) {
        const { rows: userRows } = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
        if (userRows.length > 0) { customerEmail = userRows[0].email; customerName = userRows[0].name; }
      }
      console.log('📧 Sending email to:', customerEmail);
      if (customerEmail) {
        sendOrderConfirmationEmail({
          orderId, email: customerEmail, customerName,
          items: cartItems.map(i => ({ ...i, price: i.variant_price || i.product_price })),
          subtotal, shippingCost: shipping_cost, total, shippingAddress: shipping_address
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.status(201).json({ message: 'Order placed successfully', order: { id: orderId, total, subtotal, shipping_cost } });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: { message: 'Failed to process checkout' } });
  }
});

// Get user's orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows: orders } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch orders' } });
  }
});

// Get single order
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    let order;
    if (userId) {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, userId]);
      order = rows[0];
    } else {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      order = rows[0];
    }

    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    const { rows: items } = await pool.query(
      'SELECT *, unit_price as price FROM order_items WHERE order_id = $1',
      [order.id]
    );

    res.json({ order: { ...order, items } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch order' } });
  }
});

module.exports = router;
