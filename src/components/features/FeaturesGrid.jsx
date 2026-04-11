import { motion } from 'framer-motion';
import { MapPin, Truck, AlertOctagon, Trash2 } from 'lucide-react';

const features = [
  { icon: Trash2, title: 'Smart Bin Locator', desc: 'Identify full capacities and dispatch routes.', color: 'text-accentGreen', bg: 'bg-green-500/10' },
  { icon: MapPin, title: 'Geo-Tagged Reports', desc: 'Drop exact coordinates for any urban issue.', color: 'text-primary', bg: 'bg-blue-500/10' },
  { icon: Truck, title: 'Vehicle Support', desc: 'Monitor dispatch teams in real-time.', color: 'text-accentYellow', bg: 'bg-yellow-500/10' },
  { icon: AlertOctagon, title: 'Pothole Logging', desc: 'Log infrastructure gaps with image proof.', color: 'text-accentRed', bg: 'bg-red-500/10' },
];

export default function FeaturesGrid() {
  return (
    <div className="py-24 bg-cards/50 border-y border-gray-800 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Core Capabilities</h2>
          <p className="text-textSecondary max-w-2xl mx-auto">Everything you need to sustain a modern, scalable city monitoring infrastructure.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-2xl flex flex-col items-start transition-all duration-300"
            >
              <div className={`p-4 rounded-xl ${f.bg} mb-6`}>
                <f.icon className={`h-8 w-8 ${f.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-textSecondary text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
