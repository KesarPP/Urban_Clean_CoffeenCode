import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Calendar, MapPin, Users, HeartHandshake, Waves, Trash2, Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    return [13.0400, 80.2600]; // Fallback coordinates if not found
  };

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(activitiesData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching events:", err);
      // Don't show confusing error if rules are blocked initially
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        createdAt: serverTimestamp()
      });

      setSuccess('Event created successfully!');
      // Reset form
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Create Event Form */}
      <div className="xl:col-span-1">
        <div className="glass-card rounded-2xl p-6 sticky top-6">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2 mb-6">
            <Plus className="h-5 w-5 text-primary" /> Create New Event
          </h2>

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

      {/* Events List */}
      <div className="xl:col-span-2 space-y-4 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
        <h2 className="text-xl font-bold text-text-primary mb-2">Live Events & Activities</h2>
        
        {loading ? (
           <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : events.length === 0 ? (
           <div className="glass-card p-10 rounded-2xl text-center border-dashed border-[var(--border-color)]">
              <p className="text-text-secondary">No events created yet. Use the form to broadcast a new activity.</p>
           </div>
        ) : (
          events.map(activity => (
            <motion.div key={activity.id} initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="glass-card p-5 rounded-2xl border border-[var(--border-color)] flex flex-col md:flex-row gap-5 relative overflow-hidden group">
               <div className={`absolute left-0 top-0 bottom-0 w-1 ${activity.type === 'beach' ? 'bg-blue-500' : 'bg-green-500'}`} />
               
               <div className="flex-grow">
                 <div className="flex items-center gap-2 mb-1">
                   <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${activity.type === 'beach' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                     {activity.type === 'beach' ? 'Beach Cleanup' : 'NGO Drive'}
                   </span>
                 </div>
                 <h3 className="text-lg font-bold text-text-primary mb-1">{activity.title}</h3>
                 <p className="text-sm text-text-secondary mb-3 pt-1">{activity.description}</p>
                 
                 <div className="grid grid-cols-2 md:flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                   <span className="flex items-center gap-1"><HeartHandshake className="w-3.5 h-3.5 text-primary" /> {activity.ngo}</span>
                   <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary" /> {activity.date}</span>
                   <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-accentYellow" /> {activity.location}</span>
                   <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-accentGreen" /> {activity.registered}/{activity.spots} Spots</span>
                 </div>
               </div>

               <div className="flex flex-row md:flex-col justify-end gap-2 md:min-w-[120px] pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[var(--border-color)] md:pl-4">
                 <button 
                   onClick={() => handleDelete(activity.id)}
                   className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors"
                 >
                   <Trash2 className="w-4 h-4" /> Remove
                 </button>
               </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
