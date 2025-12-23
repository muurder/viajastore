import React from 'react';
import { Users, Search, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { Client } from '../../../../types';
import { StatsRibbonCard } from '../shared';
import { UsersFilterModal } from '../modals';

interface UsersTabProps {
    // Data
    users: Client[];
    stats: {
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
    };

    // Filter state
    userSearch: string;
    userStatusFilter: 'ALL' | 'ACTIVE' | 'SUSPENDED';
    showUserTrash: boolean;

    // Filter handlers
    onSearchChange: (search: string) => void;
    onStatusFilterChange: (filter: 'ALL' | 'ACTIVE' | 'SUSPENDED') => void;
    onToggleTrash: () => void;
    onResetFilters: () => void;

    // User action handlers
    onUserClick: (user: Client) => void;
    onUserAction: (user: Client, action: string) => void;
    onCreateUser: () => void;

    // Modal state
    filterModalOpen: boolean;
    filterModalTitle: string;
    filterModalUsers: Client[];
    onCloseFilterModal: () => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
    users,
    stats,
    userSearch,
    userStatusFilter,
    showUserTrash,
    onSearchChange,
    onStatusFilterChange,
    onToggleTrash,
    onResetFilters,
    onUserClick,
    onUserAction,
    onCreateUser,
    filterModalOpen,
    filterModalTitle,
    filterModalUsers,
    onCloseFilterModal
}) => {
    return (
        <div className="space-y-6">
            {/* Stats Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsRibbonCard
                    title="Total de Usuários"
                    value={stats.totalUsers}
                    icon={Users}
                    iconColor="bg-blue-500"
                    onClick={() => onStatusFilterChange('ALL')}
                />
                <StatsRibbonCard
                    title="Usuários Ativos"
                    value={stats.activeUsers}
                    icon={Users}
                    iconColor="bg-green-500"
                    onClick={() => onStatusFilterChange('ACTIVE')}
                />
                <StatsRibbonCard
                    title="Usuários Suspensos"
                    value={stats.suspendedUsers}
                    icon={Users}
                    iconColor="bg-amber-500"
                    onClick={() => onStatusFilterChange('SUSPENDED')}
                />
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    {/* Search */}
                    <div className="flex-1 w-full md:w-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar usuários por nome ou email..."
                                value={userSearch}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={onToggleTrash}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${showUserTrash
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <Trash2 size={18} className="inline mr-2" />
                            {showUserTrash ? 'Ver Ativos' : 'Ver Lixeira'}
                        </button>

                        <button
                            onClick={onResetFilters}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw size={18} className="inline mr-2" />
                            Resetar
                        </button>

                        <button
                            onClick={onCreateUser}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                        >
                            <UserPlus size={18} className="inline mr-2" />
                            Novo Usuário
                        </button>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(userStatusFilter !== 'ALL' || showUserTrash) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {userStatusFilter !== 'ALL' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                Status: {userStatusFilter}
                            </span>
                        )}
                        {showUserTrash && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                Mostrando Lixeira
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Usuário
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.length > 0 ? (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => onUserClick(user)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`}
                                                    alt=""
                                                    className="w-10 h-10 rounded-full ring-2 ring-gray-200"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-900">{user.name}</p>
                                                    <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-900">{user.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {user.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUserAction(user, 'view');
                                                }}
                                                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                                            >
                                                Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Users size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-500 font-semibold">
                                            {showUserTrash ? 'Nenhum usuário na lixeira' : 'Nenhum usuário encontrado'}
                                        </p>
                                        <p className="text-gray-400 text-sm mt-1">
                                            {userSearch && 'Tente ajustar sua busca'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination placeholder */}
                {users.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            Mostrando {users.length} usuário(s)
                        </p>
                    </div>
                )}
            </div>

            {/* Filter Modal */}
            <UsersFilterModal
                isOpen={filterModalOpen}
                onClose={onCloseFilterModal}
                title={filterModalTitle}
                users={filterModalUsers}
                onUserClick={onUserClick}
                onUserAction={onUserAction}
                showUserTrash={showUserTrash}
            />
        </div>
    );
};
