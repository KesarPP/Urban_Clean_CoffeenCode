import { Link } from 'react-router-dom';
import { Box, Mail, Phone, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-cards/80 border-t border-gray-800 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Box className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl text-textPrimary tracking-tight">Urban Cleanliness</span>
            </Link>
            <p className="text-textSecondary text-sm max-w-sm">
              The all-in-one smart city platform for monitoring resource management and tracking urban infrastructure gaps.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-textSecondary">
              <li><Link to="/citizen/report" className="hover:text-primary transition-colors">Report an Issue</Link></li>
              <li><Link to="/admin/dashboard" className="hover:text-primary transition-colors">Explorer Dashboard</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Citizen Login</Link></li>
              <li><Link to="/admin-login" className="hover:text-primary transition-colors">Admin Login</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-textPrimary mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <Globe className="h-5 w-5" />
              </a>
              <a href="#" className="text-textSecondary hover:text-primary transition-colors">
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 text-sm text-textSecondary flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Urban Cleanliness & Resource Monitoring System. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-textPrimary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-textPrimary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
