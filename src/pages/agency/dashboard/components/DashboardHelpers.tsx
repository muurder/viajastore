import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Loader, LucideProps } from 'lucide-react';

export const Badge: React.FC<{ children: React.ReactNode; color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber' }> = ({ children, color }) => {
    const colors = {
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        gray: 'bg-gray-50 text-gray-600 border-gray-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
            {children}
        </span>
    );
};

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ComponentType<LucideProps>;
    color: 'green' | 'blue' | 'purple' | 'amber';
    onClick?: () => void;
}
export const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color, onClick }) => {
    const bgColors = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group 
                ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary-100 hover:scale-[1.02] transition-all' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24} /></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

interface ActionMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default'; isLoading?: boolean }[] }
export const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors group"
            >
                <MoreHorizontal size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right ring-2 ring-primary-100">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-3 text-white">
                            <p className="text-xs font-bold uppercase tracking-wide">Ações do Pacote</p>
                        </div>
                        <div className="py-2">
                            {actions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        action.onClick();
                                        setIsOpen(false);
                                    }}
                                    disabled={action.isLoading}
                                    className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${action.variant === 'danger'
                                        ? 'text-red-600 hover:bg-red-50 border-l-4 border-red-500'
                                        : 'text-gray-700 hover:bg-primary-50 border-l-4 border-transparent hover:border-primary-500'
                                        }`}
                                >
                                    {action.isLoading ? (
                                        <Loader size={18} className="animate-spin text-gray-400" />
                                    ) : (
                                        <action.icon size={18} className={action.variant === 'danger' ? 'text-red-500' : 'text-primary-600'} />
                                    )}
                                    <span>{action.isLoading ? 'Processando...' : action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export const NavButton: React.FC<{ tabId: string; label: string; icon: React.ComponentType<LucideProps>; activeTab: string; onClick: (tabId: string) => void; hasNotification?: boolean; }> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
    <button
        onClick={() => onClick(tabId)}
        className={`w-full flex items-center gap-3 py-3 px-4 font-bold text-sm border-l-4 transition-all relative rounded-r-lg group mb-1
        ${activeTab === tabId
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
    >
        <Icon size={20} className={`transition-colors ${activeTab === tabId ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
        <span className="truncate">{label}</span>
        {hasNotification && (<span className="absolute top-3 right-3 flex h-2.5 w-2.5"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> </span>)}
    </button>
);
