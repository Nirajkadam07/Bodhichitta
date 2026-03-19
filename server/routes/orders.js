const express = require('express');
const { db } = require('../config/database');
const { auth, requireAuth } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const router = express.Router();

// Create order
router.post('/', auth, (req, res) => {
  try {
    const {
      shipping_address,
      guest_email,
      guest_name,
      guest_phone,
      notes,
      session_id
    } = req.body;

    const userId = req.user?.id;

    if (!shipping_address) {
      return res.status(400).json({ error: { message: 'Shipping address is required' } });
    }

    // Get cart items
    let cartItems;
    if (userId) {
      cartItems = db.prepare(`
        SELECT 
          ci.*,
          p.name as product_name,
          p.price as product_price,
          pv.name as variant_name,
          pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.user_id = ?
      `).all(userId);
    } else {
      if (!session_id) {
        return res.status(400).json({ error: { message: 'Session ID required for guest checkout' } });
      }
      if (!guest_email || !guest_name) {
        return res.status(400).json({ error: { message: 'Guest email and name are required' } });
      }
      cartItems = db.prepare(`
        SELECT 
          ci.*,
          p.name as product_name,
          p.price as product_price,
          pv.name as variant_name,
          pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.session_id = ?
      `).all(session_id);
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Cart is empty' } });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cartItems) {
      const price = item.variant_price || item.product_price;
      subtotal += price * item.quantity;
    }

    const shipping_cost = subtotal >= 500 ? 0 : 50; // Free shipping over ₹500
    const total = subtotal + shipping_cost;

    // Create order
    const orderResult = db.prepare(`
      INSERT INTO orders (
        user_id, guest_email, guest_name, guest_phone,
        shipping_address, subtotal, shipping_cost, total, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      guest_email || null,
      guest_name || null,
      guest_phone || null,
      shipping_address,
      subtotal,
      shipping_cost,
      total,
      notes || null
    );

    const orderId = orderResult.lastInsertRowid;

    // Create order items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      const price = item.variant_price || item.product_price;
      insertOrderItem.run(
        orderId,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.variant_name,
        price,
        item.quantity
      );
    }

    // Clear cart
    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    } else {
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session_id);
    }

    // Send order confirmation email (console output for now)
    try {
      let customerEmail = guest_email;
      let customerName = guest_name || 'Valued Customer';

      if (userId) {
        const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId);
        if (user) {
          customerEmail = user.email;
          customerName = user.name;
        }
      }

      if (customerEmail) {
        const emailItems = cartItems.map(item => ({
          ...item,
          price: item.variant_price || item.product_price
        }));
        sendOrderConfirmationEmail({
          orderId,
          email: customerEmail,
          customerName,
          items: emailItems,
          subtotal,
          shippingCost: shipping_cost,
          total,
          shippingAddress: shipping_address
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't block the order response if email fails
    }

    res.status(201).json({
      message: 'Order created successfully',
      order: { id: orderId, total, subtotal, shipping_cost }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: { message: 'Failed to create order' } });
  }
});

// Checkout — create order + send confirmation email (no payment gateway required)
router.post('/checkout', auth, (req, res) => {
  console.log('\n📦 Checkout route hit!');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  try {
    const {
      shipping_address,
      guest_email,
      guest_name,
      guest_phone,
      notes,
      session_id,
      payment_method
    } = req.body;

    const userId = req.user?.id;
    const selectedPayment = payment_method || 'cod';

    if (!shipping_address) {
      return res.status(400).json({ error: { message: 'Shipping address is required' } });
    }

    // Get cart items
    let cartItems;
    if (userId) {
      cartItems = db.prepare(`
        SELECT 
          ci.*,
          p.name as product_name,
          p.price as product_price,
          pv.name as variant_name,
          pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.user_id = ?
      `).all(userId);
    } else {
      if (!session_id) {
        return res.status(400).json({ error: { message: 'Session ID required for guest checkout' } });
      }
      if (!guest_email || !guest_name) {
        return res.status(400).json({ error: { message: 'Guest email and name are required' } });
      }
      cartItems = db.prepare(`
        SELECT 
          ci.*,
          p.name as product_name,
          p.price as product_price,
          pv.name as variant_name,
          pv.price as variant_price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.session_id = ?
      `).all(session_id);
    }

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: { message: 'Cart is empty' } });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cartItems) {
      const price = item.variant_price || item.product_price;
      subtotal += price * item.quantity;
    }

    const shipping_cost = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shipping_cost;

    // Determine payment status based on method
    const paymentStatus = selectedPayment === 'cod' ? 'cod' : 'pending';
    const orderStatus = selectedPayment === 'cod' ? 'confirmed' : 'pending';

    // Create order
    const orderResult = db.prepare(`
      INSERT INTO orders (
        user_id, guest_email, guest_name, guest_phone,
        shipping_address, subtotal, shipping_cost, total, notes,
        status, payment_status, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      guest_email || null,
      guest_name || null,
      guest_phone || null,
      shipping_address,
      subtotal,
      shipping_cost,
      total,
      notes || null,
      orderStatus,
      paymentStatus,
      selectedPayment
    );

    const orderId = orderResult.lastInsertRowid;
    console.log('✅ Order created with ID:', orderId);

    // Create order items
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_name, price, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      const price = item.variant_price || item.product_price;
      insertOrderItem.run(
        orderId,
        item.product_id,
        item.variant_id,
        item.product_name,
        item.variant_name,
        price,
        item.quantity
      );
    }

    // Clear cart
    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    } else {
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session_id);
    }

    // Send order confirmation email
    try {
      let customerEmail = guest_email;
      let customerName = guest_name || 'Valued Customer';

      if (userId) {
        const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId);
        if (user) {
          customerEmail = user.email;
          customerName = user.name;
        }
      }

      console.log('📧 Sending email to:', customerEmail);
      if (customerEmail) {
        const emailItems = cartItems.map(item => ({
          ...item,
          price: item.variant_price || item.product_price
        }));
        sendOrderConfirmationEmail({
          orderId,
          email: customerEmail,
          customerName,
          items: emailItems,
          subtotal,
          shippingCost: shipping_cost,
          total,
          shippingAddress: shipping_address
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order: { id: orderId, total, subtotal, shipping_cost }
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: { message: 'Failed to process checkout' } });
  }
});

// Get user's orders
router.get('/', requireAuth, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch orders' } });
  }
});

// Get single order
router.get('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    let order;
    if (userId) {
      order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, userId);
    } else {
      // Allow guest to view by order ID (in real app, use order token)
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    }

    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    // Get order items
    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all(order.id);

    res.json({ order: { ...order, items } });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch order' } });
  }
});

module.exports = router;
