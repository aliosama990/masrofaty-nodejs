const { listCategories } = require('../db/categories');
const { listExpenses, listExpenseMonths, getExpense, addExpense, updateExpense, deleteExpense } = require('../db/expenses');
const { today } = require('../utils/format');
const { field, positiveId, validMonth, validateExpense } = require('../utils/validation');

const notices = new Map([
  ['added', 'Expense added.'],
  ['updated', 'Expense updated.'],
  ['deleted', 'Expense deleted.']
]);

function index(req, res) {
  const db = req.app.locals.db;
  const categories = listCategories(db);
  const categoryId = positiveId(field(req.query.category));
  const month = field(req.query.month);
  const filters = {
    q: field(req.query.q).slice(0, 100),
    category: categories.some((category) => category.id === categoryId) ? categoryId : null,
    month: validMonth(month) ? month : '',
    sort: req.query.sort === 'oldest' ? 'oldest' : 'newest'
  };
  const months = listExpenseMonths(db);
  if (filters.month && !months.includes(filters.month)) {
    months.push(filters.month);
    months.sort().reverse();
  }

  res.render('expenses/index', {
    title: 'Expenses',
    activePage: 'expenses',
    expenses: listExpenses(db, filters),
    categories,
    months,
    filters,
    notice: notices.get(req.query.status) || ''
  });
}

function findExpense(req, res) {
  const id = positiveId(req.params.id);
  const expense = id && getExpense(req.app.locals.db, id);
  if (!expense) {
    res.status(404).render('error', {
      title: 'Expense not found',
      activePage: 'expenses',
      message: 'This expense may have been deleted. Return to the list to see your saved expenses.',
      backToExpenses: true
    });
  }
  return expense;
}

function renderForm(res, { values, categories, errors = {}, id = null }) {
  res.status(Object.keys(errors).length ? 422 : 200).render('expenses/form', {
    title: id ? 'Edit expense' : 'Add expense',
    activePage: 'expenses',
    action: id ? `/expenses/${id}/edit` : '/expenses',
    submitLabel: id ? 'Save changes' : 'Save expense',
    values,
    categories,
    errors
  });
}

function newForm(req, res) {
  renderForm(res, {
    categories: listCategories(req.app.locals.db),
    values: { title: '', amount: '', categoryId: '', date: today(), description: '' }
  });
}

function editForm(req, res) {
  const expense = findExpense(req, res);
  if (!expense) return;

  renderForm(res, {
    id: expense.id,
    categories: listCategories(req.app.locals.db),
    values: {
      title: expense.title,
      amount: (expense.amount_cents / 100).toFixed(2),
      categoryId: expense.category_id,
      date: expense.date,
      description: expense.description
    }
  });
}

function saveExpense(req, res, id = null) {
  const db = req.app.locals.db;
  const categories = listCategories(db);
  const { values, errors, expense } = validateExpense(req.body || {}, categories);
  if (Object.keys(errors).length) return renderForm(res, { id, values, categories, errors });

  if (id) {
    updateExpense(db, id, expense);
    return res.redirect(303, '/expenses?status=updated');
  }
  addExpense(db, expense);
  res.redirect(303, '/expenses?status=added');
}

function create(req, res) {
  saveExpense(req, res);
}

function update(req, res) {
  const expense = findExpense(req, res);
  if (expense) saveExpense(req, res, expense.id);
}

function deleteForm(req, res) {
  const expense = findExpense(req, res);
  if (!expense) return;

  res.render('expenses/delete', { title: 'Delete expense?', activePage: 'expenses', expense });
}

function remove(req, res) {
  const expense = findExpense(req, res);
  if (!expense) return;

  deleteExpense(req.app.locals.db, expense.id);
  res.redirect(303, '/expenses?status=deleted');
}

module.exports = { index, newForm, create, editForm, update, deleteForm, remove };
