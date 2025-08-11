import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import AssemblyBOMModal from '../components/AssemblyBOMModal';
import { assembliesAPI, partsAPI, productsAPI, bomAPI } from '../services/api';

const Assembly = () => {
  const [assemblies, setAssemblies] = useState([]);
  const [parts, setParts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [assembliesResponse, partsResponse, productsResponse] = await Promise.all([
        assembliesAPI.getAll(),
        partsAPI.getAll(),
        productsAPI.getAll()
      ]);
      
      console.log('Assemblies response:', assembliesResponse);
      console.log('Parts response:', partsResponse);
      console.log('Products response:', productsResponse);
      
      setAssemblies(assembliesResponse.data.data || []);
      setParts(partsResponse.data.data || []);
      setProducts(productsResponse.data.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssembly = async (formData) => {
    try {
      console.log('Creating assembly with data:', formData);
      const response = await assembliesAPI.create(formData);
      console.log('Assembly created successfully:', response);
      setIsCreateModalOpen(false); // Close modal first
      await fetchData(); // Then fetch updated data
    } catch (error) {
      console.error('Error creating assembly:', error);
      throw error;
    }
  };

  const handleUpdateAssembly = async (id, formData) => {
    try {
      await assembliesAPI.update(id, formData);
      fetchData();
      setIsEditModalOpen(false);
      setSelectedAssembly(null);
    } catch (error) {
      console.error('Error updating assembly:', error);
      throw error;
    }
  };

  const handleDeleteAssembly = async (id) => {
    if (window.confirm('Are you sure you want to delete this assembly?')) {
      try {
        await assembliesAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting assembly:', error);
      }
    }
  };

  const handleBuildAssembly = async (assemblyId, quantity) => {
    try {
      await assembliesAPI.build(assemblyId, { quantity });
      fetchData();
      setIsBuildModalOpen(false);
      setSelectedAssembly(null);
    } catch (error) {
      console.error('Error building assembly:', error);
      throw error;
    }
  };

  const filteredAssemblies = assemblies.filter(assembly =>
    assembly.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.assembly_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Current assemblies state:', assemblies);
  console.log('Filtered assemblies:', filteredAssemblies);
  console.log('Search term:', searchTerm);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assemblies...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Assembly Management</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search assemblies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Create Assembly</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">⚙️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assemblies</p>
                <p className="text-2xl font-bold text-gray-900">{assemblies.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.filter(a => a.is_active === true).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 text-xl">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.filter(a => a.is_active === false).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-purple-600 text-xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Built</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.reduce((total, a) => total + (a.total_built || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assemblies Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Assemblies Overview</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assembly ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Built</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssemblies.length > 0 ? (
                  filteredAssemblies.map((assembly) => {
                    const statusClass = assembly.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800';
                    const statusText = assembly.is_active ? 'Active' : 'Inactive';

                    return (
                      <tr key={assembly._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-purple-600 text-xs">⚙️</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">{assembly.assembly_id || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assembly.name || 'Unnamed Assembly'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assembly.category || 'Uncategorized'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assembly.total_built || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(assembly.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedAssembly(assembly);
                                setIsBomModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="View BOM"
                            >
                              📋
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssembly(assembly);
                                setIsBuildModalOpen(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Build Assembly"
                            >
                              🔨
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssembly(assembly);
                                setIsEditModalOpen(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteAssembly(assembly._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <div className="py-8">
                        <div className="text-gray-400 text-4xl mb-4">⚙️</div>
                        <div className="text-gray-500 text-lg font-medium mb-2">
                          {searchTerm ? 'No assemblies found matching your search.' : 'No assemblies available right now.'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {searchTerm ? 'Try adjusting your search terms.' : 'Create your first assembly to get started.'}
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

      {/* Create Assembly Modal */}
      {isCreateModalOpen && (
        <CreateAssemblyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAssembly}
        />
      )}

      {/* Edit Assembly Modal */}
      {isEditModalOpen && selectedAssembly && (
        <EditAssemblyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAssembly(null);
          }}
          onSubmit={(formData) => handleUpdateAssembly(selectedAssembly._id, formData)}
          assembly={selectedAssembly}
        />
      )}

      {/* Build Assembly Modal */}
      {isBuildModalOpen && selectedAssembly && (
        <BuildAssemblyModal
          isOpen={isBuildModalOpen}
          onClose={() => {
            setIsBuildModalOpen(false);
            setSelectedAssembly(null);
          }}
          onSubmit={(formData) => handleBuildAssembly(selectedAssembly._id, formData.quantity)}
          assembly={selectedAssembly}
        />
      )}

      {/* BOM Modal */}
      {isBomModalOpen && selectedAssembly && (
        <AssemblyBOMModal
          isOpen={isBomModalOpen}
          onClose={() => {
            setIsBomModalOpen(false);
            setSelectedAssembly(null);
          }}
          assembly={selectedAssembly}
          parts={parts}
          onUpdate={fetchData}
        />
      )}
    </Layout>
  );
};

// Create Assembly Modal Component
const CreateAssemblyModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    assembly_id: '',
    name: '',
    description: '',
    category: '',
    is_active: true,
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      assembly_id: '',
      name: '',
      description: '',
      category: '',
      is_active: true,
      notes: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // If assembly_id is empty, let the backend generate it
    const submitData = { ...formData };
    if (!submitData.assembly_id.trim()) {
      delete submitData.assembly_id;
    }
    onSubmit(submitData);
    resetForm();
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Assembly</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assembly ID <span className="text-gray-500 text-xs">(Optional - will auto-generate)</span>
            </label>
            <input
              type="text"
              value={formData.assembly_id}
              onChange={(e) => setFormData({ ...formData, assembly_id: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., ASM0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select category</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronic">Electronic</option>
              <option value="Plastic">Plastic</option>
              <option value="Metal">Metal</option>
              <option value="Assembly">Assembly</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Additional notes about this assembly"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Active assembly
            </label>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Create Assembly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Assembly Modal Component
const EditAssemblyModal = ({ isOpen, onClose, onSubmit, assembly }) => {
  const [formData, setFormData] = useState({
    assembly_id: assembly?.assembly_id || '',
    name: assembly?.name || '',
    description: assembly?.description || '',
    category: assembly?.category || '',
    is_active: assembly?.is_active !== undefined ? assembly.is_active : true,
    notes: assembly?.notes || ''
  });

  useEffect(() => {
    if (assembly) {
      setFormData({
        assembly_id: assembly.assembly_id || '',
        name: assembly.name || '',
        description: assembly.description || '',
        category: assembly.category || '',
        is_active: assembly.is_active !== undefined ? assembly.is_active : true,
        notes: assembly.notes || ''
      });
    }
  }, [assembly]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Assembly</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly ID</label>
            <input
              type="text"
              value={formData.assembly_id}
              onChange={(e) => setFormData({ ...formData, assembly_id: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-100"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Assembly ID cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select category</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronic">Electronic</option>
              <option value="Plastic">Plastic</option>
              <option value="Metal">Metal</option>
              <option value="Assembly">Assembly</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Additional notes about this assembly"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
              Active assembly
            </label>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Update Assembly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Build Assembly Modal Component
const BuildAssemblyModal = ({ isOpen, onClose, onSubmit, assembly }) => {
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ quantity: parseInt(quantity) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Build Assembly</h2>
        <div className="mb-4">
          <p className="text-gray-600">Assembly: <span className="font-semibold">{assembly?.name}</span></p>
          <p className="text-gray-600">Description: {assembly?.description}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Build</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Build Assembly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Assembly;
