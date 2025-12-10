import React from 'react';
import { Plane, Map } from 'lucide-react';

interface NoImagePlaceholderProps {
  title: string;
  category?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const NoImagePlaceholder: React.FC<NoImagePlaceholderProps> = ({ 
  title, 
  category,
  size = 'medium',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-24',
    medium: 'h-48',
    large: 'h-96'
  };

  const iconSizes = {
    small: 24,
    medium: 48,
    large: 96
  };

  const textSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-lg'
  };

  // Choose icon based on category
  const Icon = category?.toUpperCase().includes('AVENTURA') || category?.toUpperCase().includes('NATUREZA') 
    ? Map 
    : Plane;

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        w-full 
        bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 
        flex flex-col items-center justify-center 
        relative overflow-hidden
        ${className}
      `}
    >
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-100/40 rounded-full translate-y-12 -translate-x-12"></div>
      
      {/* Icon */}
      <div className="relative z-10 mb-3">
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/50">
          <Icon 
            size={iconSizes[size]} 
            className="text-primary-500/70" 
            strokeWidth={1.5}
          />
        </div>
      </div>
      
      {/* Title */}
      <div className="relative z-10 px-4 text-center max-w-[90%]">
        <h3 className={`
          ${textSizes[size]} 
          font-bold 
          text-gray-700 
          line-clamp-2
          leading-tight
        `}>
          {title}
        </h3>
      </div>
    </div>
  );
};

