import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Calendar, MapPin, Users, HeartHandshake, Trash2, Plus, Loader2, Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('ngo');
  const [ngo, setNgo] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [spots, setSpots] = useState(50);

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

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setEvents(activitiesData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching events:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Admin creates events directly as approved
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
        ngo,
        date: new Date(date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        location,
        coords: coords,
        spots: parseInt(spots, 10),
        registered: 0,
        createdAt: serverTimestamp(),
        // Admin-created events are auto-approved
        created_by_uid: 'admin',
        created_by_name: 'Admin',
        approval_status: 'approved'
      });

      setSuccess('Event published successfully!');
      setTitle('');
      setDescription('');
      setNgo('');
      setDate('');
      setLocation('');
      setSpots(50);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to create event. ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event.");
    }
  };

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, 'activities', id), {
        approval_status: 'approved'
      });
    } catch (err) {
      console.error("Error approving event:", err);
      alert("Failed to approve event.");
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      await updateDoc(doc(db, 'activities', id), {
        approval_status: 'rejected',
        rejection_reason: rejectReason.trim()
      });
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      console.error("Error rejecting event:", err);
      alert("Failed to reject event.");
    }
  };

  // Categorize events
  const pendingEvents = events.filter(e => e.approval_status === 'pending');
  const approvedEvents = events.filter(e => !e.approval_status || e.approval_status === 'approved');
  const rejectedEvents = events.filter(e => e.approval_status === 'rejected');

  const tabs = [
    { id: 'pending', label: 'Pending Approval', count: pendingEvents.length, color: 'text-amber-500', activeBg: 'bg-amber-500' },
    { id: 'approved', label: 'Approved & Live', count: approvedEvents.length, color: 'text-emerald-500', activeBg: 'bg-emerald-500' },
    { id: 'rejected', label: 'Rejected', count: rejectedEvents.length, color: 'text-red-500', activeBg: 'bg-red-500' },
    { id: 'create', label: 'Create Event', count: null, color: 'text-primary', activeBg: 'bg-primary' },
  ];

  const displayEvents = activeTab === 'pending' ? pendingEvents : activeTab === 'approved' ? approvedEvents : activeTab === 'rejected' ? rejectedEvents : [];

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${active
                ? `${tab.activeBg} text-white shadow-lg`
                : 'bg-[var(--input-bg)] text-text-secondary hover:text-text-primary border border-[var(--border-color)]'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-[var(--border-color)]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Create Event Form */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2 mb-6">
              <Plus className="h-5 w-5 text-primary" /> Create & Publish Event
            </h2>
            <p className="text-xs text-text-secondary mb-4">Admin-created events are published immediately without approval.</p>

            {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm mb-4 border border-red-500/20">{error}</div>}
            {success && <div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm mb-4 border border-green-500/20">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Event Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Marina Beach Cleanup" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none">
                    <option value="ngo">NGO Drive</option>
                    <option value="beach">Beach Cleanup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Capacity (Spots)</label>
                  <input type="number" required min="1" value={spots} onChange={e => setSpots(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Organizer / NGO Name</label>
                <input type="text" required value={ngo} onChange={e => setNgo(e.target.value)} placeholder="e.g. Ocean Savers India" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Date & Time</label>
                <input type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>

              <div>
                 <label className="block text-xs font-medium text-text-secondary mb-1">Location Details (Will be mapped automatically)</label>
                 <input type="text" required value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Marina Beach, Chennai" className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows="3" placeholder="Describe the activity..." className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none resize-none" />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-3 bg-primary hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-glow-primary transition-colors flex items-center justify-center gap-2 mt-4">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Events List (for pending/approved/rejected tabs) */}
      {activeTab !== 'create' && (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
             <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : displayEvents.length === 0 ? (
             <div className="glass-card p-10 rounded-2xl text-center border-dashed border-[var(--border-color)]">
                <p className="text-text-secondary">
                  {activeTab === 'pending' ? 'No events pending approval.' : activeTab === 'rejected' ? 'No rejected events.' : 'No live events yet.'}
                </p>
             </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayEvents.map(activity => (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-5 rounded-2xl border border-[var(--border-color)] relative overflow-hidden group"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${activity.type === 'beach' ? 'bg-blue-500' : 'bg-green-500'}`} />
                  
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${activity.type === 'beach' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                          {activity.type === 'beach' ? 'Beach Cleanup' : 'NGO Drive'}
                        </span>
                        {/* Source Badge */}
                        {activity.created_by_uid && activity.created_by_uid !== 'admin' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            NGO Proposed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Admin Created
                          </span>
                        )}
                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                          activity.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          activity.approval_status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {activity.approval_status === 'approved' ? <CheckCircle2 size={10} /> : activity.approval_status === 'rejected' ? <XCircle size={10} /> : <Clock size={10} />}
                          {activity.approval_status === 'approved' ? 'Live' : activity.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-text-primary mb-1">{activity.title}</h3>
                      {activity.created_by_name && activity.created_by_uid !== 'admin' && (
                        <p className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                          <ShieldCheck size={11} /> Proposed by: {activity.created_by_name}
                        </p>
                      )}
                      <p className="text-sm text-text-secondary mb-3 pt-1">{activity.description}</p>
                      
                      <div className="grid grid-cols-2 md:flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                        <span className="flex items-center gap-1"><HeartHandshake className="w-3.5 h-3.5 text-primary" /> {activity.ngo}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" /> {activity.date}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-accentYellow" /> {activity.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-accentGreen" /> {activity.registered}/{activity.spots} Spots</span>
                      </div>

                      {activity.approval_status === 'rejected' && activity.rejection_reason && (
                        <div className="mt-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-400">
                          <strong>Rejection Reason:</strong> {activity.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row md:flex-col justify-end gap-2 md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[var(--border-color)] md:pl-4 shrink-0">
                      {/* Approve/Reject for pending */}
                      {activity.approval_status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(activity.id)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg text-sm font-bold transition-colors border border-emerald-500/20"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve
                          </button>
                          {rejectingId === activity.id ? (
                            <div className="space-y-2">
                              <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-text-primary focus:outline-none"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReject(activity.id)}
                                  className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                  className="flex-1 px-2 py-1.5 bg-[var(--input-bg)] text-text-secondary rounded-lg text-xs"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setRejectingId(activity.id)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg text-sm font-bold transition-colors border border-red-500/20"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          )}
                        </>
                      )}

                      {/* Delete for all */}
                      <button 
                        onClick={() => handleDelete(activity.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
