const express = require('express');
const router = express.Router();
const {
  validateStockOperation,
  performStockOperation,
  getPartStockHistory,
  getCurrentStockLevels
} = require('../controllers/stockManagementController');

// Perform stock operation (DELIVERY/WITHDRAWAL)
router.post('/operation', validateStockOperation, performStockOperation);

// Get stock history for a specific part
router.get('/history/:part_id', getPartStockHistory);

// Get current stock levels with filters
router.get('/current-levels', getCurrentStockLevels);

module.exports = router;