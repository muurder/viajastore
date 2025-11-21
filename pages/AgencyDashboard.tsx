
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trip, UserRole, ItineraryDay } from '../types';
import { PLANS } from '../services/mockData';
import { Plus, Edit, Trash2, TrendingUp, ShoppingCart, DollarSign, AlertTriangle, Lock, CheckCircle, X, BarChart3, Eye, MapPin, Loader, Image as ImageIcon, Search, Save, ArrowLeft, Bold, Italic, List, Smile } from 'lucide-react';

// --- COMPONENTS AUXILIARES ---

// 1. Editor de Texto Rico (Simulado)
const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const insertFormat = (start: string, end: string) => {
    const textarea = document.getElementById('rich-desc') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const s = textarea.selectionStart;
    const e = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, s);
    const selection = text.substring(s, e);
    const after = text.substring(e);
    
    const newText = before + start + selection + end + after;
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(s + start.length, e + start.length);
    }, 0);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2">
        <button type="button" onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Negrito"><Bold size={16}/></button>
        <button type="button" onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Itálico"><Italic size={16}/></button>
        <button type="button" onClick={() => insertFormat('\n- ', '')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Lista"><List size={16}/></button>
        <button type="button" onClick={() => insertFormat('😊', '')} className="p-1.5 hover:bg-gray-200 rounded text-gray-600" title="Emoji"><Smile size={16}/></button>
      </div>
      <textarea
        id="rich-desc"
        rows={6}
        className="w-full p-3 outline-none resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Descreva os detalhes incríveis desta viagem..."
      />
      <div className="bg-gray-50 p-2 text-xs text-gray-400 text-right">Markdown suportado</div>
    </div>
  );
};

// 2. Gerenciador de Imagens (URL Based)
const ImageManager: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [urlInput, setUrlInput] = useState('');

  const addImage = () => {
    if (urlInput && !images.includes(urlInput)) {
      onChange([...images, urlInput]);
      setUrlInput('');
    }
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input 
          type="url" 
          className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="Cole a URL da imagem (ex: https://...)"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button type="button" onClick={addImage} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
          Adicionar
        </button>
      </div>
      
      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
              <button 
                type="button" 
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. Construtor de Itinerário
const ItineraryBuilder: React.FC<{ itinerary: ItineraryDay[]; onChange: (items: ItineraryDay[]) => void }> = ({ itinerary, onChange }) => {
  const addDay = () => {
    onChange([...itinerary, { day: itinerary.length + 1, title: '', description: '' }]);
  };

  const updateDay = (idx: number, field: keyof ItineraryDay, value: string) => {
    const newItems = [...itinerary];
    newItems[idx] = { ...newItems[idx], [field]: value };
    onChange(newItems);
  };

  const removeDay = (idx: number) => {
    const newItems = itinerary.filter((_, i) => i !== idx).map((item, i) => ({ ...item, day: i + 1 })); // Reindex
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {itinerary.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative group">
          <button type="button" onClick={() => removeDay(idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
          <h4 className="text-sm font-bold text-primary-700 mb-2 uppercase">Dia {item.day}</h4>
          <input 
             className="w-full mb-2 border border-gray-300 rounded p-2 text-sm font-bold"
             placeholder="Título do dia (ex: Chegada e Check-in)"
             value={item.title}
             onChange={(e) => updateDay(idx, 'title', e.target.value)}
          />
          <textarea 
             className="w-full border border-gray-300 rounded p-2 text-sm resize-none"
             rows={2}
             placeholder="O que vai acontecer neste dia..."
             value={item.description}
             onChange={(e) => updateDay(idx, 'description', e.target.value)}
          />
        </div>
      ))}
      <button type="button" onClick={addDay} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 font-bold text-sm transition-colors flex items-center justify-center">
         <Plus size={16} className="mr-2"/> Adicionar Dia
      </button>
    </div>
  );
};

// --- AGENCY DASHBOARD PRINCIPAL ---

const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats, loading: dataLoading } = useData();
  
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION'>('STATS');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Trip>>({
    title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], notIncluded: [], description: '', images: [], itinerary: []
  });
  
  // Simple Lists State for Form
  const [inclusionInput, setInclusionInput] = useState('');

  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex items-center justify-center">Acesso negado.</div>;

  const myAgency = agencies.find(a => a.id === user.id);
  
  if (dataLoading) return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-primary-600"/></div>;
  if (!myAgency) return <div className="min-h-screen flex items-center justify-center">Agência não encontrada.</div>;

  const myTrips = getAgencyTrips(user.id).filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const stats = getAgencyStats(user.id);

  const now = new Date();
  const expires = new Date(myAgency.subscriptionExpiresAt);
  const isSubscriptionActive = myAgency.subscriptionStatus === 'ACTIVE' && expires > now;

  // Handlers
  const handleOpenCreate = () => {
    setEditingTripId(null);
    setFormData({ title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], notIncluded: [], description: '', images: [], itinerary: [] });
    setViewMode('FORM');
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setFormData({ ...trip, itinerary: trip.itinerary || [] });
    setViewMode('FORM');
  };

  const handleAddInclusion = () => {
     if(inclusionInput && !formData.included?.includes(inclusionInput)) {
         setFormData({ ...formData, included: [...(formData.included || []), inclusionInput] });
         setInclusionInput('');
     }
  };

  const handleRemoveInclusion = (idx: number) => {
      setFormData({ ...formData, included: formData.included?.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalImages = formData.images && formData.images.length > 0 
        ? formData.images 
        : ['https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=800&q=80'];

    const tripData = {
        ...formData,
        agencyId: user.id,
        images: finalImages,
    } as Trip;

    try {
        if (editingTripId) {
            await updateTrip(tripData);
            alert('Viagem atualizada com sucesso!');
        } else {
            await createTrip({
              ...tripData,
              id: '', // DB generated
              active: true,
              rating: 0,
              totalReviews: 0,
              startDate: new Date().toISOString(),
              endDate: new Date(new Date().setDate(new Date().getDate() + (formData.durationDays || 5))).toISOString(),
              included: formData.included?.length ? formData.included : ['Hospedagem', 'Guia'],
              notIncluded: formData.notIncluded || [],
              views: 0,
              sales: 0
            });
            alert('Viagem criada com sucesso!');
        }
        setViewMode('LIST');
    } catch (error) {
        alert('Erro ao salvar viagem. Tente novamente.');
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <img src={myAgency.logo} alt="Logo" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <p className="text-gray-500 text-sm">Painel do Parceiro</p>
           </div>
        </div>
        
        {!isSubscriptionActive ? (
          <div className="w-full md:w-auto bg-red-50 text-red-700 px-6 py-4 rounded-xl flex items-center border border-red-100 shadow-sm animate-pulse">
            <AlertTriangle size={24} className="mr-3 shrink-0" />
            <div>
              <p className="font-bold">Assinatura Inativa</p>
              <p className="text-xs">Seus anúncios estão ocultos. Renove para voltar a vender.</p>
            </div>
            <button onClick={() => setActiveTab('SUBSCRIPTION')} className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700">Renovar</button>
          </div>
        ) : (
          <div className="w-full md:w-auto bg-green-50 text-green-700 px-6 py-3 rounded-xl flex items-center border border-green-100">
            <CheckCircle size={24} className="mr-3 shrink-0" />
             <div>
              <p className="font-bold">Plano {myAgency.subscriptionPlan} Ativo</p>
              <p className="text-xs">Vence em {expires.toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {viewMode === 'LIST' ? (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
            <button onClick={() => setActiveTab('STATS')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'STATS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('TRIPS')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'TRIPS' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Meus Pacotes</button>
            <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SUBSCRIPTION' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Assinatura</button>
          </div>

          {activeTab === 'STATS' && (
            <div className="space-y-6 animate-[fadeIn_0.3s]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-gray-500 text-sm font-medium">Faturamento Total</p>
                              <h3 className="text-3xl font-bold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString()}</h3>
                          </div>
                          <div className="p-3 bg-green-100 text-green-600 rounded-xl"><DollarSign size={20}/></div>
                      </div>
                      <div className="text-xs text-green-600 font-bold flex items-center"><TrendingUp size={12} className="mr-1"/> +12% este mês</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-gray-500 text-sm font-medium">Vendas Realizadas</p>
                              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSales}</h3>
                          </div>
                          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><ShoppingCart size={20}/></div>
                      </div>
                      <div className="text-xs text-gray-500">Ticket médio: R$ {(stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0).toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-gray-500 text-sm font-medium">Visualizações</p>
                              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</h3>
                          </div>
                          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Eye size={20}/></div>
                      </div>
                      <div className="text-xs text-purple-600 font-bold flex items-center"><TrendingUp size={12} className="mr-1"/> +5% este mês</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <p className="text-gray-500 text-sm font-medium">Taxa de Conversão</p>
                              <h3 className="text-3xl font-bold text-gray-900 mt-1">{stats.conversionRate.toFixed(1)}%</h3>
                          </div>
                          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><BarChart3 size={20}/></div>
                      </div>
                      <div className="text-xs text-gray-500">Média do mercado: 2.5%</div>
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'TRIPS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">Gerenciar Pacotes</h2>
                <div className="flex gap-4 w-full md:w-auto">
                   <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-3 text-gray-400" size={16}/>
                      <input 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="Buscar pacote..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                   </div>
                   <button 
                    onClick={handleOpenCreate}
                    disabled={!isSubscriptionActive}
                    className={`flex items-center px-4 py-2 rounded-lg text-white font-bold shadow-sm transition-all whitespace-nowrap ${isSubscriptionActive ? 'bg-primary-600 hover:bg-primary-700' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {isSubscriptionActive ? <Plus size={18} className="mr-2" /> : <Lock size={18} className="mr-2" />}
                    Novo Pacote
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase rounded-l-lg">Pacote</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Vendas</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase rounded-r-lg">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myTrips.map(trip => (
                      <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img className="h-12 w-12 rounded-lg object-cover mr-4 bg-gray-200" src={trip.images[0]} alt="" />
                            <div>
                              <div className="font-bold text-gray-900">{trip.title}</div>
                              <div className="text-xs text-gray-500 flex items-center"><MapPin size={10} className="mr-1"/> {trip.destination}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{trip.sales || 0}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {trip.active ? 'Ativo' : 'Pausado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button onClick={() => handleOpenEdit(trip)} disabled={!isSubscriptionActive} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg disabled:text-gray-300"><Edit size={18}/></button>
                          <button onClick={() => { if(window.confirm('Excluir viagem?')) deleteTrip(trip.id) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {myTrips.length === 0 && <div className="text-center py-10 text-gray-400">Nenhuma viagem encontrada.</div>}
              </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-[fadeIn_0.3s]">
              {PLANS.map(plan => (
                <div key={plan.id} className={`relative border rounded-3xl p-8 bg-white flex flex-col transition-all ${myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'ring-2 ring-primary-500 border-transparent shadow-xl scale-105' : 'border-gray-200 hover:shadow-lg'}`}>
                    {myAgency.subscriptionPlan === plan.id && isSubscriptionActive && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white px-6 py-1 rounded-full text-sm font-bold uppercase tracking-wider shadow-md">
                        Seu Plano
                      </div>
                    )}
                    <h4 className="text-2xl font-bold text-gray-900 text-center mb-2">{plan.name}</h4>
                    <div className="text-center mb-8">
                      <span className="text-5xl font-extrabold text-gray-900">R$ {Math.floor(plan.price)}</span>
                      <span className="text-xl font-bold text-gray-900">,{plan.price.toFixed(2).split('.')[1]}</span>
                      <span className="text-gray-500 font-medium block mt-1">/mês</span>
                    </div>
                    <ul className="space-y-4 mb-8 flex-1">
                        {plan.features.map((f, i) => (
                            <li key={i} className="flex items-center text-gray-600">
                                <CheckCircle size={18} className="text-green-500 mr-3 shrink-0" /> {f}
                            </li>
                        ))}
                    </ul>
                    <button 
                      onClick={() => { updateAgencySubscription(user.id, 'ACTIVE', plan.id as any); alert('Assinatura renovada!')}}
                      className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
                        myAgency.subscriptionPlan === plan.id && isSubscriptionActive 
                        ? 'bg-gray-100 text-gray-400 cursor-default shadow-none' 
                        : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                      }`}
                      disabled={myAgency.subscriptionPlan === plan.id && isSubscriptionActive}
                    >
                      {myAgency.subscriptionPlan === plan.id && isSubscriptionActive ? 'Plano Atual' : 'Assinar Agora'}
                    </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // FORM VIEW (Create/Edit)
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
           <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-20">
              <div className="flex items-center gap-3">
                 <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} /></button>
                 <h2 className="text-xl font-bold text-gray-900">{editingTripId ? 'Editar Pacote' : 'Criar Novo Pacote'}</h2>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setViewMode('LIST')} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                 <button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center shadow-md">
                    <Save size={18} className="mr-2" /> {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                 </button>
              </div>
           </div>

           <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
              {/* 1. Basic Info */}
              <section>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Básicas</h3>
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Título do Pacote</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Final de Semana em Arraial do Cabo" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Destino Principal</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                        <select className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                            {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 'NATUREZA', 'CULTURA', 'GASTRONOMICO'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Preço por Pessoa (R$)</label>
                        <input type="number" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.price || ''} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Duração (Dias)</label>
                        <input type="number" className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" value={formData.durationDays || 1} onChange={e => setFormData({...formData, durationDays: Number(e.target.value)})} required />
                    </div>
                 </div>
              </section>

              {/* 2. Media */}
              <section>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center"><ImageIcon size={20} className="mr-2"/> Galeria de Fotos</h3>
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <ImageManager images={formData.images || []} onChange={(imgs) => setFormData({...formData, images: imgs})} />
                 </div>
              </section>

              {/* 3. Details */}
              <section>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Descrição Detalhada</h3>
                 <RichTextEditor value={formData.description || ''} onChange={(val) => setFormData({...formData, description: val})} />
              </section>

              {/* 4. Inclusions */}
              <section>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">O que está incluído?</h3>
                 <div className="flex gap-2 mb-4">
                    <input 
                      className="flex-1 border border-gray-300 rounded-lg p-2"
                      placeholder="Ex: Café da manhã, Transporte..."
                      value={inclusionInput}
                      onChange={e => setInclusionInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInclusion())}
                    />
                    <button type="button" onClick={handleAddInclusion} className="bg-primary-600 text-white px-4 rounded-lg font-bold">Adicionar</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {formData.included?.map((item, idx) => (
                       <span key={idx} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center border border-green-100">
                          <CheckCircle size={14} className="mr-1"/> {item}
                          <button type="button" onClick={() => handleRemoveInclusion(idx)} className="ml-2 text-green-500 hover:text-red-500"><X size={14}/></button>
                       </span>
                    ))}
                 </div>
              </section>

              {/* 5. Itinerary */}
              <section>
                 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Roteiro Dia a Dia</h3>
                 <ItineraryBuilder itinerary={formData.itinerary || []} onChange={(items) => setFormData({...formData, itinerary: items})} />
              </section>
           </form>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
