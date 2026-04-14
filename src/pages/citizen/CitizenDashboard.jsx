import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, RotateCcw, Image as ImageIcon, MapPin, Calendar, ArrowRight, Award, Flame, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import WhatsAppFloatingButton from '../../components/WhatsAppFloatingButton';

export default function CitizenDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock Firebase Fetch
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, 'citizen_reports'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedReports = [];
        querySnapshot.forEach((doc) => {
          fetchedReports.push({ id: doc.id, ...doc.data() });
        });
        setReports(fetchedReports);
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getStatusIcon = (status) => {
    if (status.includes('Pending')) return <Clock className="h-5 w-5 text-accentYellow" />;
    if (status.includes('Progress')) return <RotateCcw className="h-5 w-5 text-primary" />;
    if (status.includes('Solved')) return <CheckCircle2 className="h-5 w-5 text-accentGreen" />;
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 relative z-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-3">My Report History</h1>
          <p className="text-text-secondary text-lg max-w-xl">Track the live status of all civic issues you have submitted. Watch resolving actions in real-time.</p>
        </div>
        <Link to="/citizen/report" className="shrink-0 px-6 py-3 bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-gray-500 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm">
          New Report <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Gamification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-accentYellow flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accentYellow/10 flex items-center justify-center shrink-0">
            <Star className="h-6 w-6 text-accentYellow" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Citizen Impact Score</p>
            <h2 className="text-2xl font-bold text-text-primary">{1250 + (reports.length * 50)} <span className="text-xs text-accentYellow font-normal ml-1">PTS</span></h2>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-primary flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Active Streak</p>
            <h2 className="text-2xl font-bold text-text-primary">3 <span className="text-xs text-primary font-normal ml-1">Weeks</span></h2>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-t-2 border-t-accentGreen flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accentGreen/10 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6 text-accentGreen" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Success Track Record</p>
            <h2 className="text-2xl font-bold text-text-primary">{reports.filter(r => r.status.includes('Solved') || r.status.includes('Resolved')).length} <span className="text-xs text-accentGreen font-normal ml-1">Issues Fixed</span></h2>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl h-40 animate-pulse border border-[var(--border-color)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={report.id}
              className="glass-card p-6 md:p-8 rounded-2xl border border-[var(--border-color)] hover:border-text-secondary transition-colors group relative overflow-hidden shadow-sm"
            >
              {/* Subtle background glow based on status */}
              <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none transition-all group-hover:opacity-30 ${report.bg}`} />

              <div className="flex flex-col lg:flex-row gap-8 relative z-10">

                {/* Simulated/Actual Camera Proof Thumbnail */}
                <div className="w-full lg:w-48 h-32 shrink-0 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl flex items-center justify-center relative overflow-hidden">
                  {report.image_proof ? (
                    <img src={report.image_proof} alt="Proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center z-10">
                      <ImageIcon className="h-8 w-8 text-text-secondary opacity-50 mb-2" />
                      <span className="text-xs font-mono text-text-secondary opacity-75">GEO-STAMPED</span>
                    </div>
                  )}
                </div>

                {/* Report Details */}
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                          ID: {report.id.substring(0, 8).toUpperCase()}
                        </span>
                        <h3 className="font-bold text-2xl text-text-primary">{report.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {report.date}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {report.location}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-4 py-2 rounded-full flex flex-wrap items-center gap-2 font-semibold text-sm ${report.bg} ${report.color}`}>
                      {getStatusIcon(report.status)}
                      {report.status}
                    </div>
                  </div>

                  <p className="text-text-secondary text-base leading-relaxed p-4 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl">
                    "{report.description}"
                  </p>
                </div>
              </div>

            </motion.div>
          ))}

          {reports.length === 0 && (
            <div className="text-center py-20 glass-card rounded-2xl border border-dashed border-[var(--border-color)] shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-text-secondary opacity-50 mx-auto mb-4" />
              <p className="text-text-secondary text-lg font-medium">You haven't reported any issues yet.</p>
              <p className="text-text-secondary opacity-75 text-sm mt-2">Help keep the city clean by reporting problems you see.</p>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatingButton />
    </div>
  );
}
