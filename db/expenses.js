const expenseSelect = `
  SELECT expenses.*, categories.name AS category_name
  FROM expenses JOIN categories ON categories.id = expenses.category_id
`;

function listExpenses(db, filters) {
  const conditions = [];
  const values = {};

  if (filters.q) {
    // Treat LIKE wildcards typed by the user as part of the search text.
    const search = filters.q.replace(/[!%_]/g, '!$&');
    conditions.push("expenses.title LIKE @search ESCAPE '!'");
    values.search = `%${search}%`;
  }
  if (filters.category) {
    conditions.push('expenses.category_id = @category');
    values.category = filters.category;
  }
  if (filters.month) {
    conditions.push('substr(expenses.date, 1, 7) = @month');
    values.month = filters.month;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  // SQL keywords cannot be bound, so choose from two fixed directions.
  const direction = filters.sort === 'oldest' ? 'ASC' : 'DESC';
  return db.prepare(`
    ${expenseSelect}
    ${where}
    ORDER BY expenses.date ${direction}, expenses.id ${direction}
  `).all(values);
}

function getExpense(db, id) {
  return db.prepare(`${expenseSelect} WHERE expenses.id = ?`).get(id);
}

function listExpenseMonths(db) {
  return db.prepare(`
    SELECT DISTINCT substr(date, 1, 7) AS month FROM expenses ORDER BY month DESC
  `).all().map((row) => row.month);
}

function addExpense(db, expense) {
  return db.prepare(`
    INSERT INTO expenses (title, amount_cents, category_id, date, description)
    VALUES (@title, @amountCents, @categoryId, @date, @description)
  `).run(expense);
}

function updateExpense(db, id, expense) {
  db.prepare(`
    UPDATE expenses
    SET title = @title, amount_cents = @amountCents, category_id = @categoryId,
        date = @date, description = @description
    WHERE id = @id
  `).run({ ...expense, id });
}

function deleteExpense(db, id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

function getDashboard(db, month) {
  const totals = db.prepare(`
    SELECT COUNT(*) AS count,
           COALESCE(SUM(amount_cents), 0) AS total,
           COALESCE(SUM(CASE WHEN substr(date, 1, 7) = ? THEN amount_cents ELSE 0 END), 0) AS monthTotal
    FROM expenses
  `).get(month);

  const recent = db.prepare(`
    ${expenseSelect} ORDER BY expenses.date DESC, expenses.id DESC LIMIT 5
  `).all();

  const byCategory = db.prepare(`
    SELECT categories.name, SUM(expenses.amount_cents) AS total
    FROM expenses JOIN categories ON categories.id = expenses.category_id
    GROUP BY categories.id
    ORDER BY total DESC, categories.name
  `).all();

  return { ...totals, recent, byCategory };
}

module.exports = {
  listExpenses, listExpenseMonths, getExpense, addExpense, updateExpense, deleteExpense, getDashboard
};
