import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Play, Image as ImageIcon, Upload, FileText, ShieldCheck, Camera, MessageSquare, Users, Layers, ExternalLink, ShieldAlert, Wand2, CheckCircle2, XCircle, BadgeCheck } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

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

// ─── Section Tab Definitions ────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'whatsapp', label: 'WhatsApp Complaints', icon: MessageSquare, color: 'text-emerald-500', activeBg: 'bg-emerald-500' },
  { id: 'citizen', label: 'Citizen Reports', icon: Users, color: 'text-blue-500', activeBg: 'bg-blue-500' },
  { id: 'all', label: 'All Reports', icon: Layers, color: 'text-purple-500', activeBg: 'bg-purple-500' },
];

export default function DataTable({ user, spanClass = '' }) {
  const [activeSection, setActiveSection] = useState('whatsapp');
  const [citizenReports, setCitizenReports] = useState([]);
  const [whatsappComplaints, setWhatsappComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [resolveProofContext, setResolveProofContext] = useState(null);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());

  // ─── Firestore Listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubCitizen = onSnapshot(collection(db, 'citizen_reports'), (snapshot) => {
      const mapped = [];
      snapshot.forEach((d) => {
        const r = d.data();
        mapped.push({
          id: d.id.substring(0, 4).toUpperCase(),
          rawId: d.id,
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
          items_after: r.items_after,
          location_coords: r.location_coords,
          timestamp: r.timestamp
        });
      });
      // Sort newest first
      mapped.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setCitizenReports(mapped);
    }, (error) => {
      console.error("Failed to fetch citizen reports", error);
    });

    const unsubWhatsApp = onSnapshot(collection(db, 'whatsapp_complaints'), (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => list.push({ id: entry.id, ...entry.data() }));
      setWhatsappComplaints(list.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
    }, (error) => {
      console.error("Failed to fetch whatsapp complaints", error);
    });

    return () => {
      unsubCitizen();
      unsubWhatsApp();
    };
  }, []);

  // ─── Citizen Report Actions ──────────────────────────────────────────────────
  const handleResolveConfirm = async (proofData) => {
    const { id } = resolveProofContext;
    const finalStatus = proofData.is_verified ? 'Resolved' : 'Audit Pending';
    await updateStatus(id, finalStatus, proofData);
    setResolveProofContext(null);
  };

  const updateStatus = async (id, newStatus, proofData = null) => {
    if (newStatus === 'Resolved' && !proofData) {
      const issue = citizenReports.find(i => i.id === id);
      setResolveProofContext({ id, issue: issue?.issue });
      return;
    }

    const issueToUpdate = citizenReports.find(i => i.id === id);
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
            images: proofData.images,
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
    }
  };

  // ─── WhatsApp Complaint Actions ──────────────────────────────────────────────
  const handleAnalyze = async (complaintId) => {
    setAnalyzingIds((prev) => new Set([...prev, complaintId]));
    try {
      const response = await fetch(`http://localhost:8005/whatsapp-complaints/${complaintId}/analyze`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        console.log('Analysis successful:', result.analysis);
      } else {
        alert('Analysis failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error analyzing complaint:', error);
      alert('Could not reach analysis server.');
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(complaintId);
        return next;
      });
    }
  };

  const handleUpdateWhatsAppStatus = async (complaintId, newStatus, notify = true) => {
    try {
      const response = await fetch(`http://localhost:8005/whatsapp-complaints/${complaintId}/status?status=${newStatus}&notify=${notify}`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        console.log('Status updated successfully');
      } else {
        alert('Update failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Could not reach server.');
    }
  };

  // ─── Filtering ───────────────────────────────────────────────────────────────
  const statusFilters = ['All', 'Pending', 'Running', 'Audit Flagged', 'Solved', 'Rejected'];

  const filterByStatus = (items) => {
    return items.filter(issue => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Pending' && (issue.status === 'Pending Review' || issue.status === 'Pending')) return true;
      if (statusFilter === 'Running' && issue.status === 'In Progress') return true;
      if (statusFilter === 'Solved' && issue.status === 'Resolved') return true;
      if (statusFilter === 'Audit Flagged' && issue.status === 'Audit Pending') return true;
      if (statusFilter === 'Rejected' && issue.status === 'Rejected') return true;
      return false;
    });
  };

  const getStatusColor = (status) => {
    if (status === 'Resolved') return 'bg-green-500/10 text-accentGreen border-green-500/20';
    if (status === 'Audit Pending') return 'bg-yellow-500/10 text-accentYellow border-yellow-500/20';
    if (status === 'In Progress') return 'bg-blue-500/10 text-primary border-blue-500/20';
    if (status === 'Rejected') return 'bg-red-500/10 text-accentRed border-red-500/20';
    return 'bg-yellow-500/10 text-accentYellow border-yellow-500/20';
  };

  const filteredCitizenReports = filterByStatus(citizenReports);
  const filteredWhatsAppComplaints = filterByStatus(whatsappComplaints);
  const allReports = filterByStatus([
    ...citizenReports.map(r => ({ ...r, _source: 'citizen' })),
    ...whatsappComplaints.map(c => ({
      id: c.id.substring(0, 4).toUpperCase(),
      rawId: c.id,
      issue: c.issue_type || 'WhatsApp Report',
      type: 'WhatsApp',
      source: 'WhatsApp Bot',
      date: c.created_at?.seconds ? new Date(c.created_at.seconds * 1000).toLocaleDateString() : 'Unknown',
      status: c.status || 'Pending',
      location: c.location_address || 'Unknown',
      image_proof: c.photo_url,
      _source: 'whatsapp',
      _original: c
    }))
  ]);

  // ─── Section Counts ──────────────────────────────────────────────────────────
  const counts = {
    whatsapp: whatsappComplaints.length,
    citizen: citizenReports.length,
    all: whatsappComplaints.length + citizenReports.length
  };

  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass}`}>
      {/* Header with Section Tabs */}
      <div className="bg-[var(--card-bg)]/80 px-4 py-4 border-b border-[var(--border-color)] backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-accentGreen rounded-full animate-pulse shadow-glow-green"></div>
            <h3 className="font-semibold text-lg text-text-primary">Complaint Command Center</h3>
          </div>
          
          {/* Status Filter Pills */}
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

        {/* Section Tabs */}
        <div className="flex gap-2">
          {SECTIONS.map(section => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${active
                  ? `${section.activeBg} text-white shadow-lg scale-[1.02]`
                  : 'bg-[var(--input-bg)] text-text-secondary hover:text-text-primary border border-[var(--border-color)] hover:border-primary/30'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
                <span className={`ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-[var(--border-color)]'}`}>
                  {counts[section.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 1: WhatsApp Complaints
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'whatsapp' && (
        <div className="p-4">
          <p className="text-sm text-text-secondary mb-4">Real-time reports originating from the WhatsApp Chatbot.</p>
          
          {filteredWhatsAppComplaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4 bg-[var(--input-bg)] rounded-full text-text-secondary opacity-30"><MessageSquare size={40} /></div>
              <p className="text-sm text-text-secondary">No WhatsApp complaints match the current filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWhatsAppComplaints.map((complaint) => (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--input-bg)] flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all"
                >
                  {complaint.verified && <div className="absolute top-2 right-2 text-emerald-500"><BadgeCheck size={20} /></div>}

                  <div className="flex gap-3">
                    {complaint.photo_url ? (
                      <img
                        src={complaint.photo_url}
                        alt="Issue"
                        className="w-24 h-24 rounded-xl object-cover border border-[var(--border-color)] cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(complaint.photo_url, '_blank')}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-[var(--card-bg)] flex items-center justify-center border border-[var(--border-color)] text-text-secondary">
                        <ShieldAlert size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-text-primary truncate">{complaint.issue_type || 'WhatsApp Report'}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${complaint.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-500' :
                          complaint.status === 'In Progress' ? 'bg-blue-500/20 text-blue-500' :
                            complaint.status === 'Rejected' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                          }`}>
                          {complaint.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary line-clamp-2 mt-1">{complaint.description}</p>
                      <p className="text-[10px] text-text-secondary mt-2 flex items-center gap-1">
                        <ExternalLink size={10} /> {complaint.phone} • {complaint.location_address || 'Unknown Loc'}
                      </p>
                    </div>
                  </div>

                  {/* AI Analysis View */}
                  {complaint.ai_analysis && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 mt-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                          <Wand2 size={10} /> Gemini 3 Flash Insight
                        </p>
                        <span className="text-[10px] font-mono text-primary/60">{Math.round((complaint.ai_analysis.confidence || 0) * 100)}% Match</span>
                      </div>
                      <p className="text-xs text-text-primary leading-relaxed">{complaint.ai_analysis.summary}</p>
                      <p className="text-[10px] text-text-secondary mt-1 italic line-clamp-1">{complaint.ai_analysis.analysis}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border-color)]/50">
                    <button
                      type="button"
                      onClick={() => handleAnalyze(complaint.id)}
                      disabled={analyzingIds.has(complaint.id)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${analyzingIds.has(complaint.id)
                        ? 'bg-primary/20 text-primary cursor-wait'
                        : 'bg-[var(--card-bg)] text-text-primary border border-[var(--border-color)] hover:border-primary/50'
                        }`}
                    >
                      <Wand2 size={12} className={analyzingIds.has(complaint.id) ? 'animate-pulse' : ''} />
                      {analyzingIds.has(complaint.id) ? 'Analyzing...' : 'Analyze with AI'}
                    </button>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUpdateWhatsAppStatus(complaint.id, 'Resolved')}
                        title="Mark Resolved & Notify"
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-500/20"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => handleUpdateWhatsAppStatus(complaint.id, 'Rejected')}
                        title="Reject & Notify"
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 2: Citizen Reports Table
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'citizen' && (
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
                {filteredCitizenReports.map((i) => (
                    <motion.tr 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={i.rawId || i.id} 
                    className="border-b border-[var(--border-color)]/50 hover:bg-[var(--input-bg)]/40 transition-all group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                          {i.image_proof ? (
                            <img src={i.image_proof} className="w-full h-full object-cover" alt="Proof Thumbnail" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-500" />
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
              
              {filteredCitizenReports.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-[var(--input-bg)] rounded-full text-text-secondary opacity-30"><Users size={40} /></div>
                      <p className="text-sm text-text-secondary">No citizen reports match the current filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          SECTION 3: All Reports (Combined View)
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'all' && (
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm text-text-secondary whitespace-nowrap">
            <thead className="text-xs uppercase bg-[var(--input-bg)]/50 border-b border-[var(--border-color)] text-text-primary">
              <tr>
                <th className="px-4 py-4 font-semibold">Incident ID & Details</th>
                <th className="px-4 py-4 font-semibold">Source</th>
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode='popLayout'>
                {allReports.map((r, idx) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={`${r._source}-${r.rawId || r.id}-${idx}`}
                    className="border-b border-[var(--border-color)]/50 hover:bg-[var(--input-bg)]/40 transition-all group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                          {r.image_proof ? (
                            <img src={r.image_proof} className="w-full h-full object-cover" alt="Proof" />
                          ) : (
                            r._source === 'whatsapp'
                              ? <MessageSquare className="h-5 w-5 text-emerald-500" />
                              : <ImageIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary group-hover:text-primary transition-colors">#{r.id} {r.issue}</div>
                          <div className="text-xs text-text-secondary mt-1">{r.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${r._source === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-text-primary">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                        {r.location}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary">{r.date}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {allReports.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-[var(--input-bg)] rounded-full text-text-secondary opacity-30"><Layers size={40} /></div>
                      <p className="text-sm text-text-secondary">No reports match the current filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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
