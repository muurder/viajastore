
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency, Plan, TripCategory, TravelerType } from '../types'; 
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams, Link } from 'react-router-dom'; 
import { Plus, Edit, Trash2, Save, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, ShoppingBag, Clock, MoreVertical, MoreHorizontal, PauseCircle, PlayCircle, Settings, CheckCircle, Upload, AlignLeft, AlignCenter, AlignRight, Quote, Smile, Bold, Italic, Underline, List, MessageCircle, Rocket, Palette, RefreshCw, ShieldCheck, LucideProps, Plane, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';

// --- SHARED COMPONENTS ---

const Badge: React.FC<{ children: React.ReactNode; color: 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'amber' }> = ({ children, color }) => {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]} inline-flex items-center gap-1.5 w-fit`}>
      {children}
    </span>
  );
};

interface StatCardProps { title: string; value: string | number; subtitle: string; icon: React.ComponentType<LucideProps>; color: 'green' | 'blue' | 'purple' | 'amber' }
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
    const bgColors = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24}/></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

interface ActionsMenuTripProps {
  trip: Trip;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  fullAgencyLink: string;
}

const ActionsMenuTrip: React.FC<ActionsMenuTripProps> = ({ trip, onEdit, onDuplicate, onDelete, onToggleStatus, fullAgencyLink }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const isPublished = trip.is_active;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onEdit} className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${isPublished ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-primary-200 hover:text-primary-600' : 'text-primary-700 bg-primary-50 border-primary-100 hover:bg-primary-100'}`}>{isPublished ? 'Gerenciar' : 'Editar'}</button>
        <button onClick={() => setIsOpen(!isOpen)} className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><MoreHorizontal size={20} /></button>
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[fadeIn_0.1s] origin-top-right ring-1 ring-black/5">
          <div className="py-1">
            <button onClick={() => { onToggleStatus(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><PauseCircle size={16} className="mr-3 text-gray-400"/> {isPublished ? 'Pausar vendas' : 'Publicar'}</button>
            <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Edit size={16} className="mr-3 text-gray-400"/> Editar</button>
            <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-3"/> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SubscriptionActivationView: React.FC<{
  agency: Agency;
  onSelectPlan: (plan: Plan) => void;
  activatingPlanId: string | null;
}> = ({ agency, onSelectPlan, activatingPlanId }) => {
  return (
    <div className="max-w-4xl mx-auto text-center py-12 animate-[fadeIn_0.3s]">
      <div className="bg-red-50 p-4 rounded-full inline-block border-4 border-red-100 mb-4">
        <CreditCard size={32} className="text-red-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">Ative sua conta de agência</h1>
      <p className="text-gray-500 mt-2 mb-8">
        Olá, {agency.name}! Para começar a vender e gerenciar seus pacotes, escolha um dos nossos planos de assinatura.
      </p>
      
      <div className="grid md:grid-cols-2 gap-8">
        {PLANS.map(plan => {
          const isLoading = activatingPlanId === plan.id;
          const isPremium = plan.id === 'PREMIUM';
          return (
            <div key={plan.id} className={`bg-white p-8 rounded-2xl border transition-all shadow-sm hover:shadow-xl relative overflow-hidden ${isPremium ? 'border-primary-500' : 'border-gray-200 hover:border-primary-300'}`}>
              {isPremium && <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-md">Recomendado</div>}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-3xl font-extrabold text-primary-600 mt-2">
                R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span>
              </p>
              <ul className="mt-8 space-y-4 text-gray-600 text-sm mb-8 text-left">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" /> 
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => onSelectPlan(plan)}
                disabled={!!activatingPlanId}
                className="w-full py-3 rounded-xl font-bold transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size={16} className="animate-spin" /> Processando...
                  </span>
                ) : 'Selecionar Plano'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

const AgencyDashboard: React.FC = () => {
  const { user, loading: authLoading, uploadImage } = useAuth();
  const { trips, bookings, createTrip, updateTrip, deleteTrip, toggleTripStatus, refreshData, loading: dataLoading, agencyReviews: allAgencyReviews, agencies } = useData();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';

  const [activeAgency, setActiveAgency] = useState<Agency | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalType, setModalType] = useState<'CREATE_TRIP' | 'EDIT_TRIP' | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<Partial<Trip>>({});

  // 1. Loading Check
  if (authLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader size={48} className="animate-spin text-primary-500 mb-4" />
            <p className="text-gray-500">Verificando conta...</p>
        </div>
    );
  }

  // 2. Auth Check - Redirect if not logged in
  if (!user) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50">
            <h2 className="text-xl font-bold mb-2">Sessão Expirada</h2>
            <p className="text-gray-500 mb-4">Faça login para acessar o painel.</p>
            <Link to="/#login" className="text-primary-600 font-bold hover:underline">Ir para Login</Link>
        </div>
      );
  }

  // 3. Role Check (Non-blocking)
  const role = user.role ? String(user.role).toUpperCase() : '';
  const isAgency = role === 'AGENCY';

  // 4. Resolve Agency Object
  useEffect(() => {
    if (user && isAgency) {
      // Priority 1: Find agency in the full list from DataContext (most up-to-date)
      // Note: DataContext maps 'id' to user_id (profile id)
      const found = agencies.find(a => 
        a.id === user.id || 
        (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
      );

      if (found) {
        console.log("AgencyDashboard: Matched agency from DataContext", found.name);
        setActiveAgency(found);
      } else {
        // Priority 2: Fallback to AuthContext user object if valid
        console.warn("AgencyDashboard: Agency not found in DataContext list. Using Auth User fallback.");
        const fallback = user as Agency;
        // Even if agencyId is missing/incomplete in fallback, we use it to avoid blocking UI
        setActiveAgency(fallback);
      }
    }
  }, [user, agencies, isAgency]);

  if (!activeAgency && isAgency) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader size={32} className="animate-spin text-primary-500 mb-4" />
            <p className="text-gray-500">Carregando dados da agência...</p>
        </div>
      );
  }

  // Safe fallback if activeAgency is still null (shouldn't happen for isAgency=true due to logic above)
  const agency = activeAgency || (user as Agency);

  const agencyTrips = trips.filter(t => t.agencyId === agency.agencyId);
  const agencyBookings = bookings.filter(b => b._agency?.agencyId === agency.agencyId);
  const agencyReviews = allAgencyReviews.filter(r => r.agencyId === agency.agencyId);

  // Stats
  const totalRevenue = agencyBookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalPrice, 0);
  const totalSales = agencyBookings.filter(b => b.status === 'CONFIRMED').length;
  const totalViews = agencyTrips.reduce((sum, t) => sum + (t.views || 0), 0);
  const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  // SUBSCRIPTION CHECK
  if (agency.subscriptionStatus !== 'ACTIVE' && agency.subscriptionStatus !== 'PENDING') {
      const handlePlanSelect = async (plan: Plan) => {
          setIsProcessing(true);
          try {
              // Simulate API call to activate
              await supabase.rpc('activate_agency_subscription', { 
                  p_user_id: user.id, 
                  p_plan_id: plan.id 
              }); 
              showToast(`Plano ${plan.name} ativado com sucesso!`, 'success');
              // Force reload page to refresh auth context
              window.location.reload();
          } catch (error: any) {
              console.error("Error activating subscription:", error);
              showToast(error.message || "Erro ao ativar plano.", 'error');
          } finally {
              setIsProcessing(false);
          }
      };
      
      return (
          <SubscriptionActivationView
              agency={agency}
              onSelectPlan={handlePlanSelect}
              activatingPlanId={isProcessing ? 'some-id' : null}
          />
      );
  }

  // Handlers
  const handleCreateTrip = () => {
    setTripForm({
      title: '', description: '', price: 0, destination: '', durationDays: 1, images: [],
      category: 'PRAIA', tags: [], included: [], notIncluded: [], travelerTypes: [],
      startDate: '', endDate: '', paymentMethods: [], is_active: true
    });
    setModalType('CREATE_TRIP');
  };

  const handleEditTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setTripForm({ ...trip, startDate: trip.startDate.split('T')[0], endDate: trip.endDate.split('T')[0] });
    setModalType('EDIT_TRIP');
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload: Trip = {
        ...(tripForm as Trip),
        agencyId: agency.agencyId,
        slug: slugify(tripForm.title || '') + '-' + Date.now(),
        startDate: new Date(tripForm.startDate!).toISOString(),
        endDate: new Date(tripForm.endDate!).toISOString(),
      };
      
      if (modalType === 'CREATE_TRIP') {
        await createTrip(payload);
        showToast('Viagem criada com sucesso!', 'success');
      } else if (modalType === 'EDIT_TRIP' && selectedTrip) {
        await updateTrip({ ...selectedTrip, ...payload, id: selectedTrip.id });
        showToast('Viagem atualizada com sucesso!', 'success');
      }
      setModalType(null);
    } catch (error: any) {
      showToast(error.message || "Erro ao salvar viagem.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {/* WARNING BANNER IF NOT AGENCY ROLE (INSTEAD OF BLOCKING) */}
      {!isAgency && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-red-700">
                        Atenção: Seu usuário não está identificado como "AGENCY". 
                        Role atual: <strong>{user?.role || 'Nenhum'}</strong>. 
                        Isso pode causar erros de permissão ao salvar dados.
                    </p>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500"/> Painel da Agência
            <span className="mx-2 text-gray-300">•</span>
            <Link to={`/${agency.slug}`} target="_blank" className="text-primary-600 flex items-center hover:underline">
                Ver meu site <ExternalLink size={14} className="ml-1"/>
            </Link>
          </p>
        </div>
        <button onClick={refreshData} disabled={dataLoading} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
            {dataLoading ? <Loader size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
            Atualizar Dados
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        {['OVERVIEW', 'TRIPS', 'BOOKINGS', 'REVIEWS', 'SETTINGS'].map(tab => (
            <button 
                key={tab}
                onClick={() => setSearchParams({ tab })} 
                className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            >
                {tab === 'OVERVIEW' && <Layout size={16}/>}
                {tab === 'TRIPS' && <Plane size={16}/>}
                {tab === 'BOOKINGS' && <ShoppingBag size={16}/>}
                {tab === 'REVIEWS' && <Star size={16}/>}
                {tab === 'SETTINGS' && <Settings size={16}/>}
                {tab === 'OVERVIEW' ? 'Visão Geral' : tab === 'TRIPS' ? 'Pacotes' : tab === 'BOOKINGS' ? 'Reservas' : tab === 'REVIEWS' ? 'Avaliações' : 'Configurações'}
            </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total de Vendas" value={totalSales} subtitle="Reservas confirmadas" icon={ShoppingBag} color="green"/>
              <StatCard title="Receita Gerada" value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`} subtitle="Faturamento total" icon={DollarSign} color="blue"/>
              <StatCard title="Visualizações" value={totalViews} subtitle="Páginas de pacote" icon={Eye} color="amber"/>
              <StatCard title="Taxa de Conversão" value={`${conversionRate.toFixed(1)}%`} subtitle="Vendas por visualização" icon={BarChart2} color="purple"/>
            </div>
          </div>
      )}

      {activeTab === 'TRIPS' && (
          <div className="animate-[fadeIn_0.3s]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Meus Pacotes ({agencyTrips.length})</h2>
              <button onClick={handleCreateTrip} className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700">
                <Plus size={18}/> Novo Pacote
              </button>
            </div>
            {agencyTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencyTrips.map(trip => (
                  <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="relative h-48 w-full bg-gray-100">
                      <img src={trip.images[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover" />
                      {trip.is_active ? (
                        <span className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">Ativo</span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-gray-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">Inativo</span>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 line-clamp-2">{trip.title}</h3>
                      <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-auto">
                        <span className="text-xl font-extrabold text-primary-600">R$ {trip.price.toLocaleString('pt-BR')}</span>
                        <ActionsMenuTrip 
                            trip={trip}
                            onEdit={() => handleEditTrip(trip)}
                            onDuplicate={() => showToast('Em breve!', 'info')}
                            onDelete={() => deleteTrip(trip.id)}
                            onToggleStatus={() => toggleTripStatus(trip.id)}
                            fullAgencyLink={`/${agency.slug}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 mb-4">Você ainda não tem pacotes cadastrados.</p>
                    <button onClick={handleCreateTrip} className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-bold">Criar Primeiro Pacote</button>
                </div>
            )}
          </div>
      )}

      {/* Modals simplificados para edição/criação seriam renderizados aqui */}
      {(modalType === 'CREATE_TRIP' || modalType === 'EDIT_TRIP') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{modalType === 'CREATE_TRIP' ? 'Criar Novo Pacote' : 'Editar Pacote'}</h2>
            <form onSubmit={handleSaveTrip} className="space-y-6">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Título</label><input value={tripForm.title || ''} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border p-3 rounded-lg" required/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço</label><input type="number" value={tripForm.price || 0} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg" required/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Dias</label><input type="number" value={tripForm.durationDays || 1} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg" required/></div>
                </div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Destino</label><input value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg" required/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Início</label><input type="date" value={tripForm.startDate?.split('T')[0] || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg" required/></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1">Fim</label><input type="date" value={tripForm.endDate?.split('T')[0] || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg" required/></div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50">
                    {isProcessing ? 'Salvando...' : 'Salvar'}
                </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
