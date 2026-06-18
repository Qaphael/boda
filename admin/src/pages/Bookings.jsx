import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const statusConfig = {
  pending: { label: 'Pending', class: 'bg-surface-container-highest text-on-surface-variant border border-outline-variant' },
  accepted: { label: 'Accepted', class: 'bg-primary-fixed text-on-primary-fixed' },
  in_progress: { label: 'Active', class: 'bg-primary-fixed text-on-primary-fixed' },
  completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', class: 'bg-error-container text-on-error-container' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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

  const handleExport = () => {
    const rows = [['ID', 'Type', 'Status', 'Fare', 'Customer', 'Rider', 'Created']];
    bookings.forEach(b => {
      rows.push([
        b.id?.slice(0, 8) || '',
        b.type || '',
        b.status || '',
        b.fare_final || b.fare_estimate || 0,
        b.customer_phone || 'N/A',
        b.rider_name || 'Unassigned',
        b.created_at ? new Date(b.created_at).toLocaleString() : '',
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boda-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking?.booking) return;
    if (!confirm('Cancel this booking?')) return;
    setActionLoading(true);
    try {
      await adminAPI.cancelBooking(selectedBooking.booking.id, 'Admin cancellation');
      setSelectedBooking(null);
      loadBookings();
    } catch (err) {
      alert('Failed to cancel booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleContactRider = () => {
    if (selectedBooking?.booking?.rider_phone) {
      setShowContactModal(true);
    } else {
      alert('No rider assigned to this booking');
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Table Section */}
      <section className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Filter Bar */}
        <div className="p-4 bg-surface border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-outline uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-outline-variant rounded px-2 py-1 text-body-md min-w-[140px] focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-outline uppercase tracking-wider">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-surface border border-outline-variant rounded px-2 py-1 text-body-md min-w-[120px] focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">All Types</option>
                <option value="ride">Ride</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1 bg-surface border border-outline-variant rounded hover:bg-surface-container transition-colors text-label-md">
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV
            </button>
            <button onClick={loadBookings} className="flex items-center gap-1 px-3 py-1 bg-surface border border-outline-variant rounded hover:bg-surface-container transition-colors text-label-md">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 text-on-surface-variant">Loading...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-surface-container-low z-10">
                <tr className="border-b border-outline-variant">
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">Booking ID</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">User</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">Rider</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">Fare</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-[11px] font-medium text-outline uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {bookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">No bookings found</td></tr>
                ) : (
                  bookings.map((booking) => {
                    const sc = statusConfig[booking.status] || statusConfig.pending;
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-surface-container-low cursor-pointer transition-colors"
                        onClick={() => loadBookingDetails(booking.id)}
                      >
                        <td className="px-4 py-3 font-mono text-primary font-bold text-body-md">{booking.id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3 text-body-md font-medium">{booking.customer_phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-body-md">{booking.rider_name || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-label-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px]">{booking.type === 'ride' ? 'motorcycle' : 'package_2'}</span>
                            {booking.type === 'ride' ? 'Ride' : 'Delivery'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-body-md font-medium text-on-surface">
                          UGX {(booking.fare_final || booking.fare_estimate || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${sc.class}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-body-sm text-outline">
                          {booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Detail Panel */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 lg:static lg:z-auto" onClick={() => setSelectedBooking(null)}>
          <div className="absolute inset-0 bg-black/40 lg:hidden"></div>
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[400px] lg:static border-l border-outline-variant bg-surface-container-low flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface shrink-0">
              <h2 className="text-headline-sm text-on-surface">Booking Details</h2>
              <button className="material-symbols-outlined text-outline hover:text-on-surface" onClick={() => setSelectedBooking(null)}>close</button>
            </div>
          <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-6">
            {/* Status Header */}
            <div className="flex items-center gap-3 p-3 bg-surface border border-outline-variant rounded">
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">route</span>
              </div>
              <div>
                <div className="text-[11px] text-outline uppercase">Tracking ID</div>
                <div className="font-mono text-body-lg font-bold">{selectedBooking.booking?.id?.slice(0, 8)}...</div>
              </div>
              <div className="ml-auto">
                <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase">
                  {selectedBooking.booking?.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Map Preview */}
            <div className="h-40 rounded bg-surface-container-highest border border-outline-variant relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              <div className="absolute bottom-2 left-2">
                <span className="bg-surface/90 text-[10px] px-2 py-0.5 rounded border border-outline-variant font-bold text-on-surface shadow-sm">MAP VIEW</span>
              </div>
            </div>

            {/* Pickup/Dropoff */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary-container/20"></div>
                  <div className="w-px flex-1 border-l-2 border-dotted border-outline-variant"></div>
                </div>
                <div className="pb-3">
                  <div className="text-[11px] text-outline uppercase">Pickup</div>
                  <div className="text-body-md text-on-surface">{selectedBooking.booking?.pickup_address || 'N/A'}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-tertiary ring-4 ring-tertiary-container/20"></div>
                </div>
                <div>
                  <div className="text-[11px] text-outline uppercase">Dropoff</div>
                  <div className="text-body-md text-on-surface">{selectedBooking.booking?.dropoff_address || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Rider Info */}
            {selectedBooking.booking?.rider_name && (
              <div className="space-y-3 pt-3 border-t border-outline-variant/30">
                <h3 className="text-[11px] text-outline uppercase tracking-wider font-medium">Assigned Rider</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-surface-container overflow-hidden border border-outline-variant flex items-center justify-center text-primary font-bold">
                    {selectedBooking.booking.rider_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-body-md font-bold text-on-surface">{selectedBooking.booking.rider_name}</div>
                    <div className="text-body-sm text-outline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">star</span> 4.9
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Info */}
            {selectedBooking.payments?.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-outline-variant/30">
                <h3 className="text-[11px] text-outline uppercase tracking-wider font-medium">Payment Details</h3>
                {selectedBooking.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-surface border border-outline-variant rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-[#fedc00] rounded-sm flex items-center justify-center font-black text-[10px] text-black italic">MTN</div>
                      <div>
                        <div className="text-label-md text-on-surface">Mobile Money</div>
                        <div className="text-[11px] text-outline">{p.method || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-body-md font-bold text-on-surface">UGX {p.amount?.toLocaleString()}</div>
                      <div className="text-[11px] text-emerald-600 font-bold uppercase">{p.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <button onClick={handleCancelBooking} disabled={actionLoading || !['pending', 'accepted', 'in_progress'].includes(selectedBooking?.booking?.status)} className="px-3 py-2 border border-outline-variant rounded hover:bg-surface-variant transition-colors text-label-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed">
                {actionLoading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
              <button onClick={handleContactRider} className="px-3 py-2 bg-primary text-on-primary rounded hover:opacity-90 transition-opacity text-label-md">
                Contact Rider
              </button>
            </div>
          </div>
        </aside>
        </div>
      )}

      {/* Contact Rider Modal */}
      {showContactModal && selectedBooking?.booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowContactModal(false)}></div>
          <div className="bg-surface w-full max-w-sm rounded shadow-2xl relative z-10 border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="text-headline-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Contact Rider
              </h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setShowContactModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedBooking.booking.rider_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-body-md font-bold text-on-surface">{selectedBooking.booking.rider_name}</p>
                  <p className="text-body-sm text-outline">{selectedBooking.booking.rider_phone || 'No phone'}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <a href={`tel:${selectedBooking.booking.rider_phone}`} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded text-label-md hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call Rider
                </a>
                <button onClick={() => setShowContactModal(false)} className="flex-1 px-4 py-2.5 border border-outline-variant rounded text-label-md hover:bg-surface-container transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
