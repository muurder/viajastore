import React from 'react';
import { Briefcase, Search, Building2, Trash2, RefreshCw, Crown } from 'lucide-react';
import { Agency } from '../../../../types';
import { StatsRibbonCard } from '../shared';
import { AgenciesFilterModal } from '../modals';

interface AgenciesTabProps {
    // Data
    agencies: Agency[];
    stats: {
        totalAgencies: number;
        activeAgencies: number;
        premiumAgencies: number;
    };

    // Filter state
    agencySearch: string;
    agencyStatusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE';
    agencyPlanFilter: 'ALL' | 'FREE' | 'BASIC' | 'PREMIUM';
    showAgencyTrash: boolean;

    // Filter handlers
    onSearchChange: (search: string) => void;
    onStatusFilterChange: (filter: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
    onPlanFilterChange: (filter: 'ALL' | 'FREE' | 'BASIC' | 'PREMIUM') => void;
    onToggleTrash: () => void;
    onResetFilters: () => void;

    // Agency action handlers
    onAgencyClick: (agency: Agency) => void;
    onAgencyAction: (agency: Agency, action: string) => void;
    onCreateAgency: () => void;

    // Modal state
    filterModalOpen: boolean;
    filterModalTitle: string;
    filterModalAgencies: Agency[];
    onCloseFilterModal: () => void;
}

export const AgenciesTab: React.FC<AgenciesTabProps> = ({
    agencies,
    stats,
    agencySearch,
    agencyStatusFilter,
    agencyPlanFilter,
    showAgencyTrash,
    onSearchChange,
    onStatusFilterChange,
    onPlanFilterChange,
    onToggleTrash,
    onResetFilters,
    onAgencyClick,
    onAgencyAction,
    onCreateAgency,
    filterModalOpen,
    filterModalTitle,
    filterModalAgencies,
    onCloseFilterModal
}) => {
    return (
        <div className="space-y-6">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsRibbonCard
                    title="Total de Agências"
                    value={stats.totalAgencies}
                    icon={Briefcase}
                    iconColor="bg-blue-500"
                    onClick={() => {
                        onStatusFilterChange('ALL');
                        onPlanFilterChange('ALL');
                    }}
                />
                <StatsRibbonCard
                    title="Agências Ativas"
                    value={stats.activeAgencies}
                    icon={Briefcase}
                    iconColor="bg-green-500"
                    onClick={() => onStatusFilterChange('ACTIVE')}
                />
                <StatsRibbonCard
                    title="Agências Premium"
                    value={stats.premiumAgencies}
                    icon={Crown}
                    iconColor="bg-purple-500"
                    onClick={() => onPlanFilterChange('PREMIUM')}
                />
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col gap-4">
                    {/* Search and Main Actions */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        {/* Search */}
                        <div className="flex-1 w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar agências por nome ou email..."
                                    value={agencySearch}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={onToggleTrash}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${showAgencyTrash
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Trash2 size={18} className="inline mr-2" />
                                {showAgencyTrash ? 'Ver Ativas' : 'Ver Lixeira'}
                            </button>

                            <button
                                onClick={onResetFilters}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                                <RefreshCw size={18} className="inline mr-2" />
                                Resetar
                            </button>

                            <button
                                onClick={onCreateAgency}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                            >
                                <Building2 size={18} className="inline mr-2" />
                                Nova Agência
                            </button>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={agencyStatusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value as any)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="ACTIVE">Ativos</option>
                            <option value="INACTIVE">Inativos</option>
                        </select>

                        <select
                            value={agencyPlanFilter}
                            onChange={(e) => onPlanFilterChange(e.target.value as any)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="ALL">Todos os Planos</option>
                            <option value="FREE">Free</option>
                            <option value="BASIC">Basic</option>
                            <option value="PREMIUM">Premium</option>
                        </select>
                    </div>

                    {/* Active Filters Display */}
                    {(agencyStatusFilter !== 'ALL' || agencyPlanFilter !== 'ALL' || showAgencyTrash) && (
                        <div className="flex flex-wrap gap-2">
                            {agencyStatusFilter !== 'ALL' && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                    Status: {agencyStatusFilter}
                                </span>
                            )}
                            {agencyPlanFilter !== 'ALL' && (
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    Plano: {agencyPlanFilter}
                                </span>
                            )}
                            {showAgencyTrash && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                    Mostrando Lixeira
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Agencies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agencies.length > 0 ? (
                    agencies.map((agency) => (
                        <div
                            key={agency.id}
                            onClick={() => onAgencyClick(agency)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <img
                                    src={agency.logo_url || `https://ui-avatars.com/api/?name=${agency.name}`}
                                    alt=""
                                    className="w-16 h-16 rounded-full ring-2 ring-gray-200 group-hover:ring-primary-300 transition-all"
                                />
                                <div className="flex flex-col gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${agency.subscriptionStatus === 'ACTIVE'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                    </span>
                                    {agency.subscriptionPlan === 'PREMIUM' && (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                            PREMIUM
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-primary-600 transition-colors truncate">
                                {agency.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 truncate">{agency.email || 'Sem email'}</p>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500">Plano</p>
                                    <p className="font-semibold text-gray-900 text-sm">{agency.subscriptionPlan}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2">
                                    <p className="text-xs text-gray-500">ID</p>
                                    <p className="font-semibold text-gray-900 text-sm">{agency.agencyId.slice(0, 8)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAgencyAction(agency, 'view');
                                    }}
                                    className="w-full text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
                                >
                                    Ver Detalhes →
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 font-semibold">
                            {showAgencyTrash ? 'Nenhuma agência na lixeira' : 'Nenhuma agência encontrada'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                            {agencySearch && 'Tente ajustar sua busca ou filtros'}
                        </p>
                    </div>
                )}
            </div>

            {/* Results Count */}
            {agencies.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-4">
                    <p className="text-sm text-gray-600">
                        Mostrando {agencies.length} agência(s)
                    </p>
                </div>
            )}

            {/* Filter Modal */}
            <AgenciesFilterModal
                isOpen={filterModalOpen}
                onClose={onCloseFilterModal}
                title={filterModalTitle}
                agencies={filterModalAgencies}
                onAgencyClick={onAgencyClick}
                onAgencyAction={onAgencyAction}
                showAgencyTrash={showAgencyTrash}
            />
        </div>
    );
};
