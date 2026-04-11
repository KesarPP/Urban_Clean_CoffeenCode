import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Trash2 } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { useEffect } from 'react';

// Geoapify API Key (Placeholder - User should replace this with their actual key)
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "";

const mockBins = [
  { id: 101, pos: [18.9218, 72.8347], cap: 80, status: 'warning', area: 'Colaba Causeway' },
  { id: 102, pos: [19.0178, 72.8478], cap: 100, status: 'critical', area: 'Dadar Station' },
  { id: 103, pos: [19.0596, 72.8295], cap: 45, status: 'good', area: 'Bandra West' },
  { id: 104, pos: [19.1075, 72.8263], cap: 95, status: 'critical', area: 'Juhu Beach' },
  { id: 105, pos: [19.2288, 72.8541], cap: 20, status: 'good', area: 'Borivali East' },
  { id: 106, pos: [19.1136, 72.8697], cap: 90, status: 'critical', area: 'Andheri East' },
  { id: 107, pos: [19.0760, 72.8777], cap: 70, status: 'warning', area: 'BKC Hub' },
  { id: 108, pos: [19.0330, 72.8426], cap: 60, status: 'warning', area: 'Mahim' },
  { id: 109, pos: [19.1550, 72.9370], cap: 30, status: 'good', area: 'Powai Lake' },
  { id: 110, pos: [19.1740, 72.9530], cap: 85, status: 'warning', area: 'Vikhroli West' },
  { id: 111, pos: [19.1960, 72.9580], cap: 100, status: 'critical', area: 'Kanjurmarg East' },
  { id: 112, pos: [19.2183, 72.9781], cap: 55, status: 'good', area: 'Bhandup West' },
  { id: 113, pos: [19.2500, 72.9800], cap: 92, status: 'critical', area: 'Mulund Check Naka' },
  { id: 114, pos: [19.0850, 72.9080], cap: 40, status: 'good', area: 'Kurla West' },
  { id: 115, pos: [19.0544, 72.8400], cap: 78, status: 'warning', area: 'Bandra East' },
  { id: 116, pos: [19.1400, 72.8300], cap: 88, status: 'warning', area: 'Versova' },
  { id: 117, pos: [19.1200, 72.8500], cap: 100, status: 'critical', area: 'Jogeshwari East' },
  { id: 118, pos: [19.2100, 72.8400], cap: 25, status: 'good', area: 'Kandivali West' },
  { id: 119, pos: [19.2600, 72.8600], cap: 65, status: 'warning', area: 'Dahisar East' },
  { id: 120, pos: [18.9400, 72.8200], cap: 50, status: 'good', area: 'Fort' }
];

// Custom Heatmap Layer component
const HeatmapLayer = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points.length) return;

    // Heatmap data format: [lat, lng, intensity]
    const heatData = points.map(p => [...p.pos, p.cap / 100]);
    
    const heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

// Helper to create glowing HTML markers based on bin fullness
const createBinIcon = (status) => {
  let bgColor, ringColor;
  if (status === 'critical') { bgColor = 'bg-red-500'; ringColor = 'ring-red-500/50'; }
  else if (status === 'warning') { bgColor = 'bg-yellow-500'; ringColor = 'ring-yellow-500/50'; }
  else { bgColor = 'bg-green-500'; ringColor = 'ring-green-500/50'; }

  const html = renderToString(
    <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center ring-4 ${ringColor} shadow-lg animate-pulse`}>
      <Trash2 className="w-4 h-4 text-white" />
    </div>
  );

  return L.divIcon({
    html: html,
    className: 'custom-bin-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export default function MapView({ spanClass = '' }) {
  // Geoapify Dark Matter Tile URL
  const geoapifyUrl = `https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;

  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass} shadow-glow-primary`}>
      <div className="bg-[var(--card-bg)]/90 px-5 py-4 border-b border-[var(--border-color)] backdrop-blur-xl z-20 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-text-primary">Live Smart Bin Heatmap (Powered by Geoapify)</h3>
          <p className="text-xs text-text-secondary mt-1">Real-time IoT sensor data tracking garbage capacities across Mumbai.</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-2 text-xs text-text-primary"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Full (High Heat)</div>
           <div className="flex items-center gap-2 text-xs text-text-primary"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Warning</div>
           <div className="flex items-center gap-2 text-xs text-text-primary"><span className="w-2 h-2 rounded-full bg-green-500"></span> Empty</div>
        </div>
      </div>
      
      <div className="flex-1 relative z-0 min-h-[400px] bg-[var(--bg-color)]">
        <MapContainer center={[19.0760, 72.8777]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.geoapify.com/">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={geoapifyUrl}
          />
          
          <HeatmapLayer points={mockBins} />
          
          {mockBins.map(b => (
             <Marker key={b.id} position={b.pos} icon={createBinIcon(b.status)}>
               <Popup className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl p-0">
                 <div className="p-4 bg-[var(--card-bg)] min-w-[200px]">
                   <h4 className="font-bold text-text-primary text-lg mb-1 flex items-center gap-2">
                     <Trash2 className="w-4 h-4 text-primary" /> Bin #{b.id}
                   </h4>
                   <p className="text-text-secondary text-sm mb-3">Location: {b.area}</p>
                   
                   <div className="bg-[var(--input-bg)] rounded-lg p-3">
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-xs font-semibold text-text-primary">Fill Capacity</span>
                       <span className={`text-xs font-bold ${b.status === 'critical' ? 'text-red-400' : b.status === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>{b.cap}%</span>
                     </div>
                     <div className="w-full bg-[var(--border-color)] rounded-full h-1.5 overflow-hidden">
                       <div className={`h-1.5 rounded-full ${b.status === 'critical' ? 'bg-red-500' : b.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${b.cap}%` }}></div>
                     </div>
                   </div>
                 </div>
               </Popup>
             </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
