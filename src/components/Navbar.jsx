import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Report Issue', path: '/report' },
    { name: 'My Reports', path: '/my-reports' },
  ];

  return (
    <nav className="fixed top-0 w-full bg-[var(--card-bg)] border-b border-[var(--border-color)] shadow-sm z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl text-text-primary tracking-tight">UrbanClean</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path ? 'text-primary font-bold' : 'text-text-secondary'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-text-secondary hover:text-text-primary transition-colors">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[var(--card-bg)] border-t border-[var(--border-color)] px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-lg animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === link.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-[var(--input-bg)] hover:text-text-primary'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
