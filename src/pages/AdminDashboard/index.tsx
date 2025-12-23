import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Custom Hooks
import {
    useAdminDashboardData,
    useAdminModals,
    useUserManagement,
    useAgencyManagement,
    useAdminFilters
} from './hooks';

// Components
import { UsersTab, AgenciesTab } from './components/tabs';
import {
    DashboardViewer,
    AgenciesFilterModal,
    UsersFilterModal,
    AgencyDetailModal
} from './components/modals';

// Icons
import {
    Users,
    Briefcase,
    MapPin,
    Package,
    Megaphone,
    Settings as SettingsIcon
} from 'lucide-react';

type AdminTab = 'USERS' | 'AGENCIES' | 'TRIPS' | 'PACKAGES' | 'BROADCASTS' | 'SETTINGS';

const AdminDashboard: React.FC = () => {
    // Tab state
    const [activeTab, setActiveTab] = useState<AdminTab>('USERS');

    // Custom hooks
    const { clients, agencies, trips, bookings, agencyReviews, stats } = useAdminDashboardData();
    const modals = useAdminModals();
    const userManagement = useUserManagement();
    const agencyManagement = useAgencyManagement();
    const filters = useAdminFilters();

    // Toast for feedback
    const { showToast } = useToast();

    // Filter data using the filter hook
    const filteredUsers = filters.filterUsers(clients);
    const filteredAgencies = filters.filterAgencies(agencies);

    // Tab configuration
    const tabs = [
        { id: 'USERS' as AdminTab, label: 'Usuários', icon: Users, count: stats.totalUsers },
        { id: 'AGENCIES' as AdminTab, label: 'Agências', icon: Briefcase, count: stats.totalAgencies },
        { id: 'TRIPS' as AdminTab, label: 'Viagens', icon: MapPin, count: stats.totalTrips },
        { id: 'PACKAGES' as AdminTab, label: 'Pacotes', icon: Package, count: stats.totalTrips },
        { id: 'BROADCASTS' as AdminTab, label: 'Broadcasts', icon: Megaphone, count: stats.totalBroadcasts },
        { id: 'SETTINGS' as AdminTab, label: 'Configurações', icon: SettingsIcon, count: 0 }
    ];

    // User action handlers
    const handleUserClick = (user: any) => {
        modals.openClientDetail(user);
    };

    const handleUserAction = async (user: any, action: string) => {
        switch (action) {
            case 'edit':
                // Open edit modal (to be implemented)
                showToast('Função de edição em desenvolvimento', 'info');
                break;
            case 'toggle':
                await userManagement.handleToggleUserStatus(user);
                break;
            case 'delete':
                await userManagement.handleDeleteUser(user.id);
                break;
            case 'restore':
                await userManagement.handleRestoreUser(user.id);
                break;
            case 'view':
                handleUserClick(user);
                break;
            default:
                break;
        }
    };

    const handleCreateUser = () => {
        showToast('Função de criar usuário em desenvolvimento', 'info');
    };

    // Agency action handlers
    const handleAgencyClick = (agency: any) => {
        modals.openAgencyDetail(agency);
    };

    const handleAgencyAction = async (agency: any, action: string) => {
        switch (action) {
            case 'edit':
                showToast('Função de edição em desenvolvimento', 'info');
                break;
            case 'plan':
                showToast('Função de mudança de plano em desenvolvimento', 'info');
                break;
            case 'delete':
                await agencyManagement.handleDeleteAgency(agency.agencyId);
                break;
            case 'restore':
                await agencyManagement.handleRestoreAgency(agency.agencyId);
                break;
            case 'view':
                handleAgencyClick(agency);
                break;
            default:
                break;
        }
    };

    const handleCreateAgency = () => {
        showToast('Função de criar agência em desenvolvimento', 'info');
    };

    // Render active tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'USERS':
                return (
                    <UsersTab
                        users={filteredUsers}
                        stats={{
                            totalUsers: stats.totalUsers,
                            activeUsers: stats.activeUsers,
                            suspendedUsers: stats.suspendedUsers
                        }}
                        userSearch={filters.userSearch}
                        userStatusFilter={filters.userStatusFilter}
                        showUserTrash={filters.showUserTrash}
                        onSearchChange={filters.setUserSearch}
                        onStatusFilterChange={filters.setUserStatusFilter}
                        onToggleTrash={() => filters.setShowUserTrash(!filters.showUserTrash)}
                        onResetFilters={filters.resetUserFilters}
                        onUserClick={handleUserClick}
                        onUserAction={handleUserAction}
                        onCreateUser={handleCreateUser}
                        filterModalOpen={modals.usersFilterModal.isOpen}
                        filterModalTitle={modals.usersFilterModal.title}
                        filterModalUsers={modals.usersFilterModal.users}
                        onCloseFilterModal={modals.closeUsersFilter}
                    />
                );

            case 'AGENCIES':
                return (
                    <AgenciesTab
                        agencies={filteredAgencies}
                        stats={{
                            totalAgencies: stats.totalAgencies,
                            activeAgencies: stats.activeAgencies,
                            premiumAgencies: stats.premiumAgencies
                        }}
                        agencySearch={filters.agencySearch}
                        agencyStatusFilter={filters.agencyStatusFilter}
                        agencyPlanFilter={filters.agencyPlanFilter}
                        showAgencyTrash={filters.showAgencyTrash}
                        onSearchChange={filters.setAgencySearch}
                        onStatusFilterChange={filters.setAgencyStatusFilter}
                        onPlanFilterChange={filters.setAgencyPlanFilter}
                        onToggleTrash={() => filters.setShowAgencyTrash(!filters.showAgencyTrash)}
                        onResetFilters={filters.resetAgencyFilters}
                        onAgencyClick={handleAgencyClick}
                        onAgencyAction={handleAgencyAction}
                        onCreateAgency={handleCreateAgency}
                        filterModalOpen={modals.agenciesFilterModal.isOpen}
                        filterModalTitle={modals.agenciesFilterModal.title}
                        filterModalAgencies={modals.agenciesFilterModal.agencies}
                        onCloseFilterModal={modals.closeAgenciesFilter}
                    />
                );

            case 'TRIPS':
            case 'PACKAGES':
            case 'BROADCASTS':
            case 'SETTINGS':
                return (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <Package className="mx-auto text-gray-300 mb-4" size={64} />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h3>
                            <p className="text-gray-500">
                                Esta seção está em desenvolvimento
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Os componentes para esta tab serão criados em breve
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p className="text-gray-600 mt-1">Gerencie usuários, agências e conteúdo da plataforma</p>
                        </div>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="bg-white border-b border-gray-200 px-8">
                    <nav className="flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors
                    ${isActive
                                            ? 'border-primary-600 text-primary-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }
                  `}
                                >
                                    <Icon size={18} />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={`
                      px-2 py-0.5 rounded-full text-xs font-semibold
                      ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}
                    `}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {renderTabContent()}
                </main>
            </div>

            {/* Global Modals */}
            <DashboardViewer
                isOpen={modals.dashboardViewer.isOpen}
                type={modals.dashboardViewer.type}
                entityId={modals.dashboardViewer.entityId}
                entityName={modals.dashboardViewer.entityName}
                onClose={modals.closeDashboardViewer}
                agencies={agencies}
            />

            <AgencyDetailModal
                isOpen={modals.agencyDetailModal.isOpen}
                agency={modals.agencyDetailModal.data}
                onClose={modals.closeAgencyDetail}
                onEdit={() => {
                    modals.closeAgencyDetail();
                    showToast('Função de edição em desenvolvimento', 'info');
                }}
                bookings={bookings}
                reviews={agencyReviews}
                trips={trips}
            />

            {/* UsersFilterModal and ClientDetailModal would be added here when needed */}
        </div>
    );
};

export default AdminDashboard;
