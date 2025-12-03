

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan, Address, BankInfo } from '../types'; // Fix: Import Address and BankInfo
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';

// --- REUSABLE COMPONENTS (LOCAL TO THIS DASHBOARD) ---

const MAX_IMAGES = 8;

const SUGGESTED_TAGS = ['Ecoturismo', 'História', 'Relaxamento', 'Esportes Radicais', 'Luxo', 'Econômico', 'All Inclusive', 'Pet Friendly', 'Acessível', 'LGBTQIA+'];
const SUGGESTED_TRAVELERS = ['SOZINHO', 'CASAL', 'FAMILIA', 'AMIGOS', 'MOCHILAO', 'MELHOR_IDADE'];
const SUGGESTED_PAYMENTS = ['Pix', 'Cartão de Crédito (até 12x)', 'Boleto Bancário', 'Transferência', 'Dinheiro'];
const SUGGESTED_INCLUDED = ['Hospedagem', 'Café da manhã', 'Passagens Aéreas', 'Transfer Aeroporto', 'Guia Turístico', 'Seguro Viagem', 'Ingressos', 'Almoço', 'Jantar', 'Passeios de Barco'];
const SUGGESTED_NOT_INCLUDED = ['Passagens Aéreas', 'Bebidas alcoólicas', 'Gorjetas', 'Despesas Pessoais', 'Jantar', 'Almoço', 'Taxas de Turismo'];

interface ActionsMenuProps {
  trip: Trip;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  fullAgencyLink: string;
}

// Extracted NavButton Component
interface NavButtonProps {
  tabId: string;
  label: string;
  // FIX: Explicitly type the icon prop as a React Component from lucide-react.
  icon: React.ComponentType<LucideProps>;
  activeTab: string;
  onClick: (tabId: string) => void;
  hasNotification?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
  <button 
    onClick={() => onClick(tabId)} 
    className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
  >
    <Icon size={16} /> 
    {label} 
    {hasNotification && ( 
      <span className="absolute top-2 right-2 flex h-2.5 w-2.5"> 
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> 
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> 
      </span> 
    )} 
  </button>
);

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

const SubscriptionConfirmationModal: React.FC<{
  plan: Plan;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}> = ({ plan, onClose, onConfirm, isSubmitting }) => {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Confirmar Assinatura</h3>
                <p className="mb-6">Você está prestes a ativar o <span className="font-bold">{plan.name}</span>.</p>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="text-2xl font-bold text-primary-600">R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Cobrança mensal</p>
                </div>
                <button onClick={onConfirm} disabled={isSubmitting} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader size={18} className="animate-spin" /> Processando...
                      </span>
                    ) : 'Confirmar Assinatura'}
                </button>
            </div>
        </div>
  );
};


const ActionsMenu: React.FC<ActionsMenuProps> = ({ trip, onEdit, onDuplicate, onDelete, onToggleStatus, fullAgencyLink }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPublished = trip.is_active;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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
            <div className="px-4 py-2 border-b border-gray-50"><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ações do Pacote</p></div>
            {isPublished ? (
               <>
                 <Link to={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={() => setIsOpen(false)}><Eye size={16} className="mr-3 text-gray-400"/> Ver público</Link>
                 <button onClick={() => { onToggleStatus(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-amber-600 transition-colors"><PauseCircle size={16} className="mr-3 text-gray-400"/> Pausar vendas</button>
               </>
            ) : (
               <>
                 <button onClick={() => { onToggleStatus(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"><PlayCircle size={16} className="mr-3 text-green-500"/> {trip.is_active === false ? 'Publicar' : 'Retomar vendas'}</button>
                 <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:hidden transition-colors"><Edit size={16} className="mr-3 text-gray-400"/> Editar</button>
               </>
            )}
            <button onClick={() => { onDuplicate(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Copy size={16} className="mr-3 text-gray-400"/> Duplicar</button>
            <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-3"/> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PillInput: React.FC<{ value: string[]; onChange: (val: string[]) => void; placeholder: string; suggestions?: string[]; customSuggestions?: string[]; onDeleteCustomSuggestion?: (item: string) => void; }> = ({ value, onChange, placeholder, suggestions = [], customSuggestions = [], onDeleteCustomSuggestion }) => {
  const [inputValue, setInputValue] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };
  const handleAdd = (item: string) => !value.includes(item) && onChange([...value, item]);
  const handleRemove = (itemToRemove: string) => onChange(value.filter(item => item !== itemToRemove));
  const handleDeleteCustom = (e: React.MouseEvent, item: string) => {
      e.stopPropagation();
      if (window.confirm(`Remover "${item}" das suas sugestões salvas?`)) onDeleteCustomSuggestion?.(item);
  };
  const availableSuggestions = suggestions.filter(s => !value.includes(s));
  const availableCustom = customSuggestions.filter(s => !value.includes(s) && !suggestions.includes(s));

  return (
    <div className="space-y-3">
      {(availableSuggestions.length > 0 || availableCustom.length > 0) && (
        <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(s => (<button type="button" key={s} onClick={() => handleAdd(s)} className="text-xs bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded-md hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all flex items-center gap-1"><Plus size={10} /> {s}</button>))}
            {availableCustom.map(s => (<button type="button" key={s} onClick={() => handleAdd(s)} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100 transition-all flex items-center gap-1 group relative pr-6"><Plus size={10} /> {s}<span onClick={(e) => handleDeleteCustom(e, s)} className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Remover sugestão salva"><X size={10} /></span></button>))}
        </div>
      )}
      <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm"/>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((item, index) => (<div key={index} className="flex items-center bg-primary-50 text-primary-800 border border-primary-100 text-sm font-bold px-3 py-1.5 rounded-full animate-[scaleIn_0.2s]"><span>{item}</span><button type="button" onClick={() => handleRemove(item)} className="ml-2 text-primary-400 hover:text-red-500"><X size={14} /></button></div>))}
      </div>
    </div>
  );
};

const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value && document.activeElement !== contentRef.current) contentRef.current.innerHTML = value;
    if (value === '' && contentRef.current) contentRef.current.innerHTML = '';
  }, [value]);
  const handleInput = () => contentRef.current && onChange(contentRef.current.innerHTML);
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };
  const addLink = () => { const url = prompt('Digite a URL do link:'); if(url) execCmd('createLink', url); };
  const addImage = () => { const url = prompt('Cole a URL da imagem (ex: https://...):'); if(url) execCmd('insertImage', url); };
  const addEmoji = (emoji: string) => { execCmd('insertText', emoji); setShowEmojiPicker(false); };
  const ToolbarButton = ({ cmd, icon: Icon, title, arg, active = false }: any) => (<button type="button" onClick={() => cmd && execCmd(cmd, arg)} className={`p-2 rounded-lg transition-all ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'}`} title={title}><Icon size={18}/></button>);
  const Divider = () => <div className="w-px h-5 bg-gray-300 mx-1"></div>;
  const COMMON_EMOJIS = ['✈️', '🏖️', '🗺️', '📸', '🧳', '🌟', '🔥', '❤️', '✅', '❌', '📍', '📅', '🚌', '🏨', '🍷', '⛰️'];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 transition-shadow bg-white shadow-sm flex flex-col">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
        <ToolbarButton cmd="bold" icon={Bold} title="Negrito" />
        <ToolbarButton cmd="italic" icon={Italic} title="Itálico" />
        <ToolbarButton cmd="underline" icon={Underline} title="Sublinhado" />
        <Divider />
        <ToolbarButton cmd="formatBlock" arg="h2" icon={Heading1} title="Título Grande" />
        <ToolbarButton cmd="formatBlock" arg="h3" icon={Heading2} title="Título Médio" />
        <ToolbarButton cmd="formatBlock" arg="blockquote" icon={Quote} title="Citação" />
        <Divider />
        <ToolbarButton cmd="justifyLeft" icon={AlignLeft} title="Alinhar Esquerda" />
        <ToolbarButton cmd="justifyCenter" icon={AlignCenter} title="Centralizar" />
        <ToolbarButton cmd="justifyRight" icon={AlignRight} title="Alinhar Direita" />
        <Divider />
        <ToolbarButton cmd="insertImage" icon={ImageIcon} title="Inserir Imagem" />
        <ToolbarButton cmd="createLink" icon={LinkIcon} title="Inserir Link" onClick={addLink} />
        <ToolbarButton icon={Smile} title="Inserir Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-4 outline-none min-h-[150px] resize-y overflow-auto text-gray-800 prose max-w-none"
        data-placeholder="Descreva a experiência em detalhes..."
        role="textbox"
        aria-multiline="true"
        aria-label="Editor de texto rico para descrição"
      />
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg flex flex-wrap gap-2 animate-[fadeInUp_0.1s]">
          {COMMON_EMOJIS.map(emoji => (
            <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="text-xl p-1 hover:bg-gray-100 rounded-md">{emoji}</button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AgencyDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { 
    agencies, trips, agencyReviews, bookings, 
    createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus, 
    updateAgencyProfileByAdmin, refreshData,
    getAgencyPublicTrips, getReviewsByAgencyId,
    updateAgencySubscription,
    saveAgencyTheme, getAgencyTheme,
    softDeleteEntity, restoreEntity,
  } = useData();
  const { showToast } = useToast();
  const { setAgencyTheme } = useTheme(); // For real-time microsite theme updates

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'OVERVIEW';

  const [isProcessing, setIsProcessing] = useState(false);
  const [modalType, setModalType] = useState<
    'CREATE_TRIP' | 'EDIT_TRIP' | 'MANAGE_IMAGES' | 'EDIT_AGENCY_PROFILE' | 'MANAGE_SUBSCRIPTION' | 'THEME_SETTINGS' | null
  >(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [newTripFormData, setNewTripFormData] = useState<Partial<Trip>>({
    title: '', description: '', destination: '', price: 0,
    startDate: '', endDate: '', durationDays: 1,
    category: 'PRAIA', tags: [], travelerTypes: [],
    itinerary: [], images: [], included: [], notIncluded: [],
    paymentMethods: [], is_active: true,
  });
  const [editAgencyFormData, setEditAgencyFormData] = useState<Partial<Agency>>({});

  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isActivatingPlan, setIsActivatingPlan] = useState<string | null>(null);
  const [showSubscriptionConfirmation, setShowSubscriptionConfirmation] = useState<Plan | null>(null);

  // Agency data specific to the logged-in user
  const currentUserAgency = user && user.role === UserRole.AGENCY 
    ? agencies.find(a => a.id === user.id) 
    : undefined;

  useEffect(() => {
    // If not authenticated or not an agency, redirect
    if (!authLoading && (!user || user.role !== UserRole.AGENCY)) {
      navigate('/unauthorized', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (currentUserAgency?.agencyId) {
      // Load agency-specific theme
      const loadAgencyTheme = async () => {
        const theme = await getAgencyTheme(currentUserAgency.agencyId);
        if (theme) {
          setAgencyTheme(theme.colors);
        }
      };
      loadAgencyTheme();
    }
  }, [currentUserAgency?.agencyId, getAgencyTheme, setAgencyTheme]);


  if (authLoading || !user || user.role !== UserRole.AGENCY || !currentUserAgency) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;
  }

  const myTrips = getAgencyPublicTrips(currentUserAgency.agencyId);
  const myReviews = getReviewsByAgencyId(currentUserAgency.agencyId);

  // Dashboard Stats
  const agencyStats = useData().getAgencyStats(currentUserAgency.agencyId);

  const fullAgencyLink = `/#/${currentUserAgency.slug || currentUserAgency.agencyId}`;

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // --- TRIP MANAGEMENT ---

  const handleCreateTripClick = () => {
    setNewTripFormData({
      title: '', description: '', destination: '', price: 0,
      startDate: '', endDate: '', durationDays: 1,
      category: 'PRAIA', tags: [], travelerTypes: [],
      itinerary: [], images: [], included: [], notIncluded: [],
      paymentMethods: [], is_active: true,
    });
    setCurrentImages([]);
    setModalType('CREATE_TRIP');
  };

  const handleEditTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setNewTripFormData({ ...trip, price: Number(trip.price) }); // Ensure price is number
    setCurrentImages([...trip.images]);
    setModalType('EDIT_TRIP');
  };
  
  const handleTripFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserAgency) {
        showToast("Dados da agência não encontrados.", "error");
        return;
    }
    setIsSubmittingForm(true);

    const tripData: Trip = {
        ...(newTripFormData as Trip), // Cast to Trip, assuming all required fields are there
        agencyId: currentUserAgency.agencyId,
        images: currentImages,
        slug: slugify(newTripFormData.title + '-' + Math.random().toString(36).substring(2, 7)), // Generate slug here
        price: Number(newTripFormData.price), // Ensure price is number
    };

    try {
        if (modalType === 'CREATE_TRIP') {
            await createTrip(tripData);
            showToast('Pacote criado com sucesso!', 'success');
        } else if (modalType === 'EDIT_TRIP' && selectedTrip) {
            await updateTrip({ ...tripData, id: selectedTrip.id });
            showToast('Pacote atualizado com sucesso!', 'success');
        }
        setModalType(null); // Close modal
        setNewTripFormData({}); // Clear form
    } catch (error: any) {
        showToast('Erro ao salvar pacote: ' + (error.message || 'Erro desconhecido'), 'error');
        console.error("Trip form submission error:", error);
    } finally {
        setIsSubmittingForm(false);
    }
  };

  const handleDuplicateTrip = async (trip: Trip) => {
    if (!currentUserAgency) return;
    if (window.confirm(`Tem certeza que deseja duplicar o pacote "${trip.title}"?`)) {
        setIsProcessing(true);
        try {
            const duplicatedTrip: Partial<Trip> = {
                ...trip,
                id: crypto.randomUUID(), // New ID
                slug: slugify(`${trip.title}-copia-${Math.random().toString(36).substring(2, 7)}`), // New unique slug
                title: `${trip.title} (Cópia)`,
                is_active: false, // Duplicates are inactive by default
                featured: false,
                featuredInHero: false,
                views: 0,
                sales: 0,
            };
            await createTrip(duplicatedTrip as Trip); // Cast to Trip as it should now be complete
            showToast('Pacote duplicado com sucesso!', 'success');
        } catch (error: any) {
            showToast('Erro ao duplicar pacote: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const handleToggleTripStatus = async (tripId: string) => {
    setIsProcessing(true);
    await toggleTripStatus(tripId);
    setIsProcessing(false);
  };
  
  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pacote? Essa ação não pode ser desfeita.')) {
        setIsProcessing(true);
        try {
            await deleteTrip(tripId);
            showToast('Pacote excluído com sucesso!', 'success');
        } catch (error: any) {
            showToast('Erro ao excluir pacote: ' + error.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    }
  };


  // --- IMAGE MANAGEMENT ---
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUserAgency || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setIsUploadingImage(true);
    setImageUploadProgress(0);

    const fileName = `trip-${selectedTrip?.id || newTripFormData.title}-${Date.now()}.${file.name.split('.').pop()}`;
    const filePath = `${currentUserAgency.agencyId}/${fileName}`;

    try {
        const { data, error: uploadError } = await supabase.storage
            .from('trip-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                // onUploadProgress is not directly available in supabase-js v2 upload
                // A custom workaround would be needed for progress, skipping for now
            });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('trip-images')
            .getPublicUrl(filePath);
        
        if (publicUrlData?.publicUrl) {
            setCurrentImages(prev => [...prev, publicUrlData.publicUrl]);
            showToast('Imagem adicionada!', 'success');
        } else {
            throw new Error('Não foi possível obter a URL pública da imagem.');
        }

    } catch (error: any) {
        showToast('Erro ao carregar imagem: ' + error.message, 'error');
    } finally {
        setIsUploadingImage(false);
        setImageUploadProgress(0); // Reset
        if (imageInputRef.current) imageInputRef.current.value = ''; // Clear input
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setCurrentImages(prev => prev.filter((_, index) => index !== indexToRemove));
    showToast('Imagem removida!', 'info');
  };

  // --- AGENCY PROFILE MANAGEMENT ---
  const handleEditAgencyProfileClick = () => {
    if (!currentUserAgency) return;
    setEditAgencyFormData({ ...currentUserAgency });
    setModalType('EDIT_AGENCY_PROFILE');
  };

  const handleAgencyProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserAgency) return;
    setIsSubmittingForm(true);
    try {
        await updateAgencyProfileByAdmin(currentUserAgency.agencyId, editAgencyFormData);
        showToast('Perfil da agência atualizado!', 'success');
        setModalType(null);
    } catch (error: any) {
        showToast('Erro ao atualizar perfil: ' + error.message, 'error');
        console.error("Agency profile update error:", error);
    } finally {
        setIsSubmittingForm(false);
    }
  };

  // --- SUBSCRIPTION MANAGEMENT ---
  const handleManageSubscriptionClick = () => {
    if (!currentUserAgency) return;
    // Pre-fill form with current subscription data
    setNewTripFormData({ // Using newTripFormData temporarily, consider separate state if complex
        subscriptionPlan: currentUserAgency.subscriptionPlan,
        subscriptionStatus: currentUserAgency.subscriptionStatus,
        subscriptionExpiresAt: currentUserAgency.subscriptionExpiresAt,
    } as any); 
    setModalType('MANAGE_SUBSCRIPTION');
  };
  
  const handleSelectPlan = (plan: Plan) => {
    setShowSubscriptionConfirmation(plan);
  };

  const handleConfirmSubscription = async () => {
    if (!currentUserAgency || !showSubscriptionConfirmation) return;
    setIsActivatingPlan(showSubscriptionConfirmation.id); // Set loading for this specific plan
    try {
      // Use the RPC to activate/change subscription
      const { data, error } = await supabase.rpc('activate_agency_subscription', {
          p_user_id: currentUserAgency.id, // User ID (from auth)
          p_plan_id: showSubscriptionConfirmation.id,
      });

      if (error) throw error;
      
      showToast(`Plano ${showSubscriptionConfirmation.name} ativado com sucesso!`, 'success');
      await refreshData(); // Re-fetch all data to update agency status/plan
      setModalType(null);
      setShowSubscriptionConfirmation(null);
    } catch (error: any) {
      showToast('Erro ao ativar plano: ' + (error.message || 'Erro desconhecido'), 'error');
      console.error("Subscription activation error:", error);
    } finally {
      setIsActivatingPlan(null); // Clear loading state
    }
  };

  // --- THEME SETTINGS ---
  const handleThemeSettingsClick = () => {
    setModalType('THEME_SETTINGS');
  };

  const handleSaveAgencyTheme = async (colors: ThemeColors) => {
    if (!currentUserAgency) return;
    setIsProcessing(true);
    try {
      const success = await saveAgencyTheme(currentUserAgency.agencyId, colors);
      if (success) {
        showToast('Tema salvo com sucesso!', 'success');
        await refreshData();
      } else {
        showToast('Erro ao salvar tema.', 'error');
      }
    } catch (error: any) {
      showToast('Erro ao salvar tema: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Meu Painel de Agência</h1>
        <div className="flex flex-wrap gap-3">
            <button onClick={refreshData} disabled={isProcessing} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                {isProcessing ? <Loader size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
                Atualizar Dados
            </button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="TRIPS" label={`Pacotes (${myTrips.length})`} icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="REVIEWS" label={`Avaliações (${myReviews.length})`} icon={Star} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {/* Render Content based on activeTab */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          {currentUserAgency.subscriptionStatus !== 'ACTIVE' && (
            <SubscriptionActivationView 
                agency={currentUserAgency} 
                onSelectPlan={handleSelectPlan}
                activatingPlanId={isActivatingPlan}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-green-50 text-green-600 group-hover:scale-105 transition-transform"><DollarSign size={24}/></div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Receita Total</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {agencyStats.totalRevenue.toLocaleString('pt-BR')}</h3>
                  <p className="text-xs text-gray-400 mt-2">Vendas confirmadas</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform"><ShoppingBag size={24}/></div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Total de Vendas</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.totalSales}</h3>
                  <p className="text-xs text-gray-400 mt-2">Reservas efetuadas</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform"><Eye size={24}/></div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Visualizações</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.totalViews}</h3>
                  <p className="text-xs text-gray-400 mt-2">Alcance dos pacotes</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform"><Star size={24}/></div>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Avaliação Média</p>
                  <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.averageRating?.toFixed(1) || '0.0'}/5</h3>
                  <p className="text-xs text-gray-400 mt-2">{agencyStats.totalReviews} avaliações</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pacotes Mais Populares */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MonitorPlay size={20} className="mr-2 text-primary-600"/> Pacotes Populares</h3>
                  {myTrips.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                          {myTrips.sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map(trip => (
                              <div key={trip.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <div className="w-12 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                      <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                  </div>
                                  <div className="flex-1">
                                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                          <Eye size={12} className="text-blue-400"/> {trip.views || 0}
                                          <ShoppingBag size={12} className="text-green-500 ml-2"/> {trip.sales || 0}
                                      </p>
                                  </div>
                                  <Link to={`/agency/dashboard?tab=TRIPS`} className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1">Gerenciar <ArrowRight size={12}/></Link>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">Nenhum pacote cadastrado ainda.</div>
                  )}
              </div>
              {/* Últimas Avaliações */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MessageCircle size={20} className="mr-2 text-amber-600"/> Últimas Avaliações</h3>
                  {myReviews.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                          {myReviews.slice(0,5).map(review => (
                              <div key={review.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <div className="flex items-center justify-between mb-1">
                                      <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                                      <div className="flex text-amber-400">
                                          {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                                      </div>
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-2">{review.comment}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">Nenhuma avaliação recebida ainda.</div>
                  )}
              </div>
          </div>
        </div>
      )}

      {activeTab === 'TRIPS' && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2>
                  <button onClick={handleCreateTripClick} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2"><Plus size={18}/> Novo Pacote</button>
              </div>
              {myTrips.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                              <tr>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destino</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destaque</th>
                                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {myTrips.map(trip => (
                                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                  <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                              </div>
                                              <div className="truncate">
                                                  <p className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px]">{trip.title}</p>
                                                  <p className="text-xs text-gray-500">{trip.category.replace('_', ' ')}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-700">{trip.destination}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                      <td className="px-6 py-4">
                                          <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'INATIVO'}</Badge>
                                      </td>
                                      <td className="px-6 py-4">
                                          <Badge color={trip.featured ? 'amber' : 'gray'}>{trip.featured ? 'SIM' : 'NÃO'}</Badge>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <ActionsMenu
                                              trip={trip}
                                              onEdit={() => handleEditTripClick(trip)}
                                              onDuplicate={() => handleDuplicateTrip(trip)}
                                              onDelete={() => handleDeleteTrip(trip.id)}
                                              onToggleStatus={() => handleToggleTripStatus(trip.id)}
                                              fullAgencyLink={fullAgencyLink}
                                          />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                      <Plane size={32} className="text-gray-300 mx-auto mb-4"/>
                      <h3 className="text-lg font-bold text-gray-900">Nenhum pacote cadastrado</h3>
                      <p className="text-gray-500 mt-1">Comece criando sua primeira experiência de viagem.</p>
                      <button onClick={handleCreateTripClick} className="mt-6 bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 mx-auto"><Plus size={18}/> Criar Novo Pacote</button>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'REVIEWS' && (
          <div className="animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações Recebidas ({myReviews.length})</h2>
              {myReviews.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                              <tr>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Avaliação</th>
                                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {myReviews.map(review => (
                                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{review.clientName}</td>
                                      <td className="px-6 py-4 text-sm text-gray-700">{review.tripTitle || 'Geral'}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-1">
                                              {[...Array(5)].map((_, i) => (
                                                  <Star key={i} size={14} className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                              ))}
                                              <span className="text-xs text-gray-500">({review.rating})</span>
                                          </div>
                                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{review.comment}</p>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <ActionMenu
                                              actions={[
                                                  { label: 'Responder', icon: MessageSquare, onClick: () => showToast("Funcionalidade em desenvolvimento", "info") },
                                                  { label: 'Excluir', icon: Trash2, onClick: () => showToast("Funcionalidade em desenvolvimento", "info"), variant: 'danger' }
                                              ]}
                                          />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                      <Star size={32} className="text-gray-300 mx-auto mb-4"/>
                      <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação recebida</h3>
                      <p className="text-gray-500 mt-1">Quando seus clientes avaliarem seus pacotes, elas aparecerão aqui.</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'SETTINGS' && (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações da Agência</h2>
                  <button onClick={handleEditAgencyProfileClick} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 float-right"><Edit size={18}/> Editar</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><p className="text-sm text-gray-500">Nome</p><p className="font-bold text-gray-900">{currentUserAgency.name}</p></div>
                      <div><p className="text-sm text-gray-500">Slug (URL)</p><p className="font-mono text-gray-900">/{currentUserAgency.slug}</p></div>
                      <div><p className="text-sm text-gray-500">CNPJ</p><p className="font-bold text-gray-900">{currentUserAgency.cnpj || 'Não informado'}</p></div>
                      <div><p className="text-sm text-gray-500">Telefone</p><p className="font-bold text-gray-900">{currentUserAgency.phone || 'Não informado'}</p></div>
                      <div><p className="text-sm text-gray-500">WhatsApp</p><p className="font-bold text-gray-900">{currentUserAgency.whatsapp || 'Não informado'}</p></div>
                      <div><p className="text-sm text-gray-500">Website</p><p className="font-bold text-gray-900">{currentUserAgency.website || 'Não informado'}</p></div>
                  </div>
                  <div className="mt-6"><p className="text-sm text-gray-500">Descrição</p><p className="text-gray-900">{currentUserAgency.description || 'Não informada'}</p></div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Assinatura e Planos</h2>
                  <button onClick={handleManageSubscriptionClick} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 float-right"><CreditCard size={18}/> Gerenciar</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><p className="text-sm text-gray-500">Plano Atual</p><p className="font-bold text-gray-900">{currentUserAgency.subscriptionPlan}</p></div>
                      <div><p className="text-sm text-gray-500">Status</p><p className={`font-bold ${currentUserAgency.subscriptionStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{currentUserAgency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</p></div>
                      <div><p className="text-sm text-gray-500">Expira em</p><p className="font-bold text-gray-900">{new Date(currentUserAgency.subscriptionExpiresAt).toLocaleDateString()}</p></div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalização do Microsite</h2>
                  <button onClick={handleThemeSettingsClick} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 float-right"><Palette size={18}/> Temas</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Modo Hero</p>
                      <select 
                        value={currentUserAgency.heroMode} 
                        onChange={(e) => updateAgencyProfileByAdmin(currentUserAgency.agencyId, { heroMode: e.target.value as 'TRIPS' | 'STATIC' })}
                        className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="TRIPS">Carrossel de Pacotes</option>
                        <option value="STATIC">Banner Estático</option>
                      </select>
                    </div>
                    {currentUserAgency.heroMode === 'STATIC' && (
                      <>
                        <div>
                          <p className="text-sm text-gray-500">Título do Hero</p>
                          <input 
                            type="text" 
                            value={currentUserAgency.heroTitle || ''}
                            onChange={(e) => updateAgencyProfileByAdmin(currentUserAgency.agencyId, { heroTitle: e.target.value })}
                            placeholder="Título principal"
                            className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500">Subtítulo do Hero</p>
                          <textarea 
                            value={currentUserAgency.heroSubtitle || ''}
                            onChange={(e) => updateAgencyProfileByAdmin(currentUserAgency.agencyId, { heroSubtitle: e.target.value })}
                            placeholder="Mensagem secundária"
                            className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 h-20"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-sm font-bold text-gray-700 mb-2">URL do Banner Estático</p>
                          <input 
                            type="text" 
                            value={currentUserAgency.heroBannerUrl || ''}
                            onChange={(e) => updateAgencyProfileByAdmin(currentUserAgency.agencyId, { heroBannerUrl: e.target.value })}
                            placeholder="Cole a URL da imagem do banner (ex: https://...)"
                            className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                          {currentUserAgency.heroBannerUrl && <img src={currentUserAgency.heroBannerUrl} alt="Hero Banner Preview" className="mt-4 w-full h-32 object-cover rounded-lg"/>}
                        </div>
                      </>
                    )}
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Sugestões Customizadas</h2>
                  <p className="text-gray-500 mb-4">Adicione sugestões personalizadas para tags, itens incluídos, etc., para usar em seus pacotes.</p>
                  <PillInput
                    value={currentUserAgency.customSettings?.tags || []}
                    onChange={(newTags) => updateAgencyProfileByAdmin(currentUserAgency.agencyId, { customSettings: { ...currentUserAgency.customSettings, tags: newTags } })}
                    placeholder="Adicionar nova tag..."
                    suggestions={SUGGESTED_TAGS}
                    onDeleteCustomSuggestion={(itemToDelete) => {
                      const updatedTags = (currentUserAgency.customSettings?.tags || []).filter(t => t !== itemToDelete);
                      updateAgencyProfileByAdmin(currentUserAgency.agencyId, { customSettings: { ...currentUserAgency.customSettings, tags: updatedTags } });
                    }}
                  />
                  {/* Repeat for other custom lists */}
              </div>
          </div>
      )}

      {/* Modals */}
      {/* Create/Edit Trip Modal */}
      {(modalType === 'CREATE_TRIP' || modalType === 'EDIT_TRIP') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{modalType === 'CREATE_TRIP' ? 'Criar Novo Pacote' : 'Editar Pacote'}</h2>
            
            <form onSubmit={handleTripFormSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote</label>
                        <input 
                            type="text" 
                            value={newTripFormData.title || ''} 
                            onChange={e => setNewTripFormData({...newTripFormData, title: e.target.value})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Ex: Aventura na Chapada"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Destino</label>
                        <input 
                            type="text" 
                            value={newTripFormData.destination || ''} 
                            onChange={e => setNewTripFormData({...newTripFormData, destination: e.target.value})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="Ex: Lençóis, BA"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Preço por pessoa</label>
                        <input 
                            type="number" 
                            min="0"
                            value={newTripFormData.price || ''} 
                            onChange={e => setNewTripFormData({...newTripFormData, price: Number(e.target.value)})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            placeholder="R$ 1.500,00"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Duração (dias)</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newTripFormData.durationDays || 1} 
                            onChange={e => setNewTripFormData({...newTripFormData, durationDays: Number(e.target.value)})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label>
                        <input 
                            type="date" 
                            value={newTripFormData.startDate?.split('T')[0] || ''} // Format for date input
                            onChange={e => setNewTripFormData({...newTripFormData, startDate: e.target.value + 'T00:00:00Z'})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Data de Fim</label>
                        <input 
                            type="date" 
                            value={newTripFormData.endDate?.split('T')[0] || ''} // Format for date input
                            onChange={e => setNewTripFormData({...newTripFormData, endDate: e.target.value + 'T00:00:00Z'})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" 
                            required
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                        <select 
                            value={newTripFormData.category || 'PRAIA'} 
                            onChange={e => setNewTripFormData({...newTripFormData, category: e.target.value as TripCategory})} 
                            className="w-full border p-3 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            {Object.values(TripCategory).map(cat => (
                                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Description - Rich Text Editor */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Detalhada</label>
                    <RichTextEditor 
                        value={newTripFormData.description || ''} 
                        onChange={val => setNewTripFormData({...newTripFormData, description: val})} 
                    />
                </div>

                {/* Images */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Imagens do Pacote (máx. {MAX_IMAGES})</label>
                    <div className="flex flex-wrap gap-3 mb-4">
                        {currentImages.map((img, index) => (
                            <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                                <img src={img} alt={`Pacote imagem ${index + 1}`} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                            </div>
                        ))}
                        {currentImages.length < MAX_IMAGES && (
                            <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors">
                                {isUploadingImage ? <Loader className="animate-spin" size={20}/> : <Plus size={30}/>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={imageInputRef} disabled={isUploadingImage}/>
                            </label>
                        )}
                    </div>
                    {isUploadingImage && <div className="text-sm text-gray-500 mt-2">Enviando imagem... {imageUploadProgress}%</div>}
                </div>

                {/* Tags & Traveler Types */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                    <PillInput 
                        value={newTripFormData.tags || []} 
                        onChange={val => setNewTripFormData({...newTripFormData, tags: val})} 
                        placeholder="Adicionar tag (ex: Trilhas, Histórico)"
                        suggestions={currentUserAgency.customSettings?.tags || SUGGESTED_TAGS} // Use agency custom tags
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tipos de Viajante</label>
                    <PillInput 
                        value={newTripFormData.travelerTypes || []} 
                        onChange={val => setNewTripFormData({...newTripFormData, travelerTypes: val as TravelerType[]})} 
                        placeholder="Adicionar tipo de viajante (ex: Casal, Família)"
                        suggestions={SUGGESTED_TRAVELERS}
                    />
                </div>

                {/* Included/Not Included */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">O que está incluído</label>
                    <PillInput 
                        value={newTripFormData.included || []} 
                        onChange={val => setNewTripFormData({...newTripFormData, included: val})} 
                        placeholder="Adicionar item (ex: Café da manhã, Guia turístico)"
                        suggestions={currentUserAgency.customSettings?.included || SUGGESTED_INCLUDED}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">O que NÃO está incluído</label>
                    <PillInput 
                        value={newTripFormData.notIncluded || []} 
                        onChange={val => setNewTripFormData({...newTripFormData, notIncluded: val})} 
                        placeholder="Adicionar item (ex: Passagens aéreas, Jantar)"
                        suggestions={currentUserAgency.customSettings?.notIncluded || SUGGESTED_NOT_INCLUDED}
                    />
                </div>

                {/* Itinerary */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Roteiro (Opcional)</label>
                    <div className="space-y-4">
                        {newTripFormData.itinerary?.map((item, index) => (
                            <div key={index} className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100 items-start">
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="number" 
                                        min="1"
                                        placeholder="Dia"
                                        value={item.day} 
                                        onChange={e => {
                                            const newItinerary = [...(newTripFormData.itinerary || [])];
                                            newItinerary[index] = { ...item, day: Number(e.target.value) };
                                            setNewTripFormData({ ...newTripFormData, itinerary: newItinerary });
                                        }} 
                                        className="w-20 border p-2 rounded-lg text-sm"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Título do dia"
                                        value={item.title} 
                                        onChange={e => {
                                            const newItinerary = [...(newTripFormData.itinerary || [])];
                                            newItinerary[index] = { ...item, title: e.target.value };
                                            setNewTripFormData({ ...newTripFormData, itinerary: newItinerary });
                                        }} 
                                        className="w-full border p-2 rounded-lg text-sm"
                                    />
                                    <textarea 
                                        placeholder="Descrição do dia"
                                        value={item.description} 
                                        onChange={e => {
                                            const newItinerary = [...(newTripFormData.itinerary || [])];
                                            newItinerary[index] = { ...item, description: e.target.value };
                                            setNewTripFormData({ ...newTripFormData, itinerary: newItinerary });
                                        }} 
                                        className="w-full border p-2 rounded-lg text-sm resize-y"
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setNewTripFormData({ ...newTripFormData, itinerary: (newTripFormData.itinerary || []).filter((_, i) => i !== index) })}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                                >
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setNewTripFormData({ ...newTripFormData, itinerary: [...(newTripFormData.itinerary || []), { day: (newTripFormData.itinerary?.length || 0) + 1, title: '', description: '' }] })}
                            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2"
                        >
                            <Plus size={18}/> Adicionar Dia
                        </button>
                    </div>
                </div>

                {/* Payment Methods */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento</label>
                    <PillInput 
                        value={newTripFormData.paymentMethods || []} 
                        onChange={val => setNewTripFormData({...newTripFormData, paymentMethods: val})} 
                        placeholder="Adicionar forma de pagamento (ex: Pix, Cartão de Crédito)"
                        suggestions={currentUserAgency.customSettings?.paymentMethods || SUGGESTED_PAYMENTS}
                    />
                </div>

                {/* Active/Featured */}
                <div className="flex items-center gap-4">
                    <label className="flex items-center text-sm text-gray-700">
                        <input 
                            type="checkbox" 
                            checked={newTripFormData.is_active || false} 
                            onChange={e => setNewTripFormData({...newTripFormData, is_active: e.target.checked})} 
                            className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        Pacote Ativo (visível ao público)
                    </label>
                    <label className="flex items-center text-sm text-gray-700">
                        <input 
                            type="checkbox" 
                            checked={newTripFormData.featured || false} 
                            onChange={e => setNewTripFormData({...newTripFormData, featured: e.target.checked})} 
                            className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        Destaque Global (aparece na Home da ViajaStore)
                    </label>
                    <label className="flex items-center text-sm text-gray-700">
                        <input 
                            type="checkbox" 
                            checked={newTripFormData.featuredInHero || false} 
                            onChange={e => setNewTripFormData({...newTripFormData, featuredInHero: e.target.checked})} 
                            className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        Destaque no Hero do Microsite
                    </label>
                </div>


                <button type="submit" disabled={isSubmittingForm} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmittingForm ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} 
                    {modalType === 'CREATE_TRIP' ? 'Criar Pacote' : 'Salvar Alterações'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agency Profile Modal */}
      {modalType === 'EDIT_AGENCY_PROFILE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Editar Perfil da Agência</h2>
            <form onSubmit={handleAgencyProfileUpdate} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label>
                    <input value={editAgencyFormData.name || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                    <textarea value={editAgencyFormData.description || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, description: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 h-24" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
                    <input value={editAgencyFormData.cnpj || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, cnpj: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                    <input value={editAgencyFormData.phone || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
                    <input value={editAgencyFormData.whatsapp || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input value={editAgencyFormData.website || ''} onChange={e => setEditAgencyFormData({...editAgencyFormData, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <button type="submit" disabled={isSubmittingForm} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSubmittingForm ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Alterações
                </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {modalType === 'MANAGE_SUBSCRIPTION' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Assinatura</h2>
                  {currentUserAgency.subscriptionStatus === 'ACTIVE' ? (
                      <div className="mb-6 bg-green-50 p-4 rounded-xl border border-green-100 text-green-800 flex items-center gap-3">
                          <CheckCircle size={20}/>
                          <div>
                              <p className="font-bold text-sm">Seu plano "{currentUserAgency.subscriptionPlan}" está ativo!</p>
                              <p className="text-xs">Expira em: {new Date(currentUserAgency.subscriptionExpiresAt).toLocaleDateString()}</p>
                          </div>
                      </div>
                  ) : (
                      <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 flex items-center gap-3">
                          <AlertCircle size={20}/>
                          <div>
                              <p className="font-bold text-sm">Sua assinatura está inativa.</p>
                              <p className="text-xs">Ative um plano para publicar pacotes e receber vendas.</p>
                          </div>
                      </div>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mb-4">Mudar Plano</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PLANS.map(plan => {
                          const isCurrent = currentUserAgency.subscriptionPlan === plan.id && currentUserAgency.subscriptionStatus === 'ACTIVE';
                          const isLoading = isActivatingPlan === plan.id;
                          return (
                              <button
                                  key={plan.id}
                                  onClick={() => handleSelectPlan(plan)}
                                  disabled={isCurrent || !!isActivatingPlan}
                                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${isCurrent ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-200 hover:border-primary-500 hover:shadow-md'}`}
                              >
                                  {isCurrent && <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Atual</span>}
                                  <p className="font-bold text-lg">{plan.name}</p>
                                  <p className="text-primary-600 text-xl font-extrabold">R$ {plan.price.toFixed(2)} <span className="text-sm font-normal text-gray-400">/mês</span></p>
                                  <p className="text-xs text-gray-500 mt-2">{plan.features[0]}</p>
                                  {!isCurrent && (
                                      <span className="mt-3 block text-sm font-bold text-primary-600 flex items-center gap-2">
                                          {isLoading ? <Loader size={16} className="animate-spin" /> : <Rocket size={16}/>} {isLoading ? 'Ativando...' : 'Selecionar'}
                                      </span>
                                  )}
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Theme Settings Modal */}
      {modalType === 'THEME_SETTINGS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalizar Tema do Microsite</h2>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                    <div className="flex gap-2 items-center">
                        <input type="color" value={currentUserAgency.colors?.primary || '#3b82f6'} onChange={e => handleSaveAgencyTheme({...currentUserAgency.colors, primary: e.target.value} as ThemeColors)} className="w-8 h-8 rounded-full border" />
                        <input value={currentUserAgency.colors?.primary || '#3b82f6'} onChange={e => handleSaveAgencyTheme({...currentUserAgency.colors, primary: e.target.value} as ThemeColors)} className="flex-1 border p-2.5 rounded-lg text-sm font-mono" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                    <div className="flex gap-2 items-center">
                        <input type="color" value={currentUserAgency.colors?.secondary || '#f97316'} onChange={e => handleSaveAgencyTheme({...currentUserAgency.colors, secondary: e.target.value} as ThemeColors)} className="w-8 h-8 rounded-full border" />
                        <input value={currentUserAgency.colors?.secondary || '#f97316'} onChange={e => handleSaveAgencyTheme({...currentUserAgency.colors, secondary: e.target.value} as ThemeColors)} className="flex-1 border p-2.5 rounded-lg text-sm font-mono" />
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <button onClick={() => showToast("Funcionalidade em desenvolvimento", "info")} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                        <Palette size={18}/> Ver Temas Pré-definidos
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Confirmation Modal */}
      {showSubscriptionConfirmation && (
          <SubscriptionConfirmationModal 
              plan={showSubscriptionConfirmation}
              onClose={() => setShowSubscriptionConfirmation(null)}
              onConfirm={handleConfirmSubscription}
              isSubmitting={isActivatingPlan === showSubscriptionConfirmation.id}
          />
      )}
    </div>
  );
};

export default AgencyDashboard;
