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
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [isDismantleModalOpen, setIsDismantleModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBatchBuildModalOpen, setIsBatchBuildModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assembliesResponse, partsResponse] = await Promise.all([
        assembliesAPI.getAll(),
        partsAPI.getAll({ limit: 1000 }) // Fetch all parts without pagination
      ]);

      console.log('Assemblies response:', assembliesResponse);
      console.log('Parts response:', partsResponse);
      console.log('Total parts fetched:', partsResponse.data.parts?.length);

      if (assembliesResponse.data.data && assembliesResponse.data.data.length > 0) {
        console.log('Sample assembly BOM items:', assembliesResponse.data.data[0].bom_items);
      }

      // Handle both paginated response format and direct array format
      const assembliesData = assembliesResponse.data.data || assembliesResponse.data || [];
      console.log(`Total assemblies fetched: ${assembliesData.length}`);

      setAssemblies(assembliesData);
      setParts(partsResponse.data.parts || []);
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
      setIsCreateModalOpen(false);
      await fetchData();
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

  const handleShipAssembly = async (assemblyId, shipData) => {
    try {
      await assembliesAPI.ship(assemblyId, shipData);
      fetchData();
      setIsShipModalOpen(false);
      setSelectedAssembly(null);
    } catch (error) {
      console.error('Error shipping assembly:', error);
      throw error;
    }
  };

  const handleDismantleAssembly = async (assemblyId, dismantleData) => {
    try {
      await assembliesAPI.dismantle(assemblyId, dismantleData);
      fetchData();
      setIsDismantleModalOpen(false);
      setSelectedAssembly(null);
    } catch (error) {
      console.error('Error dismantling assembly:', error);
      throw error;
    }
  };

  const handleBatchBuild = async (batchData) => {
    try {
      // Process each assembly build request
      for (const item of batchData.items) {
        if (item.quantity > 0) {
          await assembliesAPI.build(item.assembly_id, { quantity: item.quantity });
        }
      }

      fetchData(); // Refresh data
      setIsBatchBuildModalOpen(false);
    } catch (error) {
      console.error('Error in batch build:', error);
      throw error;
    }
  };

  const filteredAssemblies = assemblies.filter(assembly =>
    assembly.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.assembly_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assembly.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to calculate max buildable quantity for an assembly
  const calculateMaxBuildable = (assembly) => {
    if (!assembly.bom_items || assembly.bom_items.length === 0) {
      return 0; // Can't build without BOM items
    }

    let maxBuildable = Infinity;

    assembly.bom_items.forEach(item => {
      let availableStock = 0;

      // Handle both populated and non-populated part data
      if (typeof item.part_id === 'object') {
        availableStock = item.part_id.quantity_in_stock || 0;
      } else {
        // Find part data from parts array if not populated
        const partData = parts.find(part => part._id === item.part_id);
        availableStock = partData?.quantity_in_stock || 0;
      }

      const requiredPerAssembly = item.quantity_required || 0;

      if (requiredPerAssembly > 0) {
        const possibleFromThisPart = Math.floor(availableStock / requiredPerAssembly);
        maxBuildable = Math.min(maxBuildable, possibleFromThisPart);
      } else {
        maxBuildable = 0; // If any part has zero requirement, something is wrong
      }
    });

    return maxBuildable === Infinity ? 0 : maxBuildable;
  };

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
              onClick={() => setIsBatchBuildModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <span>🔨</span>
              <span>Batch Build</span>
            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
                <p className="text-sm font-medium text-gray-600">Ready Built</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.reduce((total, a) => total + (a.ready_built || 0), 0)}
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
                <p className="text-sm font-medium text-gray-600">Total Shipped</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.reduce((total, a) => total + (a.total_shipped || 0), 0)}
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
                <p className="text-sm font-medium text-gray-600">Dismantled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.reduce((total, a) => total + (a.total_dismantled || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <span className="text-gray-600 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Built</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assemblies.reduce((total, a) => total + ((a.ready_built || 0) + (a.total_shipped || 0)), 0)}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ready Built</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Buildable</th>
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
                    const maxBuildable = calculateMaxBuildable(assembly);

                    return (
                      <tr key={assembly._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-purple-600 text-xs">⚙️</span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedAssembly(assembly);
                                setIsViewModalOpen(true);
                              }}
                              className="text-sm font-medium text-purple-600 hover:text-purple-900 hover:underline text-left"
                            >
                              {assembly.assembly_id || 'N/A'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedAssembly(assembly);
                              setIsViewModalOpen(true);
                            }}
                            className="text-sm text-gray-900 hover:text-purple-600 hover:underline text-left"
                          >
                            {assembly.name || 'Unnamed Assembly'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assembly.category || 'Uncategorized'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {assembly.ready_built || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm font-bold ${
                              maxBuildable > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {maxBuildable}
                            </span>
                            {maxBuildable === 0 && assembly.bom_items && assembly.bom_items.length > 0 && (
                              <span 
                                className="ml-1 text-xs text-red-500 cursor-help" 
                                title="Cannot build due to insufficient stock"
                              >
                                ⚠️
                              </span>
                            )}
                            {!assembly.bom_items || assembly.bom_items.length === 0 ? (
                              <span 
                                className="ml-1 text-xs text-gray-400 cursor-help" 
                                title="No BOM items defined"
                              >
                                📋
                              </span>
                            ) : null}
                          </div>
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
                                setIsShipModalOpen(true);
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="Ship Assembly"
                              disabled={(assembly.ready_built || 0) === 0}
                            >
                              🚚
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAssembly(assembly);
                                setIsDismantleModalOpen(true);
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="Dismantle Assembly"
                              disabled={(assembly.ready_built || 0) === 0}
                            >
                              🔧
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

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateAssemblyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAssembly}
        />
      )}

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

      {isBuildModalOpen && selectedAssembly && (
        <BuildAssemblyModal
          isOpen={isBuildModalOpen}
          onClose={() => {
            setIsBuildModalOpen(false);
            setSelectedAssembly(null);
          }}
          onSubmit={(formData) => handleBuildAssembly(selectedAssembly._id, formData.quantity)}
          assembly={selectedAssembly}
          parts={parts}
        />
      )}

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

      {isViewModalOpen && selectedAssembly && (
        <ViewAssemblyModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedAssembly(null);
          }}
          assembly={selectedAssembly}
          onEdit={() => {
            setIsViewModalOpen(false);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {isShipModalOpen && selectedAssembly && (
        <ShipAssemblyModal
          isOpen={isShipModalOpen}
          onClose={() => {
            setIsShipModalOpen(false);
            setSelectedAssembly(null);
          }}
          onSubmit={(shipData) => handleShipAssembly(selectedAssembly._id, shipData)}
          assembly={selectedAssembly}
        />
      )}

      {isDismantleModalOpen && selectedAssembly && (
        <DismantleAssemblyModal
          isOpen={isDismantleModalOpen}
          onClose={() => {
            setIsDismantleModalOpen(false);
            setSelectedAssembly(null);
          }}
          onSubmit={(dismantleData) => handleDismantleAssembly(selectedAssembly._id, dismantleData)}
          assembly={selectedAssembly}
        />
      )}

      {isBatchBuildModalOpen && (
        <BatchBuildModal
          isOpen={isBatchBuildModalOpen}
          onClose={() => setIsBatchBuildModalOpen(false)}
          onSubmit={handleBatchBuild}
          assemblies={assemblies}
          parts={parts}
        />
      )}
    </Layout>
  );
};

// Create Assembly Modal Component
const CreateAssemblyModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    estimated_build_time: 0,
    build_cost: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        category: '',
        estimated_build_time: 0,
        build_cost: 0,
        notes: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Assembly name is required';
    }
    
    if (formData.estimated_build_time < 0) {
      newErrors.estimated_build_time = 'Build time cannot be negative';
    }
    
    if (formData.build_cost < 0) {
      newErrors.build_cost = 'Build cost cannot be negative';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating assembly:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Assembly</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter assembly name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                <option value="">Select category</option>
                <option value="Copper">Copper</option>
                <option value="GI">GI</option>
                <option value="SS">SS</option>
                <option value="Brass">Brass</option>
                <option value="PB">PB</option>
                <option value="Aluminium">Aluminium</option>
                <option value="Nylon">Nylon</option>
                <option value="Assembly">Assembly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Build Time (minutes)</label>
              <input
                type="number"
                value={formData.estimated_build_time}
                onChange={(e) => setFormData({ ...formData, estimated_build_time: parseFloat(e.target.value) || 0 })}
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.estimated_build_time ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.estimated_build_time && <p className="text-red-500 text-sm mt-1">{errors.estimated_build_time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Build Cost</label>
              <input
                type="number"
                value={formData.build_cost}
                onChange={(e) => setFormData({ ...formData, build_cost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.build_cost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.build_cost && <p className="text-red-500 text-sm mt-1">{errors.build_cost}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter assembly description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Additional notes"
            />
          </div>

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
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Assembly'}
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
    name: '',
    description: '',
    category: '',
    estimated_build_time: 0,
    build_cost: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && assembly) {
      setFormData({
        name: assembly.name || '',
        description: assembly.description || '',
        category: assembly.category || '',
        estimated_build_time: assembly.estimated_build_time || 0,
        build_cost: assembly.build_cost || 0,
        notes: assembly.notes || ''
      });
      setErrors({});
    }
  }, [isOpen, assembly]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Assembly name is required';
    }
    
    if (formData.estimated_build_time < 0) {
      newErrors.estimated_build_time = 'Build time cannot be negative';
    }
    
    if (formData.build_cost < 0) {
      newErrors.build_cost = 'Build cost cannot be negative';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error updating assembly:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Edit Assembly</h2>
              <p className="text-sm text-gray-600 mt-1">
                Assembly ID: {assembly.assembly_id}
              </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assembly Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter assembly name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                <option value="">Select category</option>
                <option value="Copper">Copper</option>
                <option value="GI">GI</option>
                <option value="SS">SS</option>
                <option value="Brass">Brass</option>
                <option value="PB">PB</option>
                <option value="Aluminium">Aluminium</option>
                <option value="Nylon">Nylon</option>
                <option value="Assembly">Assembly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Build Time (minutes)</label>
              <input
                type="number"
                value={formData.estimated_build_time}
                onChange={(e) => setFormData({ ...formData, estimated_build_time: parseFloat(e.target.value) || 0 })}
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.estimated_build_time ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.estimated_build_time && <p className="text-red-500 text-sm mt-1">{errors.estimated_build_time}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Build Cost</label>
              <input
                type="number"
                value={formData.build_cost}
                onChange={(e) => setFormData({ ...formData, build_cost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.build_cost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.build_cost && <p className="text-red-500 text-sm mt-1">{errors.build_cost}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter assembly description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Additional notes"
            />
          </div>

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
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Assembly'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Assembly Modal Component
const ViewAssemblyModal = ({ isOpen, onClose, assembly, onEdit }) => {
  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{assembly.name}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Assembly ID: {assembly.assembly_id} | Category: {assembly.category || 'Uncategorized'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Assembly Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{assembly.description || 'No description provided'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  assembly.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {assembly.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Build Time</label>
                <p className="mt-1 text-sm text-gray-900">{assembly.estimated_build_time || 0} minutes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Build Cost</label>
                <p className="mt-1 text-sm text-gray-900">${(assembly.build_cost || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ready Built</label>
                <p className="mt-1 text-2xl font-bold text-green-600">{assembly.ready_built || 0}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Shipped</label>
                <p className="mt-1 text-2xl font-bold text-blue-600">{assembly.total_shipped || 0}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Dismantled</label>
                <p className="mt-1 text-2xl font-bold text-orange-600">{assembly.total_dismantled || 0}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Built</label>
                <p className="mt-1 text-2xl font-bold text-purple-600">
                  {(assembly.ready_built || 0) + (assembly.total_shipped || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* BOM Summary */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Bill of Materials Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Total Parts:</span>
                  <span className="ml-2 text-sm text-gray-900">{assembly.bom_items?.length || 0}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">BOM Cost:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    ${assembly.bom_items?.reduce((total, item) => {
                      const partCost = item.part_id?.cost_per_unit || 0;
                      return total + (partCost * item.quantity_required);
                    }, 0).toFixed(2) || '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Can Build:</span>
                  <span className={`ml-2 text-sm font-medium ${
                    assembly.bom_items?.every(item => {
                      const availableStock = item.part_id?.quantity_in_stock || 0;
                      return availableStock >= item.quantity_required;
                    }) ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assembly.bom_items?.every(item => {
                      const availableStock = item.part_id?.quantity_in_stock || 0;
                      return availableStock >= item.quantity_required;
                    }) ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {assembly.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{assembly.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            <p>Created: {new Date(assembly.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(assembly.updatedAt).toLocaleString()}</p>
            <p>Created By: {assembly.created_by || 'System'}</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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

// Build Assembly Modal Component
const BuildAssemblyModal = ({ isOpen, onClose, onSubmit, assembly, parts }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    created_by: 'system'
  });
  const [loading, setLoading] = useState(false);
  const [buildAnalysis, setBuildAnalysis] = useState(null);

  useEffect(() => {
    if (isOpen && assembly) {
      setFormData({
        quantity: 1,
        created_by: 'system'
      });
      analyzeBuild(1);
    }
  }, [isOpen, assembly]);

  useEffect(() => {
    if (formData.quantity > 0 && assembly) {
      analyzeBuild(formData.quantity);
    }
  }, [formData.quantity, assembly]);

  const analyzeBuild = (quantity) => {
    if (!assembly.bom_items || assembly.bom_items.length === 0) {
      setBuildAnalysis({
        canBuild: false,
        reason: 'No BOM items defined',
        insufficientParts: [],
        maxBuildable: 0
      });
      return;
    }

    const insufficientParts = [];
    let maxBuildable = Infinity;

    assembly.bom_items.forEach(item => {
      const requiredQuantity = item.quantity_required * quantity;
      
      // Handle both populated and non-populated part data
      let availableQuantity = 0;
      let partName = 'Unknown Part';
      
      if (typeof item.part_id === 'object') {
        availableQuantity = item.part_id.quantity_in_stock || 0;
        partName = item.part_id.name || 'Unknown Part';
      } else {
        const partData = parts.find(part => part._id === item.part_id);
        if (partData) {
          availableQuantity = partData.quantity_in_stock || 0;
          partName = partData.name || 'Unknown Part';
        }
      }

      const maxFromThisPart = Math.floor(availableQuantity / item.quantity_required);
      maxBuildable = Math.min(maxBuildable, maxFromThisPart);

      if (availableQuantity < requiredQuantity) {
        insufficientParts.push({
          part_name: partName,
          required: requiredQuantity,
          available: availableQuantity,
          shortage: requiredQuantity - availableQuantity
        });
      }
    });

    setBuildAnalysis({
      canBuild: insufficientParts.length === 0,
      insufficientParts,
      maxBuildable: maxBuildable === Infinity ? 0 : maxBuildable,
      reason: insufficientParts.length > 0 ? 'Insufficient stock for some parts' : null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (buildAnalysis && !buildAnalysis.canBuild) {
      if (!window.confirm('Some parts are insufficient. Do you want to proceed anyway? This may fail the build.')) {
        return;
      }
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error building assembly:', error);
      alert('Build failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Build Assembly</h2>
              <p className="text-sm text-gray-600 mt-1">
                {assembly.name} ({assembly.assembly_id})
              </p>
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
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Ready Built:</span>
                <span className="ml-2 font-medium">{assembly.ready_built || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">BOM Items:</span>
                <span className="ml-2 font-medium">{assembly.bom_items?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Build *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              min="1"
              max={buildAnalysis?.maxBuildable || 1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {buildAnalysis && buildAnalysis.maxBuildable > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum buildable: {buildAnalysis.maxBuildable}
              </p>
            )}
          </div>

          {/* Build Analysis */}
          {buildAnalysis && (
            <div className={`p-4 rounded-lg border-2 ${
              buildAnalysis.canBuild 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className={`text-lg font-medium ${
                buildAnalysis.canBuild ? 'text-green-800' : 'text-red-800'
              }`}>
                {buildAnalysis.canBuild ? '✅ Can Build' : '❌ Cannot Build'}
              </div>
              
              {buildAnalysis.insufficientParts.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Insufficient Parts:</h4>
                  <div className="space-y-1">
                    {buildAnalysis.insufficientParts.map((part, index) => (
                      <div key={index} className="text-sm text-red-700">
                        {part.part_name}: Need {part.required}, Have {part.available} (Short: {part.shortage})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {buildAnalysis.canBuild && (
                <div className="mt-2 text-sm text-green-700">
                  All required parts are available for building {formData.quantity} unit(s).
                </div>
              )}
            </div>
          )}

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
              disabled={loading || formData.quantity <= 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Building...' : `Build ${formData.quantity} Unit(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ship Assembly Modal Component
const ShipAssemblyModal = ({ isOpen, onClose, onSubmit, assembly }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    shipping_details: '',
    tracking_number: '',
    customer_info: '',
    created_by: 'system'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && assembly) {
      setFormData({
        quantity: 1,
        shipping_details: '',
        tracking_number: '',
        customer_info: '',
        created_by: 'system'
      });
    }
  }, [isOpen, assembly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (formData.quantity > (assembly.ready_built || 0)) {
      alert('Cannot ship more than ready-built quantity');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error shipping assembly:', error);
      alert('Shipping failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Ship Assembly</h2>
              <p className="text-sm text-gray-600 mt-1">
                {assembly.name} ({assembly.assembly_id})
              </p>
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
          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Available for Shipping</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Ready Built:</span>
                <span className="ml-2 font-medium text-green-600">{assembly.ready_built || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Shipped:</span>
                <span className="ml-2 font-medium">{assembly.total_shipped || 0}</span>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Ship *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              min="1"
              max={assembly.ready_built || 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum available: {assembly.ready_built || 0}
            </p>
          </div>

          {/* Customer Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Information
            </label>
            <input
              type="text"
              value={formData.customer_info}
              onChange={(e) => setFormData({ ...formData, customer_info: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Customer name or company"
            />
          </div>

          {/* Tracking Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking Number
            </label>
            <input
              type="text"
              value={formData.tracking_number}
              onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Carrier tracking number"
            />
          </div>

          {/* Shipping Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Details
            </label>
            <textarea
              value={formData.shipping_details}
              onChange={(e) => setFormData({ ...formData, shipping_details: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Shipping address, carrier, special instructions, etc."
            />
          </div>

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
              disabled={loading || formData.quantity <= 0 || formData.quantity > (assembly.ready_built || 0)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Shipping...' : `Ship ${formData.quantity} Unit(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Dismantle Assembly Modal Component
const DismantleAssemblyModal = ({ isOpen, onClose, onSubmit, assembly }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    reason: '',
    created_by: 'system'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && assembly) {
      setFormData({
        quantity: 1,
        reason: '',
        created_by: 'system'
      });
    }
  }, [isOpen, assembly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (formData.quantity > (assembly.ready_built || 0)) {
      alert('Cannot dismantle more than ready-built quantity');
      return;
    }

    if (!formData.reason.trim()) {
      alert('Please provide a reason for dismantling');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error dismantling assembly:', error);
      alert('Dismantling failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Dismantle Assembly</h2>
              <p className="text-sm text-gray-600 mt-1">
                {assembly.name} ({assembly.assembly_id})
              </p>
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
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Warning: Dismantling Assembly
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  This action will dismantle the assembly and return all parts to inventory. This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Current Status</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Ready Built:</span>
                <span className="ml-2 font-medium">{assembly.ready_built || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Dismantled:</span>
                <span className="ml-2 font-medium">{assembly.total_dismantled || 0}</span>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Dismantle *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              min="1"
              max={assembly.ready_built || 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum available: {assembly.ready_built || 0}
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Dismantling *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g., Quality issue, Design change, Customer request, etc."
              required
            />
          </div>

          {/* Parts that will be returned */}
          {assembly.bom_items && assembly.bom_items.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Parts that will be returned to inventory:
              </h4>
              <div className="space-y-1">
                {assembly.bom_items.map((item, index) => {
                  const partName = typeof item.part_id === 'object' 
                    ? item.part_id.name 
                    : 'Unknown Part';
                  const returnQuantity = item.quantity_required * formData.quantity;
                  
                  return (
                    <div key={index} className="text-sm text-blue-700">
                      {partName}: +{returnQuantity} units
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              disabled={loading || formData.quantity <= 0 || formData.quantity > (assembly.ready_built || 0) || !formData.reason.trim()}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Dismantling...' : `Dismantle ${formData.quantity} Unit(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Batch Build Modal Component
const BatchBuildModal = ({ isOpen, onClose, onSubmit, assemblies, parts }) => {
  const [selectedAssemblies, setSelectedAssemblies] = useState([]);
  const [batchAnalysis, setBatchAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDetailedPartsModalOpen, setIsDetailedPartsModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedAssemblies([]);
      setBatchAnalysis(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAssemblies.length > 0) {
      analyzeBatchBuild();
    } else {
      setBatchAnalysis(null);
    }
  }, [selectedAssemblies]);

  const addAssemblyToBatch = (assembly) => {
    const existing = selectedAssemblies.find(item => item.assembly_id === assembly._id);
    if (existing) {
      alert('Assembly already added to batch');
      return;
    }

    setSelectedAssemblies(prev => [...prev, {
      assembly_id: assembly._id,
      assembly_data: assembly,
      quantity: 1
    }]);
  };

  const updateAssemblyQuantity = (assemblyId, quantity) => {
    setSelectedAssemblies(prev => 
      prev.map(item => 
        item.assembly_id === assemblyId 
          ? { ...item, quantity: Math.max(0, parseInt(quantity) || 0) }
          : item
      )
    );
  };

  const removeAssemblyFromBatch = (assemblyId) => {
    setSelectedAssemblies(prev => prev.filter(item => item.assembly_id !== assemblyId));
  };

  const analyzeBatchBuild = () => {
    // Calculate total part requirements across all selected assemblies
    const totalPartRequirements = {};
    const assemblyDetails = [];

    selectedAssemblies.forEach(item => {
      if (item.quantity <= 0) return;

      const assembly = item.assembly_data;
      const quantity = item.quantity;

      // Process BOM items for this assembly
      assembly.bom_items?.forEach(bomItem => {
        const partId = typeof bomItem.part_id === 'object' ? bomItem.part_id._id : bomItem.part_id;
        const partData = typeof bomItem.part_id === 'object' ? bomItem.part_id : parts.find(p => p._id === partId);
        
        if (partData) {
          const requiredQuantity = bomItem.quantity_required * quantity;
          
          if (!totalPartRequirements[partId]) {
            totalPartRequirements[partId] = {
              part_data: partData,
              total_required: 0,
              available_stock: partData.quantity_in_stock || 0,
              assemblies_using: []
            };
          }
          
          totalPartRequirements[partId].total_required += requiredQuantity;
          totalPartRequirements[partId].assemblies_using.push({
            assembly_name: assembly.name,
            assembly_id: assembly.assembly_id,
            quantity_needed: requiredQuantity,
            build_quantity: quantity
          });
        }
      });

      assemblyDetails.push({
        assembly_id: assembly._id,
        assembly_name: assembly.name,
        assembly_code: assembly.assembly_id,
        quantity: quantity,
        bom_items_count: assembly.bom_items?.length || 0
      });
    });

    // Calculate constraints and maximum buildable quantities
    let globalMaxBuildable = Infinity;
    const partConstraints = [];
    const insufficientParts = [];

    Object.entries(totalPartRequirements).forEach(([partId, requirement]) => {
      const { part_data, total_required, available_stock } = requirement;
      
      if (available_stock < total_required) {
        insufficientParts.push({
          part_name: part_data.name,
          part_id: part_data.part_id,
          total_required,
          available_stock,
          shortage: total_required - available_stock,
          assemblies_using: requirement.assemblies_using
        });
      }

      // Calculate how this part constrains the batch build
      const partConstraint = available_stock / total_required;
      if (partConstraint < globalMaxBuildable) {
        globalMaxBuildable = partConstraint;
      }

      partConstraints.push({
        part_name: part_data.name,
        part_id: part_data.part_id,
        required: total_required,
        available: available_stock,
        constraint_factor: partConstraint,
        assemblies_using: requirement.assemblies_using
      });
    });

    // Calculate maximum buildable for each assembly considering shared constraints
    const maxBuildablePerAssembly = selectedAssemblies.map(item => {
      let assemblyMaxBuildable = Infinity;
      
      item.assembly_data.bom_items?.forEach(bomItem => {
        const partId = typeof bomItem.part_id === 'object' ? bomItem.part_id._id : bomItem.part_id;
        const requirement = totalPartRequirements[partId];
        
        if (requirement) {
          const partMaxForThisAssembly = Math.floor(
            requirement.available_stock / bomItem.quantity_required
          );
          
          // Consider shared usage across all assemblies in the batch
          const sharedUsage = requirement.total_required / bomItem.quantity_required;
          const adjustedMax = Math.floor(partMaxForThisAssembly / sharedUsage * item.quantity);
          
          if (adjustedMax < assemblyMaxBuildable) {
            assemblyMaxBuildable = adjustedMax;
          }
        }
      });

      return {
        assembly_id: item.assembly_id,
        assembly_name: item.assembly_data.name,
        requested_quantity: item.quantity,
        max_buildable: assemblyMaxBuildable === Infinity ? item.quantity : Math.max(0, assemblyMaxBuildable)
      };
    });

    setBatchAnalysis({
      can_build_all: insufficientParts.length === 0,
      total_assemblies: selectedAssemblies.length,
      total_part_types: Object.keys(totalPartRequirements).length,
      insufficient_parts: insufficientParts,
      part_constraints: partConstraints.sort((a, b) => a.constraint_factor - b.constraint_factor),
      assembly_details: assemblyDetails,
      max_buildable_per_assembly: maxBuildablePerAssembly,
      global_constraint_factor: globalMaxBuildable === Infinity ? 1 : globalMaxBuildable
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedAssemblies.length === 0) {
      alert('Please select at least one assembly');
      return;
    }

    if (batchAnalysis && !batchAnalysis.can_build_all) {
      if (!window.confirm('Some parts are insufficient. Do you want to proceed anyway? This may partially complete some builds.')) {
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit({
        items: selectedAssemblies.filter(item => item.quantity > 0)
      });
    } catch (error) {
      console.error('Error in batch build:', error);
      alert('Batch build failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Batch Assembly Build</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Select multiple assemblies to build together. The system will analyze shared part dependencies.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Assembly Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Available Assemblies</h3>
              
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {assemblies.filter(a => a.is_active && a.bom_items?.length > 0).map(assembly => (
                  <div key={assembly._id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{assembly.name}</div>
                      <div className="text-sm text-gray-500">
                        {assembly.assembly_id} | {assembly.bom_items?.length || 0} parts | {assembly.ready_built || 0} ready
                      </div>
                    </div>
                    <button
                      onClick={() => addAssemblyToBatch(assembly)}
                      className="ml-3 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>

              {/* Selected Assemblies */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Selected Assemblies ({selectedAssemblies.length})
                </h3>
                
                {selectedAssemblies.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAssemblies.map(item => (
                      <div key={item.assembly_id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-blue-900">{item.assembly_data.name}</div>
                          <div className="text-sm text-blue-700">{item.assembly_data.assembly_id}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateAssemblyQuantity(item.assembly_id, e.target.value)}
                            min="0"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                          <button
                            onClick={() => removeAssemblyFromBatch(item.assembly_id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <div className="text-4xl mb-2">⚙️</div>
                    <div>No assemblies selected</div>
                    <div className="text-sm">Add assemblies from the list above</div>
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Batch Analysis</h3>
              
              {batchAnalysis ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className={`p-4 rounded-lg border-2 ${
                    batchAnalysis.can_build_all 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`text-lg font-medium ${
                      batchAnalysis.can_build_all ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {batchAnalysis.can_build_all ? '✅ All Assemblies Can Be Built' : '❌ Insufficient Parts'}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Assemblies:</span>
                        <span className="ml-1 font-medium">{batchAnalysis.total_assemblies}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Part Types:</span>
                        <span className="ml-1 font-medium">{batchAnalysis.total_part_types}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Build Factor:</span>
                        <span className="ml-1 font-medium">
                          {(batchAnalysis.global_constraint_factor * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Max Buildable Per Assembly */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Maximum Buildable Quantities</h4>
                    <div className="space-y-2">
                      {batchAnalysis.max_buildable_per_assembly.map(item => (
                        <div key={item.assembly_id} className="flex justify-between items-center p-2 bg-white rounded border">
                          <span className="font-medium">{item.assembly_name}</span>
                          <div className="text-right">
                            <span className="text-sm text-gray-600">Requested: {item.requested_quantity}</span>
                            <div className={`font-medium ${
                              item.max_buildable >= item.requested_quantity ? 'text-green-600' : 'text-red-600'
                            }`}>
                              Max: {item.max_buildable}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insufficient Parts */}
                  {batchAnalysis.insufficient_parts.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-red-800">Insufficient Parts</h4>
                        <button
                          onClick={() => setIsDetailedPartsModalOpen(true)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition-colors"
                          title="View detailed parts information"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {batchAnalysis.insufficient_parts.map((part, index) => (
                          <div key={index} className="p-3 bg-white rounded border-l-4 border-red-400">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-red-900">{part.part_name}</div>
                                <div className="text-sm text-red-700">
                                  Required: {part.total_required} | Available: {part.available_stock} | Short: {part.shortage}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-red-600">
                              Used by: {part.assemblies_using.map(a => `${a.assembly_name} (${a.quantity_needed})`).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Constraints */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-3">Top Part Constraints</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {batchAnalysis.part_constraints.slice(0, 5).map((constraint, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                          <div>
                            <span className="font-medium">{constraint.part_name}</span>
                            <div className="text-sm text-gray-600">
                              {constraint.required} needed, {constraint.available} available
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              constraint.constraint_factor >= 1 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(constraint.constraint_factor * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-4xl mb-2">📊</div>
                  <div>Select assemblies to see analysis</div>
                  <div className="text-sm">Analysis will show part dependencies and constraints</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedAssemblies.length > 0 && batchAnalysis && (
                <span>
                  {batchAnalysis.can_build_all ? 
                    `Ready to build ${selectedAssemblies.reduce((sum, item) => sum + item.quantity, 0)} assemblies` :
                    `${batchAnalysis.insufficient_parts.length} parts insufficient`
                  }
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || selectedAssemblies.length === 0 || selectedAssemblies.every(item => item.quantity === 0)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Building...' : 'Build All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Insufficient Parts Modal */}
      {isDetailedPartsModalOpen && batchAnalysis && (
        <DetailedInsufficientPartsModal
          isOpen={isDetailedPartsModalOpen}
          onClose={() => setIsDetailedPartsModalOpen(false)}
          insufficientParts={batchAnalysis.insufficient_parts}
        />
      )}
    </div>
  );
};

// Detailed Insufficient Parts Modal Component
const DetailedInsufficientPartsModal = ({ isOpen, onClose, insufficientParts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-red-800">Detailed Insufficient Parts Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">
                Complete breakdown of all parts that are insufficient for the batch build
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="text-sm font-medium text-red-700">Total Insufficient Parts</div>
                <div className="text-2xl font-bold text-red-800">{insufficientParts.length}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="text-sm font-medium text-orange-700">Total Shortage</div>
                <div className="text-2xl font-bold text-orange-800">
                  {insufficientParts.reduce((total, part) => total + part.shortage, 0)}
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="text-sm font-medium text-yellow-700">Total Required</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {insufficientParts.reduce((total, part) => total + part.total_required, 0)}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700">Total Available</div>
                <div className="text-2xl font-bold text-blue-800">
                  {insufficientParts.reduce((total, part) => total + part.available_stock, 0)}
                </div>
              </div>
            </div>

            {/* Detailed Parts Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Part Details</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Part Information
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantities
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shortage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Used By Assemblies
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {insufficientParts.map((part, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{part.part_name}</div>
                            <div className="text-sm text-gray-500">{part.part_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-600">Required:</span>
                              <span className="ml-2 font-medium text-red-600">{part.total_required}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Available:</span>
                              <span className="ml-2 font-medium text-green-600">{part.available_stock}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                              -{part.shortage}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {part.assemblies_using.map((assembly, assemblyIndex) => (
                              <div key={assemblyIndex} className="bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="text-sm font-medium text-blue-900">
                                  {assembly.assembly_name}
                                </div>
                                <div className="text-xs text-blue-700">
                                  ID: {assembly.assembly_id} | Needs: {assembly.quantity_needed} units | Build Qty: {assembly.build_quantity}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assembly;
