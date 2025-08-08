import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PartsModal from '../components/PartsModal';
import { partsAPI, assembliesAPI } from '../services/api';

const Dashboard = () => {
  const [parts, setParts] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [partsResponse, assembliesResponse] = await Promise.all([
        partsAPI.getAll(),
        assembliesAPI.getAll()
      ]);
      
      setParts(partsResponse.data.parts || []);
      setAssemblies(assembliesResponse.data.assemblies || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      // Check if it's a network error or server error
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Unable to connect to server. Please check your connection.');
      } else {
        setError('Failed to load data from server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePart = async (formData) => {
    try {
      if (selectedPart) {
        // Update existing part
        await partsAPI.update(selectedPart._id, formData);
      } else {
        // Create new part
        await partsAPI.create(formData);
      }
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error saving part:', error);
      throw error;
    }
  };

  const handleDeletePart = async (partId) => {
    try {
      await partsAPI.delete(partId);
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error deleting part:', error);
      throw error;
    }
  };

  const handleEditPart = (part) => {
    setSelectedPart(part);
    setIsModalOpen(true);
  };

  const handleAddPart = () => {
    setSelectedPart(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPart(null);
  };

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Stock</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search product"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <span className="text-green-600 text-xl">🔧</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assemblies</p>
                <p className="text-2xl font-bold text-gray-900">{assemblies.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">
                                     {parts.filter(part => (part.quantity_in_stock || 0) < (part.min_stock_level || 10)).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Stock Management</h2>
              <button 
                onClick={handleAddPart}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Parts
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.length > 0 ? (
                  filteredParts.map((part, index) => (
                    <tr key={part._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{String(index + 1).padStart(2, '0')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-gray-600 text-xs">📦</span>
                          </div>
                          <span className="text-sm text-gray-900">{part.name || 'Unnamed Part'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.category || 'Uncategorized'}</td>
                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.quantity_in_stock || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{part.min_stock_level || 10}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${part.price || 0}</td>
                                             <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                           (part.quantity_in_stock || 0) > (part.min_stock_level || 10)
                             ? 'bg-green-100 text-green-800'
                             : 'bg-red-100 text-red-800'
                         }`}>
                           {(part.quantity_in_stock || 0) > (part.min_stock_level || 10) ? 'In Stock' : 'Low Stock'}
                         </span>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleEditPart(part)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeletePart(part._id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center">
                      <div className="py-8">
                        <div className="text-gray-400 text-4xl mb-4">📦</div>
                        <div className="text-gray-500 text-lg font-medium mb-2">
                          {searchTerm ? 'No parts found matching your search.' : 'No data available right now.'}
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
          
          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {filteredParts.length} of {parts.length} results
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

      {/* Parts Modal */}
      <PartsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        part={selectedPart}
        onSave={handleSavePart}
        onDelete={handleDeletePart}
      />
    </Layout>
  );
};

export default Dashboard;