function listCategories(db) {
  return db.prepare('SELECT id, name FROM categories ORDER BY name').all();
}

function addCategory(db, name) {
  return db.prepare('INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING').run(name);
}

module.exports = { listCategories, addCategory };
