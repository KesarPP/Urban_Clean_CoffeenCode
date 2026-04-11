import { motion } from 'framer-motion';

export default function StatCard({ title, value, subValue, label, spanClass = '' }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`glass-card p-5 rounded-xl flex flex-col justify-between ${spanClass}`}
    >
      <div>
        <h3 className="text-sm font-semibold text-textSecondary mb-2">{title}</h3>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold gradient-text">{value}</p>
          {subValue && <span className="text-xs text-textSecondary mb-1.5">{subValue}</span>}
        </div>
      </div>
      {label && <p className="text-xs font-medium text-text-secondary mt-3">{label}</p>}
    </motion.div>
  );
}
