import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { ShoppingBag, Clock, Plus, Package, Settings, LayoutDashboard, Search, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const AgencyDashboard: React.FC = () => {
    const { user } = useAuth();
    const { trips, bookings, clients, createTrip, updateTrip, deleteTrip, toggleTripStatus } = useData();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'SETTINGS'>('OVERVIEW');

    if (!user || user.role !== UserRole.AGENCY) {
        return <div className="min-h-screen flex items-center justify-center">Acesso restrito.</div>;
    }

    // Filter data for this agency
    const myTrips = trips.filter(t => t.agencyId === user.id);
    const myBookings = bookings.filter(b => myTrips.some(t => t.id === b.tripId));
    
    // Calculate Stats
    const totalRevenue = myBookings.reduce((acc, b) => acc + b.totalPrice, 0);
    const totalSales = myBookings.length;
    const activeTripsCount = myTrips.filter(t => t.active).length;
    const totalViews = myTrips.reduce((acc, t) => acc + (t.views || 0), 0);

    // Recent Bookings
    const recentBookings = [...myBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Painel da Agência</h1>
                    <p className="text-gray-500">Gerencie seus pacotes e acompanhe suas vendas.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'OVERVIEW' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                    >
                        <LayoutDashboard size={16}/> Visão Geral
                    </button>
                    <button 
                         onClick={() => setActiveTab('TRIPS')}
                         className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'TRIPS' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                    >
                        <Package size={16}/> Pacotes
                    </button>
                    <button 
                         onClick={() => setActiveTab('SETTINGS')}
                         className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'SETTINGS' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                    >
                        <Settings size={16}/> Configurações
                    </button>
                </div>
            </div>

            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-[fadeIn_0.3s]">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Receita Total</p>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mt-1">R$ {totalRevenue.toLocaleString()}</h3>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg text-green-600"><TrendingUp size={20}/></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendas</p>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalSales}</h3>
                                </div>
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><ShoppingBag size={20}/></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visualizações</p>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalViews}</h3>
                                </div>
                                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Users size={20}/></div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pacotes Ativos</p>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{activeTripsCount}</h3>
                                </div>
                                <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Package size={20}/></div>
                            </div>
                        </div>
                    </div>

                    {/* VENDAS RECENTES WIDGET */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center"><ShoppingBag className="mr-2 text-green-600" size={20}/> Vendas Recentes</h3>
                            {recentBookings.some(b => new Date(b.date).getTime() > Date.now() - 24 * 60 * 60 * 1000) && (
                                <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full animate-pulse flex items-center">
                                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-1.5"></span>
                                    Novas Atividades
                                </span>
                            )}
                        </div>
                        {recentBookings.length > 0 ? (
                            <div className="space-y-3">
                                {recentBookings.map(booking => {
                                    const trip = trips.find(t => t.id === booking.tripId);
                                    const client = clients.find(c => c.id === booking.clientId);
                                    const isNew = new Date(booking.date).getTime() > Date.now() - 24 * 60 * 60 * 1000; // Menos de 24h

                                    return (
                                        <div key={booking.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isNew ? 'bg-green-50 border-green-200 shadow-sm relative overflow-hidden' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                                            {isNew && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center font-bold text-gray-600 shadow-sm">
                                                    {client?.name.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-900">{client?.name || 'Cliente'}</p>
                                                        {isNew && <span className="text-[9px] bg-green-600 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Novo</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{trip?.title || 'Pacote desconhecido'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-green-700 bg-white px-2 py-0.5 rounded-md border border-green-100 shadow-sm inline-block">+ R$ {booking.totalPrice.toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-end gap-1">
                                                    <Clock size={10}/> {new Date(booking.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                Nenhuma venda registrada recentemente.
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'TRIPS' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center animate-[fadeIn_0.3s]">
                     <Package size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-xl font-bold text-gray-900">Gerenciamento de Pacotes</h3>
                     <p className="text-gray-500 mb-6">Esta funcionalidade será implementada em breve.</p>
                     <button className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700">Criar Novo Pacote</button>
                </div>
            )}

            {activeTab === 'SETTINGS' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center animate-[fadeIn_0.3s]">
                     <Settings size={48} className="mx-auto text-gray-300 mb-4" />
                     <h3 className="text-xl font-bold text-gray-900">Configurações da Agência</h3>
                     <p className="text-gray-500 mb-6">Edite seu perfil, logo e informações de contato.</p>
                </div>
            )}
        </div>
    );
};

export default AgencyDashboard;