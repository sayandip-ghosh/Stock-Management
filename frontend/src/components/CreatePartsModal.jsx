import React, { useState, useEffect } from 'react';
import { partsAPI, rawItemsAPI } from '../services/api';

const CreatePartsModal = ({ isOpen, onClose, onSave }) => {
  const [parts, setParts] = useState([]);
  const [rawItems, setRawItems] = useState([]);
  const [selectedRawItems, setSelectedRawItems] = useState([]);
  const [rawItemQuantities, setRawItemQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showRawItemDropdown, setShowRawItemDropdown] = useState(false);
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [formData, setFormData] = useState({
    part_id: '',
    quantity_to_make: 1,
    vendor_type: 'internal', // 'internal' or 'external'
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchPartsAndRawItems();
    } else {
      // Reset form when modal closes
      setSelectedRawItems([]);
      setRawItemQuantities({});
      setSearchTerm('');
      setShowRawItemDropdown(false);
      setPartSearchTerm('');
      setShowPartDropdown(false);
      setFormData({
        part_id: '',
        quantity_to_make: 1,
        vendor_type: 'internal',
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRawItemDropdown && !event.target.closest('.raw-item-dropdown')) {
        setShowRawItemDropdown(false);
      }
      if (showPartDropdown && !event.target.closest('.part-dropdown')) {
        setShowPartDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRawItemDropdown, showPartDropdown]);

  const fetchPartsAndRawItems = async () => {
    try {
      const [partsResponse, rawItemsResponse] = await Promise.all([
        partsAPI.getAll(),
        rawItemsAPI.getAll()
      ]);
      setParts(partsResponse.data.parts || []);
      setRawItems(rawItemsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // If part selection changes, auto-populate raw items from manufacturables
    if (name === 'part_id' && value) {
      autoSelectRawItemsForPart(value);
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const autoSelectRawItemsForPart = (partId) => {
    const selectedPart = parts.find(part => part._id === partId);
    if (!selectedPart) return;

    // Find raw items that can manufacture this part
    const compatibleRawItems = rawItems.filter(rawItem => 
      rawItem.manufacturable_parts && 
      rawItem.manufacturable_parts.some(mp => 
        mp.part_id === partId || mp.part_name === selectedPart.name
      )
    );

    if (compatibleRawItems.length > 0) {
      // Auto-select the first compatible raw item
      const autoSelectedItem = compatibleRawItems[0];
      const manufacturablePart = autoSelectedItem.manufacturable_parts.find(mp => 
        mp.part_id === partId || mp.part_name === selectedPart.name
      );

      if (manufacturablePart) {
        setSelectedRawItems([autoSelectedItem]);
        setRawItemQuantities({
          [autoSelectedItem._id]: manufacturablePart.weight_per_unit
        });
      }
    } else {
      // If no compatible raw items found, clear selection
      setSelectedRawItems([]);
      setRawItemQuantities({});
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (selectedRawItems.length === 0) {
      newErrors.rawItems = 'Please select at least one raw item';
    }
    
    // Validate quantities for selected raw items
    const partsToMake = formData.quantity_to_make || 1;
    selectedRawItems.forEach(item => {
      const quantityPerPart = rawItemQuantities[item._id] || 0;
      const totalQuantityNeeded = quantityPerPart * partsToMake;
      
      if (quantityPerPart <= 0) {
        newErrors[`quantity_${item._id}`] = `Quantity per part for ${item.name} must be greater than 0`;
      } else if (totalQuantityNeeded > (item.quantity_in_stock || 0)) {
        newErrors[`quantity_${item._id}`] = `Total quantity needed (${totalQuantityNeeded.toFixed(2)}) for ${item.name} exceeds available stock (${item.quantity_in_stock})`;
      }
    });
    
    if (!formData.part_id) {
      newErrors.part_id = 'Part selection is required';
    }
    
    if (formData.quantity_to_make <= 0) {
      newErrors.quantity_to_make = 'Quantity must be greater than 0';
    }
    
    if (!formData.vendor_type) {
      newErrors.vendor_type = 'Vendor type is required';
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
      const createData = {
        ...formData,
        raw_items_used: selectedRawItems.map(item => ({
          _id: item._id,
          name: item.name,
          quantity_used: rawItemQuantities[item._id] || 0
        })),
        total_quantity: calculateTotalWeight()
      };
      
      console.log('Submitting parts creation data:', createData);
      await onSave(createData);
      onClose();
    } catch (error) {
      console.error('Error creating parts:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalWeight = () => {
    const partsToMake = formData.quantity_to_make || 1;
    return selectedRawItems.reduce((total, item) => {
      const quantityPerPart = rawItemQuantities[item._id] || 0;
      const totalQuantity = quantityPerPart * partsToMake;
      return total + totalQuantity;
    }, 0);
  };

  const hasInsufficientStock = () => {
    const partsToMake = formData.quantity_to_make || 1;
    return selectedRawItems.some(item => {
      const quantityPerPart = rawItemQuantities[item._id] || 0;
      const totalQuantityNeeded = quantityPerPart * partsToMake;
      return totalQuantityNeeded > (item.quantity_in_stock || 0);
    });
  };

  const getStockValidationErrors = () => {
    const partsToMake = formData.quantity_to_make || 1;
    const stockErrors = [];
    
    selectedRawItems.forEach(item => {
      const quantityPerPart = rawItemQuantities[item._id] || 0;
      const totalQuantityNeeded = quantityPerPart * partsToMake;
      
      if (totalQuantityNeeded > (item.quantity_in_stock || 0)) {
        stockErrors.push({
          item: item.name,
          needed: totalQuantityNeeded,
          available: item.quantity_in_stock || 0,
          unit: item.unit
        });
      }
    });
    
    return stockErrors;
  };

  const handleSelectRawItem = (rawItem, isSelected) => {
    if (isSelected) {
      setSelectedRawItems(prev => [...prev, rawItem]);
      // Set default quantity to 1 when selecting
      setRawItemQuantities(prev => ({
        ...prev,
        [rawItem._id]: 1
      }));
    } else {
      setSelectedRawItems(prev => prev.filter(item => item._id !== rawItem._id));
      // Remove quantity when deselecting
      setRawItemQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[rawItem._id];
        return newQuantities;
      });
    }
  };

  const handleSelectAllRawItems = () => {
    setSelectedRawItems([...rawItems]);
    // Set default quantity of 1 for all items
    const quantities = {};
    rawItems.forEach(item => {
      quantities[item._id] = 1;
    });
    setRawItemQuantities(quantities);
  };

  const handleClearSelection = () => {
    setSelectedRawItems([]);
    setRawItemQuantities({});
  };

  const handleQuantityChange = (rawItemId, quantity) => {
    // Allow 0 and positive numbers, but prevent negative values
    const validQuantity = Math.max(0, quantity);
    setRawItemQuantities(prev => ({
      ...prev,
      [rawItemId]: validQuantity
    }));
  };

  const handleAddRawItem = (rawItem) => {
    handleSelectRawItem(rawItem, true);
    setSearchTerm('');
    setShowRawItemDropdown(false);
  };

  const handleRemoveRawItem = (rawItemId) => {
    setSelectedRawItems(prev => prev.filter(item => item._id !== rawItemId));
    setRawItemQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[rawItemId];
      return newQuantities;
    });
  };

  const filteredRawItems = rawItems.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.part_id?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.type?.toLowerCase().includes(partSearchTerm.toLowerCase())
  );

  const selectedPart = parts.find(part => part._id === formData.part_id);

  const handleSelectPart = (part) => {
    setFormData(prev => ({ ...prev, part_id: part._id }));
    setPartSearchTerm(`${part.name} (${part.part_id})`);
    setShowPartDropdown(false);
    autoSelectRawItemsForPart(part._id);
    if (errors.part_id) {
      setErrors(prev => ({ ...prev, part_id: '' }));
    }
  };

  const handlePartSearchChange = (e) => {
    const value = e.target.value;
    setPartSearchTerm(value);
    setShowPartDropdown(true);
    if (!value) {
      setFormData(prev => ({ ...prev, part_id: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Parts from Raw Items</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Raw Items Selection */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Raw Items</h3>
              
            </div>

            
            {/* Search and Add Raw Item */}
            

            {/* Selected Raw Items */}
            {selectedRawItems.length > 0 ? (
              <div className="space-y-3">
                {selectedRawItems.map((item) => {
                  const quantity = rawItemQuantities[item._id] || 0;
                  const totalNeeded = quantity * (formData.quantity_to_make || 1);
                  const available = item.quantity_in_stock || 0;
                  const isInsufficient = totalNeeded > available;
                  
                  return (
                    <div key={item._id} className={`bg-white p-3 rounded-lg border ${
                      isInsufficient ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-orange-600 text-xs">🏭</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.item_id} - {item.material_type}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRawItem(item._id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700">
                          Quantity per part:
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quantity}
                          onChange={(e) => handleQuantityChange(item._id, parseFloat(e.target.value) || 0)}
                          className={`w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            errors[`quantity_${item._id}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="1"
                        />
                        <span className="text-sm text-gray-500">{item.unit}</span>
                        {formData.quantity_to_make > 1 && (
                          <span className="text-xs text-gray-500">
                            (Total: {(quantity * formData.quantity_to_make).toFixed(2)} {item.unit})
                          </span>
                        )}
                      </div>
                      
                      {/* Stock Status */}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                          Available: {item.quantity_in_stock || 0} {item.unit}
                        </div>
                        {(() => {
                          const totalNeeded = quantity * (formData.quantity_to_make || 1);
                          const available = item.quantity_in_stock || 0;
                          const isInsufficient = totalNeeded > available;
                          
                          return (
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              isInsufficient 
                                ? 'bg-red-100 text-red-800' 
                                : totalNeeded > 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isInsufficient 
                                ? `Short: ${(totalNeeded - available).toFixed(2)} ${item.unit}`
                                : totalNeeded > 0 
                                  ? `Sufficient`
                                  : 'Set quantity'
                              }
                            </div>
                          );
                        })()}
                      </div>
                      
                      {errors[`quantity_${item._id}`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`quantity_${item._id}`]}</p>
                      )}
                    </div>
                  );
                })}
                
                {/* Summary */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Material Requirements for {formData.quantity_to_make || 1} part(s):
                  </div>
                  <div className="space-y-1">
                    {selectedRawItems.map(item => {
                      const quantityPerPart = rawItemQuantities[item._id] || 0;
                      const totalQuantity = quantityPerPart * (formData.quantity_to_make || 1);
                      const available = item.quantity_in_stock || 0;
                      const isInsufficient = totalQuantity > available;
                      
                      return (
                        <div key={item._id} className={`flex justify-between text-xs ${
                          isInsufficient ? 'text-red-800' : 'text-blue-800'
                        }`}>
                          <span className="flex items-center">
                            {isInsufficient && <span className="text-red-600 mr-1">⚠️</span>}
                            {item.name}:
                          </span>
                          <span>
                            {quantityPerPart} {item.unit} per part × {formData.quantity_to_make || 1} = 
                            <strong className="ml-1">{totalQuantity.toFixed(2)} {item.unit}</strong>
                            {isInsufficient && (
                              <span className="text-red-600 ml-1 font-normal">
                                (Available: {available.toFixed(2)})
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="flex justify-between text-sm font-medium text-blue-900">
                      <span>Total Required:</span>
                      <span>{calculateTotalWeight().toFixed(2)} KG</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏭</div>
                <p>No raw items selected</p>
                <p className="text-sm">Search and add raw items above</p>
              </div>
            )}

            {/* Stock Validation Warning */}
            {selectedRawItems.length > 0 && hasInsufficientStock() && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-red-900 mb-2">
                      Insufficient Stock - Cannot Create Parts
                    </h4>
                    <div className="space-y-1">
                      {getStockValidationErrors().map((error, index) => (
                        <div key={index} className="text-sm text-red-800">
                          <strong>{error.item}:</strong> Need {error.needed.toFixed(2)} {error.unit}, 
                          but only {error.available.toFixed(2)} {error.unit} available
                          <span className="text-red-600 ml-2">
                            (Short by {(error.needed - error.available).toFixed(2)} {error.unit})
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-red-700 mt-2">
                      Please reduce the quantity to make or restock the raw materials before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {errors.rawItems && <p className="text-red-500 text-sm mt-2">{errors.rawItems}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Part Selection - Searchable */}
            <div className="part-dropdown relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Part to Create *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={partSearchTerm}
                  onChange={handlePartSearchChange}
                  onFocus={() => setShowPartDropdown(true)}
                  placeholder="Search for a part..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    errors.part_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>

                {/* Dropdown */}
                {showPartDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredParts.length > 0 ? (
                      <div className="py-1">
                        {filteredParts.map(part => (
                          <div
                            key={part._id}
                            onClick={() => handleSelectPart(part)}
                            className={`px-3 py-2 cursor-pointer hover:bg-purple-50 ${
                              formData.part_id === part._id ? 'bg-purple-100' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{part.name}</div>
                                <div className="text-xs text-gray-500">{part.part_id} - {part.type}</div>
                              </div>
                              <div className="text-xs text-gray-500">
                                Stock: {part.quantity_in_stock || 0} {part.unit}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No parts found matching "{partSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.part_id && <p className="text-red-500 text-sm mt-1">{errors.part_id}</p>}
            </div>

            {/* Quantity to Make */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Make *
              </label>
              <input
                type="number"
                name="quantity_to_make"
                value={formData.quantity_to_make}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.quantity_to_make ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1"
              />
              {errors.quantity_to_make && <p className="text-red-500 text-sm mt-1">{errors.quantity_to_make}</p>}
            </div>

            {/* Vendor Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendor Type *
              </label>
              <select
                name="vendor_type"
                value={formData.vendor_type}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.vendor_type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="internal">Internal Vendor (Made In-House)</option>
                <option value="external">External Vendor (Outsourced)</option>
              </select>
              {errors.vendor_type && <p className="text-red-500 text-sm mt-1">{errors.vendor_type}</p>}
            </div>

            {/* Part Details Display */}
            {selectedPart && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Part Details</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>Name:</strong> {selectedPart.name}</p>
                  <p><strong>Type:</strong> {selectedPart.type}</p>
                  {/* <p><strong>Description:</strong> {selectedPart.description || 'N/A'}</p> */}
                  <p><strong>Current Stock:</strong> {selectedPart.quantity_in_stock} {selectedPart.unit}</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Additional notes about the part creation process..."
            />
          </div>

          {/* Vendor Type Display */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-xl">
                  {formData.vendor_type === 'internal' ? '🏭' : '🏢'}
                </span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-900">
                  {formData.vendor_type === 'internal' ? 'Internal Manufacturing' : 'External Vendor'}
                </h4>
                <p className="text-sm text-yellow-800">
                  {formData.vendor_type === 'internal' 
                    ? 'This part will be manufactured in-house using the selected raw materials.'
                    : 'This part will be outsourced to an external vendor.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Quality Control Notice */}
          {/* <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-600 text-xl">🔍</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900 mb-1">Quality Control Review Required</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Parts will be created for quality control review</p>
                  <p>• Raw materials will be consumed immediately</p>
                  <p>• Parts must be inspected and approved before being added to main stock</p>
                  <p>• Rejected parts and materials will be moved to scrap</p>
                </div>
              </div>
            </div>
          </div> */}

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
              disabled={loading || selectedRawItems.length === 0 || hasInsufficientStock()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : hasInsufficientStock() ? 'Insufficient Stock' : 'Create Parts for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartsModal;
