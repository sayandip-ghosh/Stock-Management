const express = require('express');
const router = express.Router();
const {
  getAllRawItems,
  getRawItemById,
  createRawItem,
  updateRawItem,
  deleteRawItem,
  updateRawItemStock,
  getLowStockRawItems,
  getRawItemsByMaterialType
} = require('../controllers/rawItemController');

// Get all raw items with optional filtering and pagination
router.get('/', getAllRawItems);

// Get raw items by material type
router.get('/material/:materialType', getRawItemsByMaterialType);

// Get low stock raw items
router.get('/low-stock', getLowStockRawItems);

// Get raw item by ID
router.get('/:id', getRawItemById);

// Create new raw item
router.post('/', createRawItem);

// Update raw item
router.put('/:id', updateRawItem);

// Update stock for raw item
router.patch('/:id/stock', updateRawItemStock);

// Delete raw item (soft delete)
router.delete('/:id', deleteRawItem);

module.exports = router;
