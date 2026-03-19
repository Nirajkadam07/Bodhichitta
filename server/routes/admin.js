const express = require('express');
const { db } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  try {
    const stats = {
      totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
      totalOrders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count,
      totalRevenue: db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = "paid"').get().sum,
      pendingOrders: db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = "pending"').get().count,
      recentOrders: db.prepare(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `).all()
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch dashboard stats' } });
  }
});

// ========== Products Management ==========

// Get all products (including inactive)
router.get('/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `).all();

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch products' } });
  }
});

// Create product
router.post('/products', (req, res) => {
  try {
    const { name, slug, description, price, compare_price, category_id, stock, images, variants } = req.body;

    if (!name || !slug || !price) {
      return res.status(400).json({ error: { message: 'Name, slug, and price are required' } });
    }

    const result = db.prepare(`
      INSERT INTO products (name, slug, description, price, compare_price, category_id, stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, description, price, compare_price || null, category_id || null, stock || 0);

    const productId = result.lastInsertRowid;

    // Add images
    if (images && images.length > 0) {
      const insertImage = db.prepare(`
        INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      images.forEach((img, idx) => {
        insertImage.run(productId, img.url, idx === 0 ? 1 : 0, idx);
      });
    }

    // Add variants
    if (variants && variants.length > 0) {
      const insertVariant = db.prepare(`
        INSERT INTO product_variants (product_id, name, sku, price, compare_price, stock)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      variants.forEach(v => {
        insertVariant.run(productId, v.name, v.sku || null, v.price, v.compare_price || null, v.stock || 0);
      });
    }

    res.status(201).json({ message: 'Product created', productId });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: { message: 'Failed to create product' } });
  }
});

// Update product
router.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, price, compare_price, category_id, stock, is_active } = req.body;

    db.prepare(`
      UPDATE products 
      SET name = ?, slug = ?, description = ?, price = ?, compare_price = ?, 
          category_id = ?, stock = ?, is_active = ?
      WHERE id = ?
    `).run(name, slug, description, price, compare_price, category_id, stock, is_active, id);

    res.json({ message: 'Product updated' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: { message: 'Failed to update product' } });
  }
});

// Delete product
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: { message: 'Failed to delete product' } });
  }
});

// ========== Orders Management ==========

// Get all orders
router.get('/orders', (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;

    const params = [];
    if (status) {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const orders = db.prepare(query).all(...params);

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch orders' } });
  }
});

// Update order status
router.put('/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    db.prepare(`
      UPDATE orders 
      SET status = COALESCE(?, status), 
          payment_status = COALESCE(?, payment_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, payment_status, id);

    res.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: { message: 'Failed to update order' } });
  }
});

// ========== Categories Management ==========

// Get all categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch categories' } });
  }
});

// Create category
router.post('/categories', (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: { message: 'Name and slug are required' } });
    }

    const result = db.prepare(`
      INSERT INTO categories (name, slug, description)
      VALUES (?, ?, ?)
    `).run(name, slug, description || null);

    res.status(201).json({ message: 'Category created', categoryId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: { message: 'Failed to create category' } });
  }
});

// ========== Users Management ==========

// Get all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, email, name, phone, is_admin, created_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch users' } });
  }
});

module.exports = router;
