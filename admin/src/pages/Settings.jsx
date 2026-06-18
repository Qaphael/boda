import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function Settings() {
  const [activeSection, setActiveSection] = useState('Profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });
  const [settings, setSettings] = useState({});
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, settingsRes] = await Promise.all([
        adminAPI.getProfile(),
        adminAPI.getSettings(),
      ]);
      setProfile(profileRes.data.profile || {});
      setSettings(settingsRes.data.settings || {});
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await adminAPI.updateProfile(profile);
      alert('Profile updated');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      alert('Settings saved');
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSystem = (key) => {
    setSettings(prev => ({
      ...prev,
      system: { ...prev.system, [key]: !prev.system?.[key] },
    }));
  };

  const updateSystem = (key, value) => {
    setSettings(prev => ({
      ...prev,
      system: { ...prev.system, [key]: value },
    }));
  };

  const toggleNotification = (event, channel) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [`${event}_${channel}`]: !prev.notifications?.[`${event}_${channel}`],
      },
    }));
  };

  const sectionItems = [
    { group: 'General', items: ['Profile', 'System Config', 'Notifications'] },
    { group: 'Security & Region', items: ['Security', 'Regional Settings'] },
  ];

  if (loading) return <div className="text-center py-8 text-on-surface-variant">Loading...</div>;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Mobile nav toggle */}
      <div className="lg:hidden p-3 border-b border-outline-variant bg-surface flex items-center gap-3 shrink-0">
        <button onClick={() => setMobileNav(!mobileNav)} className="flex items-center gap-2 px-3 py-2 border border-outline-variant rounded text-label-md hover:bg-surface-container">
          <span className="material-symbols-outlined text-[18px]">menu</span>
          Navigation
        </button>
        <span className="text-body-md font-semibold">{activeSection}</span>
      </div>

      {/* Secondary Nav */}
      <nav className={`${mobileNav ? 'flex' : 'hidden'} lg:flex w-full lg:w-48 border-r border-outline-variant flex-col p-2 bg-surface shrink-0`}>
        {sectionItems.map((section) => (
          <div key={section.group} className="mb-1">
            <div className="px-3 py-2 mb-1">
              <span className="text-[11px] font-bold uppercase text-outline tracking-widest">{section.group}</span>
            </div>
            {section.items.map((item) => (
              <button key={item} onClick={() => { setActiveSection(item); setMobileNav(false); }} className={`w-full flex items-center px-3 py-2 rounded text-body-sm transition-all border-l-2 ${activeSection === item ? 'bg-surface-container text-primary border-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-low border-transparent'}`}>{item}</button>
            ))}
          </div>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 pb-24 overflow-y-auto custom-scrollbar">
        {/* Profile Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm font-bold">Admin Profile</h2>
            <button onClick={handleSaveProfile} disabled={saving} className="bg-primary text-white text-[11px] px-3 py-1 rounded hover:opacity-90 font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Update Profile'}</button>
          </div>
          <div className="bg-white border border-outline-variant rounded p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-outline font-bold uppercase">Full Name</label>
              <input className="border border-outline-variant rounded p-2 text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" type="text" value={profile.name || ''} onChange={(e) => setProfile({...profile, name: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-outline font-bold uppercase">Phone Number</label>
              <input className="border border-outline-variant rounded p-2 text-body-md font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" type="text" value={profile.phone || ''} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-outline font-bold uppercase">Email Address</label>
              <input className="border border-outline-variant rounded p-2 text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" type="email" value={profile.email || ''} onChange={(e) => setProfile({...profile, email: e.target.value})} />
            </div>
          </div>
        </section>

        {/* System Configuration */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-headline-sm font-bold">System Configuration</h2>
            <span className="bg-tertiary text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Critical</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-outline-variant rounded p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-body-md font-bold">New Rider Registration</span>
                <span className="text-[11px] text-on-surface-variant">Enable or disable new applications.</span>
              </div>
              <button onClick={() => toggleSystem('new_rider_registration')} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${settings.system?.new_rider_registration ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.system?.new_rider_registration ? 'translate-x-4' : ''}`}></span>
              </button>
            </div>
            <div className="bg-white border border-outline-variant rounded p-3 flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-body-md font-bold">In-App Chat Support</span>
                <span className="text-[11px] text-on-surface-variant">Enable live support for active rides.</span>
              </div>
              <button onClick={() => toggleSystem('in_app_chat')} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${settings.system?.in_app_chat ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.system?.in_app_chat ? 'translate-x-4' : ''}`}></span>
              </button>
            </div>
            <div className="bg-white border border-outline-variant rounded p-3 flex flex-col gap-2">
              <label className="text-[11px] text-outline font-bold uppercase">Commission Rate (%)</label>
              <div className="flex items-center border border-outline-variant rounded bg-surface-container-lowest px-2">
                <input className="w-full border-none p-2 text-body-md font-mono focus:ring-0 outline-none" type="number" step="0.1" value={settings.system?.commission_rate || ''} onChange={(e) => updateSystem('commission_rate', e.target.value)} />
                <span className="text-outline text-label-md">%</span>
              </div>
            </div>
            <div className="bg-white border border-outline-variant rounded p-3 flex flex-col gap-2">
              <label className="text-[11px] text-outline font-bold uppercase">Surge Multiplier (Max)</label>
              <div className="flex items-center border border-outline-variant rounded bg-surface-container-lowest px-2">
                <input className="w-full border-none p-2 text-body-md font-mono focus:ring-0 outline-none" type="number" step="0.1" value={settings.system?.surge_multiplier || ''} onChange={(e) => updateSystem('surge_multiplier', e.target.value)} />
                <span className="text-outline text-label-md">X</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="space-y-3">
          <h2 className="text-headline-sm font-bold">Notification Protocols</h2>
          <div className="bg-white border border-outline-variant rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-3 py-2 text-[11px] text-outline uppercase font-bold">Event</th>
                    <th className="px-3 py-2 text-[11px] text-outline uppercase font-bold text-center">SMS</th>
                    <th className="px-3 py-2 text-[11px] text-outline uppercase font-bold text-center">Email</th>
                    <th className="px-3 py-2 text-[11px] text-outline uppercase font-bold text-center">Webhook</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm">
                  {[
                    { key: 'rider_application', label: 'New Rider Application' },
                    { key: 'flagged_payment', label: 'Flagged Payment Alert' },
                    { key: 'maintenance', label: 'System Maintenance' },
                  ].map((event) => (
                    <tr key={event.key} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                      <td className="px-3 py-2 font-medium">{event.label}</td>
                      {['sms', 'email', 'webhook'].map((ch) => (
                        <td key={ch} className="px-3 py-2 text-center">
                          <input type="checkbox" className="rounded border-outline-variant text-primary" checked={!!settings.notifications?.[`${event.key}_${ch}`]} onChange={() => toggleNotification(event.key, ch)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="space-y-3">
          <h2 className="text-headline-sm font-bold">Security & Access Control</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-outline-variant rounded p-3 flex items-start gap-3">
              <div className="bg-secondary-container p-2 rounded shrink-0">
                <span className="material-symbols-outlined text-on-secondary-container">vibration</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-body-md font-bold">Two-Factor Auth</span>
                  <span className="text-[10px] bg-green-100 text-green-800 px-2 rounded font-bold shrink-0">Active</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">Additional mobile security code.</p>
              </div>
            </div>
            <div className="bg-white border border-outline-variant rounded p-3 flex items-start gap-3">
              <div className="bg-error-container p-2 rounded shrink-0">
                <span className="material-symbols-outlined text-on-error-container">history</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-body-md font-bold">Active Sessions</span>
                  <span className="text-[10px] bg-outline-variant text-on-surface px-2 rounded font-bold shrink-0">3 Active</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">Manage logged in devices.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Regional Settings */}
        <section className="space-y-3">
          <h2 className="text-headline-sm font-bold">Localization</h2>
          <div className="bg-white border border-outline-variant rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-outline font-bold uppercase">Currency</label>
              <select className="border border-outline-variant rounded p-2 text-body-md bg-surface-container-low focus:outline-none focus:border-primary" value={settings.regional?.currency || 'UGX'} onChange={(e) => setSettings(prev => ({ ...prev, regional: { ...prev.regional, currency: e.target.value } }))}>
                <option>UGX</option><option>KES</option><option>USD</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-outline font-bold uppercase">Timezone</label>
              <select className="border border-outline-variant rounded p-2 text-body-md bg-surface-container-low focus:outline-none focus:border-primary" value={settings.regional?.timezone || 'EAT'} onChange={(e) => setSettings(prev => ({ ...prev, regional: { ...prev.regional, timezone: e.target.value } }))}>
                <option>EAT (UTC+3)</option><option>GMT (UTC+0)</option><option>CET (UTC+1)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Action Footer */}
        <div className="sticky bottom-4 left-0 right-0 flex justify-end gap-3">
          <button className="bg-surface border border-outline-variant px-4 py-2 rounded text-body-sm font-medium hover:bg-surface-container transition-colors shadow-sm">Discard</button>
          <button onClick={handleSaveSettings} disabled={saving} className="bg-primary text-white px-4 py-2 rounded text-body-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
