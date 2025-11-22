import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory } from '../types';
import { PLANS } from '../services/mockData';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search } from 'lucide-react';

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
       // Only update if fundamentally different to avoid cursor jumps
       if (value === '' || contentRef.current.innerText.trim() === '') {
           contentRef.current.innerHTML = value;
       }
    }
  }, [value]);

  const handleInput = () => {
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  const addLink = () => {
      const url = prompt('Digite a URL:');
      if(url) execCmd('createLink', url);
  };

  const Button = ({ cmd, icon: Icon, title, arg }: { cmd?: string, icon: any, title: string, arg?: string }) => (
    <button 
        type="button" 
        onClick={() => cmd && execCmd(cmd, arg)} 
        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-all" 
        title={title}
    >
        <Icon size={16}/>
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow bg-white shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
        <Button cmd="bold" icon={Bold} title="Negrito" />
        <Button cmd="italic" icon={Italic} title="Itálico" />
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <Button cmd="formatBlock" arg="h3" icon={Heading1} title="Título 1" />
        <Button cmd="formatBlock" arg="h4" icon={Heading2} title="Título 2" />
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <Button cmd="insertUnorderedList" icon={List} title="Lista com marcadores" />
        <Button cmd="insertOrderedList" icon={ListOrdered} title="Lista numerada" />
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <button type="button" onClick={addLink} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Inserir Link"><LinkIcon size={16}/></button>
      </div>
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        className="w-full p-5 min-h-[300px] outline-none text-gray-800 prose prose-sm max-w-none [&>h3]:font-bold [&>h3]:text-xl [&>h4]:font-bold [&>h4]:text-lg [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};


const ImageManager: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const { uploadImage } = useAuth();
  const { showToast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadImage(file, 'trip-images');
        if (publicUrl) {
            newImages.push(publicUrl);
        } else {
            throw new Error('Upload falhou para um dos arquivos.');
        }
      }
      if (newImages.length > 0) onChange([...images, ...newImages]);
      showToast(`${newImages.length} imagem(ns) enviada(s) com sucesso!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro no upload.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading ? <Loader className="animate-spin text-primary-600" /> : <Upload className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-500 mt-2">{uploading ? 'Enviando...' : 'Clique ou arraste para enviar fotos'}</span>
            <span className="text-xs text-gray-400 mt-1">Primeira imagem será a capa</span>
      </label>
      {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm">
                  <img src={img} className="w-full h-full object-cover" alt={`Imagem ${idx+1}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))} className="bg-red-600 text-white p-2 rounded-full transform scale-75 group-hover:scale-100 transition-transform"><Trash2 size={16} /></button>
                  </div>
                  {idx === 0 && <div className="absolute bottom-0 w-full bg-primary-600 text-white text-[10px] text-center py-1 font-bold">Capa</div>}
                </div>
            ))}
          </div>
      )}
    </div>
  );
};

const LogoUpload: React.FC<{ currentLogo?: string; onUpload: (url: string) => void }> = ({ currentLogo, onUpload }) => {
    const { uploadImage } = useAuth();
    const [uploading, setUploading] = useState(false);
    const { showToast } = useToast();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const url = await uploadImage(e.target.files[0], 'agency-logos'); 
            if (url) {
                onUpload(url);
                showToast('Logo enviada com sucesso!', 'success');
            } else {
                showToast('Erro ao enviar logo.', 'error');
            }
        } catch (e) {
            showToast('Erro ao enviar logo.', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full border-2 border-gray-200 bg-gray-50 overflow-hidden relative group shrink-0">
                <img src={currentLogo || `https://ui-avatars.com/api/?name=Logo&background=random`} alt="Logo" className="w-full h-full object-cover" />
                {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader className="animate-spin text-primary-600"/></div>}
            </div>
            <div>
                <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-gray-50 inline-flex items-center gap-2 transition-colors text-sm">
                    <Upload size={16}/> Alterar Logomarca
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG ou WEBP. Max 2MB.</p>
                <button type="button" onClick={() => onUpload('')} className="text-xs text-red-500 hover:underline mt-1">Remover logo</button>
            </div>
        </div>
    );
};

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, uploadImage } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats } = useData();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS'>('OVERVIEW');
  const [settingsSection, setSettingsSection] = useState<'PROFILE' | 'PAGE'>('PROFILE');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PREMIUM' | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const myAgency = agencies.find(a => a.id === user?.id) as Agency;
  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({});

  const [tripForm, setTripForm] = useState<Partial<Trip>>({
    title: '', slug: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], tags: [], paymentMethods: [], images: [], itinerary: [], featuredInHero: false, description: ''
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
      if(myAgency) {
          setAgencyForm({ 
              ...myAgency, 
              heroMode: myAgency.heroMode || 'TRIPS' 
          });
          if (myAgency.subscriptionStatus !== 'ACTIVE') setActiveTab('SUBSCRIPTION');
      }
  }, [myAgency]);

  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;

  // Render a loading skeleton or null if agency data is not yet available, preserving component state on re-renders.
  if (!myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-primary-600" /></div>;

  const isActive = myAgency.subscriptionStatus === 'ACTIVE';
  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);
  
  const rawSlug = agencyForm.slug || myAgency.slug || '';
  const cleanSlug = rawSlug.replace(/[^a-z0-9-]/gi, '');
  const fullAgencyLink = cleanSlug ? `${window.location.origin}/#/${cleanSlug}` : '';

  const handleOpenCreate = () => {
    setEditingTripId(null);
    setTripForm({ title: '', slug: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], tags: [], paymentMethods: [], images: [], itinerary: [], featuredInHero: false, description: '' });
    setSlugTouched(false);
    setViewMode('FORM');
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripForm({ ...trip, itinerary: trip.itinerary || [], tags: trip.tags || [], paymentMethods: trip.paymentMethods || [], featuredInHero: trip.featuredInHero || false, description: trip.description || '' });
    setSlugTouched(true); 
    setViewMode('FORM');
  };
  
  const handleDuplicateTrip = async (trip: Trip) => {
      if(!window.confirm(`Deseja duplicar "${trip.title}"?`)) return;
      const { id, ...rest } = trip;
      const duplicatedTrip = {
          ...rest,
          title: `${trip.title} (Cópia)`,
          slug: `${slugify(trip.title)}-copia-${Date.now()}`, 
          active: false, views: 0, sales: 0, featuredInHero: false
      };
      
      try {
          await createTrip(duplicatedTrip as Trip);
          showToast('Pacote duplicado como Rascunho.', 'success');
      } catch (err) {
          showToast('Erro ao duplicar pacote.', 'error');
      }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTripForm(prev => ({ ...prev, title: newTitle, ...(!slugTouched && { slug: slugify(newTitle) }) }));
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tripData = { ...tripForm, agencyId: user.id } as Trip;
    try {
        if (editingTripId) {
            await updateTrip(tripData);
            showToast('Viagem atualizada!', 'success');
        } else {
            await createTrip({ ...tripData, active: true, startDate: new Date().toISOString(), endDate: new Date().toISOString() } as Trip);
            showToast('Viagem criada!', 'success');
        }
        setViewMode('LIST');
    } catch (err: any) { 
        showToast('Erro ao salvar: ' + (err.message || err), 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
      if (window.confirm('Tem certeza que deseja excluir este pacote?')) {
          try {
              await deleteTrip(tripId);
              showToast('Pacote excluído.', 'success');
          } catch (err: any) {
              showToast('Erro ao excluir.', 'error');
          }
      }
  };

  const handleAgencyUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await updateUser(agencyForm);
      if(res.success) showToast('Configurações salvas!', 'success');
      else showToast('Erro: ' + res.error, 'error');
  };
  
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     setUploadingBanner(true);
     try {
        const url = await uploadImage(e.target.files[0], 'trip-images');
        if (url) {
            setAgencyForm({ ...agencyForm, heroBannerUrl: url });
            showToast('Banner enviado!', 'success');
        }
     } catch(e) {
         showToast('Erro no upload do banner', 'error');
     } finally {
         setUploadingBanner(false);
     }
  };

  const handleConfirmPayment = async () => {
      if (selectedPlan) {
          await updateAgencySubscription(user.id, 'ACTIVE', selectedPlan);
          showToast('Assinatura ativada!', 'success');
          setShowPayment(false);
          setActiveTab('OVERVIEW');
      }
  };

  const handleSlugChange = (val: string) => {
     const sanitized = slugify(val);
     setAgencyForm({...agencyForm, slug: sanitized});
  };

  const NavButton: React.FC<{tabId: any, children: React.ReactNode}> = ({ tabId, children }) => (
    <button onClick={() => setActiveTab(tabId)} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tabId ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{children}</button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full">
           <img src={agencyForm.logo || myAgency.logo} className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover bg-white" alt="Logo" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <div className="flex items-center gap-3 mt-1">
                {isActive ? <p className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Ativo</p> : <p className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={12}/> Pendente</p>}
                {cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-primary-100 hover:underline"><Eye size={12}/> Ver Página Pública</a>)}
             </div>
           </div>
        </div>
        <button onClick={() => { setActiveTab('SETTINGS'); setSettingsSection('PROFILE'); }} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-all"><Settings size={18} className="mr-2"/> Configurações</button>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide">
            <NavButton tabId="OVERVIEW">Visão Geral</NavButton>
            <NavButton tabId="TRIPS">Pacotes</NavButton>
            <NavButton tabId="SUBSCRIPTION">Assinatura</NavButton>
            <NavButton tabId="SETTINGS">Configurações</NavButton>
          </div>
          
          <div className="animate-[fadeIn_0.3s]">
          {activeTab === 'OVERVIEW' && isActive && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><BarChart2 size={12} className="mr-1.5"/> Pacotes Ativos</p><h3 className="text-3xl font-extrabold text-gray-900 mt-2">{myTrips.filter(t => t.active).length}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><Users size={12} className="mr-1.5"/> Total Vendas</p><h3 className="text-3xl font-extrabold text-primary-600 mt-2">{stats.totalSales}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><Eye size={12} className="mr-1.5"/> Visualizações</p><h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalViews.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><DollarSign size={12} className="mr-1.5"/> Receita Total</p><h3 className="text-3xl font-extrabold text-green-600 mt-2">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                </div>
            </div>
          )}

          {activeTab === 'TRIPS' && isActive && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Meus Pacotes</h2><button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors"><Plus size={18} className="mr-2"/> Novo Pacote</button></div>
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-100">
                     <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Preço</th><th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th></tr></thead>
                     <tbody className="divide-y divide-gray-100">
                        {myTrips.map(trip => (<tr key={trip.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={trip.images[0]} className="w-12 h-12 rounded-lg object-cover" alt={trip.title} /><span className="font-bold text-gray-900 text-sm">{trip.title}</span></div></td>
                            <td className="px-4 py-3"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{trip.active ? 'ATIVO' : 'RASCUNHO'}</span></td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-700">R$ {trip.price}</td>
                            <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                                <a href={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100" title="Visualizar"><Eye size={16}/></a>
                                <button onClick={() => handleDuplicateTrip(trip)} className="p-2 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100" title="Duplicar"><Copy size={16}/></button>
                                <button onClick={() => handleOpenEdit(trip)} className="p-2 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100" title="Editar"><Edit size={16}/></button>
                                <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100" title="Excluir"><Trash2 size={16}/></button>
                            </div></td>
                        </tr>))}
                     </tbody>
                 </table>
                 {myTrips.length === 0 && <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-gray-500">Você ainda não tem pacotes.</p></div>}
               </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {PLANS.map(plan => (<div key={plan.id} className="bg-white p-8 rounded-2xl border hover:border-primary-600 transition-all shadow-sm hover:shadow-xl">
                    <h3 className="text-xl font-bold">{plan.name}</h3><p className="text-3xl font-bold text-primary-600 mt-2">R$ {plan.price.toFixed(2)}</p>
                    <ul className="mt-6 space-y-3 text-gray-600 text-sm mb-8">{plan.features.map((f, i) => <li key={i} className="flex gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5"/> {f}</li>)}</ul>
                    <button onClick={() => { setSelectedPlan(plan.id as any); setShowPayment(true); }} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">Selecionar Plano</button>
                </div>))}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
                <div className="w-full md:w-64 bg-gray-50 p-6 border-r border-gray-100 rounded-l-2xl"><h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Menu</h3><nav className="space-y-2">
                    <button onClick={() => setSettingsSection('PROFILE')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${settingsSection === 'PROFILE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Perfil & Contato</button>
                    <button onClick={() => setSettingsSection('PAGE')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${settingsSection === 'PAGE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Página Pública (Hero)</button>
                </nav></div>
                <div className="flex-1 p-8"><form onSubmit={handleAgencyUpdate} className="space-y-8 max-w-2xl">
                    {settingsSection === 'PROFILE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><h2 className="text-xl font-bold text-gray-900 pb-2 border-b border-gray-100">Identidade & Contato</h2><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Logomarca</label><LogoUpload currentLogo={agencyForm.logo} onUpload={(url) => setAgencyForm({...agencyForm, logo: url})} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1">Nome da Agência</label><input value={agencyForm.name || ''} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" /></div><div><label className="block text-xs font-bold mb-1">WhatsApp (Apenas números)</label><div className="relative"><Smartphone className="absolute left-3 top-3 text-gray-400" size={18} /><input value={agencyForm.whatsapp || ''} onChange={e => setAgencyForm({...agencyForm, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full border rounded-lg p-3 pl-10 outline-none focus:border-primary-500" placeholder="5511999999999"/></div></div></div><div><label className="block text-xs font-bold mb-1">Descrição</label><textarea rows={3} value={agencyForm.description || ''} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" placeholder="Sobre a agência..." /></div><div><label className="block text-xs font-bold mb-1">Slug (Endereço Personalizado)</label><div className="relative"><input value={agencyForm.slug || ''} onChange={e => handleSlugChange(e.target.value)} className="w-full border rounded-lg p-3 bg-gray-50 font-mono text-sm text-primary-700 font-medium pl-48" /><span className="absolute left-3 top-3 text-gray-500 text-sm select-none">{`${window.location.host}/#/`}</span></div>{cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-2 font-medium"><ExternalLink size={10} /> {fullAgencyLink}</a>)}</div></section>)}
                    {settingsSection === 'PAGE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><h2 className="text-xl font-bold text-gray-900 pb-2 border-b border-gray-100">Configuração do Hero (Banner)</h2><p className="text-sm text-gray-500">Escolha como o topo do seu site será exibido para os visitantes.</p><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Modo de Exibição</label><div className="flex gap-4"><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'TRIPS' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'TRIPS' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Layout size={16}/> Carrossel de Viagens</div><p className="text-xs text-gray-500">Exibe suas viagens ativas e destacadas rotativamente.</p></button><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'STATIC' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'STATIC' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><ImageIcon size={16}/> Banner Estático</div><p className="text-xs text-gray-500">Exibe uma imagem fixa com título e subtítulo.</p></button></div></div>{agencyForm.heroMode === 'STATIC' && (<div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4 animate-[fadeIn_0.3s]"><div><label className="block text-xs font-bold mb-1">Imagem do Banner</label><div className="flex items-center gap-4"><div className="w-32 h-16 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-300">{agencyForm.heroBannerUrl ? (<img src={agencyForm.heroBannerUrl} className="w-full h-full object-cover" alt="Banner" />) : (<div className="flex items-center justify-center h-full text-gray-400 text-xs">Sem imagem</div>)}{uploadingBanner && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader className="animate-spin"/></div>}</div><label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"><input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner}/>Enviar Imagem</label></div></div><div><label className="block text-xs font-bold mb-1">Título do Hero</label><input value={agencyForm.heroTitle || ''} onChange={e => setAgencyForm({...agencyForm, heroTitle: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="Ex: Explore o Mundo Conosco"/></div><div><label className="block text-xs font-bold mb-1">Subtítulo do Hero</label><input value={agencyForm.heroSubtitle || ''} onChange={e => setAgencyForm({...agencyForm, heroSubtitle: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="Ex: As melhores experiências para você."/></div></div>)}</section>)}
                    <div className="pt-4 border-t border-gray-100"><button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all">Salvar Alterações</button></div>
                </form></div>
             </div>
          )}
          </div>
        </>
      ) : (
         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-[scaleIn_0.2s]">
             <div className="bg-gray-50 p-6 border-b flex justify-between items-center"><button onClick={() => setViewMode('LIST')} className="flex items-center font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={18} className="mr-2"/> Voltar</button><div className="flex gap-3"><button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 disabled:opacity-50">{isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18} className="mr-2"/>} Salvar</button></div></div>
             <form onSubmit={handleTripSubmit} className="p-8 space-y-8 max-w-4xl mx-auto">
                 <section className="space-y-4"><div className="flex justify-between items-center border-b pb-2 mb-4"><h3 className="text-lg font-bold">Informações Básicas</h3><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!tripForm.featuredInHero} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"/><span className="text-sm font-bold text-amber-600 flex items-center"><Star size={14} className="mr-1 fill-amber-500"/> Destacar no Hero</span></label></div>
                    <div><label className="font-bold text-sm mb-1 block">Título do Pacote</label><input value={tripForm.title || ''} onChange={handleTitleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors" placeholder="Ex: Fim de semana em Paraty"/></div>
                    <div><label className="font-bold text-sm mb-1 block">Slug (URL Amigável)</label><input value={tripForm.slug || ''} onFocus={() => setSlugTouched(true)} onChange={e => setTripForm({...tripForm, slug: slugify(e.target.value)}) } className="w-full border p-3 rounded-lg bg-gray-50 font-mono text-primary-700 outline-none focus:border-primary-500 transition-colors" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="font-bold text-sm mb-1 block">Preço (R$)</label><input type="number" value={tripForm.price || ''} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors" /></div>
                        <div><label className="font-bold text-sm mb-1 block">Duração (Dias)</label><input type="number" value={tripForm.durationDays || ''} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors" /></div>
                        <div><label className="font-bold text-sm mb-1 block">Categoria</label><select value={tripForm.category} onChange={(e) => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white"><option value="PRAIA">Praia</option><option value="AVENTURA">Aventura</option><option value="FAMILIA">Família</option><option value="ROMANTICO">Romântico</option><option value="URBANO">Urbano</option><option value="NATUREZA">Natureza</option><option value="CULTURA">Cultura</option><option value="GASTRONOMICO">Gastronômico</option></select></div>
                    </div>
                    <div><label className="font-bold text-sm mb-1 block">Destino (Cidade/Estado)</label><input value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors" /></div>
                 </section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Descrição Detalhada</h3><RichTextEditor value={tripForm.description || ''} onChange={v => setTripForm({...tripForm, description: v})} /></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Galeria de Imagens</h3><ImageManager images={tripForm.images || []} onChange={imgs => setTripForm({...tripForm, images: imgs})} /></section>
             </form>
         </div>
      )}

      {showPayment && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowPayment(false)}>
             <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
                 <h3 className="text-2xl font-bold mb-4">Confirmar Assinatura</h3>
                 <p className="mb-6">Ativar plano {selectedPlan}?</p>
                 <button onClick={handleConfirmPayment} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">Confirmar Pagamento</button>
             </div>
         </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
