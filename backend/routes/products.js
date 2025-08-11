const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product CRUD routes
router.get('/', productController.getAllProducts);
router.get('/assemblable', productController.getAssemblableProducts);
router.get('/:id', productController.getProductById);
router.get('/:id/bom', productController.getProductWithBOM);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Stock management routes
router.patch('/:id/stock', productController.updateProductStock);

module.exports = router;
