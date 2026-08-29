import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all transform animate-bounce-short ${
        type === 'success'
          ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
          : 'bg-red-900 text-red-100 border-red-700'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400" />
      )}
      <span>{message}</span>
      <button onClick={onClose} className="p-0.5 hover:opacity-80 rounded-full">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
