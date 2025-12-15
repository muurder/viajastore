import React from 'react';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component that ensures tables are scrollable on mobile devices.
 * It applies 'overflow-x-auto' and custom scrollbar styling.
 */
const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveTable;
