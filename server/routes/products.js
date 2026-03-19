const express = require('express');
const { db } = require('../config/database');

const router = express.Router();

// Get all products with optional filtering
router.get('/', (req, res) => {
  try {
    const { category, search, sort, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;

    const params = [];

    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    switch (sort) {
      case 'price-asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price-desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'name':
        query += ` ORDER BY p.name ASC`;
        break;
      default:
        query += ` ORDER BY p.created_at DESC`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const products = db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const countParams = [];

    if (category) {
      countQuery += ` AND c.slug = ?`;
      countParams.push(category);
    }

    if (search) {
      countQuery += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ products, total, limit: Number(limit), offset: Number(offset) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch products' } });
  }
});

// Get single product by slug
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;

    const product = db.prepare(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `).get(slug);

    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    // Get all images
    const images = db.prepare(`
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `).all(product.id);

    // Get variants
    const variants = db.prepare(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC
    `).all(product.id);

    res.json({ product: { ...product, images, variants } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch product' } });
  }
});

// Get all categories
router.get('/categories/all', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch categories' } });
  }
});

module.exports = router;
