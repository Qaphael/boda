import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketFilter, setTicketFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [replyType, setReplyType] = useState('admin_reply');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => { loadTickets(); }, [ticketFilter, priorityFilter]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (ticketFilter !== 'all') params.status = ticketFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const { data } = await adminAPI.getTickets(params);
      setTickets(data.tickets || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowMobileDetail(true);
    try {
      const { data } = await adminAPI.getTicketDetails(ticket.id);
      setTicketMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await adminAPI.addTicketMessage(selectedTicket.id, replyText, replyType);
      setReplyText('');
      const { data } = await adminAPI.getTicketDetails(selectedTicket.id);
      setTicketMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      await adminAPI.updateTicketStatus(ticketId, status);
      loadTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const priorityColors = {
    urgent: 'bg-error-container text-on-error-container',
    high: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
    medium: 'bg-secondary-container text-on-secondary-container',
    low: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  };

  const statusDots = {
    open: 'bg-error animate-pulse',
    in_progress: 'bg-primary',
    resolved: 'bg-outline',
    closed: 'bg-outline',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3 p-3 sm:p-4 lg:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-outline-variant p-3 flex flex-col justify-between min-h-[80px]">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">Open Tickets</p>
          <div className="flex items-end justify-between">
            <p className="text-display text-primary">{stats?.open_count || 0}</p>
            {stats?.urgent > 0 && <span className="text-error text-[11px] flex items-center gap-1"><span className="material-symbols-outlined text-xs">trending_up</span> {stats.urgent} urgent</span>}
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-3 flex flex-col justify-between min-h-[80px]">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">In Progress</p>
          <div className="flex items-end justify-between">
            <p className="text-display text-on-surface">{stats?.in_progress || 0}</p>
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-3 flex flex-col justify-between min-h-[80px]">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">Created Today</p>
          <div className="flex items-end justify-between">
            <p className="text-display text-on-surface">{stats?.created_today || 0}</p>
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-3 flex flex-col justify-between min-h-[80px] relative overflow-hidden">
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">System Health</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <p className="text-label-md text-on-surface font-semibold">Operational</p>
          </div>
          <div className="mt-2 flex gap-px h-2">
            <div className="flex-1 bg-primary"></div><div className="flex-1 bg-primary"></div><div className="flex-1 bg-primary"></div><div className="flex-1 bg-primary"></div><div className="flex-1 bg-primary opacity-30"></div>
          </div>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
        {/* Ticket Queue */}
        <div className={`${showMobileDetail ? 'hidden lg:flex' : 'flex'} flex-1 flex-col overflow-hidden bg-surface-container-lowest border border-outline-variant`}>
          <div className="p-2 border-b border-outline-variant flex items-center justify-between bg-surface-container-low flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex border border-outline-variant rounded overflow-hidden">
                {[{ key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'in_progress', label: 'In Progress' }, { key: 'resolved', label: 'Resolved' }].map((f) => (
                  <button key={f.key} onClick={() => setTicketFilter(f.key)} className={`px-2 sm:px-3 py-1 text-label-md ${ticketFilter === f.key ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant hover:bg-surface-container'}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant">{tickets.length} tickets</p>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-8 text-center text-on-surface-variant">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">No tickets found</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low z-10 border-b border-outline-variant">
                  <tr>
                    <th className="px-3 py-2 text-[11px] text-on-surface-variant uppercase font-semibold">Priority</th>
                    <th className="px-3 py-2 text-[11px] text-on-surface-variant uppercase font-semibold">Subject</th>
                    <th className="px-3 py-2 text-[11px] text-on-surface-variant uppercase font-semibold hidden md:table-cell">User/Rider</th>
                    <th className="px-3 py-2 text-[11px] text-on-surface-variant uppercase font-semibold">Status</th>
                    <th className="px-3 py-2 text-[11px] text-on-surface-variant uppercase font-semibold hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className={`cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-surface-container border-l-[3px] border-l-primary' : 'hover:bg-surface-container border-l-[3px] border-transparent'}`} onClick={() => selectTicket(ticket)}>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                      </td>
                      <td className="px-3 py-2 min-w-0">
                        <p className="text-body-md font-semibold text-on-surface truncate">{ticket.subject}</p>
                        <p className="text-[11px] text-on-surface-variant truncate sm:hidden">{ticket.user_name || ticket.rider_name || 'N/A'}</p>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell font-mono text-label-md text-on-secondary-container">
                        {ticket.rider_name ? `R: ${ticket.rider_name}` : ticket.user_name ? `U: ${ticket.user_name}` : 'N/A'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 text-[11px] text-on-surface">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDots[ticket.status]}`}></span>
                          <span className="capitalize">{ticket.status?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-on-surface-variant hidden sm:table-cell">
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className={`${showMobileDetail ? 'flex' : 'hidden lg:flex'} flex-[2] flex-col gap-3 overflow-hidden min-w-0`}>
          {!selectedTicket ? (
            <div className="flex-1 bg-surface-container-lowest border border-outline-variant flex items-center justify-center text-on-surface-variant">
              Select a ticket to view details
            </div>
          ) : (
            <>
              <div className="flex-1 bg-surface-container-lowest border border-outline-variant flex flex-col overflow-hidden shadow-sm min-h-0">
                <div className="p-3 border-b border-outline-variant flex justify-between items-start bg-white shrink-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${priorityColors[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
                      <span className="font-mono text-[11px] text-outline">#{selectedTicket.id?.slice(0, 8)}</span>
                      <select value={selectedTicket.status} onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)} className="text-[11px] border border-outline-variant rounded px-1 py-0.5 bg-surface">
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <h2 className="text-headline-sm text-on-surface truncate">{selectedTicket.subject}</h2>
                  </div>
                  <button className="text-outline hover:text-on-surface transition-colors lg:hidden shrink-0 ml-2" onClick={() => setShowMobileDetail(false)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-3 bg-surface-container-lowest">
                  {ticketMessages.length === 0 ? (
                    <div className="text-center text-on-surface-variant py-8 text-body-sm">No messages yet</div>
                  ) : (
                    ticketMessages.map((msg) => {
                      if (msg.type === 'system') {
                        return (
                          <div key={msg.id} className="text-center py-1">
                            <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">{msg.message}</span>
                          </div>
                        );
                      }
                      if (msg.type === 'internal_note') {
                        return (
                          <div key={msg.id} className="flex flex-col items-center py-1">
                            <div className="w-full h-px bg-outline-variant"></div>
                            <span className="bg-surface-container-lowest px-3 -mt-2 text-[11px] text-outline uppercase tracking-widest font-bold">Internal Note</span>
                          </div>
                        );
                      }
                      const isAdmin = msg.type === 'admin_reply';
                      return (
                        <div key={msg.id} className={`flex flex-col gap-1 max-w-[85%] ${isAdmin ? 'items-end ml-auto' : 'items-start'}`}>
                          <div className={`p-2 rounded text-body-md ${isAdmin ? 'bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary-container/20' : 'bg-surface-container-high text-on-surface'}`}>{msg.message}</div>
                          <span className="text-[11px] text-on-surface-variant">{msg.admin_name || 'User'} • {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-3 border-t border-outline-variant bg-surface shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setReplyType('admin_reply')} className={`px-3 py-1 rounded text-label-md font-medium ${replyType === 'admin_reply' ? 'bg-primary-container text-on-primary-container' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}>Public Reply</button>
                    <button onClick={() => setReplyType('internal_note')} className={`px-3 py-1 rounded text-label-md ${replyType === 'internal_note' ? 'bg-primary-container text-on-primary-container' : 'bg-surface border border-outline-variant text-on-surface-variant'}`}>Internal Note</button>
                  </div>
                  <div className="relative">
                    <textarea className="w-full border border-outline-variant rounded p-2 text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none" placeholder="Type your response..." rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <button onClick={handleSendMessage} disabled={sending || !replyText.trim()} className="bg-primary text-on-primary rounded w-8 h-8 flex items-center justify-center hover:opacity-90 disabled:opacity-50">
                        <span className="material-symbols-outlined text-sm">{sending ? 'progress_activity' : 'send'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
