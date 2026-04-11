import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Leaf, Box, LogIn, Sun, Moon, Search, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar({ user, onLogout, isAdminLogin }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navLinks = isAdminLogin ? [
    { name: 'Home', path: '/' },
  ] : user ? [
    { name: 'Dashboard', path: '/citizen/dashboard' },
    { name: 'Education', path: '/citizen/education' },
    { name: 'Report Issue', path: '/citizen/report' },
    { name: 'Track', path: '/track' },
    { name: 'Activities', path: '/citizen/activities' },
  ] : [
    { name: 'Home', path: '/' },
    { name: 'Education', path: '/citizen/education' },
    { name: 'Track', path: '/track' },
    { name: 'Report Issue', path: '/citizen/report' },
  ];

  return (
    <nav className="fixed top-0 w-full bg-[var(--card-bg)]/80 backdrop-blur-md border-b border-[var(--border-color)] z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Box className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl text-text-primary tracking-tight break-words max-w-[200px] md:max-w-none hover:text-primary transition-colors">
                UrbanClean
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center justify-center space-x-8 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.path ? 'gradient-text font-bold' : 'text-text-secondary'
                  }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--input-bg)] text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="h-6 w-px bg-[var(--border-color)] mx-2" />

            {!isAdminLogin && (
              <>
                {user ? (
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-text-primary bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-primary/50 rounded-lg transition-all font-bold shadow-sm"
                  >
                    Log Out
                  </button>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-text-primary bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-primary/50 rounded-lg transition-all font-bold"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/auth?tab=signup"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-600 rounded-lg shadow-glow-primary transition-all duration-300 font-bold"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-4 md:hidden">
            {/* Theme Toggle Mobile */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--input-bg)] text-text-secondary hover:text-text-primary transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-text-secondary hover:text-text-primary">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[var(--card-bg)] border-t border-[var(--border-color)] px-2 pt-2 pb-3 space-y-1 sm:px-3 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === link.path
                ? 'bg-[var(--input-bg)] text-primary'
                : 'text-text-secondary hover:bg-[var(--input-bg)] hover:text-text-primary'
                }`}
            >
              {link.name}
            </Link>
          ))}
          {!user && (
            <div className="pt-4 pb-2 border-t border-[var(--border-color)] mt-4 space-y-2">
              <Link
                to="/auth"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center px-4 py-3 text-text-primary bg-[var(--input-bg)] rounded-xl font-bold"
              >
                Log In
              </Link>
              <Link
                to="/auth?tab=signup"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center px-4 py-3 text-white bg-primary rounded-xl font-bold shadow-glow-primary"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
