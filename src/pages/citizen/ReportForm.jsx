import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Camera, MapPin, UploadCloud, CheckCircle, Loader2, AlertTriangle, ThumbsUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, updateDoc, doc, arrayUnion, increment } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import WhatsAppFloatingButton from '../../components/WhatsAppFloatingButton';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default leaflet icons not showing in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

// ─── Duplicate Alert Modal Component ──────────────────────────────────────────
function DuplicateAlertModal({ duplicate, onUpvote, onIgnore, onCancel }) {
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-6 text-center border-b border-gray-50 bg-amber-50">
          <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Similar Issue Found!</h2>
          <p className="text-sm text-gray-600 mt-1">A similar report exists nearby. This might be the same issue.</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-gray-800 text-sm mb-1">{duplicate.title || 'Untitled Report'}</h4>
            <p className="text-xs text-gray-500 line-clamp-3 italic">"{duplicate.description}"</p>
            <div className="mt-3 text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
              <ThumbsUp size={10} /> {duplicate.upvote_count} Upvotes already
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={onUpvote}
              className="w-full py-3.5 bg-primaryAction text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-md"
            >
              <ThumbsUp size={18} /> Yes, Upvote Existing
            </button>
            <button 
              onClick={onIgnore}
              className="w-full py-3 text-gray-500 text-xs font-bold hover:text-gray-700 transition-colors"
            >
              No, This is a different issue
            </button>
          </div>
        </div>

        <button onClick={onCancel} className="absolute top-4 right-4 p-1 rounded-full hover:bg-black/5 text-gray-400">
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
}

export default function ReportForm() {
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    email: '',
    phone: '',
    notificationPreference: 'email', // default
  });
  const [position, setPosition] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [duplicateContext, setDuplicateContext] = useState(null);
  
  const categories = [
    { value: 'waste', label: 'Waste Overflow' },
    { value: 'dumping', label: 'Illegal Dumping' },
    { value: 'water', label: 'Water Leak' },
    { value: 'contamination', label: 'Contamination' },
  ];

  const handleCreateNew = async () => {
    try {
      await addDoc(collection(db, 'citizen_reports'), {
        ...formData,
        location_coords: { lat: position.lat, lng: position.lng },
        status: 'Pending Review',
        upvote_count: 0,
        linked_users: [auth.currentUser?.uid || 'anonymous'],
        timestamp: new Date().toISOString(),
        user_id: auth.currentUser?.uid || 'anonymous',
        // Notification Meta
        notification_preference: formData.notificationPreference,
        user_email: formData.email,
        user_phone: formData.phone
      });
      setIsSuccess(true);
      setDuplicateContext(null);
    } catch (e) {
      console.error("Save failed", e);
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async () => {
    if (!duplicateContext) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'citizen_reports', duplicateContext.id);
      await updateDoc(docRef, {
        upvote_count: increment(1),
        linked_users: arrayUnion(auth.currentUser?.uid || 'anonymous'),
        // Keep primary contact updated
        user_email: formData.email,
        user_phone: formData.phone
      });
      setIsSuccess(true);
      setDuplicateContext(null);
    } catch (e) {
      console.error("Upvote failed", e);
      alert("Failed to upvote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!position) {
      alert("Please pin the location on the map.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8005/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formData.category,
          description: formData.description,
          location_coords: { lat: position.lat, lng: position.lng }
        })
      });

      const data = await response.json();
      
      if (data.is_duplicate) {
        setDuplicateContext(data.existing_complaint);
        setIsSubmitting(false);
      } else {
        await handleCreateNew();
      }
    } catch (error) {
      console.error("Duplicate check failed, proceeding anyway", error);
      await handleCreateNew();
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-secondaryAction">
        <div className="bg-cards p-10 rounded-2xl shadow-soft border border-gray-100 flex flex-col items-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-10 w-10 text-primaryAction" />
          </div>
          <h2 className="text-3xl font-bold text-textMain mb-4">Successful!</h2>
          <p className="text-gray-600 mb-8">Thank you for contributing. We've updated the incident database.</p>
          <button onClick={() => setIsSuccess(false)} className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-textMain tracking-tight">Report an Issue</h1>
        <p className="text-gray-500 mt-2">Help us keep the city clean by providing accurate details.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-cards p-6 sm:p-10 rounded-2xl shadow-soft border border-gray-50 space-y-8">
        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              Email Address
              <span className="text-[10px] text-gray-400 font-normal mt-0.5 lowercase">(for resolution alerts)</span>
            </label>
            <div className="relative group">
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primaryAction transition-all outline-none"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                @
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              Phone Number
              <span className="text-[10px] text-gray-400 font-normal mt-0.5 lowercase">(for SMS alerts)</span>
            </label>
            <div className="relative group">
              <input
                type="tel"
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primaryAction transition-all outline-none"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Camera size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preference */}
        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            I'd like to get notified via:
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, notificationPreference: 'email'})}
              className={`py-4 rounded-2xl font-bold text-sm transition-all border ${
                formData.notificationPreference === 'email' 
                  ? 'bg-primaryAction text-white border-primaryAction shadow-md' 
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
              }`}
            >
              Email Alert
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, notificationPreference: 'sms'})}
              className={`py-4 rounded-2xl font-bold text-sm transition-all border ${
                formData.notificationPreference === 'sms' 
                  ? 'bg-primaryAction text-white border-primaryAction shadow-md' 
                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
              }`}
            >
              SMS Alert
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-textMain">Issue Category</label>
          <div className="grid grid-cols-2 gap-4">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setFormData({...formData, category: cat.value})}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.category === cat.value 
                    ? 'border-primaryAction bg-green-50 text-green-800' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location Map */}
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold text-textMain">
            <span>Location Pin</span>
            <span className="text-xs font-normal text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3"/> Click map to drop pin</span>
          </label>
          <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border-2 border-gray-100 relative">
            <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-textMain">Additional Details</label>
          <textarea
            required
            rows={4}
            placeholder="Describe the issue in detail..."
            className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primaryAction focus:border-transparent transition-all resize-none"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={isSubmitting || !formData.category}
            className="w-full py-4 bg-primaryAction hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-soft transition-all flex justify-center items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5"/> : <UploadCloud className="h-5 w-5"/>}
            {isSubmitting ? 'Checking for Duplicates...' : 'Submit Report'}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {duplicateContext && (
          <DuplicateAlertModal
            duplicate={duplicateContext}
            onUpvote={handleUpvote}
            onIgnore={handleCreateNew}
            onCancel={() => setDuplicateContext(null)}
          />
        )}
      </AnimatePresence>

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatingButton />
    </div>
  );
}
