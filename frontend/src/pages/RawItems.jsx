import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RawItemsModal from '../components/RawItemsModal';
import CreatePartsModal from '../components/CreatePartsModal';
import RawItemPurchaseOrderModal from '../components/RawItemPurchaseOrderModal';
import ScrapItemsModal from '../components/ScrapItemsModal';
import AddScrapModal from '../components/AddScrapModal';

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

  useEffect(() => {
    fetchRawItems();
    fetchPurchaseOrders();
    fetchScrapItems();
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
    } catch (error) {
      console.error('Error saving purchase order:', error);
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Raw Items Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCreatePurchaseOrder}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>📋</span>
              <span>Create Purchase Order</span>
            </button>
            <button
              onClick={handleCreateParts}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span>Create Parts</span>
            </button>
            <button
              onClick={handleAddScrapFromOperation}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
            >
              <span>♻️</span>
              <span>Add Scrap</span>
            </button>
            <button
              onClick={handleAddRawItem}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <span>+</span>
              <span>Add Raw Item</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, material type, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Materials</option>
            {materialTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">🏭</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Raw Items</p>
                <p className="text-2xl font-bold text-gray-900">{rawItems.length || 0}</p>
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

        {/* Purchase Orders Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Raw Item Purchase Orders</h2>
              <button
                onClick={handleCreatePurchaseOrder}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Orders
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {purchaseOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseOrders.slice(0, 5).map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(order.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.items.length} item(s)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${order.total_amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditPurchaseOrder(order)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium mb-2">No purchase orders yet</p>
                <p className="text-sm mb-4">Create your first raw item purchase order to get started</p>
                <button
                  onClick={handleCreatePurchaseOrder}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Create Purchase Order
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrap Items Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Scrap Items</h2>
              <div className="flex items-center space-x-2">
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
          
          <div className="p-6">
            {scrapItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Raw Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Operation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scrapItems.slice(0, 5).map((scrap) => (
                      <tr key={scrap._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-orange-600 text-xs">♻️</span>
                            </div>
                            <div>
                              <div className="text-sm text-gray-900">{scrap.name}</div>
                              <div className="text-xs text-gray-500">{scrap.item_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scrap.raw_item_id?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scrap.quantity_available} {scrap.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scrap.source_operation?.charAt(0).toUpperCase() + scrap.source_operation?.slice(1) || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scrap.source_details?.part_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scrap.source_details?.operation_date ? 
                            new Date(scrap.source_details.operation_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                <p className="text-lg font-medium mb-2">No scrap items yet</p>
                <p className="text-sm mb-4">Add scrap from manufacturing operations to track reusable materials</p>
                <button
                  onClick={handleAddScrapFromOperation}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                >
                  Add Scrap
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Raw Items Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Raw Items Overview</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(index + 1).padStart(2, '0')}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-gray-600 text-xs">🏭</span>
                            </div>
                            <div>
                              <div className="text-sm text-gray-900">{item.name || 'Unnamed Item'}</div>
                              <div className="text-xs text-gray-500">{item.item_id || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.material_type || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {quantity} {item.unit || 'kg'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{minLevel}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.cost_per_unit || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                    <td colSpan="9" className="px-6 py-4 text-center">
                      <div className="py-8">
                        <div className="text-gray-400 text-4xl mb-4">🏭</div>
                        <div className="text-gray-500 text-lg font-medium mb-2">
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
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {filteredRawItems.length} of {rawItems.length} results
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Previous</button>
                <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded">01</button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Next</button>
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

    </Layout>
  );
};

export default RawItems;
