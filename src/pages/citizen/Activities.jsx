import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Navigation, HeartHandshake, Waves, Loader2, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const EVENT_TYPE_META = {
  beach: {
    label: 'Beach Cleanup',
    glow: 'bg-blue-500',
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    progress: 'bg-blue-500',
    filterText: 'text-blue-400',
    icon: Waves,
  },
  ngo: {
    label: 'NGO Drive',
    glow: 'bg-green-500',
    badge: 'bg-green-500/20 text-green-400 border border-green-500/30',
    progress: 'bg-green-500',
    filterText: 'text-green-400',
    icon: HeartHandshake,
  },
  special: {
    label: 'Special Event',
    glow: 'bg-amber-500',
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    progress: 'bg-amber-500',
    filterText: 'text-amber-400',
    icon: Sparkles,
  },
};

export default function Activities() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const { theme } = useTheme();

  const handleRegister = async (activity) => {
    if (activity.registered >= activity.spots) return alert("Sorry, this event is full!");
    if (myEvents.includes(activity.id)) return;
    
    setRegistering(activity.id);
    try {
      const eventRef = doc(db, 'activities', activity.id);
      await updateDoc(eventRef, {
        registered: increment(1)
      });
      setMyEvents([...myEvents, activity.id]);
    } catch (err) {
      console.error("Error registering:", err);
      alert("Registration failed. Please try again.");
    } finally {
      setRegistering(null);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activitiesData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching events:", err);
      // Failsafe in case of permissions or initial empty loads
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredActivities = activeFilter === 'all' 
    ? activities 
    : activities.filter(a => a.type === activeFilter);
  const featuredSpecialEvents = activities.filter((a) => a.type === 'special' && a.featured);

  const centerPosition = [13.0400, 80.2600]; // Default map center

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-3">Nearby Activities</h1>
          <p className="text-text-secondary text-lg max-w-2xl">Find local NGO events, beach cleanups, and special drives. Get involved and make your city cleaner today.</p>
        </div>
        
        {/* Filters */}
        <div className="flex p-1 bg-[var(--input-bg)] rounded-lg shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeFilter === 'all' ? 'bg-[var(--card-bg)] text-primary shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            All Events
          </button>
          <button
            onClick={() => setActiveFilter('beach')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeFilter === 'beach' ? 'bg-[var(--card-bg)] text-blue-400 shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Waves className="w-4 h-4" /> Beach
          </button>
          <button
            onClick={() => setActiveFilter('ngo')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeFilter === 'ngo' ? 'bg-[var(--card-bg)] text-green-400 shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <HeartHandshake className="w-4 h-4" /> NGO
          </button>
          <button
            onClick={() => setActiveFilter('special')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeFilter === 'special' ? 'bg-[var(--card-bg)] text-amber-400 shadow-sm border border-[var(--border-color)]' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <Sparkles className="w-4 h-4" /> Special
          </button>
        </div>
      </div>

      {featuredSpecialEvents.length > 0 && activeFilter !== 'special' && (
        <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h2 className="text-lg font-bold text-amber-200">Featured Special Events</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featuredSpecialEvents.slice(0, 2).map((event) => (
              <div key={event.id} className="rounded-xl border border-amber-400/30 bg-[var(--card-bg)]/70 p-3">
                <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                <p className="text-xs text-text-secondary mt-1">{event.date} • {event.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: List of Activities */}
        <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-12 glass-card rounded-2xl border border-dashed border-[var(--border-color)]">
               <p className="text-text-secondary opacity-80">No activities found for this category at the moment. Please check back later.</p>
            </div>
          ) : (
            filteredActivities.map((activity, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={activity.id}
              className="glass-card p-6 rounded-2xl border border-[var(--border-color)] hover:border-gray-500 transition-all group relative overflow-hidden"
            >
               {/* Subtle background glow */}
               <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-10 pointer-events-none transition-all group-hover:opacity-20 ${(EVENT_TYPE_META[activity.type] || EVENT_TYPE_META.ngo).glow}`} />
               
               <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${(EVENT_TYPE_META[activity.type] || EVENT_TYPE_META.ngo).badge}`}>
                       {(EVENT_TYPE_META[activity.type] || EVENT_TYPE_META.ngo).label}
                     </span>
                     {activity.type === 'special' && activity.featured && (
                       <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40">
                         Featured
                       </span>
                     )}
                   </div>
                   <h3 className="text-xl font-bold text-text-primary leading-tight">{activity.title}</h3>
                   <span className="text-sm font-medium text-text-secondary flex items-center gap-1 mt-1">
                     <HeartHandshake className="w-4 h-4" /> By {activity.ngo}
                   </span>
                 </div>
               </div>

               <p className="text-text-secondary opacity-90 text-sm mb-5 relative z-10">
                 {activity.description}
               </p>

               <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                  <div className="flex items-center gap-2 text-sm text-text-secondary bg-[var(--input-bg)] border border-[var(--border-color)] p-2 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="truncate">{activity.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary bg-[var(--input-bg)] border border-[var(--border-color)] p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-accentYellow" />
                    <span className="truncate">{activity.location}</span>
                  </div>
               </div>

               <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-5 relative z-10">
                 <div className="flex flex-col">
                   <span className="text-xs text-text-secondary font-medium">Spots Filled</span>
                   <div className="flex items-center gap-2">
                     <Users className="w-4 h-4 text-text-secondary" />
                     <span className="font-bold text-text-primary">{activity.registered} / {activity.spots}</span>
                   </div>
                   {/* Progress bar */}
                   <div className="w-full bg-[var(--border-color)] h-1.5 rounded-full mt-2">
                     <div 
                       className={`h-full rounded-full ${(EVENT_TYPE_META[activity.type] || EVENT_TYPE_META.ngo).progress}`} 
                       style={{ width: `${Math.min((activity.registered / activity.spots) * 100, 100)}%` }}
                     />
                   </div>
                 </div>
                 
                 <button 
                   onClick={() => handleRegister(activity)}
                   disabled={myEvents.includes(activity.id) || activity.registered >= activity.spots || registering === activity.id}
                   className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                     myEvents.includes(activity.id) ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                     activity.registered >= activity.spots ? 'bg-[var(--input-bg)] text-text-secondary opacity-50 cursor-not-allowed' :
                     'bg-primary hover:bg-blue-600 text-white shadow-glow-primary'
                   }`}
                 >
                   {registering === activity.id && <Loader2 className="w-4 h-4 animate-spin" />}
                   {myEvents.includes(activity.id) ? 'Registered!' : activity.registered >= activity.spots ? 'Event Full' : 'Register Now'}
                 </button>
               </div>
            </motion.div>
          )))}
        </div>

        {/* Right Column: Interactive Map */}
        <div className="h-[500px] lg:h-full lg:min-h-[700px] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-4 left-4 right-4 z-[400] bg-[var(--card-bg)]/80 backdrop-blur-md border border-[var(--border-color)] rounded-xl p-3 flex items-center gap-3">
            <Navigation className="text-primary w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium text-text-primary">Interactive map showing activities near you.</p>
          </div>
          
          <MapContainer 
            center={centerPosition} 
            zoom={12} 
            scrollWheelZoom={false} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url={theme === 'dark' 
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              }
            />
            {filteredActivities.map(activity => (
              <Marker key={activity.id} position={activity.coords}>
                <Popup className="custom-popup">
                  <div className="p-1">
                    <h4 className="font-bold text-gray-900 mb-1">{activity.title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{activity.date}</p>
                    <button className="text-xs bg-primary text-white px-3 py-1.5 rounded-md font-medium w-full hover:bg-blue-600">
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

      </div>
    </div>
  );
}
