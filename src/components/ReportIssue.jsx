import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Loader2, Video, XCircle, Crosshair, Upload } from 'lucide-react';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useTheme } from '../context/ThemeContext';

// Define high-reliability SVGs for markers to prevent Vite asset path issues
const PULSE_ID = 'map-pulse-anim';

const incidentIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="position: relative;">
      <div style="background: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>
      <div style="position: absolute; top: -1px; left: -1px; background: #3B82F6; width: 16px; height: 16px; border-radius: 50%; opacity: 0.4; animation: pulse 1.5s infinite;"></div>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.4; }
        100% { transform: scale(2.8); opacity: 0; }
      }
    </style>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function LocationPinner({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position === null ? null : <Marker position={position} icon={incidentIcon} />;
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'waste', label: '🗑️ Waste Collection' },
  { id: 'water', label: '💧 Water / Leak' },
  { id: 'pothole', label: '🕳️ Pothole' },
  { id: 'other', label: '⚠️ Other Issue' },
];

const CATEGORY_TO_FOCUS = {
  waste: 'Cleanliness',
  water: 'Water',
  pothole: 'Environment',
  other: 'Public Health'
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportIssue() {
  const [position, setPosition] = useState(null);
  const [autoLocation, setAutoLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cat, setCat] = useState('waste');
  const [desc, setDesc] = useState('');
  const [areaName, setAreaName] = useState('');
  const { theme } = useTheme();

  // AI Tracking States
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── GPS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setAutoLocation(loc);
        setPosition(prev => prev ?? loc);
      },
      err => console.warn('Geolocation:', err),
      { enableHighAccuracy: true }
    );
  }, []);

  // ── Assign stream → video element whenever either changes ─────────────────
  // This is THE critical fix: a dedicated useEffect watches both refs.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject === stream) return; // already assigned
    video.srcObject = stream;
    video.play().catch(err => console.warn('video.play():', err));
  }, [stream, cameraActive]); // re-run when stream arrives OR camera becomes visible

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => stopCamera();
  }, []); // eslint-disable-line

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCapturedPhoto(null);
    try {
      const constraints = {
        video: {
          // Prefer rear camera on mobile, fallback gracefully on desktop
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
      const msg =
        err.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access in your browser.' :
          err.name === 'NotFoundError' ? 'No camera found on this device.' :
            err.name === 'NotReadableError' ? 'Camera is already in use by another app.' :
              `Camera error: ${err.message}`;
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop());
      return null;
    });
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState < 2) {
      alert('Camera not ready yet — wait a moment and try again.');
      return;
    }

    const MAX = 1280;
    const scale = Math.min(1, MAX / video.videoWidth, MAX / video.videoHeight);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Geotag overlay
    const loc = autoLocation;
    const BAR = 60;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, canvas.height - BAR, canvas.width, BAR);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(
      loc ? `LAT ${loc.lat.toFixed(6)}  LNG ${loc.lng.toFixed(6)}` : 'GPS unavailable',
      14, canvas.height - 36
    );

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '13px monospace';
    ctx.fillText(`TIME: ${new Date().toLocaleString()}`, 14, canvas.height - 14);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [autoLocation, stopCamera]);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const MAX = 1280;
        const scale = Math.min(1, MAX / img.width, MAX / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const BAR = Math.max(60, canvas.height * 0.09);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, canvas.height - BAR, canvas.width, BAR);

        const loc = autoLocation;
        const fs = Math.max(14, canvas.height * 0.028);
        ctx.fillStyle = '#10B981';
        ctx.font = `bold ${fs}px monospace`;
        ctx.fillText(
          loc ? `LAT ${loc.lat.toFixed(6)}  LNG ${loc.lng.toFixed(6)}` : 'GPS unavailable',
          18, canvas.height - BAR * 0.55
        );

        ctx.fillStyle = '#D1D5DB';
        ctx.font = `${fs * 0.8}px monospace`;
        ctx.fillText(`TIME: ${new Date().toLocaleString()}`, 18, canvas.height - BAR * 0.18);

        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    // reset so same file can be re-uploaded
    e.target.value = '';
  };

  // ── AI Real-Time Scanning ─────────────────────────────────────────────────
  useEffect(() => {
    if (!capturedPhoto) {
      setAiAnalysis(null);
      return;
    }
    
    // Quick guard to prevent infinite loops if we reset to blurred photo
    if (capturedPhoto.length < 500) return; 

    const analyzeImage = async () => {
      setIsAiScanning(true);
      try {
        const aiResponse = await fetch('http://localhost:5001/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: capturedPhoto })
        });
        const aiResult = await aiResponse.json();
        if (aiResult && !aiResult.error) {
           setAiAnalysis(aiResult);
           
           // Automatically set category if confident
           if (aiResult.detections && aiResult.detections.length > 0) {
             const cats = aiResult.detections.map(d => d.civic_category);
             if (cats.includes('Litter/Waste')) setCat('waste');
             else if (cats.includes('Infrastructure') || cats.includes('Vehicle Obstruction')) setCat('other');
           }
        }
      } catch (err) {
        console.warn('Real-time AI Scan failed:', err);
        alert('⚠️ AI Detection Service Offline. Ensure app.py is running on Port 5001. ' + err.message);
      } finally {
        setIsAiScanning(false);
      }
    };
    analyzeImage();
  }, [capturedPhoto]);

  // ── NGO auto-assignment (area + focus) ───────────────────────────────────
  const findAutoAssignedNgo = async ({ areaInput, categoryId }) => {
    const normalizedArea = (areaInput || '').toLowerCase().trim();
    if (!normalizedArea) return null;

    const targetFocus = CATEGORY_TO_FOCUS[categoryId] || null;

    const [usersSnap, adoptionsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'ngo_adoptions'))
    ]);

    const ngoMap = new Map();
    usersSnap.forEach((entry) => {
      const data = entry.data();
      if (data.role === 'ngo' && data.ngo_verified) {
        ngoMap.set(entry.id, { id: entry.id, ...data });
      }
    });

    if (ngoMap.size === 0) return null;

    const scored = new Map();
    adoptionsSnap.forEach((entry) => {
      const data = entry.data();
      if (!ngoMap.has(data.ngo_id)) return;

      const adoptedArea = (data.area_name || '').toLowerCase().trim();
      if (!adoptedArea) return;

      const isAreaMatch = normalizedArea.includes(adoptedArea) || adoptedArea.includes(normalizedArea);
      if (!isAreaMatch) return;

      const ngo = ngoMap.get(data.ngo_id);
      const focusAreas = Array.isArray(ngo.ngo_focus_areas) ? ngo.ngo_focus_areas : [];
      const isFocusMatch = !targetFocus || focusAreas.length === 0 || focusAreas.includes(targetFocus);
      if (!isFocusMatch) return;

      const prev = scored.get(ngo.id) || { score: 0, ngo };
      const nextScore = prev.score + 1 + (targetFocus && focusAreas.includes(targetFocus) ? 1 : 0);
      scored.set(ngo.id, { ngo, score: nextScore });
    });

    if (scored.size === 0) return null;
    return [...scored.values()].sort((a, b) => b.score - a.score)[0].ngo;
  };

  // ── Submit & AI Verification ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!capturedPhoto) {
      alert('A geo-stamped photo is required.');
      return;
    }
    if (isAiScanning) {
      alert('Please wait for the AI analysis to finish before submitting.');
      return;
    }
    
    setSubmitting(true);

    let finalPhoto = capturedPhoto;
    let aiData = { severity: 'NONE', detections: [], count: 0 };

    if (aiAnalysis) {
      aiData = {
        severity: aiAnalysis.severity || 'LOW',
        detections: aiAnalysis.detections || [],
        count: aiAnalysis.count || 0
      };
      if (aiAnalysis.processed_image) {
        finalPhoto = aiAnalysis.processed_image; 
      }
    }

    try {
      const autoNgo = await findAutoAssignedNgo({ areaInput: areaName, categoryId: cat });
      const docRef = await addDoc(collection(db, 'citizen_reports'), {
        title: CATEGORIES.find(c => c.id === cat)?.label ?? 'Issue',
        date: new Date().toLocaleString(),
        status: autoNgo ? 'In Progress' : 'Pending Review',
        description: desc || 'No description provided.',
        area_name: areaName.trim() || 'Unspecified Area',
        location: position ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : 'Unknown',
        location_coords: position ? { lat: position.lat, lng: position.lng } : null,
        image_proof: finalPhoto,
        ai_analysis: aiData,
        assigned_ngo_id: autoNgo ? autoNgo.id : null,
        assigned_ngo_name: autoNgo ? (autoNgo.name || autoNgo.email || 'NGO') : null,
        ngo_task_status: autoNgo ? 'Assigned' : null,
        ngo_task: autoNgo ? {
          status: 'Assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: 'system-auto',
          matching_basis: 'area+focus'
        } : null,
        color: aiData.severity === 'HIGH' ? 'text-red-500' : 'text-accentYellow',
        bg: aiData.severity === 'HIGH' ? 'bg-red-500/10' : 'bg-accentYellow/10',
        border: aiData.severity === 'HIGH' ? 'border-red-500/20' : 'border-accentYellow/20',
        timestamp: Date.now()
      });
      // 3. Automated Municipal Dispatch for Critical Incidents
      if (aiData.severity === 'HIGH') {
        try {
          fetch('http://localhost:8005/dispatch/automated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incident_id: docRef.id,
              severity: aiData.severity,
              category: CATEGORIES.find(c => c.id === cat)?.label ?? 'Issue',
              location: position ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}` : 'Unknown',
              detections: aiData.detections
            })
          }).catch(e => console.error("Dispatch trigger error:", e));
          
          alert(`Report submitted successfully!\n\n🚨 AI PRIORITY: HIGH 🚨\nAutomated dispatch has been executed to alert municipal authorities immediately.`);
        } catch (e) {
          console.error("Automated dispatch execution failed:", e);
          alert(`Report submitted! Tracking ID: ${docRef.id.substring(0, 8).toUpperCase()}`);
        }
      } else {
        alert(`Report submitted! AI assigned Priority: ${aiData.severity}. Tracking ID is: ${docRef.id.substring(0, 8).toUpperCase()}`);
      }

      setCapturedPhoto(null);
      setDesc('');
      setAreaName('');
    } catch (err) {
      console.error('Error adding document:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>Report an Incident</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
        Capture a live geo-stamped photo, pin the location, and submit.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, background: 'var(--card-bg)', borderRadius: 20, padding: 36, border: '1px solid var(--border-color)' }}>

        {/* ── LEFT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CATEGORIES.map(c => (
                <button type="button" key={c.id} onClick={() => setCat(c.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 12, border: '1.5px solid',
                    borderColor: cat === c.id ? '#3B82F6' : 'var(--border-color)',
                    background: cat === c.id ? 'rgba(59,130,246,0.15)' : 'var(--input-bg)',
                    color: cat === c.id ? '#3B82F6' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s',
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} required rows={3}
              placeholder="Describe the incident…"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '12px 14px', color: 'var(--text-primary)', resize: 'vertical', outline: 'none', fontSize: 14 }}
            />
          </div>

          <div>
            <label style={labelStyle}>Area / Landmark</label>
            <input
              value={areaName}
              onChange={e => setAreaName(e.target.value)}
              placeholder="e.g. Bandra Station Road"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '12px 14px', color: 'var(--text-primary)', outline: 'none', fontSize: 14 }}
            />
          </div>

          {/* Camera / Photo */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Verified Visual Proof <span style={{ color: '#EF4444' }}>*</span></label>
              {autoLocation && (
                <span style={{ fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Crosshair size={11} /> GPS Active
                </span>
              )}
            </div>

            {cameraError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13, marginBottom: 12 }}>
                {cameraError}
              </div>
            )}

            {/* Idle — show two buttons */}
            {!cameraActive && !capturedPhoto && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button type="button" onClick={startCamera}
                  style={{ ...uploadBtn, borderColor: '#3B82F6', color: '#60A5FA', background: 'rgba(59,130,246,0.06)' }}>
                  <Video size={28} style={{ marginBottom: 8 }} />
                  <strong style={{ fontSize: 13 }}>Live Camera</strong>
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Auto-stamped photo</span>
                </button>

                <button type="button" onClick={() => fileInputRef.current?.click()}
                  style={{ ...uploadBtn, borderColor: '#10B981', color: '#34D399', background: 'rgba(16,185,129,0.06)' }}>
                  <Upload size={28} style={{ marginBottom: 8 }} />
                  <strong style={{ fontSize: 13 }}>Upload Photo</strong>
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Will be geo-stamped</span>
                </button>

                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
            )}

            {/* Live camera preview */}
            {cameraActive && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000', aspectRatio: '16/9' }}>
                {/* THE KEY FIX: plain ref, no callback trickery; stream is wired via useEffect above */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.7))' }}>
                  <button type="button" onClick={stopCamera} title="Cancel" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171' }}>
                    <XCircle size={28} />
                  </button>
                  <button type="button" onClick={capturePhoto}
                    style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Camera size={16} /> Capture & Stamp
                  </button>
                </div>
              </div>
            )}

            {/* Captured photo preview */}
            {capturedPhoto && (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1.5px solid #10B981', aspectRatio: '16/9' }}>
                <img src={aiAnalysis?.processed_image || capturedPhoto} alt="Geo-stamped proof" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isAiScanning ? 'blur(4px) grayscale(50%)' : 'none', transition: 'all 0.4s' }} />
                
                {/* AI Overlay Details */}
                {isAiScanning && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                    <div className="relative flex items-center justify-center mb-4">
                      <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
                      <Crosshair size={48} className="text-blue-400 animate-pulse drop-shadow-md" />
                    </div>
                    <span style={{ color: '#60A5FA', fontWeight: 800, fontSize: 16, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Urban Clean AI</span>
                    <span style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>Scanning for hazards & anonymizing data...</span>
                  </div>
                )}
                
                {/* Detection Results Overlay */}
                {!isAiScanning && aiAnalysis?.detections?.length > 0 && (
                   <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', padding: '16px 12px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                     {aiAnalysis.detections.slice(0, 3).map((det, idx) => (
                       <span key={idx} style={{ background: 'rgba(59, 130, 246, 0.9)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                         {det.civic_category}
                       </span>
                     ))}
                     {aiAnalysis.severity === 'HIGH' && (
                       <span style={{ background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6, boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)', animation: 'pulse 2s infinite' }}>🚨 HIGH PRIORITY ALERT</span>
                     )}
                   </div>
                )}

                <button type="button" onClick={() => { setCapturedPhoto(null); setAiAnalysis(null); startCamera(); }}
                  title="Retake"
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#D1D5DB' }}>
                  <XCircle size={20} />
                </button>
              </div>
            )}

            {/* Hidden canvas for compositing the stamp */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Active Location</span>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#3B82F6', marginTop: 4 }}>
              {position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : 'Waiting for GPS…'}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 320, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
            {(position || autoLocation) ? (
              <MapContainer
                center={position || autoLocation}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url={theme === 'dark'
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  }
                />
                <LocationPinner position={position} setPosition={setPosition} />
              </MapContainer>
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--input-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                <span>Acquiring GPS Signal...</span>
              </div>
            )}
          </div>

          <button type="submit"
            disabled={submitting || !position || !capturedPhoto}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
              background: (!capturedPhoto || !position) ? 'var(--input-bg)' : '#3B82F6',
              color: (!capturedPhoto || !position) ? 'var(--text-secondary)' : '#fff',
              fontWeight: 700, fontSize: 15, cursor: (!capturedPhoto || !position || submitting) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s',
            }}>
            {submitting
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
              : capturedPhoto ? '🚀 Submit Dispatch' : 'Waiting for Verified Photo'
            }
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 700,
  marginBottom: 10, color: 'var(--text-primary)', letterSpacing: 0.3,
};

const uploadBtn = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '20px 12px', borderRadius: 14, border: '1.5px dashed', background: 'transparent',
  cursor: 'pointer', transition: 'background .15s',
};