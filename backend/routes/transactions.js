const express = require('express');
const {
  validateTransaction,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  getTransactionSummary,
  getRecentTransactions,
  getTransactionsByPart,
  getTransactionStatistics
} = require('../controllers/transactionController');

const router = express.Router();

// GET all transactions
router.get('/', getAllTransactions);

// GET transaction by ID
router.get('/:id', getTransactionById);

// POST create new transaction
router.post('/', validateTransaction, createTransaction);

// GET transaction summary
router.get('/summary/overview', getTransactionSummary);

// GET recent transactions
router.get('/recent/list', getRecentTransactions);

// GET transactions by part
router.get('/part/:part_id', getTransactionsByPart);

// GET transaction statistics
router.get('/stats/overview', getTransactionStatistics);

module.exports = router;

