import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const { agencies, trips, bookings, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencyProfileByAdmin, refreshData, loading: dataLoading } = useData();
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
    console.group("[AgencyDashboard Debug - Render]");
    console.log("Auth Loading:", authLoading);
    console.log("User:", user);
    console.log("User Role (raw):", user?.role);
    console.log("Total Agencies in DataContext:", agencies.length); // Log total agencies from context
    console.log("DataContext Loading:", dataLoading); // Debug log
    console.groupEnd();
  }, [authLoading, user, agencies, dataLoading]); // Added dataLoading to deps

  const [agency, setAgency] = useState<Agency | null>(null);

  useEffect(() => {
      console.groupCollapsed("[AgencyDashboard] Resolver de agência - Início do useEffect");
      console.log("Current user:", user);
      console.log("Agencies from DataContext:", agencies);

      const normalizedRole = user ? String(user.role).toUpperCase() : null;
      const isUserAgencyRole = normalizedRole === UserRole.AGENCY;
      console.log("Normalized Role:", normalizedRole, "Is User Agency Role:", isUserAgencyRole);

      // Log para verificar o estado antes da atribuição final
      if (user) {
          console.log("User.id:", user.id);
          if (user.role === UserRole.AGENCY) {
              const userAsAgency = user as Agency;
              console.log("User as Agency (from AuthContext):", userAsAgency);
              console.log("UserAsAgency.agencyId:", userAsAgency.agencyId);
          }
      }


      if (!user || !isUserAgencyRole) {
          console.log("[AgencyDashboard] Usuário não é agência ou não logado. Limpando agency.");
          setAgency(null);
          console.groupEnd();
          return;
      }

      const userAsAgency = user as Agency;
      
      // 1) Se o AuthContext já montou o usuário como Agency completo e válido, usa ele.
      // O CRITICAL FIX no AuthContext garante que agencyId não seja mais uma string vazia.
      // A condição userAsAgency.agencyId !== userAsAgency.id é para diferenciar o agencyId real do ID do profile
      // que é usado como fallback temporário em AuthContext.
      if (userAsAgency.agencyId && userAsAgency.agencyId !== userAsAgency.id) {
          console.log("[AgencyDashboard] Usando agency do objeto Auth user (agencyId presente e válido):", userAsAgency);
          setAgency(userAsAgency);
      } else {
          // 2) Fallback: tenta achar na lista de agencies do DataContext.
          // Busca pelo user_id da agência (que está mapeado para Agency.id)
          // ou por email como fallback mais robusto.
          const found = agencies.find(a => 
              a.id === user.id || // a.id (Agency.id) é o user_id (profiles.id)
              a.email?.toLowerCase() === user.email?.toLowerCase()
          ); 

          if (found) {
              console.log("[AgencyDashboard] Agency encontrada via DataContext list lookup:", found);
              setAgency(found);
          } else {
              console.warn("[AgencyDashboard] Usuário é AGÊNCIA, mas dados da agência não encontrados no AuthContext ou DataContext. Pode ser um novo cadastro sem agency_id ainda na tabela.");
              setAgency(null); // Mantém agency null se não encontrar para mostrar loader
          }
      }
      console.groupEnd();
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
  const isAgencyRole = !!user && String(user.role).toUpperCase() === 'AGENCY'; 
  
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
                <p>User Role: {user ? user.role : 'null'}</p>
                <p>Normalized User Role: {user ? String(user.role).toUpperCase() : 'null'}</p>
                <p>Expected Role (UserRole.AGENCY): {UserRole.AGENCY}</p>
                <p>Is Agency Role Check Result: {String(isAgencyRole)}</p>
                <p>User ID: {user ? user.id : 'null'}</p>
                <p>Data Context Loading: {String(dataLoading)}</p>
                <p>Agencies in Data Context: {agencies.length}</p>
            </div>
        </div>
      );
  }

  // If agency data isn't fully loaded yet but user is authorized
  // FIX: Adiciona mensagem mais descritiva para o estado de loading da agência
  if (!agency) return (
      <div className="min-h-screen flex flex-col items-center justify-center">
          <Loader className="animate-spin text-primary-600" size={32}/>
          <p className="mt-4 text-xs text-gray-500 font-mono">
              Aguardando dados da agência... (Veja console para '[AgencyDashboard] Resolver de agência')
          </p>
      </div>
  );

  // SUBSCRIPTION CHECK
  if (agency.subscriptionStatus !== 'ACTIVE' && agency.subscriptionStatus !== 'PENDING') {
      const handlePlanSelect = async (plan: Plan) => {
          setIsProcessing(true);
          try {
              // Simulate API call to activate
              // FIX: Use real activate_agency_subscription RPC
              await supabase.rpc('activate_agency_subscription', { 
                  p_user_id: user.id, 
                  p_plan_id: plan.id 
              }); 
              showToast(`Plano ${plan.name} ativado com sucesso!`, 'success');
              await refreshData(); // Refresh to update agency status
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
              activatingPlanId={isProcessing ? 'some-id' : null} // Placeholder for activating plan
          />
      );
  }


  const agencyTrips = useMemo(() => trips.filter(t => t.agencyId === agency.agencyId), [trips, agency]);
  const agencyBookings = useMemo(() => bookings.filter(b => b._agency?.agencyId === agency.agencyId), [bookings, agency]);

  // Handle Tab Change
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleCreateTrip = () => {
    setTripForm({
      title: '', description: '', price: 0, destination: '', durationDays: 1, images: [],
      category: 'PRAIA', tags: [], included: [], notIncluded: [], travelerTypes: [],
      startDate: '', endDate: '', paymentMethods: [], is_active: false,
    });
    setModalType('CREATE_TRIP');
  };

  const handleEditTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setTripForm({ ...trip, startDate: trip.startDate.split('T')[0], endDate: trip.endDate.split('T')[0] }); // Format dates for input
    setModalType('EDIT_TRIP');
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload: Trip = {
        ...(tripForm as Trip),
        agencyId: agency.agencyId,
        slug: slugify(tripForm.title || '') + '-' + Date.now(), // Generate unique slug
        startDate: new Date(tripForm.startDate!).toISOString(),
        endDate: new Date(tripForm.endDate!).toISOString(),
        tripRating: 0, // Default for new trips
        tripTotalReviews: 0, // Default for new trips
      };
      
      if (modalType === 'CREATE_TRIP') {
        await createTrip(payload);
        showToast('Viagem criada com sucesso!', 'success');
      } else if (modalType === 'EDIT_TRIP' && selectedTrip) {
        await updateTrip({ ...selectedTrip, ...payload, id: selectedTrip.id });
        showToast('Viagem atualizada com sucesso!', 'success');
      }
      setModalType(null);
      await refreshData();
    } catch (error: any) {
      console.error("Error saving trip:", error);
      showToast(error.message || "Erro ao salvar viagem.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    const file = e.target.files[0];
    const url = await (user ? uploadImage(file, 'trip-images') : Promise.resolve(null));
    if (url) {
        setTripForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
        showToast('Imagem carregada!', 'success');
    } else {
        showToast('Erro ao carregar imagem.', 'error');
    }
    setIsProcessing(false);
  };

  const handleRemoveImage = (index: number) => {
    setTripForm(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSelectPaymentMethod = (method: string) => {
    setTripForm(prev => {
        const currentMethods = prev.paymentMethods || [];
        return {
            ...prev,
            paymentMethods: currentMethods.includes(method)
                ? currentMethods.filter(m => m !== method)
                : [...currentMethods, method],
        };
    });
  };

  const handleToggleTag = (tag: string) => {
    setTripForm(prev => {
      const currentTags = prev.tags || [];
      return {
        ...prev,
        tags: currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag],
      };
    });
  };

  const handleToggleTravelerType = (type: TravelerType) => {
    setTripForm(prev => {
      const currentTypes = prev.travelerTypes || [];
      return {
        ...prev,
        travelerTypes: currentTypes.includes(type) ? currentTypes.filter(t => t !== type) : [...currentTypes, type],
      };
    });
  };

  // Stats for overview
  const totalRevenue = agencyBookings.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalPrice, 0);
  const totalSales = agencyBookings.filter(b => b.status === 'CONFIRMED').length;
  const totalViews = agencyTrips.reduce((sum, t) => sum + (t.views || 0), 0);
  const conversionRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

  const renderContent = () => {
    switch(activeTab) {
      case 'OVERVIEW':
        return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total de Vendas" value={totalSales} subtitle="Reservas confirmadas" icon={ShoppingBag} color="green"/>
              <StatCard title="Receita Gerada" value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`} subtitle="Faturamento total" icon={DollarSign} color="blue"/>
              <StatCard title="Visualizações" value={totalViews} subtitle="Páginas de pacote" icon={Eye} color="amber"/>
              <StatCard title="Taxa de Conversão" value={`${conversionRate.toFixed(1)}%`} subtitle="Vendas por visualização" icon={BarChart2} color="purple"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MonitorPlay size={20} className="mr-2 text-primary-600"/> Pacotes em Destaque</h3>
                {agencyTrips.filter(t => t.featured || t.featuredInHero).length > 0 ? (
                  <div className="space-y-4">
                    {agencyTrips.filter(t => t.featured || t.featuredInHero).map(trip => (
                      <div key={trip.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <img src={trip.images[0]} alt={trip.title} className="w-16 h-12 object-cover rounded-lg" />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                          <p className="text-xs text-gray-500">{trip.destination}</p>
                        </div>
                        {trip.featured && <Badge color="amber">Global</Badge>}
                        {trip.featuredInHero && <Badge color="blue">Hero</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum pacote em destaque. <button onClick={() => handleTabChange('TRIPS')} className="text-primary-600 font-bold hover:underline">Adicionar</button></p>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Rocket size={20} className="mr-2 text-green-600"/> Seu Plano</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-gray-900 text-xl">{agency.subscriptionPlan}</p>
                        <p className="text-sm text-gray-500">
                          {agency.subscriptionStatus === 'ACTIVE' ? `Ativo - Expira em ${new Date(agency.subscriptionExpiresAt).toLocaleDateString()}` : 'Inativo'}
                        </p>
                    </div>
                    <button onClick={() => setModalType('SUBSCRIPTION')} className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-100">Gerenciar</button>
                </div>
                <div className="mt-6 text-sm text-gray-600">
                  <p className="font-bold mb-2">Benefícios:</p>
                  <ul className="space-y-2">
                    {PLANS.find(p => p.id === agency.subscriptionPlan)?.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> {feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      case 'TRIPS':
        return (
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
                    <div className="relative h-48 w-full">
                      <img src={trip.images[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-primary-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">{trip.category.replace('_', ' ')}</div>
                      {trip.is_active ? (
                        <span className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">Ativo</span>
                      ) : (
                        <span className="absolute top-3 right-3 bg-gray-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold">Inativo</span>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2 line-clamp-2">{trip.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Clock size={16} className="mr-2 text-gray-400" />
                        <span className="font-medium">{trip.durationDays} dias</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {trip.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-[10px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full font-semibold">{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-end justify-between pt-4 border-t border-gray-100 mt-auto">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Preço</span>
                            <span className="text-xl font-extrabold text-primary-600">R$ {trip.price.toLocaleString('pt-BR')}</span>
                        </div>
                        <ActionsMenu 
                            trip={trip}
                            onEdit={() => handleEditTrip(trip)}
                            onDuplicate={() => showToast('Funcionalidade em desenvolvimento!', 'info')}
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
                <Plane size={32} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Nenhum pacote cadastrado</h3>
                <p className="text-gray-500 mb-4">Comece agora mesmo a vender suas viagens!</p>
                <button onClick={handleCreateTrip} className="bg-primary-600 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700 mx-auto">
                  <Plus size={18}/> Criar Primeiro Pacote
                </button>
              </div>
            )}
          </div>
        );
      case 'BOOKINGS':
        return (
            <div className="animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Reservas ({agencyBookings.length})</h2>
                {agencyBookings.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Viagem</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {agencyBookings.map(booking => {
                                    const trip = trips.find(t => t.id === booking.tripId);
                                    const client = clients.find(c => c.id === booking.clientId);
                                    return (
                                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip?.title || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{trip?.destination || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{client?.name || 'Cliente Desconhecido'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{new Date(booking.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-primary-600">R$ {booking.totalPrice.toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-4">
                                                <Badge color={booking.status === 'CONFIRMED' ? 'green' : booking.status === 'PENDING' ? 'amber' : 'red'}>
                                                    {booking.status.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ActionMenu actions={[
                                                  {label: 'Ver Detalhes', icon: Eye, onClick: () => showToast('Funcionalidade em desenvolvimento', 'info')},
                                                  {label: 'Entrar em Contato', icon: MessageCircle, onClick: () => showToast('Funcionalidade em desenvolvimento', 'info')},
                                                ]} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <ShoppingBag size={32} className="text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">Nenhuma reserva ainda</h3>
                        <p className="text-gray-500 mt-4">Publique seus pacotes e comece a vender!</p>
                    </div>
                )}
            </div>
        );
      case 'REVIEWS':
        return (
            <div className="animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações ({agencyReviews.length})</h2>
              {agencyReviews.length > 0 ? (
                <div className="space-y-6">
                  {agencyReviews.map(review => (
                    <div key={review.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <img src={review.clientAvatar || `https://ui-avatars.com/api/?name=${review.clientName || 'Cliente'}`} alt={review.clientName || 'Cliente'} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{review.clientName || 'Cliente ViajaStore'}</p>
                                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} className={i < review.rating ? "fill-current" : "text-gray-300"} />
                                ))}
                            </div>
                        </div>
                        {review.tripTitle && (
                            <p className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg inline-block mb-4">
                                Pacote: <span className="font-bold text-gray-700">{review.tripTitle}</span>
                            </p>
                        )}
                        <p className="text-gray-700 text-sm italic">"{review.comment}"</p>
                        {review.response ? (
                            <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
                                <p className="text-xs font-bold text-primary-700 mb-1">Sua resposta:</p>
                                <p className="text-sm text-primary-800 italic">"{review.response}"</p>
                            </div>
                        ) : (
                            <button onClick={() => showToast('Funcionalidade em desenvolvimento', 'info')} className="mt-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100">
                                Responder Avaliação
                            </button>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Star size={32} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação ainda</h3>
                    <p className="text-gray-500 mt-4">Convide seus clientes a deixar uma opinião sobre suas viagens!</p>
                </div>
              )}
            </div>
        );
      case 'SETTINGS':
        return (
          <div className="animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Agência</h2>
            <form onSubmit={e => { e.preventDefault(); showToast('Funcionalidade em desenvolvimento!', 'info'); }} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Agência</label>
                <input type="text" value={agency.name} readOnly className="w-full border p-2.5 rounded-lg bg-gray-100 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Slug (URL do Microsite)</label>
                <div className="flex items-center">
                    <span className="bg-gray-100 p-2.5 rounded-l-lg border border-r-0 border-gray-300 text-gray-600">viajastore.com/#/</span>
                    <input type="text" value={agency.slug} readOnly className="flex-1 border p-2.5 rounded-r-lg bg-gray-100 cursor-not-allowed" />
                    <button type="button" onClick={() => navigator.clipboard.writeText(`viajastore.com/#/${agency.slug}`)} className="ml-2 p-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><Copy size={16}/></button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Este é o endereço do seu microsite na ViajaStore. Para alterá-lo, entre em contato com o suporte.</p>
              </div>

              {/* General Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">CNPJ</label>
                    <input type="text" value={agency.cnpj || ''} onChange={e => setAgency({ ...agency, cnpj: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
                    <input type="text" value={agency.phone || ''} onChange={e => setAgency({ ...agency, phone: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
                    <input type="text" value={agency.whatsapp || ''} onChange={e => setAgency({ ...agency, whatsapp: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
                    <input type="text" value={agency.website || ''} onChange={e => setAgency({ ...agency, website: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                  </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição da Agência</label>
                <textarea value={agency.description} onChange={e => setAgency({ ...agency, description: e.target.value })} rows={4} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"></textarea>
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Configurações do Microsite</h3>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Modo do Hero (Página Inicial)</label>
                  <select value={agency.heroMode} onChange={e => setAgency({ ...agency, heroMode: e.target.value as 'TRIPS' | 'STATIC' })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="TRIPS">Carrossel de Viagens</option>
                    <option value="STATIC">Banner Estático</option>
                  </select>
                </div>
                {agency.heroMode === 'STATIC' && (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">URL do Banner Hero</label>
                            <input type="text" value={agency.heroBannerUrl || ''} onChange={e => setAgency({ ...agency, heroBannerUrl: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                            {agency.heroBannerUrl && <img src={agency.heroBannerUrl} alt="Hero Banner Preview" className="mt-2 h-32 object-cover rounded-lg"/>}
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Título do Hero</label>
                            <input type="text" value={agency.heroTitle || ''} onChange={e => setAgency({ ...agency, heroTitle: e.target.value })} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Subtítulo do Hero</label>
                            <textarea value={agency.heroSubtitle || ''} onChange={e => setAgency({ ...agency, heroSubtitle: e.target.value })} rows={2} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"></textarea>
                        </div>
                    </>
                )}
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700">Salvar Configurações</button>
            </form>
          </div>
        );
      default:
        return <div className="text-center py-20 text-gray-500">Selecione uma aba para começar.</div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-500"/> Agência Verificada
            <span className="mx-2 text-gray-300">•</span>
            <Link to={`/#/${agency.slug}`} target="_blank" className="text-primary-600 flex items-center hover:underline">
                Ver microsite <ExternalLink size={14} className="ml-1"/>
            </Link>
          </p>
        </div>
        <button onClick={refreshData} disabled={dataLoading} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
            {dataLoading ? <Loader size={18} className="animate-spin mr-2"/> : <RefreshCw size={18} className="mr-2"/>}
            Atualizar Dados
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} activeTab={activeTab} onClick={handleTabChange}/>
        <NavButton tabId="TRIPS" label="Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange}/>
        <NavButton tabId="BOOKINGS" label="Reservas" icon={ShoppingBag} activeTab={activeTab} onClick={handleTabChange}/>
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange}/>
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange}/>
      </div>

      {renderContent()}

      {/* Trip Modals */}
      {(modalType === 'CREATE_TRIP' || modalType === 'EDIT_TRIP') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{modalType === 'CREATE_TRIP' ? 'Criar Novo Pacote' : `Editar Pacote: ${selectedTrip?.title}`}</h2>
            <form onSubmit={handleSaveTrip} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Título da Viagem</label>
                <input type="text" value={tripForm.title || ''} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Destino</label>
                <input type="text" value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
                <RichTextEditor value={tripForm.description || ''} onChange={val => setTripForm({...tripForm, description: val})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label>
                  <input type="number" value={tripForm.price || 0} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label>
                  <input type="number" value={tripForm.durationDays || 1} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required min="1" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                  <select value={tripForm.category} onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required>
                    {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 'NATUREZA', 'CULTURA', 'GASTRONOMICO', 'VIDA_NOTURNA', 'VIAGEM_BARATA', 'ARTE'].map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label>
                    <input type="date" value={tripForm.startDate?.split('T')[0] || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Data de Término</label>
                    <input type="date" value={tripForm.endDate?.split('T')[0] || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagens ({tripForm.images?.length || 0}/{MAX_IMAGES})</label>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {tripForm.images?.map((img, index) => (
                    <div key={index} className="relative h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt="Trip Image" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={14}/></button>
                    </div>
                  ))}
                  {tripForm.images!.length < MAX_IMAGES && (
                    <label className="h-24 w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload size={24}/>
                      <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={isProcessing}/>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500">Primeira imagem será a capa do pacote.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento</label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PAYMENTS.map(method => (
                    <button type="button" key={method} onClick={() => handleSelectPaymentMethod(method)} className={`px-3 py-1.5 rounded-full border text-sm font-medium ${tripForm.paymentMethods?.includes(method) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags Personalizadas</label>
                <PillInput 
                    value={tripForm.tags || []} 
                    onChange={tags => setTripForm({...tripForm, tags})} 
                    placeholder="Adicione tags (ex: aventura, trilhas)" 
                    suggestions={SUGGESTED_TAGS}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipos de Viajantes</label>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_TRAVELERS.map(type => (
                    <button type="button" key={type} onClick={() => handleToggleTravelerType(type as TravelerType)} className={`px-3 py-1.5 rounded-full border text-sm font-medium ${tripForm.travelerTypes?.includes(type as TravelerType) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={tripForm.is_active} onChange={e => setTripForm({...tripForm, is_active: e.target.checked})} className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                  Ativo (Disponível para vendas)
                </label>
                <label className="flex items-center text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={tripForm.featured || false} onChange={e => setTripForm({...tripForm, featured: e.target.checked})} className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                  Destaque Global (Página inicial ViajaStore)
                </label>
                <label className="flex items-center text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={tripForm.featuredInHero || false} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded"/>
                  Destaque no Hero (Seu microsite)
                </label>
              </div>

              <button type="submit" disabled={isProcessing} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                {isProcessing ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Pacote
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {modalType === 'SUBSCRIPTION' && (
        <SubscriptionConfirmationModal
            plan={PLANS.find(p => p.id === agency.subscriptionPlan)!}
            onClose={() => setModalType(null)}
            onConfirm={() => showToast('Funcionalidade em desenvolvimento!', 'info')}
            isSubmitting={isProcessing}
        />
      )}
    </div>
  );
};

export default AgencyDashboard;