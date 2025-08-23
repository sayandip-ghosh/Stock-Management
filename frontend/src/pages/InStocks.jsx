import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PartsModal from '../components/PartsModal';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import ReceiveItemsModal from '../components/ReceiveItemsModal';
import WithdrawModal from '../components/WithdrawModal';
import { partsAPI, stockManagementAPI, purchaseOrdersAPI } from '../services/api';

const InStocks = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedPartForEdit, setSelectedPartForEdit] = useState(null);
  const [isEditPartsModalOpen, setIsEditPartsModalOpen] = useState(false);
  const [isViewAllPendingOrdersModalOpen, setIsViewAllPendingOrdersModalOpen] = useState(false);

  // Filter options for part types
  const partTypeOptions = [
    'Copper', 'GI', 'SS', 'Brass', 'PB', 'Aluminium', 'Nylon'
  ];

  useEffect(() => {
    fetchData();
    fetchPendingOrders();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use high limit to get all parts for proper counting and dropdowns
      const response = await partsAPI.getAll({ limit: 1000 });
      
      console.log('Fetched parts response:', response.data);
      console.log('Total parts count:', response.data.parts?.length);
      
      setParts(response.data.parts || []);
    } catch (err) {
      console.error('Error fetching parts:', err);
      setError('Failed to load parts from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await purchaseOrdersAPI.getPending();
      setPendingOrders(response.data.purchase_orders || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const handleWithdrawItem = async (formData) => {
    try {
      console.log('Sending withdraw request:', {
        part_id: formData.part_id,
        operation_type: 'removal',
        quantity: formData.quantity,
        notes: formData.notes,
        date: formData.date
      });

      await stockManagementAPI.performStockOperation({
        part_id: formData.part_id,
        operation_type: 'removal',
        quantity: formData.quantity,
        notes: formData.notes,
        date: formData.date,
        created_by: 'system'
      });
      
      fetchData(); // Refresh parts data
      setIsWithdrawModalOpen(false);
      setSelectedPart(null);
    } catch (error) {
      console.error('Error withdrawing item:', error);
      throw error;
    }
  };

  const handleViewHistory = async (part) => {
    try {
      setSelectedPart(part);
      const response = await stockManagementAPI.getPartStockHistory(part._id);
      setStockHistory(response.data.transactions || []);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setStockHistory([]);
    setSelectedPart(null);
  };

  const handleAddNewPart = async (formData) => {
    try {
      await partsAPI.create(formData);
      fetchData(); // Refresh the parts list
      setIsPartsModalOpen(false);
    } catch (error) {
      console.error('Error adding new part:', error);
      throw error;
    }
  };

  const handleEditPart = async (formData) => {
    try {
      await partsAPI.update(selectedPartForEdit._id, formData);
      fetchData(); // Refresh the parts list
      setIsEditPartsModalOpen(false);
      setSelectedPartForEdit(null);
    } catch (error) {
      console.error('Error updating part:', error);
      throw error;
    }
  };

  const handleDeletePart = async (partId) => {
    if (window.confirm('Are you sure you want to delete this part?')) {
      try {
        await partsAPI.delete(partId);
        fetchData(); // Refresh the parts list
        setIsEditPartsModalOpen(false);
        setSelectedPartForEdit(null);
      } catch (error) {
        console.error('Error deleting part:', error);
        throw error;
      }
    }
  };

  const handleCreatePurchaseOrder = async (formData) => {
    try {
      await purchaseOrdersAPI.create(formData);
      fetchPendingOrders();
      setIsPurchaseOrderModalOpen(false);
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  };

  const handleReceiveItems = async (receiptData) => {
    try {
      console.log('Calling receiveItems API with:', receiptData);
      
      await purchaseOrdersAPI.receiveItems(receiptData.purchase_order_id, {
        received_date: receiptData.received_date,
        items: receiptData.items,
        notes: receiptData.notes,
        receiver_name: receiptData.receiver_name || 'system',
        carrier_info: receiptData.carrier_info || ''
      });
      
      fetchData(); // Refresh parts data
      fetchPendingOrders(); // Refresh pending orders
      setIsReceiveItemsModalOpen(false);
      setSelectedPurchaseOrder(null);
    } catch (error) {
      console.error('Error receiving items:', error);
      throw error;
    }
  };

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stock statistics dynamically
  const inStockCount = parts.filter(part => {
    const quantity = part.quantity_in_stock || 0;
    const minLevel = part.min_stock_level || 10;
    return quantity > minLevel;
  }).length;
  
  const lowStockCount = parts.filter(part => {
    const quantity = part.quantity_in_stock || 0;
    const minLevel = part.min_stock_level || 10;
    return quantity > 0 && quantity <= minLevel;
  }).length;
  
  const outOfStockCount = parts.filter(part => {
    const quantity = part.quantity_in_stock || 0;
    return quantity === 0;
  }).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-xl font-semibold mb-2">Error Loading Data</div>
            <div className="text-gray-600">{error}</div>
            <button 
              onClick={fetchData}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, ID, or category"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Parts</p>
                <p className="text-2xl font-bold text-gray-900">{parts.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">{inStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">❌</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">{outOfStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Purchase Orders */}
        {pendingOrders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-yellow-800">Pending & Partial Purchase Orders</h3>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                {pendingOrders.length} orders
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingOrders.slice(0, 3).map(order => {
                const completionPercentage = order.completion_percentage || 0;
                const statusColor = order.status === 'partial' ? 'text-orange-600' : 'text-gray-600';
                const statusText = order.status === 'partial' ? 'Partial' : 'Pending';
                
                return (
                  <div key={order._id} className="bg-white border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.supplier_name}</p>
                        <p className="text-xs text-gray-500">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPurchaseOrder(order);
                          setIsReceiveItemsModalOpen(true);
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Receive
                      </button>
                    </div>
                    
                    {/* Progress bar and status */}
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${statusColor}`}>
                          {statusText} - {completionPercentage}%
                        </span>
                        {order.status === 'partial' && (
                          <span className="text-xs text-gray-500">
                            Items remaining
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            order.status === 'partial' ? 'bg-orange-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pendingOrders.length > 3 && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-yellow-700">
                  And {pendingOrders.length - 3} more orders awaiting delivery...
                </p>
                <button
                  onClick={() => setIsViewAllPendingOrdersModalOpen(true)}
                  className="bg-yellow-600 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-700 flex items-center space-x-1"
                >
                  <span>👁️</span>
                  <span>View All Orders</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stock Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsPurchaseOrderModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Purchase Order
                </button>
                <button 
                  onClick={() => setIsPartsModalOpen(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add New Part
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.length > 0 ? (
                  filteredParts.map((part) => {
                    const quantity = part.quantity_in_stock || 0;
                    const minLevel = part.min_stock_level || 10;
                    let statusClass = '';
                    let statusText = '';
                    
                    if (quantity === 0) {
                      statusClass = 'bg-red-100 text-red-800';
                      statusText = 'Out of Stock';
                    } else if (quantity <= minLevel) {
                      statusClass = 'bg-yellow-100 text-yellow-800';
                      statusText = 'Low Stock';
                    } else {
                      statusClass = 'bg-green-100 text-green-800';
                      statusText = 'In Stock';
                    }

                    return (
                      <tr key={part._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {part.part_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-gray-600 text-xs">📦</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedPartForEdit(part);
                                setIsEditPartsModalOpen(true);
                              }}
                              className="text-sm text-gray-900 hover:text-purple-600 hover:underline text-left"
                            >
                              {part.name || 'Unnamed Part'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.type || 'Uncategorized'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{minLevel}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.unit || 'pcs'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewHistory(part)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              History
                            </button>
                            {quantity > 0 && (
                              <button 
                                onClick={() => {
                                  setSelectedPart(part);
                                  setIsWithdrawModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center">
                      <div className="py-8">
                        <div className="text-gray-400 text-4xl mb-4">📦</div>
                        <div className="text-gray-500 text-lg font-medium mb-2">
                          {searchTerm ? 'No parts found matching your search.' : 'No stock data available.'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Add some parts to get started.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New Part Modal */}
      <PartsModal
        isOpen={isPartsModalOpen}
        onClose={() => setIsPartsModalOpen(false)}
        onSave={handleAddNewPart}
      />

      {/* Edit Part Modal */}
      <PartsModal
        isOpen={isEditPartsModalOpen}
        onClose={() => {
          setIsEditPartsModalOpen(false);
          setSelectedPartForEdit(null);
        }}
        part={selectedPartForEdit}
        onSave={handleEditPart}
        onDelete={handleDeletePart}
      />

      {/* Purchase Order Modal */}
      <PurchaseOrderModal
        isOpen={isPurchaseOrderModalOpen}
        onClose={() => setIsPurchaseOrderModalOpen(false)}
        onSave={handleCreatePurchaseOrder}
      />

      {/* Receive Items Modal */}
      <ReceiveItemsModal
        isOpen={isReceiveItemsModalOpen}
        onClose={() => {
          setIsReceiveItemsModalOpen(false);
          setSelectedPurchaseOrder(null);
        }}
        purchaseOrder={selectedPurchaseOrder}
        onReceive={handleReceiveItems}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setSelectedPart(null);
        }}
        part={selectedPart}
        onWithdraw={handleWithdrawItem}
      />

      {/* Stock History Modal */}
      {showHistory && selectedPart && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Stock History - {selectedPart.name} ({selectedPart.part_id})
                </h3>
                <button
                  onClick={handleCloseHistory}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {stockHistory.length > 0 ? (
                  <div className="space-y-3">
                    {stockHistory.map((transaction) => (
                      <div key={transaction._id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">
                              {transaction.transaction_type} - {transaction.quantity} units
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                            {transaction.notes && (
                              <div className="text-sm text-gray-600 mt-1">
                                {transaction.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              Stock: {transaction.previous_stock} → {transaction.new_stock}
                            </div>
                            <div className="text-xs text-gray-400">
                              {transaction.transaction_id}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No transaction history available for this part.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Pending Orders Modal */}
      {isViewAllPendingOrdersModalOpen && (
        <ViewAllPendingOrdersModal
          isOpen={isViewAllPendingOrdersModalOpen}
          onClose={() => setIsViewAllPendingOrdersModalOpen(false)}
          orders={pendingOrders}
          onReceiveItems={(order) => {
            setSelectedPurchaseOrder(order);
            setIsReceiveItemsModalOpen(true);
            setIsViewAllPendingOrdersModalOpen(false);
          }}
          onViewOrder={(order) => {
            setSelectedPurchaseOrder(order);
            setIsPurchaseOrderModalOpen(true);
            setIsViewAllPendingOrdersModalOpen(false);
          }}
        />
      )}
    </Layout>
  );
};

// View All Pending Orders Modal Component
const ViewAllPendingOrdersModal = ({ isOpen, onClose, orders, onReceiveItems, onViewOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('order_date');

  if (!isOpen) return null;

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'order_date':
          return new Date(b.order_date) - new Date(a.order_date);
        case 'supplier_name':
          return a.supplier_name.localeCompare(b.supplier_name);
        case 'completion':
          return (b.completion_percentage || 0) - (a.completion_percentage || 0);
        default:
          return 0;
      }
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              All Pending & Partial Purchase Orders ({orders.length})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="order_date">Order Date</option>
                <option value="supplier_name">Supplier Name</option>
                <option value="completion">Completion %</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => {
                const completionPercentage = order.completion_percentage || 0;
                const statusColor = order.status === 'partial' ? 'text-orange-600' : 'text-gray-600';
                const statusText = order.status === 'partial' ? 'Partial' : 'Pending';
                const statusBgColor = order.status === 'partial' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200';
                
                return (
                  <div key={order._id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${statusBgColor}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.supplier_name}</p>
                        <p className="text-xs text-gray-500">
                          {order.items?.length || 0} items • {new Date(order.order_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'partial' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${statusColor}`}>
                          Progress: {completionPercentage}%
                        </span>
                        {order.expected_delivery_date && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(order.expected_delivery_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            order.status === 'partial' ? 'bg-orange-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="mb-3 text-xs text-gray-600">
                      {order.supplier_contact && (
                        <p>Contact: {order.supplier_contact}</p>
                      )}
                      {order.notes && (
                        <p className="mt-1 truncate" title={order.notes}>
                          Notes: {order.notes}
                        </p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-between space-x-2">
                      <button
                        onClick={() => onReceiveItems(order)}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center space-x-1"
                      >
                        <span>📦</span>
                        <span>Receive</span>
                      </button>
                      {/* <button
                        onClick={() => onViewOrder(order)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center space-x-1"
                      >
                        <span>👁️</span>
                        <span>View</span>
                      </button> */}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <div className="text-gray-500 text-lg font-medium mb-2">
                No orders found
              </div>
              <div className="text-gray-400 text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'No pending or partial orders available'}
              </div>
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Pending ({orders.filter(o => o.status === 'pending').length})</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Partial ({orders.filter(o => o.status === 'partial').length})</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InStocks;