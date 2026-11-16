const { listCategories, addCategory } = require('../db/categories');
const { field } = require('../utils/validation');

function renderCategories(req, res, { status = 200, name = '', error = '', notice = '' } = {}) {
  res.status(status).render('categories', {
    title: 'Categories',
    activePage: 'categories',
    categories: listCategories(req.app.locals.db),
    name,
    error,
    notice
  });
}

function index(req, res) {
  renderCategories(req, res, { notice: req.query.saved === '1' ? 'Category added.' : '' });
}

function create(req, res) {
  const name = field(req.body?.name);
  if (!name || name.length > 40) {
    return renderCategories(req, res, { status: 422, name, error: 'Enter a name between 1 and 40 characters.' });
  }
  if (!addCategory(req.app.locals.db, name).changes) {
    return renderCategories(req, res, { status: 422, name, error: 'A category with that name already exists.' });
  }

  res.redirect(303, '/categories?saved=1');
}

module.exports = { index, create };
