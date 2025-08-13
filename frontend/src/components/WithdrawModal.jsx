import React, { useState, useEffect } from 'react';

const WithdrawModal = ({ isOpen, onClose, part, onWithdraw }) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (part) {
      setFormData({
        part_id: part._id,
        quantity: 0,
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setErrors({});
  }, [part]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting withdrawal request:', {
        part_id: part._id,
        quantity: formData.quantity,
        notes: formData.notes,
        date: formData.date
      });

      await onWithdraw({
        part_id: part._id,
        quantity: formData.quantity,
        notes: formData.notes,
        date: formData.date
      });
      
      onClose();
    } catch (error) {
      console.error('Error withdrawing item:', error);
      // Show user-friendly error message
      alert('Failed to withdraw items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (formData.quantity > part?.quantity_in_stock) {
      newErrors.quantity = `Cannot withdraw more than available stock (${part?.quantity_in_stock})`;
    }
    
    if (!formData.notes.trim()) {
      newErrors.notes = 'Notes are required for withdrawal transactions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (!isOpen || !part) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Withdraw Item</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Part Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Part Information</h3>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Name:</span> {part.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Part ID:</span> {part.part_id}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Available Stock:</span> {part.quantity_in_stock} {part.unit}
              </p>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Withdraw *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
              min="0"
              max={part.quantity_in_stock}
              step="1"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter quantity"
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Maximum available: {part.quantity_in_stock} {part.unit}
            </p>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Withdrawal *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Used for production, damaged items, quality control testing, etc."
            />
            {errors.notes && <p className="text-red-500 text-sm mt-1">{errors.notes}</p>}
            <p className="text-xs text-gray-500 mt-1">
              This note will be recorded in the transaction history
            </p>
          </div>

          {/* Stock Impact Preview */}
          {formData.quantity > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Stock Impact</h4>
              <p className="text-sm text-yellow-700">
                Current: {part.quantity_in_stock} {part.unit} → After withdrawal: {part.quantity_in_stock - formData.quantity} {part.unit}
              </p>
              {(part.quantity_in_stock - formData.quantity) <= part.min_stock_level && (
                <p className="text-sm text-red-600 mt-1 font-medium">
                  ⚠️ This will bring stock below minimum level ({part.min_stock_level})
                </p>
              )}
            </div>
          )}

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
              disabled={loading || formData.quantity <= 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Withdraw Items'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
