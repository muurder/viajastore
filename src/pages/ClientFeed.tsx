import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { TravelFeed } from '../components/feed';
import { UserRole, Trip } from '../types';
import { Loader } from 'lucide-react';

/**
 * ClientFeed - Travel Feed experience for clients
 * A modern, feed-based dashboard that shows notifications, upcoming trips, and discovery
 */
const ClientFeed: React.FC = () => {
    const { user, loading: authLoading, logout } = useAuth();
    const {
        bookings,
        trips,
        clients,
        getReviewsByClientId,
        loading: dataLoading
    } = useData();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Get current client data
    const currentClient = useMemo(() => {
        if (!user) return null;
        return clients.find(c => c.id === user.id) || null;
    }, [user, clients]);

    // Filter bookings for current user
    const myBookings = useMemo(() => {
        if (!user) return [];
        return bookings.filter(b => b.clientId === user.id);
    }, [user, bookings]);

    // Get favorite trips from client data
    const favoriteTrips = useMemo(() => {
        if (!currentClient?.favorites || !trips) return [];
        return trips.filter(t => currentClient.favorites.includes(t.id));
    }, [currentClient, trips]);

    // Get reviews by client
    const myReviews = useMemo(() => {
        if (!user) return [];
        return getReviewsByClientId(user.id);
    }, [user, getReviewsByClientId]);

    const handleLogout = async () => {
        try {
            await logout();
            showToast('Logout realizado com sucesso', 'success');
            navigate('/');
        } catch (error) {
            showToast('Erro ao fazer logout', 'error');
        }
    };

    const getNavLink = (tab: string) => {
        return `/client/dashboard/${tab}`;
    };

    // Show loading state
    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader size={32} className="animate-spin text-primary-600" />
                    <p className="text-stone-600">Carregando seu feed...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated or not a client
    if (!user || user.role !== UserRole.CLIENT) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <div className="text-center">
                    <p className="text-stone-600 mb-4">Você precisa estar logado como cliente para acessar esta página.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
                    >
                        Ir para Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <TravelFeed
                    bookings={myBookings}
                    favoriteTrips={favoriteTrips}
                    myReviews={myReviews}
                    getNavLink={getNavLink}
                    onLogout={handleLogout}
                />
            </div>
        </div>
    );
};

export default ClientFeed;
