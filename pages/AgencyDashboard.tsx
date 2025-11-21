
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trip, UserRole, Agency, TripCategory } from '../types';
import { PLANS } from '../services/mockData';
import { supabase } from '../services/supabase';
import { Plus, Edit, Trash2, TrendingUp, ShoppingCart, DollarSign, Lock, CheckCircle, X, Eye, Loader, Save, ArrowLeft, Bold, Italic, List, Upload, Camera, Settings, QrCode, Copy, Check, Tag, AlignLeft, Heading, RotateCcw, Underline, ListOrdered } from 'lucide-react';

// --- CONSTANTS ---
const COMMON_TAGS = ['Natureza', 'Aventura', 'História', 'Relax', 'Romântico', 'Família', 'Gastronomia', 'Luxo', 'Ecoturismo', 'Mochilão', 'Praia', 'Montanha', 'Urbano', 'Cultural'];

const SUGGESTED_INCLUDED = ['Hospedagem', 'Café da Manhã', 'Passagem Aérea', 'Translado', 'Seguro Viagem', 'Guia Turístico', 'Passeios', 'Ingressos', 'Jantar', 'Almoço', 'Wi-Fi', 'Kit Boas-vindas'];

const PAYMENT_OPTIONS = [
    { id: 'CREDIT_CARD', label: 'Cartão de Crédito' },
    { id: 'PIX', label: 'PIX' },
    { id: 'BOLETO', label: 'Boleto Bancário' },
    { id: 'TRANSFER', label: 'Transferência Bancária' },
    { id: 'CASH', label: 'Dinheiro' }
];

// --- COMPONENTS AUXILIARES ---

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Execute command for WYSIWYG
  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) {
        onChange(contentRef.current.innerHTML);
    }
  };

  // Sync initial value (careful with cursor jumps in controlled components)
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
       // Only set if empty to avoid cursor jumping issues, 
       // or strictly control it if you want perfect sync (harder without libraries)
       if (value === '' || contentRef.current.innerHTML === '') {
           contentRef.current.innerHTML = value;
       }
    }
  }, []);

  const handleInput = () => {
      if (contentRef.current) {
          onChange(contentRef.current.innerHTML);
      }
  };

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow bg-white shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
        <button type="button" onClick={() => execCmd('bold')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Negrito">
            <Bold size={18}/>
        </button>
        <button type="button" onClick={() => execCmd('italic')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Itálico">
            <Italic size={18}/>
        </button>
        <button type="button" onClick={() => execCmd('underline')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Sublinhado">
            <Underline size={18}/>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className="p-2 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm transition-colors flex items-center gap-1" title="Título de Seção">
            <Heading size={18}/> <span className="text-xs font-medium">Título</span>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Lista com Marcadores">
            <List size={18}/>
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors" title="Lista Numerada">
            <ListOrdered size={18}/>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button type="button" onClick={() => execCmd('removeFormat')} className="p-2 hover:bg-gray-200 rounded text-gray-700 transition-colors ml-auto flex items-center gap-1" title="Limpar Formatação">
            <RotateCcw size={14}/> <span className="text-xs">Limpar</span>
        </button>
      </div>
      
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        className="w-full p-4 min-h-[300px] outline-none text-sm leading-relaxed text-gray-700 prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-2"
        style={{ minHeight: '300px' }}
      />
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
          Escreva livremente. Selecione o texto para aplicar formatação.
      </div>
    </div>
  );
};

const IncludedItemsManager: React.FC<{ items: string[]; onChange: (items: string[]) => void }> = ({ items, onChange }) => {
    const [newItem, setNewItem] = useState('');

    const addItem = (item: string) => {
        if (item && !items.includes(item)) {
            onChange([...items, item]);
            setNewItem('');
        }
    };

    const removeItem = (itemToRemove: string) => {
        onChange(items.filter(i => i !== itemToRemove));
    };

    return (
        <div className="space-y-4">
             {/* Suggestions */}
             <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sugestões Rápidas (Clique para adicionar)</p>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTED_INCLUDED.map(suggestion => (
                        <button 
                            key={suggestion}
                            type="button"
                            onClick={() => addItem(suggestion)}
                            disabled={items.includes(suggestion)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${items.includes(suggestion) ? 'bg-green-50 border-green-200 text-green-700 opacity-50 cursor-default' : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'}`}
                        >
                            {items.includes(suggestion) && <Check size={10} className="inline mr-1"/>}
                            {suggestion}
                        </button>
                    ))}
                </div>
             </div>

             {/* Input Manual */}
             <div className="flex gap-2">
                 <input 
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Adicionar outro item (ex: Seguro bagagem)..."
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-primary-500"
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addItem(newItem); } }}
                 />
                 <button 
                    type="button" 
                    onClick={() => addItem(newItem)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm"
                 >
                    Adicionar
                 </button>
             </div>

             {/* Selected List */}
             {items.length > 0 && (
                 <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <p className="text-xs font-bold text-gray-500 uppercase mb-2">Itens Inclusos Selecionados</p>
                     <div className="flex flex-wrap gap-2">
                         {items.map((item, idx) => (
                             <div key={idx} className="flex items-center gap-2 bg-white border border-green-200 text-green-800 px-3 py-1.5 rounded-lg text-sm shadow-sm">
                                 <CheckCircle size={14} className="text-green-500" />
                                 {item}
                                 <button type="button" onClick={() => removeItem(item)} className="text-gray-400 hover:text-red-500 ml-1"><X size={14}/></button>
                             </div>
                         ))}
                     </div>
                 </div>
             )}
        </div>
    );
};

const TagsManager: React.FC<{ selected: string[]; onChange: (tags: string[]) => void }> = ({ selected, onChange }) => {
    const toggleTag = (tag: string) => {
        if (selected.includes(tag)) {
            onChange(selected.filter(t => t !== tag));
        } else {
            onChange([...selected, tag]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {COMMON_TAGS.map(tag => {
                const isSelected = selected.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1 ${isSelected ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                        {isSelected && <Check size={12} />}
                        {tag}
                    </button>
                );
            })}
        </div>
    );
};

const ImageManager: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const { error } = await supabase.storage.from('trip-images').upload(fileName, file);
        if (error) throw error;
        
        const { data } = supabase.storage.from('trip-images').getPublicUrl(fileName);
        newImages.push(data.publicUrl);
      }
      if (newImages.length > 0) onChange([...images, ...newImages]);
    } catch (error: any) {
      alert('Erro no upload: ' + (error.message || 'Tente novamente'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading ? <Loader className="animate-spin text-primary-600" /> : <Upload className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-500 mt-2">{uploading ? 'Enviando...' : 'Clique para Upload de Imagens'}</span>
      </label>
      {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group border border-gray-200">
                <img src={img} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))} className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"><Trash2 size={16} /></button>
                </div>
                {idx === 0 && <div className="absolute bottom-0 w-full bg-primary-600 text-white text-[10px] text-center py-1 font-bold">Capa Principal</div>}
                </div>
            ))}
          </div>
      )}
    </div>
  );
};

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, uploadImage } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats } = useData();
  
  // States
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION' | 'SETTINGS'>('STATS');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment States
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PREMIUM' | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  
  // Profile Edit State
  const myAgency = agencies.find(a => a.id === user?.id) as Agency;
  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({});

  // Trip Form State
  const [tripForm, setTripForm] = useState<Partial<Trip>>({
    title: '', 
    destination: '', 
    price: 0, 
    category: 'PRAIA', 
    durationDays: 1, 
    included: [], 
    tags: [],
    paymentMethods: [],
    images: [], 
    itinerary: []
  });

  // Init form with current data
  useEffect(() => {
      if(myAgency) {
          setAgencyForm({
              name: myAgency.name,
              slug: myAgency.slug,
              description: myAgency.description,
              cnpj: myAgency.cnpj,
              phone: myAgency.phone,
              address: myAgency.address,
              bankInfo: myAgency.bankInfo,
              logo: myAgency.logo
          });
          
          // Force Subscription Tab if inactive
          if (myAgency.subscriptionStatus !== 'ACTIVE') {
              setActiveTab('SUBSCRIPTION');
          }
      }
  }, [myAgency]);

  if (!user || user.role !== UserRole.AGENCY || !myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;

  const isActive = myAgency.subscriptionStatus === 'ACTIVE';
  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);

  // Handlers
  const handleOpenCreate = () => {
    setEditingTripId(null);
    setTripForm({ title: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], tags: [], paymentMethods: [], images: [], itinerary: [] });
    setViewMode('FORM');
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripForm({ ...trip, itinerary: trip.itinerary || [], tags: trip.tags || [], paymentMethods: trip.paymentMethods || [] });
    setViewMode('FORM');
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tripData = { ...tripForm, agencyId: user.id } as Trip;
    try {
        if (editingTripId) await updateTrip(tripData);
        else await createTrip({ ...tripData, active: true, startDate: new Date().toISOString(), endDate: new Date().toISOString() } as Trip);
        alert('Salvo com sucesso!');
        setViewMode('LIST');
    } catch (err: any) { 
        alert('Erro ao salvar: ' + (err.message || err)); 
    }
    setIsSubmitting(false);
  };

  const handleAgencyUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await updateUser(agencyForm);
      if(res.success) alert('Dados atualizados!');
      else alert('Erro: ' + res.error);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      const url = await uploadImage(e.target.files[0], 'agency-logos');
      if (url) {
          setAgencyForm(prev => ({ ...prev, logo: url }));
          const res = await updateUser({ logo: url });
          if (!res.success) {
              alert('Erro ao salvar a nova logo: ' + res.error);
          }
      }
  };

  const handleConfirmPayment = async () => {
      if (selectedPlan) {
          await updateAgencySubscription(user.id, 'ACTIVE', selectedPlan);
          alert('Pagamento confirmado! Sua assinatura está ativa.');
          setShowPayment(false);
          setActiveTab('STATS');
      }
  };

  const togglePaymentMethod = (methodId: string) => {
      const current = tripForm.paymentMethods || [];
      if (current.includes(methodId)) {
          setTripForm({ ...tripForm, paymentMethods: current.filter(m => m !== methodId) });
      } else {
          setTripForm({ ...tripForm, paymentMethods: [...current, methodId] });
      }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)} 
        disabled={!isActive && id !== 'SUBSCRIPTION' && id !== 'SETTINGS'}
        className={`
            flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors
            ${activeTab === id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}
            ${(!isActive && id !== 'SUBSCRIPTION' && id !== 'SETTINGS') ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-800'}
        `}
      >
          {Icon && <Icon size={16}/>} {label}
          {(!isActive && id !== 'SUBSCRIPTION' && id !== 'SETTINGS') && <Lock size={12} className="ml-1"/>}
      </button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full">
           <div className="relative group">
              <img src={agencyForm.logo || myAgency.logo} className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover" alt="Logo" />
              <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-primary-700"><Camera size={14}/><input type="file" hidden onChange={handleLogoUpload}/></label>
           </div>
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <div className="flex items-center gap-3 mt-1">
                {isActive ? (
                    <p className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Assinatura Ativa</p>
                ) : (
                    <p className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={12}/> Assinatura Pendente</p>
                )}
             </div>
           </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('SETTINGS')} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50"><Settings size={18} className="mr-2"/> Editar Perfil</button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2">
            <TabButton id="STATS" label="Visão Geral" icon={TrendingUp} />
            <TabButton id="TRIPS" label="Pacotes" icon={ShoppingCart} />
            <TabButton id="SUBSCRIPTION" label="Assinatura" icon={DollarSign} />
            <TabButton id="SETTINGS" label="Configurações" icon={Settings} />
          </div>

          {!isActive && activeTab !== 'SUBSCRIPTION' && activeTab !== 'SETTINGS' && (
             <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                 <Lock size={48} className="text-gray-300 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-gray-900">Funcionalidade Bloqueada</h3>
                 <p className="text-gray-500 mb-6">Você precisa ativar sua assinatura para acessar os recursos do painel.</p>
                 <button onClick={() => setActiveTab('SUBSCRIPTION')} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold">Ir para Assinatura</button>
             </div>
          )}

          {activeTab === 'STATS' && isActive && (
            <div className="space-y-8 animate-[fadeIn_0.3s]">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Faturamento', val: `R$ ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'green' },
                        { label: 'Vendas', val: stats.totalSales, icon: ShoppingCart, color: 'blue' },
                        { label: 'Visualizações', val: stats.totalViews, icon: Eye, color: 'purple' },
                        { label: 'Conversão', val: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'orange' }
                    ].map((m, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-gray-500 text-xs font-bold uppercase">{m.label}</p>
                                    <h3 className="text-2xl font-extrabold text-gray-900 mt-2">{m.val}</h3>
                                </div>
                                <div className={`p-3 bg-${m.color}-50 text-${m.color}-600 rounded-xl`}><m.icon size={20}/></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Visual Chart (CSS Based) */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Desempenho de Vendas (Simulado)</h3>
                    <div className="flex items-end gap-4 h-48">
                        {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                            <div key={i} className="flex-1 bg-primary-100 rounded-t-lg relative group hover:bg-primary-200 transition-colors" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">{h} vendas</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold uppercase">
                        <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'TRIPS' && isActive && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
               <div className="flex justify-between mb-6">
                   <h2 className="text-xl font-bold">Gerenciar Pacotes</h2>
                   <button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors"><Plus size={18} className="mr-2"/> Novo Pacote</button>
               </div>
               <div className="space-y-4">
                   {myTrips.map(trip => (
                       <div key={trip.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                           <img src={trip.images[0]} className="w-16 h-16 rounded-lg object-cover" alt="" />
                           <div className="flex-1">
                               <h3 className="font-bold text-gray-900">{trip.title}</h3>
                               <p className="text-xs text-gray-500">{trip.sales || 0} vendas • {trip.views || 0} views</p>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => handleOpenEdit(trip)} className="p-2 text-gray-500 hover:bg-white hover:shadow rounded"><Edit size={18}/></button>
                               <button onClick={() => deleteTrip(trip.id)} className="p-2 text-red-500 hover:bg-white hover:shadow rounded"><Trash2 size={18}/></button>
                           </div>
                       </div>
                   ))}
                   {myTrips.length === 0 && (
                       <div className="text-center py-10 text-gray-400">
                           Você ainda não cadastrou nenhum pacote.
                       </div>
                   )}
               </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <div className="animate-[fadeIn_0.3s]">
                {!isActive ? (
                    <div className="space-y-8">
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8">
                            <h3 className="font-bold text-amber-800">Sua conta está pendente</h3>
                            <p className="text-sm text-amber-700">Para começar a criar viagens e vender, escolha um plano abaixo e realize o pagamento.</p>
                        </div>
                        
                        <h2 className="text-2xl font-bold text-center mb-8">Escolha o Plano Ideal</h2>
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {PLANS.map(plan => (
                                <div key={plan.id} className={`bg-white p-8 rounded-2xl border-2 transition-all ${selectedPlan === plan.id ? 'border-primary-600 shadow-xl scale-105 z-10' : 'border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                    <p className="text-3xl font-extrabold text-primary-600 mt-2">R$ {plan.price.toFixed(2)}<span className="text-sm text-gray-500 font-normal">/mês</span></p>
                                    <ul className="mt-6 space-y-3 mb-8">
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="flex items-start text-sm text-gray-600">
                                                <CheckCircle size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0"/> {feat}
                                            </li>
                                        ))}
                                    </ul>
                                    <button 
                                        onClick={() => { setSelectedPlan(plan.id as any); setShowPayment(true); }}
                                        className={`w-full py-3 rounded-xl font-bold transition-colors ${selectedPlan === plan.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                    >
                                        Selecionar {plan.name}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Sua Assinatura</h2>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">ATIVA</span>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl mb-6">
                            <p className="text-sm text-gray-500 uppercase font-bold mb-1">Plano Atual</p>
                            <p className="text-xl font-bold text-gray-900">{myAgency.subscriptionPlan === 'PREMIUM' ? 'Plano Premium' : 'Plano Básico'}</p>
                            <p className="text-sm text-gray-500 mt-2">Expira em: {new Date(myAgency.subscriptionExpiresAt).toLocaleDateString()}</p>
                        </div>
                        <p className="text-gray-600">Sua assinatura está em dia e você tem acesso total ao sistema.</p>
                    </div>
                )}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Perfil da Agência</h2>
                <form onSubmit={handleAgencyUpdate} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Agência</label>
                            <input value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>

                         <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Personalizada (Slug)</label>
                            <div className="flex">
                                <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500 text-sm select-none">
                                    viajastore.com/
                                </div>
                                <input 
                                    value={agencyForm.slug || ''} 
                                    onChange={e => setAgencyForm({...agencyForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                                    className="w-full border border-gray-300 rounded-r-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" 
                                    placeholder="minha-agencia"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Este é o endereço público da sua agência. Use apenas letras minúsculas, números e hífens.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                            <textarea rows={3} value={agencyForm.description} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                            <input value={agencyForm.cnpj} onChange={e => setAgencyForm({...agencyForm, cnpj: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                            <input value={agencyForm.phone} onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                    </div>
                    
                    <div className="border-t pt-6">
                        <h3 className="font-bold text-gray-900 mb-4">Endereço</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <input placeholder="CEP" value={agencyForm.address?.zipCode} onChange={e => setAgencyForm({...agencyForm, address: {...agencyForm.address, zipCode: e.target.value} as any})} className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/>
                            <input placeholder="Cidade" value={agencyForm.address?.city} onChange={e => setAgencyForm({...agencyForm, address: {...agencyForm.address, city: e.target.value} as any})} className="col-span-2 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="font-bold text-gray-900 mb-4">Dados Bancários</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="Banco" value={agencyForm.bankInfo?.bank} onChange={e => setAgencyForm({...agencyForm, bankInfo: {...agencyForm.bankInfo, bank: e.target.value} as any})} className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/>
                            <input placeholder="Chave PIX" value={agencyForm.bankInfo?.pixKey} onChange={e => setAgencyForm({...agencyForm, bankInfo: {...agencyForm.bankInfo, pixKey: e.target.value} as any})} className="border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/>
                        </div>
                    </div>

                    <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-primary-700">Salvar Alterações</button>
                </form>
             </div>
          )}
        </>
      ) : (
         // FORM TRIP CREATE / EDIT
         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
             {/* Form Header */}
             <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-20 backdrop-blur-md bg-gray-50/90">
                 <button onClick={() => setViewMode('LIST')} className="flex items-center font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={18} className="mr-2"/> Voltar</button>
                 <div className="flex gap-3">
                     <button onClick={() => setViewMode('LIST')} className="px-4 py-2 text-gray-500 font-bold hover:text-red-500">Cancelar</button>
                     <button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {isSubmitting ? <Loader className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>} Salvar
                     </button>
                 </div>
             </div>

             {/* Form Body */}
             <div className="p-8 space-y-10 max-w-4xl mx-auto">
                 {/* Basic Info */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações Básicas</h3>
                     <div className="space-y-4">
                        <div>
                            <label className="font-bold block mb-1 text-sm text-gray-700">Título da Viagem</label>
                            <input value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none transition-shadow" placeholder="Ex: Expedição Jalapão 4x4" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="font-bold block mb-1 text-sm text-gray-700">Preço (R$)</label>
                                <input type="number" value={tripForm.price} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 text-sm text-gray-700">Duração (dias)</label>
                                <input type="number" value={tripForm.durationDays} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 text-sm text-gray-700">Categoria Principal</label>
                                <select 
                                    value={tripForm.category} 
                                    onChange={(e) => setTripForm({...tripForm, category: e.target.value as TripCategory})}
                                    className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="PRAIA">Praia</option>
                                    <option value="AVENTURA">Aventura</option>
                                    <option value="FAMILIA">Família</option>
                                    <option value="ROMANTICO">Romântico</option>
                                    <option value="URBANO">Urbano</option>
                                    <option value="NATUREZA">Natureza</option>
                                    <option value="CULTURA">Cultura</option>
                                    <option value="GASTRONOMICO">Gastronômico</option>
                                    <option value="VIDA_NOTURNA">Vida Noturna</option>
                                    <option value="VIAGEM_BARATA">Econômica</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="font-bold block mb-1 text-sm text-gray-700">Destino (Cidade/Estado)</label>
                            <input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: Bonito, MS" />
                        </div>
                     </div>
                 </section>

                 {/* Payment Methods */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><DollarSign size={20} /> Formas de Pagamento Aceitas</h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {PAYMENT_OPTIONS.map(opt => (
                             <label key={opt.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${tripForm.paymentMethods?.includes(opt.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-gray-200'}`}>
                                 <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mr-3"
                                    checked={tripForm.paymentMethods?.includes(opt.id) || false}
                                    onChange={() => togglePaymentMethod(opt.id)}
                                 />
                                 <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                             </label>
                         ))}
                     </div>
                 </section>

                 {/* Tags */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><Tag size={20} /> Tags e Estilo</h3>
                     <TagsManager selected={tripForm.tags || []} onChange={tags => setTripForm({...tripForm, tags})} />
                 </section>

                 {/* Description */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Descrição Detalhada</h3>
                     <RichTextEditor value={tripForm.description || ''} onChange={v => setTripForm({...tripForm, description: v})} />
                 </section>

                 {/* Included Items */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2"><CheckCircle size={20} /> O que está incluso?</h3>
                     <IncludedItemsManager items={tripForm.included || []} onChange={included => setTripForm({...tripForm, included})} />
                 </section>

                 {/* Images */}
                 <section>
                     <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Galeria de Fotos</h3>
                     <p className="text-sm text-gray-500 mb-3">Adicione até 4 fotos de alta qualidade. A primeira será a capa.</p>
                     <ImageManager images={tripForm.images || []} onChange={imgs => setTripForm({...tripForm, images: imgs})} />
                 </section>

                 {/* Bottom Actions */}
                 <div className="flex justify-end pt-6 border-t gap-4">
                     <button onClick={() => setViewMode('LIST')} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                     <button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center">
                        {isSubmitting ? <Loader className="animate-spin mr-2"/> : <Save size={20} className="mr-2"/>} Salvar Viagem
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* Modal Pagamento PIX */}
      {showPayment && selectedPlan && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowPayment(false)}>
             <div className="bg-white rounded-2xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
                 <h3 className="text-2xl font-bold mb-4 text-center">Pagamento via PIX</h3>
                 <p className="text-center text-gray-600 mb-6">Escaneie o QR Code abaixo para ativar o plano <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong>.</p>
                 
                 <div className="bg-gray-100 p-6 rounded-xl flex justify-center mb-6">
                     <QrCode size={160} />
                 </div>
                 
                 <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-6 border border-gray-200">
                     <span className="text-xs text-gray-500 truncate w-48">00020126580014br.gov.bcb.pix0136...</span>
                     <button className="text-primary-600 text-xs font-bold flex items-center"><Copy size={12} className="mr-1"/> Copiar</button>
                 </div>

                 <button 
                    onClick={handleConfirmPayment} 
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 mb-3 shadow-lg shadow-green-500/20"
                 >
                    Já realizei o pagamento
                 </button>
                 <button onClick={() => setShowPayment(false)} className="w-full text-gray-500 font-medium py-2">Cancelar</button>
             </div>
         </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
