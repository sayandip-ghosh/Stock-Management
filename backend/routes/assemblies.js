const express = require('express');
const {
  getAllAssemblies,
  getAssemblyById,
  createAssembly,
  updateAssembly,
  deleteAssembly,
  getAssemblyDetails,
  assembleProduct,
  getProductAssemblyHistory
} = require('../controllers/assemblyController');

const router = express.Router();

// Assembly CRUD routes
router.get('/', getAllAssemblies);
router.get('/:id', getAssemblyById);
router.get('/:assemblyId/details', getAssemblyDetails);
router.post('/', createAssembly);
router.put('/:id', updateAssembly);
router.delete('/:id', deleteAssembly);

// BOM-based assembly routes
router.post('/assemble', assembleProduct);
router.get('/product/:productId/history', getProductAssemblyHistory);

module.exports = router;
