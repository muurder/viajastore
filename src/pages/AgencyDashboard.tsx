
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan, Address, BankInfo } from '../types';
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

  // Fixed: Added return statement to make it a valid React functional component
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
        <ToolbarButton cmd="insertUnorderedList" icon={List} title="Lista com Marcadores" />
        <ToolbarButton cmd="insertOrderedList" icon={ListOrdered} title="Lista Numerada" />
        <Divider />
        <ToolbarButton icon={LinkIcon} cmd="" title="Inserir Link" onClick={addLink} />
        <ToolbarButton icon={ImageIcon} cmd="" title="Inserir Imagem" onClick={addImage} />
        <div className="relative">
            <ToolbarButton icon={Smile} cmd="" title="Emojis" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
            {showEmojiPicker && (
                <div className="absolute top-10 left-0 bg-white shadow-xl border rounded-lg p-2 grid grid-cols-4 gap-2 z-50">
                    {COMMON_EMOJIS.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} className="text-xl hover:bg-gray-100 p-1 rounded">{e}</button>)}
                </div>
            )}
        </div>
      </div>
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="p-4 min-h-[150px] outline-none prose prose-sm max-w-none text-gray-700 bg-white"
      ></div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export const AgencyDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { agencies, trips, bookings, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencyProfileByAdmin, refreshData } = useData();
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';

  const [isProcessing, setIsProcessing] = useState(false);
  const [modalType, setModalType] = useState<'CREATE_TRIP' | 'EDIT_TRIP' | 'SUBSCRIPTION' | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripForm, setTripForm] = useState<Partial<Trip>>({
      title: '', description: '', price: 0, destination: '', durationDays: 1, images: [],
      category: 'PRAIA', tags: [], included: [], notIncluded: [], travelerTypes: [],
      startDate: '', endDate: '', paymentMethods: []
  });
  
  // Debug logging - Enhanced
  useEffect(() => {
    console.group("[AgencyDashboard Debug]");
    console.log("Auth Loading:", authLoading);
    console.log("User:", user);
    console.log("User Role:", user?.role);
    console.log("Total Agencies in Context:", agencies.length);
    console.groupEnd();
  }, [authLoading, user, agencies]);

  const [agency, setAgency] = useState<Agency | null>(null);

  useEffect(() => {
      // 1. Prioritize user object from AuthContext if it's an Agency
      if (user && user.role === UserRole.AGENCY) {
          const userAsAgency = user as Agency;
          // Verify if it has Agency specific fields like agencyId
          if (userAsAgency.agencyId && userAsAgency.agencyId !== '') { // Ensure agencyId is not empty from fallback
              console.log("[AgencyDashboard] Agency matched directly from Auth User object:", userAsAgency);
              setAgency(userAsAgency);
          } else {
              // 2. Fallback: Try to find in agencies list from DataContext
              // Match by user.id (which is profiles.id) against agency.id (which is mapped from agencies.user_id)
              const found = agencies.find(a => a.id === user.id); 
              if (found) {
                  console.log("[AgencyDashboard] Agency matched via DataContext list lookup:", found);
                  setAgency(found);
              } else {
                  console.warn("[AgencyDashboard] User is AGENCY, but agency data not found in Auth or DataContext lists.");
                  setAgency(null); // Keep agency null if not found
              }
          }
      } else {
          setAgency(null); // Clear agency if user is not an agency or not logged in
      }
  }, [user, agencies]);

  // Handle Loading
  if (authLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <Loader size={48} className="animate-spin text-primary-500 mb-4" />
            <p className="text-gray-500">Carregando painel...</p>
        </div>
    );
  }

  // Handle Unauthenticated or Unauthorized
  // Use a robust check for user role
  const isAgencyRole = user && String(user.role).toUpperCase() === UserRole.AGENCY;
  
  if (!user || !isAgencyRole) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50">
            <div className="bg-red-50 p-6 rounded-full mb-6">
                <ShieldCheck size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Acesso Restrito (Agency Dashboard)</h2>
            <p className="text-gray-500 mb-6 max-w-md">Esta área é exclusiva para agências parceiras. Se você é uma agência, verifique se fez login com a conta correta.</p>
            <Link to="/" className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">Voltar ao início</Link>
            
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs font-mono text-left max-w-sm w-full border border-gray-200">
                <p className="font-bold mb-2 text-gray-500 uppercase tracking-wider">Debug Info</p>
                <p>User Email: {user ? user.email : 'null'}</p>
                <p>User Role: {user ? user.role : 'null'} (Normalized: {user ? String(user.role).toUpperCase() : 'null'})</p>
                <p>User ID: {user ? user.id : 'null'}</p>
                <p>Is Agency Role Check: {String(isAgencyRole)}</p>
            </div>
        </div>
      );
  }

  // If agency data isn't fully loaded yet but user is authorized
  if (!agency) return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32}/></div>;

  // SUBSCRIPTION CHECK
  if (agency.subscriptionStatus !== 'ACTIVE' && agency.subscriptionStatus !== 'PENDING') {
      const handlePlanSelect = async (plan: Plan) => {
          setIsProcessing(true);
          try {
              // Simulate API call to activate
              await new Promise(resolve => setTimeout(resolve, 1500)); 
              // In real app, redirect to checkout or call API
              showToast(`Plano ${plan.name} selecionado! (Simulação)`, 'success');
              // Force update local state for demo
              // In real app, DataContext would update after DB change
          } catch (e) {
              showToast('Erro ao selecionar plano.', 'error');
          } finally {
              setIsProcessing(false);
          }
      };

      return <SubscriptionActivationView agency={agency} onSelectPlan={handlePlanSelect} activatingPlanId={isProcessing ? 'loading' : null} />;
  }

  // --- DASHBOARD LOGIC ---
  const myTrips = trips.filter(t => t.agencyId === agency.agencyId);
  const myBookings = bookings.filter(b => b._trip?.agencyId === agency.agencyId);
  
  const totalSales = myBookings.filter(b => b.status === 'CONFIRMED').length;
  const totalRevenue = myBookings.filter(b => b.status === 'CONFIRMED').reduce((acc, b) => acc + b.totalPrice, 0);
  const totalViews = myTrips.reduce((acc, t) => acc + (t.views || 0), 0);

  const handleOpenCreate = () => {
      setTripForm({
          title: '', description: '', price: 0, destination: '', durationDays: 1, images: [],
          category: 'PRAIA', tags: [], included: [], notIncluded: [], travelerTypes: [],
          startDate: '', endDate: '', paymentMethods: []
      });
      setModalType('CREATE_TRIP');
  };

  const handleOpenEdit = (trip: Trip) => {
      setSelectedTrip(trip);
      setTripForm({ ...trip });
      setModalType('EDIT_TRIP');
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsProcessing(true);
      try {
          const tripData = { ...tripForm, agencyId: agency.agencyId } as Trip;
          
          if (modalType === 'CREATE_TRIP') {
              await createTrip(tripData);
              showToast('Pacote criado com sucesso!', 'success');
          } else {
              await updateTrip({ ...tripData, id: selectedTrip!.id });
              showToast('Pacote atualizado com sucesso!', 'success');
          }
          setModalType(null);
      } catch (error: any) {
          showToast(`Erro ao salvar: ${error.message}`, 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteTrip = async (id: string) => {
      if (window.confirm('Tem certeza que deseja excluir este pacote?')) {
          setIsProcessing(true);
          try {
              await deleteTrip(id);
              showToast('Pacote excluído.', 'success');
          } catch (e) {
              showToast('Erro ao excluir.', 'error');
          } finally {
              setIsProcessing(false);
          }
      }
  };

  const renderContent = () => {
      switch (activeTab) {
          case 'OVERVIEW':
              return (
                  <div className="space-y-8 animate-[fadeIn_0.3s]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-green-50 text-green-600"><DollarSign size={24}/></div></div>
                              <p className="text-sm text-gray-500 font-medium">Receita Total</p>
                              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {totalRevenue.toLocaleString()}</h3>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-blue-50 text-blue-600"><ShoppingBag size={24}/></div></div>
                              <p className="text-sm text-gray-500 font-medium">Vendas Realizadas</p>
                              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{totalSales}</h3>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Eye size={24}/></div></div>
                              <p className="text-sm text-gray-500 font-medium">Visualizações</p>
                              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{totalViews}</h3>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                              <div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Plane size={24}/></div></div>
                              <p className="text-sm text-gray-500 font-medium">Pacotes Ativos</p>
                              <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{myTrips.filter(t => t.is_active).length}</h3>
                          </div>
                      </div>
                  </div>
              );
          case 'TRIPS':
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="flex justify-between items-center">
                          <h2 className="text-xl font-bold text-gray-900">Meus Pacotes</h2>
                          <button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30">
                              <Plus size={18}/> Novo Pacote
                          </button>
                      </div>

                      {myTrips.length === 0 ? (
                          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Plane className="text-gray-300" size={32} /></div>
                              <h3 className="text-lg font-bold text-gray-900">Nenhum pacote cadastrado</h3>
                              <p className="text-gray-500 mb-6">Comece a vender criando seu primeiro pacote de viagem.</p>
                              <button onClick={handleOpenCreate} className="text-primary-600 font-bold hover:underline">Criar agora</button>
                          </div>
                      ) : (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-100">
                                  <thead className="bg-gray-50">
                                      <tr>
                                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pacote</th>
                                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Preço</th>
                                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Performance</th>
                                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                      </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-100">
                                      {myTrips.map(trip => (
                                          <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-4">
                                                      <img src={trip.images[0] || 'https://via.placeholder.com/100'} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt=""/>
                                                      <div>
                                                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                                                          <p className="text-xs text-gray-500">{trip.destination}</p>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${trip.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                      {trip.is_active ? 'Ativo' : 'Pausado'}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                                      <span className="flex items-center gap-1"><Eye size={14}/> {trip.views || 0}</span>
                                                      <span className="flex items-center gap-1"><ShoppingBag size={14}/> {trip.sales || 0}</span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                  <ActionsMenu 
                                                      trip={trip}
                                                      onEdit={() => handleOpenEdit(trip)}
                                                      onDelete={() => handleDeleteTrip(trip.id)}
                                                      onDuplicate={() => { /* Implement duplicate */ }}
                                                      onToggleStatus={() => toggleTripStatus(trip.id)}
                                                      fullAgencyLink={window.location.origin + '/' + agency.slug}
                                                  />
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
              );
          default:
              return null;
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900">Painel da Agência</h1>
            <Link to={`/${agency.slug}`} target="_blank" className="flex items-center gap-2 text-primary-600 font-bold text-sm hover:underline">
                <ExternalLink size={16}/> Ver minha página pública
            </Link>
        </div>

        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
            <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} activeTab={activeTab} onClick={(id) => setSearchParams({ tab: id })} />
            <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={(id) => setSearchParams({ tab: id })} />
            {/* Add more tabs as needed */}
        </div>

        {renderContent()}

        {/* Modal for Trip Create/Edit */}
        {(modalType === 'CREATE_TRIP' || modalType === 'EDIT_TRIP') && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">{modalType === 'CREATE_TRIP' ? 'Criar Novo Pacote' : 'Editar Pacote'}</h2>
                    
                    <form onSubmit={handleSaveTrip} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Título do Pacote</label>
                                <input value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Completa</label>
                                <RichTextEditor value={tripForm.description || ''} onChange={val => setTripForm({...tripForm, description: val})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
                                <input type="number" value={tripForm.price} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Destino</label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-2.5 pl-10 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data Início</label>
                                <input type="date" value={tripForm.startDate ? new Date(tripForm.startDate).toISOString().split('T')[0] : ''} onChange={e => setTripForm({...tripForm, startDate: new Date(e.target.value).toISOString()})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data Fim</label>
                                <input type="date" value={tripForm.endDate ? new Date(tripForm.endDate).toISOString().split('T')[0] : ''} onChange={e => setTripForm({...tripForm, endDate: new Date(e.target.value).toISOString()})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Duração (Dias)</label>
                                <input type="number" value={tripForm.durationDays} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Categoria Principal</label>
                                <select value={tripForm.category} onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500">
                                    <option value="PRAIA">Praia</option>
                                    <option value="AVENTURA">Aventura</option>
                                    <option value="FAMILIA">Família</option>
                                    <option value="ROMANTICO">Romântico</option>
                                    <option value="URBANO">Urbano</option>
                                    <option value="NATUREZA">Natureza</option>
                                    <option value="CULTURA">Cultura</option>
                                    <option value="GASTRONOMICO">Gastronômico</option>
                                    <option value="VIDA_NOTURNA">Vida Noturna</option>
                                    <option value="VIAGEM_BARATA">Viagem Barata</option>
                                    <option value="ARTE">Arte</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Imagens (URLs)</label>
                                <PillInput 
                                    value={tripForm.images || []} 
                                    onChange={imgs => setTripForm({...tripForm, images: imgs})} 
                                    placeholder="Cole a URL da imagem e pressione Enter"
                                />
                                <p className="text-xs text-gray-500 mt-1">Recomendado: 4 a 8 imagens de alta qualidade.</p>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">O que está incluído</label>
                                <PillInput 
                                    value={tripForm.included || []} 
                                    onChange={inc => setTripForm({...tripForm, included: inc})} 
                                    placeholder="Adicionar item (ex: Café da manhã)"
                                    suggestions={SUGGESTED_INCLUDED}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">O que NÃO está incluído</label>
                                <PillInput 
                                    value={tripForm.notIncluded || []} 
                                    onChange={notInc => setTripForm({...tripForm, notIncluded: notInc})} 
                                    placeholder="Adicionar item (ex: Bebidas)"
                                    suggestions={SUGGESTED_NOT_INCLUDED}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tags (Palavras-chave)</label>
                                <PillInput 
                                    value={tripForm.tags || []} 
                                    onChange={tags => setTripForm({...tripForm, tags: tags})} 
                                    placeholder="Adicionar tag"
                                    suggestions={SUGGESTED_TAGS}
                                    customSuggestions={agency.customSettings?.tags}
                                    onDeleteCustomSuggestion={(tag) => { /* logic to remove custom tag from agency settings */ }}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                            {isProcessing ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Pacote
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
