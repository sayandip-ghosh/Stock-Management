import React, { useState, useEffect } from 'react';
import { partsAPI } from '../services/api';

const RawItemsModal = ({ isOpen, onClose, rawItem = null, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    item_id: '',
    name: '',
    material_type: '',
    quantity_in_stock: 0,
    min_stock_level: 10,
    cost_per_unit: 0,
    description: '',
    location: '',
    unit: 'kg',
    manufacturable_parts: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [viewMode, setViewMode] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partSearchTerms, setPartSearchTerms] = useState({});
  const [showPartDropdowns, setShowPartDropdowns] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchAvailableParts();
    }
  }, [isOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.part-dropdown-container')) {
        setShowPartDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (rawItem) {
      setFormData({
        item_id: rawItem.item_id || '',
        name: rawItem.name || '',
        material_type: rawItem.material_type || '',
        quantity_in_stock: rawItem.quantity_in_stock || 0,
        min_stock_level: rawItem.min_stock_level || 10,
        cost_per_unit: rawItem.cost_per_unit || 0,
        description: rawItem.description || '',
        location: rawItem.location || '',
        unit: rawItem.unit || 'kg',
        manufacturable_parts: rawItem.manufacturable_parts || []
      });
      setViewMode(true);
    } else {
      setFormData({
        item_id: '',
        name: '',
        material_type: '',
        quantity_in_stock: 0,
        min_stock_level: 10,
        cost_per_unit: 0,
        description: '',
        location: '',
        unit: 'kg',
        manufacturable_parts: []
      });
      setViewMode(false);
    }
    setErrors({});
    // Reset search state
    setPartSearchTerms({});
    setShowPartDropdowns({});
  }, [rawItem]);

  const fetchAvailableParts = async () => {
    try {
      setLoadingParts(true);
      const response = await partsAPI.getAll();
      console.log('Fetched parts:', response.data); // Debug log
      setAvailableParts(response.data.parts || response.data.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoadingParts(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addManufacturablePart = () => {
    const newIndex = formData.manufacturable_parts.length;
    setFormData(prev => ({
      ...prev,
      manufacturable_parts: [...prev.manufacturable_parts, {
        part_id: '',
        part_name: '',
        part_type: '',
        weight_per_unit: 0,
        notes: ''
      }]
    }));
    // Initialize search state for the new part
    setPartSearchTerms(prev => ({ ...prev, [newIndex]: '' }));
    setShowPartDropdowns(prev => ({ ...prev, [newIndex]: false }));
  };

  const removeManufacturablePart = (index) => {
    setFormData(prev => ({
      ...prev,
      manufacturable_parts: prev.manufacturable_parts.filter((_, i) => i !== index)
    }));
    
    // Clean up search state
    setPartSearchTerms(prev => {
      const newSearchTerms = { ...prev };
      delete newSearchTerms[index];
      // Reindex remaining search terms
      const reindexed = {};
      Object.keys(newSearchTerms).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = newSearchTerms[key];
        } else {
          reindexed[key] = newSearchTerms[key];
        }
      });
      return reindexed;
    });
    
    setShowPartDropdowns(prev => {
      const newDropdowns = { ...prev };
      delete newDropdowns[index];
      // Reindex remaining dropdowns
      const reindexed = {};
      Object.keys(newDropdowns).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          reindexed[keyIndex - 1] = newDropdowns[key];
        } else {
          reindexed[key] = newDropdowns[key];
        }
      });
      return reindexed;
    });
  };

  const updateManufacturablePart = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      manufacturable_parts: prev.manufacturable_parts.map((part, i) => {
        if (i === index) {
          if (field === 'part_id') {
            const selectedPart = availableParts.find(p => p._id === value);
            if (selectedPart) {
              // Clear search term and hide dropdown when part is selected
              setPartSearchTerms(prev => ({ ...prev, [index]: '' }));
              setShowPartDropdowns(prev => ({ ...prev, [index]: false }));
              return {
                ...part,
                part_id: value,
                part_name: selectedPart.name,
                part_type: selectedPart.type
              };
            }
          }
          return { ...part, [field]: value };
        }
        return part;
      })
    }));
  };

  const handlePartSearch = (index, searchTerm) => {
    setPartSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
    setShowPartDropdowns(prev => ({ ...prev, [index]: searchTerm.length > 0 }));
  };

  const togglePartDropdown = (index) => {
    setShowPartDropdowns(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const selectPart = (index, part) => {
    updateManufacturablePart(index, 'part_id', part._id);
  };

  const getFilteredParts = (index) => {
    const searchTerm = partSearchTerms[index] || '';
    if (!searchTerm) return availableParts;
    
    return availableParts.filter(part =>
      part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }
             
    if (!formData.material_type.trim()) {
      newErrors.material_type = 'Material type is required';
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

    // Validate manufacturable parts
    formData.manufacturable_parts.forEach((part, index) => {
      if (part.part_id && part.weight_per_unit <= 0) {
        newErrors[`part_weight_${index}`] = 'Weight per unit must be greater than 0';
      }
      if (part.weight_per_unit > 0 && !part.part_id) {
        newErrors[`part_selection_${index}`] = 'Please select a part';
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
      const submitData = { ...formData };
      if (rawItem) {
        delete submitData.item_id;
      }
      
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Error saving raw item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!rawItem) return;
    
    if (!window.confirm('Are you sure you want to delete this raw item?')) {
      return;
    }
    
    setLoading(true);
    try {
      await onDelete(rawItem._id);
      onClose();
    } catch (error) {
      console.error('Error deleting raw item:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {rawItem ? (viewMode ? 'Raw Item Details' : 'Edit Raw Item') : 'Add New Raw Item'}
              </h2>
              {rawItem && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  Item Code: {formData.item_id} | Created: {new Date(rawItem.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end space-x-2 flex-shrink-0">
              {rawItem && (
                <button
                  onClick={() => setViewMode(!viewMode)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  {viewMode ? 'Edit' : 'View'}
                </button>
              )}
              <button
                onClick={() => {
                  // Reset to view mode when closing if it's an existing item
                  if (rawItem) {
                    setViewMode(true);
                  }
                  onClose();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Item Code (Read-only for existing items) */}
            {rawItem && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Code
                </label>
                <input
                  type="text"
                  value={formData.item_id}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-generated unique identifier</p>
              </div>
            )}

            {/* Item Name */}
            <div className={rawItem ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                readOnly={viewMode}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  viewMode ? 'bg-gray-50 border-gray-200' : 
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Type *
              </label>
              {viewMode ? (
                <input
                  type="text"
                  value={formData.material_type}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                />
              ) : (
                <select
                  name="material_type"
                  value={formData.material_type}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.material_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select material type</option>
                  <option value="Copper">Copper</option>
                  <option value="GI">GI (Galvanized Iron)</option>
                  <option value="SS">SS (Stainless Steel)</option>
                  <option value="Brass">Brass</option>
                  <option value="PB">PB (Phosphorus Bronze)</option>
                  <option value="Aluminium">Aluminium</option>
                  <option value="Nylon">Nylon</option>
                  <option value="Plastic">Plastic</option>
                  <option value="Rubber">Rubber</option>
                </select>
              )}
              {errors.material_type && <p className="text-red-500 text-sm mt-1">{errors.material_type}</p>}
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stock *
              </label>
              <input
                type="number"
                name="quantity_in_stock"
                value={formData.quantity_in_stock}
                onChange={handleInputChange}
                readOnly={viewMode}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  viewMode ? 'bg-gray-50 border-gray-200' :
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
                readOnly={viewMode}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  viewMode ? 'bg-gray-50 border-gray-200' :
                  errors.min_stock_level ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="10"
              />
              {errors.min_stock_level && <p className="text-red-500 text-sm mt-1">{errors.min_stock_level}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price *
              </label>
              <input
                type="number"
                name="cost_per_unit"
                value={formData.cost_per_unit}
                onChange={handleInputChange}
                readOnly={viewMode}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  viewMode ? 'bg-gray-50 border-gray-200' :
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
              {viewMode ? (
                <input
                  type="text"
                  value={formData.unit}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                />
              ) : (
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="kg">Kilograms</option>
                  <option value="g">Grams</option>
                  <option value="m">Meters</option>
                  <option value="cm">Centimeters</option>
                  <option value="l">Liters</option>
                  <option value="ml">Milliliters</option>
                  <option value="pcs">Pieces</option>
                  <option value="box">Box</option>
                  <option value="roll">Roll</option>
                </select>
              )}
            </div>

          </div>

         

          {/* Manufacturable Parts Section */}
          <div className="md:col-span-2">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Manufacturable Parts</h3>
                <div className="flex items-center space-x-2">
                  {loadingParts && (
                    <span className="text-xs text-gray-500">Loading parts...</span>
                  )}
                  {!loadingParts && (
                    <span className="text-xs text-gray-500">
                      {availableParts.length} parts available
                    </span>
                  )}
                  {!viewMode && (
                    <button
                      type="button"
                      onClick={addManufacturablePart}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center space-x-1"
                    >
                      <span>+</span>
                      <span>Add Part</span>
                    </button>
                  )}
                </div>
              </div>
              
              {formData.manufacturable_parts.length > 0 ? (
                <div className="space-y-4">
                  {formData.manufacturable_parts.map((part, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                      {/* Remove Button - Top Right Corner */}
                      {!viewMode && (
                        <button
                          type="button"
                          onClick={() => removeManufacturablePart(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-lg font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50"
                          title="Remove part"
                        >
                          ×
                        </button>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-8">
                        {/* Part Selection */}
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Part *
                          </label>
                          {viewMode ? (
                            <input
                              type="text"
                              value={part.part_name}
                              readOnly
                              className="w-full px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            />
                          ) : (
                            <div className="relative part-dropdown-container">
                              {/* Search Input */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={part.part_name || partSearchTerms[index] || ''}
                                  onChange={(e) => {
                                    if (part.part_id) {
                                      // If a part is already selected, clear it when user starts typing
                                      updateManufacturablePart(index, 'part_id', '');
                                      updateManufacturablePart(index, 'part_name', '');
                                      updateManufacturablePart(index, 'part_type', '');
                                    }
                                    handlePartSearch(index, e.target.value);
                                  }}
                                  onFocus={() => setShowPartDropdowns(prev => ({ ...prev, [index]: true }))}
                                  placeholder={loadingParts ? "Loading parts..." : "Search for a part..."}
                                  disabled={loadingParts}
                                  className="w-full px-2 py-1 pr-16 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                                  {part.part_id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateManufacturablePart(index, 'part_id', '');
                                        updateManufacturablePart(index, 'part_name', '');
                                        updateManufacturablePart(index, 'part_type', '');
                                        setPartSearchTerms(prev => ({ ...prev, [index]: '' }));
                                      }}
                                      className="text-gray-400 hover:text-red-600 text-xs"
                                      title="Clear selection"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => togglePartDropdown(index)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <span className="text-xs">
                                      {showPartDropdowns[index] ? '▲' : '▼'}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Dropdown Panel */}
                              {showPartDropdowns[index] && !loadingParts && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {getFilteredParts(index).length > 0 ? (
                                    getFilteredParts(index).map(p => (
                                      <div
                                        key={p._id}
                                        onClick={() => selectPart(index, p)}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.part_id} - {p.type}</div>
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Stock: {p.quantity_in_stock}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="px-3 py-2 text-gray-500 text-sm">
                                      {partSearchTerms[index] ? 'No parts found' : 'Start typing to search parts'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Weight per Unit */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight per Unit (kg) *
                          </label>
                          <input
                            type="number"
                            value={part.weight_per_unit}
                            onChange={(e) => updateManufacturablePart(index, 'weight_per_unit', parseFloat(e.target.value) || 0)}
                            readOnly={viewMode}
                            min="0"
                            step="0.001"
                            className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                              viewMode ? 'bg-white border-gray-200' : 'border-gray-300'
                            }`}
                            placeholder="0.000"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={part.notes}
                          onChange={(e) => updateManufacturablePart(index, 'notes', e.target.value)}
                          readOnly={viewMode}
                          className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                            viewMode ? 'bg-white border-gray-200' : 'border-gray-300'
                          }`}
                          placeholder="Optional notes about manufacturing this part"
                        />
                      </div>

                      {/* Part Type Display */}
                      {part.part_type && (
                        <div className="mt-2 flex items-center space-x-2">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {part.part_type}
                          </span>
                          {part.part_id && (
                            <span className="text-xs text-gray-500">
                              Selected: {part.part_name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-2xl mb-2">⚙️</div>
                  <p className="text-sm">No manufacturable parts defined</p>
                  {!viewMode && (
                    <p className="text-xs mt-1">Add parts that can be made from this raw item</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-1">
                <div className="text-sm font-medium text-gray-700 mb-1">Stock Status:</div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  formData.quantity_in_stock === 0 ? 'bg-red-100 text-red-800' :
                  formData.quantity_in_stock <= formData.min_stock_level ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {formData.quantity_in_stock === 0 ? 'Out of Stock' :
                   formData.quantity_in_stock <= formData.min_stock_level ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <div className="col-span-1">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Value:</span>
                </div>
                <div className="text-sm text-gray-900 font-semibold">
                  ${(formData.quantity_in_stock * formData.cost_per_unit).toFixed(2)}
                </div>
              </div>
              {rawItem && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Last Updated:</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {new Date(rawItem.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t border-gray-200">
            <div className="flex justify-center sm:justify-start">
              {rawItem && !viewMode && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading ? 'Deleting...' : 'Delete Item'}
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  // Reset to view mode when canceling if it's an existing item
                  if (rawItem) {
                    setViewMode(true);
                  }
                  onClose();
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
              >
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
                >
                  {loading ? 'Saving...' : (rawItem ? 'Update Item' : 'Create Item')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RawItemsModal;
