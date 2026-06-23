import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../services/api';
import { useAlert } from '../components/AlertModal';

const statusConfig = {
  verified: { label: 'Active', class: 'bg-secondary-container text-on-secondary-container' },
  pending: { label: 'Pending Approval', class: 'bg-error-container text-on-error-container' },
  rejected: { label: 'Rejected', class: 'bg-surface-container-highest text-on-surface-variant' },
  suspended: { label: 'Blocked', class: 'bg-surface-container-highest text-on-surface-variant' },
};

const avatarColors = ['bg-primary/10 text-primary', 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant', 'bg-outline-variant text-on-surface-variant'];

export default function Riders() {
  const { showAlert } = useAlert();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState(null);
  const [filter, setFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    loadRiders();
  }, [filter]);

  const loadRiders = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const { data } = await adminAPI.getPendingRiders();
        setRiders(data.riders || []);
      } else {
        const { data } = await adminAPI.getPendingRiders();
        let all = data.riders || [];
        if (filter !== 'all') {
          all = all.filter(r => r.status === filter);
        }
        setRiders(all);
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
      setRiders(riders.map(r => r.id === riderId ? { ...r, status: 'verified' } : r));
      setSelectedRider(null);
      setFilter('all');
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to verify rider', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.verifyRider(riderId, 'rejected', rejectReason);
      setRiders(riders.map(r => r.id === riderId ? { ...r, status: 'rejected' } : r));
      setSelectedRider(null);
      setRejectReason('');
      setFilter('all');
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to reject rider', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.suspendRider(riderId, 'Admin suspension');
      setRiders(riders.map(r => r.id === riderId ? { ...r, status: 'suspended' } : r));
      setMenuOpen(null);
      setFilter('all');
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to suspend rider', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinstate = async (riderId) => {
    setActionLoading(true);
    try {
      await adminAPI.reinstateRider(riderId);
      setRiders(riders.map(r => r.id === riderId ? { ...r, status: 'verified' } : r));
      setMenuOpen(null);
      setFilter('all');
    } catch (err) {
      showAlert({ title: 'Error', message: 'Failed to reinstate rider', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (riderId, riderName) => {
    showAlert({
      title: 'Delete Rider',
      message: `Delete ${riderName}? This cannot be undone.`,
      type: 'error',
      showCancel: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await adminAPI.deleteRider(riderId);
          setRiders(riders.filter(r => r.id !== riderId));
          setMenuOpen(null);
        } catch (err) {
          showAlert({ title: 'Error', message: 'Failed to delete rider', type: 'error' });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending Approval' },
    { key: 'verified', label: 'Active' },
    { key: 'suspended', label: 'Blocked' },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-display text-on-surface">Rider Management</h1>
            <p className="text-body-md text-on-surface-variant">Review and manage rider fleet status.</p>
          </div>
          <div className="flex bg-white border border-outline-variant rounded-lg p-1 h-9 items-center">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-label-md rounded transition-all ${
                  filter === f.key
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-on-surface-variant">Loading...</div>
        ) : (
          <div className="bg-white border border-outline-variant rounded overflow-hidden flex flex-col">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-3 py-2 text-[11px] text-outline uppercase tracking-wider font-medium">Name</th>
                  <th className="px-3 py-2 text-[11px] text-outline uppercase tracking-wider font-medium">Phone</th>
                  <th className="px-3 py-2 text-[11px] text-outline uppercase tracking-wider font-medium">Status</th>
                  <th className="px-3 py-2 text-[11px] text-outline uppercase tracking-wider font-medium">Application Date</th>
                  <th className="px-3 py-2 text-[11px] text-outline uppercase tracking-wider font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {riders.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">No riders found</td></tr>
                ) : (
                  riders.map((rider, idx) => {
                    const sc = statusConfig[rider.status] || statusConfig.pending;
                    return (
                      <tr
                        key={rider.id}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => setSelectedRider(rider)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-label-md ${avatarColors[idx % 3]}`}>
                              {getInitials(rider.name)}
                            </div>
                            <span className="text-body-md font-semibold text-on-surface">{rider.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-body-md text-on-surface-variant">{rider.phone}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded uppercase ${sc.class}`}>{sc.label}</span>
                        </td>
                        <td className="px-3 py-2 text-body-md text-on-surface-variant">
                          {rider.created_at ? new Date(rider.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-right relative" ref={menuOpen === rider.id ? menuRef : undefined}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === rider.id ? null : rider.id); }}
                            className="material-symbols-outlined text-outline hover:text-primary transition-colors"
                          >more_vert</button>
                          {menuOpen === rider.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-outline-variant rounded shadow-lg z-50 py-1">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedRider(rider); setMenuOpen(null); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">visibility</span> View Details
                              </button>
                              {rider.status === 'pending' && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleVerify(rider.id); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2 text-primary">
                                    <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleReject(rider.id); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2 text-error">
                                    <span className="material-symbols-outlined text-[16px]">cancel</span> Reject
                                  </button>
                                </>
                              )}
                              {rider.status === 'verified' && (
                                <button onClick={(e) => { e.stopPropagation(); handleSuspend(rider.id); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2 text-error">
                                  <span className="material-symbols-outlined text-[16px]">block</span> Suspend
                                </button>
                              )}
                              {rider.status === 'suspended' && (
                                <button onClick={(e) => { e.stopPropagation(); handleReinstate(rider.id); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2 text-primary">
                                  <span className="material-symbols-outlined text-[16px]">replay</span> Reinstate
                                </button>
                              )}
                              <div className="border-t border-outline-variant my-1"></div>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(rider.id, rider.name); }} className="w-full text-left px-3 py-2 text-body-md hover:bg-surface-container-low flex items-center gap-2 text-error">
                                <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-3 py-2 bg-surface-container-lowest border-t border-outline-variant">
              <span className="text-label-md text-on-surface-variant">Showing {riders.length} riders</span>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-low transition-colors" disabled>
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface-container-low transition-colors">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 lg:static lg:z-auto" onClick={() => setSelectedRider(null)}>
          <div className="absolute inset-0 bg-black/40 lg:hidden"></div>
          <aside className="absolute right-0 top-0 h-full w-full sm:w-96 lg:static lg:w-96 border-l border-outline-variant bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-headline-sm text-on-surface">Application Review</h3>
              <button className="material-symbols-outlined text-outline hover:text-on-surface transition-colors" onClick={() => setSelectedRider(null)}>close</button>
            </div>
          <div className="flex-1 overflow-auto p-4 space-y-6">
            <div className="space-y-3">
              <h4 className="text-[11px] text-outline uppercase tracking-wider font-medium">Personal Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-outline">Full Name</p>
                  <p className="text-body-md font-semibold text-on-surface">{selectedRider.name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-outline">License No.</p>
                  <p className="text-body-md font-semibold text-on-surface">{selectedRider.national_id || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-outline">Vehicle Plate</p>
                  <p className="text-body-md font-semibold text-on-surface">{selectedRider.plate_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-outline">Application Date</p>
                  <p className="text-body-md font-semibold text-on-surface">
                    {selectedRider.created_at ? new Date(selectedRider.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] text-outline uppercase tracking-wider font-medium">Documents</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] text-outline mb-1">National ID Photo</p>
                  <div className="aspect-video rounded border border-outline-variant bg-surface-container overflow-hidden">
                    {selectedRider.id_photo ? (
                      <img src={selectedRider.id_photo} alt="ID" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-body-sm">No photo uploaded</div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-outline mb-1">Selfie Photo</p>
                  <div className="aspect-square rounded border border-outline-variant bg-surface-container overflow-hidden">
                    {selectedRider.selfie_photo ? (
                      <img src={selectedRider.selfie_photo} alt="Selfie" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-body-sm">No photo uploaded</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-[11px] text-outline uppercase tracking-wider font-medium">Review Action</h4>
              <textarea
                className="w-full h-24 p-2 bg-surface-container-low border border-outline-variant rounded text-body-md focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none resize-none"
                placeholder="Optional: Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="p-4 border-t border-outline-variant grid grid-cols-2 gap-3 bg-surface-container-lowest">
            <button
              onClick={() => handleReject(selectedRider.id)}
              disabled={actionLoading}
              className="h-9 flex items-center justify-center border border-error text-error font-label-md rounded-lg hover:bg-error/5 active:scale-95 transition-all disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleVerify(selectedRider.id)}
              disabled={actionLoading}
              className="h-9 flex items-center justify-center bg-primary text-white font-label-md rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              Approve Rider
            </button>
          </div>
        </aside>
        </div>
      )}
    </div>
  );
}
