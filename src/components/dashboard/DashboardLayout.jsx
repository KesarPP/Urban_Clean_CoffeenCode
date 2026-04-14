import { useState, useEffect } from 'react';
import { LayoutDashboard, Map, FileText, BarChart3, LogOut, Calendar, Trash2, Droplets, AlertTriangle, CheckCircle, Sun, Moon } from 'lucide-react';
import StatCard from './StatCard';
import MapView from './MapView';
import DataTable from './DataTable';
import AdminEvents from './AdminEvents';
import AdminNgoPanel from './AdminNgoPanel';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import { ProfitChart, HourlyWasteChart, CaseDistributionPieChart } from './ChartPanels';

export default function DashboardLayout({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(localStorage.getItem('admin-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Waste Atlas Global Benchmarks (Real Data Context)
  const atlasStats = [
    { label: 'Annual Generation', value: '2.01B T', icon: Trash2, color: 'text-text-primary', bg: 'bg-[var(--input-bg)]', sub: 'Global MSW' },
    { label: 'Organic Diversion', value: '44%', icon: Droplets, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: 'Food & Green' },
    { label: 'Plastic Impact', value: '12%', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'Non-Biodegradable' },
    { label: 'Recovery Rate', value: '19%', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: 'Recycling/Compost' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'events', label: 'Events & Activities', icon: Calendar },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'reports', label: 'Citizen Reports', icon: FileText },
    { id: 'ngos', label: 'NGO Ops', icon: CheckCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
             System Dashboard <span className="mx-2 opacity-20">|</span> 
             <span className="text-primary font-black uppercase">Welcome, {user?.name}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Real-time smart city IoT & operations monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2.5 bg-[var(--card-bg)] hover:bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-text-secondary hover:text-primary transition-all"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-[var(--card-bg)] hover:bg-red-500/10 border border-[var(--border-color)] hover:border-red-500/50 rounded-xl text-sm font-bold transition-all text-red-500 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-[var(--border-color)] hide-scrollbar">
        {tabs.map(tab => {
           const active = activeTab === tab.id;
           return (
             <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${active ? 'bg-primary text-white shadow-glow-primary scale-105' : 'bg-[var(--input-bg)] text-text-secondary hover:text-text-primary hover:bg-[var(--border-color)] border border-[var(--border-color)]'}`}
             >
                <tab.icon className="h-5 w-5" /> {tab.label}
             </button>
           );
        })}
      </div>

      <div className="relative">
        
        {/* Tab: Events Management */}
        {activeTab === 'events' && (
          <div className="animate-fade-in w-full">
            <AdminEvents />
          </div>
        )}
        
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <AdminDashboard user={user} />
          </div>
        )}

        {/* Tab 2: Live Map */}
        {activeTab === 'map' && (
          <div className="h-[75vh] w-full animate-fade-in">
            <MapView spanClass="h-full w-full rounded-2xl shadow-sm" />
          </div>
        )}

        {/* Tab 3: Citizen Reports */}
        {activeTab === 'reports' && (
          <div className="min-h-[75vh] animate-fade-in">
            <DataTable user={user} spanClass="w-full h-full" />
          </div>
        )}

        {/* Tab 4: NGO Operations */}
        {activeTab === 'ngos' && (
          <div className="min-h-[75vh] animate-fade-in">
            <AdminNgoPanel />
          </div>
        )}

        {/* Tab 5: Analytics */}
        {activeTab === 'analytics' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Top Stat Bar - Sync with Atlas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {atlasStats.map((s, idx) => (
                <div key={idx} className="bg-[var(--card-bg)] p-5 rounded-2xl shadow-soft border border-[var(--border-color)] flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{s.label}</p>
                    <div className="flex flex-col">
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] font-black uppercase tracking-tighter text-text-secondary opacity-40">{s.sub}</p>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-lg ${s.bg} border border-[var(--border-color)] group-hover:scale-110 transition-transform`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfitChart spanClass="col-span-1 min-h-[450px]" />
              <HourlyWasteChart spanClass="col-span-1 min-h-[450px]" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
