import React, { useState, useEffect } from 'react';
import { bomAPI, partsAPI } from '../services/api';

const AssemblyBOMModal = ({ isOpen, onClose, assembly, onUpdate }) => {
  const [parts, setParts] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [selectedBOMItem, setSelectedBOMItem] = useState(null);
  const [isEditBOMModalOpen, setIsEditBOMModalOpen] = useState(false);

  useEffect(() => {
    if (assembly && isOpen) {
      fetchData();
    }
  }, [assembly, isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [partsResponse, bomResponse] = await Promise.all([
        partsAPI.getAll(),
        bomAPI.getProductBOM(assembly._id)
      ]);
      
      setParts(partsResponse.data.parts || []);
      setBomItems(bomResponse.data.bom || []);
    } catch (error) {
      console.error('Error fetching BOM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async (formData) => {
    try {
      await bomAPI.create({
        productId: assembly._id,
        partId: formData.partId,
        quantityPerUnit: formData.quantityPerUnit,
        isOptional: formData.isOptional || false,
        notes: formData.notes || ''
      });
      
      fetchData();
      setIsAddPartModalOpen(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding part to BOM:', error);
      throw error;
    }
  };

  const handleUpdateBOM = async (bomId, formData) => {
    try {
      await bomAPI.update(bomId, formData);
      fetchData();
      setIsEditBOMModalOpen(false);
      setSelectedBOMItem(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating BOM:', error);
      throw error;
    }
  };

  const handleDeleteBOM = async (bomId) => {
    if (window.confirm('Are you sure you want to remove this part from the BOM?')) {
      try {
        await bomAPI.delete(bomId);
        fetchData();
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error deleting BOM item:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Bill of Materials - {assembly?.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">{assembly?.description}</p>
          <button
            onClick={() => setIsAddPartModalOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Add Part to BOM</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading BOM details...</p>
          </div>
        ) : bomItems.length > 0 ? (
          <div className="space-y-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Per Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Optional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bomItems.map((bomItem) => {
                  const part = parts.find(p => p._id === bomItem.partId);
                  const stockAvailable = part?.quantity_in_stock || 0;
                  const requiredQty = bomItem.quantityPerUnit;
                  const stockStatus = stockAvailable >= requiredQty ? 'sufficient' : 'insufficient';

                  return (
                    <tr key={bomItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-blue-600 text-xs">📦</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{part?.name || 'Unknown Part'}</div>
                            <div className="text-sm text-gray-500">{part?.part_id || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bomItem.quantityPerUnit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {part?.unit || 'pcs'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm ${
                            stockStatus === 'sufficient' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stockAvailable}
                          </span>
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            stockStatus === 'sufficient' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {stockStatus === 'sufficient' ? '✓' : '⚠️'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bomItem.isOptional 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {bomItem.isOptional ? 'Optional' : 'Required'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bomItem.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedBOMItem(bomItem);
                              setIsEditBOMModalOpen(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteBOM(bomItem._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* BOM Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">BOM Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Parts</p>
                  <p className="text-lg font-semibold">{bomItems.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Required Parts</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {bomItems.filter(item => !item.isOptional).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Optional Parts</p>
                  <p className="text-lg font-semibold text-yellow-600">
                    {bomItems.filter(item => item.isOptional).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stock Status</p>
                  <p className={`text-lg font-semibold ${
                    bomItems.every(item => {
                      const part = parts.find(p => p._id === item.partId);
                      return (part?.quantity_in_stock || 0) >= item.quantityPerUnit;
                    }) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {bomItems.every(item => {
                      const part = parts.find(p => p._id === item.partId);
                      return (part?.quantity_in_stock || 0) >= item.quantityPerUnit;
                    }) ? 'Ready' : 'Insufficient'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📋</div>
            <div className="text-gray-500 text-lg font-medium mb-2">No BOM items defined</div>
            <div className="text-gray-400 text-sm">Add parts to this assembly to create a bill of materials.</div>
          </div>
        )}

        {/* Add Part Modal */}
        {isAddPartModalOpen && (
          <AddPartModal
            isOpen={isAddPartModalOpen}
            onClose={() => setIsAddPartModalOpen(false)}
            onSubmit={handleAddPart}
            parts={parts}
            existingPartIds={bomItems.map(item => item.partId)}
          />
        )}

        {/* Edit BOM Modal */}
        {isEditBOMModalOpen && selectedBOMItem && (
          <EditBOMModal
            isOpen={isEditBOMModalOpen}
            onClose={() => {
              setIsEditBOMModalOpen(false);
              setSelectedBOMItem(null);
            }}
            onSubmit={(formData) => handleUpdateBOM(selectedBOMItem._id, formData)}
            bomItem={selectedBOMItem}
            parts={parts}
          />
        )}
      </div>
    </div>
  );
};

// Add Part Modal Component
const AddPartModal = ({ isOpen, onClose, onSubmit, parts, existingPartIds }) => {
  const [formData, setFormData] = useState({
    partId: '',
    quantityPerUnit: 1,
    isOptional: false,
    notes: ''
  });

  const availableParts = parts.filter(part => !existingPartIds.includes(part._id));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Add Part to BOM</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Part</label>
            <select
              value={formData.partId}
              onChange={(e) => setFormData({ ...formData, partId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Select a part</option>
              {availableParts.map(part => (
                <option key={part._id} value={part._id}>
                  {part.name} ({part.part_id}) - Stock: {part.quantity_in_stock}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Per Unit</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantityPerUnit}
              onChange={(e) => setFormData({ ...formData, quantityPerUnit: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isOptional"
              checked={formData.isOptional}
              onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="isOptional" className="ml-2 block text-sm text-gray-900">
              Optional part
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Optional notes about this part requirement"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add Part
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit BOM Modal Component
const EditBOMModal = ({ isOpen, onClose, onSubmit, bomItem, parts }) => {
  const [formData, setFormData] = useState({
    quantityPerUnit: bomItem?.quantityPerUnit || 1,
    isOptional: bomItem?.isOptional || false,
    notes: bomItem?.notes || ''
  });

  useEffect(() => {
    if (bomItem) {
      setFormData({
        quantityPerUnit: bomItem.quantityPerUnit || 1,
        isOptional: bomItem.isOptional || false,
        notes: bomItem.notes || ''
      });
    }
  }, [bomItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  const part = parts.find(p => p._id === bomItem.partId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Edit BOM Item</h3>
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">Part: <span className="font-semibold">{part?.name}</span></p>
          <p className="text-sm text-gray-600">Part ID: {part?.part_id}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Per Unit</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={formData.quantityPerUnit}
              onChange={(e) => setFormData({ ...formData, quantityPerUnit: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="editIsOptional"
              checked={formData.isOptional}
              onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="editIsOptional" className="ml-2 block text-sm text-gray-900">
              Optional part
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Optional notes about this part requirement"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Update BOM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssemblyBOMModal;
