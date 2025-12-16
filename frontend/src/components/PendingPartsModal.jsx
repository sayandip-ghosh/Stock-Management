import React, { useState, useEffect } from 'react';
import { pendingPartsAPI } from '../services/api';

const PendingPartsModal = ({ isOpen, onClose, onReviewComplete }) => {
  const [pendingParts, setPendingParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [selectedPart, setSelectedPart] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    action: '',
    inspector_name: '',
    passed_quantity: 0,
    rejected_quantity: 0,
    rejection_reason: '',
    inspection_notes: ''
  });
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPendingParts();
      fetchStats();
    }
  }, [isOpen]);

  const fetchPendingParts = async () => {
    try {
      setLoading(true);
      const response = await pendingPartsAPI.getAll({ status: 'pending_review' });
      setPendingParts(response.data.pendingParts || []);
    } catch (error) {
      console.error('Error fetching pending parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await pendingPartsAPI.getStats();
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching pending parts stats:', error);
    }
  };

  const handleSelectPart = (part) => {
    setSelectedPart(part);
    setReviewForm({
      action: '',
      inspector_name: '',
      passed_quantity: part.quantity_created,
      rejected_quantity: 0,
      rejection_reason: '',
      inspection_notes: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = type === 'number' ? parseFloat(value) || 0 : value;
    
    setReviewForm(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // Auto-adjust quantities when action changes
      if (name === 'action') {
        if (value === 'accept') {
          updated.passed_quantity = selectedPart?.quantity_created || 0;
          updated.rejected_quantity = 0;
        } else if (value === 'reject') {
          updated.passed_quantity = 0;
          updated.rejected_quantity = selectedPart?.quantity_created || 0;
        }
      }
      
      // Ensure quantities don't exceed total
      if (name === 'passed_quantity' || name === 'rejected_quantity') {
        const total = selectedPart?.quantity_created || 0;
        const passed = name === 'passed_quantity' ? newValue : updated.passed_quantity;
        const rejected = name === 'rejected_quantity' ? newValue : updated.rejected_quantity;
        
        if (passed + rejected > total) {
          if (name === 'passed_quantity') {
            updated.rejected_quantity = total - passed;
          } else {
            updated.passed_quantity = total - rejected;
          }
        }
      }
      
      return updated;
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedPart || !reviewForm.action) return;
    
    try {
      setReviewLoading(true);
      
      const reviewData = {
        action: reviewForm.action,
        inspector_name: reviewForm.inspector_name || 'Quality Control',
        passed_quantity: reviewForm.passed_quantity,
        rejected_quantity: reviewForm.rejected_quantity,
        rejection_reason: reviewForm.rejection_reason,
        inspection_notes: reviewForm.inspection_notes
      };
      
      const response = await pendingPartsAPI.review(selectedPart._id, reviewData);
      
      alert(response.data.message);
      
      // Refresh data
      await fetchPendingParts();
      await fetchStats();
      
      // Reset form
      setSelectedPart(null);
      setReviewForm({
        action: '',
        inspector_name: '',
        passed_quantity: 0,
        rejected_quantity: 0,
        rejection_reason: '',
        inspection_notes: ''
      });
      
      // Notify parent component
      if (onReviewComplete) {
        onReviewComplete();
      }
      
    } catch (error) {
      console.error('Error reviewing part:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to review part. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setReviewLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Quality Control - Pending Parts Review</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-800">{stats.totalPending || 0}</div>
              <div className="text-sm text-yellow-600">Pending Review</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-800">{stats.totalAccepted || 0}</div>
              <div className="text-sm text-green-600">Accepted</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-800">{stats.totalRejected || 0}</div>
              <div className="text-sm text-red-600">Rejected</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-800">{stats.acceptanceRate?.toFixed(1) || 0}%</div>
              <div className="text-sm text-blue-600">Acceptance Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Parts List */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Parts Awaiting Review</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading pending parts...</p>
                </div>
              ) : pendingParts.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {pendingParts.map((part) => (
                    <div
                      key={part._id}
                      onClick={() => handleSelectPart(part)}
                      className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        selectedPart?._id === part._id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-yellow-600">⚡</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{part.part_name}</div>
                            <div className="text-xs text-gray-500">{part.part_part_id}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{part.quantity_created} pcs</div>
                          <div className="text-xs text-gray-500">{part.part_type}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Production: {new Date(part.production_date).toLocaleDateString()}</span>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {part.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600">
                        Raw materials: {part.raw_items_used?.length || 0} items • 
                        Cost: ${part.total_manufacturing_cost?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-lg font-medium mb-2">No pending parts</p>
                  <p className="text-sm">All parts have been reviewed</p>
                </div>
              )}
            </div>

            {/* Review Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Quality Control Review</h3>
              
              {selectedPart ? (
                <div className="space-y-4">
                  {/* Part Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Part Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Name:</span> {selectedPart.part_name}</div>
                      <div><span className="text-gray-500">Part ID:</span> {selectedPart.part_part_id}</div>
                      <div><span className="text-gray-500">Type:</span> {selectedPart.part_type}</div>
                      <div><span className="text-gray-500">Quantity:</span> {selectedPart.quantity_created} pcs</div>
                      <div><span className="text-gray-500">Vendor:</span> {selectedPart.vendor_type}</div>
                      <div><span className="text-gray-500">Cost:</span> ${selectedPart.total_manufacturing_cost?.toFixed(2) || '0.00'}</div>
                    </div>
                  </div>

                  {/* Raw Materials Used */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Raw Materials Consumed</h4>
                    <div className="space-y-1">
                      {selectedPart.raw_items_used?.map((item, index) => (
                        <div key={index} className="flex justify-between text-xs text-blue-800">
                          <span>{item.raw_item_name}</span>
                          <span>{item.total_quantity_used} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review Action */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Decision *</label>
                    <select
                      name="action"
                      value={reviewForm.action}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select review decision</option>
                      <option value="accept">Accept (Full or Partial)</option>
                      <option value="reject">Reject All</option>
                    </select>
                  </div>

                  {/* Inspector Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inspector Name</label>
                    <input
                      type="text"
                      name="inspector_name"
                      value={reviewForm.inspector_name}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Quality Control"
                    />
                  </div>

                  {/* Quantities */}
                  {reviewForm.action === 'accept' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">Passed Quantity</label>
                        <input
                          type="number"
                          name="passed_quantity"
                          value={reviewForm.passed_quantity}
                          onChange={handleFormChange}
                          min="0"
                          max={selectedPart.quantity_created}
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-red-700 mb-2">Rejected Quantity</label>
                        <input
                          type="number"
                          name="rejected_quantity"
                          value={reviewForm.rejected_quantity}
                          onChange={handleFormChange}
                          min="0"
                          max={selectedPart.quantity_created}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {(reviewForm.action === 'reject' || reviewForm.rejected_quantity > 0) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason</label>
                      <input
                        type="text"
                        name="rejection_reason"
                        value={reviewForm.rejection_reason}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Quality defect, dimensional issues, etc."
                      />
                    </div>
                  )}

                  {/* Inspection Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Notes</label>
                    <textarea
                      name="inspection_notes"
                      value={reviewForm.inspection_notes}
                      onChange={handleFormChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Additional notes about the inspection..."
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={!reviewForm.action || reviewLoading}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewLoading ? 'Processing Review...' : `Submit ${reviewForm.action === 'accept' ? 'Acceptance' : 'Rejection'}`}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">👈</div>
                  <p className="text-lg font-medium mb-2">Select a part to review</p>
                  <p className="text-sm">Choose a pending part from the list to start quality control review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingPartsModal;
