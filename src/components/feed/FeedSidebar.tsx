import React from 'react';
import { User, ShoppingBag, Heart, Settings, Shield, Star, LogOut, ArrowRight, Compass, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeedSidebarProps {
    userName: string;
    userAvatar?: string | null;
    stats: {
        trips: number;
        favorites: number;
        reviews: number;
    };
    onLogout: () => void;
    getNavLink: (tab: string) => string;
    className?: string;
}

/**
 * FeedSidebar - Right sidebar for the Travel Feed dashboard
 * Contains quick stats, navigation, and profile card
 */
const FeedSidebar: React.FC<FeedSidebarProps> = ({
    userName,
    userAvatar,
    stats,
    onLogout,
    getNavLink,
    className = ''
}) => {
    const firstName = userName?.split(' ')[0] || 'Viajante';

    const menuItems = [
        { id: 'PROFILE', icon: User, label: 'Meu Perfil' },
        { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' },
        { id: 'REVIEWS', icon: Star, label: 'Avaliações' },
        { id: 'FAVORITES', icon: Heart, label: 'Favoritos' },
        { id: 'SETTINGS', icon: Settings, label: 'Configurações' },
        { id: 'SECURITY', icon: Shield, label: 'Segurança' },
    ];

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-5">
                    <img
                        src={userAvatar || `https://ui-avatars.com/api/?name=${firstName}&background=random`}
                        alt={firstName}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-stone-100"
                    />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 truncate">{userName}</h3>
                        <p className="text-sm text-stone-500">Viajante SouNativo</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-3 bg-stone-50 rounded-xl">
                        <p className="text-xl font-bold text-stone-900">{stats.trips}</p>
                        <p className="text-[10px] text-stone-500 uppercase font-medium">Viagens</p>
                    </div>
                    <div className="text-center p-3 bg-stone-50 rounded-xl">
                        <p className="text-xl font-bold text-stone-900">{stats.favorites}</p>
                        <p className="text-[10px] text-stone-500 uppercase font-medium">Favoritos</p>
                    </div>
                    <div className="text-center p-3 bg-stone-50 rounded-xl">
                        <p className="text-xl font-bold text-stone-900">{stats.reviews}</p>
                        <p className="text-[10px] text-stone-500 uppercase font-medium">Avaliações</p>
                    </div>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-stone-100">
                    <h4 className="text-sm font-semibold text-stone-700">Menu Rápido</h4>
                </div>
                <nav className="divide-y divide-stone-50">
                    {menuItems.map((item) => (
                        <Link
                            key={item.id}
                            to={getNavLink(item.id)}
                            className="flex items-center gap-3 px-5 py-3 text-stone-700 hover:bg-stone-50 transition-colors group"
                        >
                            <item.icon size={18} className="text-stone-400 group-hover:text-primary-600 transition-colors" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-stone-100">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-3 px-5 py-3 w-full text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sair da Conta</span>
                    </button>
                </div>
            </div>

            {/* Explore CTA Card */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Compass size={20} />
                    </div>
                    <h4 className="font-semibold">Explore o Brasil</h4>
                </div>
                <p className="text-primary-100 text-sm mb-4">
                    Descubra destinos incríveis e viva experiências únicas.
                </p>
                <Link
                    to="/trips"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-primary-700 rounded-xl font-semibold text-sm hover:bg-white/95 transition-all active:scale-[0.98]"
                >
                    Ver Viagens
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
};

export default FeedSidebar;
