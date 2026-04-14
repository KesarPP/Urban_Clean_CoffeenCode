import { useState } from 'react';
import { Search, MapPin, Calendar, Clock, RotateCcw, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import WhatsAppFloatingButton from '../../components/WhatsAppFloatingButton';

export default function TrackComplaint() {
  const [trackingId, setTrackingId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    // Remove any 'EC-' prefix if user typed it
    const searchId = trackingId.replace(/^EC-?/i, '').trim();

    try {
      const docRef = doc(db, 'citizen_reports', searchId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setResult({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Fallback: If they pasted the truncated 8-character ID exactly as seen in CitizenDashboard
        const qSnapshot = await getDocs(collection(db, 'citizen_reports'));
        const matchedDoc = qSnapshot.docs.find(d =>
          d.id.toUpperCase().startsWith(searchId.toUpperCase())
        );

        if (matchedDoc) {
          setResult({ id: matchedDoc.id, ...matchedDoc.data() });
        } else {
          setError('No complaint found with this Tracking ID. Please check and try again.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while tracking the complaint.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status.includes('Pending')) return <Clock className="h-6 w-6 text-accentYellow" />;
    if (status.includes('Progress')) return <RotateCcw className="h-6 w-6 text-primary" />;
    if (status.includes('Solved')) return <CheckCircle2 className="h-6 w-6 text-accentGreen" />;
    return <AlertCircle className="h-6 w-6 text-gray-400" />;
  };

  const statusColors = {
    'Pending Review': 'text-accentYellow bg-accentYellow/10 border-accentYellow/20',
    'In Progress (Dispatched)': 'text-primary bg-primary/10 border-primary/20',
    'Solved & Cleaned': 'text-accentGreen bg-accentGreen/10 border-accentGreen/20',
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-2xl mx-auto">

        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary mb-8 transition-colors group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 gradient-text text-text-primary">Track Your Complaint</h1>
          <p className="text-text-secondary text-lg">Enter your tracking ID to see the real-time status of your report.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative group">
            <input
              type="text"
              placeholder="e.g. EC-12345"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              className="w-full px-6 py-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl text-lg text-text-primary focus:outline-none focus:border-primary transition-all group-hover:border-[var(--border-color)] pr-16 placeholder:text-text-secondary placeholder:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 px-4 bg-primary hover:bg-blue-600 text-white rounded-xl transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <RotateCcw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </button>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-accentRed text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </motion.p>
          )}
        </form>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 rounded-3xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="flex flex-wrap justify-between items-start gap-6 mb-8 relative z-10">
                <div>
                  <span className="text-xs font-bold tracking-widest text-primary uppercase mb-2 block">Tracking ID: {result.id.substring(0, 8).toUpperCase()}</span>
                  <h2 className="text-2xl md:text-3xl font-bold">{result.title}</h2>
                </div>
                <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm ${statusColors[result.status] || ''}`}>
                  {getStatusIcon(result.status)}
                  {result.status}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border-color)]">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-50">Reported On</p>
                      <p className="text-text-primary font-medium">{result.date}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] flex items-center justify-center border border-[var(--border-color)]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider font-semibold opacity-50">Location</p>
                      <p className="text-text-primary font-medium">{result.location}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-[var(--input-bg)] rounded-2xl border border-[var(--border-color)] relative z-10">
                <p className="text-text-secondary text-sm mb-2 font-semibold uppercase tracking-wider opacity-50">Description</p>
                <p className="text-text-primary leading-relaxed">
                  "{result.description}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WhatsApp Floating Button */}
        <WhatsAppFloatingButton />
      </div>
    </div>
  );
}
