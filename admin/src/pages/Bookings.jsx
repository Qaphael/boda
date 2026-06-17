import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    loadBookings();
  }, [statusFilter, typeFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await adminAPI.getBookings(params);
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookingDetails = async (id) => {
    try {
      const { data } = await adminAPI.getBookingDetails(id);
      setSelectedBooking(data);
    } catch (err) {
      console.error('Failed to load booking details:', err);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bookings</h1>
      <div className="flex space-x-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">All Types</option>
          <option value="ride">Ride</option>
          <option value="delivery">Delivery</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fare</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${booking.type === 'ride' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {booking.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[booking.status] || 'bg-gray-100'}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">UGX {(booking.fare_final || booking.fare_estimate || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{booking.customer_phone || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{booking.rider_name || 'Unassigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(booking.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => loadBookingDetails(booking.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Booking Details</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Booking ID</p>
                <p className="font-medium text-xs">{selectedBooking.booking?.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{selectedBooking.booking?.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs ${statusColors[selectedBooking.booking?.status] || ''}`}>
                  {selectedBooking.booking?.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fare</p>
                <p className="font-medium">UGX {(selectedBooking.booking?.fare_final || selectedBooking.booking?.fare_estimate || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pickup</p>
                <p className="font-medium">{selectedBooking.booking?.pickup_address || `${selectedBooking.booking?.pickup_lat}, ${selectedBooking.booking?.pickup_lng}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dropoff</p>
                <p className="font-medium">{selectedBooking.booking?.dropoff_address || `${selectedBooking.booking?.dropoff_lat}, ${selectedBooking.booking?.dropoff_lng}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedBooking.booking?.customer_phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Rider</p>
                <p className="font-medium">{selectedBooking.booking?.rider_name || 'Unassigned'}</p>
              </div>
            </div>
            {selectedBooking.payments?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-2">Payment</h3>
                {selectedBooking.payments.map((p) => (
                  <div key={p.id} className="bg-gray-50 p-3 rounded">
                    <p>Status: <span className="font-medium">{p.status}</span></p>
                    <p>Method: {p.method || 'N/A'}</p>
                    <p>Amount: UGX {p.amount?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectedBooking(null)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
