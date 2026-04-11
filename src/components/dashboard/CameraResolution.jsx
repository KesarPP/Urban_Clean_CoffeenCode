import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, XCircle, Upload } from 'lucide-react';

/* 
  ADMIN VERSION of the 'Perfect' Citizen Camera Logic.
  Synchronized with ReportIssue.jsx as requested.
*/

export default function LiveCameraCapture({ onCapture, onClear, capturedImage }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [autoLocation, setAutoLocation] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Use the prop as the source of truth if provided
  const capturedPhoto = capturedImage ? capturedImage.preview : null;

  // ── GPS ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setAutoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS Error:', err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // ── Video Mounting (Proprietary 'Perfect' Logic) ────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    if (video.srcObject === stream) return; 
    video.srcObject = stream;
    video.play().catch(err => console.warn('video.play():', err));
  }, [stream, cameraActive]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError('');
    onClear(); // Clear existing photo
    try {
      const constraints = {
        video: {
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
        err.name === 'NotAllowedError' ? 'Camera permission denied. Please allow camera access.' :
        err.name === 'NotFoundError' ? 'No camera found on this device.' :
        'Camera failed to start. (Possible insecure context)';
      setCameraError(msg);
    }
  }, [onClear]);

  // ── Capture Logic ────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX = 1280;
    const scale = Math.min(1, MAX / video.videoWidth, MAX / video.videoHeight);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const BAR = Math.max(70, canvas.height * 0.1);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, canvas.height - BAR, canvas.width, BAR);

    const fs = Math.max(14, canvas.height * 0.028);
    ctx.fillStyle = '#10B981';
    ctx.font = `bold ${fs}px monospace`;
    ctx.fillText(
      autoLocation ? `LAT ${autoLocation.lat.toFixed(6)}  LNG ${autoLocation.lng.toFixed(6)}` : 'GPS unavailable',
      18, canvas.height - BAR * 0.55
    );

    ctx.fillStyle = '#D1D5DB';
    ctx.font = `${fs * 0.8}px monospace`;
    ctx.fillText(`RESOLVED: ${new Date().toLocaleString()}`, 18, canvas.height - BAR * 0.18);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    onCapture({ preview: dataUrl, location: autoLocation });
    stopCamera();
  }, [autoLocation, onCapture, stopCamera]);

  const uploadBtn = { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '32px 14px', borderRadius: 14, border: '2px dashed', cursor: 'pointer', transition: 'all .2s',
    width: '100%'
  };

  return (
    <div style={{ width: '100%', fontFamily: 'system-ui, sans-serif' }}>
      {cameraError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #EF4444', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13, marginBottom: 12 }}>
          {cameraError}
        </div>
      )}

      {/* Idle — show activation button */}
      {!cameraActive && !capturedPhoto && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <button type="button" onClick={startCamera}
            style={{ ...uploadBtn, borderColor: '#3B82F6', color: '#60A5FA', background: 'rgba(59,130,246,0.06)' }}>
            <Video size={32} style={{ marginBottom: 12 }} />
            <strong style={{ fontSize: 14 }}>Activate Resolution Camera</strong>
            <span style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Authentic Live Capture Required</span>
          </button>
        </div>
      )}

      {/* Live camera preview */}
      {cameraActive && (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000', aspectRatio: '16/9' }}>
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
          <img src={capturedPhoto} alt="Geo-stamped proof" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={() => { onClear(); startCamera(); }}
            title="Retake"
            style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#D1D5DB' }}>
            <XCircle size={20} />
          </button>
        </div>
      )}

      {/* Hidden canvas for compositing the stamp */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
