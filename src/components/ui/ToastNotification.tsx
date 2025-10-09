import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

interface ToastNotificationProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

const icons = {
  success: <CheckCircle className="w-6 h-6 text-green-600" />,
  error: <XCircle className="w-6 h-6 text-red-600" />,
  info: <Info className="w-6 h-6 text-blue-600" />,
};

const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  visible,
  onClose,
  type = "info",
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg backdrop-blur-md border
            ${
              type === "success"
                ? "bg-green-100/80 border-green-400 text-green-800"
                : type === "error"
                ? "bg-red-100/80 border-red-400 text-red-800"
                : "bg-blue-100/80 border-blue-400 text-blue-800"
            }`}
        >
          {icons[type]}
          <span className="font-medium text-sm md:text-base">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 text-gray-600 hover:text-gray-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToastNotification;
