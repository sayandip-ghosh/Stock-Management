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

      setAssemblies(assembliesResponse.data.data || []);
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
    </Layout>
  );
};

// Build Assembly Modal Component
const BuildAssemblyModal = ({ isOpen, onClose, onSubmit, assembly, parts }) => {
  const [quantity, setQuantity] = useState(1);
  const [canBuild, setCanBuild] = useState(true);
  const [buildCheck, setBuildCheck] = useState(null);

  useEffect(() => {
    if (assembly && assembly.bom_items) {
      checkBuildAvailability();
    }
  }, [assembly, quantity]);

  const checkBuildAvailability = () => {
    if (!assembly.bom_items || assembly.bom_items.length === 0) {
      setCanBuild(false);
      setBuildCheck({ canBuild: false, reason: 'No BOM items defined' });
      return;
    }

    const insufficientParts = [];
    
    assembly.bom_items.forEach(item => {
      const required = item.quantity_required * quantity;
      
      // Handle both populated and non-populated part data
      let available = 0;
      if (item.part_id) {
        if (typeof item.part_id === 'object') {
          available = item.part_id.quantity_in_stock || 0;
        } else {
          // Find part data from parts array if not populated
          const partData = parts.find(part => part._id === item.part_id);
          available = partData?.quantity_in_stock || 0;
        }
      }
      
      if (available < required) {
        const partName = typeof item.part_id === 'object' 
          ? item.part_id.name 
          : parts.find(part => part._id === item.part_id)?.name || 'Unknown';
          
        insufficientParts.push({
          part_name: partName,
          required,
          available,
          shortage: required - available
        });
      }
    });

    const buildAvailable = insufficientParts.length === 0;
    setCanBuild(buildAvailable);
    setBuildCheck({
      canBuild: buildAvailable,
      insufficientParts,
      reason: buildAvailable ? null : 'Insufficient stock for some parts'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canBuild) {
      onSubmit({ quantity: parseInt(quantity) });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Build Assembly</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="mt-2">
            <p className="text-gray-600">Assembly: <span className="font-semibold">{assembly?.name}</span></p>
            <p className="text-gray-600">Assembly ID: {assembly?.assembly_id}</p>
            <p className="text-gray-600">BOM Items: {assembly?.bom_items?.length || 0}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Build Check Results */}
            {buildCheck && (
              <div className={`p-4 rounded-lg ${canBuild ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h4 className={`font-medium ${canBuild ? 'text-green-800' : 'text-red-800'}`}>
                  Build Status: {canBuild ? 'Ready to Build' : 'Cannot Build'}
                </h4>
                
                {!canBuild && buildCheck.insufficientParts && (
                  <div className="mt-3">
                    <p className="text-red-700 text-sm mb-2">Insufficient stock for:</p>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="text-sm text-red-600 space-y-1">
                        {buildCheck.insufficientParts.map((part, index) => (
                          <li key={index} className="flex justify-between items-center py-1 px-2 bg-red-100 rounded">
                            <span>• {part.part_name}</span>
                            <span className="text-xs">Need {part.required}, Have {part.available} (Short: {part.shortage})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {canBuild && assembly.bom_items && (
                  <div className="mt-3">
                    <p className="text-green-700 text-sm mb-2">Parts that will be consumed:</p>
                    <div className="max-h-60 overflow-y-auto">
                      <ul className="text-sm text-green-600 space-y-1">
                        {assembly.bom_items.map((item, index) => {
                          const partName = typeof item.part_id === 'object' 
                            ? item.part_id.name 
                            : parts.find(part => part._id === item.part_id)?.name || 'Unknown';
                          const partUnit = typeof item.part_id === 'object' 
                            ? item.part_id.unit 
                            : parts.find(part => part._id === item.part_id)?.unit || 'pcs';
                          const partStock = typeof item.part_id === 'object' 
                            ? item.part_id.quantity_in_stock 
                            : parts.find(part => part._id === item.part_id)?.quantity_in_stock || 0;
                          const consumeQty = item.quantity_required * quantity;
                          const remainingStock = partStock - consumeQty;
                            
                          return (
                            <li key={index} className="flex justify-between items-center py-2 px-3 bg-green-100 rounded">
                              <div>
                                <span className="font-medium">{partName}</span>
                                <span className="text-xs text-green-600 block">
                                  Will consume: {consumeQty} {partUnit}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs">
                                  Stock: {partStock} → {remainingStock} {partUnit}
                                </span>
                                {remainingStock <= 0 && (
                                  <span className="block text-xs text-orange-600 font-medium">
                                    ⚠️ Will deplete stock
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BOM Items Summary Table */}
            {assembly?.bom_items && assembly.bom_items.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">BOM Items Summary</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assembly.bom_items.map((item, index) => {
                        const partName = typeof item.part_id === 'object' 
                          ? item.part_id.name 
                          : parts.find(part => part._id === item.part_id)?.name || 'Unknown';
                        const partUnit = typeof item.part_id === 'object' 
                          ? item.part_id.unit 
                          : parts.find(part => part._id === item.part_id)?.unit || 'pcs';
                        const partStock = typeof item.part_id === 'object' 
                          ? item.part_id.quantity_in_stock 
                          : parts.find(part => part._id === item.part_id)?.quantity_in_stock || 0;
                        const required = item.quantity_required * quantity;
                        const canBuildItem = partStock >= required;

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{partName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{required} {partUnit}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{partStock} {partUnit}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                canBuildItem 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {canBuildItem ? 'Available' : `Short ${required - partStock}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canBuild}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canBuild ? 'Build Assembly' : 'Cannot Build'}
            </button>
          </div>
        </div>
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
    customer_info: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        quantity: 1,
        shipping_details: '',
        tracking_number: '',
        customer_info: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    if (formData.quantity > (assembly?.ready_built || 0)) {
      newErrors.quantity = `Cannot ship more than available (${assembly?.ready_built || 0})`;
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
      console.log('Submitting ship data:', formData);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error shipping assembly:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to ship assembly' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Ship Assembly</h2>
        <div className="mb-4">
          <p className="text-gray-600">Assembly: <span className="font-semibold">{assembly?.name}</span></p>
          <p className="text-gray-600">Assembly ID: <span className="font-semibold">{assembly?.assembly_id}</span></p>
          <p className="text-gray-600">Available: <span className="font-semibold text-green-600">{assembly?.ready_built || 0}</span></p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Ship *</label>
            <input
              type="number"
              min="1"
              max={assembly?.ready_built || 0}
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Information</label>
            <textarea
              value={formData.customer_info}
              onChange={(e) => setFormData({...formData, customer_info: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="2"
              placeholder="Customer name, address, contact details, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
            <input
              type="text"
              value={formData.tracking_number}
              onChange={(e) => setFormData({...formData, tracking_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Shipping tracking number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Details</label>
            <textarea
              value={formData.shipping_details}
              onChange={(e) => setFormData({...formData, shipping_details: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Shipping method, carrier, special instructions, delivery date, etc."
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
              disabled={loading || (assembly?.ready_built || 0) === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Shipping...' : 'Ship Assembly'}
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
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Dismantle Assembly</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="mt-2">
            <p className="text-gray-600">Assembly: <span className="font-semibold">{assembly?.name}</span></p>
            <p className="text-gray-600">Available: <span className="font-semibold text-green-600">{assembly?.ready_built || 0}</span></p>
            <p className="text-sm text-yellow-600 mt-2">
              ⚠️ Dismantling will restore all parts to inventory according to the BOM
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Dismantle *</label>
              <input
                type="number"
                min="1"
                max={assembly?.ready_built || 0}
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Dismantling *</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows="3"
                placeholder="e.g., Defective units, Design change, Quality issues, etc."
                required
              />
            </div>

            {assembly?.bom_items && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Parts that will be restored:</h4>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {assembly.bom_items.map((item, index) => {
                      const partName = typeof item.part_id === 'object' ? item.part_id.name : 'Unknown';
                      const partUnit = typeof item.part_id === 'object' ? item.part_id.unit : 'pcs';
                      const restoreQty = item.quantity_required * formData.quantity;
                      const currentStock = typeof item.part_id === 'object' ? item.part_id.quantity_in_stock : 0;
                      const newStock = currentStock + restoreQty;
                      
                      return (
                        <div key={index} className="flex justify-between items-center py-2 px-3 bg-blue-100 rounded">
                          <div>
                            <span className="font-medium text-blue-900">{partName}</span>
                            <div className="text-xs text-blue-700">
                              Will restore: {restoreQty} {partUnit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-blue-700">
                              Stock: {currentStock} → {newStock} {partUnit}
                            </div>
                            {newStock > (item.part_id?.min_stock_level || 0) && (
                              <div className="text-xs text-green-600 font-medium">
                                ✓ Above min level
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Impact Summary */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">Dismantle Impact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-orange-700">Units to Dismantle:</span>
                  <span className="ml-2 font-medium">{formData.quantity}</span>
                </div>
                <div>
                  <span className="text-orange-700">Parts to Restore:</span>
                  <span className="ml-2 font-medium">{assembly?.bom_items?.length || 0} types</span>
                </div>
                <div>
                  <span className="text-orange-700">After Dismantle:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {(assembly?.ready_built || 0) - formData.quantity} ready
                  </span>
                </div>
              </div>
            </div>

            {/* BOM Items Details Table */}
            {assembly?.bom_items && assembly.bom_items.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Detailed Parts Restoration</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Per Unit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Restore</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock Impact</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assembly.bom_items.map((item, index) => {
                        const partName = typeof item.part_id === 'object' ? item.part_id.name : 'Unknown';
                        const partUnit = typeof item.part_id === 'object' ? item.part_id.unit : 'pcs';
                        const currentStock = typeof item.part_id === 'object' ? item.part_id.quantity_in_stock : 0;
                        const restoreQty = item.quantity_required * formData.quantity;
                        const newStock = currentStock + restoreQty;

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{partName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.quantity_required} {partUnit}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium text-green-600">
                              +{restoreQty} {partUnit}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {currentStock} → {newStock} {partUnit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Dismantling...' : 'Dismantle Assembly'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// View Assembly Modal Component  
const ViewAssemblyModal = ({ isOpen, onClose, assembly, onEdit }) => {
  if (!isOpen || !assembly) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Assembly Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assembly ID</label>
              <p className="mt-1 text-sm text-gray-900">{assembly.assembly_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{assembly.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <p className="mt-1 text-sm text-gray-900">{assembly.category}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                assembly.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {assembly.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-sm text-gray-900">{assembly.description || 'No description'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ready Built</label>
              <p className="mt-1 text-2xl font-bold text-green-600">{assembly.ready_built || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Shipped</label>
              <p className="mt-1 text-2xl font-bold text-purple-600">{assembly.total_shipped || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Dismantled</label>
              <p className="mt-1 text-2xl font-bold text-orange-600">{assembly.total_dismantled || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Built</label>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {(assembly.ready_built || 0) + (assembly.total_shipped || 0)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <p className="mt-1 text-sm text-gray-900">{assembly.notes || 'No notes'}</p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Edit Assembly
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const resetForm = () => {
    setFormData({
      assembly_id: '',
      name: '',
      description: '',
      category: '',
      is_active: true,
      notes: ''
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setErrors({ name: 'Assembly name is required' });
      return;
    }
    
    setLoading(true);
    try {
      // If assembly_id is empty, let the backend generate it
      const submitData = { ...formData };
      if (!submitData.assembly_id.trim()) {
        delete submitData.assembly_id;
      }
      await onSubmit(submitData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating assembly:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to create assembly' 
      });
    } finally {
      setLoading(false);
    }
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
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter assembly name"
              required
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Describe what this assembly is for"
            />
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
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
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
    assembly_id: assembly?.assembly_id || '',
    name: assembly?.name || '',
    description: assembly?.description || '',
    category: assembly?.category || '',
    is_active: assembly?.is_active !== undefined ? assembly.is_active : true,
    notes: assembly?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    setErrors({});
  }, [assembly]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setErrors({ name: 'Assembly name is required' });
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error updating assembly:', error);
      setErrors({ 
        general: error.response?.data?.error || 'Failed to update assembly' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Assembly</h2>
        
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assembly ID</label>
            <input
              type="text"
              value={formData.assembly_id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
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
              style={{ maxHeight: '200px', overflowY: 'auto' }}
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
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Assembly'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Assembly;
