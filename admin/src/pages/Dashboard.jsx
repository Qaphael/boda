import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!stats) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Riders', stats.riders?.total || 0],
      ['Online Riders', stats.riders?.online || 0],
      ['Pending Verification', stats.riders?.pending || 0],
      ['Total Bookings', stats.bookings?.total || 0],
      ['Active Bookings', stats.bookings?.active || 0],
      ["Today's Bookings", stats.bookings?.today || 0],
      ['Total Users', stats.users?.total || 0],
      ['Held Payments', stats.payments?.held || 0],
      ['Total Revenue', stats.payments?.total_amount || 0],
      ['Today Revenue', stats.payments?.today_amount || 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boda-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-8 text-on-surface-variant">Loading...</div>;
  if (!stats) return <div className="text-center py-8 text-on-surface-variant">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Total Riders', value: stats.riders?.total || 0, sub: null, color: 'text-on-surface', icon: null },
    { label: 'Online Riders', value: stats.riders?.online || 0, sub: null, color: 'text-primary', bar: true },
    { label: 'Pending Verif.', value: stats.riders?.pending || 0, sub: 'Immediate action', color: 'text-tertiary' },
    { label: 'Total Bookings', value: stats.bookings?.total || 0, sub: 'All time', color: 'text-on-surface' },
    { label: 'Active Bookings', value: stats.bookings?.active || 0, sub: null, color: 'text-on-surface', pulse: true },
    { label: "Today's Bookings", value: stats.bookings?.today || 0, sub: null, color: 'text-on-surface', trend: '+8% vs yesterday' },
    { label: 'Total Users', value: stats.users?.total || 0, sub: 'Retention: 94%', color: 'text-on-surface' },
    { label: 'Held Payments', value: `$${(stats.payments?.held || 0).toLocaleString()}`, sub: 'Flagged risk', color: 'text-error' },
  ];

  const quickActions = [
    { title: '5 New Rider Applications', desc: 'Documents uploaded and pending background check verification.', badge: 'URGENT', badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed', icon: 'person_add', hoverBg: 'hover:bg-primary-container hover:border-primary', link: '/riders' },
    { title: '3 Held Payments', desc: 'Suspicious activity detected. KYC check required.', badge: 'FLAGGED', badgeClass: 'bg-error-container text-error', icon: 'money_off', hoverBg: 'hover:bg-error-container hover:border-error', link: '/payments' },
    { title: 'System Latency', value: '24ms', sub: '99.9% Uptime', badge: 'STABLE', badgeClass: 'bg-surface-container-highest text-on-surface-variant', icon: 'memory', hoverBg: 'hover:border-primary' },
    { title: 'Active Support', icon: 'support_agent', badge: null, hoverBg: 'hover:border-primary' },
  ];

  const recentRiders = [
    { name: 'Kevin Otieno', id: '#BD-2039', status: 'ON TRIP', statusClass: 'bg-secondary-container text-on-secondary-container', location: 'Westlands, Nairobi', rating: 4.8, revenue: '$124.50', initials: 'KO' },
    { name: 'Sarah Mwangi', id: '#BD-4412', status: 'IDLE', statusClass: 'bg-surface-container-highest text-outline', location: 'Kilimani Area', rating: 4.9, revenue: '$82.20', initials: 'SM' },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-display text-on-surface">Dashboard Overview</h1>
          <p className="text-body-md text-on-surface-variant">Real-time operational status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDashboard} className="px-3 py-1 border border-outline-variant bg-surface rounded text-label-md flex items-center gap-1 hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Refresh Data
          </button>
          <button onClick={handleExport} className="px-3 py-1 bg-primary text-on-primary rounded text-label-md flex items-center gap-1 hover:shadow-lg transition-all active:scale-95">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Report
          </button>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="border border-outline-variant p-3 rounded bg-surface flex flex-col gap-1">
            <span className="text-[11px] text-outline uppercase tracking-wider font-medium">{card.label}</span>
            <span className={`text-headline-sm ${card.color}`}>{card.value}</span>
            {card.bar && (
              <div className="w-full bg-outline-variant h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-primary h-full w-[38%]"></div>
              </div>
            )}
            {card.pulse && (
              <div className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Live tracking
              </div>
            )}
            {card.trend && <span className="text-[10px] text-primary">{card.trend}</span>}
            {card.sub && !card.bar && !card.pulse && !card.trend && (
              <span className={`text-[10px] ${card.color === 'text-error' ? 'text-error font-medium' : 'text-outline'}`}>{card.sub}</span>
            )}
          </div>
        ))}
      </div>

      {/* Revenue & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 border border-outline-variant rounded bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-headline-sm">Revenue Trends</h3>
              <p className="text-body-sm text-on-surface-variant">Weekly performance analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <span className="text-[11px]">Bookings</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-outline-variant"></span>
                <span className="text-[11px]">Referrals</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full bg-surface-container-low rounded flex items-center justify-center text-on-surface-variant">
            <span className="text-body-md">Revenue Chart</span>
          </div>
        </div>
        <div className="border border-outline-variant rounded bg-surface relative overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center z-10 bg-surface/80 backdrop-blur">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-outline">Active Fleet Density</h3>
            <span onClick={loadDashboard} className="material-symbols-outlined text-primary cursor-pointer hover:rotate-180 transition-all duration-500">sync</span>
          </div>
          <div className="flex-1 bg-surface-container min-h-[200px] relative">
            <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse"></div>
            <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '1.2s' }}></div>
          </div>
          <div className="p-3 bg-surface-container-low flex items-center justify-between">
            <span className="text-label-md text-on-surface-variant">CBD District: High Demand</span>
            <span className="text-label-md text-primary">View Map</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((action) => (
          <a
            key={action.title}
            href={action.link || '#'}
            className={`group relative p-4 rounded border border-outline-variant bg-surface ${action.hoverBg} transition-all duration-300 cursor-pointer overflow-hidden`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline">{action.icon}</span>
              </div>
              {action.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${action.badgeClass}`}>{action.badge}</span>
              )}
            </div>
            <h3 className="text-headline-sm">{action.title}</h3>
            {action.desc && <p className="text-body-sm text-on-surface-variant mt-1">{action.desc}</p>}
            {action.value && (
              <div className="mt-3 flex items-end gap-1">
                <span className="text-[24px] font-semibold">{action.value}</span>
                <span className="text-[11px] text-outline mb-1">{action.sub}</span>
              </div>
            )}
            {action.value && (
              <div className="mt-3 flex gap-1">
                <div className="h-1 flex-1 bg-primary rounded-full"></div>
                <div className="h-1 flex-1 bg-primary rounded-full"></div>
                <div className="h-1 flex-1 bg-primary rounded-full"></div>
                <div className="h-1 flex-1 bg-primary/30 rounded-full"></div>
              </div>
            )}
            {!action.value && !action.desc && (
              <p className="text-body-sm text-on-surface-variant mt-3">12 tickets unassigned.</p>
            )}
            <div className="mt-4 flex items-center text-primary font-label-md group-hover:translate-x-1 transition-transform">
              <span>{action.link ? 'Review' : 'View'}</span>
              <span className="material-symbols-outlined ml-1 text-[16px]">arrow_forward</span>
            </div>
          </a>
        ))}
      </div>

      {/* Recent Rider Activity */}
      <div className="border border-outline-variant rounded bg-surface overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-headline-sm">Recent Rider Activity</h3>
          <button onClick={() => navigate('/riders')} className="text-primary text-label-md hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-outline font-medium">Rider</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-outline font-medium">Status</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-outline font-medium">Location</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-outline font-medium">Rating</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-outline font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {recentRiders.map((rider) => (
                <tr key={rider.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{rider.initials}</div>
                      <div>
                        <p className="text-label-md font-bold">{rider.name}</p>
                        <p className="text-body-sm text-outline">ID: {rider.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${rider.statusClass}`}>{rider.status}</span>
                  </td>
                  <td className="px-4 py-3 text-body-sm">{rider.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-tertiary">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="font-mono text-on-surface">{rider.rating}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{rider.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
