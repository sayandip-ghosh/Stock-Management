import React, { useState, useEffect } from 'react';
import { scrapItemsAPI, rawItemsAPI } from '../services/api';

const AddScrapModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    raw_item_id: '',
    quantity: 0,
    source_operation: 'manufacturing',
    source_details: {
      part_name: '',
      operation_date: new Date().toISOString().split('T')[0],
      operator: '',
      notes: ''
    }
  });

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRawItems();
      resetForm();
    }
  }, [isOpen]);

  const fetchRawItems = async () => {
    try {
      setLoading(true);
      const response = await rawItemsAPI.getAll();
      setRawItems(response.data.data || []);
    } catch (err) {
      console.error('Error fetching raw items:', err);
      setError('Failed to load raw items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      raw_item_id: '',
      quantity: 0,
      source_operation: 'manufacturing',
      source_details: {
        part_name: '',
        operation_date: new Date().toISOString().split('T')[0],
        operator: '',
        notes: ''
      }
    });
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('source_details.')) {
      const detailField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        source_details: {
          ...prev.source_details,
          [detailField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.raw_item_id || !formData.quantity || formData.quantity <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Clean up form data
      const cleanedData = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        source_details: {
          ...formData.source_details,
          operation_date: new Date(formData.source_details.operation_date)
        }
      };

      const response = await scrapItemsAPI.addFromOperation(cleanedData);
      
      // Show success message with updated stock info
      if (response.data.rawItemUpdated) {
        alert(`Scrap added successfully! Raw item stock updated to ${response.data.rawItemUpdated.newStock} units.`);
      } else {
        alert('Scrap added successfully!');
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('Error adding scrap:', err);
      setError(err.response?.data?.message || 'Failed to add scrap');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Add Scrap from Operation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Raw Item Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raw Item *
              </label>
              <select
                name="raw_item_id"
                value={formData.raw_item_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Raw Item</option>
                {rawItems.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.item_id}) - {item.quantity_in_stock} {item.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scrap Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter scrap quantity"
              />
            </div>

            {/* Source Operation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Operation *
              </label>
              <select
                name="source_operation"
                value={formData.source_operation}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="manufacturing">Manufacturing</option>
                <option value="cutting">Cutting</option>
                <option value="machining">Machining</option>
                <option value="assembly">Assembly</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Part Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Name
              </label>
              <input
                type="text"
                name="source_details.part_name"
                value={formData.source_details.part_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Part that generated scrap"
              />
            </div>

            {/* Operation Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operation Date
              </label>
              <input
                type="date"
                name="source_details.operation_date"
                value={formData.source_details.operation_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Operator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operator
              </label>
              <input
                type="text"
                name="source_details.operator"
                value={formData.source_details.operator}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Operator name"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="source_details.notes"
              value={formData.source_details.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Additional notes about the scrap"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Scrap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScrapModal;
