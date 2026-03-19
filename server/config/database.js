const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'bodhichitta.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
const initDB = () => {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Product categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      compare_price REAL,
      category_id INTEGER,
      stock INTEGER DEFAULT 100,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Product variants (sizes, quantities)
    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      price REAL NOT NULL,
      compare_price REAL,
      stock INTEGER DEFAULT 100,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Product images (multiple per product)
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Shopping cart
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      guest_email TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      status TEXT DEFAULT 'pending',
      shipping_address TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_cost REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      stripe_payment_intent_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Order items
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      product_name TEXT NOT NULL,
      variant_name TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  console.log('Database initialized successfully');
};

// Seed initial data
const seedData = () => {
  // Check if data already exists
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (categoryCount.count > 0) {
    console.log('Database already seeded');
    return;
  }

  // Seed categories
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)
  `);

  const categories = [
    ['Hair Care', 'hair-care', 'Natural shampoos, conditioners, and hair oils'],
    ['Skin Care', 'skin-care', 'Face masks, serums, and moisturizers'],
    ['Essential Oils', 'essential-oils', 'Pure therapeutic-grade essential oils'],
  ];

  categories.forEach(cat => insertCategory.run(...cat));

  // Seed products
  const insertProduct = db.prepare(`
    INSERT INTO products (name, slug, description, price, compare_price, category_id, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, name, sku, price, compare_price, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Product 1: Rosemary Shampoo
  const p1 = insertProduct.run(
    'Rosemary and Coconut Milk Shampoo',
    'rosemary-coconut-shampoo',
    'A gentle, sulfate-free shampoo infused with rosemary extract and coconut milk. Promotes hair growth while deeply nourishing your scalp. Perfect for all hair types.',
    599, 799, 1, 100
  );
  insertImage.run(p1.lastInsertRowid, '/images/Shampoo_1.jpg', 1, 0);
  insertImage.run(p1.lastInsertRowid, '/images/Shampoo_2.jpg', 0, 1);
  insertImage.run(p1.lastInsertRowid, '/images/Shampoo_3.jpg', 0, 2);
  insertImage.run(p1.lastInsertRowid, '/images/Shampoo_4.jpg', 0, 3);
  insertVariant.run(p1.lastInsertRowid, '100ml', 'SHAMPOO-100', 299, 399, 50);
  insertVariant.run(p1.lastInsertRowid, '200ml', 'SHAMPOO-200', 599, 799, 100);
  insertVariant.run(p1.lastInsertRowid, '500ml', 'SHAMPOO-500', 999, 1299, 30);

  // Product 2: Face Masks
  const p2 = insertProduct.run(
    'Herbal Face Pack',
    'herbal-face-pack',
    'A rejuvenating face mask made with natural herbs and botanical extracts. Deeply cleanses pores, removes impurities, and leaves your skin feeling fresh and radiant.',
    449, 599, 2, 80
  );
  insertImage.run(p2.lastInsertRowid, '/images/Face Packs 100gm.png', 1, 0);
  insertVariant.run(p2.lastInsertRowid, '50g', 'FACEMASK-50', 249, 349, 40);
  insertVariant.run(p2.lastInsertRowid, '100g', 'FACEMASK-100', 449, 599, 80);
  insertVariant.run(p2.lastInsertRowid, '200g', 'FACEMASK-200', 799, 999, 25);

  // Product 3: Essential Oils
  const p3 = insertProduct.run(
    'Pure Essential Oil Blend',
    'essential-oil-blend',
    'A therapeutic blend of lavender, tea tree, and eucalyptus essential oils. Perfect for aromatherapy, relaxation, and natural wellness routines.',
    699, 899, 3, 60
  );
  insertImage.run(p3.lastInsertRowid, '/images/Essential oils.png', 1, 0);
  insertVariant.run(p3.lastInsertRowid, '10ml', 'OIL-10', 349, 449, 50);
  insertVariant.run(p3.lastInsertRowid, '30ml', 'OIL-30', 699, 899, 60);
  insertVariant.run(p3.lastInsertRowid, '50ml', 'OIL-50', 999, 1299, 20);

  // Product 4: Hair Oil
  const p4 = insertProduct.run(
    'Botanical Hair Oil',
    'botanical-hair-oil',
    'A luxurious blend of argan, jojoba, and coconut oils enriched with vitamin E. Strengthens hair, reduces frizz, and adds a brilliant shine.',
    549, 749, 1, 90
  );
  insertImage.run(p4.lastInsertRowid, '/images/Shampoo_10.jpg', 1, 0);
  insertImage.run(p4.lastInsertRowid, '/images/Shampoo_11.jpg', 0, 1);
  insertVariant.run(p4.lastInsertRowid, '50ml', 'HAIROIL-50', 299, 399, 45);
  insertVariant.run(p4.lastInsertRowid, '100ml', 'HAIROIL-100', 549, 749, 90);
  insertVariant.run(p4.lastInsertRowid, '200ml', 'HAIROIL-200', 899, 1199, 30);

  // Create admin user
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (email, password_hash, name, is_admin)
    VALUES (?, ?, ?, ?)
  `).run('admin@bodhichitta.com', hashedPassword, 'Admin User', 1);

  console.log('Database seeded successfully');
};

module.exports = { db, initDB, seedData };
