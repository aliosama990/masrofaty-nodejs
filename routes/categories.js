const router = require('express').Router();
const { index, create } = require('../controllers/categories');

router.get('/', index);
router.post('/', create);

module.exports = router;
