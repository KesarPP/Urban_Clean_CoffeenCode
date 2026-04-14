import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ShieldCheck, Activity, Clock3, CheckCircle2, AlertTriangle, ArrowRightLeft } from 'lucide-react';

function normalize(value) {
  return (value || '').toLowerCase().trim();
}

export default function NgoDashboard({ user }) {
  const [reports, setReports] = useState([]);
  const [adoptions, setAdoptions] = useState([]);
  const [ngoMeta, setNgoMeta] = useState({ verified: false, coverage: '', focusAreas: [] });
  const [rejectReason, setRejectReason] = useState({});

  useEffect(() => {
    if (!user?.uid) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      snapshot.forEach((entry) => {
        if (entry.id !== user.uid) return;
        const data = entry.data();
        setNgoMeta({
          verified: !!data.ngo_verified,
          coverage: data.ngo_coverage || '',
          focusAreas: Array.isArray(data.ngo_focus_areas) ? data.ngo_focus_areas : []
        });
      });
    });

    const unsubAdoptions = onSnapshot(collection(db, 'ngo_adoptions'), (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => {
        const data = entry.data();
        if (data.ngo_id === user.uid) list.push({ id: entry.id, ...data });
      });
      setAdoptions(list);
    });

    const unsubReports = onSnapshot(collection(db, 'citizen_reports'), (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => list.push({ id: entry.id, ...entry.data() }));
      setReports(list);
    });

    return () => {
      unsubUsers();
      unsubAdoptions();
      unsubReports();
    };
  }, [user?.uid]);

  const adoptedNames = useMemo(() => {
    return adoptions.map((item) => normalize(item.area_name)).filter(Boolean);
  }, [adoptions]);

  const myTasks = useMemo(() => {
    return reports.filter((item) => item.assigned_ngo_id === user?.uid);
  }, [reports, user?.uid]);

  const incoming = useMemo(() => {
    return reports.filter((item) => {
      const status = item.status || '';
      if (item.assigned_ngo_id || status === 'Resolved' || status === 'Rejected') return false;
      const area = normalize(item.area_name || item.location || '');
      return adoptedNames.some((zone) => area.includes(zone));
    });
  }, [reports, adoptedNames]);

  const assigned = useMemo(() => {
    return myTasks.filter((item) => item.ngo_task_status === 'Assigned');
  }, [myTasks]);

  const active = useMemo(() => {
    return myTasks.filter((item) => item.ngo_task_status === 'Accepted' || item.status === 'In Progress');
  }, [myTasks]);

  const resolved = useMemo(() => {
    return myTasks.filter((item) => item.ngo_task_status === 'Resolved' || item.status === 'Resolved');
  }, [myTasks]);

  const avgResolutionTime = useMemo(() => {
    const durations = myTasks
      .map((item) => {
        const acceptedAt = item.ngo_task?.accepted_at;
        const resolvedAt = item.ngo_task?.resolved_at;
        if (!acceptedAt || !resolvedAt) return null;
        const diff = new Date(resolvedAt).getTime() - new Date(acceptedAt).getTime();
        if (Number.isNaN(diff) || diff < 0) return null;
        return diff / (1000 * 60 * 60);
      })
      .filter((item) => item !== null);

    if (!durations.length) return 'N/A';
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return `${avg.toFixed(1)}h`;
  }, [myTasks]);

  const acceptTask = async (reportId, reportTitle) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'citizen_reports', reportId), {
        status: 'In Progress',
        assigned_ngo_id: user.uid,
        assigned_ngo_name: user.name || 'NGO',
        ngo_task_status: 'Accepted',
        ngo_task: {
          status: 'Accepted',
          accepted_at: new Date().toISOString(),
          title: reportTitle
        }
      });
    } catch (error) {
      console.error('Failed to accept task', error);
      alert('Could not accept this task.');
    }
  };

  const rejectTask = async (reportId) => {
    const reason = (rejectReason[reportId] || '').trim();
    if (!reason) {
      alert('Reject reason is required.');
      return;
    }

    try {
      await updateDoc(doc(db, 'citizen_reports', reportId), {
        status: 'Pending Review',
        assigned_ngo_id: null,
        assigned_ngo_name: null,
        ngo_task_status: 'Rejected',
        ngo_task: {
          status: 'Rejected',
          rejected_at: new Date().toISOString(),
          rejected_reason: reason,
          rejected_by_ngo_id: user.uid
        }
      });
      setRejectReason((prev) => ({ ...prev, [reportId]: '' }));
    } catch (error) {
      console.error('Failed to reject task', error);
      alert('Could not reject task.');
    }
  };

  const markResolved = async (reportId, existingTask = {}) => {
    try {
      await updateDoc(doc(db, 'citizen_reports', reportId), {
        status: 'Resolved',
        ngo_task_status: 'Resolved',
        ngo_task: {
          ...existingTask,
          status: 'Resolved',
          resolved_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to resolve task', error);
      alert('Could not mark task as resolved.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <section className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(125deg,rgba(59,130,246,0.16),rgba(16,185,129,0.08),rgba(245,158,11,0.08))] p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-black text-text-secondary">NGO Command Center</p>
            <h1 className="text-3xl md:text-4xl font-black text-text-primary mt-1">Field Operations Board</h1>
            <p className="text-text-secondary mt-2">Live assignment pipeline for adopted zones.</p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${ngoMeta.verified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
            <ShieldCheck size={14} />
            {ngoMeta.verified ? 'Verified NGO' : 'Verification Pending'}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatChip title="Incoming" value={incoming.length} tone="blue" icon={ArrowRightLeft} />
        <StatChip title="Assigned" value={assigned.length} tone="amber" icon={Clock3} />
        <StatChip title="Active" value={active.length} tone="indigo" icon={Activity} />
        <StatChip title="Resolved" value={resolved.length} tone="emerald" icon={CheckCircle2} />
        <StatChip title="Avg Resolve" value={avgResolutionTime} tone="slate" icon={AlertTriangle} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <TaskLane
          title="Incoming In My Zones"
          accent="blue"
          tasks={incoming}
          empty="No unassigned complaints in your adopted zones."
          onAccept={acceptTask}
        />

        <TaskLane
          title="Assigned To My NGO"
          accent="amber"
          tasks={assigned}
          empty="No assigned tasks waiting for acceptance."
          onAccept={acceptTask}
          onReject={rejectTask}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
        />

        <TaskLane
          title="Active Execution"
          accent="emerald"
          tasks={active}
          empty="No active tasks right now."
          onResolve={markResolved}
          onReject={rejectTask}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
        />
      </section>
    </div>
  );
}

function StatChip({ title, value, tone, icon: Icon }) {
  const tones = {
    blue: 'from-blue-500/20 to-sky-500/10 border-blue-500/30 text-blue-300',
    amber: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300',
    indigo: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30 text-indigo-300',
    emerald: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300',
    slate: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30 text-slate-300'
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tones[tone]} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest font-bold text-text-secondary">{title}</p>
        <Icon size={14} />
      </div>
      <p className="text-2xl font-black mt-3 text-text-primary">{value}</p>
    </div>
  );
}

function TaskLane({ title, accent, tasks, empty, onAccept, onResolve, onReject, rejectReason, setRejectReason }) {
  const accentMap = {
    blue: 'border-blue-500/30',
    amber: 'border-amber-500/30',
    emerald: 'border-emerald-500/30'
  };

  return (
    <div className={`rounded-2xl border ${accentMap[accent]} bg-[var(--card-bg)] p-4`}> 
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-text-primary mb-3">{title}</h2>
      <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
        {tasks.length === 0 && <p className="text-sm text-text-secondary">{empty}</p>}
        {tasks.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] p-3">
            <p className="font-bold text-text-primary">{item.title || 'Untitled Complaint'}</p>
            <p className="text-xs text-text-secondary mt-1">Area: {item.area_name || item.location || 'Unknown'}</p>
            <p className="text-xs text-text-secondary">Status: {item.ngo_task_status || item.status || 'Pending'}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {onAccept && (
                <button
                  type="button"
                  onClick={() => onAccept(item.id, item.title || 'Complaint')}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm"
                >
                  Accept
                </button>
              )}

              {onResolve && (
                <button
                  type="button"
                  onClick={() => onResolve(item.id, item.ngo_task || {})}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm"
                >
                  Resolve
                </button>
              )}

              {onReject && (
                <>
                  <input
                    value={rejectReason?.[item.id] || ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Reject reason"
                    className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onReject(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
