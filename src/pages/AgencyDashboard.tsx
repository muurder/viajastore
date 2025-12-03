
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan, Address, BankInfo } from '../types'; 
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreVertical, PauseCircle, PlayCircle, Plane, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle, ShieldCheck, Briefcase, LayoutDashboard, MessageCircle, User, Palette } from 'lucide-react'; 
import { supabase } from '../services/supabase';

// --- REUSABLE COMPONENTS (LOCAL TO THIS DASHBOARD) ---

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

interface ActionsMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default' }[] }
const ActionMenu: React.FC<ActionsMenuProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical size={18} />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right ring-1 ring-black/5">
                    <div className="py-1">
                        {actions.map((action, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { action.onClick(); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                <action.icon size={16} /> {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const MAX_IMAGES = 8;

const SUGGESTED_TAGS = ['Ecoturismo', 'História', 'Relaxamento', 'Esportes Radicais', 'Luxo', 'Econômico', 'All Inclusive', 'Pet Friendly', 'Acessível', 'LGBTQIA+'];
const SUGGESTED_TRAVELERS = ['SOZINHO', 'CASAL', 'FAMILIA', 'AMIGOS', 'MOCHILAO', 'MELHOR_IDADE'];
const SUGGESTED_PAYMENTS = ['Pix', 'Cartão de Crédito (até 12x)', 'Boleto Bancário', 'Transferência', 'Dinheiro'];
const SUGGESTED_INCLUDED = ['Hospedagem', 'Café da manhã', 'Passagens Aéreas', 'Transfer Aeroporto', 'Guia Turístico', 'Seguro Viagem', 'Ingressos', 'Almoço', 'Jantar', 'Passeios de Barco'];
const SUGGESTED_NOT_INCLUDED = ['Passagens Aéreas', 'Bebidas alcoólicas', 'Gorjetas', 'Despesas Pessoais', 'Jantar', 'Almoço', 'Taxas de Turismo'];

// Extracted NavButton Component
interface NavButtonProps {
  tabId: string;
  label: string;
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


// Extracted Action Menu for Trips
interface TripActionsMenuProps { 
  trip: Trip; 
  onEdit: (trip: Trip) => void; 
  onDuplicate: (trip: Trip) => void; 
  onDelete: (tripId: string) => void; 
  onToggleStatus: (tripId: string) => void; 
  fullAgencyLink: string; 
}
const TripActionsMenu: React.FC<TripActionsMenuProps> = ({ trip, onEdit, onDuplicate, onDelete, onToggleStatus, fullAgencyLink }) => {
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
        {/* FIX: Moved title to button element */}
        <button onClick={() => onEdit(trip)} title={isPublished ? 'Gerenciar' : 'Editar'} className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${isPublished ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-primary-200 hover:text-primary-600' : 'text-primary-700 bg-primary-50 border-primary-100 hover:bg-primary-100'}`}>{isPublished ? 'Gerenciar' : 'Editar'}</button>
        <button onClick={() => setIsOpen(!isOpen)} className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><MoreVertical size={20} /></button>
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[fadeIn_0.1s] origin-top-right ring-1 ring-black/5">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-50"><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ações do Pacote</p></div>
            {isPublished ? (
               <>
                 <Link to={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={() => setIsOpen(false)}><Eye size={16} className="mr-3 text-gray-400"/> Ver público</Link>
                 <button onClick={() => { onToggleStatus(trip.id); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-amber-600 transition-colors"><PauseCircle size={16} className="mr-3 text-gray-400"/> Pausar vendas</button>
               </>
            ) : (
               <>
                 <button onClick={() => { onToggleStatus(trip.id); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"><PlayCircle size={16} className="mr-3 text-green-500"/> {trip.is_active === false ? 'Publicar' : 'Retomar vendas'}</button>
                 <button onClick={() => { onEdit(trip); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:hidden transition-colors"><Edit size={16} className="mr-3 text-gray-400"/> Editar</button>
               </>
            )}
            <button onClick={() => { onDuplicate(trip); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Copy size={16} className="mr-3 text-gray-400"/> Duplicar</button>
            <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => { onDelete(trip.id); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-3"/> Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ToolbarButtonProps {
  cmd?: string;
  icon: React.ComponentType<LucideProps>;
  title?: string; // This title is for the HTML button element
  arg?: string;
  active?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ cmd, icon: Icon, title, arg, active = false }) => {
  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    // Note: The parent RichTextEditor will handle onChange through its onInput handler.
  };

  return (
    <button
      type="button"
      onClick={() => cmd && execCmd(cmd, arg)}
      className={`p-2 rounded-lg transition-all ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'}`}
      title={title}
    >
      <Icon size={18} />
    </button>
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
        {/* Fix: RichTextEditor continues */}
        <ToolbarButton cmd="insertOrderedList" icon={ListOrdered} title="Lista Ordenada" />
        <ToolbarButton cmd="insertUnorderedList" icon={List} title="Lista Não Ordenada" />
        <button type="button" onClick={addLink} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100" title="Adicionar Link"><LinkIcon size={18}/></button>
        <button type="button" onClick={addImage} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100" title="Adicionar Imagem"><ImageIcon size={18}/></button>
        <Divider />
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100 relative" title="Adicionar Emoji">
          <Smile size={18} />
          {showEmojiPicker && (
            <div className="absolute z-20 bg-white p-2 border border-gray-200 rounded-lg shadow-lg grid grid-cols-6 gap-1 top-full mt-2 left-0">
              {COMMON_EMOJIS.map((emoji, idx) => (
                <button key={idx} type="button" onClick={() => addEmoji(emoji)} className="p-1 text-lg hover:bg-gray-100 rounded-md">{emoji}</button>
              ))}
            </div>
          )}
        </button>
      </div>
      <div
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="flex-1 p-4 min-h-[150px] outline-none text-gray-800 leading-relaxed custom-scrollbar"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    </div>
  );
};


const AgencyDashboard: React.FC = () => {
  const { user, reloadUser, logout } = useAuth();
  const { 
    agencies, trips, agencyReviews, getAgencyTrips, getReviewsByAgencyId,
    getAgencyStats, updateAgencySubscription, updateAgencyProfileByAdmin,
    createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus,
    refreshData, getAgencyTheme, saveAgencyTheme,
  } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Redirect if not an agency or not logged in as agency
  useEffect(() => {
    if (!user || user.role !== UserRole.AGENCY) {
      navigate('/unauthorized', { replace: true });
    }
  }, [user, navigate]);

  const agency = user as Agency;
  const { agencySlug } = useParams<{ agencySlug?: string }>(); // Not directly used but to clarify context

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'REVIEWS' | 'SETTINGS'>((searchParams.get('tab')?.toUpperCase() as any) || 'OVERVIEW');

  const [isProcessing, setIsProcessing] = useState(false);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Agency-specific data
  const myTrips = useMemo(() => getAgencyTrips(agency.agencyId), [agency.agencyId, getAgencyTrips]);
  const myReviews = useMemo(() => getReviewsByAgencyId(agency.agencyId), [agency.agencyId, getReviewsByAgencyId]);
  const myStats = useMemo(() => getAgencyStats(agency.agencyId), [agency.agencyId, getAgencyStats]);

  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<Partial<Trip>>({
    title: '', description: '', destination: '', price: 0,
    startDate: '', endDate: '', durationDays: 1, images: [],
    category: 'PRAIA', tags: [], travelerTypes: [] as TravelerType[],
    itinerary: [], paymentMethods: [], included: [], notIncluded: [],
    is_active: false, featured: false, featuredInHero: false, popularNearSP: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  // Removed `newImageFile` as it was unused.
  const [itineraryDays, setItineraryDays] = useState([{ day: 1, title: '', description: '' }]);

  // Settings tab states
  const [settingsTab, setSettingsTab] = useState<'PROFILE' | 'HERO' | 'SUBSCRIPTION' | 'THEME'>('PROFILE');
  const [profileForm, setProfileForm] = useState({
    name: agency.name,
    description: agency.description,
    cnpj: agency.cnpj || '',
    slug: agency.slug,
    phone: agency.phone || '',
    whatsapp: agency.whatsapp || '',
    website: agency.website || '',
    address: agency.address || { zipCode: '', street: '', number: '', district: '', city: '', state: '' },
    bankInfo: agency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' },
  });
  const [heroForm, setHeroForm] = useState({
    heroMode: agency.heroMode,
    heroBannerUrl: agency.heroBannerUrl || '',
    heroTitle: agency.heroTitle || '',
    heroSubtitle: agency.heroSubtitle || '',
  });
  const [customSuggestionsForm, setCustomSuggestionsForm] = useState({
    tags: agency.customSettings?.tags || [],
    included: agency.customSettings?.included || [],
    notIncluded: agency.customSettings?.notIncluded || [],
    paymentMethods: agency.customSettings?.paymentMethods || [],
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  // FIX: Initialize themeForm with a default value, will be updated by useEffect
  const [themeForm, setThemeForm] = useState<ThemeColors>({ primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' }); 
  const { setAgencyTheme, resetAgencyTheme } = useTheme();

  // Handle URL tab changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')?.toUpperCase();
    if (tabFromUrl && ['OVERVIEW', 'TRIPS', 'REVIEWS', 'SETTINGS'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as 'OVERVIEW' | 'TRIPS' | 'REVIEWS' | 'SETTINGS');
    }
    // For SETTINGS tab, also check sub-tab
    if (tabFromUrl === 'SETTINGS') {
      const subTabFromUrl = searchParams.get('subtab')?.toUpperCase();
      if (subTabFromUrl && ['PROFILE', 'HERO', 'SUBSCRIPTION', 'THEME'].includes(subTabFromUrl)) {
        setSettingsTab(subTabFromUrl as 'PROFILE' | 'HERO' | 'SUBSCRIPTION' | 'THEME');
      } else {
        setSettingsTab('PROFILE'); // Default sub-tab
      }
    }
  }, [searchParams]);

  // Sync profileForm with agency data
  useEffect(() => {
    if (agency) {
      setProfileForm({
        name: agency.name,
        description: agency.description,
        cnpj: agency.cnpj || '',
        slug: agency.slug,
        phone: agency.phone || '',
        whatsapp: agency.whatsapp || '',
        website: agency.website || '',
        address: agency.address || { zipCode: '', street: '', number: '', district: '', city: '', state: '' },
        bankInfo: agency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' },
      });
      setHeroForm({
        heroMode: agency.heroMode,
        heroBannerUrl: agency.heroBannerUrl || '',
        heroTitle: agency.heroTitle || '',
        heroSubtitle: agency.heroSubtitle || '',
      });
      setCustomSuggestionsForm({
        tags: agency.customSettings?.tags || [],
        included: agency.customSettings?.included || [],
        notIncluded: agency.customSettings?.notIncluded || [],
        paymentMethods: agency.customSettings?.paymentMethods || [],
      });
    }
  }, [agency]);

  // Fix: Fetch and set agency's custom theme when component mounts or agency changes
  useEffect(() => {
    const fetchAgencyCustomTheme = async () => {
      if (agency?.agencyId) {
        const agencyTheme = await getAgencyTheme(agency.agencyId);
        if (agencyTheme) {
          setThemeForm(agencyTheme.colors);
        }
      }
    };
    fetchAgencyCustomTheme();
  }, [agency?.agencyId, getAgencyTheme]);


  const handleTabChange = (tab: 'OVERVIEW' | 'TRIPS' | 'REVIEWS' | 'SETTINGS') => {
    setActiveTab(tab);
    setSearchParams({ tab: tab.toLowerCase() });
  };

  const handleSettingsTabChange = (tab: 'PROFILE' | 'HERO' | 'SUBSCRIPTION' | 'THEME') => {
    setSettingsTab(tab);
    setSearchParams({ tab: 'settings', subtab: tab.toLowerCase() });
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setSubscriptionModalOpen(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan || !user) return;
    setIsProcessing(true);
    setActivatingPlanId(selectedPlan.id);
    try {
      await updateAgencySubscription(agency.agencyId, 'ACTIVE', selectedPlan.id as 'BASIC' | 'PREMIUM', new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString());
      showToast('Assinatura ativada com sucesso!', 'success');
      setSubscriptionModalOpen(false);
      await reloadUser(); // Reload user to update agency status
    } catch (error) {
      showToast('Erro ao ativar assinatura. Tente novamente.', 'error');
    } finally {
      setIsProcessing(false);
      setActivatingPlanId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Trip Management Handlers
  const handleCreateNewTrip = () => {
    setTripForm({
      title: '', description: '', destination: '', price: 0,
      startDate: '', endDate: '', durationDays: 1, images: [],
      category: 'PRAIA', tags: agency.customSettings?.tags || [], travelerTypes: [] as TravelerType[],
      itinerary: [{ day: 1, title: '', description: '' }], paymentMethods: agency.customSettings?.paymentMethods || [], included: agency.customSettings?.included || [], notIncluded: agency.customSettings?.notIncluded || [],
      is_active: false, featured: false, featuredInHero: false, popularNearSP: false,
    });
    setItineraryDays([{ day: 1, title: '', description: '' }]);
    setIsNewTripModalOpen(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setTripForm({
      ...trip,
      startDate: trip.startDate.slice(0, 16), // Format for datetime-local
      endDate: trip.endDate.slice(0, 16),     // Format for datetime-local
      itinerary: trip.itinerary || [{ day: 1, title: '', description: '' }],
    });
    setItineraryDays(trip.itinerary || [{ day: 1, title: '', description: '' }]);
    setIsEditTripModalOpen(true);
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== UserRole.AGENCY) return;
    setIsProcessing(true);

    try {
      const tripData: Trip = {
        ...tripForm as Trip,
        agencyId: agency.agencyId,
        id: editingTrip?.id || crypto.randomUUID(), // Ensure ID is set for new trips
        slug: tripForm.slug || slugify(tripForm.title || ''),
        itinerary: itineraryDays.filter(item => item.title && item.description),
        // Ensure images is an array of strings
        images: tripForm.images?.filter(Boolean) as string[],
        // Ensure dates are correctly formatted as ISO strings if they are `datetime-local` inputs
        startDate: tripForm.startDate ? new Date(tripForm.startDate).toISOString() : new Date().toISOString(),
        endDate: tripForm.endDate ? new Date(tripForm.endDate).toISOString() : new Date().toISOString(),
      };

      if (editingTrip) {
        await updateTrip(tripData);
        showToast('Viagem atualizada com sucesso!', 'success');
      } else {
        await createTrip(tripData);
        showToast('Viagem criada com sucesso!', 'success');
      }
      setIsNewTripModalOpen(false);
      setIsEditTripModalOpen(false);
      setEditingTrip(null);
      await refreshData(); // Refresh global data after change
    } catch (error: any) {
      showToast('Erro ao salvar viagem: ' + error.message, 'error');
      console.error('Erro ao salvar viagem:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateTrip = async (originalTrip: Trip) => {
    if (!user || user.role !== UserRole.AGENCY || isProcessing) return;
    if (!window.confirm(`Tem certeza que deseja duplicar a viagem "${originalTrip.title}"?`)) return;

    setIsProcessing(true);
    try {
      const duplicatedTrip: Trip = {
        ...originalTrip,
        id: crypto.randomUUID(), // New ID
        title: `Cópia de ${originalTrip.title}`,
        slug: slugify(`Copia de ${originalTrip.title}-${Math.random().toString(36).substring(2, 7)}`),
        is_active: false, // Duplicated trips start as inactive
        featured: false, featuredInHero: false, popularNearSP: false, // Clear featured status
        views: 0, sales: 0, // Reset stats
      };
      await createTrip(duplicatedTrip);
      showToast('Viagem duplicada com sucesso! Ela está inativa por enquanto.', 'success');
      await refreshData();
    } catch (error: any) {
      showToast('Erro ao duplicar viagem: ' + error.message, 'error');
      console.error('Erro ao duplicar viagem:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!user || user.role !== UserRole.AGENCY || isProcessing) return;
    if (!window.confirm('Tem certeza que deseja excluir esta viagem? Esta ação é irreversível.')) return;

    setIsProcessing(true);
    try {
      await deleteTrip(tripId);
      showToast('Viagem excluída com sucesso!', 'success');
      await refreshData();
    } catch (error: any) {
      showToast('Erro ao excluir viagem: ' + error.message, 'error');
      console.error('Erro ao excluir viagem:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTripStatus = async (tripId: string) => {
    if (!user || user.role !== UserRole.AGENCY || isProcessing) return;
    setIsProcessing(true);
    try {
      await toggleTripStatus(tripId); // This also shows toast
      await refreshData();
    } catch (error) {
      console.error('Erro ao alternar status da viagem:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Image Upload for Trip Form
  const handleTripImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !agency || !e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${agency.agencyId}-${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('trip-images').upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('trip-images').getPublicUrl(data.path);
      if (publicUrlData.publicUrl) {
        setTripForm(prev => ({
          ...prev,
          images: [...(prev.images || []), publicUrlData.publicUrl]
        }));
        showToast('Imagem enviada com sucesso!', 'success');
      }
    } catch (error: any) {
      showToast('Erro ao enviar imagem: ' + error.message, 'error');
      console.error('Erro no upload de imagem:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveTripImage = (indexToRemove: number) => {
    setTripForm(prev => ({
      ...prev,
      images: prev.images?.filter((_, index) => index !== indexToRemove) || []
    }));
  };

  // Itinerary Handlers
  const addItineraryDay = () => setItineraryDays(prev => [...prev, { day: prev.length + 1, title: '', description: '' }]);
  const updateItineraryDay = (index: number, field: 'title' | 'description', value: string) => {
    setItineraryDays(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
  };
  const removeItineraryDay = (indexToRemove: number) => {
    setItineraryDays(prev => prev.filter((_, index) => index !== indexToRemove).map((item, idx) => ({ ...item, day: idx + 1 })));
  };

  // Profile Settings Handlers
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await updateAgencyProfileByAdmin(agency.agencyId, {
        name: profileForm.name,
        description: profileForm.description,
        cnpj: profileForm.cnpj,
        slug: profileForm.slug,
        phone: profileForm.phone,
        whatsapp: profileForm.whatsapp,
        website: profileForm.website,
        address: profileForm.address,
        bankInfo: profileForm.bankInfo,
        customSettings: customSuggestionsForm, // Update custom suggestions
      });
      showToast('Perfil da agência atualizado!', 'success');
      await reloadUser(); // Reload user to get updated agency data
    } catch (error: any) {
      showToast('Erro ao atualizar perfil: ' + error.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleHeroSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      await updateAgencyProfileByAdmin(agency.agencyId, heroForm);
      showToast('Configurações da Página Principal atualizadas!', 'success');
      await reloadUser();
    } catch (error: any) {
      showToast('Erro ao atualizar configurações: ' + error.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Theme Settings
  const handleSaveAgencyTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      const success = await saveAgencyTheme(agency.agencyId, themeForm);
      if (success) {
        showToast('Tema salvo e aplicado!', 'success');
        setAgencyTheme(themeForm); // Apply theme immediately
      } else {
        showToast('Erro ao salvar tema.', 'error');
      }
    } catch (error: any) {
      showToast('Erro ao salvar tema: ' + error.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePreviewTheme = () => {
    setAgencyTheme(themeForm);
    showToast('Visualizando tema.', 'info');
  };

  const handleResetThemePreview = () => {
    resetAgencyTheme();
    showToast('Visualização de tema resetada.', 'info');
  };

  // Check if agency is active
  if (agency.subscriptionStatus !== 'ACTIVE') {
    return (
      <SubscriptionActivationView
        agency={agency}
        onSelectPlan={handleSelectPlan}
        activatingPlanId={activatingPlanId}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {/* Subscription Confirmation Modal */}
      {subscriptionModalOpen && selectedPlan && (
        <SubscriptionConfirmationModal
          plan={selectedPlan}
          onClose={() => setSubscriptionModalOpen(false)}
          onConfirm={handleConfirmSubscription}
          isSubmitting={isProcessing}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Painel da Agência</h1>
        <div className="flex flex-wrap gap-3">
            <Link to={`/${agency.slug}`} target="_blank" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors">
                <ExternalLink size={18} className="mr-2"/> Ver Página Pública
            </Link>
            <button onClick={handleLogout} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-red-100 transition-colors">
                <LogOut size={18} className="mr-2"/> Sair
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={LayoutDashboard} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="TRIPS" label="Minhas Viagens" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} hasNotification={myReviews.length > 0} />
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Viagens Ativas" value={myTrips.length} subtitle="Pacotes disponíveis para venda" icon={Briefcase} color="blue"/>
            <StatCard title="Receita Estimada" value={`R$ ${myStats.totalRevenue.toLocaleString('pt-BR')}`} subtitle="Total de vendas confirmadas" icon={DollarSign} color="green"/>
            <StatCard title="Avaliação Média" value={myStats.averageRating?.toFixed(1) || '0.0'} subtitle={`${myStats.totalReviews} avaliações`} icon={Star} color="amber"/>
            <StatCard title="Conversão" value={myStats.conversionRate.toFixed(1)} subtitle="Visualizações para vendas" icon={BarChart2} color="purple"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MessageCircle size={20} className="mr-2 text-primary-600"/> Últimas Avaliações</h3>
                {myReviews.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                        {myReviews.slice(0, 5).map(review => (
                            <div key={review.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3 mb-1">
                                    <img src={review.clientAvatar || `https://ui-avatars.com/api/?name=${review.clientName || 'V'}`} className="w-8 h-8 rounded-full" alt=""/>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                                        <div className="flex text-amber-400 text-xs">
                                            {[...Array(5)].map((_,i) => <Star key={i} size={10} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">"{review.comment}"</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma avaliação ainda.</div>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Clock size={20} className="mr-2 text-secondary-600"/> Atividade de Viagens</h3>
                {myTrips.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                        {myTrips.sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0,5).map(trip => (
                            <div key={trip.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                <img src={trip.images[0] || 'https://placehold.co/50x50/e2e8f0/e2e8f0'} className="w-12 h-10 rounded-lg object-cover flex-shrink-0" alt=""/>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="flex items-center"><Eye size={12} className="mr-1"/> {trip.views || 0}</span>
                                        <span className="flex items-center"><ShoppingBag size={12} className="mr-1"/> {trip.sales || 0}</span>
                                    </div>
                                </div>
                                <Link to={`/agency/dashboard?tab=TRIPS`} className="text-primary-600 text-xs font-bold hover:underline">Ver</Link>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma viagem cadastrada.</div>
                )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'TRIPS' && (
        <div className="animate-[fadeIn_0.3s]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Minhas Viagens ({myTrips.length})</h2>
            <button onClick={handleCreateNewTrip} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors"><Plus size={18} className="mr-2"/> Nova Viagem</button>
          </div>
          {myTrips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTrips.map(trip => (
                <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="relative h-48 w-full">
                    <img src={trip.images[0] || 'https://placehold.co/400x300/e2e8f0/e2e8f0'} alt={trip.title} className="w-full h-full object-cover"/>
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{trip.category.replace('_', ' ')}</div>
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {trip.is_active ? (
                            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ATIVO</span>
                        ) : (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">INATIVO</span>
                        )}
                        <span className="relative inline-block">
                           <TripActionsMenu 
                                trip={trip} 
                                onEdit={handleEditTrip} 
                                onDuplicate={handleDuplicateTrip} 
                                onDelete={handleDeleteTrip} 
                                onToggleStatus={handleToggleTripStatus} 
                                fullAgencyLink={`/${agency.slug}`} 
                            />
                        </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{trip.title}</h3>
                    <p className="text-sm text-gray-600 flex items-center mb-3"><MapPin size={16} className="mr-2 text-primary-500"/> {trip.destination}</p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                      <span className="text-xl font-bold text-gray-900">R$ {trip.price.toLocaleString('pt-BR')}</span>
                      <button onClick={() => handleEditTrip(trip)} className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-100 transition-colors">Gerenciar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Plane size={32} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma viagem cadastrada</h3>
              <p className="text-gray-500 mb-6">Comece a vender criando seu primeiro pacote!</p>
              <button onClick={handleCreateNewTrip} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold flex items-center mx-auto hover:bg-primary-700 transition-colors"><Plus size={18} className="mr-2"/> Criar Primeira Viagem</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'REVIEWS' && (
        <div className="animate-[fadeIn_0.3s]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações ({myReviews.length})</h2>
          {myReviews.length > 0 ? (
            <div className="space-y-6">
              {myReviews.map(review => (
                <div key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <img src={review.clientAvatar || `https://ui-avatars.com/api/?name=${review.clientName || 'V'}`} className="w-10 h-10 rounded-full object-cover border border-gray-200" alt=""/>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                        <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                    </div>
                  </div>
                  {review.tripTitle && (
                      <div className="mb-4 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block">
                          Avaliação do pacote: <span className="font-bold text-gray-700">{review.tripTitle}</span>
                      </div>
                  )}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                  
                  {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                          {review.tags.map(tag => (
                              <span key={tag} className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">{tag}</span>
                          ))}
                      </div>
                  )}
                  
                  {review.response && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-xs font-bold text-gray-600 mb-2">Resposta da agência</p>
                              <p className="text-sm text-gray-700 italic">"{review.response}"</p>
                          </div>
                      </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Star size={32} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma avaliação recebida</h3>
              <p className="text-gray-500 mb-6">Incentive seus clientes a deixar uma avaliação para você!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'SETTINGS' && (
        <div className="animate-[fadeIn_0.3s]">
          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
            <NavButton tabId="PROFILE" label="Perfil da Agência" icon={User} activeTab={settingsTab} onClick={handleSettingsTabChange} />
            <NavButton tabId="HERO" label="Página Principal" icon={MonitorPlay} activeTab={settingsTab} onClick={handleSettingsTabChange} />
            <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} activeTab={settingsTab} onClick={handleSettingsTabChange} />
            <NavButton tabId="THEME" label="Tema do Microsite" icon={Palette} activeTab={settingsTab} onClick={handleSettingsTabChange} />
          </div>

          {settingsTab === 'PROFILE' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados da Agência</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Agência</label>
                    <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                    <textarea value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} rows={4} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">CNPJ</label>
                    <input type="text" value={profileForm.cnpj} onChange={e => setProfileForm({...profileForm, cnpj: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="00.000.000/0000-00"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Slug (URL do Microsite)</label>
                    <input type="text" value={profileForm.slug} readOnly className="w-full border p-3 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed" title="O slug é gerado automaticamente e não pode ser alterado diretamente."/>
                    <p className="text-xs text-gray-500 mt-1">Seu microsite estará disponível em <span className="font-mono text-primary-600">viajastore.com/<span className="font-bold">{profileForm.slug}</span></span></p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
                    <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
                    <input type="text" value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
                    <input type="url" value={profileForm.website} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                  </div>
                </div>

                <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Endereço Fiscal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 mb-2">CEP</label>
                            <input type="text" value={profileForm.address?.zipCode || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, zipCode: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Rua</label>
                            <input type="text" value={profileForm.address?.street || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, street: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Número</label>
                            <input type="text" value={profileForm.address?.number || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, number: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Complemento</label>
                            <input type="text" value={profileForm.address?.complement || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, complement: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Bairro</label>
                            <input type="text" value={profileForm.address?.district || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, district: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Cidade</label>
                            <input type="text" value={profileForm.address?.city || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, city: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Estado (UF)</label>
                            <input type="text" value={profileForm.address?.state || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, state: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Dados Bancários para Recebimento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Banco</label>
                            <input type="text" value={profileForm.bankInfo?.bank || ''} onChange={e => setProfileForm({...profileForm, bankInfo: {...profileForm.bankInfo, bank: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Agência</label>
                            <input type="text" value={profileForm.bankInfo?.agency || ''} onChange={e => setProfileForm({...profileForm, bankInfo: {...profileForm.bankInfo, agency: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Conta</label>
                            <input type="text" value={profileForm.bankInfo?.account || ''} onChange={e => setProfileForm({...profileForm, bankInfo: {...profileForm.bankInfo, account: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Chave Pix</label>
                            <input type="text" value={profileForm.bankInfo?.pixKey || ''} onChange={e => setProfileForm({...profileForm, bankInfo: {...profileForm.bankInfo, pixKey: e.target.value}})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Sugestões de Conteúdo (para seus pacotes)</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tags Personalizadas</label>
                            <PillInput 
                                value={customSuggestionsForm.tags} 
                                onChange={newTags => setCustomSuggestionsForm({...customSuggestionsForm, tags: newTags})} 
                                placeholder="Adicione tags para seus pacotes (ex: trilha, luxo)"
                                suggestions={SUGGESTED_TAGS}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Itens Incluídos Padrão</label>
                            <PillInput 
                                value={customSuggestionsForm.included} 
                                onChange={newIncluded => setCustomSuggestionsForm({...customSuggestionsForm, included: newIncluded})} 
                                placeholder="Adicione itens que geralmente estão incluídos"
                                suggestions={SUGGESTED_INCLUDED}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento Aceitas</label>
                            <PillInput 
                                value={customSuggestionsForm.paymentMethods} 
                                onChange={newMethods => setCustomSuggestionsForm({...customSuggestionsForm, paymentMethods: newMethods})} 
                                placeholder="Adicione formas de pagamento (ex: Pix, Cartão)"
                                suggestions={SUGGESTED_PAYMENTS}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Itens Não Incluídos Padrão</label>
                            <PillInput 
                                value={customSuggestionsForm.notIncluded} 
                                onChange={newNotIncluded => setCustomSuggestionsForm({...customSuggestionsForm, notIncluded: newNotIncluded})} 
                                placeholder="Adicione o que não está incluído (ex: passagens aéreas)"
                                suggestions={SUGGESTED_NOT_INCLUDED}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t">
                  <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingSettings ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Perfil da Agência
                  </button>
                </div>
              </form>
            </div>
          )}

          {settingsTab === 'HERO' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuração da Página Principal (Microsite)</h2>
              <form onSubmit={handleHeroSettingsUpdate} className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Modo da Página Principal</label>
                  <select value={heroForm.heroMode} onChange={e => setHeroForm({...heroForm, heroMode: e.target.value as 'TRIPS' | 'STATIC'})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                    <option value="TRIPS">Carrossel de Pacotes (Destaque seus pacotes)</option>
                    <option value="STATIC">Imagem Estática (Com título e subtítulo personalizados)</option>
                  </select>
                </div>

                {heroForm.heroMode === 'STATIC' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">URL do Banner</label>
                      <input type="url" value={heroForm.heroBannerUrl} onChange={e => setHeroForm({...heroForm, heroBannerUrl: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" placeholder="https://exemplo.com/sua-imagem.jpg"/>
                      {heroForm.heroBannerUrl && <img src={heroForm.heroBannerUrl} alt="Prévia do Banner" className="mt-4 max-h-48 object-cover rounded-lg shadow-sm"/>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Título do Banner</label>
                      <input type="text" value={heroForm.heroTitle} onChange={e => setHeroForm({...heroForm, heroTitle: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Subtítulo do Banner</label>
                      <textarea value={heroForm.heroSubtitle} onChange={e => setHeroForm({...heroForm, heroSubtitle: e.target.value})} rows={3} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                    </div>
                  </>
                )}
                
                <div className="mt-8 pt-8 border-t">
                  <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingSettings ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Configurações da Página Principal
                  </button>
                </div>
              </form>
            </div>
          )}

          {settingsTab === 'SUBSCRIPTION' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Seu Plano de Assinatura</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {PLANS.map(plan => {
                  const isActivePlan = agency.subscriptionPlan === plan.id;
                  const daysLeft = Math.round((new Date(agency.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={plan.id} className={`bg-white p-8 rounded-2xl border transition-all relative ${isActivePlan ? 'border-primary-500 shadow-lg' : 'border-gray-200'}`}>
                      {isActivePlan && <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-md">Seu Plano Atual</div>}
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
                      {isActivePlan ? (
                        <>
                          <p className={`text-sm text-center font-bold mt-4 ${daysLeft < 30 && daysLeft > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                              {daysLeft > 0 ? `Expira em ${daysLeft} dias (${new Date(agency.subscriptionExpiresAt).toLocaleDateString()})` : 'Expirado'}
                          </p>
                          <button disabled className="w-full py-3 rounded-xl font-bold transition-colors bg-gray-200 text-gray-500 cursor-not-allowed">
                            Plano Ativo
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleSelectPlan(plan)} disabled={isProcessing} className="w-full py-3 rounded-xl font-bold transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                          {isProcessing ? <Loader size={16} className="animate-spin" /> : 'Mudar para este Plano'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-gray-500 text-sm mt-8">
                  Para gerenciar sua fatura ou cancelar a assinatura, entre em contato com nosso suporte.
              </p>
            </div>
          )}

          {settingsTab === 'THEME' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Tema do Seu Microsite</h2>
              <form onSubmit={handleSaveAgencyTheme} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-8 h-8 rounded-full border" />
                      <input type="text" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-8 h-8 rounded-full border" />
                      <input type="text" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-gray-100 flex gap-4">
                  <button type="submit" disabled={isSavingSettings} className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingSettings ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Tema
                  </button>
                  <button type="button" onClick={handlePreviewTheme} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                    <Eye size={18}/> Prévia
                  </button>
                  <button type="button" onClick={handleResetThemePreview} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                    <X size={18}/> Limpar Prévia
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* New Trip Modal */}
      {(isNewTripModalOpen || isEditTripModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setIsNewTripModalOpen(false); setIsEditTripModalOpen(false); setEditingTrip(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingTrip ? `Editar Viagem: ${editingTrip.title}` : 'Criar Nova Viagem'}</h2>
            
            <form onSubmit={handleSaveTrip} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título da Viagem</label>
                <input type="text" value={tripForm.title || ''} onChange={e => setTripForm({...tripForm, title: e.target.value, slug: slugify(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Slug (URL)</label>
                <input type="text" value={tripForm.slug || ''} readOnly className="w-full border p-3 rounded-lg outline-none bg-gray-100 text-gray-600 cursor-not-allowed" title="O slug é gerado automaticamente a partir do título."/>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                <RichTextEditor value={tripForm.description || ''} onChange={val => setTripForm({...tripForm, description: val})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Destino</label>
                  <input type="text" value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label>
                  <input type="number" value={tripForm.price || 0} onChange={e => setTripForm({...tripForm, price: parseFloat(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required min="0"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label>
                  <input type="datetime-local" value={tripForm.startDate || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Data de Término</label>
                  <input type="datetime-local" value={tripForm.endDate || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Duração (dias)</label>
                  <input type="number" value={tripForm.durationDays || 1} onChange={e => setTripForm({...tripForm, durationDays: parseInt(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required min="1"/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                  <select value={tripForm.category || 'PRAIA'} onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required>
                    {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 'NATUREZA', 'CULTURA', 'GASTRONOMICO', 'VIDA_NOTURNA', 'VIAGEM_BARATA', 'ARTE'].map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipos de Viajantes</label>
                <PillInput 
                    value={tripForm.travelerTypes || []} 
                    onChange={types => setTripForm({...tripForm, travelerTypes: types as TravelerType[]})} 
                    placeholder="Adicione tipos de viajantes (ex: casal, sozinho)"
                    suggestions={SUGGESTED_TRAVELERS}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags da Viagem</label>
                <PillInput 
                    value={tripForm.tags || []} 
                    onChange={tags => setTripForm({...tripForm, tags: tags})} 
                    placeholder="Adicione tags (ex: histórico, trilhas)"
                    suggestions={SUGGESTED_TAGS}
                    customSuggestions={agency.customSettings?.tags}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Itens Incluídos</label>
                <PillInput 
                    value={tripForm.included || []} 
                    onChange={included => setTripForm({...tripForm, included: included})} 
                    placeholder="Adicione o que está incluído (ex: café da manhã)"
                    suggestions={SUGGESTED_INCLUDED}
                    customSuggestions={agency.customSettings?.included}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Itens Não Incluídos (Opcional)</label>
                <PillInput 
                    value={tripForm.notIncluded || []} 
                    onChange={notIncluded => setTripForm({...tripForm, notIncluded: notIncluded})} 
                    placeholder="Adicione o que não está incluído (ex: passagens aéreas)"
                    suggestions={SUGGESTED_NOT_INCLUDED}
                    customSuggestions={agency.customSettings?.notIncluded}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento</label>
                <PillInput 
                    value={tripForm.paymentMethods || []} 
                    onChange={methods => setTripForm({...tripForm, paymentMethods: methods})} 
                    placeholder="Adicione formas de pagamento (ex: Pix, Cartão)"
                    suggestions={SUGGESTED_PAYMENTS}
                    customSuggestions={agency.customSettings?.paymentMethods}
                />
              </div>

              {/* Itinerary */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">Roteiro Diário <Info size={16} className="ml-2 text-gray-500" title="Descreva cada dia da viagem"/></h3>
                <div className="space-y-4">
                  {itineraryDays.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100 relative">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Dia {item.day}</p>
                      <input type="text" value={item.title} onChange={e => updateItineraryDay(index, 'title', e.target.value)} placeholder="Título do Dia (ex: Chegada e City Tour)" className="w-full border p-2 rounded-lg mb-2 outline-none focus:border-primary-500"/>
                      <textarea value={item.description} onChange={e => updateItineraryDay(index, 'description', e.target.value)} placeholder="Descrição detalhada das atividades do dia" rows={3} className="w-full border p-2 rounded-lg outline-none focus:border-primary-500"/>
                      {itineraryDays.length > 1 && (
                        <button type="button" onClick={() => removeItineraryDay(index)} className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><X size={16}/></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItineraryDay} className="mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200"><Plus size={18} className="mr-2"/> Adicionar Dia</button>
              </div>

              {/* Images */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">Imagens da Viagem ({tripForm.images?.length || 0}/{MAX_IMAGES})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {tripForm.images?.map((img, index) => (
                    <div key={index} className="relative h-28 bg-gray-100 rounded-lg overflow-hidden group">
                      <img src={img} alt={`Viagem imagem ${index + 1}`} className="w-full h-full object-cover"/>
                      <button type="button" onClick={() => handleRemoveTripImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                    </div>
                  ))}
                  {(tripForm.images?.length || 0) < MAX_IMAGES && (
                    <label className="flex flex-col items-center justify-center h-28 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors">
                      {uploadingImage ? <Loader size={24} className="animate-spin"/> : <Upload size={24}/>}
                      <span className="text-xs mt-2">Adicionar Imagem</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleTripImageUpload} disabled={uploadingImage}/>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 flex items-center gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={tripForm.is_active || false} onChange={e => setTripForm({...tripForm, is_active: e.target.checked})} className="form-checkbox h-5 w-5 text-primary-600 rounded border-gray-300"/>
                  <span className="text-sm font-medium text-gray-700">Viagem Ativa (Publicar)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={tripForm.featured || false} onChange={e => setTripForm({...tripForm, featured: e.target.checked})} className="form-checkbox h-5 w-5 text-primary-600 rounded border-gray-300"/>
                  <span className="text-sm font-medium text-gray-700">Destaque Global</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" checked={tripForm.featuredInHero || false} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="form-checkbox h-5 w-5 text-primary-600 rounded border-gray-300"/>
                  <span className="text-sm font-medium text-gray-700">Destaque na Home da Agência</span>
                </label>
              </div>

              <div className="mt-8 pt-8 border-t">
                <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isProcessing ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} {editingTrip ? 'Salvar Alterações' : 'Criar Viagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyDashboard;
