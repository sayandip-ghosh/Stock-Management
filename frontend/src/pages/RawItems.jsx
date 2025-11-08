import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RawItemsModal from '../components/RawItemsModal';
import CreatePartsModal from '../components/CreatePartsModal';
import RawItemPurchaseOrderModal from '../components/RawItemPurchaseOrderModal';
import ScrapItemsModal from '../components/ScrapItemsModal';
import AddScrapModal from '../components/AddScrapModal';
import RawItemReceiveModal from '../components/RawItemReceiveModal';

import { rawItemsAPI, partsAPI, rawItemPurchaseOrdersAPI, scrapItemsAPI } from '../services/api';

const RawItems = () => {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRawItem, setSelectedRawItem] = useState(null);
  const [materialFilter, setMaterialFilter] = useState('');
  const [isCreatePartsModalOpen, setIsCreatePartsModalOpen] = useState(false);
  const [isPurchaseOrderModalOpen, setIsPurchaseOrderModalOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [scrapItems, setScrapItems] = useState([]);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [isAddScrapModalOpen, setIsAddScrapModalOpen] = useState(false);
  const [selectedScrapItem, setSelectedScrapItem] = useState(null);
  const [isReceiveItemsModalOpen, setIsReceiveItemsModalOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isViewAllPendingOrdersModalOpen, setIsViewAllPendingOrdersModalOpen] = useState(false);

  useEffect(() => {
    fetchRawItems();
    fetchPurchaseOrders();
    fetchScrapItems();
    fetchPendingOrders();
  }, []);

  const fetchRawItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await rawItemsAPI.getAll();
      setRawItems(response.data.data || []);
    } catch (err) {
      console.error('Error fetching raw items:', err);
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError('Failed to load raw items from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRawItem = () => {
    setSelectedRawItem(null);
    setIsModalOpen(true);
  };

  const handleEditRawItem = (rawItem) => {
    setSelectedRawItem(rawItem);
    setIsModalOpen(true);
  };

  const handleSaveRawItem = async (rawItemData) => {
    try {
      if (selectedRawItem) {
        await rawItemsAPI.update(selectedRawItem._id, rawItemData);
      } else {
        await rawItemsAPI.create(rawItemData);
      }
      await fetchRawItems();
    } catch (error) {
      console.error('Error saving raw item:', error);
      throw error;
    }
  };

  const handleDeleteRawItem = async (id) => {
    try {
      await rawItemsAPI.delete(id);
      await fetchRawItems();
    } catch (error) {
      console.error('Error deleting raw item:', error);
      throw error;
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await rawItemPurchaseOrdersAPI.getAll();
      setPurchaseOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const fetchPendingOrders = async () => {
    try {
      const response = await rawItemPurchaseOrdersAPI.getPending();
      setPendingOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    }
  };

  const handleCreateParts = () => {
    setIsCreatePartsModalOpen(true);
  };

  const handleCreatePurchaseOrder = () => {
    setSelectedPurchaseOrder(null);
    setIsPurchaseOrderModalOpen(true);
  };

  const handleEditPurchaseOrder = (purchaseOrder) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setIsPurchaseOrderModalOpen(true);
  };

  const handleSavePurchaseOrder = async (purchaseOrderData) => {
    try {
      if (selectedPurchaseOrder) {
        await rawItemPurchaseOrdersAPI.update(selectedPurchaseOrder._id, purchaseOrderData);
      } else {
        await rawItemPurchaseOrdersAPI.create(purchaseOrderData);
      }
      await fetchPurchaseOrders();
      await fetchPendingOrders();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      throw error;
    }
  };

  const handleReceiveItems = async (receiptData) => {
    try {
      console.log('Receiving raw items with data:', receiptData);
      
      // Extract purchase order ID from the receipt data
      const purchaseOrderId = receiptData.purchase_order_id;
      
      // Prepare the data for the API call (without purchase_order_id in the body)
      const apiData = {
        received_date: receiptData.received_date,
        items: receiptData.items,
        notes: receiptData.notes,
        receiver_name: receiptData.receiver_name || 'system',
        carrier_info: receiptData.carrier_info || ''
      };
      
      await rawItemPurchaseOrdersAPI.receiveItems(purchaseOrderId, apiData);
      
      console.log('Successfully received raw items');
      
      // Refresh data
      await fetchPurchaseOrders();
      await fetchPendingOrders();
      await fetchRawItems();
      
      // Close modal
      setIsReceiveItemsModalOpen(false);
      setSelectedPurchaseOrder(null);
      
    } catch (error) {
      console.error('Error receiving raw items:', error);
      throw error;
    }
  };

  const handleDeletePurchaseOrder = async (id) => {
    try {
      await rawItemPurchaseOrdersAPI.delete(id);
      await fetchPurchaseOrders();
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  };


  const handleSaveParts = async (partsData) => {
    try {
      console.log('Creating parts with data:', partsData);
      
      // Call the new API endpoint to create parts from raw items
      const response = await partsAPI.createFromRawItems(partsData);
      
      console.log('Parts created successfully:', response.data);
      
      // Show success message
      alert(`Successfully created ${response.data.data.part.quantity_created} ${response.data.data.part.name}!`);
      
      // Refresh the raw items list to show updated stock levels
      await fetchRawItems();
      
    } catch (error) {
      console.error('Error creating parts:', error);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to create parts. Please try again.';
      
      alert(`Error: ${errorMessage}`);
      throw error;
    }
  };

  const fetchScrapItems = async () => {
    try {
      const response = await scrapItemsAPI.getAll();
      setScrapItems(response.data.data || []);
    } catch (error) {
      console.error('Error fetching scrap items:', error);
    }
  };

  const handleAddScrapItem = () => {
    setSelectedScrapItem(null);
    setIsScrapModalOpen(true);
  };

  const handleEditScrapItem = (scrapItem) => {
    setSelectedScrapItem(scrapItem);
    setIsScrapModalOpen(true);
  };

  const handleSaveScrapItem = async (scrapItemData) => {
    try {
      if (selectedScrapItem) {
        await scrapItemsAPI.update(selectedScrapItem._id, scrapItemData);
      } else {
        await scrapItemsAPI.create(scrapItemData);
      }
      await fetchScrapItems();
    } catch (error) {
      console.error('Error saving scrap item:', error);
      throw error;
    }
  };

  const handleDeleteScrapItem = async (id) => {
    try {
      await scrapItemsAPI.delete(id);
      await fetchScrapItems();
    } catch (error) {
      console.error('Error deleting scrap item:', error);
      throw error;
    }
  };

  const handleAddScrapFromOperation = () => {
    setIsAddScrapModalOpen(true);
  };

  const handleScrapAdded = () => {
    fetchScrapItems();
    fetchRawItems(); // Also refresh raw items to show updated stock levels
  };

  const filteredRawItems = rawItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.material_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMaterial = !materialFilter || item.material_type === materialFilter;
    return matchesSearch && matchesMaterial;
  });

  // Calculate stock statistics
  const inStockCount = rawItems.filter(item => (item.quantity_in_stock || 0) > 0).length;
  const lowStockCount = rawItems.filter(item => {
    const quantity = item.quantity_in_stock || 0;
    const minLevel = item.min_stock_level || 10;
    return quantity > 0 && quantity <= minLevel;
  }).length;
  const outOfStockCount = rawItems.filter(item => !item.quantity_in_stock || item.quantity_in_stock === 0).length;

  // Get unique material types for filter
  const materialTypes = [...new Set(rawItems.map(item => item.material_type).filter(Boolean))];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading raw items...</p>
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
              onClick={fetchRawItems}
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
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raw Items Dashboard</h1>
          
          {/* Action Buttons - Responsive Layout */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
            
            <button
              onClick={handleCreateParts}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1 text-sm whitespace-nowrap flex-shrink-0"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Create Parts</span>
              <span className="sm:hidden">Parts</span>
            </button>
            
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, material type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0 sm:min-w-[160px]"
          >
            <option value="">All Materials</option>
            {materialTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-lg sm:text-xl">🏭</span>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Raw Items</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{rawItems.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-lg sm:text-xl">✅</span>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{inStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-lg sm:text-xl">⚠️</span>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{lowStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-lg sm:text-xl">❌</span>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{outOfStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending & Partial Purchase Orders Section */}
        {pendingOrders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-yellow-800">Pending & Partial Raw Item Purchase Orders</h3>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                {pendingOrders.length} orders
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingOrders.slice(0, 3).map(order => (
                <div key={order._id} className="bg-white border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {order.order_number}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">
                        {order.supplier_name}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {order.status === 'partial' ? `${order.completion_percentage || 0}%` : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    {order.items.length} item(s) • ${order.total_amount?.toFixed(2) || '0.00'}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {new Date(order.order_date).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPurchaseOrder(order);
                        setIsReceiveItemsModalOpen(true);
                      }}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 flex items-center space-x-1"
                    >
                      <span>📦</span>
                      <span>Receive</span>
                    </button>
                  </div>
                </div>
              ))}
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

        {/* Scrap Items Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <h2 className="text-lg font-semibold text-gray-900">Scrap Items</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddScrapItem}
                  className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                >
                  Manage Scrap Items
                </button>
                <button
                  onClick={handleAddScrapFromOperation}
                  className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"
                >
                  Add Scrap
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {scrapItems.length > 0 ? (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full divide-y divide-gray-200" style={{minWidth: '700px'}}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Source Raw Item</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Operation</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Part Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scrapItems.slice(0, 5).map((scrap) => (
                      <tr key={scrap._id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-orange-600 text-xs">♻️</span>
                            </div>
                            <div>
                              <div className="text-sm text-gray-900">{scrap.name}</div>
                              <div className="text-xs text-gray-500">{scrap.item_id}</div>
                              <div className="text-xs text-gray-500 lg:hidden">
                                {scrap.raw_item_id?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          {scrap.raw_item_id?.name || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{scrap.quantity_available} {scrap.unit}</div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {scrap.source_operation?.charAt(0).toUpperCase() + scrap.source_operation?.slice(1) || 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                          {scrap.source_operation?.charAt(0).toUpperCase() + scrap.source_operation?.slice(1) || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                          {scrap.source_details?.part_name || 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                          {scrap.source_details?.operation_date ? 
                            new Date(scrap.source_details.operation_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditScrapItem(scrap)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">♻️</div>
                <p className="text-base sm:text-lg font-medium mb-2">No scrap items yet</p>
                <p className="text-sm mb-4 px-4">Add scrap from manufacturing operations to track reusable materials</p>
                <button
                  onClick={handleAddScrapFromOperation}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm sm:text-base"
                >
                  Add Scrap
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Raw Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Raw Items Overview</h2>
              <div className='flex items-center justify-between gap-2'>
                <button
              onClick={handleCreatePurchaseOrder}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-1 text-sm whitespace-nowrap flex-shrink-0"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Create Purchase Order</span>
              <span className="sm:hidden">Purchase</span>
            </button>
            <button
              onClick={handleAddRawItem}
              className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-1 text-sm whitespace-nowrap flex-shrink-0"
            >
              <span>+</span>
              <span className="hidden sm:inline">Add Raw Item</span>
              <span className="sm:hidden">Add Item</span>
            </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto min-w-0">
            <table className="w-full divide-y divide-gray-200" style={{minWidth: '600px'}}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Sn</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Item Name</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Material</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Min</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Price</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRawItems.length > 0 ? (
                  filteredRawItems.map((item, index) => {
                    const quantity = item.quantity_in_stock || 0;
                    const minLevel = item.min_stock_level || 10;
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
                      <tr key={item._id || index} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 font-medium">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                              <span className="text-gray-600 text-xs">🏭</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900 truncate">{item.name || 'Unnamed Item'}</div>
                              <div className="text-xs text-gray-500 truncate">{item.item_id || 'N/A'}</div>
                              <div className="text-xs text-gray-500 md:hidden">
                                {item.material_type || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 hidden md:table-cell">
                          <div className="truncate">{item.material_type || 'N/A'}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {quantity} {item.unit || 'kg'}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            Min: {minLevel}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 hidden sm:table-cell">
                          {minLevel}
                        </td>
                        <td className="px-3 sm:px-4 py-4 text-sm text-gray-900 hidden lg:table-cell">
                          ${item.cost_per_unit || 0}
                        </td>
                        <td className="px-3 sm:px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            <span className="hidden sm:inline">{statusText}</span>
                            <span className="sm:hidden">
                              {quantity === 0 ? 'Out' : quantity <= minLevel ? 'Low' : 'OK'}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-4 text-sm font-medium">
                          <button
                            onClick={() => handleEditRawItem(item)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-3 sm:px-4 py-4 text-center">
                      <div className="py-8">
                        <div className="text-gray-400 text-4xl mb-4">🏭</div>
                        <div className="text-gray-500 text-base sm:text-lg font-medium mb-2">
                          {searchTerm || materialFilter ? 'No raw items found matching your criteria.' : 'No raw items available right now.'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {searchTerm || materialFilter ? 'Try adjusting your search terms or filters.' : 'Add your first raw item to get started.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="text-sm text-gray-700 text-center sm:text-left">
                Showing {filteredRawItems.length} of {rawItems.length} results
              </div>
              <div className="flex items-center justify-center sm:justify-end space-x-2">
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded">
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded border border-purple-600">
                  01
                </button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Items Modal */}
      <RawItemsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        rawItem={selectedRawItem}
        onSave={handleSaveRawItem}
        onDelete={handleDeleteRawItem}
      />

      {/* Create Parts Modal */}
      <CreatePartsModal
        isOpen={isCreatePartsModalOpen}
        onClose={() => setIsCreatePartsModalOpen(false)}
        onSave={handleSaveParts}
      />

      {/* Raw Item Purchase Order Modal */}
      <RawItemPurchaseOrderModal
        isOpen={isPurchaseOrderModalOpen}
        onClose={() => setIsPurchaseOrderModalOpen(false)}
        purchaseOrder={selectedPurchaseOrder}
        onSave={handleSavePurchaseOrder}
        onDelete={handleDeletePurchaseOrder}
      />

      {/* Scrap Items Modal */}
      <ScrapItemsModal
        isOpen={isScrapModalOpen}
        onClose={() => setIsScrapModalOpen(false)}
        scrapItem={selectedScrapItem}
        onSave={handleSaveScrapItem}
        onDelete={handleDeleteScrapItem}
      />

      {/* Add Scrap Modal */}
      <AddScrapModal
        isOpen={isAddScrapModalOpen}
        onClose={() => setIsAddScrapModalOpen(false)}
        onSuccess={handleScrapAdded}
      />

      {/* Receive Items Modal */}
      <RawItemReceiveModal
        isOpen={isReceiveItemsModalOpen}
        onClose={() => {
          setIsReceiveItemsModalOpen(false);
          setSelectedPurchaseOrder(null);
        }}
        purchaseOrder={selectedPurchaseOrder}
        onReceive={handleReceiveItems}
      />

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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'order_date') {
      return new Date(b.order_date) - new Date(a.order_date);
    } else if (sortBy === 'completion_percentage') {
      return (b.completion_percentage || 0) - (a.completion_percentage || 0);
    } else if (sortBy === 'total_amount') {
      return (b.total_amount || 0) - (a.total_amount || 0);
    }
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">All Pending & Partial Raw Item Orders</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="order_date">Sort by Date</option>
              <option value="completion_percentage">Sort by Progress</option>
              <option value="total_amount">Sort by Amount</option>
            </select>
          </div>

          {/* Orders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrders.map(order => (
              <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {order.order_number}
                    </h3>
                    <p className="text-xs text-gray-600 truncate">
                      {order.supplier_name}
                    </p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {order.status === 'partial' ? `${order.completion_percentage || 0}%` : 'Pending'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Items:</span>
                    <span className="text-gray-900">{order.items.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total:</span>
                    <span className="text-gray-900">${order.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">{new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                </div>

                {order.status === 'partial' && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{order.completion_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${order.completion_percentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onReceiveItems(order)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 flex items-center justify-center space-x-1"
                  >
                    <span>📦</span>
                    <span>Receive</span>
                  </button>
                  <button
                    onClick={() => onViewOrder(order)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 flex items-center justify-center space-x-1"
                  >
                    <span>👁️</span>
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {sortedOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-lg font-medium mb-2">No pending orders found</p>
              <p className="text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'All orders have been completed or there are no orders yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawItems;
