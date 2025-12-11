import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * P1: MOBILE - Responsive table wrapper with scroll indicators
 * Improves mobile UX by showing visual indicators when table can be scrolled
 */
export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Scroll indicator for mobile - shows when content overflows */}
        <div className="md:hidden absolute top-0 right-0 bg-gradient-to-l from-white via-white/80 to-transparent w-12 h-full pointer-events-none z-10 flex items-center justify-end pr-3">
          <ChevronRight className="text-gray-400 animate-pulse" size={18} />
        </div>
        {/* Hint text for mobile */}
        <div className="md:hidden sticky left-0 top-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 font-medium z-20">
          ← Deslize para ver mais colunas →
        </div>
        {children}
      </div>
    </div>
  );
};

