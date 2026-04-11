import { motion } from 'framer-motion';
import { Leaf, Trash2, Recycle, MapPin, CheckCircle2, AlertCircle, Info, ArrowRight, Droplets, Wind, Sun, Box } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SegregationCard = ({ title, items, color, icon: Icon, description }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`p-6 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-soft hover:border-${color}-500/50 transition-all`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-${color}-500/10 border border-${color}-500/20`}>
      <Icon className={`w-6 h-6 text-${color}-500`} />
    </div>
    <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
    <p className="text-sm text-text-secondary mb-4 italic">{description}</p>
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
          <CheckCircle2 className={`w-4 h-4 text-${color}-500 flex-shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

const CompostingStep = ({ step, title, description, icon: Icon }) => (
  <div className="flex gap-4 items-start p-4 rounded-2xl hover:bg-[var(--input-bg)] transition-colors">
    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold">
      {step}
    </div>
    <div>
      <h4 className="font-bold text-text-primary flex items-center gap-2 mb-1">
        <Icon size={16} className="text-emerald-500" />
        {title}
      </h4>
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </div>
  </div>
);

export default function EducationHub() {
  const [activeTab, setActiveTab] = useState('segregation');

  const segregationData = [
    {
      title: "Wet Waste (Biodegradable)",
      color: "emerald",
      icon: Droplets,
      description: "Organic waste that can be composted.",
      items: ["Vegetable & Fruit Peels", "Leftover Food", "Tea Leaves & Coffee Grounds", "Eggshells", "Flowers & Garden Waste"]
    },
    {
      title: "Dry Waste (Recyclable)",
      color: "blue",
      icon: Box,
      description: "Non-biodegradable but recyclable materials.",
      items: ["Plastic Bottles & Containers", "Paper, Cardboard & Newspaper", "Glass Jars & Bottles", "Metal Cans & Foil", "Dry Wood Items"]
    },
    {
      title: "Domestic Hazardous Waste",
      color: "red",
      icon: AlertCircle,
      description: "Requires special handling and disposal.",
      items: ["Used Batteries", "Paint Cans", "Expired Medicines", "Cleaning Chemicals", "Pesticides & Aerosols"]
    }
  ];

  const compostingTips = [
    { step: 1, title: "Choose a Container", icon: Box, description: "Use a bin with small aeration holes or a specialized composting pot." },
    { step: 2, title: "The Perfect Mix", icon: Leaf, description: "Layer 'Greens' (wet peels, food) with 'Browns' (dry leaves, shredded paper) for nitrogen/carbon balance." },
    { step: 3, title: "Add Moisture", icon: Droplets, description: "Keep the pile damp like a wrung-out sponge. Avoid making it too soggy." },
    { step: 4, title: "Aerate & Turn", icon: Wind, description: "Turn the pile every 1-2 weeks to provide oxygen to the bacteria." },
    { step: 5, title: "Harvest Black Gold", icon: Sun, description: "In 2-3 months, your waste becomes rich, dark compost for your garden." }
  ];

  const recyclingCenters = [
    { name: "Green Earth Recycling", address: "Plot 42, Industrial Area, Sector 5", contact: "+91 98765 43210", types: ["Plastic", "Paper", "E-waste"] },
    { name: "Urban Eco-Tech Hub", address: "Main Road, Near Metro Station", contact: "+91 87654 32109", types: ["Glass", "Metal", "Battery"] },
    { name: "Modern Scrap Solutions", address: "Old City Bypass, Ward 12", contact: "+91 76543 21098", types: ["All Recyclables"] }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest border border-emerald-500/20 mb-4 inline-block">
          Learning Portal
        </span>
        <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 tracking-tight">
          Active <span className="gradient-text">Prevention</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Waste management starts at home. Master the art of segregation and help us build a circular economy.
        </p>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex justify-center gap-2 mb-12 p-1 bg-[var(--input-bg)] w-max mx-auto rounded-2xl border border-[var(--border-color)]">
        {['segregation', 'composting', 'recycling'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-[var(--card-bg)] text-primary shadow-soft border border-[var(--border-color)] scale-[1.02]' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      <div className="min-h-[500px]">
        {activeTab === 'segregation' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {segregationData.map((data, idx) => (
              <SegregationCard key={idx} {...data} />
            ))}
          </motion.div>
        )}

        {activeTab === 'composting' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col md:flex-row gap-12 items-center"
          >
            <div className="flex-1 space-y-2">
              <h2 className="text-3xl font-black text-text-primary mb-6">Composting: Black Gold</h2>
              <div className="space-y-4">
                {compostingTips.map((tip) => (
                  <CompostingStep key={tip.step} {...tip} />
                ))}
              </div>
            </div>
            <div className="flex-1 w-full relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-[var(--border-color)] flex items-center justify-center p-8 overflow-hidden group">
                 <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <motion.div
                   animate={{ 
                     rotate: [0, 5, -5, 0],
                     scale: [1, 1.05, 1] 
                   }}
                   transition={{ duration: 10, repeat: Infinity }}
                   className="text-emerald-500 opacity-80"
                 >
                   <Leaf size={200} strokeWidth={1} />
                 </motion.div>
                 <div className="absolute inset-x-8 bottom-8 p-6 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-xl">
                    <p className="text-emerald-500 font-black text-xs uppercase mb-1">Impact Fact</p>
                    <p className="text-text-primary text-sm font-medium">Over 50% of household waste can be composted, reducing landfill pressure by half.</p>
                 </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'recycling' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-text-primary mb-8 px-2">Recycling Partners</h2>
              <div className="space-y-4">
                {recyclingCenters.map((center, idx) => (
                  <div key={idx} className="p-6 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-blue-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">{center.name}</h4>
                        <p className="text-sm text-text-secondary flex items-center gap-2 mt-2">
                          <MapPin size={14} className="text-amber-500" /> {center.address}
                        </p>
                      </div>
                      <a href={`tel:${center.contact}`} className="p-3 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 transition-all hover:text-white">
                        <ArrowRight size={20} />
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border-color)]">
                      {center.types.map(type => (
                        <span key={type} className="px-3 py-1 rounded-full bg-[var(--input-bg)] text-[10px] font-black uppercase tracking-widest text-text-secondary border border-[var(--border-color)]">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border-color)] p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <Recycle size={32} className="text-blue-500 opacity-20" />
               </div>
               <div className="p-6 bg-blue-500/10 rounded-full mb-6">
                  <Info size={48} className="text-blue-500" />
               </div>
               <h3 className="text-2xl font-black text-text-primary mb-4 uppercase tracking-tight">Need a Pickup?</h3>
               <p className="text-text-secondary mb-8 max-w-sm">
                 If you have large amounts of dry waste (old furniture, computers, scrap), you can request a dedicated collection drive.
               </p>
               <button className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-glow-primary hover:scale-[1.05] transition-all">
                 Request Bulk Pickup
               </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Call to Action */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-24 p-8 rounded-[40px] bg-gradient-to-r from-emerald-600/20 via-blue-600/20 to-emerald-600/20 border border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left"
      >
        <div>
          <h2 className="text-3xl font-black text-text-primary mb-2">Ready to contribute?</h2>
          <p className="text-text-secondary font-medium">Report an issue or join a local cleanup drive today.</p>
        </div>
        <div className="flex gap-4">
           <Link to="/citizen/report" className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all">
             Report Waste
           </Link>
        </div>
      </motion.div>
    </div>
  );
}
