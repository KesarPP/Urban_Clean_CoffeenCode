import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CitizenLayout() {
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}
