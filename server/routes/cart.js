const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { auth, requireAuth } = require('../middleware/auth');

const router = express.Router();

const getSessionId = (req) => {
  return req.headers['x-session-id'] || uuidv4();
};

// Get cart items
router.get('/', auth, async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    const query = `
      SELECT 
        ci.*,
        p.name as product_name,
        p.slug as product_slug,
        p.price as product_price,
        pv.name as variant_name,
        pv.price as variant_price,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ${userId ? 'ci.user_id = $1' : 'ci.session_id = $1'}
    `;

    const { rows: items } = await pool.query(query, [userId || sessionId]);
    return res.json({ items, sessionId });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch cart' } });
  }
});

// Add item to cart
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id, variant_id, quantity = 1 } = req.body;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (!product_id) {
      return res.status(400).json({ error: { message: 'Product ID is required' } });
    }

    // Check if product exists
    const { rows: productRows } = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND is_active = TRUE', [product_id]
    );
    if (productRows.length === 0) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    // Check if item already in cart
    const identifierCol = userId ? 'user_id' : 'session_id';
    const identifierVal = userId || sessionId;

    const { rows: existingRows } = await pool.query(
      `SELECT id, quantity FROM cart_items 
       WHERE ${identifierCol} = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
      [identifierVal, product_id, variant_id || null]
    );

    if (existingRows.length > 0) {
      await pool.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [existingRows[0].quantity + quantity, existingRows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4, $5)',
        [userId || null, userId ? null : sessionId, product_id, variant_id || null, quantity]
      );
    }

    res.json({ message: 'Item added to cart', sessionId });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: { message: 'Failed to add item to cart' } });
  }
});

// Update cart item quantity
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    const identifierCol = userId ? 'user_id' : 'session_id';
    const identifierVal = userId || sessionId;

    if (quantity < 1) {
      await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${identifierCol} = $2`, [id, identifierVal]);
    } else {
      await pool.query(`UPDATE cart_items SET quantity = $1 WHERE id = $2 AND ${identifierCol} = $3`, [quantity, id, identifierVal]);
    }

    res.json({ message: 'Cart updated' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: { message: 'Failed to update cart' } });
  }
});

// Remove item from cart
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    const identifierCol = userId ? 'user_id' : 'session_id';
    const identifierVal = userId || sessionId;

    await pool.query(`DELETE FROM cart_items WHERE id = $1 AND ${identifierCol} = $2`, [id, identifierVal]);

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: { message: 'Failed to remove item from cart' } });
  }
});

// Clear cart
router.delete('/', auth, async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const userId = req.user?.id;

    if (userId) {
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    } else {
      await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);
    }

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: { message: 'Failed to clear cart' } });
  }
});

// Merge guest cart with user cart after login
router.post('/merge', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!userId || !sessionId) {
      return res.status(400).json({ error: { message: 'User ID and session ID required' } });
    }

    const { rows: guestItems } = await pool.query(
      'SELECT * FROM cart_items WHERE session_id = $1', [sessionId]
    );

    for (const item of guestItems) {
      const { rows: existingRows } = await pool.query(
        `SELECT id, quantity FROM cart_items 
         WHERE user_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
        [userId, item.product_id, item.variant_id]
      );

      if (existingRows.length > 0) {
        await pool.query(
          'UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [existingRows[0].quantity + item.quantity, existingRows[0].id]
        );
      } else {
        await pool.query(
          'UPDATE cart_items SET user_id = $1, session_id = NULL WHERE id = $2',
          [userId, item.id]
        );
      }
    }

    await pool.query('DELETE FROM cart_items WHERE session_id = $1', [sessionId]);

    res.json({ message: 'Cart merged successfully' });
  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({ error: { message: 'Failed to merge cart' } });
  }
});

module.exports = router;
