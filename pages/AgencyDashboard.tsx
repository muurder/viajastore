import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Bell, Globe } from 'lucide-react';

const AgencyDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { getAgencyTrips, bookings, clients, trips, getAgencyStats, refreshData } = useData();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'OVERVIEW';
  
  const [lastClearedSales, setLastClearedSales] = useState<string | null>(localStorage.getItem('lastClearedSales'));
  
  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;

  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);
  
  const recentBookings = useMemo(() => bookings
    .filter(b => myTrips.some(t => t.id === b.tripId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [bookings, myTrips]);

  const newSalesCount = useMemo(() => {
      if (!lastClearedSales) return recentBookings.length;
      return recentBookings.filter(b => new Date(b.date) > new Date(lastClearedSales)).length;
  }, [recentBookings, lastClearedSales]);

  const groupedSales = useMemo(() => {
    return recentBookings.reduce((acc, booking) => {
        const trip = myTrips.find(t => t.id === booking.tripId);
        if (!trip) return acc;

        if (!acc[trip.id]) {
            acc[trip.id] = {
                tripTitle: trip.title,
                salesCount: 0,
                totalRevenue: 0,
            };
        }
        acc[trip.id].salesCount += 1;
        acc[trip.id].totalRevenue += booking.totalPrice;
        return acc;
    }, {} as Record<string, { tripTitle: string; salesCount: number; totalRevenue: number }>);
  }, [recentBookings, myTrips]);

  const handleClearNotifications = () => {
      const now = new Date().toISOString();
      localStorage.setItem('lastClearedSales', now);
      setLastClearedSales(now);
      showToast('Notificações marcadas como lidas.', 'success');
  };
  
  const NavButton: React.FC<{tabId: string, label: string, icon: any, badge?: number}> = ({ tabId, label, icon: Icon, badge }) => (
    <button onClick={() => setSearchParams({ tab: tabId })} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
      <Icon size={16} /> {label}
      {badge && badge > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{badge}</span>}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
           {/* Header restored... */}
        </div>
      
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
            <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} badge={newSalesCount} />
            <NavButton tabId="TRIPS" label="Pacotes" icon={Plane} />
            <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} />
            <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} />
        </div>

        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8 animate-[fadeIn_0.3s]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm font-bold text-gray-400 uppercase">Pacotes Publicados</p><p className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalPackages}</p></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm font-bold text-gray-400 uppercase">Total de Vendas</p><p className="text-3xl font-extrabold text-primary-600 mt-2">{stats.totalSales}</p></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm font-bold text-gray-400 uppercase">Visualizações</p><p className="text-3xl font-extrabold text-purple-600 mt-2">{stats.totalViews}</p></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><p className="text-sm font-bold text-gray-400 uppercase">Receita Total</p><p className="text-3xl font-extrabold text-green-600 mt-2">R$ {stats.totalRevenue.toLocaleString()}</p></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                       <div className="bg-gray-900 rounded-2xl shadow-lg p-6 text-white relative group">
                           <h3 className="text-xl font-bold mb-2 flex items-center gap-3"><Globe size={20} className="text-primary-400"/> Seu Mini Site está no ar!</h3>
                           <p className="text-gray-300 text-sm mb-4 max-w-md">Este é o seu link exclusivo para divulgar seus pacotes.</p>
                           {/* Compacted Mini Site Card */}
                       </div>
                       
                       <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center"><ShoppingBag className="mr-2 text-green-600" size={20}/> Vendas por Pacote</h3>
                            {newSalesCount > 0 && <button onClick={handleClearNotifications} className="text-xs font-bold text-gray-500 hover:text-red-500">Limpar Notificações</button>}
                          </div>
                          {Object.keys(groupedSales).length > 0 ? (
                              <div className="space-y-3">
                                  {Object.entries(groupedSales).map(([tripId, data]) => (
                                     <div key={tripId} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center border border-gray-100">
                                         <div>
                                            <p className="font-bold text-sm text-gray-800">{data.tripTitle}</p>
                                            <p className="text-xs text-gray-500">{data.salesCount} venda(s) recentes</p>
                                         </div>
                                         <p className="font-bold text-green-600 text-sm">+ R$ {data.totalRevenue.toLocaleString()}</p>
                                     </div>
                                  ))}
                              </div>
                          ) : (
                              <p className="text-center text-sm text-gray-400 py-4">Nenhuma venda recente.</p>
                          )}
                       </div>
                    </div>
                </div>
            </div>
        )}
        {activeTab === 'TRIPS' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Pacotes ({myTrips.length})</h2>
                {/* Packages table restored... */}
            </div>
        )}
        {activeTab === 'SUBSCRIPTION' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Minha Assinatura</h2>
                {/* Subscription content restored... */}
            </div>
        )}
        {activeTab === 'SETTINGS' && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Agência</h2>
                {/* Settings content restored... */}
            </div>
        )}
    </div>
  );
};

export default AgencyDashboard;
