import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';

// Layout & Global Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import AdminLogin from './pages/admin/AdminLogin';
import ReportIssue from './components/ReportIssue';
import DashboardLayout from './components/dashboard/DashboardLayout';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import Activities from './pages/citizen/Activities';
import TrackComplaint from './pages/citizen/TrackComplaint';
import EducationHub from './pages/citizen/EducationHub';
import CitizenChatbot from './components/citizen/CitizenChatbot';
import NgoDashboard from './pages/ngo/NgoDashboard';
import NgoProfile from './pages/ngo/NgoProfile';
import { useTheme } from './context/ThemeContext';
import { Sun, Moon, Loader2 } from 'lucide-react';

// Floating Toggle for pages without Navbar
function FloatingThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-[100] p-3 rounded-full bg-[var(--card-bg)] border border-[var(--border-color)] shadow-xl hover:scale-110 transition-all text-text-secondary hover:text-text-primary"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
}

// Secure Route Guard
function ProtectedRoute({ user, role, children }) {
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!user) return <Navigate to={allowedRoles.includes('admin') ? '/admin-login' : '/auth'} replace />;
  if (!allowedRoles.includes(user.role)) {
    // Prevent citizens from accessing admin, and vice versa
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return children;
}

// Sub-Applications for specific roles
function CitizenApp({ user, onLogout }) {
  return (
    <ProtectedRoute user={user} role="citizen">
      <div className="min-h-screen flex flex-col pt-16">
        <Navbar user={user} onLogout={onLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="dashboard" element={<CitizenDashboard />} />
            <Route path="report" element={<ReportIssue />} />
            <Route path="activities" element={<Activities />} />
            <Route path="education" element={<EducationHub />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
        <CitizenChatbot />
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

function AdminApp({ user, onLogout }) {
  return (
    <ProtectedRoute user={user} role="admin">
      {/* Admins get a full-screen dashboard without the citizen navbar/footer */}
      <div className="min-h-screen bg-[var(--bg)]">
        <main className="h-screen overflow-y-auto w-full">
          <Routes>
            <Route path="dashboard" element={<DashboardLayout user={user} onLogout={onLogout} />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function NgoApp({ user, onLogout }) {
  return (
    <ProtectedRoute user={user} role="ngo">
      <div className="min-h-screen flex flex-col pt-16">
        <Navbar user={user} onLogout={onLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="dashboard" element={<NgoDashboard user={user} />} />
            <Route path="profile" element={<NgoProfile user={user} />} />
            <Route path="*" element={<Navigate to="dashboard" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const role = userDoc.exists() ? userDoc.data().role : 'citizen';
          const name = userDoc.exists() ? userDoc.data().name : firebaseUser.displayName;
          setUser({ 
            uid: firebaseUser.uid,
            role, 
            name: name || (role === 'admin' ? 'System Admin' : 'Citizen'), 
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || null
          });
        } catch (error) {
          console.warn("Error fetching user data from Firestore (defaulting to citizen):", error);
          setUser({ uid: firebaseUser.uid, role: 'citizen', name: firebaseUser.displayName || 'Citizen', email: firebaseUser.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Facing Marketing Pages */}
      <Route path="/" element={
        <div className="min-h-screen flex flex-col">
          <main className="flex-grow"><LandingPage /></main>
          <FloatingThemeToggle />
        </div>
      } />

      <Route path="/track" element={
        <div className="min-h-screen flex flex-col pt-16">
          <Navbar user={user} onLogout={handleLogout} />
          <main className="flex-grow"><TrackComplaint /></main>
          <Footer />
        </div>
      } />
      
      {/* Citizen Authentication */}
      <Route path="/auth" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : 
        <div className="min-h-screen flex flex-col pt-16">
          <Navbar user={null} />
          <main className="flex-grow"><AuthPage setUser={setUser} /></main>
          <Footer />
        </div>
      } />

      {/* Admin Authentication */}
      <Route path="/admin-login" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <AdminLogin setUser={setUser} />
      } />

      {/* Role-Based Secure Portals */}
      <Route path="/citizen/*" element={<CitizenApp user={user} onLogout={handleLogout} />} />
      <Route path="/admin/*" element={<AdminApp user={user} onLogout={handleLogout} />} />
      <Route path="/ngo/*" element={<NgoApp user={user} onLogout={handleLogout} />} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
