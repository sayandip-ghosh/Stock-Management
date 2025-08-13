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

  useEffect(() => {
    if (isOpen) {
      fetchParts();
    }
  }, [isOpen]);

  useEffect(() => {
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
      setFormData({
        supplier_name: '',
        supplier_contact: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        status: 'pending',
        notes: '',
        items: []
      });
    }
  }, [purchaseOrder]);

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      // Get all parts without pagination
      setParts(response.data.parts || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        part_id: '',
        quantity_ordered: 0,
        quantity_received: 0,
        unit_cost: 0,
        notes: ''
      }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
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
          part_id: item.part_id,
          quantity_ordered: parseFloat(item.quantity_ordered) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
          notes: item.notes?.trim() || ''
        })).filter(item => item.part_id && item.quantity_ordered > 0)
      };

      console.log('Submitting purchase order data:', JSON.stringify(submitData, null, 2));
      
      await onSave(submitData);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Header */}
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.order_date ? 'border-red-500' : 'border-gray-300'
                }`}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {purchaseOrder && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partially Received</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Order notes or special instructions"
            />
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Add Item
              </button>
            </div>
            
            {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}

            <div className="space-y-4">
              {formData.items.map((item, index) => {
                // Find the selected part to display additional info
                const selectedPart = parts.find(part => part._id === item.part_id);
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Part *
                        </label>
                        <select
                          value={item.part_id}
                          onChange={(e) => updateItem(index, 'part_id', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errors[`item_${index}_part`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Part</option>
                          {parts.map(part => (
                            <option key={part._id} value={part._id}>
                              {part.name} ({part.part_id}) - Stock: {part.quantity_in_stock}
                            </option>
                          ))}
                        </select>
                        {errors[`item_${index}_part`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_part`]}</p>
                        )}
                        {selectedPart && (
                          <div className="mt-1 text-xs text-gray-500">
                            Current Stock: {selectedPart.quantity_in_stock} {selectedPart.unit} | 
                            Category: {selectedPart.type || 'N/A'}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Ordered *
                        </label>
                        <input
                          type="number"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="1"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Cost
                        </label>
                        <input
                          type="number"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            errors[`item_${index}_cost`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                        />
                        {errors[`item_${index}_cost`] && (
                          <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_cost`]}</p>
                        )}
                        {item.unit_cost > 0 && item.quantity_ordered > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            Total: ${(item.unit_cost * item.quantity_ordered).toFixed(2)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-full bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Item Notes */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Notes
                      </label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Special instructions for this item"
                      />
                    </div>

                    {purchaseOrder && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Received
                          </label>
                          <input
                            type="number"
                            value={item.quantity_received || 0}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remaining
                          </label>
                          <input
                            type="number"
                            value={(item.quantity_ordered || 0) - (item.quantity_received || 0)}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Progress
                          </label>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${item.quantity_ordered > 0 ? ((item.quantity_received || 0) / item.quantity_ordered) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Order Summary */}
            {formData.items.length > 0 && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-2">Order Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Items:</span>
                    <span className="ml-2 font-medium">
                      {formData.items.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="ml-2 font-medium">
                      ${formData.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (item.unit_cost || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Part Types:</span>
                    <span className="ml-2 font-medium">{formData.items.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (purchaseOrder ? 'Update Order' : 'Create Order')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
