const express = require('express');
const Stripe = require('stripe');
const { db } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Create payment intent
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: { message: 'Order ID is required' } });
    }

    // Get order details
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);

    if (!order) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Stripe uses smallest currency unit (paise for INR)
      currency: 'inr',
      metadata: {
        order_id: order.id.toString(),
        user_id: order.user_id?.toString() || 'guest'
      }
    });

    // Update order with payment intent ID
    db.prepare(`
      UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?
    `).run(paymentIntent.id, order.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: { message: 'Failed to create payment intent' } });
  }
});

// Confirm payment (called after successful Stripe payment)
router.post('/confirm-payment', auth, async (req, res) => {
  try {
    const { payment_intent_id } = req.body;

    if (!payment_intent_id) {
      return res.status(400).json({ error: { message: 'Payment intent ID is required' } });
    }

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Update order status
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'paid', 
            payment_method = 'stripe',
            status = 'confirmed',
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `).run(payment_intent_id);

      res.json({ message: 'Payment confirmed', status: 'paid' });
    } else {
      res.json({ message: 'Payment not completed', status: paymentIntent.status });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: { message: 'Failed to confirm payment' } });
  }
});

// Stripe webhook for payment events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'paid', 
            status = 'confirmed',
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `).run(paymentIntent.id);
      console.log('Payment succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      db.prepare(`
        UPDATE orders 
        SET payment_status = 'failed',
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `).run(failedPayment.id);
      console.log('Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
