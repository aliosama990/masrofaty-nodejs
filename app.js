const express = require('express');
const path = require('node:path');

const openDatabase = require('./db');
const dashboardRoutes = require('./routes/dashboard');
const expenseRoutes = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const { formatAmount, formatDate, formatMonth } = require('./utils/format');

function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('query parser', 'simple');

  app.locals.db = db;
  Object.assign(app.locals, { formatAmount, formatDate, formatMonth });
  Object.assign(app.locals, { activePage: '', notice: '' });

  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/vendor/bootstrap', express.static(path.dirname(require.resolve('bootstrap/dist/css/bootstrap.min.css'))));
  app.use('/vendor/geist', express.static(path.dirname(require.resolve('@fontsource-variable/geist/package.json'))));

  app.use('/', dashboardRoutes);
  app.use('/expenses', expenseRoutes);
  app.use('/categories', categoryRoutes);

  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'Page not found',
      message: 'Check the address or return to the dashboard.'
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const clientError = [400, 413, 415].includes(error.status);
    if (!clientError) console.error(error);

    res.status(clientError ? error.status : 500).render('error', {
      title: clientError ? 'Invalid request' : 'Something went wrong',
      message: clientError
        ? 'Open the form again and check the information you submitted.'
        : 'Try again in a moment or return to the dashboard.'
    });
  });

  return app;
}

if (require.main === module) {
  const db = openDatabase();
  createApp(db).listen(3000, 'localhost', () => {
    console.log('Masrofaty is running at http://localhost:3000');
  });
}

module.exports = createApp;
