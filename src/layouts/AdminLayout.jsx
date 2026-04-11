import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <main className="flex-grow p-4 md:p-8 h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
