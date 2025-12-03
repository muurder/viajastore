
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan, Address, BankInfo } from '../types'; 
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreVertical, PauseCircle, PlayCircle, Plane, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle, ShieldCheck, Briefcase, LayoutDashboard } from 'lucide-react'; // Added Briefcase, LayoutDashboard
import { supabase } from '../services/supabase';

// --- REUSABLE COMPONENTS (LOCAL TO THIS DASHBOARD) - Copied from AdminDashboard.tsx to adhere to "no new files" ---

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

interface ActionsMenuProps { trip: Trip; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onToggleStatus: () => void; fullAgencyLink: string; }
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


const AgencyDashboard: React.FC = () => {
  const { user, reloadUser, logout } = useAuth();
  const { 
    agencies, trips, agencyReviews, getAgencyTrips, getReviewsByAgencyId,
    getAgencyStats, updateAgencySubscription, updateAgencyProfileByAdmin,
    createTrip, updateTrip, deleteTrip, toggleTripStatus, toggleTripFeatureStatus,
    refreshData, incrementTripViews, getAgencyTheme, saveAgencyTheme,
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
    category: 'PRAIA', tags: [], travelerTypes: [],
    itinerary: [], paymentMethods: [], included: [], notIncluded: [],
    is_active: false, featured: false, featuredInHero: false, popularNearSP: false,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
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
  // Fix: Initialize themeForm with a default value, will be updated by useEffect
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
      category: 'PRAIA', tags: agency.customSettings?.tags || [], travelerTypes: [],
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
        <button onClick={() => handleTabChange('OVERVIEW')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'OVERVIEW' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><LayoutDashboard size={16}/> Visão Geral</button>
        <button onClick={() => handleTabChange('TRIPS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'TRIPS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Plane size={16}/> Minhas Viagens</button>
        <button onClick={() => handleTabChange('REVIEWS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'REVIEWS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Star size={16}/> Avaliações ({myReviews.length})</button>
        <button onClick={() => handleTabChange('SETTINGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'SETTINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Settings size={16}/> Configurações</button>
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
                           <button onClick={() => {}} className="p-1.5 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm text-gray-600 hover:text-gray-900 transition-colors shadow-sm"><MoreVertical size={18} /></button>
                           {/* Action Menu for each trip */}
                           <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
                                <div className="py-1">
                                    <Link to={`/${agency.slug}/viagem/${trip.slug || trip.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"><Eye size={16} className="mr-3 text-gray-400"/> Ver público</Link>
                                    <button onClick={() => handleEditTrip(trip)} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"><Edit size={16} className="mr-3 text-gray-400"/> Editar</button>
                                    <button onClick={() => handleToggleTripStatus(trip.id)} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-orange-600 transition-colors">{trip.is_active ? <PauseCircle size={16} className="mr-3"/> : <PlayCircle size={16} className="mr-3"/>} {trip.is_active ? 'Pausar Vendas' : 'Publicar Viagem'}</button>
                                    <button onClick={() => handleDuplicateTrip(trip)} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors"><Copy size={16} className="mr-3"/> Duplicar</button>
                                    <div className="border-t border-gray-100 mt-1 pt-1">
                                        <button onClick={() => handleDeleteTrip(trip.id)} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-3"/> Excluir</button>
                                    </div>
                                </div>
                           </div>
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
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                  {review.tags && review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                          {review.tags.map(tag => (
                              <span key={tag} className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">{tag}</span>
                          ))}
                      </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {review.response ? (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-bold text-gray-600 mb-2">Sua Resposta:</p>
                        <p className="text-sm text-gray-700 italic">"{review.response}"</p>
                      </div>
                    ) : (
                      <button className="text-primary-600 text-sm font-bold hover:underline">Responder Avaliação</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Star size={32} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma avaliação recebida</h3>
              <p className="text-gray-500 mb-6">Compartilhe suas viagens para começar a receber feedback!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'SETTINGS' && (
        <div className="animate-[fadeIn_0.3s]">
          <div className="flex border-b border-gray-200 mb-6 bg-white rounded-xl shadow-sm overflow-x-auto scrollbar-hide">
              <button onClick={() => handleSettingsTabChange('PROFILE')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${settingsTab === 'PROFILE' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><User size={16} className="inline mr-2"/> Perfil</button>
              <button onClick={() => handleSettingsTabChange('HERO')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${settingsTab === 'HERO' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><MonitorPlay size={16} className="inline mr-2"/> Página Inicial</button>
              <button onClick={() => handleSettingsTabChange('THEME')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${settingsTab === 'THEME' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Palette size={16} className="inline mr-2"/> Tema</button>
              <button onClick={() => handleSettingsTabChange('SUBSCRIPTION')} className={`flex-1 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${settingsTab === 'SUBSCRIPTION' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CreditCard size={16} className="inline mr-2"/> Assinatura</button>
          </div>

          {settingsTab === 'PROFILE' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Dados da Agência</h3>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label><input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} rows={4} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Slug da URL (ex: `/minha-agencia`)</label><input value={profileForm.slug} onChange={e => setProfileForm({...profileForm, slug: slugify(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label><input value={profileForm.cnpj} onChange={e => setProfileForm({...profileForm, cnpj: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label><input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Website</label><input value={profileForm.website} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div className="border-t pt-6"><h4 className="text-lg font-bold text-gray-900 mb-4">Endereço</h4><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label><input value={profileForm.address.zipCode} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, zipCode: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label><input value={profileForm.address.street} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, street: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label><input value={profileForm.address.number} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, number: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Complemento</label><input value={profileForm.address.complement || ''} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, complement: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label><input value={profileForm.address.district} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, district: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label><input value={profileForm.address.city} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, city: e.target.value}})} className="w-full border p-2 rounded-lg" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado (UF)</label><input value={profileForm.address.state} onChange={e => setProfileForm({...profileForm, address: {...profileForm.address, state: e.target.value}})} className="w-full border p-2 rounded-lg" /></div></div></div>
                      <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Perfil</button>
                  </form>
              </div>
          )}

          {settingsTab === 'HERO' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Página Inicial (Microsite)</h3>
                  <form onSubmit={handleHeroSettingsUpdate} className="space-y-6">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Modo da Página Inicial</label><select value={heroForm.heroMode} onChange={e => setHeroForm({...heroForm, heroMode: e.target.value as 'TRIPS' | 'STATIC'})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500"><option value="TRIPS">Carrossel de Viagens</option><option value="STATIC">Imagem Estática</option></select></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">URL da Imagem de Banner</label><input value={heroForm.heroBannerUrl} onChange={e => setHeroForm({...heroForm, heroBannerUrl: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="https://exemplo.com/banner.jpg" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Título do Banner</label><input value={heroForm.heroTitle} onChange={e => setHeroForm({...heroForm, heroTitle: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo do Banner</label><textarea value={heroForm.heroSubtitle} onChange={e => setHeroForm({...heroForm, heroSubtitle: e.target.value})} rows={3} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar Configurações</button>
                  </form>
              </div>
          )}

          {settingsTab === 'THEME' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Tema do Microsite</h3>
                  <form onSubmit={handleSaveAgencyTheme} className="space-y-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Cor Primária</label>
                          <div className="flex gap-2 items-center">
                              <input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-10 h-10 rounded-lg border"/>
                              <input type="text" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="flex-1 border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Cor Secundária</label>
                          <div className="flex gap-2 items-center">
                              <input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-10 h-10 rounded-lg border"/>
                              <input type="text" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="flex-1 border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" />
                          </div>
                      </div>
                      <div className="flex gap-4">
                        <button type="submit" disabled={isSavingSettings} className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18}/> Salvar e Aplicar</button>
                        <button type="button" onClick={handlePreviewTheme} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center gap-2">Prévia</button>
                        <button type="button" onClick={handleResetThemePreview} className="flex-1 bg-red-50 text-red-700 py-3 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2">Resetar</button>
                      </div>
                  </form>
              </div>
          )}

          {settingsTab === 'SUBSCRIPTION' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Assinatura</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    {PLANS.map(plan => {
                      const currentPlan = agency.subscriptionPlan === plan.id;
                      const expiresDate = new Date(agency.subscriptionExpiresAt).toLocaleDateString('pt-BR');
                      const isActive = agency.subscriptionStatus === 'ACTIVE';

                      return (
                        <div key={plan.id} className={`bg-gray-50 p-6 rounded-xl border ${currentPlan ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'} relative`}>
                          {currentPlan && <span className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">PLANO ATUAL</span>}
                          <h4 className="font-bold text-gray-900 text-xl">{plan.name}</h4>
                          <p className="text-3xl font-extrabold text-primary-600 mt-2">R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span></p>
                          <ul className="mt-6 space-y-3 text-gray-600 text-sm mb-6 text-left">
                            {plan.features.map((f, i) => (<li key={i} className="flex gap-3 items-start"><CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" /> <span className="leading-snug">{f}</span></li>))}
                          </ul>
                          {currentPlan ? (
                            <p className={`text-sm font-bold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                              {isActive ? `Ativo. Expira em: ${expiresDate}` : `Inativo. Expirou em: ${expiresDate}`}
                            </p>
                          ) : (
                            <button 
                              onClick={() => handleSelectPlan(plan)}
                              disabled={isProcessing}
                              className="w-full py-3 rounded-xl font-bold transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isProcessing ? <Loader size={16} className="animate-spin" /> : 'Mudar para este plano'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
              </div>
          )}
        </div>
      )}

      {/* New/Edit Trip Modal */}
      {(isNewTripModalOpen || isEditTripModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setIsNewTripModalOpen(false); setIsEditTripModalOpen(false); setEditingTrip(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingTrip ? 'Editar Viagem' : 'Criar Nova Viagem'}</h2>
            
            <form onSubmit={handleSaveTrip} className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4">Informações Básicas</h3>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Título da Viagem</label><input value={tripForm.title || ''} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border