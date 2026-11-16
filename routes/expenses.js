const router = require('express').Router();
const expenses = require('../controllers/expenses');

router.get('/', expenses.index);
router.get('/new', expenses.newForm);
router.post('/', expenses.create);
router.get('/:id/edit', expenses.editForm);
router.post('/:id/edit', expenses.update);
router.get('/:id/delete', expenses.deleteForm);
router.post('/:id/delete', expenses.remove);

module.exports = router;
