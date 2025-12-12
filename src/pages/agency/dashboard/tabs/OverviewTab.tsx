import React from 'react';
import { Trip, Booking, DashboardStats } from '../../../../types';
import { DollarSign, Plane, ShoppingBag, Star, LucideProps } from 'lucide-react';
import RecentBookingsTable from '../components/RecentBookingsTable';
import TopTripsCard from '../components/TopTripsCard';

interface StatCardProps { 
    title: string; 
    value: string | number; 
    subtitle: string; 
    icon: React.ComponentType<LucideProps>; 
    color: 'green' | 'blue' | 'purple' | 'amber';
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color, onClick }) => {
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
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24}/></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

interface OverviewTabProps {
    stats: DashboardStats;
    myTrips: Trip[];
    myBookings: Booking[];
    clients: any[];
    onTabChange: (tab: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, myTrips, myBookings, clients, onTabChange }) => {
    return (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Receita Total" 
                    value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    subtitle="Total acumulado em vendas" 
                    icon={DollarSign} 
                    color="green"
                    onClick={() => onTabChange('BOOKINGS')}
                />
                <StatCard 
                    title="Pacotes Ativos" 
                    value={myTrips.filter(t => t.is_active).length} 
                    subtitle={`${myTrips.filter(t => !t.is_active).length} rascunhos`} 
                    icon={Plane} 
                    color="blue"
                    onClick={() => onTabChange('TRIPS')}
                />
                <StatCard 
                    title="Reservas Confirmadas" 
                    value={myBookings.filter(b => b.status === 'CONFIRMED').length} 
                    subtitle={`${myBookings.filter(b => b.status === 'PENDING').length} pendentes`} 
                    icon={ShoppingBag} 
                    color="purple"
                    onClick={() => onTabChange('BOOKINGS')}
                />
                <StatCard 
                    title="Avaliação Média" 
                    value={stats.averageRating ? stats.averageRating.toFixed(1) : '-'} 
                    subtitle={`${stats.totalReviews || 0} avaliações no total`} 
                    icon={Star} 
                    color="amber"
                    onClick={() => onTabChange('REVIEWS')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RecentBookingsTable bookings={myBookings} clients={clients} />
                <TopTripsCard trips={myTrips} />
            </div>
        </div>
    );
};

export default OverviewTab;
