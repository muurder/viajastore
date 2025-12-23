import React from 'react';
import { LucideProps } from 'lucide-react';

interface StatsRibbonCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<LucideProps>;
    iconColor: string;
    trend?: string;
    onClick?: () => void;
}

export const StatsRibbonCard: React.FC<StatsRibbonCardProps> = ({
    title,
    value,
    icon: Icon,
    iconColor,
    trend,
    onClick
}) => {
    return (
        <div
            className={`bg-white rounded-xl p-5 shadow-sm border border-gray-200 transition-all ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary-300 hover:scale-[1.02]' : 'hover:shadow-md'
                }`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
                    <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                    {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
                </div>
                <div className={`p-3 rounded-lg ${iconColor}`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
        </div>
    );
};
