const express = require('express');
const router = express.Router();
const {
  getAllScrapItems,
  getScrapItemById,
  createScrapItem,
  updateScrapItem,
  deleteScrapItem,
  updateScrapItemStock,
  getScrapItemsByRawItem,
  addScrapFromOperation,
  useScrapItem
} = require('../controllers/scrapItemController');

// Get all scrap items with optional filtering and pagination
router.get('/', getAllScrapItems);

// Get scrap items by raw item ID
router.get('/raw-item/:rawItemId', getScrapItemsByRawItem);

// Get scrap item by ID
router.get('/:id', getScrapItemById);

// Create new scrap item
router.post('/', createScrapItem);

// Add scrap from manufacturing operation
router.post('/add-from-operation', addScrapFromOperation);

// Update scrap item
router.put('/:id', updateScrapItem);

// Update stock for scrap item
router.patch('/:id/stock', updateScrapItemStock);

// Use scrap item (reduce quantity)
router.patch('/:id/use', useScrapItem);

// Delete scrap item (soft delete)
router.delete('/:id', deleteScrapItem);

module.exports = router;

