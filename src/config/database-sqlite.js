const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Create database file in project root
const dbPath = path.join(__dirname, '../../database/wa_finance_bot.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Test database connection
async function testConnection() {
  return new Promise((resolve) => {
    db.get('SELECT 1 as test', (err, row) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        resolve(false);
      } else {
        console.log('✅ Database connected successfully');
        resolve(true);
      }
    });
  });
}

// Initialize database tables
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
        return;
      }
    });

    // Create categories table
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating categories table:', err);
        reject(err);
        return;
      }
    });

    // Create expenses table
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating expenses table:', err);
        reject(err);
        return;
      }
    });

    // Create saldo table
    db.run(`
      CREATE TABLE IF NOT EXISTS saldo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        saldo REAL NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating saldo table:', err);
        reject(err);
        return;
      }
    });

    // Insert default categories
    const defaultCategories = [
      'Makanan & Minuman',
      'Transportasi',
      'Belanja',
      'Tagihan',
      'Hiburan',
      'Kesehatan',
      'Pendidikan',
      'Lainnya'
    ];

    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    defaultCategories.forEach(categoryName => {
      insertCategory.run(categoryName);
    });
    insertCategory.finalize();

    console.log('✅ Database tables initialized successfully');
    resolve();
  });
}

// Helper function to run queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Helper function to run single query
function runSingle(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to run insert/update/delete
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

module.exports = {
  db,
  testConnection,
  initializeDatabase,
  runQuery,
  runSingle,
  run
}; 