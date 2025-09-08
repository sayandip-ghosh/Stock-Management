import React, { useState, useEffect } from 'react';
import { partsAPI } from '../services/api';

const PurchaseOrderModal = ({ isOpen, onClose, onSave, purchaseOrder = null }) => {
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_contact: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'pending',
    notes: '',
    items: []
  });
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Add search state for part selection
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);
  const [selectedPartName, setSelectedPartName] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      fetchParts();
      // Reset form for new purchase orders or populate for editing
      if (purchaseOrder) {
        setFormData({
          supplier_name: purchaseOrder.supplier_name || '',
          supplier_contact: purchaseOrder.supplier_contact || '',
          order_date: purchaseOrder.order_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          expected_delivery_date: purchaseOrder.expected_delivery_date?.split('T')[0] || '',
          status: purchaseOrder.status || 'pending',
          notes: purchaseOrder.notes || '',
          items: purchaseOrder.items || []
        });
      } else {
        resetForm();
      }
    } else {
      // Reset form when modal is closed and it's not an edit operation
      if (!purchaseOrder) {
        resetForm();
      }
    }
  }, [isOpen, purchaseOrder]);

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll({ limit: 1000 });
      setParts(response.data.parts || []);
      console.log('Fetched parts for PO modal:', response.data.parts?.length);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  // Filter parts based on search term
  const filteredParts = parts.filter(part => 
    part.name?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.part_id?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.type?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(partSearchTerm.toLowerCase())
  );

  const handlePartSelect = (part) => {
    const newItem = {
      part_id: part._id,
      part_name: part.name,
      part_number: part.part_id,
      unit: part.unit,
      part_weight: part.weight || 0,
      quantity_ordered: 1,
      cost_unit_type: 'piece',
      cost_per_unit_input: part.cost_per_unit || 0,
      unit_cost: part.cost_per_unit || 0,
      total_cost: part.cost_per_unit || 0,
      notes: ''
    };
    
    // Check if part already exists in items
    const existingItemIndex = formData.items.findIndex(item => item.part_id === part._id);
    if (existingItemIndex >= 0) {
      alert('This part is already added to the purchase order');
      resetPartSelection();
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    resetPartSelection();
  };

  const handlePartSearchChange = (e) => {
    const value = e.target.value;
    setPartSearchTerm(value);
    setIsPartDropdownOpen(value.length > 0);
    
    // Clear selection if search is cleared
    if (value === '') {
      setSelectedPartName('');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_name: '',
      supplier_contact: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'pending',
      notes: '',
      items: []
    });
    setErrors({});
    resetPartSelection();
  };

  const resetPartSelection = () => {
    setSelectedPartName('');
    setPartSearchTerm('');
    setIsPartDropdownOpen(false);
  };

  const addItem = () => {
    // This function is now replaced by handlePartSelect
    // But we'll keep it for backward compatibility
    const newItem = {
      part_id: '',
      part_name: '',
      part_number: '',
      unit: 'pcs',
      part_weight: 0,
      quantity_ordered: 1,
      cost_unit_type: 'piece',
      cost_per_unit_input: 0,
      unit_cost: 0,
      total_cost: 0,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    
    // Handle cost conversion when unit type or input cost changes
    if (field === 'cost_unit_type' || field === 'cost_per_unit_input') {
      const item = items[index];
      
      if (item.cost_unit_type === 'kg' && item.part_weight > 0) {
        // Convert cost per kg to cost per piece
        item.unit_cost = (item.cost_per_unit_input || 0) * item.part_weight;
      } else {
        // Use the input value directly for 'piece' unit type
        item.unit_cost = item.cost_per_unit_input || 0;
      }
      
      // Recalculate total cost
      item.total_cost = (item.quantity_ordered || 0) * (item.unit_cost || 0);
    }
    
    // Recalculate total cost when quantity changes
    if (field === 'quantity_ordered') {
      items[index].total_cost = (items[index].quantity_ordered || 0) * (items[index].unit_cost || 0);
    }
    
    setFormData(prev => ({ ...prev, items }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required';
    }
    
    if (!formData.order_date) {
      newErrors.order_date = 'Order date is required';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    formData.items.forEach((item, index) => {
      if (!item.part_id) {
        newErrors[`item_${index}_part`] = 'Part selection is required';
      }
      if (item.quantity_ordered <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if ((item.cost_per_unit_input || 0) < 0) {
        newErrors[`item_${index}_cost`] = 'Cost input cannot be negative';
      }
      if (!(item.cost_per_unit_input > 0)) {
        newErrors[`item_${index}_cost_required`] = 'Cost input is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Ensure proper data format for backend
      const submitData = {
        supplier_name: formData.supplier_name.trim(),
        supplier_contact: formData.supplier_contact?.trim() || '',
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes?.trim() || '',
        items: formData.items.map(item => ({
          part_id: item.part_id,
          part_name: item.part_name, // Include for document generation
          unit: item.unit, // Include for document generation
          quantity_ordered: parseFloat(item.quantity_ordered) || 0,
          cost_unit_type: item.cost_unit_type || 'piece',
          cost_per_unit_input: parseFloat(item.cost_per_unit_input) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
          notes: item.notes?.trim() || ''
        })).filter(item => item.part_id && item.quantity_ordered > 0)
      };

      console.log('Submitting purchase order data:', JSON.stringify(submitData, null, 2));
      
      await onSave(submitData);
      
      // Reset form after successful creation (not for edits)
      if (!purchaseOrder) {
        resetForm();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        // Show validation errors to user
        const validationErrors = {};
        error.response.data.errors.forEach(err => {
          validationErrors[err.path || err.param] = err.msg;
        });
        setErrors(validationErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Supplier Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.supplier_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter supplier name"
                  required
                />
                {errors.supplier_name && <p className="text-red-500 text-sm mt-1">{errors.supplier_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Contact
                </label>
                <input
                  type="text"
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Phone, email, or contact person"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Add Parts Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Parts</h3>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search and Select Part
                </label>
                
                {/* Searchable Part Selector */}
                <div className="relative">
                  <input
                    type="text"
                    value={selectedPartName || partSearchTerm}
                    onChange={handlePartSearchChange}
                    onFocus={() => {
                      if (!selectedPartName) {
                        setIsPartDropdownOpen(true);
                      }
                    }}
                    placeholder="Search parts by name, ID, type, or category..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  
                  {/* Clear button */}
                  {(selectedPartName || partSearchTerm) && (
                    <button
                      type="button"
                      onClick={resetPartSelection}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                  
                  {/* Dropdown arrow */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPartName) {
                        resetPartSelection();
                      } else {
                        setIsPartDropdownOpen(!isPartDropdownOpen);
                        setPartSearchTerm('');
                      }
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown list */}
                  {isPartDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredParts.length > 0 ? (
                        <>
                          {filteredParts.map(part => (
                            <button
                              key={part._id}
                              type="button"
                              onClick={() => handlePartSelect(part)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {part.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {part.part_id} | {part.type} | {part.category}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-medium ${
                                    part.quantity_in_stock <= 0 ? 'text-red-600' :
                                    part.quantity_in_stock <= (part.min_stock_level || 0) ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {part.quantity_in_stock} {part.unit}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    ₹{(part.cost_per_unit || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-center">
                          {partSearchTerm ? `No parts found matching "${partSearchTerm}"` : 'No parts available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  Type to search for parts or click the dropdown arrow to browse all parts
                </p>
              </div>
            </div>

            {/* Purchase Order Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items ({formData.items.length})</h3>
                <div className="text-sm text-gray-600">
                  Total Amount: <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Input (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.part_name || 'Unknown Part'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.part_number} | {item.unit}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={item.quantity_ordered}
                              onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                              min="0.01"
                              step="0.01"
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={item.cost_unit_type || 'piece'}
                              onChange={(e) => updateItem(index, 'cost_unit_type', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                              <option value="piece">Piece</option>
                              <option value="kg">Kg</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={item.cost_per_unit_input || ''}
                              onChange={(e) => updateItem(index, 'cost_per_unit_input', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder={item.cost_unit_type === 'kg' ? '₹ Cost/kg' : '₹ Cost/piece'}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            ₹{(item.unit_cost || 0).toFixed(2)}
                            {item.cost_unit_type === 'kg' && item.part_weight > 0 && (
                              <div className="text-xs text-gray-400">
                                (₹{(item.cost_per_unit_input || 0).toFixed(2)}/kg × {item.part_weight}kg)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{(item.total_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => updateItem(index, 'notes', e.target.value)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              placeholder="Optional notes"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-lg font-medium mb-1">No items added yet</div>
                  <div className="text-sm">Search and select parts above to add them to this purchase order</div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Additional notes for this purchase order"
              />
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                if (!purchaseOrder) {
                  resetForm();
                }
                onClose();
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || formData.items.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (purchaseOrder ? 'Update Order' : 'Create Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
