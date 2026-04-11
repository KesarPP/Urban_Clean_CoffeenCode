import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, UserCog } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';

export default function AdminLogin({ setUser }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Static Login for presentation/demo purposes
    setTimeout(() => {
      if (email === 'admin' && password === '123') {
        setUser({ role: 'admin', name: 'System Admin', email: 'admin@city.gov' });
        navigate('/admin/dashboard');
      } else {
        setError('Invalid admin credentials. Use admin / 123');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[var(--bg)] pt-20">
      <Navbar isAdminLogin={true} user={null} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accentRed/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary mb-2">City Admin Portal</h2>
          <p className="text-sm text-text-secondary">Authorized personnel only.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="glass-card rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Admin Username</label>
            <div className="relative">
              <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-glow-primary">
            {loading ? 'Authenticating...' : 'Secure Login'} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
