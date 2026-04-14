import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  BadgeCheck,
  UserCheck,
  Handshake,
} from 'lucide-react';

function normalize(value) {
  return (value || '').toLowerCase().trim();
}

export default function AdminNgoPanel() {
  const [ngos, setNgos] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedNgo, setSelectedNgo] = useState({});

  useEffect(() => {
    // Optimized query to only fetch users with role 'ngo'
    const ngoQuery = query(collection(db, 'users'), where('role', '==', 'ngo'));
    const unsubUsers = onSnapshot(ngoQuery, (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => {
        list.push({ id: entry.id, ...entry.data() });
      });
      setNgos(list);
    });

    const unsubReports = onSnapshot(collection(db, 'citizen_reports'), (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => list.push({ id: entry.id, ...entry.data() }));
      setReports(list);
    });

    return () => {
      unsubUsers();
      unsubReports();
    };
  }, []);

  const pendingReports = useMemo(() => {
    return reports.filter((item) => item.status !== 'Resolved' && item.status !== 'Rejected');
  }, [reports]);

  const toggleVerification = async (ngo) => {
    try {
      await updateDoc(doc(db, 'users', ngo.id), {
        ngo_verified: !ngo.ngo_verified
      });
    } catch (error) {
      console.error('Failed to update NGO verification', error);
      alert('Failed to update verification status.');
    }
  };

  const assignReport = async (report) => {
    const ngoId = selectedNgo[report.id];
    if (!ngoId) {
      alert('Please select an NGO first.');
      return;
    }

    const ngo = ngos.find((item) => item.id === ngoId);
    if (!ngo) return;

    try {
      await updateDoc(doc(db, 'citizen_reports', report.id), {
        status: 'In Progress',
        assigned_ngo_id: ngo.id,
        assigned_ngo_name: ngo.name || ngo.email || 'NGO',
        ngo_task_status: 'Assigned',
        ngo_task: {
          status: 'Assigned',
          assigned_at: new Date().toISOString(),
          assigned_by: 'admin'
        }
      });
    } catch (error) {
      console.error('Failed to assign report to NGO', error);
      alert('Failed to assign complaint.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* NGO Verification Section */}
      <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
          <BadgeCheck size={18} /> NGO Verification
        </h3>
        <div className="mt-4 space-y-3">
          {ngos.length === 0 && <p className="text-sm text-text-secondary">No NGO accounts found yet.</p>}
          {ngos.map((ngo) => (
            <div key={ngo.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] flex justify-between items-center gap-3">
              <div>
                <p className="font-semibold text-text-primary">{ngo.name || 'Unnamed NGO'}</p>
                <p className="text-xs text-text-secondary">{ngo.email || 'No email'} • {ngo.ngo_coverage || 'Coverage not set'}</p>
                <p className="text-xs text-text-secondary mt-1">
                  Focus: {Array.isArray(ngo.ngo_focus_areas) && ngo.ngo_focus_areas.length ? ngo.ngo_focus_areas.join(', ') : 'Not set'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleVerification(ngo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${ngo.ngo_verified
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30'
                  }`}
              >
                {ngo.ngo_verified ? 'Verified' : 'Verify NGO'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Assignment Section */}
      <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
        <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
          <Handshake size={18} /> Manual Complaint Assignment
        </h3>
        <div className="mt-4 space-y-3">
          {pendingReports.length === 0 && <p className="text-sm text-text-secondary">No active complaints available for assignment.</p>}
          {pendingReports.map((report) => {
            const areaText = normalize(report.area_name || report.location || '');
            return (
              <div key={report.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] grid grid-cols-1 lg:grid-cols-[2fr_1fr_auto] gap-3 items-center">
                <div>
                  <p className="font-semibold text-text-primary">{report.title || 'Untitled Complaint'}</p>
                  <p className="text-xs text-text-secondary">
                    Area: {report.area_name || report.location || 'Unknown'} • Current: {report.assigned_ngo_name || 'Unassigned'}
                  </p>
                </div>
                <select
                  value={selectedNgo[report.id] || ''}
                  onChange={(e) => setSelectedNgo(prev => ({ ...prev, [report.id]: e.target.value }))}
                  className="px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm"
                >
                  <option value="">Select NGO</option>
                  {ngos.map((ngo) => (
                    <option key={ngo.id} value={ngo.id}>
                      {ngo.name || ngo.email}
                      {areaText && normalize(ngo.ngo_coverage || '').includes(areaText) ? ' (coverage match)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => assignReport(report)}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <UserCheck size={14} /> Assign
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}