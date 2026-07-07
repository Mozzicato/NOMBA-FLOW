import { AnimatePresence, motion } from 'framer-motion';
import { useFlowStore } from '../store';

export default function Toast() {
  const toast = useFlowStore((s) => s.toast);
  const dismiss = useFlowStore((s) => s.dismissToast);

  return (
    <div className="toast-region">
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={dismiss}
            role="status"
          >
            <span className="toast-bar" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
