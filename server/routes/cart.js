const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const { auth, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get session ID from header or create new one
const getSessionId = (req) => {
  return req.headers['x-session-id'] || uuidv4();
};

// Get cart items
router.get('/', auth, (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    let query = `
      SELECT 
        ci.*,
        p.name as product_name,
        p.slug as product_slug,
        p.price as product_price,
        pv.name as variant_name,
        pv.price as variant_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE 
    `;

    if (userId) {
      query += `ci.user_id = ?`;
      const items = db.prepare(query).all(userId);
      return res.json({ items, sessionId });
    } else {
      query += `ci.session_id = ?`;
      const items = db.prepare(query).all(sessionId);
      return res.json({ items, sessionId });
    }
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch cart' } });
  }
});

// Add item to cart
router.post('/', requireAuth, (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (!product_id) {
      return res.status(400).json({ error: { message: 'Product ID is required' } });
    }

    // Check if product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(product_id);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    // Check if item already in cart
    let existingItem;
    if (userId) {
      existingItem = db.prepare(`
        SELECT id, quantity FROM cart_items 
        WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `).get(userId, product_id, variant_id, variant_id);
    } else {
      existingItem = db.prepare(`
        SELECT id, quantity FROM cart_items 
        WHERE session_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `).get(sessionId, product_id, variant_id, variant_id);
    }

    if (existingItem) {
      // Update quantity
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
        .run(existingItem.quantity + quantity, existingItem.id);
    } else {
      // Add new item
      db.prepare(`
        INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId || null, userId ? null : sessionId, product_id, variant_id || null, quantity);
    }

    res.json({ message: 'Item added to cart', sessionId });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: { message: 'Failed to add item to cart' } });
  }
});

// Update cart item quantity
router.put('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (quantity < 1) {
      // Remove item if quantity is 0 or less
      if (userId) {
        db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(id, userId);
      } else {
        db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(id, sessionId);
      }
    } else {
      if (userId) {
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?')
          .run(quantity, id, userId);
      } else {
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?')
          .run(quantity, id, sessionId);
      }
    }

    res.json({ message: 'Cart updated' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: { message: 'Failed to update cart' } });
  }
});

// Remove item from cart
router.delete('/:id', auth, (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(id, sessionId);
    }

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: { message: 'Failed to remove item from cart' } });
  }
});

// Clear cart
router.delete('/', auth, (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    } else {
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: { message: 'Failed to clear cart' } });
  }
});

// Merge guest cart with user cart after login
router.post('/merge', auth, (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: { message: 'User ID and session ID required' } });
    }

    // Get guest cart items
    const guestItems = db.prepare(`
      SELECT * FROM cart_items WHERE session_id = ?
    `).all(sessionId);

    for (const item of guestItems) {
      // Check if user already has this item
      const existing = db.prepare(`
        SELECT id, quantity FROM cart_items 
        WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))
      `).get(userId, item.product_id, item.variant_id, item.variant_id);

      if (existing) {
        // Update quantity
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
          .run(existing.quantity + item.quantity, existing.id);
      } else {
        // Move item to user cart
        db.prepare('UPDATE cart_items SET user_id = ?, session_id = NULL WHERE id = ?')
          .run(userId, item.id);
      }
    }

    // Clean up any remaining guest items
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);

    res.json({ message: 'Cart merged successfully' });
  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({ error: { message: 'Failed to merge cart' } });
  }
});

module.exports = router;
