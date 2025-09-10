import React, { useState, useEffect } from 'react';
import { rawItemsAPI } from '../services/api';

const RawItemPurchaseOrderModal = ({ isOpen, onClose, purchaseOrder = null, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_contact: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'pending',
    items: [],
    notes: ''
  });
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState(false);

  // Add search state for raw item selection
  const [rawItemSearchTerm, setRawItemSearchTerm] = useState('');
  const [isRawItemDropdownOpen, setIsRawItemDropdownOpen] = useState(false);
  const [selectedRawItemName, setSelectedRawItemName] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      fetchRawItems();
    }
  }, [isOpen]);

  useEffect(() => {
    if (purchaseOrder) {
      console.log('Loading purchase order:', purchaseOrder);
      console.log('Purchase order items:', purchaseOrder.items);
      
      setFormData({
        supplier_name: purchaseOrder.supplier_name || '',
        supplier_contact: purchaseOrder.supplier_contact || '',
        order_date: purchaseOrder.order_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        expected_delivery_date: purchaseOrder.expected_delivery_date?.split('T')[0] || '',
        status: purchaseOrder.status || 'pending',
        items: purchaseOrder.items || [],
        notes: purchaseOrder.notes || ''
      });
      setViewMode(true);
    } else {
      setFormData({
        supplier_name: '',
        supplier_contact: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        status: 'pending',
        items: [],
        notes: ''
      });
      setViewMode(false);
    }
    setErrors({});
  }, [purchaseOrder]);

  const fetchRawItems = async () => {
    try {
      const response = await rawItemsAPI.getAll({ limit: 1000 });
      setRawItems(response.data.data || []);
      console.log('Fetched raw items for PO modal:', response.data.data?.length);
    } catch (error) {
      console.error('Error fetching raw items:', error);
    }
  };

  // Filter raw items based on search term
  const filteredRawItems = rawItems.filter(item => 
    item.name?.toLowerCase().includes(rawItemSearchTerm.toLowerCase()) ||
    item.item_id?.toLowerCase().includes(rawItemSearchTerm.toLowerCase()) ||
    item.material_type?.toLowerCase().includes(rawItemSearchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(rawItemSearchTerm.toLowerCase())
  );

  const handleRawItemSelect = (rawItem) => {
    const newItem = {
      raw_item_id: rawItem._id,
      raw_item_name: rawItem.name,
      item_id: rawItem.item_id,
      material_type: rawItem.material_type,
      unit: rawItem.unit,
      quantity_ordered: 1,
      unit_cost: rawItem.cost_per_unit || 0,
      total_cost: rawItem.cost_per_unit || 0,
      notes: ''
    };
    
    // Check if raw item already exists in items
    const existingItemIndex = formData.items.findIndex(item => item.raw_item_id === rawItem._id);
    if (existingItemIndex >= 0) {
      alert('This raw item is already added to the purchase order');
      resetRawItemSelection();
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    resetRawItemSelection();
  };

  const handleRawItemSearchChange = (e) => {
    const value = e.target.value;
    setRawItemSearchTerm(value);
    setIsRawItemDropdownOpen(value.length > 0);
    
    // Clear selection if search is cleared
    if (value === '') {
      setSelectedRawItemName('');
    }
  };

  const resetRawItemSelection = () => {
    setSelectedRawItemName('');
    setRawItemSearchTerm('');
    setIsRawItemDropdownOpen(false);
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
    
    // Recalculate total cost when quantity or unit cost changes
    if (field === 'quantity_ordered' || field === 'unit_cost') {
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
      if (!item.raw_item_id) {
        newErrors[`item_${index}_raw_item`] = 'Raw item selection is required';
      }
      if (item.quantity_ordered <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unit_cost < 0) {
        newErrors[`item_${index}_cost`] = 'Unit cost cannot be negative';
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
          raw_item_id: item.raw_item_id,
          quantity_ordered: parseFloat(item.quantity_ordered) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
          notes: item.notes?.trim() || ''
        })).filter(item => item.raw_item_id && item.quantity_ordered > 0)
      };

      console.log('Submitting raw item purchase order data:', JSON.stringify(submitData, null, 2));
      
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving raw item purchase order:', error);
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

  const handleDelete = async () => {
    if (!purchaseOrder) return;
    
    if (!window.confirm('Are you sure you want to delete this raw item purchase order?')) {
      return;
    }
    
    setLoading(true);
    try {
      await onDelete(purchaseOrder._id);
      onClose();
    } catch (error) {
      console.error('Error deleting raw item purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!purchaseOrder) return;
    
    const statusMessages = {
      'pending': 'Are you sure you want to set this order to pending status?',
      'completed': 'Are you sure you want to mark this order as received/completed?',
      'cancelled': 'Are you sure you want to cancel this order?'
    };
    
    if (!window.confirm(statusMessages[newStatus])) {
      return;
    }
    
    setLoading(true);
    try {
      // Only send the status update, not the entire form data
      const statusUpdateData = { status: newStatus };
      await onSave(statusUpdateData);
      
      // Show success message
      const successMessages = {
        'pending': 'Order status updated to pending',
        'completed': 'Order marked as received successfully',
        'cancelled': 'Order cancelled successfully'
      };
      
      alert(successMessages[newStatus]);
      onClose();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {purchaseOrder ? (viewMode ? 'Raw Item Purchase Order Details' : 'Edit Raw Item Purchase Order') : 'Create Raw Item Purchase Order'}
              </h2>
              {purchaseOrder && (
                <div className="mt-1 flex items-center space-x-4">
                  <p className="text-sm text-gray-600">
                    Order Number: {purchaseOrder.order_number} | Created: {new Date(purchaseOrder.createdAt).toLocaleDateString()}
                  </p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    formData.status === 'completed' ? 'bg-green-100 text-green-800' :
                    formData.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    formData.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {purchaseOrder && (
                <button
                  onClick={() => setViewMode(!viewMode)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  {viewMode ? 'Edit' : 'View'}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
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
                  readOnly={viewMode}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    viewMode ? 'bg-gray-50 border-gray-200' : 
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
                  readOnly={viewMode}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    viewMode ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                  }`}
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
                  readOnly={viewMode}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    viewMode ? 'bg-gray-50 border-gray-200' :
                    errors.order_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.order_date && <p className="text-red-500 text-sm mt-1">{errors.order_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  readOnly={viewMode}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    viewMode ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Status Field - Only show for existing orders */}
              {purchaseOrder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Status
                  </label>
                  {viewMode ? (
                    <div className="flex items-center">
                      <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg ${
                        formData.status === 'completed' ? 'bg-green-100 text-green-800' :
                        formData.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        formData.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Add Raw Items Section */}
            {!viewMode && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Raw Items</h3>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search and Select Raw Item
                  </label>
                  
                  {/* Searchable Raw Item Selector */}
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedRawItemName || rawItemSearchTerm}
                      onChange={handleRawItemSearchChange}
                      onFocus={() => {
                        if (!selectedRawItemName) {
                          setIsRawItemDropdownOpen(true);
                        }
                      }}
                      placeholder="Search raw items by name, ID, material type, or description..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {/* Clear button */}
                    {(selectedRawItemName || rawItemSearchTerm) && (
                      <button
                        type="button"
                        onClick={resetRawItemSelection}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                    
                    {/* Dropdown arrow */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRawItemName) {
                          resetRawItemSelection();
                        } else {
                          setIsRawItemDropdownOpen(!isRawItemDropdownOpen);
                          setRawItemSearchTerm('');
                        }
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown list */}
                    {isRawItemDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredRawItems.length > 0 ? (
                          <>
                            {filteredRawItems.map(item => (
                              <button
                                key={item._id}
                                type="button"
                                onClick={() => handleRawItemSelect(item)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {item.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {item.item_id} | {item.material_type} | {item.unit}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-medium ${
                                      item.quantity_in_stock <= 0 ? 'text-red-600' :
                                      item.quantity_in_stock <= (item.min_stock_level || 0) ? 'text-yellow-600' :
                                      'text-green-600'
                                    }`}>
                                      {item.quantity_in_stock} {item.unit}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      ${(item.cost_per_unit || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-center">
                            {rawItemSearchTerm ? `No raw items found matching "${rawItemSearchTerm}"` : 'No raw items available'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Type to search for raw items or click the dropdown arrow to browse all items
                  </p>
                </div>
              </div>
            )}

            {/* Purchase Order Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Items ({formData.items.length})</h3>
                <div className="text-sm text-gray-600">
                  Total Amount: <span className="font-semibold">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Item</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => {
                        // Get raw item data - either from populated data or from rawItems array
                        const rawItemData = item.raw_item_id && typeof item.raw_item_id === 'object' 
                          ? item.raw_item_id  // Populated data from backend
                          : rawItems.find(ri => ri._id === item.raw_item_id); // Look up from rawItems array
                        
                        console.log('Item data:', item);
                        console.log('Raw item data:', rawItemData);
                        console.log('Raw items array length:', rawItems.length);
                        
                        const itemName = rawItemData?.name || item.raw_item_name || 'Unknown Item';
                        const itemId = rawItemData?.item_id || item.item_id || 'N/A';
                        const materialType = rawItemData?.material_type || item.material_type || 'N/A';
                        const unit = rawItemData?.unit || item.unit || 'N/A';

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {itemName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {itemId} | {materialType} | {unit}
                                </div>
                              </div>
                            </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {viewMode ? (
                              <span className="text-sm font-medium">{item.quantity_ordered}</span>
                            ) : (
                              <input
                                type="number"
                                value={item.quantity_ordered}
                                onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                                min="0.01"
                                step="0.01"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {viewMode ? (
                              <span className="text-sm font-medium">${item.unit_cost}</span>
                            ) : (
                              <input
                                type="number"
                                value={item.unit_cost}
                                onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${(item.total_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            {viewMode ? (
                              <span className="text-sm text-gray-500">{item.notes || '-'}</span>
                            ) : (
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Optional notes"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {!viewMode && (
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <div className="text-lg font-medium mb-1">No items added yet</div>
                  <div className="text-sm">Search and select raw items above to add them to this purchase order</div>
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
                readOnly={viewMode}
                rows="3"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  viewMode ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
                }`}
                placeholder="Additional notes for this purchase order"
              />
            </div>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              {purchaseOrder && !viewMode && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete Order'}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* Status Actions - Only show in edit mode for existing orders */}
              {purchaseOrder && !viewMode && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Status Actions:</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('pending')}
                      disabled={loading || formData.status === 'pending'}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        formData.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-yellow-50'
                      } disabled:opacity-50`}
                    >
                      Set Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('completed')}
                      disabled={loading || formData.status === 'completed'}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        formData.status === 'completed' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-green-50'
                      } disabled:opacity-50`}
                    >
                      Mark Received
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('cancelled')}
                      disabled={loading || formData.status === 'cancelled'}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        formData.status === 'cancelled' 
                          ? 'bg-red-100 text-red-800 border-red-300' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-red-50'
                      } disabled:opacity-50`}
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              )}
              
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || formData.items.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (purchaseOrder ? 'Update Order' : 'Create Order')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawItemPurchaseOrderModal;
