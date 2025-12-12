import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber';
}

export const Badge: React.FC<BadgeProps> = ({ children, color }) => {
  const colors = {
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
      {children}
    </span>
  );
};
