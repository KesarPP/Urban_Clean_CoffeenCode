import { motion } from 'framer-motion';
import { ArrowRight, Users, ShieldCheck, MapPin, LayoutDashboard, BookOpen, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-[-1] opacity-30 md:opacity-50">
        <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-accent-green/20 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-bold uppercase tracking-widest mb-6 border shadow-sm">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              Unified City Management Portal
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-text-primary">
              Welcome to <span className="gradient-text">UrbanClean</span>
            </h1>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Choose your portal to begin contributing to a cleaner, more sustainable urban environment.
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
        >
          {/* Citizen Path */}
          <motion.div variants={itemVariants}>
            <Link to="/auth" className="group block h-full">
              <div className="glass-emerald p-8 md:p-10 rounded-[2.5rem] h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-glow-green relative overflow-hidden bg-[var(--card-bg)]/40 border border-[var(--border-color)]">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={120} className="text-accent-green" />
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-accent-green/20 rounded-2xl flex items-center justify-center mb-8 border border-accent-green/30 shadow-inner">
                    <MapPin className="text-accent-green" size={28} />
                  </div>
                  <h2 className="text-3xl font-black mb-4 text-text-primary group-hover:text-accent-green transition-colors">Citizen Portal</h2>
                  <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                    Report waste issues, track collection status, and participate in local sustainability initiatives.
                  </p>
                  <div className="inline-flex items-center gap-2 text-accent-green font-black group-hover:gap-4 transition-all uppercase tracking-wider text-sm">
                    Access as Citizen <ArrowRight size={20} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Official Path */}
          <motion.div variants={itemVariants}>
            <Link to="/admin-login" className="group block h-full">
              <div className="glass-slate p-8 md:p-10 rounded-[2.5rem] h-full transition-all duration-500 hover:scale-[1.02] hover:shadow-glow-primary relative overflow-hidden bg-[var(--card-bg)]/40 border border-[var(--border-color)]">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={120} className="text-primary" />
                </div>
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center mb-8 border border-primary/30 shadow-inner">
                    <LayoutDashboard className="text-primary" size={28} />
                  </div>
                  <h2 className="text-3xl font-black mb-4 text-text-primary group-hover:text-primary transition-colors">Official Portal</h2>
                  <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                    Monitor metropolitan waste metrics, dispatch collection units, and manage city-wide resources.
                  </p>
                  <div className="inline-flex items-center gap-2 text-primary font-black group-hover:gap-4 transition-all uppercase tracking-wider text-sm">
                    Manage as Official <ArrowRight size={20} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Active Prevention Promotion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 max-w-4xl mx-auto"
        >

        </motion.div>
      </div>
    </div>
  );
}
