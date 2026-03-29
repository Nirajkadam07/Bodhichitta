const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: { message: 'Email, password, and name are required' } 
      });
    }

    // Check if user exists
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: { message: 'User with this email already exists' } 
      });
    }

    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);

    // Create user
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, name, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, password_hash, name, phone || null]
    );

    const userId = rows[0].id;

    // Generate token
    const token = jwt.sign(
      { id: userId, email, name, is_admin: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, name, is_admin: false }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: { message: 'Registration failed' } });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: { message: 'Email and password are required' } 
      });
    }

    // Find user
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ 
        error: { message: 'Invalid email or password' } 
      });
    }

    // Verify password
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: { message: 'Invalid email or password' } 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        is_admin: user.is_admin 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: 'Login failed' } });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, phone, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user' } });
  }
});

// Update profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body;

    await pool.query(
      'UPDATE users SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
      [name, phone, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { message: 'Failed to update profile' } });
  }
});

// ========== Address Management ==========

// Get all addresses for the logged-in user
router.get('/addresses', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );
    res.json({ addresses: rows });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch addresses' } });
  }
});

// Add a new address
router.post('/addresses', requireAuth, async (req, res) => {
  try {
    const { full_name, line1, line2, city, state, postal_code, country, phone, is_default } = req.body;

    if (!full_name || !line1 || !city || !state || !postal_code || !country) {
      return res.status(400).json({ error: { message: 'Full name, address line 1, city, state, postal code, and country are required' } });
    }

    // If this is set as default, unset existing defaults
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }

    const { rows } = await pool.query(
      `INSERT INTO addresses (user_id, full_name, line1, line2, city, state, postal_code, country, phone, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, full_name, line1, line2 || null, city, state, postal_code, country || 'India', phone || null, is_default || false]
    );

    res.status(201).json({ address: rows[0] });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: { message: 'Failed to add address' } });
  }
});

// Update an address
router.put('/addresses/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, line1, line2, city, state, postal_code, country, phone, is_default } = req.body;

    // Verify ownership
    const { rows: existing } = await pool.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: { message: 'Address not found' } });
    }

    // If setting as default, unset existing defaults
    if (is_default) {
      await pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
    }

    const { rows } = await pool.query(
      `UPDATE addresses SET full_name = $1, line1 = $2, line2 = $3, city = $4, state = $5, 
       postal_code = $6, country = $7, phone = $8, is_default = $9 WHERE id = $10 AND user_id = $11 RETURNING *`,
      [full_name, line1, line2 || null, city, state, postal_code, country || 'India', phone || null, is_default || false, id, req.user.id]
    );

    res.json({ address: rows[0] });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: { message: 'Failed to update address' } });
  }
});

// Delete an address
router.delete('/addresses/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { message: 'Address not found' } });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: { message: 'Failed to delete address' } });
  }
});

module.exports = router;

