import React, { useState, useEffect } from 'react';
import { scrapItemsAPI, rawItemsAPI } from '../services/api';

const ScrapItemsModal = ({ isOpen, onClose, scrapItem, onSave, onDelete, rawItemId = null }) => {
  const [formData, setFormData] = useState({
    raw_item_id: rawItemId || '',
    name: '',
    material_type: '',
    dimensions: {
      width: '',
      height: '',
      length: '',
      thickness: '',
      diameter: '',
      gauge: ''
    },
    unit: 'KG',
    quantity_available: 0,
    cost_per_unit: 0,
    location: '',
    description: '',
    specifications: {},
    source_operation: 'manufacturing',
    source_details: {
      part_name: '',
      operation_date: new Date().toISOString().split('T')[0],
      operator: '',
      notes: ''
    },
    is_usable: true
  });

  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useScrapQuantity, setUseScrapQuantity] = useState('');
  const [useScrapReason, setUseScrapReason] = useState('');
  const [showUseScrapForm, setShowUseScrapForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRawItems();
      if (scrapItem) {
        setFormData({
          ...scrapItem,
          dimensions: {
            width: scrapItem.dimensions?.width || '',
            height: scrapItem.dimensions?.height || '',
            length: scrapItem.dimensions?.length || '',
            thickness: scrapItem.dimensions?.thickness || '',
            diameter: scrapItem.dimensions?.diameter || '',
            gauge: scrapItem.dimensions?.gauge || ''
          },
          source_details: {
            part_name: scrapItem.source_details?.part_name || '',
            operation_date: scrapItem.source_details?.operation_date ? 
              new Date(scrapItem.source_details.operation_date).toISOString().split('T')[0] : 
              new Date().toISOString().split('T')[0],
            operator: scrapItem.source_details?.operator || '',
            notes: scrapItem.source_details?.notes || ''
          }
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, scrapItem, rawItemId]);

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
      raw_item_id: rawItemId || '',
      name: '',
      material_type: '',
      dimensions: {
        width: '',
        height: '',
        length: '',
        thickness: '',
        diameter: '',
        gauge: ''
      },
      unit: 'KG',
      quantity_available: 0,
      cost_per_unit: 0,
      location: '',
      description: '',
      specifications: {},
      source_operation: 'manufacturing',
      source_details: {
        part_name: '',
        operation_date: new Date().toISOString().split('T')[0],
        operator: '',
        notes: ''
      },
      is_usable: true
    });
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('dimensions.')) {
      const dimensionField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimensionField]: value
        }
      }));
    } else if (name.startsWith('source_details.')) {
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
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleRawItemChange = (e) => {
    const selectedRawItemId = e.target.value;
    const selectedRawItem = rawItems.find(item => item._id === selectedRawItemId);
    
    if (selectedRawItem) {
      setFormData(prev => ({
        ...prev,
        raw_item_id: selectedRawItemId,
        name: `${selectedRawItem.name} (Scrap)`,
        material_type: selectedRawItem.material_type,
        dimensions: selectedRawItem.dimensions || {},
        unit: selectedRawItem.unit,
        cost_per_unit: selectedRawItem.cost_per_unit * 0.5, // Scrap is typically worth less
        location: selectedRawItem.location,
        description: `Scrap from ${selectedRawItem.name}`,
        specifications: selectedRawItem.specifications || {}
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.raw_item_id || !formData.name || !formData.material_type) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Clean up form data
      const cleanedData = {
        ...formData,
        dimensions: Object.fromEntries(
          Object.entries(formData.dimensions).map(([key, value]) => [key, value ? parseFloat(value) : undefined])
        ),
        quantity_available: parseFloat(formData.quantity_available) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        source_details: {
          ...formData.source_details,
          operation_date: new Date(formData.source_details.operation_date)
        }
      };

      await onSave(cleanedData);
      onClose();
    } catch (err) {
      console.error('Error saving scrap item:', err);
      setError(err.response?.data?.message || 'Failed to save scrap item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!scrapItem) return;
    
    if (window.confirm('Are you sure you want to delete this scrap item?')) {
      try {
        await onDelete(scrapItem._id);
        onClose();
      } catch (err) {
        console.error('Error deleting scrap item:', err);
        setError(err.response?.data?.message || 'Failed to delete scrap item');
      }
    }
  };

  const handleUseScrap = async (e) => {
    e.preventDefault();
    
    if (!scrapItem || !useScrapQuantity || parseFloat(useScrapQuantity) <= 0) {
      setError('Please enter a valid quantity to use');
      return;
    }

    if (parseFloat(useScrapQuantity) > scrapItem.quantity_available) {
      setError('Insufficient scrap quantity available');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await scrapItemsAPI.useScrap(scrapItem._id, {
        quantity: parseFloat(useScrapQuantity),
        reason: useScrapReason
      });

      // Show success message with updated stock info
      if (response.data.rawItemUpdated) {
        alert(`Scrap used successfully! Raw item stock updated to ${response.data.rawItemUpdated.newStock} units.`);
      } else {
        alert('Scrap used successfully!');
      }

      // Reset form
      setUseScrapQuantity('');
      setUseScrapReason('');
      setShowUseScrapForm(false);

      // Refresh data
      if (onSave) {
        await onSave({}); // This will trigger a refresh
      }
      
    } catch (err) {
      console.error('Error using scrap:', err);
      setError(err.response?.data?.message || 'Failed to use scrap item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {scrapItem ? 'Edit Scrap Item' : 'Add Scrap Item'}
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
                Source Raw Item *
              </label>
              <select
                name="raw_item_id"
                value={formData.raw_item_id}
                onChange={handleRawItemChange}
                required
                disabled={!!rawItemId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Raw Item</option>
                {rawItems.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.item_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scrap Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter scrap item name"
              />
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Type *
              </label>
              <input
                type="text"
                name="material_type"
                value={formData.material_type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter material type"
              />
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
                <option value="KG">KG</option>
                <option value="G">G</option>
                <option value="LB">LB</option>
                <option value="OZ">OZ</option>
                <option value="PCS">PCS</option>
                <option value="M">M</option>
                <option value="CM">CM</option>
                <option value="MM">MM</option>
                <option value="IN">IN</option>
                <option value="FT">FT</option>
              </select>
            </div>

            {/* Quantity Available */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Available
              </label>
              <input
                type="number"
                name="quantity_available"
                value={formData.quantity_available}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter quantity"
              />
            </div>

            {/* Cost Per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Per Unit
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter cost per unit"
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
                placeholder="Enter location"
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
          </div>

          {/* Dimensions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                <input
                  type="number"
                  name="dimensions.width"
                  value={formData.dimensions.width}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Width"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                <input
                  type="number"
                  name="dimensions.height"
                  value={formData.dimensions.height}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Height"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                <input
                  type="number"
                  name="dimensions.length"
                  value={formData.dimensions.length}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Length"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thickness</label>
                <input
                  type="number"
                  name="dimensions.thickness"
                  value={formData.dimensions.thickness}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Thickness"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diameter</label>
                <input
                  type="number"
                  name="dimensions.diameter"
                  value={formData.dimensions.diameter}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Diameter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gauge</label>
                <input
                  type="text"
                  name="dimensions.gauge"
                  value={formData.dimensions.gauge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Gauge"
                />
              </div>
            </div>
          </div>

          {/* Source Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Source Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Part Name</label>
                <input
                  type="text"
                  name="source_details.part_name"
                  value={formData.source_details.part_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Part name that generated scrap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operation Date</label>
                <input
                  type="date"
                  name="source_details.operation_date"
                  value={formData.source_details.operation_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operator</label>
                <input
                  type="text"
                  name="source_details.operator"
                  value={formData.source_details.operator}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Operator name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <input
                  type="text"
                  name="source_details.notes"
                  value={formData.source_details.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Additional notes"
                />
              </div>
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
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter description"
            />
          </div>

          {/* Use Scrap Section - Only show when editing existing scrap item */}
          {scrapItem && scrapItem.quantity_available > 0 && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Use Scrap</h3>
                <button
                  type="button"
                  onClick={() => setShowUseScrapForm(!showUseScrapForm)}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  {showUseScrapForm ? 'Cancel' : 'Use Scrap'}
                </button>
              </div>
              
              {showUseScrapForm && (
                <form onSubmit={handleUseScrap} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity to Use *
                      </label>
                      <input
                        type="number"
                        value={useScrapQuantity}
                        onChange={(e) => setUseScrapQuantity(e.target.value)}
                        min="0.01"
                        max={scrapItem.quantity_available}
                        step="0.01"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`Max: ${scrapItem.quantity_available} ${scrapItem.unit}`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {scrapItem.quantity_available} {scrapItem.unit}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                      </label>
                      <input
                        type="text"
                        value={useScrapReason}
                        onChange={(e) => setUseScrapReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Reason for using scrap"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowUseScrapForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Using...' : 'Use Scrap'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Is Usable */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_usable"
              checked={formData.is_usable}
              onChange={handleInputChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              This scrap item is usable
            </label>
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
            
            {scrapItem && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (scrapItem ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScrapItemsModal;
