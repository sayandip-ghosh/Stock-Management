import React, { useState, useEffect } from 'react';
import { partsAPI } from '../services/api';

const PurchaseOrderModal = ({ isOpen, onClose, onSave, purchaseOrder = null }) => {
  const [formData, setFormData] = useState({
    // Basic order info
    supplier_name: '',
    supplier_contact: '',
    supplier_email: '',
    supplier_address: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'pending',
    notes: '',
    items: [],
    
    // Additional fields for comprehensive document
    order_number: '',
    subject: '',
    product_type: '',
    attention_person: '',
    
    // Company details
    company: {
      name: 'TRANSELECTRICALS',
      logoText: 'LOGO',
      rightLogo: 'LOGO',
      address: 'HO: 56E, HemantaBasuSarani, StephenHouse, 4th Floor Room No.56BKolkata-700001.',
      worksAddress: '300RaibahadurRoad,Kolkata-700053',
      mobile: '9433758747/8336913004',
      email: 'transkolkata29@gmail.com',
      gst: '19AABFT5467H1ZU',
      certification: 'QurstvereconCerns: AllEasternRegionalCountryCertificateIsObtained(OREApproved)',
      metro: 'MetroaAuthorityCertificate(ForLineinSpecimenmetroORSFBSO)'
    },
    
    // Terms and conditions
    payment_terms: 'As Usual',
    tax_terms: 'GST@extra 18%',
    delivery_terms: '',
    freight_terms: 'Shall be extra at actual. Transportation shall be arranged by us.',
    transportation_terms: 'The items shall be dispatched with the following way.',
    
    // Address details
    billing_address: 'ROOMO56B,4THFLOOR',
    billing_address2: '56E,HEMANTABASUSARANI',
    billing_city: 'STEPHENHOUSE,KOLKATA-700001',
    delivery_address: '300,RoyBahadurRoad',
    delivery_city: 'Behala,Kolkata-700053',
    delivery_contact: 'Mr.TilakDhar8336069723',
    
    // Signature details
    signature_designation: 'ForTranselectricals',
    signature_name: 'S.BOSE',
    signature_id: '9831158888'
  });
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Add search state for part selection
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [isPartDropdownOpen, setIsPartDropdownOpen] = useState(false);
  const [selectedPartName, setSelectedPartName] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  
  // Tab management for better organization
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (isOpen) {
      fetchParts();
      // Reset form for new purchase orders or populate for editing
      if (purchaseOrder) {
        setFormData({
          // Basic order info
          supplier_name: purchaseOrder.supplier_name || '',
          supplier_contact: purchaseOrder.supplier_contact || '',
          supplier_email: purchaseOrder.supplier_email || '',
          supplier_address: purchaseOrder.supplier_address || '',
          order_date: purchaseOrder.order_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          expected_delivery_date: purchaseOrder.expected_delivery_date?.split('T')[0] || '',
          status: purchaseOrder.status || 'pending',
          notes: purchaseOrder.notes || '',
          items: purchaseOrder.items || [],
          
          // Additional fields
          order_number: purchaseOrder.order_number || '',
          subject: purchaseOrder.subject || '',
          product_type: purchaseOrder.product_type || '',
          attention_person: purchaseOrder.attention_person || '',
          
          // Company details
          company: {
            name: purchaseOrder.company?.name || 'TRANSELECTRICALS',
            logoText: purchaseOrder.company?.logoText || 'LOGO',
            rightLogo: purchaseOrder.company?.rightLogo || 'LOGO',
            address: purchaseOrder.company?.address || 'HO: 56E, HemantaBasuSarani, StephenHouse, 4th Floor Room No.56BKolkata-700001.',
            worksAddress: purchaseOrder.company?.worksAddress || '300RaibahadurRoad,Kolkata-700053',
            mobile: purchaseOrder.company?.mobile || '9433758747/8336913004',
            email: purchaseOrder.company?.email || 'transkolkata29@gmail.com',
            gst: purchaseOrder.company?.gst || '19AABFT5467H1ZU',
            certification: purchaseOrder.company?.certification || 'QurstvereconCerns: AllEasternRegionalCountryCertificateIsObtained(OREApproved)',
            metro: purchaseOrder.company?.metro || 'MetroaAuthorityCertificate(ForLineinSpecimenmetroORSFBSO)'
          },
          
          // Terms and conditions
          payment_terms: purchaseOrder.payment_terms || 'As Usual',
          tax_terms: purchaseOrder.tax_terms || 'GST@extra 18%',
          delivery_terms: purchaseOrder.delivery_terms || '',
          freight_terms: purchaseOrder.freight_terms || 'Shall be extra at actual. Transportation shall be arranged by us.',
          transportation_terms: purchaseOrder.transportation_terms || 'The items shall be dispatched with the following way.',
          
          // Address details
          billing_address: purchaseOrder.billing_address || 'ROOMO56B,4THFLOOR',
          billing_address2: purchaseOrder.billing_address2 || '56E,HEMANTABASUSARANI',
          billing_city: purchaseOrder.billing_city || 'STEPHENHOUSE,KOLKATA-700001',
          delivery_address: purchaseOrder.delivery_address || '300,RoyBahadurRoad',
          delivery_city: purchaseOrder.delivery_city || 'Behala,Kolkata-700053',
          delivery_contact: purchaseOrder.delivery_contact || 'Mr.TilakDhar8336069723',
          
          // Signature details
          signature_designation: purchaseOrder.signature_designation || 'ForTranselectricals',
          signature_name: purchaseOrder.signature_name || 'S.BOSE',
          signature_id: purchaseOrder.signature_id || '9831158888'
        });
      } else {
        resetForm();
      }
    } else {
      // Reset form when modal is closed and it's not an edit operation
      if (!purchaseOrder) {
        resetForm();
      }
    }
  }, [isOpen, purchaseOrder]);

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll({ limit: 1000 });
      setParts(response.data.parts || []);
      console.log('Fetched parts for PO modal:', response.data.parts?.length);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  // Filter parts based on search term
  const filteredParts = parts.filter(part => 
    part.name?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.part_id?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.type?.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(partSearchTerm.toLowerCase())
  );

  const handlePartSelect = (part) => {
    const newItem = {
      part_id: part._id,
      part_name: part.name,
      part_number: part.part_id,
      unit: part.unit,
      part_weight: part.weight || 0,
      quantity_ordered: 1,
      cost_unit_type: 'piece',
      cost_per_unit_input: part.cost_per_unit || 0,
      unit_cost: part.cost_per_unit || 0,
      total_cost: part.cost_per_unit || 0,
      notes: '',
      
      // Additional fields for document
      description: `${part.name} - ${part.type || 'Standard specifications'}`,
      specifications: 'As per IS specifications',
      additional_specs: '(these tubes shall be tempered properly.)',
      remarks: `IS:191/80Gr.ETP with 99.90% Minimum copper to be maintained strictly. Any deviation in chemical quality shall lead to rejection of materials.`
    };
    
    // Check if part already exists in items
    const existingItemIndex = formData.items.findIndex(item => item.part_id === part._id);
    if (existingItemIndex >= 0) {
      alert('This part is already added to the purchase order');
      resetPartSelection();
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    resetPartSelection();
  };

  const handlePartSearchChange = (e) => {
    const value = e.target.value;
    setPartSearchTerm(value);
    setIsPartDropdownOpen(value.length > 0);
    
    // Clear selection if search is cleared
    if (value === '') {
      setSelectedPartName('');
    }
  };

  const resetForm = () => {
    setFormData({
      // Basic order info
      supplier_name: '',
      supplier_contact: '',
      supplier_email: '',
      supplier_address: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      status: 'pending',
      notes: '',
      items: [],
      
      // Additional fields
      order_number: '',
      subject: '',
      product_type: '',
      attention_person: '',
      
      // Company details
      company: {
        name: 'TRANSELECTRICALS',
        logoText: 'LOGO',
        rightLogo: 'LOGO',
        address: 'HO: 56E, Hemanta Basu Sarani, Stephen House, 4th Floor Room No.56B Kolkata-700001.',
        worksAddress: '300, Rai Bahadur Road, Kolkata-700053',
        mobile: '9433758747/8336913004',
        email: 'transkolkata29@gmail.com',
        gst: '19AABFT5467H1ZU',
        certification: 'Our sister concerns: A) Eastern Regional Foundry (for OHE fitting CORE Approved).',
        metro: 'B) Lawrence Enterprises (For G.I and S.S fasteners non CORE/RDSO)'
      },
      
      // Terms and conditions
      payment_terms: 'As Usual',
      tax_terms: 'GST@extra 18%',
      delivery_terms: '',
      freight_terms: 'Shall be extra at actual. Transportation shall be arranged by us.',
      transportation_terms: 'The items shall be dispatched with the following way.',
      
      // Address details
      billing_address: 'ROOMO56B,4THFLOOR',
      billing_address2: '56E,HEMANTABASUSARANI',
      billing_city: 'STEPHENHOUSE,KOLKATA-700001',
      delivery_address: '300,RoyBahadurRoad',
      delivery_city: 'Behala,Kolkata-700053',
      delivery_contact: 'Mr.TilakDhar8336069723',
      
      // Signature details
      signature_designation: 'For Transelectricals',
      signature_name: 'S.BOSE',
      signature_id: '9831158888'
    });
    setErrors({});
    resetPartSelection();
  };

  const resetPartSelection = () => {
    setSelectedPartName('');
    setPartSearchTerm('');
    setIsPartDropdownOpen(false);
  };

  const addItem = () => {
    // This function is now replaced by handlePartSelect
    // But we'll keep it for backward compatibility
    const newItem = {
      part_id: '',
      part_name: '',
      part_number: '',
      unit: 'pcs',
      part_weight: 0,
      quantity_ordered: 1,
      cost_unit_type: 'piece',
      cost_per_unit_input: 0,
      unit_cost: 0,
      total_cost: 0,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    const items = [...formData.items];
    items[index][field] = value;
    
    // Handle cost conversion when unit type or input cost changes
    if (field === 'cost_unit_type' || field === 'cost_per_unit_input') {
      const item = items[index];
      
      if (item.cost_unit_type === 'kg' && item.part_weight > 0) {
        // Convert cost per kg to cost per piece
        item.unit_cost = (item.cost_per_unit_input || 0) * item.part_weight;
      } else {
        // Use the input value directly for 'piece' unit type
        item.unit_cost = item.cost_per_unit_input || 0;
      }
      
      // Recalculate total cost
      item.total_cost = (item.quantity_ordered || 0) * (item.unit_cost || 0);
    }
    
    // Recalculate total cost when quantity changes
    if (field === 'quantity_ordered') {
      items[index].total_cost = (items[index].quantity_ordered || 0) * (items[index].unit_cost || 0);
    }
    
    setFormData(prev => ({ ...prev, items }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required';
    }
    
    if (!formData.order_date) {
      newErrors.order_date = 'Order date is required';
    }
    
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    formData.items.forEach((item, index) => {
      if (!item.part_id) {
        newErrors[`item_${index}_part`] = 'Part selection is required';
      }
      if (item.quantity_ordered <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if ((item.cost_per_unit_input || 0) < 0) {
        newErrors[`item_${index}_cost`] = 'Cost input cannot be negative';
      }
      if (!(item.cost_per_unit_input > 0)) {
        newErrors[`item_${index}_cost_required`] = 'Cost input is required';
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
      // Ensure proper data format for backend
      const submitData = {
        supplier_name: formData.supplier_name.trim(),
        supplier_contact: formData.supplier_contact?.trim() || '',
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || undefined,
        notes: formData.notes?.trim() || '',
        items: formData.items.map(item => ({
          part_id: item.part_id,
          part_name: item.part_name, // Include for document generation
          unit: item.unit, // Include for document generation
          quantity_ordered: parseFloat(item.quantity_ordered) || 0,
          cost_unit_type: item.cost_unit_type || 'piece',
          cost_per_unit_input: parseFloat(item.cost_per_unit_input) || 0,
          unit_cost: parseFloat(item.unit_cost) || 0,
          notes: item.notes?.trim() || ''
        })).filter(item => item.part_id && item.quantity_ordered > 0)
      };

      console.log('Submitting purchase order data:', JSON.stringify(submitData, null, 2));
      
      await onSave(submitData);
      
      // Reset form after successful creation (not for edits)
      if (!purchaseOrder) {
        resetForm();
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving purchase order:', error);
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
        // Show validation errors to user
        const validationErrors = {};
        error.response.data.errors.forEach(err => {
          validationErrors[err.path || err.param] = err.msg;
        });
        setErrors(validationErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'basic', name: 'Basic Info', icon: '📋' },
                { id: 'items', name: 'Items', icon: '📦' },
                { id: 'terms', name: 'Terms & Conditions', icon: '📄' },
                { id: 'addresses', name: 'Addresses', icon: '🏢' },
                { id: 'company', name: 'Company Details', icon: '🏪' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Purchase Order Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Order Number
                    </label>
                    <input
                      type="text"
                      value={formData.order_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., TE/PO/RIL/25-26/07/04/HO"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Date *
                    </label>
                    <input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Purchase order for Copper Tube as per IS: 191/80Gr.ETP with 99.90% Minimum copper"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Type
                    </label>
                    <input
                      type="text"
                      value={formData.product_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, product_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., copper tubes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.expected_delivery_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Supplier Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier Name *
                      </label>
                      <input
                        type="text"
                        value={formData.supplier_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          errors.supplier_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter supplier name"
                        required
                      />
                      {errors.supplier_name && <p className="text-red-500 text-sm mt-1">{errors.supplier_name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier Contact
                      </label>
                      <input
                        type="text"
                        value={formData.supplier_contact}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier Email
                      </label>
                      <input
                        type="email"
                        value={formData.supplier_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="supplier@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kind Attention Person
                      </label>
                      <input
                        type="text"
                        value={formData.attention_person}
                        onChange={(e) => setFormData(prev => ({ ...prev, attention_person: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Mr Sahil Sheikh"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier Address
                      </label>
                      <textarea
                        value={formData.supplier_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, supplier_address: e.target.value }))}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Complete supplier address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="space-y-6">
                {/* Add Parts Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add Parts</h3>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search and Select Part
                    </label>
                    
                    {/* Searchable Part Selector */}
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedPartName || partSearchTerm}
                        onChange={handlePartSearchChange}
                        onFocus={() => {
                          if (!selectedPartName) {
                            setIsPartDropdownOpen(true);
                          }
                        }}
                        placeholder="Search parts by name, ID, type, or category..."
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      
                      {/* Clear button */}
                      {(selectedPartName || partSearchTerm) && (
                        <button
                          type="button"
                          onClick={resetPartSelection}
                          className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                      
                      {/* Dropdown arrow */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPartName) {
                            resetPartSelection();
                          } else {
                            setIsPartDropdownOpen(!isPartDropdownOpen);
                            setPartSearchTerm('');
                          }
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown list */}
                      {isPartDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredParts.length > 0 ? (
                            <>
                              {filteredParts.map(part => (
                                <button
                                  key={part._id}
                                  type="button"
                                  onClick={() => handlePartSelect(part)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {part.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {part.part_id} | {part.type} | {part.category}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-medium ${
                                        part.quantity_in_stock <= 0 ? 'text-red-600' :
                                        part.quantity_in_stock <= (part.min_stock_level || 0) ? 'text-yellow-600' :
                                        'text-green-600'
                                      }`}>
                                        {part.quantity_in_stock} {part.unit}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        ₹{(part.cost_per_unit || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-center">
                              {partSearchTerm ? `No parts found matching "${partSearchTerm}"` : 'No parts available'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Type to search for parts or click the dropdown arrow to browse all parts
                    </p>
                  </div>
                </div>

                {/* Purchase Order Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Order Items ({formData.items.length})</h3>
                    <div className="text-sm text-gray-600">
                      Total Amount: <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {formData.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Input (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.part_name || 'Unknown Part'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {item.part_number} | {item.unit}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={item.quantity_ordered}
                                  onChange={(e) => updateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                                  min="0.01"
                                  step="0.01"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <select
                                  value={item.cost_unit_type || 'piece'}
                                  onChange={(e) => updateItem(index, 'cost_unit_type', e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                  <option value="piece">Piece</option>
                                  <option value="kg">Kg</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  value={item.cost_per_unit_input || ''}
                                  onChange={(e) => updateItem(index, 'cost_per_unit_input', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  placeholder={item.cost_unit_type === 'kg' ? '₹ Cost/kg' : '₹ Cost/piece'}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                ₹{(item.unit_cost || 0).toFixed(2)}
                                {item.cost_unit_type === 'kg' && item.part_weight > 0 && (
                                  <div className="text-xs text-gray-400">
                                    (₹{(item.cost_per_unit_input || 0).toFixed(2)}/kg × {item.part_weight}kg)
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₹{(item.total_cost || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="text"
                                  value={item.notes || ''}
                                  onChange={(e) => updateItem(index, 'notes', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  placeholder="Item remarks"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📦</div>
                      <div className="text-lg font-medium mb-1">No items added yet</div>
                      <div className="text-sm">Search and select parts above to add them to this purchase order</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms & Conditions Tab */}
            {activeTab === 'terms' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Terms and Conditions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., As Usual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Terms
                    </label>
                    <input
                      type="text"
                      value={formData.tax_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_terms: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., GST@extra 18%"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Terms
                    </label>
                    <textarea
                      value={formData.delivery_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_terms: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 100 nos of item no. 6 and 100 nos of Item no 7 positively within 16.07.2025 and balance all items within 24.07.2025"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Freight Terms
                    </label>
                    <textarea
                      value={formData.freight_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, freight_terms: e.target.value }))}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Shall be extra at actual. Transportation shall be arranged by us."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transportation Terms
                    </label>
                    <textarea
                      value={formData.transportation_terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, transportation_terms: e.target.value }))}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., The items shall be dispatched with the following way."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Additional notes for this purchase order"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Billing Address */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900 border-b pb-2">Billing Address</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={formData.billing_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., ROOMO56B,4THFLOOR"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={formData.billing_address2}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address2: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 56E,HEMANTABASUSARANI"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City & PIN
                      </label>
                      <input
                        type="text"
                        value={formData.billing_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., STEPHENHOUSE,KOLKATA-700001"
                      />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900 border-b pb-2">Delivery Address</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Address
                      </label>
                      <input
                        type="text"
                        value={formData.delivery_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 300,RoyBahadurRoad"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City & PIN
                      </label>
                      <input
                        type="text"
                        value={formData.delivery_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Behala,Kolkata-700053"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.delivery_contact}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_contact: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., Mr.TilakDhar8336069723"
                      />
                    </div>
                  </div>
                </div>

                {/* Signature Information */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Signature Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={formData.signature_designation}
                        onChange={(e) => setFormData(prev => ({ ...prev, signature_designation: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., ForTranselectricals"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Signatory Name
                      </label>
                      <input
                        type="text"
                        value={formData.signature_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, signature_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., S.BOSE"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact ID
                      </label>
                      <input
                        type="text"
                        value={formData.signature_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, signature_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g., 9831158888"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Details Tab */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company.name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, name: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={formData.company.gst}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, gst: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Head Office Address
                    </label>
                    <textarea
                      value={formData.company.address}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, address: e.target.value }
                      }))}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Works Address
                    </label>
                    <input
                      type="text"
                      value={formData.company.worksAddress}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, worksAddress: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={formData.company.mobile}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, mobile: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.company.email}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {formData.items.length > 0 && (
                <span>Total Items: {formData.items.length} | Total Amount: <span className="font-semibold">₹{totalAmount.toFixed(2)}</span></span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* Download Document Button */}
              {formData.items.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { generatePurchaseOrderDocument } = await import('../utils/purchaseOrderDocument');
                      await generatePurchaseOrderDocument(formData);
                    } catch (error) {
                      console.error('Error generating document:', error);
                      alert('Error generating document. Please try again.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Document</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  if (!purchaseOrder) {
                    resetForm();
                  }
                  onClose();
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || formData.items.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (purchaseOrder ? 'Update Order' : 'Create Order')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;
