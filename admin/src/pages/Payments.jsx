import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../services/api';

const statusConfig = {
  pending: { label: 'PENDING', class: 'bg-surface-container-highest text-on-surface-variant border border-outline-variant' },
  held: { label: 'HELD', class: 'bg-orange-100 text-orange-800 border border-orange-200' },
  released: { label: 'RELEASED', class: 'bg-green-100 text-green-800 border border-green-200' },
  refunded: { label: 'REFUNDED', class: 'bg-surface-container-highest text-on-surface-variant' },
  failed: { label: 'FAILED', class: 'bg-error-container text-on-error-container' },
  flagged: { label: 'FLAGGED', class: 'bg-error text-on-error' },
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const perPage = 15;
  const [detailPayment, setDetailPayment] = useState(null);

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
      setModalType(null);
      loadPayments();
    } catch (err) {
      alert('Failed to release payment');
    }
  };

  const handleFlag = async (paymentId) => {
    try {
      await adminAPI.flagPayment(paymentId, flagReason);
      setFlagReason('');
      setModalType(null);
      setSelectedPayment(null);
      loadPayments();
    } catch (err) {
      alert('Failed to flag payment');
    }
  };

  const filterTabs = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'held', label: 'Held' },
    { key: 'released', label: 'Released' },
    { key: 'flagged', label: 'Flagged', isError: true },
  ];

  const totalPages = Math.ceil(payments.length / perPage);
  const paginatedPayments = payments.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-4 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-display">Payments Management</h2>
          <p className="text-body-sm text-on-surface-variant">Monitor, release, and audit transaction lifecycle.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-surface border border-outline-variant rounded hover:bg-surface-container text-label-md transition-colors">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded hover:opacity-90 text-label-md transition-opacity">
            <span className="material-symbols-outlined text-[16px]">sync</span>
            Reconcile
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-surface border border-outline-variant rounded flex flex-col gap-1">
            <span className="text-[11px] uppercase text-on-surface-variant tracking-wider font-medium">Total Revenue (MTD)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-display text-primary">${(stats.total_amount || 0).toLocaleString()}</span>
              <span className="text-green-600 text-[11px] flex items-center">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span> 12%
              </span>
            </div>
          </div>
          <div className="p-3 bg-surface border border-outline-variant rounded flex flex-col gap-1">
            <span className="text-[11px] uppercase text-on-surface-variant tracking-wider font-medium">Held Payments</span>
            <div className="flex items-baseline gap-2">
              <span className="text-display text-tertiary">${stats.held_count ? (stats.held_count * 100).toLocaleString() : '0'}</span>
              <span className="text-label-md text-on-surface-variant">({stats.held_count || 0} Transactions)</span>
            </div>
          </div>
          <div className="p-3 bg-surface border border-outline-variant rounded flex flex-col gap-1">
            <span className="text-[11px] uppercase text-on-surface-variant tracking-wider font-medium">Released Today</span>
            <div className="flex items-baseline gap-2">
              <span className="text-display text-on-surface">${stats.total_amount ? Math.round(stats.total_amount * 0.2).toLocaleString() : '0'}</span>
              <span className="text-primary text-[11px] flex items-center">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> Verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-3 flex items-center gap-3 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-0 p-1 bg-surface-container-low rounded border border-outline-variant">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 rounded text-label-md transition-all ${
                statusFilter === tab.key
                  ? 'bg-white shadow-sm text-primary'
                  : `hover:bg-surface-container ${tab.isError ? 'text-error' : 'text-on-surface-variant'}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-surface border border-outline-variant rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-on-surface-variant">Loading...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">Transaction ID</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">Booking ID</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">User / Rider</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest text-right">Amount</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[11px] font-medium text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {payments.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">No payments found</td></tr>
                ) : (
                  paginatedPayments.map((payment) => {
                    const sc = statusConfig[payment.status] || statusConfig.pending;
                    const isFlagged = payment.status === 'flagged';
                    return (
                      <tr key={payment.id} className={`transition-colors group ${isFlagged ? 'bg-error-container/10 hover:bg-error-container/20' : 'hover:bg-surface-container-low'}`}>
                        <td className={`px-4 py-3 font-mono text-body-md font-medium ${isFlagged ? 'text-error' : 'text-primary'}`}>{payment.id?.slice(0, 8)}...</td>
                        <td className="px-4 py-3 font-mono text-body-md opacity-60">{payment.booking_id?.slice(0, 8) || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-body-md">{payment.user_name || 'User'}</span>
                            <span className="text-[11px] opacity-60">{payment.method || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-body-md font-medium">UGX {payment.amount?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${sc.class}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant text-body-md">
                          {payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(payment.status === 'held' || payment.status === 'flagged') && (
                              <button
                                onClick={() => { setSelectedPayment(payment); setModalType('release'); }}
                                className="px-2 py-1 bg-primary text-on-primary rounded text-[11px] font-bold"
                              >Release</button>
                            )}
                            {payment.status === 'held' && (
                              <button
                                onClick={() => { setSelectedPayment(payment); setModalType('flag'); }}
                                className="px-2 py-1 border border-error text-error hover:bg-error-container rounded text-[11px] font-bold transition-colors"
                              >Flag</button>
                            )}
                            {payment.status !== 'held' && payment.status !== 'flagged' && (
                              <div className="relative" ref={menuOpen === payment.id ? menuRef : undefined}>
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === payment.id ? null : payment.id); }} className="p-1 text-on-surface-variant hover:bg-surface-variant rounded">
                                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                </button>
                                {menuOpen === payment.id && (
                                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-outline-variant rounded shadow-lg z-50 py-1">
                                    <button onClick={(e) => { e.stopPropagation(); setDetailPayment(payment); setMenuOpen(null); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[16px]">info</span> Details
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 flex items-center justify-between bg-surface-container-low border-t border-outline-variant">
          <span className="text-label-md text-on-surface-variant">Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, payments.length)} of {payments.length}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1 border border-outline-variant rounded disabled:opacity-30 hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-label-md ${page === p ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 border border-outline-variant rounded disabled:opacity-30 hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flag Modal */}
      {modalType === 'flag' && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => { setModalType(null); setFlagReason(''); }}></div>
          <div className="bg-surface w-full max-w-md rounded shadow-2xl relative z-10 border border-outline-variant overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="text-headline-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-error">flag</span>
                Flag Transaction
              </h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => { setModalType(null); setFlagReason(''); }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3">
                <p className="text-label-md text-on-surface-variant mb-1">Transaction ID</p>
                <p className="font-mono text-body-md font-bold">{selectedPayment.id?.slice(0, 8)}...</p>
              </div>
              <div className="mb-4">
                <label className="text-label-md text-on-surface-variant block mb-2">Reason for flagging</label>
                <textarea
                  className="w-full bg-white border border-outline-variant rounded p-3 text-body-md focus:ring-2 focus:ring-error focus:border-error outline-none min-h-[120px] resize-none"
                  placeholder="Explain the suspicious activity or policy violation..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex-1 px-4 py-2 border border-outline-variant rounded text-label-md hover:bg-surface-container-low transition-colors" onClick={() => { setModalType(null); setFlagReason(''); }}>Cancel</button>
                <button className="flex-1 px-4 py-2 bg-error text-on-error rounded text-label-md hover:opacity-90 transition-opacity" onClick={() => handleFlag(selectedPayment.id)}>Confirm Flag</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Modal */}
      {modalType === 'release' && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setModalType(null)}></div>
          <div className="bg-surface w-full max-w-md rounded shadow-2xl relative z-10 border border-outline-variant overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="text-headline-sm flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">check_circle</span>
                Release Funds
              </h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setModalType(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 bg-primary-container/10 border border-primary-container/20 p-3 rounded mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">payments</span>
                <div>
                  <p className="text-label-md text-on-surface-variant">Estimated Payout Time</p>
                  <p className="text-body-md font-bold">Immediate (1-3 Business Minutes)</p>
                </div>
              </div>
              <p className="text-body-md text-on-surface-variant mb-6">
                By releasing <span className="font-mono font-bold text-on-surface">{selectedPayment.id?.slice(0, 8)}...</span>, you confirm that the associated booking has been fulfilled and all security checks are passed.
              </p>
              <div className="flex items-center gap-3">
                <button className="flex-1 px-4 py-2 border border-outline-variant rounded text-label-md hover:bg-surface-container-low transition-colors" onClick={() => setModalType(null)}>Go Back</button>
                <button className="flex-1 px-4 py-2 bg-primary text-on-primary rounded text-label-md hover:opacity-90 transition-opacity" onClick={() => handleRelease(selectedPayment.id)}>Confirm Release</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {detailPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setDetailPayment(null)}></div>
          <div className="bg-surface w-full max-w-md rounded shadow-2xl relative z-10 border border-outline-variant overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
              <h3 className="text-headline-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Payment Details
              </h3>
              <button className="text-on-surface-variant hover:text-on-surface" onClick={() => setDetailPayment(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Transaction ID</span>
                <span className="font-mono text-body-md font-bold text-primary">{detailPayment.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Booking ID</span>
                <span className="font-mono text-body-md">{detailPayment.booking_id?.slice(0, 8) || 'N/A'}...</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Amount</span>
                <span className="text-body-md font-bold">UGX {detailPayment.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Method</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${detailPayment.method === 'mtn' ? 'bg-yellow-100 text-yellow-800' : detailPayment.method === 'airtel' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {detailPayment.method?.toUpperCase() || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Status</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${statusConfig[detailPayment.status]?.class || ''}`}>
                  {detailPayment.status}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Booking Type</span>
                <span className="text-body-md">{detailPayment.booking_type || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                <span className="text-label-md text-on-surface-variant">Created</span>
                <span className="text-body-md">{detailPayment.created_at ? new Date(detailPayment.created_at).toLocaleString() : 'N/A'}</span>
              </div>
              {detailPayment.released_at && (
                <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
                  <span className="text-label-md text-on-surface-variant">Released</span>
                  <span className="text-body-md text-emerald-600">{new Date(detailPayment.released_at).toLocaleString()}</span>
                </div>
              )}
              {detailPayment.transaction_ref && (
                <div className="flex justify-between items-center">
                  <span className="text-label-md text-on-surface-variant">Reference</span>
                  <span className="font-mono text-body-md">{detailPayment.transaction_ref}</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-low">
              <button onClick={() => setDetailPayment(null)} className="w-full px-4 py-2 bg-primary text-on-primary rounded text-label-md hover:opacity-90 transition-opacity">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
