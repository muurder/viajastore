
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan, Address, BankInfo } from '../types'; // Fix: Import Address and BankInfo
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
// Fix: Import Link from react-router-dom
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
// Fix: Import MonitorPlay, Info, AlertCircle from lucide-react
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle } from 'lucide-react';
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
                 <a href={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={() => setIsOpen(false)}><Eye size={16} className="mr-3 text-gray-400"/> Ver público</a>
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
        <ToolbarButton cmd="insertUnorderedList" icon={List} title="Lista com marcadores" />
        <ToolbarButton cmd="insertOrderedList" icon={ListOrdered} title="Lista numerada" />
        <Divider />
        <button type="button" onClick={addLink} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Inserir Link"><LinkIcon size={18}/></button>
        <button type="button" onClick={addImage} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Inserir Imagem"><ImageIcon size={18}/></button>
        <div className="relative"><button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Emojis"><Smile size={18}/></button>{showEmojiPicker && (<div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg p-2 w-48 grid grid-cols-4 gap-1 z-20">{COMMON_EMOJIS.map(e => (<button key={e} type="button" onClick={() => addEmoji(e)} className="text-xl hover:bg-gray-100 p-1 rounded">{e}</button>))}</div>)}</div>
      </div>
      <div ref={contentRef} contentEditable onInput={handleInput} onPaste={handlePaste} className="w-full p-6 min-h-[300px] outline-none text-gray-800 prose prose-blue max-w-none [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mb-2 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-800 [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-primary-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:shadow-md [&>img]:my-4" />
    </div>
  );
};

const ImageManager: React.FC<{ images: string[]; onChange: (imgs: string[]) => void }> = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const { uploadImage } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) { showToast(`Você pode enviar no máximo ${MAX_IMAGES} imagens.`, 'error'); return; }
    setUploading(true);
    const newImages: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadImage(file, 'trip-images');
        if (publicUrl) newImages.push(publicUrl);
      }
      if (newImages.length > 0) onChange([...images, ...newImages]);
      showToast(`${newImages.length} imagem(ns) enviada(s) com sucesso!`, 'success');
    } catch (error: any) { showToast(error.message || 'Erro no upload.', 'error'); } finally { setUploading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };
  const isLimitReached = images.length >= MAX_IMAGES;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end"><span className="text-sm font-bold text-gray-700">Gerenciar Fotos</span><span className="text-xs text-gray-400">{images.length}/{MAX_IMAGES} imagens (Máx)</span></div>
      <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl transition-all group ${isLimitReached ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-primary-200 bg-primary-50/50 hover:bg-primary-50 hover:border-primary-400 cursor-pointer'}`}>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading || isLimitReached} />
            {uploading ? <Loader className="animate-spin text-primary-600" /> : <Upload className="text-primary-400 group-hover:text-primary-600 transition-colors" />}
            <span className="text-sm font-bold text-primary-600 mt-2">{uploading ? 'Enviando...' : (isLimitReached ? 'Limite de imagens atingido' : 'Adicionar Fotos')}</span>
            <span className="text-xs text-gray-400 mt-1 hidden sm:inline">JPG, PNG, WEBP</span>
      </label>
      {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 animate-[fadeIn_0.3s]">
            {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group border border-gray-200 shadow-sm hover:shadow-md transition-all">
                  <img src={img} className="w-full h-full object-cover" alt={`Imagem ${idx+1}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => onChange(images.filter((_, i) => i !== idx))} className="bg-red-600 text-white p-2 rounded-full transform scale-75 group-hover:scale-100 transition-transform shadow-lg" title="Remover"><Trash2 size={16} /></button>
                  </div>
                  {idx === 0 && <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm text-white text-[10px] text-center py-1 font-bold">Capa Principal</div>}
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
        try { const url = await uploadImage(e.target.files[0], 'agency-logos'); if (url) { onUpload(url); showToast('Logo enviada com sucesso!', 'success'); } else showToast('Erro ao enviar logo.', 'error'); } catch (e) { showToast('Erro ao enviar logo.', 'error'); } finally { setUploading(false); }
    };
    return (
        <div className="flex items-center gap-4"><div className="w-24 h-24 rounded-full border-2 border-gray-200 bg-gray-50 overflow-hidden relative group shrink-0"><img src={currentLogo || `https://ui-avatars.com/api/?name=Logo&background=random`} alt="Logo" className="w-full h-full object-cover" />{uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader className="animate-spin text-primary-600"/></div>}</div><div><label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-gray-50 inline-flex items-center gap-2 transition-colors text-sm"><Upload size={16}/> Alterar Logomarca<input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} /></label><p className="text-xs text-gray-500 mt-2">JPG, PNG ou WEBP. Max 2MB.</p><button type="button" onClick={() => onUpload('')} className="text-xs text-red-500 hover:underline mt-1">Remover logo</button></div></div>
    );
};

const TripPreviewModal: React.FC<{ trip: Partial<Trip>; agency: Agency; onClose: () => void }> = ({ trip, agency, onClose }) => {
    const [openAccordion, setOpenAccordion] = useState<string | null>('included');
    const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key);
    const renderDescription = (desc: string) => {
        const isHTML = /<[a-z][\s\S]*>/i.test(desc) || desc.includes('<p>') || desc.includes('<ul>');
        if (isHTML) return (<div className="prose prose-blue max-w-none text-gray-600 leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mb-2 [&>p]:mb-4 [&>a]:text-primary-600 [&>a]:underline" dangerouslySetInnerHTML={{ __html: desc }} />);
        return <p className="leading-relaxed whitespace-pre-line">{desc}</p>;
    };
    const mainImage = trip.images && trip.images.length > 0 ? trip.images[0] : 'https://placehold.co/800x400/e2e8f0/94a3b8?text=Sem+Imagem';
    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-[fadeIn_0.2s]">
            <div className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md"><div className="flex items-center gap-2"><Eye size={18} className="text-primary-400"/><span className="font-bold">Modo de Visualização</span></div><button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><X size={16}/> Fechar</button></div>
            <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
                <div className="flex items-center text-sm text-gray-500 mb-6"><span>Home</span> <span className="mx-2">/</span> <span>Pacotes</span> <span className="mx-2">/</span> <span className="text-gray-900 font-medium">{trip.title || 'Sem Título'}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-8 h-[300px] md:h-[400px]">
                    <div className="md:col-span-2 h-full"><img src={mainImage} className="w-full h-full object-cover" alt="Main" /></div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-2 h-full"><img src={trip.images?.[1] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="1" /><img src={trip.images?.[2] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="2" /><img src={trip.images?.[3] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="3" /><img src={trip.images?.[4] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="4" /></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        <div><h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">{trip.title || 'Título da Viagem'}</h1><div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6"><div className="flex items-center"><MapPin className="text-primary-500 mr-2" size={18}/> {trip.destination || 'Destino'}</div><div className="flex items-center"><Clock className="text-primary-500 mr-2" size={18}/> {trip.durationDays || 0} Dias</div></div><div className="flex flex-wrap gap-2">{trip.tags?.map((tag, i) => (<span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">{tag}</span>))}</div></div>
                        <div className="h-px bg-gray-200"></div>
                        <div className="text-gray-600"><h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>{renderDescription(trip.description || '')}</div>
                         <div className="space-y-4">
                             <div className="border border-gray-200 rounded-xl overflow-hidden"><button onClick={() => toggleAccordion('included')} className="w-full flex items-center justify-between p-4 bg-gray-50 font-bold text-gray-900"><span>O que está incluído</span>{openAccordion === 'included' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>{openAccordion === 'included' && (<div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">{trip.included?.map((item, i) => <div key={i} className="flex items-start"><Check size={18} className="text-green-500 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>)}</div>)}</div>
                             <div className="border border-gray-200 rounded-xl overflow-hidden"><button onClick={() => toggleAccordion('notIncluded')} className="w-full flex items-center justify-between p-4 bg-gray-50 font-bold text-gray-900"><span>O que NÃO está incluído</span>{openAccordion === 'notIncluded' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>{openAccordion === 'notIncluded' && (<div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">{trip.notIncluded?.map((item, i) => <div key={i} className="flex items-start"><X size={18} className="text-red-400 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>)}</div>)}</div>
                         </div>
                    </div>
                    <div className="lg:col-span-1"><div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24"><p className="text-sm text-gray-500 mb-1 font-medium">A partir de</p><div className="flex items-baseline gap-1 mb-6"><span className="text-4xl font-extrabold text-gray-900">R$ {trip.price || 0}</span><span className="text-gray-500">/ pessoa</span></div><button disabled className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl mb-4 opacity-50 cursor-not-allowed">Reservar Agora</button><p className="text-center text-xs text-gray-400">Botão desabilitado na prévia.</p></div></div>
                </div>
            </div>
        </div>
    );
};

const defaultTripForm: Partial<Trip> = {
    title: '', slug: '', destination: '', price: 0, category: 'PRAIA', 
    durationDays: 1, included: [], notIncluded: [], tags: [], travelerTypes: [], 
    images: [], itinerary: [], featuredInHero: false, description: '', paymentMethods: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, uploadImage, reloadUser, logout } = useAuth();
  // Fix: Destructure updateAgencySubscription from useData
  const { getAgencyTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, agencies, getAgencyStats, trips, bookings, clients, getReviewsByAgencyId, getAgencyTheme, saveAgencyTheme, refreshData, updateAgencySubscription } = useData();
  const { setAgencyTheme } = useTheme(); // For previewing
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') || 'OVERVIEW';
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  const isAgencyActive = (user as Agency)?.subscriptionStatus === 'ACTIVE';

  // Fix: Initialize Address and BankInfo correctly
  const [editFormData, setEditFormData] = useState<Partial<Agency>>({
    address: { zipCode: '', street: '', number: '', district: '', city: '', state: '' },
    bankInfo: { bank: '', agency: '', account: '', pixKey: '' }
  }); // For Settings tab
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Trip Form State
  const [tripForm, setTripForm] = useState<Partial<Trip>>({...defaultTripForm, agencyId: user?.id || ''});
  const [isNewTrip, setIsNewTrip] = useState(true);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [showTripPreview, setShowTripPreview] = useState(false);
  const [searchTripTerm, setSearchTripTerm] = useState('');

  // Subscription State
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [showSubscriptionConfirmModal, setShowSubscriptionConfirmModal] = useState(false);
  const [selectedPlanForConfirmation, setSelectedPlanForConfirmation] = useState<Plan | null>(null);

  // Agency data specific to the logged-in user
  const currentAgency = user?.role === UserRole.AGENCY ? (user as Agency) : undefined;
  const myTrips = currentAgency ? getAgencyTrips(currentAgency.agencyId) : [];
  const myReviews = currentAgency ? getReviewsByAgencyId(currentAgency.agencyId) : [];
  const agencyStats = currentAgency ? getAgencyStats(currentAgency.agencyId) : { totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0 };
  const featuredTrips = myTrips.filter(t => t.featured);
  const heroConfigured = currentAgency?.heroMode === 'STATIC' && currentAgency.heroBannerUrl && currentAgency.heroTitle;

  // --- HANDLERS ---

  const handleTabChange = (tab: 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') => {
      setSearchParams({ tab });
      setSearchTripTerm('');
      setIsNewTrip(true);
  };

  const handleSelectPlan = (plan: Plan) => {
      setSelectedPlanForConfirmation(plan);
      setShowSubscriptionConfirmModal(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlanForConfirmation || !currentAgency) return;

    setActivatingPlanId(selectedPlanForConfirmation.id);
    try {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year subscription
        await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', selectedPlanForConfirmation.id as 'BASIC' | 'PREMIUM', futureDate.toISOString());
        await reloadUser(); // Refresh user context to reflect active status
        showToast('Assinatura ativada com sucesso!', 'success');
        setShowSubscriptionConfirmModal(false);
        setSearchParams({ tab: 'OVERVIEW' }); // Redirect to overview
    } catch (error: any) {
        showToast('Erro ao ativar assinatura: ' + error.message, 'error');
    } finally {
        setActivatingPlanId(null);
    }
  };

  // Profile Settings Handlers
  useEffect(() => {
    if (currentAgency) {
      setEditFormData({
        name: currentAgency.name,
        description: currentAgency.description || '',
        cnpj: currentAgency.cnpj || '',
        slug: currentAgency.slug || '',
        phone: currentAgency.phone || '',
        whatsapp: currentAgency.whatsapp || '',
        website: currentAgency.website || '',
        address: currentAgency.address || { zipCode: '', street: '', number: '', district: '', city: '', state: '' }, // FIX: Default for Address
        bankInfo: currentAgency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' }, // FIX: Default for BankInfo
        heroMode: currentAgency.heroMode || 'TRIPS',
        heroBannerUrl: currentAgency.heroBannerUrl || '',
        heroTitle: currentAgency.heroTitle || '',
        heroSubtitle: currentAgency.heroSubtitle || '',
        customSettings: currentAgency.customSettings || { tags: [], included: [], notIncluded: [], paymentMethods: [] }
      });
    }
  }, [currentAgency]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency) return;
    setIsSavingSettings(true);
    try {
      await updateUser({
        id: currentAgency.id, // Auth User ID
        agencyId: currentAgency.agencyId, // Agencies Table PK
        name: editFormData.name,
        description: editFormData.description,
        cnpj: editFormData.cnpj,
        slug: editFormData.slug,
        phone: editFormData.phone,
        whatsapp: editFormData.whatsapp,
        website: editFormData.website,
        address: editFormData.address,
        bankInfo: editFormData.bankInfo,
        heroMode: editFormData.heroMode,
        heroBannerUrl: editFormData.heroBannerUrl,
        heroTitle: editFormData.heroTitle,
        heroSubtitle: editFormData.heroSubtitle,
        customSettings: editFormData.customSettings
      });
      await reloadUser(); // Reload user data to update the context with latest agency info
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (error: any) {
      console.error("Error saving settings:", error);
      showToast('Erro ao salvar configurações: ' + error.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'banner') => {
    if (!currentAgency) return;
    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingBanner(true);

    try {
      const bucket = type === 'logo' ? 'agency-logos' : 'trip-images'; // Reusing trip-images bucket for banners
      const url = await uploadImage(file, bucket);
      if (url) {
        setEditFormData(prev => ({ ...prev, [type === 'logo' ? 'logo' : 'heroBannerUrl']: url }));
        showToast(`${type === 'logo' ? 'Logo' : 'Banner'} enviado com sucesso!`, 'success');
      } else {
        showToast(`Erro ao enviar ${type === 'logo' ? 'logo' : 'banner'}.`, 'error');
      }
    } catch (error: any) {
      showToast(`Erro ao enviar ${type === 'logo' ? 'logo' : 'banner'}.`, 'error');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingBanner(false);
    }
  };

  const handleDeleteImage = (type: 'logo' | 'banner') => {
      if (type === 'logo') setEditFormData(prev => ({ ...prev, logo: '' }));
      else setEditFormData(prev => ({ ...prev, heroBannerUrl: '' }));
      showToast(`${type === 'logo' ? 'Logo' : 'Banner'} removido. Salve as alterações para confirmar.`, 'info');
  };

  // Trip Management Handlers
  const handleEditTrip = (trip: Trip) => {
    setTripForm({
      ...trip,
      startDate: new Date(trip.startDate).toISOString().split('T')[0],
      endDate: new Date(trip.endDate).toISOString().split('T')[0],
    });
    setIsNewTrip(false);
    setSearchParams({ tab: 'TRIPS', action: 'edit', id: trip.id });
  };

  const handleNewTrip = () => {
    setTripForm({...defaultTripForm, agencyId: currentAgency?.agencyId || ''});
    setIsNewTrip(true);
    setSearchParams({ tab: 'TRIPS', action: 'new' });
  };

  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency || isSubmittingTrip) return;
    setIsSubmittingTrip(true);

    try {
      if (isNewTrip) {
        // Ensure slug is generated if not provided
        const finalSlug = tripForm.slug || slugify(tripForm.title || '');
        await createTrip({ ...tripForm as Trip, agencyId: currentAgency.agencyId, slug: finalSlug, is_active: true });
        showToast('Pacote criado com sucesso!', 'success');
      } else {
        // Ensure slug is generated if not provided or updated
        const finalSlug = tripForm.slug || slugify(tripForm.title || '');
        await updateTrip({ ...tripForm as Trip, agencyId: currentAgency.agencyId, slug: finalSlug });
        showToast('Pacote atualizado com sucesso!', 'success');
      }
      setSearchParams({ tab: 'TRIPS' }); // Go back to trip list view
    } catch (error: any) {
      console.error("Error saving trip:", error);
      showToast('Erro ao salvar pacote: ' + error.message, 'error');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleDuplicateTrip = async (tripToDuplicate: Trip) => {
    if (!currentAgency || !window.confirm(`Tem certeza que deseja duplicar "${tripToDuplicate.title}"?`)) return;

    setIsSubmittingTrip(true);
    try {
        const duplicatedTrip: Trip = {
            ...tripToDuplicate,
            id: crypto.randomUUID(), // Generate new ID
            title: `${tripToDuplicate.title} (Cópia)`,
            slug: slugify(`${tripToDuplicate.title}-copia-${Date.now()}`),
            is_active: false, // Duplicates start as inactive
            featured: false,
            featuredInHero: false,
            views: 0,
            sales: 0,
            // FIX: Remove 'createdAt' as it does not exist on type 'Trip'
            // createdAt: new Date().toISOString() 
        };
        await createTrip(duplicatedTrip);
        showToast('Pacote duplicado com sucesso!', 'success');
        setSearchParams({ tab: 'TRIPS' });
    } catch (error: any) {
        console.error("Error duplicating trip:", error);
        showToast('Erro ao duplicar pacote: ' + error.message, 'error');
    } finally {
        setIsSubmittingTrip(false);
    }
  };

  const filteredAgencyTrips = myTrips.filter(trip => 
    trip.title.toLowerCase().includes(searchTripTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTripTerm.toLowerCase())
  );

  // Theme settings (for Admin, but using context here to set preview for current agency)
  const handlePreviewTheme = async (colors: ThemeColors) => {
    if (!currentAgency) return;
    setAgencyTheme(colors);
    // You could also save it to DB temporarily here for persistent preview across pages
    // For this dashboard, just local context change is enough for immediate feedback
  };

  // --- RENDER LOGIC ---

  if (!currentAgency) {
      return <div className="min-h-screen flex items-center justify-center">Carregando dados da agência...</div>;
  }

  if (currentAgency.subscriptionStatus === 'INACTIVE' || currentAgency.subscriptionStatus === 'PENDING') {
    return (
      <SubscriptionActivationView
        agency={currentAgency}
        onSelectPlan={handleSelectPlan}
        activatingPlanId={activatingPlanId}
      />
    );
  }

  // Current year for expiration calculation
  const currentYear = new Date().getFullYear();
  const subscriptionExpiresAtYear = new Date(currentAgency.subscriptionExpiresAt).getFullYear();
  const isExpired = new Date(currentAgency.subscriptionExpiresAt) < new Date();
  const hasExpiredThisYear = isExpired && subscriptionExpiresAtYear === currentYear;
  const isExpiringSoon = !isExpired && (new Date(currentAgency.subscriptionExpiresAt).getTime() - Date.now()) < (30 * 24 * 60 * 60 * 1000); // Less than 30 days

  const fullAgencyLink = window.location.origin + `/#/${currentAgency.slug}`;

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold text-gray-900">Painel de Agência</h1>
        <div className="flex flex-wrap gap-3">
            <button onClick={refreshData} disabled={false} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                <RefreshCw size={18} className="mr-2"/>
                Atualizar Dados
            </button>
            <Link to={fullAgencyLink} target="_blank" className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-100 transition-colors">
                <Eye size={18} className="mr-2"/>
                Ver Perfil Público
            </Link>
            <button onClick={logout} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-red-100 transition-colors">
                <LogOut size={18} className="mr-2"/>
                Sair
            </button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} activeTab={activeTab} onClick={handleTabChange} hasNotification={isExpired || isExpiringSoon} />
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {/* Content based on activeTab */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Faturamento Bruto" value={`R$ ${agencyStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="Total de vendas confirmadas" icon={DollarSign} color="green"/>
              <StatCard title="Pacotes Ativos" value={myTrips.filter(t => t.is_active).length} subtitle="Viagens publicadas" icon={Plane} color="blue"/>
              <StatCard title="Visualizações" value={agencyStats.totalViews.toLocaleString()} subtitle="Visitas aos seus pacotes" icon={Eye} color="purple"/>
              <StatCard title="Vendas Realizadas" value={agencyStats.totalSales} subtitle="Reservas confirmadas" icon={ShoppingBag} color="amber"/>
              <StatCard title="Avaliação Média" value={`${agencyStats.averageRating > 0 ? agencyStats.averageRating.toFixed(1) : '---'}/5`} subtitle={`${myReviews.length} avaliações`} icon={Star} color="green"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Meus Pacotes em Destaque */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                      <span className="flex items-center"><Rocket size={20} className="mr-2 text-primary-600"/> Meus Pacotes em Destaque</span>
                      <Link to="?tab=TRIPS" className="text-sm font-bold text-gray-500 hover:text-primary-600">Ver todos &rarr;</Link>
                  </h3>
                  {featuredTrips.length > 0 ? (
                      <div className="space-y-4">
                          {featuredTrips.slice(0, 3).map(trip => (
                              <div key={trip.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                      <img src={trip.images[0] || 'https://placehold.co/100x80/e2e8f0/e2e8f0'} alt={trip.title} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1">
                                      <p className="font-bold text-gray-900 text-sm line-clamp-1">{trip.title}</p>
                                      <p className="text-xs text-gray-500">{trip.destination}</p>
                                  </div>
                                  <span className="text-sm font-bold text-primary-600">R$ {trip.price.toLocaleString('pt-BR')}</span>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">Nenhum pacote em destaque ainda.</div>
                  )}
              </div>

              {/* Últimas Avaliações */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                      <span className="flex items-center"><MessageSquare size={20} className="mr-2 text-green-600"/> Últimas Avaliações</span>
                      <Link to="?tab=REVIEWS" className="text-sm font-bold text-gray-500 hover:text-green-600">Ver todas &rarr;</Link>
                  </h3>
                  {myReviews.length > 0 ? (
                      <div className="space-y-4 max-h-[250px] overflow-y-auto scrollbar-thin">
                          {myReviews.slice(0, 5).map(review => (
                              <div key={review.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                                          <div className="flex text-amber-400 text-xs">
                                              {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                                          </div>
                                      </div>
                                      <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{review.comment}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-400 text-sm">Nenhuma avaliação ainda.</div>
                  )}
              </div>
          </div>
        </div>
      )}

      {activeTab === 'TRIPS' && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">{isNewTrip ? 'Criar Novo Pacote' : `Editar Pacote: ${tripForm.title}`}</h2>
                  <div className="flex gap-3">
                      <div className="relative">
                          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                          <input type="text" placeholder="Buscar pacote..." value={searchTripTerm} onChange={e => setSearchTripTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"/>
                      </div>
                      <button onClick={handleNewTrip} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm"><Plus size={18}/> Novo Pacote</button>
                  </div>
              </div>

              {searchParams.get('action') === 'new' || searchParams.get('action') === 'edit' ? (
                  <form onSubmit={handleSaveTrip} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote</label><input type="text" value={tripForm.title || ''} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Destino</label><input type="text" value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa</label><input type="number" value={tripForm.price || 0} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label><input type="number" value={tripForm.durationDays || 1} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required min={1}/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label><input type="date" value={tripForm.startDate || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Término</label><input type="date" value={tripForm.endDate || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label><select value={tripForm.category || 'PRAIA'} onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                              <option value="PRAIA">Praia</option><option value="AVENTURA">Aventura</option><option value="FAMILIA">Família</option><option value="ROMANTICO">Romântico</option><option value="URBANO">Urbano</option><option value="NATUREZA">Natureza</option><option value="CULTURA">Cultura</option><option value="GASTRONOMICO">Gastronômico</option><option value="VIDA_NOTURNA">Vida Noturna</option><option value="VIAGEM_BARATA">Viagem Barata</option><option value="ARTE">Arte</option>
                          </select></div>
                           <div><label className="block text-sm font-bold text-gray-700 mb-2">Slug da Viagem</label><input type="text" value={tripForm.slug || ''} onChange={e => setTripForm({...tripForm, slug: slugify(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 font-mono text-primary-700" placeholder="automatico-se-vazio"/></div>
                      </div>

                      <ImageManager images={tripForm.images || []} onChange={(newImages) => setTripForm({...tripForm, images: newImages})} />
                      
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Detalhada</label>
                          <RichTextEditor value={tripForm.description || ''} onChange={(html) => setTripForm({...tripForm, description: html})} />
                      </div>

                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Tipos de Viajantes</label><PillInput value={tripForm.travelerTypes || []} onChange={(newTypes) => setTripForm({...tripForm, travelerTypes: newTypes as TravelerType[]})} placeholder="Adicionar tipo de viajante..." suggestions={SUGGESTED_TRAVELERS}/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Tags</label><PillInput value={tripForm.tags || []} onChange={(newTags) => setTripForm({...tripForm, tags: newTags})} placeholder="Adicionar tag..." suggestions={SUGGESTED_TAGS} customSuggestions={currentAgency?.customSettings?.tags} onDeleteCustomSuggestion={(item) => { if(currentAgency?.customSettings?.tags) updateUser({customSettings: {...currentAgency.customSettings, tags: currentAgency.customSettings.tags.filter(t => t !== item)}}); reloadUser(); }}/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Incluso</label><PillInput value={tripForm.included || []} onChange={(newItems) => setTripForm({...tripForm, included: newItems})} placeholder="Adicionar item incluso..." suggestions={SUGGESTED_INCLUDED} customSuggestions={currentAgency?.customSettings?.included} onDeleteCustomSuggestion={(item) => { if(currentAgency?.customSettings?.included) updateUser({customSettings: {...currentAgency.customSettings, included: currentAgency.customSettings.included.filter(t => t !== item)}}); reloadUser(); }}/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Não Incluso</label><PillInput value={tripForm.notIncluded || []} onChange={(newItems) => setTripForm({...tripForm, notIncluded: newItems})} placeholder="Adicionar item não incluso..." suggestions={SUGGESTED_NOT_INCLUDED} customSuggestions={currentAgency?.customSettings?.notIncluded} onDeleteCustomSuggestion={(item) => { if(currentAgency?.customSettings?.notIncluded) updateUser({customSettings: {...currentAgency.customSettings, notIncluded: currentAgency.customSettings.notIncluded.filter(t => t !== item)}}); reloadUser(); }}/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Métodos de Pagamento</label><PillInput value={tripForm.paymentMethods || []} onChange={(newMethods) => setTripForm({...tripForm, paymentMethods: newMethods})} placeholder="Adicionar método de pagamento..." suggestions={SUGGESTED_PAYMENTS} customSuggestions={currentAgency?.customSettings?.paymentMethods} onDeleteCustomSuggestion={(item) => { if(currentAgency?.customSettings?.paymentMethods) updateUser({customSettings: {...currentAgency.customSettings, paymentMethods: currentAgency.customSettings.paymentMethods.filter(t => t !== item)}}); reloadUser(); }}/></div>
                      
                      {/* Itinerary Section */}
                      <div className="md:col-span-2">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Roteiro</h3>
                        {tripForm.itinerary?.map((item, index) => (
                            <div key={index} className="flex gap-4 p-4 mb-3 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Dia</label>
                                    <input type="number" value={item.day} onChange={e => { const newItinerary = [...tripForm.itinerary!]; newItinerary[index].day = Number(e.target.value); setTripForm({...tripForm, itinerary: newItinerary}); }} className="w-full border p-2 rounded-lg" required/>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Título do Dia</label>
                                    <input type="text" value={item.title} onChange={e => { const newItinerary = [...tripForm.itinerary!]; newItinerary[index].title = e.target.value; setTripForm({...tripForm, itinerary: newItinerary}); }} className="w-full border p-2 rounded-lg" required/>
                                </div>
                                <div className="flex-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Descrição do Dia</label>
                                    <textarea value={item.description} onChange={e => { const newItinerary = [...tripForm.itinerary!]; newItinerary[index].description = e.target.value; setTripForm({...tripForm, itinerary: newItinerary}); }} className="w-full border p-2 rounded-lg h-20 resize-none" required/>
                                </div>
                                <button type="button" onClick={() => setTripForm({...tripForm, itinerary: tripForm.itinerary!.filter((_, i) => i !== index)})} className="text-red-500 hover:text-red-700"><Trash2 size={20}/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => setTripForm({...tripForm, itinerary: [...(tripForm.itinerary || []), {day: (tripForm.itinerary?.length || 0) + 1, title: '', description: ''}]})} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"><Plus size={18}/> Adicionar Dia ao Roteiro</button>
                      </div>

                      <div className="md:col-span-2 flex items-center gap-4 border-t border-gray-100 pt-6">
                        <label className="flex items-center text-sm font-bold text-gray-700">
                          <input type="checkbox" checked={tripForm.is_active || false} onChange={e => setTripForm({...tripForm, is_active: e.target.checked})} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"/>
                          Pacote Ativo (visível ao público)
                        </label>
                        <label className="flex items-center text-sm font-bold text-gray-700">
                          <input type="checkbox" checked={tripForm.featured || false} onChange={e => setTripForm({...tripForm, featured: e.target.checked})} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"/>
                          Destacar na Home Global (requer aprovação admin)
                        </label>
                        <label className="flex items-center text-sm font-bold text-gray-700">
                          <input type="checkbox" checked={tripForm.featuredInHero || false} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"/>
                          Destaque no Carrossel da sua Home
                        </label>
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-3 border-t border-gray-100 pt-6">
                          <button type="button" onClick={() => setShowTripPreview(true)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"><Eye size={18}/> Prévia</button>
                          <button type="button" onClick={() => setSearchParams({tab: 'TRIPS'})} className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">Cancelar</button>
                          <button type="submit" disabled={isSubmittingTrip} className="bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
                              {isSubmittingTrip ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Pacote
                          </button>
                      </div>
                  </form>
              ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                              <tr>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destino</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {filteredAgencyTrips.length > 0 ? filteredAgencyTrips.map(trip => (
                                  <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                                  <img src={trip.images[0] || 'https://placehold.co/100x80/e2e8f0/e2e8f0'} alt={trip.title} className="w-full h-full object-cover" />
                                              </div>
                                              <div className="truncate">
                                                  <p className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px]">{trip.title}</p>
                                                  <p className="text-xs text-gray-500">{trip.category}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-700">{trip.destination}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString('pt-BR')}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${trip.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                                              {trip.is_active ? 'ATIVO' : 'PAUSADO'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <ActionsMenu
                                              trip={trip}
                                              onEdit={() => handleEditTrip(trip)}
                                              onDuplicate={() => handleDuplicateTrip(trip)}
                                              onDelete={() => { if (window.confirm('Tem certeza que deseja excluir este pacote?')) deleteTrip(trip.id); }}
                                              onToggleStatus={() => toggleTripStatus(trip.id)}
                                              fullAgencyLink={fullAgencyLink}
                                          />
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan={5} className="text-center py-10 text-gray-500">
                                          {searchTripTerm ? "Nenhum pacote encontrado para a busca." : "Você ainda não tem nenhum pacote cadastrado."}
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'SUBSCRIPTION' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Minha Assinatura</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <p className="text-sm text-gray-500 uppercase font-bold mb-2">Plano Atual</p>
                      <h3 className="text-2xl font-bold text-primary-600 mb-4">{currentAgency.subscriptionPlan}</h3>
                      <p className="text-sm text-gray-700 mb-2">Status: <span className={`font-bold ${currentAgency.subscriptionStatus === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>{currentAgency.subscriptionStatus}</span></p>
                      <p className="text-sm text-gray-700">Expira em: <span className="font-bold">{new Date(currentAgency.subscriptionExpiresAt).toLocaleDateString()}</span></p>
                      
                      {(isExpired || isExpiringSoon) && (
                          <div className={`mt-6 p-3 rounded-lg flex items-center gap-3 ${isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'} border ${isExpired ? 'border-red-200' : 'border-amber-200'}`}>
                              <AlertCircle size={20}/>
                              <p className="text-xs font-medium">
                                  {isExpired ? 'Sua assinatura expirou. Renove para manter seus pacotes ativos!' : 'Sua assinatura expira em breve. Renove para evitar interrupções.'}
                              </p>
                          </div>
                      )}
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Mudar de Plano</h3>
                      {PLANS.filter(p => p.id !== currentAgency.subscriptionPlan).map(plan => (
                        <div key={plan.id} className="mb-4 last:mb-0 p-4 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50">
                            <div>
                                <h4 className="font-bold text-gray-900">{plan.name}</h4>
                                <p className="text-sm text-gray-600">R$ {plan.price.toFixed(2)}/mês</p>
                            </div>
                            <button onClick={() => handleSelectPlan(plan)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">
                                Selecionar
                            </button>
                        </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'SETTINGS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Agência</h2>
              <form onSubmit={handleSaveSettings} className="space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 border-b border-gray-100 pb-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-4">Informações Básicas</h3>
                          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                              <LogoUpload currentLogo={editFormData.logo} onUpload={(url) => setEditFormData(prev => ({...prev, logo: url}))}/>
                              <div className="flex-1 w-full sm:w-auto">
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Agência</label>
                                  <input type="text" value={editFormData.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required/>
                              </div>
                          </div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label><textarea rows={3} value={editFormData.description || ''} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">CNPJ</label><input type="text" value={editFormData.cnpj || ''} onChange={e => setEditFormData({...editFormData, cnpj: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Opcional"/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Slug da URL (ex: /sua-agencia)</label><input type="text" value={editFormData.slug || ''} onChange={e => setEditFormData({...editFormData, slug: slugify(e.target.value)})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 font-mono text-primary-700"/></div>
                      </div>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6">
                      <div className="md:col-span-2"><h3 className="text-xl font-bold text-gray-900 mb-4">Contatos</h3></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label><input type="text" value={editFormData.phone || ''} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label><input type="text" value={editFormData.whatsapp || ''} onChange={e => setEditFormData({...editFormData, whatsapp: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                      <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-2">Website</label><input type="url" value={editFormData.website || ''} onChange={e => setEditFormData({...editFormData, website: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="https://www.seuwebsite.com.br"/></div>
                  </div>

                  {/* Address & Bank Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6">
                      <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-4">Endereço</h3>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Rua</label><input type="text" value={editFormData.address?.street || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, street: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Número</label><input type="text" value={editFormData.address?.number || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, number: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Complemento</label><input type="text" value={editFormData.address?.complement || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, complement: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Bairro</label><input type="text" value={editFormData.address?.district || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, district: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">CEP</label><input type="text" value={editFormData.address?.zipCode || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, zipCode: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Cidade</label><input type="text" value={editFormData.address?.city || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, city: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                              <div><label className="block text-sm font-bold text-gray-700 mb-2">Estado</label><input type="text" value={editFormData.address?.state || ''} onChange={e => setEditFormData({...editFormData, address: {...editFormData.address, state: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          </div>
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-4">Dados Bancários (Para Recebimento)</h3>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Banco</label><input type="text" value={editFormData.bankInfo?.bank || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, bank: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div className="mt-4"><label className="block text-sm font-bold text-gray-700 mb-2">Agência</label><input type="text" value={editFormData.bankInfo?.agency || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, agency: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div className="mt-4"><label className="block text-sm font-bold text-gray-700 mb-2">Conta</label><input type="text" value={editFormData.bankInfo?.account || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, account: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div className="mt-4"><label className="block text-sm font-bold text-gray-700 mb-2">Chave Pix</label><input type="text" value={editFormData.bankInfo?.pixKey || ''} onChange={e => setEditFormData({...editFormData, bankInfo: {...editFormData.bankInfo, pixKey: e.target.value}})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                      </div>
                  </div>

                  {/* Hero / Microsite Config */}
                  <div className="border-b border-gray-100 pb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Configuração da Página Inicial (Microsite)</h3>
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Modo da Página Inicial</label>
                        <select value={editFormData.heroMode || 'TRIPS'} onChange={e => setEditFormData({...editFormData, heroMode: e.target.value as 'TRIPS' | 'STATIC'})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white">
                            <option value="TRIPS">Carrossel de Pacotes em Destaque</option>
                            <option value="STATIC">Banner Estático Personalizado</option>
                        </select>
                      </div>

                      {editFormData.heroMode === 'STATIC' && (
                          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <h4 className="text-lg font-bold text-gray-900">Conteúdo do Banner Estático</h4>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Título do Banner</label>
                                  <input type="text" value={editFormData.heroTitle || ''} onChange={e => setEditFormData({...editFormData, heroTitle: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Subtítulo do Banner</label>
                                  <textarea rows={2} value={editFormData.heroSubtitle || ''} onChange={e => setEditFormData({...editFormData, heroSubtitle: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"/>
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">URL da Imagem de Fundo (Banner)</label>
                                  <input type="text" value={editFormData.heroBannerUrl || ''} onChange={e => setEditFormData({...editFormData, heroBannerUrl: e.target.value})} className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="https://exemplo.com/banner.jpg"/>
                                  <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg transition-all group mt-3 ${isUploadingBanner ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'border-primary-200 bg-primary-50/50 hover:bg-primary-50 hover:border-primary-400 cursor-pointer'}`}>
                                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files?.[0] as File, 'banner')} disabled={isUploadingBanner}/>
                                      {isUploadingBanner ? <Loader className="animate-spin text-primary-600" /> : <Upload className="text-primary-400 group-hover:text-primary-600 transition-colors" />}
                                      <span className="text-sm font-bold text-primary-600 mt-2">{isUploadingBanner ? 'Enviando...' : 'Adicionar Imagem de Fundo'}</span>
                                  </label>
                                  {editFormData.heroBannerUrl && (
                                      <div className="relative mt-4 group">
                                          <img src={editFormData.heroBannerUrl} alt="Hero Banner Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200"/>
                                          <button type="button" onClick={() => handleDeleteImage('banner')} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Remover imagem"><X size={14}/></button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                      {editFormData.heroMode === 'TRIPS' && !heroConfigured && (
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                              <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                              <p className="text-xs text-blue-700">
                                  No modo "Carrossel de Pacotes", certifique-se de destacar alguns pacotes na seção "Meus Pacotes" para que apareçam aqui.
                              </p>
                          </div>
                      )}
                  </div>

                  {/* Custom Suggestions */}
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Sugestões Personalizadas (para criação de pacotes)</h3>
                      <div className="space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Tags Personalizadas</label><PillInput value={editFormData.customSettings?.tags || []} onChange={(newTags) => setEditFormData({...editFormData, customSettings: {...editFormData.customSettings, tags: newTags}})} placeholder="Adicionar tag sugerida..." /></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Itens Inclusos Personalizados</label><PillInput value={editFormData.customSettings?.included || []} onChange={(newItems) => setEditFormData({...editFormData, customSettings: {...editFormData.customSettings, included: newItems}})} placeholder="Adicionar item incluso sugerido..." /></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Itens Não Inclusos Personalizados</label><PillInput value={editFormData.customSettings?.notIncluded || []} onChange={(newItems) => setEditFormData({...editFormData, customSettings: {...editFormData.customSettings, notIncluded: newItems}})} placeholder="Adicionar item não incluso sugerido..." /></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento Personalizadas</label><PillInput value={editFormData.customSettings?.paymentMethods || []} onChange={(newMethods) => setEditFormData({...editFormData, customSettings: {...editFormData.customSettings, paymentMethods: newMethods}})} placeholder="Adicionar forma de pagamento sugerida..." /></div>
                      </div>
                  </div>

                  <div className="flex justify-end border-t border-gray-100 pt-6">
                      <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
                          {isSavingSettings ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Configurações
                      </button>
                  </div>
              </form>
          </div>
      )}

      {showTripPreview && tripForm && (
        <TripPreviewModal trip={tripForm} agency={currentAgency} onClose={() => setShowTripPreview(false)} />
      )}

      {showSubscriptionConfirmModal && selectedPlanForConfirmation && (
        <SubscriptionConfirmationModal
          plan={selectedPlanForConfirmation}
          onClose={() => setShowSubscriptionConfirmModal(false)}
          onConfirm={handleConfirmSubscription}
          isSubmitting={!!activatingPlanId}
        />
      )}
    </div>
  );
};

export default AgencyDashboard;
