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
        <ToolbarButton