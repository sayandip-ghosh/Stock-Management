const express = require('express');
const router = express.Router();
const bomController = require('../controllers/bomController');

// BOM CRUD routes
router.get('/', bomController.getAllBOMs);
router.get('/:id', bomController.getBOMById);
router.get('/product/:productId', bomController.getProductBOM);
router.get('/part/:partId/products', bomController.getProductsUsingPart);
router.get('/product/:productId/check', bomController.checkProductBOM);

router.post('/', bomController.createBOM);
router.put('/:id', bomController.updateBOM);
router.delete('/:id', bomController.deleteBOM);

module.exports = router;
