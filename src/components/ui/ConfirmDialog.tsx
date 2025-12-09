import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) => {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconConfig = {
    danger: { 
      icon: AlertTriangle, 
      bg: 'bg-red-50', 
      iconColor: 'text-red-600', 
      border: 'border-red-200',
      iconBg: 'bg-red-100'
    },
    warning: { 
      icon: AlertTriangle, 
      bg: 'bg-amber-50', 
      iconColor: 'text-amber-600', 
      border: 'border-amber-200',
      iconBg: 'bg-amber-100'
    },
    info: { 
      icon: Info, 
      bg: 'bg-blue-50', 
      iconColor: 'text-blue-600', 
      border: 'border-blue-200',
      iconBg: 'bg-blue-100'
    }
  };

  const buttonConfig = {
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
    warning: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500'
  };

  const config = iconConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-[scaleIn_0.2s_ease-out] transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Header with gradient */}
        <div className={`${config.bg} ${config.border} border-b p-6 relative overflow-hidden`}>
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* Icon */}
          <div className={`relative w-16 h-16 ${config.iconBg} rounded-full flex items-center justify-center mx-auto border-2 ${config.border} shadow-lg`}>
            <Icon size={28} className={config.iconColor} strokeWidth={2.5} />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 
              id="dialog-title"
              className="text-xl font-bold text-gray-900 mb-3"
            >
              {title}
            </h3>
            <p 
              id="dialog-description"
              className="text-sm text-gray-600 leading-relaxed"
            >
              {message}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {cancelText}
            </button>
            <button 
              onClick={handleConfirm}
              className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-all duration-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonConfig[variant]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      {/* Add custom animations to global styles if not already present */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;

