import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, TripCategory, TravelerType } from '../types';
import { 
  LayoutDashboard, Map, Calendar, Settings, Plus, Image as ImageIcon, 
  Trash2, Edit, Save, X, DollarSign, Users, MapPin, 
  CheckCircle, AlertCircle, Clock, ChevronRight, Upload, 
  Search, ExternalLink, BarChart, Smartphone, Globe, Loader, Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { slugify } from '../utils/slugify';

const INITIAL_TRIP: Partial<Trip> = {
  title: '',
  description: '',
  destination: '',
  price: 0,
  durationDays: 1,
  images: [],
  category: 'PRAIA',
  tags: [],
  travelerTypes: [],
  included: ['Hospedagem', 'Guia'],
  notIncluded: [],
  featuredInHero: false,
  active: true,
  paymentMethods: ['Pix', 'Cartão de Crédito']
};

const CATEGORIES: TripCategory[] = [
  'PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 
  'NATUREZA', 'CULTURA', 'GASTRONOMICO', 'VIDA_NOTURNA', 
  'VIAGEM_BARATA', 'ARTE'
];

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, uploadImage } = useAuth();
  const { 
      getAgencyTrips, bookings, createTrip, updateTrip, deleteTrip, 
      getAgencyStats, refreshData 
  } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'BOOKINGS' | 'SETTINGS'>('OVERVIEW');
  
  // Trip Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [tripForm, setTripForm] = useState<Partial<Trip>>(INITIAL_TRIP);
  const [saving, setSaving] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Agency Settings State
  const [agencyForm, setAgencyForm] = useState<any>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (user?.role === UserRole.AGENCY) {
        setAgencyForm({
            name: user.name,
            description: (user as any).description || '',
            slug: (user as any).slug || '',
            phone: (user as any).phone || '',
            whatsapp: (user as any).whatsapp || '',
            website: (user as any).website || '',
            heroMode: (user as any).heroMode || 'TRIPS',
            heroTitle: (user as any).heroTitle || '',
            heroSubtitle: (user as any).heroSubtitle || '',
            heroBannerUrl: (user as any).heroBannerUrl || ''
        });
    }
  }, [user]);

  if (!user || user.role !== UserRole.AGENCY) {
      return <div className="p-8 text-center">Acesso restrito a agências.</div>;
  }

  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);
  
  // Filter bookings for this agency
  const myBookings = bookings.filter(b => myTrips.some(t => t.id === b.tripId));

  const handleEditTrip = (trip: Trip) => {
      setTripForm({
          ...trip,
          startDate: trip.startDate ? trip.startDate.split('T')[0] : '',
          endDate: trip.endDate ? trip.endDate.split('T')[0] : '',
      });
      setIsEditing(true);
  };

  const handleCreateTrip = () => {
      setTripForm({
          ...INITIAL_TRIP,
          agencyId: user.id
      });
      setIsEditing(true);
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
          // Format dates to ISO
          const finalTrip = {
             ...tripForm,
             startDate: tripForm.startDate ? new Date(tripForm.startDate).toISOString() : new Date().toISOString(),
             endDate: tripForm.endDate ? new Date(tripForm.endDate).toISOString() : new Date().toISOString(),
             slug: slugify(tripForm.title || '')
          } as Trip;

          if (finalTrip.id) {
              await updateTrip(finalTrip);
              showToast('Viagem atualizada com sucesso!', 'success');
          } else {
              await createTrip({ ...finalTrip, id: `t_${Date.now()}` }); // Mock ID gen if undefined
              showToast('Viagem criada com sucesso!', 'success');
          }
          setIsEditing(false);
      } catch (error) {
          showToast('Erro ao salvar viagem.', 'error');
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteTrip = async (id: string) => {
      if (window.confirm('Tem certeza que deseja excluir esta viagem?')) {
          await deleteTrip(id);
          showToast('Viagem excluída.', 'info');
      }
  };

  const addImage = () => {
      if (!imageUrlInput) return;
      setTripForm(prev => ({ ...prev, images: [...(prev.images || []), imageUrlInput] }));
      setImageUrlInput('');
  };

  const removeImage = (index: number) => {
      setTripForm(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== index) }));
  };

  const handleSaveAgencySettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      const res = await updateUser(agencyForm);
      if (res.success) showToast('Configurações salvas!', 'success');
      else showToast('Erro ao salvar configurações.', 'error');
      setSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const setter = type === 'logo' ? setUploadingLogo : setUploadingBanner;
      setter(true);
      
      const url = await uploadImage(e.target.files[0], type === 'logo' ? 'agency-logos' : 'trip-images');
      
      if (url) {
          if (type === 'logo') {
              setAgencyForm((prev: any) => ({ ...prev, logo: url }));
              // Auto save logo update
              await updateUser({ logo: url });
          } else {
              setAgencyForm((prev: any) => ({ ...prev, heroBannerUrl: url }));
          }
          showToast('Imagem enviada com sucesso!', 'success');
      } else {
          showToast('Erro no upload.', 'error');
      }
      setter(false);
  };

  if (isEditing) {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <button onClick={() => setIsEditing(false)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                  <X className="mr-2" size={20}/> Cancelar Edição
              </button>
              
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-gray-900">{tripForm.id ? 'Editar Viagem' : 'Nova Viagem'}</h2>
                      <button onClick={handleSaveTrip} disabled={saving} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50">
                          {saving ? <Loader className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                      </button>
                  </div>
                  
                  <div className="p-8 space-y-8">
                      {/* Basic Info */}
                      <section className="space-y-4">
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Informações Básicas</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Título da Viagem</label>
                                  <input 
                                    value={tripForm.title} 
                                    onChange={e => setTripForm({...tripForm, title: e.target.value})}
                                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Ex: Fim de semana em Paraty"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Destino</label>
                                  <div className="relative">
                                      <MapPin className="absolute left-3 top-3 text-gray-400" size={18}/>
                                      <input 
                                        value={tripForm.destination} 
                                        onChange={e => setTripForm({...tripForm, destination: e.target.value})}
                                        className="w-full border border-gray-200 rounded-xl pl-10 p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Cidade, Estado"
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Preço por Pessoa (R$)</label>
                                  <div className="relative">
                                      <DollarSign className="absolute left-3 top-3 text-gray-400" size={18}/>
                                      <input 
                                        type="number"
                                        value={tripForm.price} 
                                        onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})}
                                        className="w-full border border-gray-200 rounded-xl pl-10 p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                      />
                                  </div>
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Completa</label>
                              <textarea 
                                rows={4}
                                value={tripForm.description} 
                                onChange={e => setTripForm({...tripForm, description: e.target.value})}
                                className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                placeholder="Descreva os detalhes da experiência..."
                              />
                          </div>
                      </section>
                      
                      {/* Dates Logic (Restored from snippet) */}
                      <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="text-primary-600" size={20}/> Datas da Viagem
                            </h3>
                            {tripForm.startDate && tripForm.endDate && (
                                <div className="flex items-center gap-2 text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                                    <Clock size={14}/>
                                    {Math.max(0, Math.ceil((new Date(tripForm.endDate).getTime() - new Date(tripForm.startDate).getTime()) / (1000 * 60 * 60 * 24)))} dias
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Início</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors"/>
                                    </div>
                                    <input 
                                        type="date" 
                                        value={tripForm.startDate || ''} 
                                        onChange={e => {
                                            const newStart = e.target.value;
                                            setTripForm(prev => {
                                                const start = new Date(newStart);
                                                const end = new Date(prev.endDate || '');
                                                let newDuration = prev.durationDays || 1;
                                                if (prev.endDate && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                                    const diffTime = end.getTime() - start.getTime();
                                                    newDuration = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); 
                                                }
                                                return {...prev, startDate: newStart, durationDays: newDuration};
                                            });
                                        }} 
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 hover:bg-white text-gray-900 font-bold cursor-pointer shadow-sm" 
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Fim</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors"/>
                                    </div>
                                    <input 
                                        type="date" 
                                        value={tripForm.endDate || ''} 
                                        onChange={e => {
                                            const newEnd = e.target.value;
                                            setTripForm(prev => {
                                                const start = new Date(prev.startDate || '');
                                                const end = new Date(newEnd);
                                                let newDuration = prev.durationDays || 1;
                                                if (prev.startDate && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                                    const diffTime = end.getTime() - start.getTime();
                                                    newDuration = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))); 
                                                }
                                                return {...prev, endDate: newEnd, durationDays: newDuration};
                                            });
                                        }} 
                                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50 hover:bg-white text-gray-900 font-bold cursor-pointer shadow-sm" 
                                    />
                                </div>
                            </div>
                        </div>
                     </section>

                     {/* Categories & Tags */}
                     <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Categorização</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Categoria Principal</label>
                                <select 
                                    value={tripForm.category}
                                    onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})}
                                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tags (separadas por vírgula)</label>
                                <input 
                                    value={tripForm.tags?.join(', ')}
                                    onChange={e => setTripForm({...tripForm, tags: e.target.value.split(',').map(t => t.trim())})}
                                    className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Ex: Trilha, Cachoeira, Histórico"
                                />
                            </div>
                        </div>
                     </section>

                     {/* Images */}
                     <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Imagens</h3>
                        <div className="flex gap-2">
                             <input 
                                value={imageUrlInput}
                                onChange={e => setImageUrlInput(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Cole a URL da imagem aqui..."
                             />
                             <button type="button" onClick={addImage} className="bg-gray-100 text-gray-700 font-bold px-4 rounded-xl hover:bg-gray-200">
                                 Adicionar
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {tripForm.images?.map((img, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                     </section>
                     
                     <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-primary-200 transition-colors">
                            <input 
                                type="checkbox"
                                checked={tripForm.active}
                                onChange={e => setTripForm({...tripForm, active: e.target.checked})}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="font-bold text-sm text-gray-700">Viagem Ativa</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 hover:bg-white hover:border-primary-200 transition-colors">
                            <input 
                                type="checkbox"
                                checked={tripForm.featuredInHero}
                                onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <span className="font-bold text-sm text-gray-700">Destacar no Banner (Hero)</span>
                        </label>
                     </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <LayoutDashboard className="text-primary-600"/> Painel da Agência
              </h1>
              <p className="text-gray-500">Gerencie suas viagens, reservas e perfil.</p>
          </div>
          
          <div className="flex gap-2">
              <Link to={`/${(user as any).slug}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">
                  <ExternalLink size={18}/> Ver Meu Site
              </Link>
              <button onClick={handleCreateTrip} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                  <Plus size={18}/> Nova Viagem
              </button>
          </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <aside className="lg:w-64 flex-shrink-0 space-y-2">
              {[
                  { id: 'OVERVIEW', label: 'Visão Geral', icon: BarChart },
                  { id: 'TRIPS', label: 'Minhas Viagens', icon: Map },
                  { id: 'BOOKINGS', label: 'Reservas', icon: Users },
                  { id: 'SETTINGS', label: 'Configurações', icon: Settings },
              ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-md border border-primary-100' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                  >
                      <div className="flex items-center gap-3">
                          <tab.icon size={18} className={activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}/>
                          {tab.label}
                      </div>
                      {activeTab === tab.id && <ChevronRight size={16}/>}
                  </button>
              ))}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
              {activeTab === 'OVERVIEW' && (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <p className="text-sm font-bold text-gray-400 uppercase">Vendas Totais</p>
                              <p className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalSales}</p>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <p className="text-sm font-bold text-gray-400 uppercase">Receita Gerada</p>
                              <p className="text-3xl font-extrabold text-green-600 mt-2">R$ {stats.totalRevenue.toLocaleString()}</p>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <p className="text-sm font-bold text-gray-400 uppercase">Visualizações</p>
                              <p className="text-3xl font-extrabold text-blue-600 mt-2">{stats.totalViews}</p>
                          </div>
                      </div>

                      {/* Recent Bookings */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-900">Últimas Reservas</div>
                          {myBookings.length > 0 ? (
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-50 text-gray-500">
                                      <tr>
                                          <th className="px-6 py-3 font-bold">Cliente</th>
                                          <th className="px-6 py-3 font-bold">Viagem</th>
                                          <th className="px-6 py-3 font-bold">Valor</th>
                                          <th className="px-6 py-3 font-bold">Data</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {myBookings.slice(0, 5).map(booking => (
                                          <tr key={booking.id} className="hover:bg-gray-50">
                                              <td className="px-6 py-4 font-bold text-gray-900">{booking.clientId.substring(0,8)}...</td>
                                              <td className="px-6 py-4 truncate max-w-[150px]">{myTrips.find(t => t.id === booking.tripId)?.title}</td>
                                              <td className="px-6 py-4 text-green-600 font-bold">R$ {booking.totalPrice}</td>
                                              <td className="px-6 py-4 text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : (
                              <div className="p-8 text-center text-gray-500">Nenhuma reserva recente.</div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'TRIPS' && (
                  <div className="animate-[fadeIn_0.3s]">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          {myTrips.length > 0 ? (
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-50 text-gray-500">
                                      <tr>
                                          <th className="px-6 py-3 font-bold">Título</th>
                                          <th className="px-6 py-3 font-bold">Preço</th>
                                          <th className="px-6 py-3 font-bold">Status</th>
                                          <th className="px-6 py-3 font-bold text-right">Ações</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {myTrips.map(trip => (
                                          <tr key={trip.id} className="hover:bg-gray-50">
                                              <td className="px-6 py-4 font-bold text-gray-900">{trip.title}</td>
                                              <td className="px-6 py-4 text-gray-600">R$ {trip.price}</td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                      {trip.active ? 'Ativo' : 'Inativo'}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                  <div className="flex justify-end gap-2">
                                                      <button onClick={() => handleEditTrip(trip)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                                      <button onClick={() => handleDeleteTrip(trip.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          ) : (
                              <div className="p-12 text-center">
                                  <p className="text-gray-500 mb-4">Você ainda não criou nenhuma viagem.</p>
                                  <button onClick={handleCreateTrip} className="text-primary-600 font-bold hover:underline">Criar primeira viagem</button>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'SETTINGS' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Settings className="text-gray-400"/> Configurações da Agência</h2>
                      
                      <form onSubmit={handleSaveAgencySettings} className="space-y-8">
                          {/* Perfil */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2 flex items-center gap-4">
                                   <div className="relative w-20 h-20 group">
                                       <img src={(user as any).logo || agencyForm.logo} className="w-20 h-20 rounded-full object-cover border-2 border-gray-100" />
                                       <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                           {uploadingLogo ? <Loader className="animate-spin" size={20}/> : <Upload size={20}/>}
                                           <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} disabled={uploadingLogo}/>
                                       </label>
                                   </div>
                                   <div>
                                       <h3 className="font-bold text-gray-900">Logo da Agência</h3>
                                       <p className="text-xs text-gray-500">Recomendado: 400x400px</p>
                                   </div>
                              </div>
                              
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label>
                                  <input value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500" />
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
                                  <div className="relative">
                                      <LinkIcon className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      <input value={agencyForm.slug} onChange={e => setAgencyForm({...agencyForm, slug: slugify(e.target.value)})} className="w-full border border-gray-200 rounded-lg pl-9 p-3 outline-none focus:ring-2 focus:ring-primary-500" />
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">viagestore.com/{agencyForm.slug}</p>
                              </div>

                              <div className="md:col-span-2">
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                                  <textarea rows={3} value={agencyForm.description} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-500" />
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                                  <div className="relative">
                                      <Smartphone className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      <input value={agencyForm.whatsapp} onChange={e => setAgencyForm({...agencyForm, whatsapp: e.target.value})} className="w-full border border-gray-200 rounded-lg pl-9 p-3 outline-none focus:ring-2 focus:ring-primary-500" placeholder="5511999999999"/>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                                  <div className="relative">
                                      <Globe className="absolute left-3 top-3 text-gray-400" size={16}/>
                                      <input value={agencyForm.website} onChange={e => setAgencyForm({...agencyForm, website: e.target.value})} className="w-full border border-gray-200 rounded-lg pl-9 p-3 outline-none focus:ring-2 focus:ring-primary-500" placeholder="www.suaagencia.com.br"/>
                                  </div>
                              </div>
                          </div>
                          
                          {/* Microsite Customization */}
                          <div className="border-t border-gray-100 pt-6">
                              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><ImageIcon size={18} className="text-primary-600"/> Personalização do Site (Hero)</h3>
                              
                              <div className="bg-gray-50 p-6 rounded-xl space-y-4 border border-gray-200">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-2">Modo do Banner</label>
                                      <div className="flex gap-4">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                              <input type="radio" checked={agencyForm.heroMode === 'TRIPS'} onChange={() => setAgencyForm({...agencyForm, heroMode: 'TRIPS'})} className="text-primary-600 focus:ring-primary-500"/>
                                              <span className="text-sm">Carrossel de Viagens</span>
                                          </label>
                                          <label className="flex items-center gap-2 cursor-pointer">
                                              <input type="radio" checked={agencyForm.heroMode === 'STATIC'} onChange={() => setAgencyForm({...agencyForm, heroMode: 'STATIC'})} className="text-primary-600 focus:ring-primary-500"/>
                                              <span className="text-sm">Banner Estático</span>
                                          </label>
                                      </div>
                                  </div>

                                  {agencyForm.heroMode === 'STATIC' && (
                                      <div className="space-y-4 animate-[fadeIn_0.3s]">
                                          <div>
                                              <label className="block text-sm font-bold text-gray-700 mb-1">Título do Banner</label>
                                              <input value={agencyForm.heroTitle} onChange={e => setAgencyForm({...agencyForm, heroTitle: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3" />
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo</label>
                                              <input value={agencyForm.heroSubtitle} onChange={e => setAgencyForm({...agencyForm, heroSubtitle: e.target.value})} className="w-full border border-gray-200 rounded-lg p-3" />
                                          </div>
                                          <div>
                                              <label className="block text-sm font-bold text-gray-700 mb-1">Imagem de Fundo (Banner)</label>
                                              <div className="flex gap-2 items-center">
                                                  <input type="file" onChange={e => handleFileUpload(e, 'banner')} disabled={uploadingBanner} className="text-sm text-gray-500"/>
                                                  {uploadingBanner && <Loader className="animate-spin text-primary-600" size={16}/>}
                                              </div>
                                              {agencyForm.heroBannerUrl && <img src={agencyForm.heroBannerUrl} className="mt-2 h-32 w-full object-cover rounded-lg border border-gray-200" />}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>

                          <button type="submit" disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:opacity-50">
                              {saving ? <Loader className="animate-spin" size={20}/> : <Save size={20}/>} Salvar Alterações
                          </button>
                      </form>
                  </div>
              )}
          </main>
      </div>
    </div>
  );
};

export default AgencyDashboard;