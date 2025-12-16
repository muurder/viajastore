import React from 'react';
import { User, ShoppingBag, Heart, LogOut, Menu, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardMobileTabs from '../../components/mobile/DashboardMobileTabs';

interface ClientLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children, activeTab, onTabChange }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const menuItems = [
        { id: 'BOOKINGS', label: 'Minhas Viagens', icon: ShoppingBag },
        { id: 'FAVORITES', label: 'Favoritos', icon: Heart },
        { id: 'PROFILE', label: 'Meu Perfil', icon: User },
    ];

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] bg-gray-50 overflow-hidden font-sans">
            {/* Mobile Tabs */}
            <DashboardMobileTabs
                tabs={menuItems}
                activeTab={activeTab}
                onTabChange={onTabChange}
                className="md:hidden"
            />

            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full flex-shrink-0 z-20">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    {user?.avatar ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
                            {user?.name?.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-gray-900 truncate" title={user?.name}>{user?.name}</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Viajante</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center gap-3 py-3 px-4 font-bold text-sm border-l-4 transition-all relative rounded-r-lg mb-1 group ${isActive
                                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'} />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
                <div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ClientLayout;
