const Database = require('better-sqlite3');
const path = require('node:path');

const defaultCategories = [
  'Food', 'Transportation', 'Shopping', 'Bills', 'Entertainment', 'Other'
];

function openDatabase(filename = path.join(__dirname, 'masrofaty.sqlite')) {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');

  const initialize = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE
          CHECK (length(trim(name)) BETWEEN 1 AND 40)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
        amount_cents INTEGER NOT NULL
          CHECK (typeof(amount_cents) = 'integer' AND amount_cents BETWEEN 1 AND 999999999),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        date TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 500)
      );

      CREATE INDEX IF NOT EXISTS expenses_by_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS expenses_by_category ON expenses(category_id);
    `);

    const addCategory = db.prepare('INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
    for (const name of defaultCategories) addCategory.run(name);
  });

  initialize();
  return db;
}

module.exports = openDatabase;
