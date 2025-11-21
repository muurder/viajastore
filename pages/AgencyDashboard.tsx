
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory } from '../types';
import { PLANS } from '../services/mockData';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/slugify';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone } from 'lucide-react';

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
       if (value === '' || contentRef.current.innerHTML === '') contentRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  const addLink = () => {
      const url = prompt('Digite a URL:');
      if(url) execCmd('createLink', url);
  };

  const Button = ({ cmd, icon: Icon, title }: { cmd?: string, icon: any, title: string }) => (
    <button 
        type="button" 
        onClick={() => cmd && execCmd(cmd)} 
        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-all" 
        title={title}
    >
        <Icon size={18}/>
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow bg-white shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center">
        <div className="flex items-center gap-1 mr-2">
            <Button cmd="bold" icon={Bold} title="Negrito" />
            <Button cmd="italic" icon={Italic} title="Itálico" />
        </div>
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <div className="flex items-center gap-1 mx-2">
            <button type="button" onClick={() => execCmd('formatBlock', 'H3')} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Título 1"><Heading1 size={18}/></button>
            <button type="button" onClick={() => execCmd('formatBlock', 'H4')} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Título 2"><Heading2 size={18}/></button>
        </div>
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <div className="flex items-center gap-1 mx-2">
            <Button cmd="insertUnorderedList" icon={List} title="Lista com marcadores" />
            <Button cmd="insertOrderedList" icon={ListOrdered} title="Lista numerada" />
        </div>
        <div className="w-px h-5 bg-gray-300 mx-1"></div>
        <button type="button" onClick={addLink} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg ml-2" title="Inserir Link"><LinkIcon size={18}/></button>
      </div>
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        className="w-full p-5 min-h-[300px] outline-none text-sm leading-relaxed text-gray-700 prose prose-sm max-w-none"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

const ImageManager: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

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
      showToast('Imagens enviadas com sucesso!', 'success');
    } catch (error: any) {
      showToast('Erro no upload. Verifique se está logado e tem permissão.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            {uploading ? <Loader className="animate-spin text-primary-600" /> : <Upload className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-500 mt-2">{uploading ? 'Enviando...' : 'Clique ou arraste para enviar fotos'}</span>
      </label>
      {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group border border-gray-200">
                <img src={img} className="w-full h-full object-cover" />
                <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
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
            // Use agency-logos bucket if available, or default to avatars fallback
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
            <div className="w-24 h-24 rounded-full border-2 border-gray-200 bg-gray-50 overflow-hidden relative group">
                <img src={currentLogo || `https://ui-avatars.com/api/?name=Logo&background=random`} alt="Logo" className="w-full h-full object-cover" />
                {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader className="animate-spin text-primary-600"/></div>}
            </div>
            <div>
                <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-gray-50 inline-flex items-center gap-2 transition-colors">
                    <Upload size={16}/> Alterar Logomarca
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG ou WEBP. Max 2MB.</p>
            </div>
        </div>
    );
};

const AgencyDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats } = useData();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'TRIPS' | 'STATS' | 'SUBSCRIPTION' | 'SETTINGS'>('STATS');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PREMIUM' | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  
  const myAgency = agencies.find(a => a.id === user?.id) as Agency;
  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({});

  const [tripForm, setTripForm] = useState<Partial<Trip>>({
    title: '', slug: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], tags: [], paymentMethods: [], images: [], itinerary: []
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
      if(myAgency) {
          setAgencyForm({ ...myAgency });
          if (myAgency.subscriptionStatus !== 'ACTIVE') setActiveTab('SUBSCRIPTION');
      }
  }, [myAgency]);

  if (!user || user.role !== UserRole.AGENCY || !myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;

  const isActive = myAgency.subscriptionStatus === 'ACTIVE';
  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);
  
  // Clean slug for display/linking - ensuring no double slashes or wrong paths
  const rawSlug = agencyForm.slug || myAgency.slug || '';
  const cleanSlug = rawSlug.replace(/[^a-z0-9-]/gi, ''); // Extra safety
  const fullAgencyLink = cleanSlug ? `${window.location.origin}/#/${cleanSlug}` : '';

  const handleOpenCreate = () => {
    setEditingTripId(null);
    setTripForm({ title: '', slug: '', destination: '', price: 0, category: 'PRAIA', durationDays: 1, included: [], tags: [], paymentMethods: [], images: [], itinerary: [] });
    setSlugTouched(false);
    setViewMode('FORM');
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripForm({ ...trip, itinerary: trip.itinerary || [], tags: trip.tags || [], paymentMethods: trip.paymentMethods || [] });
    setSlugTouched(true); 
    setViewMode('FORM');
  };

  const handleDuplicateTrip = async (trip: Trip) => {
      if(!window.confirm(`Deseja duplicar "${trip.title}"?`)) return;
      
      const { id, ...rest } = trip;
      
      const timestamp = Math.floor(Date.now() / 1000);
      const duplicatedTrip = {
          ...rest,
          title: `${trip.title} (Cópia)`,
          slug: `${slugify(trip.title)}-copy-${timestamp}`, 
          active: false, 
          views: 0,
          sales: 0
      };
      
      try {
          await createTrip(duplicatedTrip as Trip);
          showToast('Pacote duplicado com sucesso! Ele está como Rascunho.', 'success');
      } catch (err) {
          console.error(err);
          showToast('Erro ao duplicar pacote.', 'error');
      }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      const updates: any = { title: newTitle };
      if (!slugTouched) updates.slug = slugify(newTitle);
      setTripForm({ ...tripForm, ...updates });
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
    }
    setIsSubmitting(false);
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
      if(res.success) showToast('Perfil atualizado!', 'success');
      else showToast('Erro: ' + res.error, 'error');
  };

  const handleConfirmPayment = async () => {
      if (selectedPlan) {
          await updateAgencySubscription(user.id, 'ACTIVE', selectedPlan);
          showToast('Assinatura ativada!', 'success');
          setShowPayment(false);
          setActiveTab('STATS');
      }
  };

  const handleSlugChange = (val: string) => {
     const sanitized = slugify(val);
     setAgencyForm({...agencyForm, slug: sanitized});
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full">
           <img src={agencyForm.logo || myAgency.logo} className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover bg-white" alt="Logo" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <div className="flex items-center gap-3 mt-1">
                {isActive ? <p className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Ativo</p> : <p className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={12}/> Pendente</p>}
                {cleanSlug && (
                    <a href={fullAgencyLink} target="_blank" className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-primary-100 hover:underline">
                        <Eye size={12}/> Ver Página Pública
                    </a>
                )}
             </div>
           </div>
        </div>
        <button onClick={() => setActiveTab('SETTINGS')} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap"><Settings size={18} className="mr-2"/> Editar Perfil</button>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide">
            <button onClick={() => setActiveTab('STATS')} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'STATS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('TRIPS')} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'TRIPS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Pacotes</button>
            <button onClick={() => setActiveTab('SUBSCRIPTION')} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'SUBSCRIPTION' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Assinatura</button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === 'SETTINGS' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>Configurações</button>
          </div>

          {activeTab === 'TRIPS' && isActive && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <div className="flex justify-between mb-6">
                   <h2 className="text-xl font-bold">Gerenciar Pacotes</h2>
                   <button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700"><Plus size={18} className="mr-2"/> Novo Pacote</button>
               </div>
               <div className="space-y-4">
                   {myTrips.map(trip => (
                       <div key={trip.id} className="flex flex-col md:flex-row items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
                           <img src={trip.images[0]} className="w-16 h-16 rounded-lg object-cover" alt="" />
                           <div className="flex-1">
                               <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                   {trip.title}
                                   {!trip.active && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Rascunho</span>}
                               </h3>
                               <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                   <span>R$ {trip.price}</span>
                                   <span>•</span>
                                   <span>{trip.views || 0} views</span>
                                   <span>•</span>
                                   <a 
                                      href={cleanSlug ? `${window.location.origin}/#/${cleanSlug}/viagem/${trip.slug || trip.id}` : '#'} 
                                      target="_blank" 
                                      className="text-primary-600 hover:underline flex items-center gap-1"
                                   >
                                      <Eye size={10}/> Preview
                                   </a>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => handleDuplicateTrip(trip)} className="p-2 text-blue-500 hover:bg-white hover:shadow rounded" title="Duplicar"><Copy size={18}/></button>
                               <button onClick={() => handleOpenEdit(trip)} className="p-2 text-gray-500 hover:bg-white hover:shadow rounded" title="Editar"><Edit size={18}/></button>
                               <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-red-500 hover:bg-white hover:shadow rounded" title="Excluir"><Trash2 size={18}/></button>
                           </div>
                       </div>
                   ))}
                   {myTrips.length === 0 && <p className="text-gray-500 text-center py-8">Você ainda não criou nenhum pacote.</p>}
               </div>
            </div>
          )}

          {activeTab === 'STATS' && isActive && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase">Faturamento</p><h3 className="text-2xl font-extrabold text-gray-900 mt-2">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase">Vendas</p><h3 className="text-2xl font-extrabold text-gray-900 mt-2">{stats.totalSales}</h3></div>
                 <div className="bg-white p-6 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase">Visualizações</p><h3 className="text-2xl font-extrabold text-gray-900 mt-2">{stats.totalViews}</h3></div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {PLANS.map(plan => (
                    <div key={plan.id} className="bg-white p-8 rounded-2xl border hover:border-primary-600 transition-all shadow-sm hover:shadow-md">
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-3xl font-bold text-primary-600 mt-2">R$ {plan.price.toFixed(2)}</p>
                        <button onClick={() => { setSelectedPlan(plan.id as any); setShowPayment(true); }} className="w-full mt-6 bg-primary-600 text-white py-3 rounded-xl font-bold">Selecionar</button>
                    </div>
                ))}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleAgencyUpdate} className="space-y-8">
                    
                    <section>
                         <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Identidade Visual</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-3 uppercase text-gray-500">Logomarca</label>
                                <LogoUpload currentLogo={agencyForm.logo} onUpload={(url) => setAgencyForm({...agencyForm, logo: url})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Nome da Agência</label>
                                <input value={agencyForm.name} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Descrição</label>
                                <textarea rows={3} value={agencyForm.description} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" placeholder="Conte um pouco sobre a agência..." />
                            </div>
                         </div>
                    </section>

                    <section>
                         <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Microsite & Contato</h3>
                         <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-1">WhatsApp (Somente números)</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input 
                                      value={agencyForm.whatsapp || ''} 
                                      onChange={e => setAgencyForm({...agencyForm, whatsapp: e.target.value.replace(/\D/g, '')})} 
                                      className="w-full border rounded-lg p-3 pl-10 outline-none focus:border-primary-500" 
                                      placeholder="5511999999999"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Este número será usado no botão de "Contato" do seu microsite.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold mb-1">Endereço do Microsite (Slug)</label>
                                <div className="relative">
                                    <input 
                                      value={agencyForm.slug || ''} 
                                      onChange={e => handleSlugChange(e.target.value)} 
                                      className="w-full border rounded-lg p-3 bg-gray-50 font-mono text-sm text-primary-700 font-medium pl-48" 
                                    />
                                    <span className="absolute left-3 top-3 text-gray-500 text-sm select-none">{window.location.host}/#/</span>
                                </div>
                                
                                {cleanSlug && (
                                    <div className="mt-2">
                                        <a 
                                            href={fullAgencyLink}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium bg-primary-50 px-2 py-1 rounded-md"
                                        >
                                            <ExternalLink size={10} /> {fullAgencyLink} 
                                        </a>
                                    </div>
                                )}
                            </div>
                         </div>
                    </section>

                    <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-primary-700 shadow-lg shadow-primary-500/20">Salvar Alterações</button>
                </form>
             </div>
          )}
        </>
      ) : (
         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
             <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
                 <button onClick={() => setViewMode('LIST')} className="flex items-center font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={18} className="mr-2"/> Voltar</button>
                 <div className="flex gap-3">
                    {/* Preview Button */}
                    <button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700">{isSubmitting ? <Loader className="animate-spin"/> : <Save size={18} className="mr-2"/>} Salvar</button>
                 </div>
             </div>

             <div className="p-8 space-y-8 max-w-4xl mx-auto">
                 {/* ... Trip Edit Form Content (kept mostly same, focusing on structure) ... */}
                 <section className="space-y-4">
                    <h3 className="font-bold border-b pb-2">Informações Básicas</h3>
                    <div><label className="font-bold text-sm">Título do Pacote</label><input value={tripForm.title} onChange={handleTitleChange} className="w-full border p-3 rounded-lg" placeholder="Ex: Fim de semana em Paraty"/></div>
                    <div>
                        <label className="font-bold text-sm">Slug (URL Amigável)</label>
                        <input value={tripForm.slug} onChange={e => { setSlugTouched(true); setTripForm({...tripForm, slug: slugify(e.target.value)}) }} className="w-full border p-3 rounded-lg bg-gray-50 font-mono text-primary-700" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="font-bold text-sm">Preço (R$)</label><input type="number" value={tripForm.price} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg" /></div>
                        <div><label className="font-bold text-sm">Duração (Dias)</label><input type="number" value={tripForm.durationDays} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg" /></div>
                        <div>
                            <label className="font-bold text-sm">Categoria</label>
                            <select value={tripForm.category} onChange={(e) => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg">
                                <option value="PRAIA">Praia</option>
                                <option value="AVENTURA">Aventura</option>
                                <option value="FAMILIA">Família</option>
                                <option value="ROMANTICO">Romântico</option>
                                <option value="URBANO">Urbano</option>
                                <option value="NATUREZA">Natureza</option>
                                <option value="CULTURA">Cultura</option>
                                <option value="GASTRONOMICO">Gastronômico</option>
                            </select>
                        </div>
                    </div>
                    <div><label className="font-bold text-sm">Destino (Cidade/Estado)</label><input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg" /></div>
                 </section>

                 <section>
                     <h3 className="font-bold border-b pb-2 mb-4">Descrição Detalhada</h3>
                     <p className="text-sm text-gray-500 mb-2">Use o editor abaixo para adicionar detalhes do roteiro, o que levar, e informações importantes.</p>
                     <RichTextEditor value={tripForm.description || ''} onChange={v => setTripForm({...tripForm, description: v})} />
                 </section>

                 <section>
                     <h3 className="font-bold border-b pb-2 mb-4">Galeria de Imagens</h3>
                     <ImageManager images={tripForm.images || []} onChange={imgs => setTripForm({...tripForm, images: imgs})} />
                 </section>
                 
                 {/* Duplicate buttons bottom */}
                 <div className="flex justify-end gap-3 border-t pt-6 mt-8">
                    <button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700">{isSubmitting ? <Loader className="animate-spin"/> : <Save size={18} className="mr-2"/>} Salvar</button>
                 </div>
             </div>
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
