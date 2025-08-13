import React, { useState, useEffect } from 'react';

const ReceiveItemsModal = ({ isOpen, onClose, purchaseOrder, onReceive }) => {
  const [receiptData, setReceiptData] = useState({
    received_date: new Date().toISOString().split('T')[0],
    items: [],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (purchaseOrder && isOpen) {
      setReceiptData({
        received_date: new Date().toISOString().split('T')[0],
        items: purchaseOrder.items?.map(item => ({
          item_id: item._id,
          part_id: item.part_id?._id || item.part_id,
          part_name: item.part_id?.name || 'Unknown Part',
          quantity_ordered: item.quantity_ordered,
          quantity_received_total: item.quantity_received || 0,
          quantity_receiving: 0,
          remaining: (item.quantity_ordered || 0) - (item.quantity_received || 0),
          unit_cost: item.unit_cost,
          notes: ''
        })) || [],
        notes: ''
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!receiptData.received_date) {
      newErrors.received_date = 'Received date is required';
    }
    
    let hasItems = false;
    receiptData.items.forEach((item, index) => {
      if (item.quantity_receiving > 0) {
        hasItems = true;
        if (item.quantity_receiving > item.remaining) {
          newErrors[`item_${index}_quantity`] = `Cannot receive more than remaining quantity (${item.remaining})`;
        }
      }
    });
    
    if (!hasItems) {
      newErrors.items = 'Please specify quantities for at least one item';
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
      const itemsToReceive = receiptData.items
        .filter(item => item.quantity_receiving > 0)
        .map(item => ({
          item_id: item.item_id,
          part_id: item.part_id,
          quantity_receiving: item.quantity_receiving,
          notes: item.notes || '',
          condition: 'good'
        }));
      
      console.log('Submitting receipt data:', {
        received_date: receiptData.received_date,
        items: itemsToReceive,
        notes: receiptData.notes,
        receiver_name: 'system',
        carrier_info: ''
      });

      await onReceive({
        purchase_order_id: purchaseOrder._id,
        received_date: receiptData.received_date,
        items: itemsToReceive,
        notes: receiptData.notes,
        receiver_name: 'system',
        carrier_info: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Error receiving items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !purchaseOrder) return null;

  const totalReceiving = receiptData.items.reduce((sum, item) => sum + (item.quantity_receiving || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Receive Items</h2>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600">
                  Purchase Order: {purchaseOrder.order_number} - {purchaseOrder.supplier_name}
                </p>
                {purchaseOrder.status === 'partial' && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                    Partially Received ({purchaseOrder.completion_percentage || 0}%)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Receipt Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Received Date *
              </label>
              <input
                type="date"
                value={receiptData.received_date}
                onChange={(e) => setReceiptData(prev => ({ ...prev, received_date: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.received_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.received_date && <p className="text-red-500 text-sm mt-1">{errors.received_date}</p>}
            </div>

            <div className="flex items-end">
              <div className="bg-blue-50 p-3 rounded-lg w-full">
                <p className="text-sm font-medium text-blue-900">Total Items Receiving</p>
                <p className="text-2xl font-bold text-blue-600">{totalReceiving}</p>
              </div>
            </div>
          </div>

          {/* Items to Receive */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>
            
            {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}

            <div className="space-y-4">
              {receiptData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Part
                      </label>
                      <p className="text-sm text-gray-900 font-medium">{item.part_name}</p>
                      {item.quantity_received_total > 0 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Previously received: {item.quantity_received_total}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ordered
                      </label>
                      <p className="text-sm text-gray-600">{item.quantity_ordered}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Previously Received
                      </label>
                      <p className="text-sm text-gray-600">{item.quantity_received_total}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remaining
                      </label>
                      <p className="text-sm font-medium text-orange-600">{item.remaining}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Receiving Now *
                      </label>
                      <input
                        type="number"
                        value={item.quantity_receiving}
                        onChange={(e) => updateReceivingQuantity(index, e.target.value)}
                        min="0"
                        max={item.remaining}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          errors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_quantity`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {((item.quantity_received_total + item.quantity_receiving) / item.quantity_ordered * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${((item.quantity_received_total + item.quantity_receiving) / item.quantity_ordered) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Item Notes */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for this item
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Condition, quality notes, etc."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Receipt Notes
            </label>
            <textarea
              value={receiptData.notes}
              onChange={(e) => setReceiptData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Delivery condition, carrier information, etc."
            />
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
              disabled={loading || totalReceiving === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : `Receive ${totalReceiving} Items`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveItemsModal;
