const express = require('express');
const { pool } = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers, totalRevenue, pendingOrders, recentOrders] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM products'),
      pool.query('SELECT COUNT(*) as count FROM orders'),
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = FALSE'),
      pool.query("SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE payment_status = 'captured'"),
      pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"),
      pool.query(`
        SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
        LIMIT 5
      `)
    ]);

    const stats = {
      totalProducts: parseInt(totalProducts.rows[0].count),
      totalOrders: parseInt(totalOrders.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].sum),
      pendingOrders: parseInt(pendingOrders.rows[0].count),
      recentOrders: recentOrders.rows
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch dashboard stats' } });
  }
});

// ========== Products Management ==========

router.get('/products', async (req, res) => {
  try {
    const { rows: products } = await pool.query(`
      SELECT p.*, c.name as category_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch products' } });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, slug, description, price, compare_price, category_id, stock, images, variants } = req.body;

    if (!name || !slug || !price) {
      return res.status(400).json({ error: { message: 'Name, slug, and price are required' } });
    }

    const { rows } = await pool.query(
      'INSERT INTO products (name, slug, description, price, compare_price, category_id, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, slug, description, price, compare_price || null, category_id || null, stock || 0]
    );
    const productId = rows[0].id;

    if (images && images.length > 0) {
      for (let idx = 0; idx < images.length; idx++) {
        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES ($1, $2, $3, $4)',
          [productId, images[idx].url, idx === 0, idx]
        );
      }
    }

    if (variants && variants.length > 0) {
      for (const v of variants) {
        await pool.query(
          'INSERT INTO product_variants (product_id, name, sku, price, compare_price, stock) VALUES ($1, $2, $3, $4, $5, $6)',
          [productId, v.name, v.sku || null, v.price, v.compare_price || null, v.stock || 0]
        );
      }
    }

    res.status(201).json({ message: 'Product created', productId });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: { message: 'Failed to create product' } });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, price, compare_price, category_id, stock, is_active } = req.body;

    await pool.query(`
      UPDATE products 
      SET name = $1, slug = $2, description = $3, price = $4, compare_price = $5, 
          category_id = $6, stock = $7, is_active = $8, updated_at = NOW()
      WHERE id = $9
    `, [name, slug, description, price, compare_price, category_id, stock, is_active, id]);

    res.json({ message: 'Product updated' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: { message: 'Failed to update product' } });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: { message: 'Failed to delete product' } });
  }
});

// ========== Orders Management ==========

router.get('/orders', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const params = [];
    let idx = 1;

    if (status) {
      query += ` WHERE o.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const { rows: orders } = await pool.query(query, params);
    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch orders' } });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    await pool.query(`
      UPDATE orders 
      SET status = COALESCE($1::order_status, status), 
          payment_status = COALESCE($2::payment_status, payment_status),
          updated_at = NOW()
      WHERE id = $3
    `, [status || null, payment_status || null, id]);

    res.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: { message: 'Failed to update order' } });
  }
});

// ========== Categories Management ==========

router.get('/categories', async (req, res) => {
  try {
    const { rows: categories } = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch categories' } });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: { message: 'Name and slug are required' } });
    }

    const { rows } = await pool.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id',
      [name, slug, description || null]
    );

    res.status(201).json({ message: 'Category created', categoryId: rows[0].id });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: { message: 'Failed to create category' } });
  }
});

// ========== Users Management ==========

router.get('/users', async (req, res) => {
  try {
    const { rows: users } = await pool.query(
      'SELECT id, email, name, phone, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch users' } });
  }
});

module.exports = router;
