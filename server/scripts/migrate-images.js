/**
 * One-time migration script to update product_images.image_url
 * from local relative paths to Cloudinary URLs.
 * 
 * Usage:  node scripts/migrate-images.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Mapping of local paths → Cloudinary URLs
const URL_MAP = {
  '/images/Shampoo_1.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792898/Shampoo_1_znesuw.jpg',
  '/images/Shampoo_2.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792904/Shampoo_2_dksfrr.jpg',
  '/images/Shampoo_3.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792900/Shampoo_3_vunv30.jpg',
  '/images/Shampoo_4.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792899/Shampoo_4_zg6awr.jpg',
  '/images/Shampoo_5.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792900/Shampoo_5_krnh1x.jpg',
  '/images/Shampoo_6.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792900/Shampoo_6_bzuixa.jpg',
  '/images/Shampoo_7.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792901/Shampoo_7_jkwp8l.jpg',
  '/images/Shampoo_8.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792903/Shampoo_8_kvdfo7.jpg',
  '/images/Shampoo_9.jpg':        'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792902/Shampoo_9_czvkvv.jpg',
  '/images/Shampoo_10.jpg':       'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792904/Shampoo_10_b8megf.jpg',
  '/images/Shampoo_11.jpg':       'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792905/Shampoo_11_eebouk.jpg',
  '/images/Face Packs 100gm.png': 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774794116/Face_Packs_100gm_u5iikh.png',
  '/images/Essential oils.png':   'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792925/Essential_oils_axsa1u.png',
};

async function migrate() {
  console.log('Starting image URL migration...\n');

  const { rows } = await pool.query('SELECT id, image_url FROM product_images');
  console.log(`Found ${rows.length} image rows in product_images\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const newUrl = URL_MAP[row.image_url];
    if (newUrl) {
      await pool.query('UPDATE product_images SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
      console.log(`  ✓ [${row.id}] ${row.image_url} → Cloudinary`);
      updated++;
    } else if (row.image_url.startsWith('https://')) {
      console.log(`  · [${row.id}] Already a full URL, skipping`);
      skipped++;
    } else {
      console.log(`  ✗ [${row.id}] No mapping for: ${row.image_url}`);
      skipped++;
    }
  }

  // Also update categories.image_url if any
  const { rows: catRows } = await pool.query("SELECT id, image_url FROM categories WHERE image_url IS NOT NULL AND image_url != ''");
  for (const row of catRows) {
    const newUrl = URL_MAP[row.image_url];
    if (newUrl) {
      await pool.query('UPDATE categories SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
      console.log(`  ✓ Category [${row.id}] updated`);
      updated++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
