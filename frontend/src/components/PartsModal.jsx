import React, { useState, useEffect } from 'react';

const PartsModal = ({ isOpen, onClose, part = null, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    quantity_in_stock: 0,
    min_stock_level: 10,
    cost_per_unit: 0,
    category: '',
    description: '',
    location: '',
    unit: 'pcs'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
         if (part) {
       setFormData({
         name: part.name || '',
         type: part.type || '',
         quantity_in_stock: part.quantity_in_stock || 0,
         min_stock_level: part.min_stock_level || 10,
         cost_per_unit: part.cost_per_unit || 0,
         category: part.category || '',
         description: part.description || '',
         location: part.location || '',
         unit: part.unit || 'pcs'
       });
     } else {
       setFormData({
         name: '',
         type: '',
         quantity_in_stock: 0,
         min_stock_level: 10,
         cost_per_unit: 0,
         category: '',
         description: '',
         location: '',
         unit: 'pcs'
       });
     }
    setErrors({});
  }, [part]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
                 if (!formData.name.trim()) {
               newErrors.name = 'Product name is required';
             }
             
             if (!formData.type.trim()) {
               newErrors.type = 'Category/Type is required';
             }
             
             if (formData.quantity_in_stock < 0) {
               newErrors.quantity_in_stock = 'Stock quantity cannot be negative';
             }
    
    if (formData.min_stock_level < 0) {
      newErrors.min_stock_level = 'Minimum stock level cannot be negative';
    }
    
    if (formData.cost_per_unit < 0) {
      newErrors.cost_per_unit = 'Price cannot be negative';
    }
    
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
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving part:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!part) return;
    
    if (!window.confirm('Are you sure you want to delete this part?')) {
      return;
    }
    
    setLoading(true);
    try {
      await onDelete(part._id);
      onClose();
    } catch (error) {
      console.error('Error deleting part:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {part ? 'Edit Part' : 'Add New Part'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

                         {/* Category/Type */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Category/Type *
               </label>
               <select
                 name="type"
                 value={formData.type}
                 onChange={handleInputChange}
                 className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                   errors.type ? 'border-red-500' : 'border-gray-300'
                 }`}
               >
                 <option value="">Select a type</option>
                 <option value="Mechanical">Mechanical</option>
                 <option value="Electrical">Electrical</option>
                 <option value="Electronic">Electronic</option>
                 <option value="Plastic">Plastic</option>
                 <option value="Metal">Metal</option>
                 <option value="Other">Other</option>
               </select>
               {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
             </div>

                         {/* Stock Quantity */}
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Stock Quantity *
               </label>
               <input
                 type="number"
                 name="quantity_in_stock"
                 value={formData.quantity_in_stock}
                 onChange={handleInputChange}
                 min="0"
                 className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                   errors.quantity_in_stock ? 'border-red-500' : 'border-gray-300'
                 }`}
                 placeholder="0"
               />
               {errors.quantity_in_stock && <p className="text-red-500 text-sm mt-1">{errors.quantity_in_stock}</p>}
             </div>

            {/* Min Stock Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Stock Level *
              </label>
              <input
                type="number"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.min_stock_level ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10"
              />
              {errors.min_stock_level && <p className="text-red-500 text-sm mt-1">{errors.min_stock_level}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.cost_per_unit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.cost_per_unit && <p className="text-red-500 text-sm mt-1">{errors.cost_per_unit}</p>}
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="m">Meters</option>
                <option value="l">Liters</option>
                <option value="box">Box</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter part description"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Warehouse A, Shelf B1"
            />
          </div>

                     {/* Status Display */}
           <div className="bg-gray-50 p-4 rounded-lg">
             <div className="flex items-center justify-between">
               <span className="text-sm font-medium text-gray-700">Stock Status:</span>
               <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                 formData.quantity_in_stock > formData.min_stock_level
                   ? 'bg-green-100 text-green-800'
                   : 'bg-red-100 text-red-800'
               }`}>
                 {formData.quantity_in_stock > formData.min_stock_level ? 'In Stock' : 'Low Stock'}
               </span>
             </div>
           </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex space-x-3">
              {part && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
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
                {loading ? 'Saving...' : (part ? 'Update' : 'Save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartsModal;
