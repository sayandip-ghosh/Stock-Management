import React, { useState, useEffect } from 'react';
import { partsAPI, assembliesAPI } from '../services/api';

const AssemblyBOMModal = ({ isOpen, onClose, assembly, onUpdate }) => {
  const [parts, setParts] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [newBomItem, setNewBomItem] = useState({
    part_id: '',
    quantity_required: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && assembly) {
      fetchParts();
      // Refetch assembly data to get latest stock levels
      fetchAssemblyData();
    }
  }, [isOpen, assembly]);

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      console.log('Fetched parts:', response.data.parts?.length);
      setParts(response.data.parts || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const fetchAssemblyData = async () => {
    if (!assembly) return;
    
    try {
      const response = await assembliesAPI.getById(assembly._id);
      console.log('Refreshed assembly data:', response.data);
      setBomItems(response.data.bom_items || []);
    } catch (error) {
      console.error('Error fetching assembly data:', error);
      // Fallback to existing data
      setBomItems(assembly.bom_items || []);
    }
  };

  const addBOMItem = async () => {
    if (!newBomItem.part_id || newBomItem.quantity_required <= 0) {
      setErrors({ general: 'Please select a part and enter valid quantity' });
      return;
    }

    // Check if part already exists in BOM - handle both populated and non-populated cases
    const existingItem = bomItems.find(item => {
      const itemPartId = typeof item.part_id === 'object' ? item.part_id._id : item.part_id;
      return itemPartId === newBomItem.part_id;
    });
    
    if (existingItem) {
      setErrors({ general: 'Part already exists in BOM' });
      return;
    }

    setLoading(true);
    try {
      console.log('Adding BOM item:', {
        assembly_id: assembly._id,
        part_id: newBomItem.part_id,
        quantity_required: newBomItem.quantity_required,
        notes: newBomItem.notes
      });
      
      const response = await assembliesAPI.addPart(assembly._id, {
        part_id: newBomItem.part_id,
        quantity_required: newBomItem.quantity_required,
        notes: newBomItem.notes
      });
      
      console.log('BOM item added successfully:', response.data);
      setBomItems(response.data.bom_items || []);
      setNewBomItem({ part_id: '', quantity_required: 1, notes: '' });
      setErrors({});
      
      // Refresh parts data to get latest stock levels
      await fetchParts();
      onUpdate();
    } catch (error) {
      console.error('Error adding BOM item:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to add BOM item' 
      });
    } finally {
      setLoading(false);
    }
  };

  const removeBOMItem = async (itemId) => {
    setLoading(true);
    try {
      console.log('Removing BOM item:', {
        assembly_id: assembly._id,
        item_id: itemId
      });
      
      const response = await assembliesAPI.removePart(assembly._id, itemId);
      console.log('BOM item removed successfully:', response.data);
      setBomItems(response.data.bom_items || []);
      
      // Refresh parts data to get latest stock levels
      await fetchParts();
      onUpdate();
    } catch (error) {
      console.error('Error removing BOM item:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to remove BOM item' 
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return bomItems.reduce((total, item) => {
      const partCost = item.part_id?.cost_per_unit || 0;
      return total + (partCost * item.quantity_required);
    }, 0).toFixed(2);
  };

  const checkAvailability = (item, buildQuantity = 1) => {
    const required = item.quantity_required * buildQuantity;
    
    // Try multiple ways to access the available stock
    let available = 0;
    if (item.part_id) {
      if (typeof item.part_id === 'object') {
        // If part_id is populated as an object
        available = item.part_id.quantity_in_stock || 0;
      } else {
        // If part_id is just an ID, try to find the part in the parts array
        const partData = parts.find(part => part._id === item.part_id);
        available = partData?.quantity_in_stock || 0;
      }
    }
    
    return {
      canBuild: available >= required,
      shortage: Math.max(0, required - available)
    };
  };

  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bill of Materials (BOM)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Assembly: {assembly.name} ({assembly.assembly_id})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New BOM Item */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add BOM Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part *
                </label>
                <select
                  value={newBomItem.part_id}
                  onChange={(e) => setNewBomItem(prev => ({ ...prev, part_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a part</option>
                  {parts.map(part => (
                    <option key={part._id} value={part._id}>
                      {part.name} ({part.part_id}) - Stock: {part.quantity_in_stock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Required *
                </label>
                <input
                  type="number"
                  value={newBomItem.quantity_required}
                  onChange={(e) => setNewBomItem(prev => ({ ...prev, quantity_required: parseFloat(e.target.value) || 0 }))}
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={addBOMItem}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={newBomItem.notes}
                onChange={(e) => setNewBomItem(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Optional notes for this BOM item"
              />
            </div>

            {errors.general && (
              <p className="text-red-500 text-sm mt-2">{errors.general}</p>
            )}
          </div>

          {/* BOM Items List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">BOM Items ({bomItems.length})</h3>
              <div className="text-sm text-gray-600">
                Total Cost per Assembly: <span className="font-semibold">${calculateTotalCost()}</span>
              </div>
            </div>

            {bomItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Required</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bomItems.map((item) => {
                      const availability = checkAvailability(item);
                      
                      // Handle both populated and non-populated part data
                      const partData = typeof item.part_id === 'object' 
                        ? item.part_id 
                        : parts.find(part => part._id === item.part_id);
                      
                      const partName = partData?.name || 'Unknown Part';
                      const partId = partData?.part_id || 'N/A';
                      const partUnit = partData?.unit || 'pcs';
                      const partCost = partData?.cost_per_unit || 0;
                      const partStock = partData?.quantity_in_stock || 0;
                      
                      const totalCost = partCost * item.quantity_required;

                      return (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {partName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {partId}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity_required} {partUnit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            <span className={`${partStock <= 0 ? 'text-red-600' : partStock <= (partData?.min_stock_level || 0) ? 'text-yellow-600' : 'text-green-600'}`}>
                              {partStock} {partUnit}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${partCost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            ${totalCost.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              availability.canBuild
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {availability.canBuild ? 'Available' : `Short ${availability.shortage}`}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => removeBOMItem(item._id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No BOM items added yet. Add parts above to create the bill of materials.
              </div>
            )}
          </div>

          {/* Build Readiness Summary */}
          {bomItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Build Readiness</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Parts Required:</span>
                  <span className="ml-2 font-medium">{bomItems.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Parts Available:</span>
                  <span className="ml-2 font-medium">
                    {bomItems.filter(item => checkAvailability(item).canBuild).length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Can Build:</span>
                  <span className={`ml-2 font-medium ${
                    bomItems.every(item => checkAvailability(item).canBuild) 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {bomItems.every(item => checkAvailability(item).canBuild) ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblyBOMModal;
