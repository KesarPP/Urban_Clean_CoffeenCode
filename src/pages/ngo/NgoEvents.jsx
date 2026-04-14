import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Calendar, MapPin, Users, Plus, Loader2, Clock, CheckCircle2, XCircle, HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NgoEvents({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ngo');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [spots, setSpots] = useState(50);

  useEffect(() => {
    if (!user?.uid) return;

    // Only fetch events created by this NGO
    const q = query(collection(db, 'activities'), where('created_by_uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setEvents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching NGO events:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const geocodeLocation = async (address) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', India')}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
    return [13.0400, 80.2600];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const coords = await geocodeLocation(location);

      await addDoc(collection(db, 'activities'), {
        title,
        description,
        type,
        ngo: user.name || 'NGO',
        date: new Date(date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        location,
        coords,
        spots: parseInt(spots, 10),
        registered: 0,
        createdAt: serverTimestamp(),
        // NGO approval fields
        created_by_uid: user.uid,
        created_by_name: user.name || 'NGO',
        approval_status: 'pending', // pending | approved | rejected
        rejection_reason: null
      });

      setSuccess('Event submitted for admin approval!');
      setTitle('');
      setDescription('');
      setDate('');
      setLocation('');
      setSpots(50);
      setShowForm(false);

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError('Failed to submit event. ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return { icon: CheckCircle2, text: 'Approved', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    if (status === 'rejected') return { icon: XCircle, text: 'Rejected', cls: 'bg-red-500/10 text-red-500 border-red-500/20' };
    return { icon: Clock, text: 'Pending Approval', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(125deg,rgba(59,130,246,0.12),rgba(16,185,129,0.08))] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-text-secondary">NGO Events</p>
            <h1 className="text-3xl md:text-4xl font-black text-text-primary mt-1">Propose Activities</h1>
            <p className="text-text-secondary mt-2">Create cleanup drives and community events. Admin will review and approve them.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 bg-primary hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-glow-primary transition-all flex items-center gap-2 shrink-0"
          >
            <Plus size={16} /> {showForm ? 'Close Form' : 'Propose New Event'}
          </button>
        </div>
      </section>

      {/* Status Messages */}
      {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-sm border border-red-500/20">{error}</div>}
      {success && <div className="bg-emerald-500/10 text-emerald-500 p-3 rounded-xl text-sm border border-emerald-500/20">{success}</div>}

      {/* Create Event Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 border border-[var(--border-color)]"
        >
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-5">
            <Plus className="h-5 w-5 text-primary" /> New Event Proposal
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Event Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Marina Beach Cleanup" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none">
                  <option value="ngo">NGO Drive</option>
                  <option value="beach">Beach Cleanup</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Capacity (Spots)</label>
                <input type="number" required min="1" value={spots} onChange={e => setSpots(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Date & Time</label>
              <input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Location (auto-mapped)</label>
              <input type="text" required value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Marina Beach, Chennai" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <textarea required value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="Describe the activity..." className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none resize-none" />
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3 bg-primary hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-glow-primary transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Approval'}
            </button>
          </form>
        </motion.div>
      )}

      {/* My Events List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">My Proposed Events</h2>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
          <div className="glass-card p-10 rounded-2xl text-center border-dashed border border-[var(--border-color)]">
            <p className="text-text-secondary">You haven't proposed any events yet. Use the button above to get started.</p>
          </div>
        ) : (
          events.map(event => {
            const badge = getStatusBadge(event.approval_status);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-5 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.type === 'beach' ? 'bg-blue-500' : 'bg-green-500'}`} />

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${event.type === 'beach' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                        {event.type === 'beach' ? 'Beach Cleanup' : 'NGO Drive'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.cls}`}>
                        <badge.icon size={10} /> {badge.text}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-1">{event.title}</h3>
                    <p className="text-sm text-text-secondary mb-3">{event.description}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" /> {event.date}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-accentYellow" /> {event.location}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-accentGreen" /> {event.registered}/{event.spots} Spots</span>
                    </div>

                    {event.approval_status === 'rejected' && event.rejection_reason && (
                      <div className="mt-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                        <strong>Rejection Reason:</strong> {event.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
