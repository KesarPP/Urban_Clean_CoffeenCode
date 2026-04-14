import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from '../firebase/config';

export default function AuthPage({ setUser }) {
  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const initRole = searchParams.get('role') === 'ngo' ? 'ngo' : 'citizen';
  const [activeTab, setActiveTab] = useState(initTab);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState(initRole);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (activeTab === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        let role = 'citizen';
        let displayName = user.displayName;
        
        // Fetch role from Firestore (fail softly if permissions missed)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
             role = userDoc.data().role || 'citizen';
             displayName = userDoc.data().name || user.displayName;
          }
        } catch (e) {
          console.warn("Could not fetch user role from Firestore, defaulting to citizen:", e);
        }
        
        setUser({ uid: user.uid, role, name: displayName || 'Citizen', email: user.email });
        navigate(`/${role}/dashboard`);
      } else {
        if (email && password && name) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          try {
            await updateProfile(user, { displayName: name });
            await setDoc(doc(db, 'users', user.uid), {
              name: name,
              email: user.email,
              role: signupRole,
              ngo_verified: signupRole === 'ngo' ? false : null,
              ngo_description: signupRole === 'ngo' ? '' : null,
              ngo_focus_areas: signupRole === 'ngo' ? [] : null,
              ngo_coverage: signupRole === 'ngo' ? '' : null,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn("Could not save user profile to Firestore:", e);
          }

          setUser({ uid: user.uid, role: signupRole, name: name, email: user.email });
          navigate(`/${signupRole}/dashboard`);
        } else {
          setError('Please fill in all fields.');
        }
      }
    } catch (err) {
      console.error("Auth Failure:", err);
      setError(err.message || 'Authentication failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accentGreen/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-2xl p-8 relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 text-text-primary">Welcome Back</h2>
            <p className="text-text-secondary">Stay connected to your smart city.</p>
          </div>

          {/* Auth Tabs */}
          <div className="flex p-1 bg-[var(--input-bg)] rounded-lg mb-8">
            <button
               onClick={() => setActiveTab('login')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'login' ? 'bg-[var(--card-bg)] text-primary shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Sign In
            </button>
            <button
               onClick={() => setActiveTab('signup')}
               className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'signup' ? 'bg-[var(--card-bg)] text-primary shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {activeTab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary placeholder:opacity-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary placeholder:opacity-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123" 
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary placeholder:opacity-50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" 
                />
              </div>
            </div>

            {activeTab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Account Type</label>
                <select
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="citizen">Citizen</option>
                  <option value="ngo">NGO</option>
                </select>
              </div>
            )}

            <button type="submit" className="w-full py-3.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all glow-primary">
              {activeTab === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
