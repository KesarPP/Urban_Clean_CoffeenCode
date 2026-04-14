import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WhatsAppFloatingButton Component
 * A floating WhatsApp button that appears in the bottom-right corner
 * Click to show popup with WhatsApp number and features
 */
export default function WhatsAppFloatingButton() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all flex items-center justify-center group"
        title="WhatsApp Support"
      >
        <MessageCircle className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
      </button>

      {/* WhatsApp Info Popup */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-32 right-8 z-40 w-80 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <span className="font-bold">Urban Clean Support</span>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-text-secondary mb-2">📱 WhatsApp Bot Features:</p>
                <ul className="text-xs text-text-secondary space-y-1 ml-2">
                  <li>✅ Report issues instantly</li>
                  <li>✅ Track complaint status</li>
                  <li>✅ Find nearby problems</li>
                  <li>✅ Get real-time updates</li>
                </ul>
              </div>

              <div className="bg-[var(--input-bg)] p-3 rounded-lg border border-[var(--border-color)]">
                <p className="text-xs text-text-secondary mb-2 font-medium">WhatsApp Number:</p>
                <p className="font-mono font-bold text-green-600">+1 (415) 523-8886</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <a
                  href="https://wa.me/14155238886?text=Hello%20Urban%20Clean%20Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white text-sm font-semibold rounded-lg hover:shadow-lg transition text-center"
                >
                  Open WhatsApp
                </a>
                <button
                  onClick={() => setShowInfo(false)}
                  className="flex-1 px-3 py-2 bg-[var(--input-bg)] text-text-secondary text-sm font-semibold rounded-lg border border-[var(--border-color)] hover:bg-[var(--border-color)] transition"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-text-secondary opacity-75 text-center">
                💬 Chat available 24/7
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
