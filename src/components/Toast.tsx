import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ToastData } from '@/types';

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />,
};

const borders = {
  success: 'border-green-500',
  error: 'border-red-500',
  info: 'border-cyan-500',
};

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-slate-800 border ${borders[toast.type]} rounded-lg shadow-lg shadow-black/30 max-w-sm`}
        >
          {icons[toast.type]}
          <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
