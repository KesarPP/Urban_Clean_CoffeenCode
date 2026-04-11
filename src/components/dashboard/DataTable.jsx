import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Image as ImageIcon, Upload, FileText, ShieldCheck, Camera } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';

import LiveCameraCapture from './CameraResolution';

// ─── Resolve Proof Modal ────────────────────────────────────────────────────────
function ResolveProofModal({ issue, user, onConfirm, onCancel }) {
  const [proofImage, setProofImage] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Forensic Audit Engine (Ported from test.py) ────────────────────────────────
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const performForensicAudit = () => {
    // 1. Get Citizen Location
    let citizenCoords = issue.location_coords;
    if (!citizenCoords && typeof issue.location === 'string' && issue.location.includes(',')) {
      const parts = issue.location.split(',').map(p => parseFloat(p.trim()));
      citizenCoords = { lat: parts[0], lng: parts[1] };
    }

    // 2. Get Admin Location (extracted from forensic photo metadata)
    const adminCoords = proofImage?.location;
    
    if (!citizenCoords || !adminCoords) return { status: 'Manual Review Needed', distance: null };

    const distance = calculateDistance(
      citizenCoords.lat, citizenCoords.lng,
      adminCoords.lat, adminCoords.lng
    );

    return {
      is_geofence_ok: distance < 50,
      distance: Math.round(distance),
      status: distance < 50 ? `✅ Verified (Within ${Math.round(distance)}m)` : `❌ Geofence Breach (${Math.round(distance)}m away)`
    };
  };

  const performAIForensicAudit = async () => {
    try {
      // 1. Prepare Citizen and Admin metadata
      let citizenCoords = issue.location_coords;
      if (!citizenCoords && typeof issue.location === 'string' && issue.location.includes(',')) {
        const parts = issue.location.split(',').map(p => parseFloat(p.trim()));
        citizenCoords = { lat: parts[0], lng: parts[1] };
      }
      
      const payload = {
        before_image: issue.image_proof,
        after_image: proofImage.preview,
        before_loc: citizenCoords ? `${citizenCoords.lat}, ${citizenCoords.lng}` : "0, 0",
        after_loc: `${proofImage.location.lat}, ${proofImage.location.lng}`
      };

      // 2. Call the Python AI Backend
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
        efficiency: data.cleanup_efficiency,
        itemsBefore: data.audit_details?.semantic ? [data.status] : (data.items_before || []),
        itemsAfter: data.items_after || [],
        auditDetails: data.audit_details
      };
    } catch (e) {
      console.warn("AI Verify Offline - Falling back to local geofence check");
      return performForensicAudit(); // Fallback to distance check only
    }
  };

  // NO LONGER UPLOADING TO STORAGE TO BYPASS CORS - STORING BASE64 DIRECTLY IN FIRESTORE
  const handleSubmit = async () => {
    if (!proofImage || !notes.trim()) return;
    setIsSubmitting(true);
    try {
      const dataUrl = proofImage.preview; 
      // ── RUN AI FORENSIC AUDIT ──
      const audit = await performAIForensicAudit();

        onConfirm({
          images: [dataUrl],
          notes: notes.trim(),
          admin_name: user?.name || 'Staff Admin',
          admin_id: user?.uid || 'N/A',
          audit_result: audit.auditLabel,
          audit_details: audit.auditDetails,
          audit_distance_meters: audit.distance,
          is_verified: audit.is_verified,
          similarity_score: audit.similarity || 0,
          cleanup_efficiency: audit.efficiency || 0,
          items_before: audit.itemsBefore || [],
          items_after: audit.itemsAfter || []
        });
    } catch (error) {
      console.error("Resolution update failed", error);
      alert("Failed to save resolution. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = proofImage?.preview && notes.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 px-6 overflow-y-auto bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-accentGreen" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-tight">Verified Resolution</h2>
              <p className="text-[10px] text-text-secondary mt-0.5 font-bold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                  <ShieldCheck size={10} className="text-accentGreen" /> Secure Proof Protocol
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-[var(--input-bg)] text-text-secondary hover:text-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
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
              <FileText className="h-3.5 w-3.5 text-accentYellow" />
              Detailed Action Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Log the resolution steps taken..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-text-primary placeholder:text-text-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-end gap-3 bg-[var(--input-bg)]/30">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`px-8 py-2.5 rounded-xl text-sm font-black text-white shadow-xl transition-all uppercase tracking-widest ${isValid && !isSubmitting ? 'bg-emerald-600 hover:shadow-glow-emerald scale-100 hover:scale-105 active:scale-95' : 'bg-gray-700 opacity-50 cursor-not-allowed'}`}
          >
            {isSubmitting ? 'Running AI Verification...' : 'Complete Resolve'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const initialIssues = [
  { id: '108', issue: 'Hazardous Waste Overflow', type: 'Citizen Report', source: 'Mobile App', date: '10-15-22', status: 'Pending Review', location: 'Bandra' },
  { id: '117', issue: 'Bin No #895 at 100% capacity', type: 'IoT Sensor', source: 'Smart Bin System', date: '10-20-22', status: 'Resolved', location: 'Dadar' },
  { id: '124', issue: 'Add new bin sensor to system', type: 'System Request', source: 'Admin Console', date: '10-22-22', status: 'Resolved', location: 'BKC' },
  { id: '127', issue: 'Bin ID 12275 at 100% fill level', type: 'IoT Sensor', source: 'Smart Bin System', date: '10-25-22', status: 'In Progress', location: 'Andheri' },
  { id: '133', issue: 'Massive Pothole located Sector 4', type: 'Citizen Report', source: 'Mobile App', date: '10-29-22', status: 'Pending Review', location: 'Juhu' },
  { id: '142', issue: 'Garbage accumulation near station', type: 'Citizen Report', source: 'Mobile App', date: '11-02-22', status: 'Pending Review', location: 'Dadar' },
  { id: '145', issue: 'Overflowing garbage bin near school', type: 'Citizen Report', source: 'Mobile App', date: '11-05-22', status: 'In Progress', location: 'Kurla' },
  { id: '149', issue: 'Bin ID 22341 sensor malfunction', type: 'IoT Sensor', source: 'Smart Bin System', date: '11-07-22', status: 'Pending Review', location: 'Ghatkopar' },
  { id: '153', issue: 'Illegal dumping detected', type: 'Citizen Report', source: 'Mobile App', date: '11-10-22', status: 'In Progress', location: 'Chembur' },
  { id: '158', issue: 'Request for additional waste bins', type: 'System Request', source: 'Admin Console', date: '11-12-22', status: 'Pending Review', location: 'Powai' },
  { id: '162', issue: 'Bin No #452 at critical level', type: 'IoT Sensor', source: 'Smart Bin System', date: '11-14-22', status: 'Resolved', location: 'Malad' },
  { id: '168', issue: 'Street littering complaint', type: 'Citizen Report', source: 'Mobile App', date: '11-18-22', status: 'Pending Review', location: 'Colaba' },
  { id: '172', issue: 'Smart bin connectivity lost', type: 'IoT Sensor', source: 'Smart Bin System', date: '11-20-22', status: 'In Progress', location: 'Vile Parle' },
  { id: '176', issue: 'Garbage truck delay reported', type: 'Citizen Report', source: 'Mobile App', date: '11-23-22', status: 'Pending Review', location: 'Santacruz' },
  { id: '181', issue: 'System upgrade for waste tracking', type: 'System Request', source: 'Admin Console', date: '11-25-22', status: 'Resolved', location: 'Lower Parel' },
  { id: '185', issue: 'Bin ID 99871 at overflow level', type: 'IoT Sensor', source: 'Smart Bin System', date: '11-28-22', status: 'In Progress', location: 'Borivali' },
  { id: '190', issue: 'Debris accumulation after construction', type: 'Citizen Report', source: 'Mobile App', date: '12-01-22', status: 'Pending Review', location: 'Kandivali' },
];

export default function DataTable({ user, spanClass = '' }) {
  const [issues, setIssues] = useState(initialIssues);
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [resolveProofContext, setResolveProofContext] = useState(null); // { id, issue }

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'citizen_reports'), (snapshot) => {
      const mapped = [];
      snapshot.forEach((doc) => {
        const r = doc.data();
          mapped.push({
            id: doc.id.substring(0, 4).toUpperCase(),
            rawId: doc.id,
            issue: r.title,
            type: 'Citizen Report',
            source: 'Mobile App',
            date: r.date?.split(',')[0] || r.date,
            status: r.status,
            location: r.location?.split(',')[0] || r.location,
            image_proof: r.image_proof,
            resolution_proof: r.resolution_proof,
            is_verified: r.is_verified,
            audit_result: r.audit_result,
            audit_distance_meters: r.audit_distance_meters,
            cleanup_efficiency: r.cleanup_efficiency,
            items_before: r.items_before,
            items_after: r.items_after
          });
      });
      setIssues([...mapped, ...initialIssues]);
    }, (error) => {
      console.error("Failed to fetch citizen reports", error);
    });

    return () => unsubscribe();
  }, []);

  const handleResolveConfirm = async (proofData) => {
    const { id } = resolveProofContext;
    const finalStatus = proofData.is_verified ? 'Resolved' : 'Audit Pending';
    await updateStatus(id, finalStatus, proofData);
    setResolveProofContext(null);
  };

  const updateStatus = async (id, newStatus, proofData = null) => {
    if (newStatus === 'Resolved' && !proofData) {
      const issue = issues.find(i => i.id === id);
      setResolveProofContext({ id, issue: issue.issue });
      return;
    }

    const issueToUpdate = issues.find(i => i.id === id);
    if (issueToUpdate && issueToUpdate.rawId) {
      try {
        let styling = { color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20' };
        if (newStatus === 'In Progress') styling = { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' };
        if (newStatus === 'Resolved') styling = { color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/20' };
        if (newStatus === 'Audit Pending') styling = { color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', border: 'border-accent-yellow/20' };
        if (newStatus === 'Rejected') styling = { color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20' };
        
        const updateData = {
          status: newStatus,
          ...styling
        };

        if (proofData) {
          updateData.resolution_proof = {
            notes: proofData.notes,
            images: proofData.images, // Actual URLs or DataURLs
            admin_name: proofData.admin_name,
            admin_id: proofData.admin_id,
            timestamp: new Date().toISOString()
          };
          updateData.admin_photo = proofData.images[0] || null;
          updateData.is_verified = proofData.is_verified;
          updateData.audit_result = proofData.audit_result;
          updateData.audit_distance_meters = proofData.audit_distance_meters;
          updateData.cleanup_efficiency = proofData.cleanup_efficiency || 0;
          updateData.items_before = proofData.items_before || [];
          updateData.items_after = proofData.items_after || [];
        }

        await updateDoc(doc(db, 'citizen_reports', issueToUpdate.rawId), updateData);
      } catch (err) {
        console.error("Failed to update status in Firebase", err);
      }
    } else {
      // Fallback for mocked static initial issues
      const nextIssues = issues.map(issue => {
        if (issue.id === id) {
          return {
            ...issue,
            status: newStatus,
            resolution_proof: proofData ? { notes: proofData.notes } : null
          };
        }
        return issue;
      });
      setIssues(nextIssues);
    }
  };

  const locations = ['All Locations', ...new Set(initialIssues.map(i => i.location))];

  const filteredIssues = issues.filter(issue => {
    const statusMatch = statusFilter === 'All' || 
      (statusFilter === 'Pending' && issue.status === 'Pending Review') ||
      (statusFilter === 'Running' && issue.status === 'In Progress') ||
      (statusFilter === 'Solved' && issue.status === 'Resolved') ||
      (statusFilter === 'Audit Flagged' && issue.status === 'Audit Pending') ||
      (statusFilter === 'Rejected' && issue.status === 'Rejected');
    
    const locationMatch = locationFilter === 'All Locations' || issue.location === locationFilter;
    
    return statusMatch && locationMatch;
  });

  const statusFilters = ['All', 'Pending', 'Running', 'Audit Flagged', 'Solved', 'Rejected'];

  const getStatusColor = (status) => {
    if (status === 'Resolved') return 'bg-green-500/10 text-accentGreen border-green-500/20';
    if (status === 'Audit Pending') return 'bg-yellow-500/10 text-accentYellow border-yellow-500/20';
    if (status === 'In Progress') return 'bg-blue-500/10 text-primary border-blue-500/20';
    if (status === 'Rejected') return 'bg-red-500/10 text-accentRed border-red-500/20';
    return 'bg-yellow-500/10 text-accentYellow border-yellow-500/20';
  };

  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass}`}>
      {/* Header and Filters */}
      <div className="bg-[var(--card-bg)]/80 px-4 py-4 border-b border-[var(--border-color)] backdrop-blur-sm flex flex-wrap items-center justify-between sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-accentGreen rounded-full animate-pulse shadow-glow-green"></div>
          <h3 className="font-semibold text-lg text-text-primary">Live Report Management</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Filter */}
          <select 
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-[var(--input-bg)] border border-[var(--border-color)] text-text-primary text-xs rounded-lg focus:ring-primary focus:border-primary block p-2 transition-all outline-none"
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex gap-1 bg-[var(--input-bg)]/50 p-1 rounded-lg border border-[var(--border-color)]">
            {statusFilters.map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-[10px] lg:text-xs font-medium rounded-md transition-all ${statusFilter === f ? 'bg-primary text-white shadow-glow-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm text-text-secondary whitespace-nowrap">
          <thead className="text-xs uppercase bg-[var(--input-bg)]/50 border-b border-[var(--border-color)] text-text-primary">
            <tr>
              <th className="px-4 py-4 font-semibold">Incident ID & Details</th>
              <th className="px-4 py-4 font-semibold">Location</th>
              <th className="px-4 py-4 font-semibold">Source</th>
              <th className="px-4 py-4 font-semibold text-center">Verification</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode='popLayout'>
              {filteredIssues.map((i) => (
                  <motion.tr 
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={i.id} 
                  className="border-b border-[var(--border-color)]/50 hover:bg-[var(--input-bg)]/40 transition-all group"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                        {i.image_proof ? (
                          <img src={i.image_proof} className="w-full h-full object-cover" alt="Proof Thumbnail" />
                        ) : (
                          i.type.includes('Citizen') ? <ImageIcon className="h-5 w-5 text-gray-500" /> : <div className="text-xs font-bold text-gray-500">IoT</div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary group-hover:text-primary transition-colors">#{i.id} {i.issue}</div>
                        <div className="text-xs text-text-secondary mt-1">{i.type} • {i.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-text-primary">
                    <span className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                      {i.location}
                    </span>
                  </td>
                  <td className="px-4 py-4">{i.source}</td>
                  <td className="px-4 py-4 text-center">
                    {i.resolution_proof ? (
                      <div className="flex justify-center">
                        <div 
                          className={`p-1 px-3 border rounded-full flex items-center gap-1.5 cursor-help transition-all shadow-sm
                            ${i.is_verified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}
                          `} 
                          title={`${i.audit_result}\nNotes: ${i.resolution_proof.notes}`}
                        >
                          <ShieldCheck className="h-3 w-3 shadow-glow" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">
                            {i.is_verified 
                              ? `${Math.round((i.cleanup_efficiency || 0) * 100)}% Clean` 
                              : 'Breach'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-text-secondary opacity-50 italic">No proof yet</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${getStatusColor(i.status)}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {(i.status === 'Pending Review' || i.status === 'Rejected') && (
                         <>
                           <button onClick={() => updateStatus(i.id, 'In Progress')} className="p-2 bg-blue-500/10 text-primary hover:bg-blue-500/30 border border-blue-500/20 rounded-lg transition-all active:scale-90" title="Start Progress">
                             <Play className="h-4 w-4" />
                           </button>
                           {i.status !== 'Rejected' && (
                             <button onClick={() => updateStatus(i.id, 'Rejected')} className="p-2 bg-red-500/10 text-accentRed hover:bg-red-500/30 border border-red-500/20 rounded-lg transition-all active:scale-90" title="Reject Report">
                               <X className="h-4 w-4" />
                             </button>
                           )}
                         </>
                       )}
                       {i.status === 'In Progress' && (
                         <button onClick={() => updateStatus(i.id, 'Resolved')} className="px-4 py-2 bg-accentGreen/10 text-accentGreen hover:bg-accentGreen/20 border border-accentGreen/20 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs shadow-sm" title="Mark as Solved">
                           <Check className="h-4 w-4" /> Resolve
                         </button>
                       )}
                       {i.status === 'Resolved' && (
                         <span className="text-xs text-text-secondary font-bold px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl opacity-60">Verified</span>
                       )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-[var(--input-bg)] rounded-full text-text-secondary opacity-30"><ImageIcon size={40} /></div>
                    <p className="text-sm text-text-secondary">No matching resolution reports found.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Resolve Proof Modal Interceptor */}
      <AnimatePresence>
        {resolveProofContext && (
          <ResolveProofModal 
            issue={resolveProofContext}
            user={user}
            onConfirm={(data) => updateStatus(resolveProofContext.id, 'Resolved', data)}
            onCancel={() => setResolveProofContext(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
