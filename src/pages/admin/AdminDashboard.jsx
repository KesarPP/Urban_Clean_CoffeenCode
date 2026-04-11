import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { AlertTriangle, CheckCircle, Droplets, Trash2, MapPin, X, FileText, ShieldCheck, Play, Check, Camera, Video, Bell, Settings, Save, Search, ArrowRight } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db } from '../../firebase/config';
import LiveCameraCapture from '../../components/dashboard/CameraResolution';

// Status-aware marker helper to replace fragile bitmap imports
const getMarkerIcon = (status) => {
  const colors = {
    'Pending Review': '#EAB308', // Yellow
    'Pending': '#EAB308',
    'In Progress': '#3B82F6',   // Blue
    'Resolved': '#10B981'      // Green
  };
  const color = colors[status] || '#6366F1';
  const isPulsing = status === 'Pending Review' || status === 'Pending' || status === 'In Progress';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${isPulsing ? `<div style="position: absolute; width: 20px; height: 20px; background: ${color}; border-radius: 50%; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="position: relative; background: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"></div>
      </div>
      <style>
        @keyframes ping {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
};

// ─── Resolve Proof Modal Component ──────────────────────────────────────────
function ResolveProofModal({ complaint, user, onConfirm, onCancel }) {
  const [proofImage, setProofImage] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateProgress = () => {
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      if (p > 95) clearInterval(interval);
      setProgress(p);
    }, 150);
    return interval;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const performAIForensicAudit = async () => {
    try {
      let citizenCoords = complaint.location_coords;
      if (!citizenCoords && typeof complaint.location === 'string' && complaint.location.includes(',')) {
        const parts = complaint.location.split(',').map(p => parseFloat(p.trim()));
        citizenCoords = { lat: parts[0], lng: parts[1] };
      }

      const payload = {
        before_image: complaint.image_proof,
        after_image: proofImage.preview,
        before_loc: citizenCoords ? `${citizenCoords.lat}, ${citizenCoords.lng}` : "0, 0",
        after_loc: `${proofImage.location.lat}, ${proofImage.location.lng}`
      };

      const response = await fetch('http://localhost:8005/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('AI Backend Offline');
      const data = await response.json();
      return {
        is_verified: data.is_verified,
        status: data.status,
        auditLabel: data.audit_label,
        distance: data.distance_meters,
        similarity: data.similarity_score,
        efficiency: data.cleanup_efficiency || 0,
        itemsBefore: data.audit_details?.semantic ? [data.status] : (data.items_before || []),
        itemsAfter: data.items_after || [],
        auditDetails: data.audit_details
      };
    } catch (e) {
      const adminCoords = proofImage?.location;
      let citizenCoords = complaint.location_coords;
      if (!citizenCoords && typeof complaint.location === 'string' && complaint.location.includes(',')) {
        const parts = complaint.location.split(',').map(p => parseFloat(p.trim()));
        citizenCoords = { lat: parts[0], lng: parts[1] };
      }
      const dist = calculateDistance(citizenCoords?.lat || 0, citizenCoords?.lng || 0, adminCoords?.lat || 0, adminCoords?.lng || 0);
      return { is_verified: dist < 50, status: dist < 50 ? `✅ Verified (${Math.round(dist)}m)` : `❌ Geofence Breach (${Math.round(dist)}m)`, distance: dist, similarity: 0 };
    }
  };

  const handleSubmit = async () => {
    if (!proofImage || !notes.trim()) return;
    setIsSubmitting(true);
    const timer = simulateProgress();
    try {
      const audit = await performAIForensicAudit();
      clearInterval(timer);
      setProgress(100);

      const status = audit.is_verified ? 'Resolved' : 'Verification Pending';

      onConfirm({
        images: [proofImage.preview],
        notes: notes.trim(),
        admin_name: user?.name || 'Staff Admin',
        admin_id: user?.uid || 'N/A',
        is_verified: audit.is_verified,
        audit_result: audit.status,
        audit_details: audit.auditDetails,
        audit_distance_meters: audit.distance,
        similarity_score: audit.similarity,
        cleanup_efficiency: audit.efficiency,
        items_before: audit.itemsBefore,
        items_after: audit.itemsAfter,
        status: status
      });
    } catch (error) {
      clearInterval(timer);
      console.error("Upload failed", error);
      alert("Failed to upload proof. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = proofImage && notes.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">Verified Resolution</h2>
              <p className="text-[10px] text-text-secondary mt-0.5 font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                <MapPin size={10} /> {complaint?.title}
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-[var(--input-bg)] text-text-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-3 uppercase tracking-widest opacity-70 flex items-center gap-2">
              <Camera className="h-3.5 w-3.5 text-blue-500" />
              Live Camera Proof <span className="text-red-400">*</span>
            </label>

            <LiveCameraCapture
              onCapture={setProofImage}
              onClear={() => setProofImage(null)}
              capturedImage={proofImage}
            />
            {!proofImage && (
              <p className="mt-2 text-[10px] text-center text-text-secondary italic">Gallery uploads restricted for authenticity.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-3 uppercase tracking-widest opacity-70 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-accentGreen" />
              Resolution Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Log the actions taken to resolve this incident..."
              className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all min-h-[120px] shadow-inner"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] flex justify-end gap-3 bg-[var(--input-bg)]/30">
          <div className="flex flex-col gap-3">
            {isSubmitting && (
              <div className="w-full bg-[var(--input-bg)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]">
                <motion.div
                  className="h-full bg-emerald-500 shadow-glow-emerald"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className={`w-full px-8 py-3 rounded-2xl text-sm font-black text-white shadow-xl transition-all uppercase tracking-widest ${isValid && !isSubmitting ? 'bg-emerald-600 hover:shadow-glow-emerald hover:scale-[1.02] active:scale-95' : 'bg-gray-700 opacity-50 cursor-not-allowed'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Gemini Auditing...
                </span>
              ) : 'Submit Verification'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Forensic Audit Review Modal ──────────────────────────────────────────
function ForensicAuditReviewModal({ complaint, onApprove, onReject, onCancel }) {
  if (!complaint || !complaint.resolution_proof) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden glass-card flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--input-bg)]/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">Forensic Manual Audit</h2>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1">Incident ID: #{complaint.id?.substring(0, 6)} • {complaint.title}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-[var(--input-bg)] text-text-secondary transition-all hover:text-text-primary"><X /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Citizen's Before Photo
              </label>
            </div>
            <div className="aspect-video rounded-3xl overflow-hidden border-2 border-red-500/10 shadow-2xl bg-black">
              <img src={complaint.image_proof} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Admin's Resolution Photo
              </label>
            </div>
            <div className="aspect-video rounded-3xl overflow-hidden border-2 border-emerald-500/10 shadow-2xl bg-black relative group">
              <img src={complaint.resolution_proof.images[0]} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="bg-[var(--input-bg)] p-6 rounded-3xl border border-[var(--border-color)]">
              <h4 className="text-xs font-black uppercase text-text-primary mb-4 flex items-center gap-2">
                <FileText size={14} className="text-blue-500" /> AI Auditor Findings
              </h4>
              <div className="p-4 bg-black/20 rounded-2xl border border-white/5 italic text-sm text-text-secondary leading-relaxed">
                "{complaint.audit_result}"
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-[var(--input-bg)]/40 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onReject}
            className="py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold uppercase tracking-widest text-xs border border-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <X size={16} /> Flag as Fraud / Retake
          </button>
          <button
            onClick={onApprove}
            className="py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 shadow-glow-emerald text-white font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} /> Approve & Close Incident
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [resolveProofContext, setResolveProofContext] = useState(null);
  const [manualAuditContext, setManualAuditContext] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationSettings, setNotificationSettings] = useState({
    citizenTemplate: "OFFICIAL UPDATE - Report ID: #{id}\n\nDear Citizen,\n\nThe Department of Urban Cleanliness has processed and RESOLVED your report regarding {category}. Our AI-verification system has confirmed the restoration of the site. Thank you for your civic contribution.\n\nRegards,\nUrban Clean Management Bureau",
    authorityTemplate: "URGENT OPERATIONAL ALERT: {category} Activity\nSector: {area}\nStatus: CRITICAL SPIKE ({count} active reports)\n\nSystem analysis has detected a pattern breach in Sector {area}. Immediate resource deployment is mandated under Protocol 4-B. Please acknowledge receipt via Command Console.\n\nAutomated Alert - Urban Clean AI Command"
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Waste Atlas Global Benchmarks (Real Data Context)
  const stats = [
    { label: 'Annual Generation', value: '2.01B T', icon: Trash2, color: 'text-text-primary', bg: 'bg-[var(--input-bg)]', sub: 'Global MSW' },
    { label: 'Organic Diversion', value: '44%', icon: Droplets, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: 'Food & Green' },
    { label: 'Plastic Impact', value: '12%', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'Non-Biodegradable' },
    { label: 'Recovery Rate', value: '19%', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: 'Recycling/Compost' }
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'citizen_reports'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComplaints(data.slice(0, 10)); // Limit to 10 for feed
    });
    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (id, newStatus, proofData = null) => {
    if (newStatus === 'Resolved' && !proofData) {
      const comp = complaints.find(c => c.id === id);
      setResolveProofContext(comp || { id, title: 'Unknown Incident' });
      return;
    }

    try {
      const updateData = { status: newStatus };
      if (proofData) {
        updateData.resolution_proof = {
          notes: proofData.notes,
          images: proofData.images,
          admin_name: proofData.admin_name,
          admin_id: proofData.admin_id,
          timestamp: new Date().toISOString()
        };
        updateData.is_verified = proofData.is_verified || false;
        updateData.audit_result = proofData.audit_result || 'Manual Review';
        updateData.audit_distance_meters = proofData.audit_distance_meters || 0;
        updateData.similarity_score = proofData.similarity_score || 0;
        updateData.cleanup_efficiency = proofData.cleanup_efficiency || 0;
        updateData.items_before = proofData.items_before || [];
        updateData.items_after = proofData.items_after || [];
      }

      // Override status if it's coming from proofData (like 'Verification Pending')
      if (proofData?.status) {
        updateData.status = proofData.status;
      }

      await updateDoc(doc(db, 'citizen_reports', id), updateData);

      // Trigger Notification if resolved
      if (updateData.status === 'Resolved') {
        const report = complaints.find(c => c.id === id);
        if (report && (report.user_email || report.user_phone)) {
          fetch('http://localhost:8005/api/notify-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              report_id: id,
              status: 'Resolved',
              category: report.category || 'Issue',
              contact: report.notification_preference === 'email' ? report.user_email : report.user_phone,
              preference: report.notification_preference || 'email'
            })
          }).catch(err => console.error("Notification trigger failed", err));
        }
      }

      setResolveProofContext(null);
      setManualAuditContext(null);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateDoc(doc(db, 'admin_settings', 'notifications'), {
        ...notificationSettings,
        updated_at: new Date().toISOString()
      });
      alert("Notification templates updated successfully!");
    } catch (e) {
      console.error("Save settings failed", e);
      alert("Failed to save. Make sure the 'admin_settings' collection exists.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      onSnapshot(doc(db, 'admin_settings', 'notifications'), (doc) => {
        if (doc.exists()) setNotificationSettings(doc.data());
      });
    };
    fetchSettings();
  }, []);

  // ─── Smart Insights Components ──────────────────────────────────────────
  const [recommendations, setRecommendations] = useState([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);
  const [insightFilter, setInsightFilter] = useState('all');
  const [insightSearch, setInsightSearch] = useState('');

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const response = await fetch('http://localhost:8005/admin/recommendations');
        const data = await response.json();
        setRecommendations(data);
      } catch (e) {
        console.error("Failed to fetch recommendations", e);
      } finally {
        setIsLoadingRecs(false);
      }
    };
    fetchRecs();
    const interval = setInterval(fetchRecs, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleTakeAction = async (rec) => {
    setIsLoadingRecs(true);
    try {
      // 1. Map Recommendation Type to database action
      const reportsRef = collection(db, 'citizen_reports');
      const q = onSnapshot(reportsRef, (snapshot) => {
        const allPending = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => r.status !== 'Resolved');

        let targetIds = [];
        let updateData = {};

        if (rec.title.includes('SLA Delay')) {
          // Action: Escalate all pending reports older than 24h
          const yesterday = new Date(Date.now() - 86400000).toISOString();
          targetIds = allPending
            .filter(r => (r.timestamp || r.date) < yesterday)
            .map(r => r.id);
          updateData = { priority: 'high', is_escalated: true, status: 'In Progress' };
        }
        else if (rec.title.includes('Spike')) {
          // Action: Prioritize all new reports in this category
          const categoryName = rec.title.split(' ')[1]; // Extract category from title
          targetIds = allPending
            .filter(r => r.category === categoryName)
            .map(r => r.id);
          updateData = { priority: 'urgent', status: 'In Progress' };
        }
        else if (rec.title.includes('Recurring')) {
          // Action: Mark for site inspection based on affected area
          targetIds = allPending
            .filter(r => (r.location_coords?.lat?.toString() === rec.affected_area.split(',')[0].trim()) || (r.location === rec.affected_area))
            .map(r => r.id);
          updateData = { status: 'Inspection Required', priority: 'medium' };
        }

        // Apply Updates
        Promise.all(targetIds.map(id => updateDoc(doc(db, 'citizen_reports', id), updateData)))
          .then(() => {
            // Delete the recommendation once acted upon
            if (rec.id) updateDoc(doc(db, 'admin_recommendations', rec.id), { status: 'Archived', acted_at: new Date().toISOString() });
            alert(`Successfully executed action for ${targetIds.length} incidents!`);
          })
          .catch(e => console.error(e));
      });
    } catch (e) {
      console.error("Action execution failed", e);
      alert("Failed to execute action. Please check database permissions.");
    } finally {
      setIsLoadingRecs(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-glow-blue' : 'text-text-secondary hover:bg-white/5'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-amber-600 text-white shadow-glow-amber' : 'text-text-secondary hover:bg-white/5'}`}
          >
            Notification Settings
          </button>
        </div>
        <div className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">System Control v3.1</div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Top Row: Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="bg-[var(--card-bg)] p-6 rounded-2xl shadow-soft border border-[var(--border-color)] flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">{s.label}</p>
                    <div className="flex flex-col">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] font-black uppercase tracking-tighter text-text-secondary opacity-40">{s.sub}</p>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${s.bg} border border-[var(--border-color)] group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Smart Insights Section */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
              <h2 className="text-xl font-black text-text-primary flex items-center gap-3">
                <span className="w-2 h-8 bg-blue-600 rounded-full shadow-glow-blue animate-pulse"></span>
                Smart Insights <span className="text-text-secondary font-normal italic">/ AI Recommendations</span>
              </h2>

              <div className="flex items-center gap-3 bg-[var(--card-bg)] p-2 rounded-2xl border border-[var(--border-color)] shadow-soft">
                <div className="flex items-center gap-2 px-3 border-r border-[var(--border-color)]">
                  <Search className="h-4 w-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search area..."
                    className="bg-transparent border-none text-xs text-text-primary focus:ring-0 min-w-[150px]"
                    value={insightSearch}
                    onChange={(e) => setInsightSearch(e.target.value)}
                  />
                </div>
                <select
                  className="bg-transparent border-none text-xs font-bold text-text-secondary focus:ring-0 cursor-pointer pr-8"
                  value={insightFilter}
                  onChange={(e) => setInsightFilter(e.target.value)}
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Only</option>
                  <option value="medium">Medium Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {isLoadingRecs ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 bg-[var(--card-bg)] rounded-3xl border-2 border-dashed border-[var(--border-color)]">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-text-secondary text-sm font-bold tracking-widest uppercase opacity-60">Initializing Neural Link...</p>
                </div>
              ) : (
                recommendations
                  .filter(r => r.status !== 'Archived')
                  .filter(r => insightFilter === 'all' || r.severity === insightFilter)
                  .filter(r => (r.affected_area || '').toLowerCase().includes(insightSearch.toLowerCase()) || r.title.toLowerCase().includes(insightSearch.toLowerCase()))
                  .map((rec) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={rec.id || Math.random()}
                      className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between hover:scale-[1.02] active:scale-95 ${rec.severity === 'critical'
                        ? 'bg-red-500/5 border-red-500/20 shadow-glow-red/10'
                        : rec.severity === 'high'
                          ? 'bg-amber-500/5 border-amber-500/20 shadow-glow-amber/10'
                          : 'bg-emerald-500/5 border-emerald-500/20 shadow-glow-green/10'
                        }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${rec.severity === 'critical' ? 'bg-red-600 text-white' : rec.severity === 'high' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                            {rec.type === 'alert' ? '🚨 Alert' : '💡 Recommendation'}
                          </span>
                          <span className="text-[10px] text-text-secondary opacity-50 font-black uppercase tracking-tighter">
                            {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-2 italic">
                          {rec.title}
                        </h3>

                        <p className="text-xs text-text-secondary leading-relaxed mb-6 font-medium opacity-80">
                          {rec.description}
                        </p>

                        <div className="p-4 bg-black/10 rounded-2xl border border-white/5 mb-6">
                          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                            <MapPin size={10} /> Affected Area
                          </p>
                          <p className="text-[10px] text-text-secondary font-bold opacity-60">{rec.affected_area}</p>
                        </div>

                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-8">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Suggested AI Action</p>
                          <p className="text-[11px] text-text-primary italic leading-relaxed">"{rec.suggested_action}"</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTakeAction(rec)}
                        className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${rec.severity === 'critical'
                          ? 'bg-red-600 hover:bg-red-500 shadow-red-500/40 text-white'
                          : 'bg-text-primary hover:bg-text-secondary text-white shadow-black/20'
                          }`}
                      >
                        Execute Decision <ArrowRight size={16} />
                      </button>
                    </motion.div>
                  ))
              )}

              {!isLoadingRecs && recommendations.filter(r => r.status !== 'Archived').filter(r => insightFilter === 'all' || r.severity === insightFilter).length === 0 && (
                <div className="col-span-full py-24 text-center bg-[var(--card-bg)] rounded-3xl border-2 border-dashed border-[var(--border-color)]">
                  <div className="inline-flex p-4 bg-blue-500/10 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-black text-text-primary uppercase tracking-widest mb-1 italic">Scan Complete</h3>
                  <p className="text-sm font-medium text-text-secondary opacity-60">No patterns matching your filters were found in the active sector.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Interactive Map */}
            <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-2xl shadow-soft border border-[var(--border-color)] overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Incident Geolocation
                </h2>
                <div className="text-[10px] text-text-secondary italic font-medium">Real-time coordinates</div>
              </div>
              <div className="flex-grow z-0">
                <MapContainer center={[19.0760, 72.8777]} zoom={11} className="w-full h-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {complaints.map(complaint => {
                    // Try to get coords from new object schema, or parse from legacy string field
                    let coords = complaint.location_coords;
                    if (!coords && typeof complaint.location === 'string' && complaint.location.includes(',')) {
                      const parts = complaint.location.split(',').map(p => parseFloat(p.trim()));
                      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        coords = { lat: parts[0], lng: parts[1] };
                      }
                    }

                    if (!coords) return null;

                    return [
                      <Marker key={`marker-${complaint.id}`} position={[coords.lat, coords.lng]} icon={getMarkerIcon(complaint.status)}>
                        <Popup>
                          <div className="p-1">
                            <strong className="block text-sm">{complaint.title}</strong>
                            <span className="text-[10px] font-bold text-gray-500 block mb-1">
                               {complaint.ai_analysis?.severity === 'HIGH' ? '🚨 HIGH SEVERITY' : complaint.category}
                            </span>
                            <div className={`mt-2 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 inline-block
                          ${complaint.status === 'Pending Review' || complaint.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : ''}
                          ${complaint.status === 'Resolved' ? 'bg-green-100 text-green-700' : ''}
                        `}>
                              {complaint.status}
                            </div>
                          </div>
                        </Popup>
                      </Marker>,
                      complaint.ai_analysis?.severity === 'HIGH' && complaint.status !== 'Resolved' && (
                        <Circle 
                          key={`pulse-${complaint.id}`}
                          center={[coords.lat, coords.lng]}
                          radius={120} 
                          pathOptions={{ 
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.15,
                            weight: 0,
                            className: 'animate-pulse' 
                          }}
                        />
                      )
                    ];
                  })}

                  {/* AI High Frequency Spike Zones */}
                  {recommendations
                    .filter(r => r.type === 'alert' && r.affected_area && r.affected_area.includes(','))
                    .map((alert, idx) => {
                      const parts = alert.affected_area.split(',').map(p => parseFloat(p.trim()));
                      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
                      
                      return (
                        <Circle 
                          key={`alert-${idx}`}
                          center={[parts[0], parts[1]]}
                          radius={250} // 250m radius for the alert zone
                          pathOptions={{ 
                            color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                            fillColor: alert.severity === 'critical' ? '#ef4444' : '#f59e0b',
                            fillOpacity: 0.15,
                            weight: 2,
                            dashArray: '5, 10',
                            className: 'animate-pulse' // Adding native pulse via CSS 
                          }}
                        >
                          <Popup>
                            <div className="p-2 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-2">
                                 <span className="p-1 bg-red-500/10 rounded-md">🚨</span>
                                 <span className="text-xs font-black uppercase text-red-500">High Alert Zone</span>
                              </div>
                              <h4 className="text-sm font-black text-text-primary mb-1 uppercase italic">{alert.title}</h4>
                              <p className="text-[10px] text-text-secondary leading-tight opacity-80">{alert.description}</p>
                              <div className="mt-3 p-2 bg-black/10 rounded-lg border border-white/5">
                                 <p className="text-[9px] font-bold text-blue-400 uppercase">Suggested Action</p>
                                 <p className="text-[10px] italic">"{alert.suggested_action}"</p>
                              </div>
                            </div>
                          </Popup>
                        </Circle>
                      );
                    })
                  }
                </MapContainer>
              </div>
            </div>

            {/* Right Column: Recent Incident Feed */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-text-primary px-1 flex items-center gap-2">
                <span className="w-2 h-8 bg-amber-500 rounded-full shadow-glow-amber"></span>
                Active Feed
              </h2>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {complaints.filter(c => c.status !== 'Resolved').map(complaint => (
                  <div key={complaint.id} className="bg-[var(--card-bg)] p-5 rounded-2xl shadow-soft border border-[var(--border-color)] group hover:border-primary/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="max-w-[70%]">
                        <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors truncate">{complaint.title}</h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">{complaint.date || 'Just now'}</p>
                        
                        {/* AI Analysis Active Feed Badge */}
                        {complaint.ai_analysis && complaint.ai_analysis.severity && complaint.ai_analysis.severity !== 'NONE' && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border
                            ${complaint.ai_analysis.severity === 'HIGH' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
                              complaint.ai_analysis.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 
                              'bg-blue-500/10 text-blue-500 border-blue-500/30'}`}
                          >
                            <ShieldCheck size={10} /> 
                            AI Priority: {complaint.ai_analysis.severity}
                            {complaint.ai_analysis.count > 0 && ` (${complaint.ai_analysis.count} Hazards)`}
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest
                    ${complaint.status === 'Pending Review' || complaint.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}
                    ${complaint.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                    ${complaint.status === 'Verification Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' : ''}
                    ${complaint.status === 'Resolved' ? 'bg-green-500/10 text-emerald-500 border-emerald-500/20' : ''}
                  `}>
                        {complaint.status}
                      </span>
                    </div>

                    {(complaint.status === 'Resolved' || complaint.status === 'Verification Pending') && complaint.resolution_proof && (
                      <div className="space-y-2 mb-3">
                        <div className="flex flex-col gap-0.5 ml-5">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className={`h-3 w-3 ${complaint.is_verified ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${complaint.is_verified ? 'text-emerald-400' : 'text-amber-400'}`} title={complaint.audit_result}>
                              {complaint.status === 'Verification Pending' ? 'Manual Audit Required' : 'AI Verified'}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-secondary leading-tight line-clamp-2 italic" title={complaint.audit_result}>
                            {complaint.audit_result}
                          </p>
                          {complaint.status === 'Verification Pending' && (
                            <button
                              onClick={() => setManualAuditContext(complaint)}
                              className="text-[9px] font-bold text-amber-400 hover:text-amber-300 underline mt-1 text-left uppercase tracking-widest"
                            >
                              Check Manually →
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] font-bold text-text-secondary bg-[var(--input-bg)] px-2 py-1 rounded-md border border-[var(--border-color)]">{complaint.category || 'Environmental'}</span>
                      {complaint.status !== 'Resolved' ? (
                        <div className="flex gap-2">
                          {(complaint.status === 'Pending Review' || complaint.status === 'Pending') && (
                            <button
                              onClick={() => handleStatusUpdate(complaint.id, 'In Progress')}
                              className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all"
                              title="Start Progress"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusUpdate(complaint.id, 'Resolved')}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Check size={12} /> Resolve
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-text-secondary opacity-50 italic">Closed</div>
                      )}
                    </div>
                  </div>
                ))}
                {complaints.filter(c => c.status !== 'Resolved').length === 0 && (
                  <div className="py-20 text-center text-text-secondary">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 opacity-20 text-emerald-500" />
                    <p className="text-sm italic">All incidents resolved!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ─── Notification Settings UI ────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 max-w-4xl"
        >
          <div className="bg-[var(--card-bg)] p-10 rounded-[40px] border border-[var(--border-color)] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full" />

            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                <Bell className="h-8 w-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-text-primary uppercase tracking-tighter">Notification Templates</h2>
                <p className="text-sm text-text-secondary font-medium opacity-60">Customize the automated alerts sent by the AI Agent</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Citizen Success Template */}
              <div className="space-y-4">
                <label className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center justify-between">
                  Citizen Resolution Template (SMS/Email)
                  <span className="text-[8px] text-blue-500 lowercase px-2 py-0.5 bg-blue-500/10 rounded-md">Variables: &#123;id&#125;, &#123;status&#125;, &#123;category&#125;</span>
                </label>
                <textarea
                  className="w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] rounded-3xl p-6 text-sm text-text-primary focus:border-amber-500 outline-none transition-all min-h-[120px] shadow-inner font-medium leading-relaxed"
                  value={notificationSettings.citizenTemplate}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, citizenTemplate: e.target.value })}
                  placeholder="Enter message for citizens..."
                />
              </div>

              {/* Authority Alert Template */}
              <div className="space-y-4">
                <label className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center justify-between">
                  Authority Surge Alert (Email)
                  <span className="text-[8px] text-blue-500 lowercase px-2 py-0.5 bg-blue-500/10 rounded-md">Variables: &#123;category&#125;, &#123;area&#125;, &#123;count&#125;</span>
                </label>
                <textarea
                  className="w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] rounded-3xl p-6 text-sm text-text-primary focus:border-amber-500 outline-none transition-all min-h-[120px] shadow-inner font-medium leading-relaxed"
                  value={notificationSettings.authorityTemplate}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, authorityTemplate: e.target.value })}
                  placeholder="Enter alert message for city hall..."
                />
              </div>

              <div className="pt-6">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full sm:w-auto px-10 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-glow-amber transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isSavingSettings ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : <Save size={18} />}
                  Save Templates
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-600/20 flex gap-4 items-start">
            <div className="p-2 bg-blue-600/10 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-widest mb-1">Live Simulation Mode Active</h4>
            <p className="text-[11px] text-text-secondary font-medium leading-normal opacity-70">
              Currently, all notifications will be logged to the Python console for verification. To connect real SMS/Email providers, update the `NotificationService` in the backend.
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {resolveProofContext && (
          <ResolveProofModal
            complaint={resolveProofContext}
            user={user}
            onCancel={() => setResolveProofContext(null)}
            onConfirm={(data) => handleStatusUpdate(resolveProofContext.id, 'Resolved', data)}
          />
        )}
        {manualAuditContext && (
          <ForensicAuditReviewModal
            complaint={manualAuditContext}
            onApprove={() => handleStatusUpdate(manualAuditContext.id, 'Resolved')}
            onReject={() => handleStatusUpdate(manualAuditContext.id, 'In Progress')} // Reset to In Progress for retake
            onCancel={() => setManualAuditContext(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
