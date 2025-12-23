import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber';
}

export const Badge: React.FC<BadgeProps> = ({ children, color }) => {
    const colors = {
        green: 'bg-green-100 text-green-700',
        red: 'bg-amber-100 text-amber-700',
        blue: 'bg-slate-100 text-slate-700',
        purple: 'bg-violet-100 text-violet-700',
        gray: 'bg-gray-100 text-gray-600',
        amber: 'bg-amber-100 text-amber-700',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
            {children}
        </span>
    );
};
