import React from 'react';
import { Trip, Booking, DashboardStats, Agency } from '../../../../types';
import { DollarSign, Plane, ShoppingBag, Star, LucideProps, ExternalLink, Plus, BarChart2, Eye, ListChecks } from 'lucide-react';
import RecentBookingsTable from '../components/RecentBookingsTable';
import { TopTripsCard } from '../components/TopTripsCard';

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
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24} /></div>
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
    currentAgency: Agency;
    onCreateTrip: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, myTrips, myBookings, clients, onTabChange, currentAgency, onCreateTrip }) => {
    const sortedBookings = [...myBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6 animate-[fadeIn_0.3s]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Bom dia, {currentAgency.name.split(' ')[0]}! 👋</h2>
                    <p className="text-gray-500">Aqui está o resumo da sua agência hoje.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button onClick={() => window.open(`/#/${currentAgency.slug}`, '_blank')} className="w-full md:w-auto bg-white text-primary-600 border-2 border-primary-100 px-5 py-2.5 rounded-xl font-bold hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
                        <ExternalLink size={20} /> Ver meu Site
                    </button>
                    <button onClick={onCreateTrip} className="w-full md:w-auto bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <Plus size={20} /> Criar Nova Viagem
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Vendas Totais"
                    value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Todas as viagens"
                    icon={ShoppingBag}
                    color="green"
                    onClick={() => onTabChange('BOOKINGS')}
                />
                <StatCard
                    title="Visualizações"
                    value={stats.totalViews}
                    subtitle="Últimos 30 dias"
                    icon={Eye}
                    color="blue"
                />
                <StatCard
                    title="Viagens Ativas"
                    value={myTrips.filter(t => t.is_active).length}
                    subtitle={`${myTrips.filter(t => !t.is_active).length} rascunhos`}
                    icon={Plane}
                    color="purple"
                    onClick={() => onTabChange('TRIPS')}
                />
                <StatCard
                    title="Conversão"
                    value={`${stats.conversionRate ? stats.conversionRate.toFixed(1) : 0}%`}
                    subtitle="Vendas / Views"
                    icon={BarChart2}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <ListChecks size={20} className="text-primary-600" /> Últimas Reservas
                            </h3>
                            <button onClick={() => onTabChange('BOOKINGS')} className="text-sm text-primary-600 font-bold hover:underline">Ver todas</button>
                        </div>
                        <RecentBookingsTable bookings={sortedBookings.slice(0, 5)} clients={clients} />
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <TopTripsCard trips={myTrips} />
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
