import React, { useState, useEffect } from 'react';
import { purchaseOrdersAPI } from '../services/api';

const StockOperationModal = ({ isOpen, onClose, part, parts = [], onSave }) => {
  const [formData, setFormData] = useState({
    part_id: '',
    operation_type: 'addition',
    quantity: 0,
    purchase_order_id: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchPendingOrders();
      // Fetch all parts for dropdown
      fetchAllParts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (part) {
      setFormData(prev => ({
        ...prev,
        part_id: part._id
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        part_id: ''
      }));
    }
    setErrors({});
  }, [part]);

  const fetchPendingOrders = async () => {
    try {
      const response = await purchaseOrdersAPI.getPending();
      setPendingOrders(response.data.purchase_orders || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const fetchAllParts = async () => {
    try {
      const response = await partsAPI.getAll({ limit: 1000 });
      console.log('Fetched all parts for stock operation:', response.data.parts?.length);
      // This assumes parts are passed as props, but if not, we'd need to add state for parts
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error saving stock operation:', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.part_id) {
      newErrors.part_id = 'Part selection is required';
    }
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (formData.operation_type === 'addition' && !formData.purchase_order_id && !formData.notes) {
      newErrors.reference = 'Either purchase order or notes explaining the addition is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Stock Operation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Part Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Part *
            </label>
            <select
              value={formData.part_id}
              onChange={(e) => setFormData(prev => ({ ...prev, part_id: e.target.value }))}
              disabled={!!part}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.part_id ? 'border-red-500' : 'border-gray-300'
              } ${part ? 'bg-gray-100' : ''}`}
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              <option value="">Select a part</option>
              {parts.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.part_id}) - Current: {p.quantity_in_stock}
                </option>
              ))}
            </select>
            {errors.part_id && <p className="text-red-500 text-sm mt-1">{errors.part_id}</p>}
          </div>

          {/* Operation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operation Type *
            </label>
            <select
              value={formData.operation_type}
              onChange={(e) => setFormData(prev => ({ ...prev, operation_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="addition">Stock Addition</option>
              <option value="removal">Stock Removal</option>
              <option value="adjustment">Stock Adjustment</option>
            </select>
          </div>

          {/* Purchase Order (for additions) */}
          {formData.operation_type === 'addition' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purchase Order (Optional)
              </label>
              <select
                value={formData.purchase_order_id}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_order_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                <option value="">Manual Addition (No PO)</option>
                {pendingOrders.map(order => (
                  <option key={order._id} value={order._id}>
                    {order.order_number} - {order.supplier?.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Link this addition to a purchase order for better tracking
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="1"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter quantity"
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes {formData.operation_type === 'addition' && !formData.purchase_order_id && '*'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.reference ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={
                formData.operation_type === 'addition' 
                  ? 'Reason for stock addition (required if no purchase order selected)'
                  : 'Reason for this operation'
              }
            />
            {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
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
              {loading ? 'Processing...' : 'Execute Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockOperationModal;