import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { memo, useEffect } from 'react';
import { cn } from '../../utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer = memo<ToastProps>(({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
});

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={18} className="text-green-400" />,
    error: <AlertCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-blue-400" />,
  };

  const bgStyles = {
    success: "bg-green-950/90 border-green-500/30 text-green-100",
    error: "bg-red-950/90 border-red-500/30 text-red-100",
    info: "bg-blue-950/90 border-blue-500/30 text-blue-100",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      className={cn(
        "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg min-w-[300px]",
        bgStyles[toast.type]
      )}
    >
      {icons[toast.type]}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onRemove(toast.id)} className="opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </motion.div>
  );
};