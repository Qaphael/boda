import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await adminAPI.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!stats) return <div className="text-center py-8">Failed to load dashboard</div>;

  const statCards = [
    { label: 'Total Riders', value: stats.riders?.total || 0, color: 'bg-blue-500' },
    { label: 'Online Riders', value: stats.riders?.online || 0, color: 'bg-green-500' },
    { label: 'Pending Verification', value: stats.riders?.pending || 0, color: 'bg-yellow-500' },
    { label: 'Total Bookings', value: stats.bookings?.total || 0, color: 'bg-purple-500' },
    { label: 'Active Bookings', value: stats.bookings?.active || 0, color: 'bg-indigo-500' },
    { label: 'Today\'s Bookings', value: stats.bookings?.today || 0, color: 'bg-pink-500' },
    { label: 'Total Users', value: stats.users?.total || 0, color: 'bg-cyan-500' },
    { label: 'Held Payments', value: stats.payments?.held || 0, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.color}`}>
                  <span className="text-white text-lg font-bold">{card.value}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.label}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{card.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold">UGX {(stats.payments?.total_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Today's Revenue</span>
              <span className="font-semibold">UGX {(stats.payments?.today_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Flagged Payments</span>
              <span className="font-semibold text-red-600">{stats.payments?.flagged || 0}</span>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a href="/riders?status=pending" className="block p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100">
              <span className="font-medium text-yellow-800">Review Pending Riders ({stats.riders?.pending || 0})</span>
            </a>
            <a href="/payments?status=flagged" className="block p-3 bg-red-50 rounded-lg hover:bg-red-100">
              <span className="font-medium text-red-800">Review Flagged Payments ({stats.payments?.flagged || 0})</span>
            </a>
            <a href="/bookings?status=in_progress" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100">
              <span className="font-medium text-green-800">Monitor Active Bookings ({stats.bookings?.active || 0})</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
