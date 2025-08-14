const express = require('express');
const {
  validateStockOperation,
  performStockOperation,
  getPartStockHistory,
  getCurrentStockLevels
} = require('../controllers/stockManagementController');

const router = express.Router();

// POST perform stock operation
router.post('/operation', validateStockOperation, performStockOperation);

// GET part stock history
router.get('/history/:part_id', getPartStockHistory);

// GET current stock levels
router.get('/current-levels', getCurrentStockLevels);

module.exports = router;