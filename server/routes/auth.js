const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: { message: 'Email, password, and name are required' } 
      });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ 
        error: { message: 'User with this email already exists' } 
      });
    }

    // Hash password
    const password_hash = bcrypt.hashSync(password, 10);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, phone)
      VALUES (?, ?, ?, ?)
    `).run(email, password_hash, name, phone || null);

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email, name, is_admin: 0 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.lastInsertRowid, email, name, is_admin: 0 }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: { message: 'Registration failed' } });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: { message: 'Email and password are required' } 
      });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, phone, address, is_admin, created_at 
      FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: { message: 'Failed to get user' } });
  }
});

// Update profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, phone, address } = req.body;

    db.prepare(`
      UPDATE users SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `).run(name, phone, address, req.user.id);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: { message: 'Failed to update profile' } });
  }
});

module.exports = router;
