import { useEffect, useState } from 'react';
import { collection, addDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ShieldCheck, Save, Plus, MapPin } from 'lucide-react';

const AREA_TYPES = ['Garden', 'Street', 'Public Toilet'];
const FOCUS_TYPES = ['Cleanliness', 'Environment', 'Water', 'Waste Segregation', 'Public Health'];

export default function NgoProfile({ user }) {
  const [profile, setProfile] = useState({
    name: user?.name || '',
    description: '',
    focusAreas: [],
    coverage: '',
    verified: false
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [adoptType, setAdoptType] = useState('Garden');
  const [adoptName, setAdoptName] = useState('');
  const [adoptions, setAdoptions] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      snapshot.forEach((entry) => {
        if (entry.id !== user.uid) return;
        const data = entry.data();
        setProfile((prev) => ({
          ...prev,
          name: data.name || user.name || '',
          description: data.ngo_description || '',
          focusAreas: Array.isArray(data.ngo_focus_areas) ? data.ngo_focus_areas : [],
          coverage: data.ngo_coverage || '',
          verified: !!data.ngo_verified
        }));
      });
    });

    const unsubAdoptions = onSnapshot(collection(db, 'ngo_adoptions'), (snapshot) => {
      const list = [];
      snapshot.forEach((entry) => {
        const data = entry.data();
        if (data.ngo_id === user.uid) {
          list.push({ id: entry.id, ...data });
        }
      });
      setAdoptions(list);
    });

    return () => {
      unsubUsers();
      unsubAdoptions();
    };
  }, [user?.uid, user?.name]);

  const handleFocusToggle = (focus) => {
    setProfile((prev) => {
      const exists = prev.focusAreas.includes(focus);
      return {
        ...prev,
        focusAreas: exists ? prev.focusAreas.filter((f) => f !== focus) : [...prev.focusAreas, focus]
      };
    });
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: profile.name || user.name || 'NGO User',
        role: 'ngo',
        ngo_description: profile.description,
        ngo_focus_areas: profile.focusAreas,
        ngo_coverage: profile.coverage
      });
      alert('NGO profile updated.');
    } catch (error) {
      console.error('Failed to save NGO profile', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const adoptArea = async () => {
    if (!user?.uid || !adoptName.trim()) return;

    try {
      await addDoc(collection(db, 'ngo_adoptions'), {
        ngo_id: user.uid,
        ngo_name: user.name || profile.name || 'NGO',
        area_name: adoptName.trim(),
        area_type: adoptType,
        created_at: new Date().toISOString()
      });
      setAdoptName('');
    } catch (error) {
      console.error('Failed to adopt area', error);
      alert('Could not adopt this area.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(14,165,233,0.08))] p-6 md:p-8">
        <h1 className="text-3xl md:text-4xl font-black text-text-primary">NGO Profile</h1>
        <p className="mt-2 text-text-secondary">Set your identity, focus areas, and adoption coverage so tasks are routed correctly.</p>
        <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${profile.verified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
          <ShieldCheck size={14} />
          {profile.verified ? 'Verified by Admin' : 'Verification Pending'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
          <h2 className="text-xl font-extrabold text-text-primary mb-4">Organization Details</h2>
          <div className="space-y-3">
            <input
              value={profile.name}
              onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="NGO Name"
              className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            />
            <textarea
              value={profile.description}
              onChange={(e) => setProfile((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your NGO mission and operations"
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            />
            <input
              value={profile.coverage}
              onChange={(e) => setProfile((prev) => ({ ...prev, coverage: e.target.value }))}
              placeholder="Coverage zones (e.g. Bandra, Dadar, Andheri)"
              className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            />

            <div>
              <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider font-bold">Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {FOCUS_TYPES.map((focus) => {
                  const active = profile.focusAreas.includes(focus);
                  return (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => handleFocusToggle(focus)}
                      className={`px-3 py-1.5 rounded-full text-xs border ${active ? 'bg-primary/20 border-primary text-primary' : 'bg-[var(--input-bg)] border-[var(--border-color)] text-text-secondary'}`}
                    >
                      {focus}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={saveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold"
            >
              <Save size={16} /> {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
          <h2 className="text-xl font-extrabold text-text-primary mb-4">Adopt Areas</h2>
          <div className="flex gap-2 mb-4">
            <select
              value={adoptType}
              onChange={(e) => setAdoptType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            >
              {AREA_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <input
              value={adoptName}
              onChange={(e) => setAdoptName(e.target.value)}
              placeholder="Area name (e.g. Dadar Circle)"
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            />
            <button type="button" onClick={adoptArea} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-auto">
            {adoptions.length === 0 && <p className="text-sm text-text-secondary">No adopted areas yet.</p>}
            {adoptions.map((item) => (
              <div key={item.id} className="px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-sm flex justify-between items-center">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {item.area_name}</span>
                <span className="text-text-secondary">{item.area_type}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
