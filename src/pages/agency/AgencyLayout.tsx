import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAgencyData } from '../../hooks/useAgencyData';
import {
    BarChart2, Plane, ListChecks, Bus, Star, User, Palette,
    CreditCard as CreditCardIcon, LogOut, ExternalLink, Binoculars, Menu
} from 'lucide-react';
import { NavButton } from './dashboard/components/DashboardHelpers';
import DashboardMobileTabs from '../../components/mobile/DashboardMobileTabs';
import { Agency } from '../../types';

export const AgencyLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { myBookings, currentAgency } = useAgencyData();
    const location = useLocation();
    const navigate = useNavigate();

    // Derived state
    const isGuide = currentAgency?.isGuide === true || (currentAgency?.role as any) === 'GUIDE';
    const entityName = isGuide ? 'Guia' : 'Agência';

    // Determine active tab based on path or query param
    // If path is /agency/guides, active tab is GUIDES
    // If path is /agency/dashboard, check query param 'tab'
    const getActiveTab = () => {
        if (location.pathname.includes('/agency/guides')) return 'GUIDES';
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('tab') || 'OVERVIEW';
    };

    const activeTab = getActiveTab();

    const handleTabChange = (tab: string) => {
        if (tab === 'GUIDES') {
            navigate('/agency/guides');
        } else {
            navigate(`/agency/dashboard?tab=${tab}`);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Mobile Tabs Configuration
    const tabs = [
        { id: 'OVERVIEW', label: 'Visão Geral', icon: BarChart2 },
        { id: 'TRIPS', label: `${isGuide ? 'Experiências' : 'Pacotes'}`, icon: Plane },
        { id: 'BOOKINGS', label: 'Reservas', icon: ListChecks },
        { id: 'REVIEWS', label: 'Avaliações', icon: Star },
        { id: 'PROFILE', label: 'Perfil', icon: User },
        // Add Guides for Mobile if needed, or keep it as a specific page
    ];

    if (!currentAgency) return null; // Or loader

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full flex-shrink-0 z-20">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {currentAgency.logo ? (
                            <img
                                src={currentAgency.logo}
                                alt={currentAgency.name}
                                className="w-8 h-8 rounded-lg object-cover shadow-sm bg-white"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {currentAgency.name.charAt(0)}
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-gray-900 truncate max-w-[120px]" title={currentAgency.name}>{currentAgency.name}</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{entityName}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
                    <NavButton tabId="TRIPS" label={`Meus ${isGuide ? 'Pacotes' : 'Pacotes'}`} icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
                    <NavButton tabId="BOOKINGS" label="Reservas" icon={ListChecks} activeTab={activeTab} onClick={handleTabChange} hasNotification={myBookings.some(b => b.status === 'PENDING')} />

                    {/* Operations - Check permissions if needed, simplifying for now or passing props? 
                        Ideally usePlanPermissions hook here too or just show it 
                    */}
                    <NavButton tabId="OPERATIONS" label="Operacional" icon={Bus} activeTab={activeTab} onClick={handleTabChange} />

                    <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />

                    {/* Hire Guides Link (Agency Only) */}
                    {!isGuide && (
                        <button
                            onClick={() => handleTabChange('GUIDES')}
                            className={`w-full flex items-center gap-3 py-3 px-4 font-bold text-sm border-l-4 transition-all relative rounded-r-lg group mb-1 ${activeTab === 'GUIDES'
                                ? 'border-primary-500 text-primary-600 bg-primary-50'
                                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Binoculars size={20} className={activeTab === 'GUIDES' ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'} />
                            <span className="truncate">Contratar Guias</span>
                        </button>
                    )}
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Configurações</p>
                        <NavButton tabId="PROFILE" label="Meu Perfil" icon={User} activeTab={activeTab} onClick={handleTabChange} />
                        <NavButton tabId="THEME" label="Aparência" icon={Palette} activeTab={activeTab} onClick={handleTabChange} />
                        <NavButton tabId="PLAN" label="Assinatura" icon={CreditCardIcon} activeTab={activeTab} onClick={handleTabChange} />
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut size={16} /> Sair do Sistema
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                {/* Mobile Header (Only visible on mobile) */}
                <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between flex-shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        {currentAgency.logo ? (
                            <img
                                src={currentAgency.logo}
                                alt={currentAgency.name}
                                className="w-8 h-8 rounded-lg object-cover shadow-sm bg-white"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                                {currentAgency.name.charAt(0)}
                            </div>
                        )}
                        <h1 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{currentAgency.name}</h1>
                    </div>
                    <button onClick={() => window.open(`/#/${currentAgency.slug}`, '_blank')} className="text-primary-600 p-2"><ExternalLink size={20} /></button>
                </div>

                {/* Dashboard Tabs for Mobile */}
                <div className="md:hidden">
                    {/* Can render mobile tabs here if we want them to persist across child routes, 
                         or let pages handle them. AgencyDashboard has them. 
                         For now, leaving simpler. 
                     */}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto w-full overflow-x-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
