const { getDashboard } = require('../db/expenses');
const { today } = require('../utils/format');

function showDashboard(req, res) {
  const month = today().slice(0, 7);
  res.render('dashboard', {
    title: 'Dashboard',
    activePage: 'dashboard',
    month,
    ...getDashboard(req.app.locals.db, month)
  });
}

module.exports = { showDashboard };
