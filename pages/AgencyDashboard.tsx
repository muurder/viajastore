import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Bell, Globe } from 'lucide-react';

// ... (abbreviated local components for brevity) ...

const AgencyDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { getAgencyTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, agencies, getAgencyStats, bookings, clients, trips } = useData();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') || 'OVERVIEW';
  
  // ... (other state variables) ...
  
  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;
  const myAgency = agencies.find(a => a.id === user.id) as Agency;
  if (!myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-primary-600" /></div>;
  
  const stats = getAgencyStats(user.id);
  const recentBookings = bookings
    .filter(b => trips.some(t => t.id === b.tripId && t.agencyId === user.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  const newSalesCount = recentBookings.filter(b => new Date(b.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
  
  const rawSlug = myAgency.slug || '';
  const fullAgencyLink = rawSlug ? `${window.location.origin}/#/${rawSlug}` : '';

  // ... (abbreviated handlers for brevity) ...

  const NavButton: React.FC<{tabId: string, label: string, icon: any, badge?: number}> = ({ tabId, label, icon: Icon, badge }) => (
    <button 
      onClick={() => setSearchParams({ tab: tabId })} 
      className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
    >
      <Icon size={16} />
      {label}
      {badge && badge > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse">
              {badge}
          </span>
      )}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {/* ... (Header and Navigation Tabs) ... */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} badge={newSalesCount} />
        <NavButton tabId="TRIPS" label="Pacotes" icon={Plane} />
        <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} />
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} />
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8">
            {/* ... (Metrics Cards) ... */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {fullAgencyLink && (
                        <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/padded-light.png')] opacity-[0.03]"></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-2 flex items-center gap-3"><Globe size={24} className="text-primary-400"/> Seu Mini Site está no ar!</h3>
                                <p className="text-gray-300 text-sm mb-6 max-w-md">Este é o seu link exclusivo para divulgar seus pacotes diretamente aos clientes.</p>
                                
                                <div className="bg-black/20 p-1 rounded-xl flex items-center justify-between mb-6 border border-white/10">
                                    <span className="text-sm font-mono text-gray-200 px-3 truncate">{fullAgencyLink}</span>
                                    <button onClick={() => {navigator.clipboard.writeText(fullAgencyLink); showToast('Link copiado!', 'success')}} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-500 transition-colors flex items-center gap-2 flex-shrink-0">
                                        <Copy size={16}/> Copiar
                                    </button>
                                </div>
                                <a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary-300 hover:text-white transition-colors flex items-center gap-1.5">
                                    Acessar Página Pública <ExternalLink size={14}/>
                                Acessar Página Pública <ExternalLink size={14}/>
                                </a>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center mb-6"><ShoppingBag className="mr-2 text-green-600" size={20}/> Vendas Recentes</h3>
                        {recentBookings.length > 0 ? (
                            <div className="space-y-4">
                                {recentBookings.map(booking => {
                                    const trip = trips.find(t => t.id === booking.tripId);
                                    const client = clients.find(c => c.id === booking.clientId);
                                    const isNew = new Date(booking.date).getTime() > new Date().getTime() - 24 * 60 * 60 * 1000;
                                    const clientWhatsAppLink = client?.phone ? `https://wa.me/${client.phone.replace(/\D/g, '')}` : null;

                                    return (
                                        <div key={booking.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isNew ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                                    <img src={client?.avatar || `https://ui-avatars.com/api/?name=${client?.name || 'C'}`} className="rounded-full w-full h-full object-cover"/>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">{client?.name || 'Cliente anônimo'} {isNew && <span className="text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded animate-pulse">NOVO</span>}</p>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{trip?.title || 'Pacote'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-sm font-bold text-green-600 hidden sm:block">+ R$ {booking.totalPrice.toLocaleString()}</p>
                                                {clientWhatsAppLink && (
                                                    <a href={clientWhatsAppLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors" title={`Falar com ${client?.name}`}>
                                                        <Smartphone size={16}/>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                Nenhuma venda registrada recentemente.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
      {/* ... (Other tabs remain the same) ... */}
    </div>
  );
};

export default AgencyDashboard;