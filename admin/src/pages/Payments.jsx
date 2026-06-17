import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminAPI.getPayments(params);
      setPayments(data.payments || []);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (paymentId) => {
    try {
      await adminAPI.releasePayment(paymentId);
      loadPayments();
    } catch (err) {
      alert('Failed to release payment');
    }
  };

  const handleFlag = async (paymentId) => {
    try {
      await adminAPI.flagPayment(paymentId, flagReason);
      setFlagReason('');
      setSelectedPayment(null);
      loadPayments();
    } catch (err) {
      alert('Failed to flag payment');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    held: 'bg-blue-100 text-blue-800',
    released: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
    flagged: 'bg-orange-100 text-orange-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Payments</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-2xl font-bold">UGX {(stats.total_amount || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Held</p>
            <p className="text-2xl font-bold text-blue-600">{stats.held_count}</p>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <p className="text-sm text-gray-500">Flagged</p>
            <p className="text-2xl font-bold text-orange-600">{stats.flagged_count}</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="held">Held</option>
          <option value="released">Released</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">UGX {payment.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${payment.method === 'mtn' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {payment.method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[payment.status] || ''}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{payment.booking_type || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(payment.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {(payment.status === 'held' || payment.status === 'flagged') && (
                      <button
                        onClick={() => handleRelease(payment.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Release
                      </button>
                    )}
                    {payment.status === 'held' && (
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-orange-600 hover:text-orange-900"
                      >
                        Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Flag Payment</h2>
            <p className="mb-4">Payment ID: {selectedPayment.id}</p>
            <p className="mb-4">Amount: UGX {selectedPayment.amount?.toLocaleString()}</p>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">Reason</label>
              <textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full border rounded-lg p-2"
                rows={3}
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => handleFlag(selectedPayment.id)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                Flag Payment
              </button>
              <button
                onClick={() => { setSelectedPayment(null); setFlagReason(''); }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
