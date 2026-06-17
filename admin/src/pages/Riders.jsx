import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Riders() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadRiders();
  }, [filter]);

  const loadRiders = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const { data } = await adminAPI.getPendingRiders();
        setRiders(data.riders || []);
      }
    } catch (err) {
      console.error('Failed to load riders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.verifyRider(riderId, 'verified');
      setRiders(riders.filter(r => r.id !== riderId));
      setSelectedRider(null);
    } catch (err) {
      alert('Failed to verify rider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.verifyRider(riderId, 'rejected', rejectReason);
      setRiders(riders.filter(r => r.id !== riderId));
      setSelectedRider(null);
      setRejectReason('');
    } catch (err) {
      alert('Failed to reject rider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.suspendRider(riderId, suspendReason);
      setRiders(riders.filter(r => r.id !== riderId));
      setSelectedRider(null);
      setSuspendReason('');
    } catch (err) {
      alert('Failed to suspend rider');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rider Management</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="pending">Pending Verification</option>
          <option value="all">All Riders</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : riders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No riders found</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">National ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {riders.map((rider) => (
                <tr key={rider.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rider.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rider.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rider.plate_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rider.national_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedRider(rider)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRider && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Review Rider: {selectedRider.name}</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedRider.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plate Number</p>
                <p className="font-medium">{selectedRider.plate_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">National ID</p>
                <p className="font-medium">{selectedRider.national_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Applied</p>
                <p className="font-medium">{new Date(selectedRider.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">ID Photo</p>
              {selectedRider.id_photo ? (
                <img src={selectedRider.id_photo} alt="ID" className="max-w-full h-48 object-contain border rounded" />
              ) : (
                <p className="text-gray-400">No photo uploaded</p>
              )}
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Selfie Photo</p>
              {selectedRider.selfie_photo ? (
                <img src={selectedRider.selfie_photo} alt="Selfie" className="max-w-full h-48 object-contain border rounded" />
              ) : (
                <p className="text-gray-400">No photo uploaded</p>
              )}
            </div>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => handleVerify(selectedRider.id)}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(selectedRider.id)}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => setSelectedRider(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Rejection Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded-lg p-2"
                rows={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
