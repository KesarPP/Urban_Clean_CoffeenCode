import { useState, useEffect } from 'react';
import { MessageCircle, Phone, X, CheckCircle, Clock, AlertCircle, MapPin } from 'lucide-react';

/**
 * WhatsAppIntegration Component
 * Displays WhatsApp bot info and shows WhatsApp complaints
 */
export default function WhatsAppIntegration() {
  const [showModal, setShowModal] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  // Status color mapping
  const statusColors = {
    'Pending': 'bg-yellow-50 border-yellow-300 text-yellow-700',
    'In Progress': 'bg-blue-50 border-blue-300 text-blue-700',
    'Resolved': 'bg-green-50 border-green-300 text-green-700',
    'Rejected': 'bg-red-50 border-red-300 text-red-700'
  };

  const statusIcons = {
    'Pending': <Clock className="w-4 h-4" />,
    'In Progress': <AlertCircle className="w-4 h-4" />,
    'Resolved': <CheckCircle className="w-4 h-4" />,
    'Rejected': <X className="w-4 h-4" />
  };

  // Fetch complaints from WhatsApp bot
  const fetchComplaints = async () => {
    if (!userPhone) {
      alert('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/whatsapp-complaints?phone=${encodeURIComponent(userPhone)}`
      );
      const data = await response.json();
      
      if (data.success) {
        setComplaints(data.complaints);
      } else {
        alert('Error fetching complaints: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      alert('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  // Upvote a complaint
  const handleUpvote = async (complaintId) => {
    try {
      const response = await fetch(
        `/whatsapp-complaints/${complaintId}/upvote`,
        { method: 'POST' }
      );
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setComplaints(complaints.map(c => 
          c.id === complaintId 
            ? { ...c, upvotes: data.new_upvote_count }
            : c
        ));
      }
    } catch (error) {
      console.error('Error upvoting complaint:', error);
    }
  };

  // Format distance
  const formatDistance = (coords) => {
    if (!coords || !coords.lat || !coords.lng) return 'Unknown';
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp Bot Info Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-400 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-8 h-8 text-green-600" />
              <h3 className="text-xl font-bold text-green-700">SmartChat WhatsApp Bot</h3>
              <span className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                24/7 Active
              </span>
            </div>
            
            <p className="text-green-600 mb-4">
              Report issues, check status, and discover nearby problems directly through WhatsApp!
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-lg">📝</span>
                <span><strong>Report Issues</strong> - With photo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-lg">🔍</span>
                <span><strong>Track Status</strong> - Real-time updates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-lg">📍</span>
                <span><strong>Nearby Issues</strong> - Location-based</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://wa.me/14155238886?text=Hello%20Urban%20Clean%20Bot" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <MessageCircle className="w-5 h-5" />
                Open WhatsApp
              </a>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-white text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition font-semibold"
              >
                View My Complaints
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Complaints Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">My WhatsApp Complaints</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Phone Input */}
            <div className="mb-4 flex gap-2">
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="Enter your phone number (e.g., +1234567890)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={fetchComplaints}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>

            {/* Complaints List */}
            <div className="space-y-3">
              {complaints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No complaints found.</p>
                  <p className="text-sm mt-2">Start a conversation with our WhatsApp bot to report issues!</p>
                </div>
              ) : (
                complaints.map((complaint) => (
                  <div 
                    key={complaint.id} 
                    className={`border rounded-lg p-4 ${statusColors[complaint.status] || 'bg-gray-50 border-gray-300'}`}
                  >
                    {/* Header with Status */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{complaint.issue_type?.split(' ')[0]}</span>
                        <div>
                          <p className="font-semibold text-sm">{complaint.issue_type}</p>
                          <p className="text-xs opacity-75">
                            ID: {complaint.id?.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-white rounded text-xs font-semibold">
                        {statusIcons[complaint.status]}
                        {complaint.status}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm mb-2">{complaint.description}</p>

                    {/* Details */}
                    <div className="grid grid-cols-2 text-xs gap-2 mb-3">
                      <div>
                        <span className="opacity-75">Location:</span>
                        <p className="font-mono">{formatDistance(complaint.location_coords)}</p>
                      </div>
                      <div>
                        <span className="opacity-75">Reported:</span>
                        <p>{formatDate(complaint.created_at)}</p>
                      </div>
                    </div>

                    {/* Upvote Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-current border-opacity-20">
                      <button
                        onClick={() => handleUpvote(complaint.id)}
                        className="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-100 rounded text-sm font-semibold transition"
                      >
                        👍 {complaint.upvotes || 0}
                      </button>
                      {complaint.photo_url && (
                        <a 
                          href={complaint.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs underline opacity-75 hover:opacity-100"
                        >
                          View Photo →
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
