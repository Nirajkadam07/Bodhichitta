const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

// Get all products with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
    `;

    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND c.slug = $${idx++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (p.name ILIKE $${idx} OR p.description ILIKE $${idx})`;
      idx++;
      params.push(`%${search}%`);
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

    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const { rows: products } = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
    `;
    const countParams = [];
    let cIdx = 1;

    if (category) {
      countQuery += ` AND c.slug = $${cIdx++}`;
      countParams.push(category);
    }

    if (search) {
      countQuery += ` AND (p.name ILIKE $${cIdx} OR p.description ILIKE $${cIdx})`;
      cIdx++;
      countParams.push(`%${search}%`);
    }

    const { rows: countRows } = await pool.query(countQuery, countParams);
    const total = parseInt(countRows[0].total);

    res.json({ products, total, limit: Number(limit), offset: Number(offset) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch products' } });
  }
});

// Get single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { rows } = await pool.query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.is_active = TRUE
    `, [slug]);

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: 'Product not found' } });
    }

    const product = rows[0];

    // Get all images
    const { rows: images } = await pool.query(`
      SELECT * FROM product_images 
      WHERE product_id = $1 
      ORDER BY is_primary DESC, sort_order ASC
    `, [product.id]);

    // Get variants
    const { rows: variants } = await pool.query(`
      SELECT * FROM product_variants 
      WHERE product_id = $1 AND is_active = TRUE
      ORDER BY price ASC
    `, [product.id]);

    res.json({ product: { ...product, images, variants } });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch product' } });
  }
});

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const { rows: categories } = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch categories' } });
  }
});

module.exports = router;
