import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const dataProfit = [
  { name: '1', usd: 872 }, { name: '2', usd: 1220 }, { name: '3', usd: 742 },
  { name: '4', usd: 655 }, { name: '5', usd: 1130 }, { name: '6', usd: 1175 },
  { name: '7', usd: 884 }, { name: '8', usd: 525 }, { name: '9', usd: 1318 },
  { name: '10', usd: 856 }, { name: '11', usd: 1011 }, { name: '12', usd: 825 },
];

const dataWaste = [
  { time: '9', val: 769 }, { time: '10', val: 1094 }, { time: '11', val: 1047 },
  { time: '12', val: 1733 }, { time: '13', val: 1094 }, { time: '14', val: 873 },
  { time: '15', val: 1135 }, { time: '16', val: 1438 }, { time: '17', val: 1506 },
];

const dataCases = [
  { name: 'Resolved', value: 942, color: '#22C55E' },
  { name: 'Undergoing Work', value: 256, color: '#F59E0B' },
  { name: 'Pending Review', value: 50, color: '#3B82F6' },
];

export function CaseDistributionPieChart({ spanClass = '' }) {
  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass}`}>
      <div className="bg-[var(--card-bg)]/80 px-4 py-3 border-b border-[var(--border-color)] backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-text-primary">Case Distribution</h3>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataCases}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {dataCases.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{backgroundColor: '#111827', borderColor: '#374151', color: '#E5E7EB', borderRadius: '8px'}} 
              itemStyle={{color: '#E5E7EB'}}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProfitChart({ spanClass = '' }) {
  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass}`}>
      <div className="bg-[var(--card-bg)]/80 px-4 py-3 border-b border-[var(--border-color)] backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-text-primary">Reselling Profit (USD Thousand)</h3>
      </div>
      <div className="flex-1 p-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataProfit}>
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}} 
              contentStyle={{backgroundColor: '#111827', borderColor: '#374151', color: '#E5E7EB'}} 
            />
            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
            <Bar dataKey="usd" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HourlyWasteChart({ spanClass = '' }) {
  return (
    <div className={`glass-card rounded-xl overflow-hidden flex flex-col ${spanClass}`}>
      <div className="bg-[var(--card-bg)]/80 px-4 py-3 border-b border-[var(--border-color)] backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-text-primary">Waste Secluded by Hour</h3>
      </div>
      <div className="flex-1 p-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWaste}>
            <Tooltip 
              contentStyle={{backgroundColor: '#111827', borderColor: '#374151', color: '#E5E7EB'}} 
            />
            <XAxis dataKey="time" tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
            <Line type="monotone" dataKey="val" stroke="#22C55E" strokeWidth={2} dot={{fill: '#22C55E', r: 3}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
