import React from 'react';
import { LucideProps } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<LucideProps>;
    color: 'green' | 'blue' | 'purple' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const colorClasses = {
        green: 'bg-green-50 text-green-600 border-green-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
    };

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border ${colorClasses[color]} hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon size={20} />
                </div>
                <span className="text-xs font-bold uppercase text-gray-400">{subtitle}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{value}</p>
        </div>
    );
};
