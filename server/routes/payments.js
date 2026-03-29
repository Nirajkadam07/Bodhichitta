const express = require('express');
const { pool } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create Razorpay order (placeholder — integrate Razorpay SDK when ready)
router.post('/create-order', auth, async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: { message: 'Order ID is required' } });
    }

    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    const order = rows[0];

    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    // TODO: Replace with actual Razorpay SDK call
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    // const razorpayOrder = await razorpay.orders.create({ amount: Math.round(order.total * 100), currency: 'INR', receipt: `order_${order.id}` });

    // For now, just record intent
    const razorpayOrderId = `rzp_placeholder_${order.id}_${Date.now()}`;

    await pool.query(
      'UPDATE orders SET razorpay_order_id = $1, payment_status = $2 WHERE id = $3',
      [razorpayOrderId, 'created', order.id]
    );

    // Record in payments table
    await pool.query(
      `INSERT INTO payments (order_id, provider, razorpay_order_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.id, 'razorpay', razorpayOrderId, order.total, 'INR', 'created']
    );

    res.json({
      razorpayOrderId,
      amount: Math.round(parseFloat(order.total) * 100),
      currency: 'INR'
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ error: { message: 'Failed to create payment order' } });
  }
});

// Verify payment (called after Razorpay payment callback)
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ error: { message: 'Payment details are required' } });
    }

    // TODO: Verify signature with Razorpay SDK
    // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    //   .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    //   .digest('hex');
    // if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: { message: 'Invalid signature' } });

    // Update order
    await pool.query(`
      UPDATE orders 
      SET payment_status = 'captured', status = 'paid', updated_at = NOW()
      WHERE razorpay_order_id = $1
    `, [razorpay_order_id]);

    // Update payment record
    await pool.query(`
      UPDATE payments 
      SET razorpay_payment_id = $1, status = 'captured', raw_payload = $2, updated_at = NOW()
      WHERE razorpay_order_id = $3
    `, [razorpay_payment_id, JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }), razorpay_order_id]);

    res.json({ message: 'Payment verified', status: 'captured' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: { message: 'Failed to verify payment' } });
  }
});

// Payment webhook (for Razorpay webhooks)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // TODO: Verify webhook signature with Razorpay
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          await pool.query(`
            UPDATE orders SET payment_status = 'captured', status = 'paid', updated_at = NOW()
            WHERE razorpay_order_id = $1
          `, [payment.order_id]);

          await pool.query(`
            UPDATE payments SET status = 'captured', razorpay_payment_id = $1, raw_payload = $2, updated_at = NOW()
            WHERE razorpay_order_id = $3
          `, [payment.id, JSON.stringify(payment), payment.order_id]);
        }
        console.log('Payment captured:', payment?.id);
        break;
      }
      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (payment) {
          await pool.query(`
            UPDATE orders SET payment_status = 'failed', updated_at = NOW()
            WHERE razorpay_order_id = $1
          `, [payment.order_id]);

          await pool.query(`
            UPDATE payments SET status = 'failed', raw_payload = $1, updated_at = NOW()
            WHERE razorpay_order_id = $2
          `, [JSON.stringify(payment), payment.order_id]);
        }
        console.log('Payment failed:', payment?.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: { message: 'Webhook processing failed' } });
  }
});

module.exports = router;
