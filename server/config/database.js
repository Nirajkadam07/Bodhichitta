const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database schema
const initDB = async () => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS citext;

    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('pending','paid','shipped','delivered','cancelled');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE payment_status AS ENUM ('created','pending','captured','failed','refunded');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS users (
      id            BIGSERIAL PRIMARY KEY,
      email         CITEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      phone         TEXT,
      is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id           BIGSERIAL PRIMARY KEY,
      user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name    TEXT NOT NULL,
      line1        TEXT NOT NULL,
      line2        TEXT,
      city         TEXT NOT NULL,
      state        TEXT NOT NULL,
      postal_code  TEXT NOT NULL,
      country      TEXT NOT NULL,
      phone        TEXT,
      is_default   BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          BIGSERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url   TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id             BIGSERIAL PRIMARY KEY,
      name           TEXT NOT NULL,
      slug           TEXT UNIQUE NOT NULL,
      description    TEXT,
      price          NUMERIC(10,2) NOT NULL,
      compare_price  NUMERIC(10,2),
      category_id    BIGINT REFERENCES categories(id),
      stock          INT NOT NULL DEFAULT 100,
      is_active      BOOLEAN NOT NULL DEFAULT TRUE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id            BIGSERIAL PRIMARY KEY,
      product_id    BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      sku           TEXT UNIQUE,
      price         NUMERIC(10,2) NOT NULL,
      compare_price NUMERIC(10,2),
      stock         INT NOT NULL DEFAULT 100,
      is_active     BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id         BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url  TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
      session_id  TEXT,
      product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id  BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
      quantity    INT NOT NULL DEFAULT 1,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                    BIGSERIAL PRIMARY KEY,
      user_id               BIGINT REFERENCES users(id),
      guest_email           TEXT,
      guest_name            TEXT,
      guest_phone           TEXT,
      status                order_status NOT NULL DEFAULT 'pending',
      shipping_address_id   BIGINT REFERENCES addresses(id),
      shipping_address_text TEXT,
      subtotal              NUMERIC(10,2) NOT NULL,
      shipping_cost         NUMERIC(10,2) NOT NULL DEFAULT 0,
      total                 NUMERIC(10,2) NOT NULL,
      payment_method        TEXT,
      payment_status        payment_status NOT NULL DEFAULT 'pending',
      razorpay_order_id     TEXT,
      notes                 TEXT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           BIGSERIAL PRIMARY KEY,
      order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   BIGINT NOT NULL REFERENCES products(id),
      variant_id   BIGINT REFERENCES product_variants(id),
      product_name TEXT NOT NULL,
      variant_name TEXT,
      unit_price   NUMERIC(10,2) NOT NULL,
      quantity     INT NOT NULL,
      line_total   NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id                  BIGSERIAL PRIMARY KEY,
      order_id            BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      provider            TEXT NOT NULL,
      razorpay_order_id   TEXT,
      razorpay_payment_id TEXT,
      amount              NUMERIC(10,2) NOT NULL,
      currency            CHAR(3) NOT NULL DEFAULT 'INR',
      status              payment_status NOT NULL DEFAULT 'created',
      raw_payload         JSONB,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Database initialized successfully');
};

// Seed initial data
const seedData = async () => {
  const { rows } = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (parseInt(rows[0].count) > 0) {
    console.log('Database already seeded');
    return;
  }

  // Seed categories
  const categories = [
    ['Hair Care', 'hair-care', 'Natural shampoos, conditioners, and hair oils'],
    ['Skin Care', 'skin-care', 'Face masks, serums, and moisturizers'],
    ['Essential Oils', 'essential-oils', 'Pure therapeutic-grade essential oils'],
  ];

  for (const [name, slug, description] of categories) {
    await pool.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)',
      [name, slug, description]
    );
  }

  // Helper functions
  const insertProduct = async (name, slug, desc, price, comparePrice, catId, stock) => {
    const { rows } = await pool.query(
      `INSERT INTO products (name, slug, description, price, compare_price, category_id, stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, slug, desc, price, comparePrice, catId, stock]
    );
    return rows[0].id;
  };

  const insertImage = async (productId, url, isPrimary, sortOrder) => {
    await pool.query(
      'INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES ($1, $2, $3, $4)',
      [productId, url, isPrimary, sortOrder]
    );
  };

  const insertVariant = async (productId, name, sku, price, comparePrice, stock) => {
    await pool.query(
      'INSERT INTO product_variants (product_id, name, sku, price, compare_price, stock) VALUES ($1, $2, $3, $4, $5, $6)',
      [productId, name, sku, price, comparePrice, stock]
    );
  };

  // Product 1: Rosemary Shampoo
  const p1 = await insertProduct(
    'Rosemary and Coconut Milk Shampoo', 'rosemary-coconut-shampoo',
    'A gentle, sulfate-free shampoo infused with rosemary extract and coconut milk. Promotes hair growth while deeply nourishing your scalp. Perfect for all hair types.',
    599, 799, 1, 100
  );
  await insertImage(p1, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792898/Shampoo_1_znesuw.jpg', true, 0);
  await insertImage(p1, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792904/Shampoo_2_dksfrr.jpg', false, 1);
  await insertImage(p1, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792900/Shampoo_3_vunv30.jpg', false, 2);
  await insertImage(p1, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792899/Shampoo_4_zg6awr.jpg', false, 3);
  await insertVariant(p1, '100ml', 'SHAMPOO-100', 299, 399, 50);
  await insertVariant(p1, '200ml', 'SHAMPOO-200', 599, 799, 100);
  await insertVariant(p1, '500ml', 'SHAMPOO-500', 999, 1299, 30);

  // Product 2: Face Masks
  const p2 = await insertProduct(
    'Herbal Face Pack', 'herbal-face-pack',
    'A rejuvenating face mask made with natural herbs and botanical extracts. Deeply cleanses pores, removes impurities, and leaves your skin feeling fresh and radiant.',
    449, 599, 2, 80
  );
  await insertImage(p2, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774794116/Face_Packs_100gm_u5iikh.png', true, 0);
  await insertVariant(p2, '50g', 'FACEMASK-50', 249, 349, 40);
  await insertVariant(p2, '100g', 'FACEMASK-100', 449, 599, 80);
  await insertVariant(p2, '200g', 'FACEMASK-200', 799, 999, 25);

  // Product 3: Essential Oils
  const p3 = await insertProduct(
    'Pure Essential Oil Blend', 'essential-oil-blend',
    'A therapeutic blend of lavender, tea tree, and eucalyptus essential oils. Perfect for aromatherapy, relaxation, and natural wellness routines.',
    699, 899, 3, 60
  );
  await insertImage(p3, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792925/Essential_oils_axsa1u.png', true, 0);
  await insertVariant(p3, '10ml', 'OIL-10', 349, 449, 50);
  await insertVariant(p3, '30ml', 'OIL-30', 699, 899, 60);
  await insertVariant(p3, '50ml', 'OIL-50', 999, 1299, 20);

  // Product 4: Hair Oil
  const p4 = await insertProduct(
    'Botanical Hair Oil', 'botanical-hair-oil',
    'A luxurious blend of argan, jojoba, and coconut oils enriched with vitamin E. Strengthens hair, reduces frizz, and adds a brilliant shine.',
    549, 749, 1, 90
  );
  await insertImage(p4, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792904/Shampoo_10_b8megf.jpg', true, 0);
  await insertImage(p4, 'https://res.cloudinary.com/dzkrnqlsf/image/upload/v1774792905/Shampoo_11_eebouk.jpg', false, 1);
  await insertVariant(p4, '50ml', 'HAIROIL-50', 299, 399, 45);
  await insertVariant(p4, '100ml', 'HAIROIL-100', 549, 749, 90);
  await insertVariant(p4, '200ml', 'HAIROIL-200', 899, 1199, 30);

  // Create admin user
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  await pool.query(
    'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, $4)',
    ['admin@bodhichitta.com', hashedPassword, 'Admin User', true]
  );

  console.log('Database seeded successfully');
};

module.exports = { pool, initDB, seedData };
