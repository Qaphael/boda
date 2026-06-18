import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const navItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Riders', path: '/riders', icon: 'motorcycle' },
  { name: 'Bookings', path: '/bookings', icon: 'receipt_long' },
  { name: 'Payments', path: '/payments', icon: 'payments' },
];

const bottomNavItems = [
  { name: 'Settings', path: '/settings', icon: 'settings' },
  { name: 'Support', path: '/support', icon: 'help' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2 rounded transition-all duration-150 text-label-md ${
          isActive
            ? 'bg-secondary-container text-on-secondary-container font-semibold'
            : 'text-on-surface-variant hover:bg-surface-container'
        }`}
      >
        <span className="material-symbols-outlined">{item.icon}</span>
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col h-full py-3 px-2 bg-surface w-64 border-r border-outline-variant transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-6 mb-auto">
          <div className="flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary">motorcycle</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-headline-sm font-bold text-primary truncate">Boda Admin</span>
              <span className="text-[10px] uppercase tracking-wider text-outline">Logistics Hub</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => <NavLink key={item.path} item={item} />)}
          </nav>
        </div>
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-outline-variant">
          {bottomNavItems.map((item) => <NavLink key={item.path} item={item} />)}
          <div className="flex items-center gap-2 mt-3 p-2 bg-surface-container-low rounded-lg border border-outline-variant">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              AH
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-label-md font-bold truncate">Admin Hub</span>
              <span className="text-[10px] text-outline truncate">admin@boda.hub</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-3 sm:px-4 h-12 w-full sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <button
              className="p-1.5 hover:bg-surface-variant rounded-lg lg:hidden shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-1 text-body-md focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                placeholder="Search riders, orders, or transactions..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button onClick={() => navigate('/support')} className="p-2 text-on-surface-variant hover:bg-surface-variant transition-all rounded-full opacity-80 active:opacity-100 hidden sm:flex">
              <span className="material-symbols-outlined">chat_bubble</span>
            </button>
            <NotificationBell />
            <button onClick={handleLogout} className="p-2 text-on-surface-variant hover:bg-surface-variant transition-all rounded-full opacity-80 active:opacity-100 hidden sm:flex">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
