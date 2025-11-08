import React, { useState, useEffect } from 'react';

const RawItemReceiveModal = ({ isOpen, onClose, purchaseOrder, onReceive }) => {
  const [receiptData, setReceiptData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    items: [],
    notes: '',
    receiver_name: '',
    carrier_info: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setReceiptData({
        received_date: new Date().toISOString().split('T')[0],
        items: purchaseOrder.items?.map(item => ({
          item_id: item._id,
          raw_item_id: item.raw_item_id?._id || item.raw_item_id,
          raw_item_name: item.raw_item_id?.name || 'Unknown Raw Item',
          material_type: item.raw_item_id?.material_type || '',
          unit: item.raw_item_id?.unit || '',
          quantity_ordered: item.quantity_ordered,
          quantity_received_total: item.quantity_received || 0,
          quantity_receiving: 0,
          remaining: (item.quantity_ordered || 0) - (item.quantity_received || 0),
          unit_cost: item.unit_cost,
          notes: '',
          condition: 'good'
        })) || [],
        notes: '',
        receiver_name: '',
        carrier_info: ''
      });
    }
  }, [purchaseOrder, isOpen]);

  const updateReceivingQuantity = (index, value) => {
    const quantity = parseFloat(value) || 0;
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity_receiving: quantity } : item
      )
    }));
    
    // Clear error when user updates quantity
    if (errors[`item_${index}_quantity`]) {
      setErrors(prev => ({ ...prev, [`item_${index}_quantity`]: '' }));
    }
  };

  const updateItemNotes = (index, notes) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, notes } : item
      )
    }));
  };

  const updateItemCondition = (index, condition) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, condition } : item
      )
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Check if any items are being received
    const itemsToReceive = receiptData.items.filter(item => item.quantity_receiving > 0);
    if (itemsToReceive.length === 0) {
      newErrors.general = 'At least one item must have a receiving quantity greater than 0';
    }
    
    // Validate individual items
    receiptData.items.forEach((item, index) => {
      if (item.quantity_receiving > 0) {
        if (item.quantity_receiving > item.remaining) {
          newErrors[`item_${index}_quantity`] = `Cannot receive more than ${item.remaining} remaining items`;
        }
        if (!item.raw_item_id) {
          newErrors[`item_${index}_raw_item`] = 'Raw item reference is missing';
        }
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
      // Filter items with quantity > 0 and prepare data
      const itemsToReceive = receiptData.items
        .filter(item => item.quantity_receiving > 0)
        .map(item => ({
          item_id: item.item_id,
          raw_item_id: item.raw_item_id,
          quantity_receiving: item.quantity_receiving,
          notes: item.notes,
          condition: item.condition || 'good'
        }));
      
      const submitData = {
        purchase_order_id: purchaseOrder._id,
        received_date: receiptData.received_date,
        items: itemsToReceive,
        notes: receiptData.notes,
        receiver_name: receiptData.receiver_name || 'system',
        carrier_info: receiptData.carrier_info || ''
      };
      
      console.log('Submitting raw item receipt data:', submitData);
      await onReceive(submitData);
      
      // Reset form and close modal
      setReceiptData({
        received_date: new Date().toISOString().split('T')[0],
        items: [],
        notes: '',
        receiver_name: '',
        carrier_info: ''
      });
      setErrors({});
      onClose();
      
    } catch (error) {
      console.error('Error receiving items:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to receive items. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !purchaseOrder) return null;

  const totalReceiving = receiptData.items.reduce((sum, item) => sum + (item.quantity_receiving || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Receive Raw Items - Order #{purchaseOrder.order_number}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received Date *
              </label>
              <input
                type="date"
                value={receiptData.received_date}
                onChange={(e) => setReceiptData(prev => ({ ...prev, received_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receiver Name
              </label>
              <input
                type="text"
                value={receiptData.receiver_name}
                onChange={(e) => setReceiptData(prev => ({ ...prev, receiver_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter receiver name"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrier Info
              </label>
              <input
                type="text"
                value={receiptData.carrier_info}
                onChange={(e) => setReceiptData(prev => ({ ...prev, carrier_info: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Carrier/delivery info"
                disabled={loading}
              />
            </div>
          </div>

          {/* Items to Receive */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Items to Receive</h3>
            
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Supplier:</strong> {purchaseOrder.supplier_name} | 
                <strong> Order Date:</strong> {new Date(purchaseOrder.order_date).toLocaleDateString()} |
                <strong> Total Items to Receive:</strong> {totalReceiving}
              </p>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              {receiptData.items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Raw Item Info */}
                    <div className="md:col-span-3">
                      <h4 className="font-medium text-gray-800">{item.raw_item_name}</h4>
                      <p className="text-sm text-gray-600">{item.material_type}</p>
                      <p className="text-xs text-gray-500">Unit: {item.unit}</p>
                    </div>

                    {/* Quantities */}
                    <div className="md:col-span-2 text-sm">
                      <p><strong>Ordered:</strong> {item.quantity_ordered}</p>
                      <p><strong>Received:</strong> {item.quantity_received_total}</p>
                      <p><strong>Remaining:</strong> {item.remaining}</p>
                    </div>

                    {/* Receiving Quantity */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Receiving Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.remaining}
                        step="0.01"
                        value={item.quantity_receiving}
                        onChange={(e) => updateReceivingQuantity(index, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        disabled={loading}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    {/* Condition */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condition
                      </label>
                      <select
                        value={item.condition}
                        onChange={(e) => updateItemCondition(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="defective">Defective</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Notes
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateItemNotes(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Notes for this item"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receipt Notes
            </label>
            <textarea
              value={receiptData.notes}
              onChange={(e) => setReceiptData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="General notes about this receipt..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || totalReceiving === 0}
            >
              {loading ? 'Processing...' : `Receive ${totalReceiving} Items`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RawItemReceiveModal;
