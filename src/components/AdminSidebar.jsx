import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MapPinned, BarChart3, Settings, LogOut } from 'lucide-react';

export default function AdminSidebar() {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Map View', icon: MapPinned, path: '/admin/map' },
    { name: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <aside className="w-64 bg-[var(--card-bg)] border-r border-[var(--border-color)] hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[var(--border-color)]">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Urban Admin</h2>
        <p className="text-sm text-text-secondary mt-1">Control Center</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-primary text-white font-medium shadow-sm' 
                  : 'text-text-secondary hover:bg-[var(--input-bg)] hover:text-text-primary'
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)]">
        <Link 
          to="/admin/login" 
          className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-all font-medium"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Link>
      </div>
    </aside>
  );
}
