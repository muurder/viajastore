
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw } from 'lucide-react';
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
  icon: any;
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
                        <span className="text-2xl font-bold text-primary-600">R$ {plan.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Cobrança mensal</p>
                </div>
                <button onClick={onConfirm} disabled={isSubmitting} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader size={18} className="animate-spin" /> : 'Confirmar Assinatura'}
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
  const { user, updateUser, uploadImage, reloadUser } = useAuth();
  const { getAgencyTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, agencies, getAgencyStats, trips, bookings, clients, getReviewsByAgencyId, getAgencyTheme, saveAgencyTheme, refreshData } = useData();
  const { setAgencyTheme } = useTheme(); // For previewing
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') || 'OVERVIEW';
  const viewMode = (searchParams.get('view') as 'LIST' | 'FORM') || 'LIST';
  const editingTripId = searchParams.get('editId');

  const [settingsSection, setSettingsSection] = useState<'PROFILE' | 'PAGE' | 'THEME'>('PROFILE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  const [lastReadTime, setLastReadTime] = useState(Number(localStorage.getItem('agency_last_read_sales') || 0));
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // FIX: Fallback to 'user' if global agencies list isn't ready or matching yet.
  const agencyFromData = agencies.find(a => a.id === user?.id);
  const myAgency = (agencyFromData || user) as Agency;

  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({});
  const [tripForm, setTripForm] = useState<Partial<Trip>>(defaultTripForm);
  const [slugTouched, setSlugTouched] = useState(false);

  // Theme State
  const [themeForm, setThemeForm] = useState<ThemeColors>({ primary: '#3b82f6', secondary: '#f97316', background: '#ffffff', text: '#111827' });
  const [loadingTheme, setLoadingTheme] = useState(false);

  const customSettings = myAgency?.customSettings || { tags: [], included: [], notIncluded: [], paymentMethods: [] };

  useEffect(() => { if(myAgency) { setAgencyForm({ ...myAgency, heroMode: myAgency.heroMode || 'TRIPS' }); } }, [myAgency]);

  // Fetch Theme on Settings Open
  useEffect(() => {
      const loadTheme = async () => {
          if (user && settingsSection === 'THEME') {
              setLoadingTheme(true);
              const theme = await getAgencyTheme(myAgency.agencyId);
              if (theme) {
                  setThemeForm(theme.colors);
              }
              setLoadingTheme(false);
          }
      };
      loadTheme();
  }, [settingsSection, user]);

  // Live Preview of Theme
  useEffect(() => {
      if (settingsSection === 'THEME') {
          setAgencyTheme(themeForm);
      }
  }, [themeForm, settingsSection]);

  useEffect(() => {
    if (viewMode === 'FORM') {
        if (editingTripId) {
            const tripToEdit = trips.find(t => t.id === editingTripId);
            if (tripToEdit) { setTripForm({ ...defaultTripForm, ...tripToEdit, startDate: tripToEdit.startDate?.split('T')[0], endDate: tripToEdit.endDate?.split('T')[0] }); setSlugTouched(true); }
        } else {
            const savedDraft = localStorage.getItem('trip_draft');
            if (savedDraft) { try { setTripForm(JSON.parse(savedDraft)); } catch (e) { setTripForm(defaultTripForm); } } else { setTripForm(defaultTripForm); }
            setSlugTouched(false);
        }
    }
  }, [viewMode, editingTripId, trips]);

  useEffect(() => { if (viewMode === 'FORM' && !editingTripId) { const timeout = setTimeout(() => { localStorage.setItem('trip_draft', JSON.stringify(tripForm)); }, 500); return () => clearTimeout(timeout); } }, [tripForm, viewMode, editingTripId]);
  
  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };
  
  const handleConfirmPayment = async () => {
    if (!supabase || !myAgency || !selectedPlan || !user) return;
    
    setIsSubmitting(true);
    console.log('[Subscription] Activating plan', { planId: selectedPlan.id, userId: user.id });

    try {
      // FIX: Ensure parameters match the SQL function signature (p_plan_id, p_user_id)
      const { data, error } = await supabase.rpc("activate_agency_subscription", {
        p_plan_id: selectedPlan.id,
        p_user_id: user.id,
      });

      if (error) throw error;
      
      console.log('[Subscription] Subscription activated:', data);
      showToast('Assinatura ativada com sucesso! Bem-vindo(a)! 🎉', 'success');
      
      await reloadUser();
      await refreshData();
      
      setShowPayment(false);

    } catch (err: any) {
      console.error('[Subscription] Error activating subscription:', err);
      showToast(err.message || 'Não foi possível ativar sua assinatura. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
      setSelectedPlan(null); // Clear selected plan on success or error to reset the form
    }
  };


  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;
  if (!myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-primary-600" /></div>;

  const isActive = myAgency.is_active;

  if (!isActive) {
    return (
      <>
        <SubscriptionActivationView 
          agency={myAgency}
          onSelectPlan={handleSelectPlan}
          activatingPlanId={isSubmitting ? selectedPlan?.id || null : null}
        />
        {showPayment && selectedPlan && (
            <SubscriptionConfirmationModal 
                plan={selectedPlan}
                onClose={() => setShowPayment(false)}
                onConfirm={handleConfirmPayment}
                isSubmitting={isSubmitting}
            />
        )}
      </>
    );
  }

  const myTrips = getAgencyTrips(myAgency.agencyId);
  const stats = getAgencyStats(myAgency.agencyId);
  
  // Updated: Get Agency Reviews, not trip reviews
  const myReviews = getReviewsByAgencyId(myAgency.agencyId);

  const agencyBookings = bookings.filter(b => { const trip = trips.find(t => t.id === b.tripId); return trip && trip.agencyId === myAgency.agencyId; }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentBookings = agencyBookings.slice(0, 5);
  const newSalesCount = recentBookings.filter(b => new Date(b.date).getTime() > lastReadTime).length;

  const handleClearNotifications = () => { const now = Date.now(); setLastReadTime(now); localStorage.setItem('agency_last_read_sales', String(now)); showToast('Notificações marcadas como lidas.', 'success'); };

  // Grouped Sales Logic
  const salesByTrip = agencyBookings.reduce((acc, booking) => {
      const trip = trips.find(t => t.id === booking.tripId);
      if (!trip) return acc;
      if (!acc[trip.id]) acc[trip.id] = { title: trip.title, count: 0, total: 0, image: trip.images?.[0], passengers: 0 };
      acc[trip.id].count += 1;
      acc[trip.id].total += booking.totalPrice;
      acc[trip.id].passengers += (booking.passengers || 1);
      return acc;
  }, {} as Record<string, { title: string, count: number, total: number, image?: string, passengers: number }>);

  const filteredTrips = myTrips.filter(t => t.title.toLowerCase().includes(tripSearch.toLowerCase()));
  const rawSlug = agencyForm.slug || myAgency.slug || '';
  const cleanSlug = rawSlug.replace(/[^a-z0-9-]/gi, '');
  const fullAgencyLink = cleanSlug ? `${window.location.origin}/#/${cleanSlug}` : '';

  const updateParams = (newParams: Record<string, string | null>) => { setSearchParams(prev => { const next = new URLSearchParams(prev); Object.entries(newParams).forEach(([key, val]) => { if (val === null) next.delete(key); else next.set(key, val); }); return next; }); };
  const handleTabChange = (tab: string) => { updateParams({ tab, view: null, editId: null }); };
  const handleOpenCreate = () => { updateParams({ view: 'FORM', editId: null }); };
  const handleOpenEdit = (trip: Trip) => { updateParams({ view: 'FORM', editId: trip.id }); };
  const handleBackToList = () => { updateParams({ view: 'LIST', editId: null }); };

  const handleDuplicateTrip = async (trip: Trip) => { if(!window.confirm(`Deseja duplicar "${trip.title}"?`)) return; const { id, ...rest } = trip; const duplicatedTrip = { ...rest, title: `${trip.title} (Cópia)`, slug: `${slugify(trip.title)}-copia-${Date.now()}`, is_active: false, views: 0, sales: 0, featuredInHero: false }; try { await createTrip(duplicatedTrip as Trip); showToast('Pacote duplicado como Rascunho.', 'success'); } catch (err) { showToast('Erro ao duplicar pacote.', 'error'); } };
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newTitle = e.target.value; setTripForm(prev => ({ ...prev, title: newTitle, ...(!slugTouched && { slug: slugify(newTitle) }) })); };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    const tripData = { ...tripForm, agencyId: myAgency.agencyId } as Trip; // Use agency PK
    const newSettings = { ...customSettings }; let settingsChanged = false;
    const updateSuggestions = (key: keyof typeof newSettings, items: string[] | undefined, existingList: string[]) => { if (!items) return; items.forEach(item => { if (!existingList.includes(item) && !newSettings[key]?.includes(item)) { newSettings[key] = [...(newSettings[key] || []), item]; settingsChanged = true; } }); };
    updateSuggestions('tags', tripData.tags, SUGGESTED_TAGS); updateSuggestions('included', tripData.included, SUGGESTED_INCLUDED); updateSuggestions('notIncluded', tripData.notIncluded, SUGGESTED_NOT_INCLUDED); updateSuggestions('paymentMethods', tripData.paymentMethods, SUGGESTED_PAYMENTS);
    if (settingsChanged) await updateUser({ customSettings: newSettings });
    try { if (editingTripId) { await updateTrip(tripData); showToast('Viagem atualizada!', 'success'); } else { await createTrip({ ...tripData, is_active: true } as Trip); showToast('Viagem criada!', 'success'); localStorage.removeItem('trip_draft'); } handleBackToList(); } catch (err: any) { showToast('Erro ao salvar: ' + (err.message || err), 'error'); } finally { setIsSubmitting(false); }
  };

  const handleDeleteCustomSuggestion = async (type: keyof typeof customSettings, item: string) => { const currentList = customSettings[type] || []; const newList = currentList.filter(i => i !== item); const newSettings = { ...customSettings, [type]: newList }; await updateUser({ customSettings: newSettings }); showToast('Sugestão removida.', 'success'); };
  
  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pacote? A ação não pode ser desfeita.')) {
      try {
        await deleteTrip(tripId);
        showToast('Pacote excluído com sucesso.', 'success');
      } catch (err: any) {
        showToast('Erro ao excluir o pacote: ' + (err.message || 'Erro desconhecido'), 'error');
      }
    }
  };

  const handleAgencyUpdate = async (e: React.FormEvent) => { e.preventDefault(); const res = await updateUser(agencyForm); if(res.success) showToast('Configurações salvas!', 'success'); else showToast('Erro: ' + res.error, 'error'); };
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; setUploadingBanner(true); try { const url = await uploadImage(e.target.files[0], 'trip-images'); if (url) { setAgencyForm({ ...agencyForm, heroBannerUrl: url }); showToast('Banner enviado!', 'success'); } } catch(e) { showToast('Erro no upload do banner', 'error'); } finally { setUploadingBanner(false); } };
  const handleSlugChange = (val: string) => { setAgencyForm({...agencyForm, slug: slugify(val)}); };

  const handleSaveTheme = async () => {
      if (!user) return;
      setIsSubmitting(true);
      const success = await saveAgencyTheme(myAgency.agencyId, themeForm);
      if (success) showToast('Tema salvo com sucesso!', 'success');
      else showToast('Erro ao salvar tema.', 'error');
      setIsSubmitting(false);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      {showPreview && ( <TripPreviewModal trip={tripForm} agency={myAgency} onClose={() => setShowPreview(false)} /> )}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full"><img src={agencyForm.logo || myAgency.logo} className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover bg-white" alt="Logo" /><div><h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1><div className="flex items-center gap-3 mt-1">{isActive ? <p className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Ativo</p> : <p className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={12}/> Pendente</p>}{cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-primary-100 hover:underline"><Eye size={12}/> Ver Página Pública</a>)}</div></div></div>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
            <NavButton tabId="OVERVIEW" label="Visão Geral" icon={Layout} activeTab={activeTab} onClick={handleTabChange} hasNotification={newSalesCount > 0} />
            <NavButton tabId="TRIPS" label="Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
            <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} activeTab={activeTab} onClick={handleTabChange} />
            <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
          </div>
          
          <div className="animate-[fadeIn_0.3s]">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
                {/* REDESIGNED MINI SITE BANNER */}
                <div className="bg-white rounded-2xl shadow-md border-l-8 border-primary-600 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:shadow-lg transition-all">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary-50 to-transparent opacity-50 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="bg-primary-50 p-4 rounded-full text-primary-600 shadow-sm ring-1 ring-primary-100">
                            <Rocket size={28}/>
                        </div>
                        <div>
                            <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                                Seu Mini Site está no ar! 
                                <span className="bg-green-100 text-green-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Online
                                </span>
                            </h3>
                            <p className="text-gray-500 text-sm mt-1 max-w-md">
                                Divulgue seus pacotes com seu link exclusivo.
                            </p>
                            <div className="mt-2 inline-flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-md border border-gray-200">
                                <Globe size={12} className="text-gray-400"/>
                                <span className="text-xs font-mono text-gray-600 select-all">{fullAgencyLink}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 relative z-10 w-full md:w-auto">
                        <button 
                            onClick={() => { navigator.clipboard.writeText(fullAgencyLink); showToast('Link copiado!', 'success'); }} 
                            className="flex-1 md:flex-initial bg-white border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Copy size={16}/> Copiar Link
                        </button>
                        <a 
                            href={fullAgencyLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex-1 md:flex-initial bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-primary-600/20 hover:shadow-primary-600/30 active:scale-95"
                        >
                            <ExternalLink size={16}/> Acessar Agora
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group hover:border-primary-200 transition-colors"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:bg-green-100 transition-colors"><DollarSign size={24}/></div><span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Total</span></div><p className="text-sm text-gray-500 font-medium">Receita Total</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group hover:border-primary-200 transition-colors"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors"><Plane size={24}/></div><span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">Ativos</span></div><p className="text-sm text-gray-500 font-medium">Pacotes Publicados</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{myTrips.filter(t => t.is_active).length}</h3></div>
                    <div className={`bg-white p-6 rounded-2xl border shadow-sm group transition-all ${newSalesCount > 0 ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-100 hover:border-primary-200'}`}><div className="flex justify-between items-start mb-4"><div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-100 transition-colors"><ShoppingBag size={24}/></div>{newSalesCount > 0 && <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-full animate-pulse">+{newSalesCount} NOVO</span>}</div><p className="text-sm text-gray-500 font-medium">Total de Vendas</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalSales}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group hover:border-primary-200 transition-colors"><div className="flex justify-between items-start mb-4"><div className="p-3 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-100 transition-colors"><Eye size={24}/></div><span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">Conv: {stats.conversionRate.toFixed(1)}%</span></div><p className="text-sm text-gray-500 font-medium">Visualizações</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalViews.toLocaleString()}</h3></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-900 flex items-center"><ShoppingBag className="mr-2 text-green-600" size={20}/> Vendas Recentes</h3>{newSalesCount > 0 && (<button onClick={handleClearNotifications} className="text-xs font-bold text-gray-400 hover:text-primary-600 flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-200 transition-colors"><Bell size={12}/> Marcar como lidas</button>)}</div>
                            {recentBookings.length > 0 ? (<div className="space-y-3">{recentBookings.map(booking => { const trip = trips.find(t => t.id === booking.tripId); const client = clients.find(c => c.id === booking.clientId); const isNew = new Date(booking.date).getTime() > lastReadTime; return (<div key={booking.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isNew ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-600 text-sm">{client?.name.charAt(0) || 'U'}</div><div><p className="text-sm font-bold text-gray-900 flex items-center gap-2">{client?.name || 'Cliente'} {isNew && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">NOVO</span>}</p><p className="text-xs text-gray-500 line-clamp-1">{trip?.title || 'Pacote desconhecido'}</p><p className="text-[10px] text-green-600 mt-0.5 flex items-center"><Smartphone size={10} className="mr-1"/> {client?.phone || 'Sem telefone'}</p></div></div><div className="text-right"><p className="text-sm font-bold text-green-600">+ R$ {booking.totalPrice.toLocaleString()}</p><p className="text-[10px] text-gray-400">{new Date(booking.date).toLocaleDateString()}</p></div></div>); })}</div>) : (<div className="text-center py-8 text-gray-400 text-sm">Nenhuma venda registrada recentemente.</div>)}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><BarChart2 className="mr-2 text-blue-600" size={20}/> Vendas por Pacote</h3>
                            {Object.keys(salesByTrip).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(salesByTrip).map(([id, data]: [string, any]) => (
                                        <div key={id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">{data.image && <img src={data.image} className="w-full h-full object-cover" alt="" />}</div>
                                                <div><p className="font-bold text-sm text-gray-900 line-clamp-1">{data.title}</p><p className="text-xs text-gray-500">{data.count} vendas • {data.passengers} passageiros</p></div>
                                            </div>
                                            <p className="font-bold text-sm text-gray-700">R$ {data.total.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (<div className="text-center py-8 text-gray-400 text-sm">Sem dados de vendas.</div>)}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MessageSquare className="mr-2 text-amber-500" size={20}/> Avaliações Recebidas</h3>
                            {myReviews.length > 0 ? (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
                                    {myReviews.map(r => (
                                        <div key={r.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-gray-900">{r.clientName}</span>
                                                <div className="flex text-amber-400">{[...Array(5)].map((_, i) => <Star key={i} size={10} className={i < r.rating ? 'fill-current' : 'text-gray-200'}/>)}</div>
                                            </div>
                                            <p className="text-xs text-gray-600 italic">"{r.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-xs text-gray-400 text-center py-4">Nenhuma avaliação recebida.</p>}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Layout className="mr-2 text-primary-600" size={20}/> Ações Rápidas</h3>
                            <div className="space-y-3">
                                <button onClick={() => handleOpenCreate()} className="w-full p-3 border border-gray-200 rounded-xl hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-all flex items-center gap-3 group"><div className="bg-primary-100 text-primary-600 p-2 rounded-lg group-hover:scale-110 transition-transform"><Plus size={18}/></div><div className="text-left"><span className="font-bold block text-sm">Criar Novo Pacote</span></div></button>
                                <button onClick={() => { handleTabChange('SETTINGS'); setSettingsSection('PROFILE'); }} className="w-full p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-3 group"><div className="bg-gray-100 text-gray-600 p-2 rounded-lg group-hover:scale-110 transition-transform"><Settings size={18}/></div><div className="text-left"><span className="font-bold block text-sm">Editar Perfil</span></div></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'TRIPS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[600px]">
               <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-3"><h2 className="text-xl font-bold text-gray-900">Gerenciar Pacotes</h2><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{myTrips.length} Total</span></div>
                 <div className="flex gap-3 w-full md:w-auto"><div className="relative flex-1 md:w-64"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={tripSearch} onChange={e => setTripSearch(e.target.value)} type="text" placeholder="Buscar por nome..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"/></div><button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20 whitespace-nowrap"><Plus size={18} className="mr-2"/> Novo Pacote</button></div>
               </div>
               <div className="flex-1 overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-100"><thead className="bg-gray-50/50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th></tr></thead><tbody className="divide-y divide-gray-100 bg-white">{filteredTrips.map(trip => (<tr key={trip.id} className="hover:bg-gray-50/80 transition-colors group"><td className="px-6 py-4"><div className="flex items-center gap-4"><div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200"><img src={trip.images?.[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} /></div><div><p className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px]">{trip.title}</p><p className="text-xs text-gray-500 flex items-center mt-0.5"><MapPin size={10} className="mr-1"/> {trip.destination}</p></div></div></td><td className="px-6 py-4"><span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${trip.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{trip.is_active ? 'PUBLICADO' : 'RASCUNHO'}</span></td><td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td><td className="px-6 py-4"><div className="flex items-center gap-4 text-xs font-medium text-gray-500"><div className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1.5 text-blue-400"/> {trip.views || 0}</div><div className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1.5 text-green-500"/> {trip.sales || 0}</div></div></td><td className="px-6 py-4 text-right"><ActionsMenu trip={trip} onEdit={() => handleOpenEdit(trip)} onDuplicate={() => handleDuplicateTrip(trip)} onDelete={() => handleDeleteTrip(trip.id)} onToggleStatus={() => toggleTripStatus(trip.id)} fullAgencyLink={fullAgencyLink}/></td></tr>))}</tbody></table>
                 {filteredTrips.length === 0 && (<div className="text-center py-16"><div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="text-gray-300" size={24}/></div><p className="text-gray-500 font-medium">Nenhum pacote encontrado.</p>{tripSearch && <button onClick={() => setTripSearch('')} className="text-primary-600 text-sm font-bold hover:underline mt-2">Limpar busca</button>}</div>)}
               </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {PLANS.map(plan => (<div key={plan.id} className={`bg-white p-8 rounded-2xl border transition-all shadow-sm hover:shadow-xl relative overflow-hidden ${myAgency.subscriptionPlan === plan.id && isActive ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 hover:border-primary-300'}`}>{myAgency.subscriptionPlan === plan.id && isActive && (<div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">PLANO ATUAL</div>)}<h3 className="text-xl font-bold text-gray-900">{plan.name}</h3><p className="text-3xl font-extrabold text-primary-600 mt-2">R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span></p><ul className="mt-8 space-y-4 text-gray-600 text-sm mb-8">{plan.features.map((f, i) => (<li key={i} className="flex gap-3 items-start"><CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0"/> <span className="leading-snug">{f}</span></li>))}</ul><button onClick={() => { handleSelectPlan(plan) }} className={`w-full py-3 rounded-xl font-bold transition-colors ${myAgency.subscriptionPlan === plan.id && isActive ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20'}`} disabled={myAgency.subscriptionPlan === plan.id && isActive}>{myAgency.subscriptionPlan === plan.id && isActive ? 'Plano Ativo' : 'Selecionar Plano'}</button></div>))}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
                <div className="w-full md:w-64 bg-gray-50 p-6 border-r border-gray-100 rounded-l-2xl"><h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Menu de Ajustes</h3>
                    <nav className="space-y-2">
                        <button onClick={() => setSettingsSection('PROFILE')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${settingsSection === 'PROFILE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}><Users size={16}/> Perfil & Contato</button>
                        <button onClick={() => setSettingsSection('PAGE')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${settingsSection === 'PAGE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}><Layout size={16}/> Página Pública (Hero)</button>
                        <button onClick={() => setSettingsSection('THEME')} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${settingsSection === 'THEME' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-200/50'}`}><Palette size={16}/> Identidade Visual</button>
                    </nav>
                </div>
                <div className="flex-1 p-8">
                    <form onSubmit={handleAgencyUpdate} className="space-y-8 max-w-2xl">
                    {settingsSection === 'PROFILE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><div className="pb-4 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">Identidade & Contato</h2><p className="text-sm text-gray-500 mt-1">Essas informações serão exibidas na sua página pública.</p></div><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Logomarca</label><LogoUpload currentLogo={agencyForm.logo} onUpload={(url) => setAgencyForm({...agencyForm, logo: url})} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-xs font-bold mb-1.5 text-gray-700">Nome da Agência</label><input value={agencyForm.name || ''} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" /></div><div><label className="block text-xs font-bold mb-1.5 text-gray-700">WhatsApp (Apenas números)</label><div className="relative"><Smartphone className="absolute left-3 top-3 text-gray-400" size={18} /><input value={agencyForm.whatsapp || ''} onChange={e => setAgencyForm({...agencyForm, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full border border-gray-300 rounded-lg p-3 pl-10 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="5511999999999"/></div></div></div><div><label className="block text-xs font-bold mb-1.5 text-gray-700">Descrição</label><textarea rows={3} value={agencyForm.description || ''} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" placeholder="Sobre a agência..." /></div><div><label className="block text-xs font-bold mb-1.5 text-gray-700">Slug (Endereço Personalizado)</label><div className="relative"><input value={agencyForm.slug || ''} onChange={e => handleSlugChange(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-gray-50 font-mono text-sm text-primary-700 font-medium pl-48 focus:bg-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all" /><span className="absolute left-3 top-3 text-gray-500 text-sm select-none">{`${window.location.host}/#/`}</span></div>{cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-2 font-medium"><ExternalLink size={10} /> {fullAgencyLink}</a>)}</div></section>)}
                    {settingsSection === 'PAGE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><div className="pb-4 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">Banner Principal (Hero)</h2><p className="text-sm text-gray-500 mt-1">Escolha como o topo do seu site será exibido para os visitantes.</p></div><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Modo de Exibição</label><div className="flex gap-4"><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'TRIPS' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'TRIPS' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300 bg-white'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Layout size={16}/> Carrossel de Viagens</div><p className="text-xs text-gray-500">Exibe suas viagens ativas e destacadas rotativamente.</p></button><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'STATIC' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'STATIC' ? 'border-primary-600 bg-primary-50 ring-1 ring-600' : 'border-gray-200 hover:border-gray-300 bg-white'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><ImageIcon size={16}/> Banner Estático</div><p className="text-xs text-gray-500">Exibe uma imagem fixa com título e subtítulo.</p></button></div></div>{agencyForm.heroMode === 'STATIC' && (<div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4 animate-[fadeIn_0.3s]"><div><label className="block text-xs font-bold mb-1 text-gray-700">Imagem do Banner</label><div className="flex items-center gap-4"><div className="w-32 h-16 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-300 shadow-sm">{agencyForm.heroBannerUrl ? (<img src={agencyForm.heroBannerUrl} className="w-full h-full object-cover" alt="Banner" />) : (<div className="flex items-center justify-center h-full text-gray-400 text-xs">Sem imagem</div>)}{uploadingBanner && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader className="animate-spin"/></div>}</div><label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner}/>Enviar Imagem</label></div></div><div><label className="block text-xs font-bold mb-1 text-gray-700">Título do Hero</label><input value={agencyForm.heroTitle || ''} onChange={e => setAgencyForm({...agencyForm, heroTitle: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" placeholder="Ex: Explore o Mundo Conosco"/></div><div><label className="block text-xs font-bold mb-1 text-gray-700">Subtítulo do Hero</label><input value={agencyForm.heroSubtitle || ''} onChange={e => setAgencyForm({...agencyForm, heroSubtitle: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white" placeholder="Ex: As melhores experiências para você."/></div></div>)}</section>)}
                    
                    {settingsSection === 'THEME' && (
                        <section className="space-y-6 animate-[fadeIn_0.2s]">
                            <div className="pb-4 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">Personalização Visual</h2><p className="text-sm text-gray-500 mt-1">Escolha as cores que representam sua marca no seu mini site.</p></div>
                            {loadingTheme ? <Loader className="animate-spin"/> : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cor Primária</label>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-14 h-12 rounded-xl shadow-sm ring-1 ring-black/10 overflow-hidden cursor-pointer hover:ring-primary-500 transition-all">
                                                    <input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer"/>
                                                </div>
                                                <input value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-full border border-gray-300 rounded-xl py-3 px-3 font-mono text-sm uppercase focus:ring-2 focus:ring-primary-500 outline-none"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cor Secundária</label>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-14 h-12 rounded-xl shadow-sm ring-1 ring-black/10 overflow-hidden cursor-pointer hover:ring-primary-500 transition-all">
                                                    <input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] cursor-pointer"/>
                                                </div>
                                                <input value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-full border border-gray-300 rounded-xl py-3 px-3 font-mono text-sm uppercase focus:ring-2 focus:ring-primary-500 outline-none"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Preview</p>
                                        <div className="flex gap-4 items-center">
                                            <button type="button" className="px-6 py-2 rounded-lg text-white font-bold shadow-lg" style={{backgroundColor: themeForm.primary}}>Botão Principal</button>
                                            <span className="font-bold" style={{color: themeForm.secondary}}>Texto Destaque</span>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleSaveTheme} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"><Save size={18}/> Salvar Tema</button>
                                </div>
                            )}
                        </section>
                    )}

                    {settingsSection !== 'THEME' && (
                        <div className="pt-6 border-t border-gray-100"><button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"><Save size={18}/> Salvar Alterações</button></div>
                    )}
                    </form>
                </div>
             </div>
          )}
          </div>
        </>
      ) : (
         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-[scaleIn_0.2s]">
             <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm"><button onClick={handleBackToList} className="flex items-center font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={18} className="mr-2"/> Voltar</button><div className="flex gap-3"><button type="button" onClick={() => setShowPreview(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-50 transition-colors"><Eye size={18} className="mr-2"/> Prévia</button><button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 disabled:opacity-50 shadow-sm">{isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18} className="mr-2"/>} Salvar</button></div></div>
             <form onSubmit={handleTripSubmit} className="p-8 space-y-10 max-w-4xl mx-auto bg-gray-50/50 pb-32">
                 <section><div className="flex justify-between items-center border-b pb-2 mb-6"><h3 className="text-lg font-bold">Informações Básicas</h3><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!tripForm.featuredInHero} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"/><span className="text-sm font-bold text-amber-600 flex items-center"><Star size={14} className="mr-1 fill-amber-500"/> Destacar na página da agência</span></label></div><div className="space-y-4"><div><label className="font-bold text-sm mb-1 block">Título do Pacote</label><input value={tripForm.title || ''} onChange={handleTitleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" placeholder="Ex: Fim de semana em Paraty"/></div><div><label className="font-bold text-sm mb-1 block">Slug (URL Amigável)</label><input value={tripForm.slug || ''} onFocus={() => setSlugTouched(true)} onChange={e => setTripForm({...tripForm, slug: slugify(e.target.value)}) } className="w-full border p-3 rounded-lg bg-gray-100 font-mono text-primary-700 outline-none focus:border-primary-500 transition-colors" /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="font-bold text-sm mb-1 block">Preço (R$)</label><input type="number" value={tripForm.price || ''} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div><div><label className="font-bold text-sm mb-1 block">Duração (Dias)</label><input type="number" value={tripForm.durationDays || ''} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div><div><label className="font-bold text-sm mb-1 block">Categoria</label><select value={tripForm.category} onChange={(e) => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm"><option value="PRAIA">Praia</option><option value="AVENTURA">Aventura</option><option value="FAMILIA">Família</option><option value="ROMANTICO">Romântico</option><option value="URBANO">Urbano</option><option value="NATUREZA">Natureza</option><option value="CULTURA">Cultura</option><option value="GASTRONOMICO">Gastronômico</option></select></div></div><div><label className="font-bold text-sm mb-1 block">Destino (Cidade/Estado)</label><input value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div></div></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Datas da Viagem</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="font-bold text-sm mb-1 block flex items-center gap-2"><Calendar size={14}/> Data de Início</label><input type="date" value={tripForm.startDate || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div><div><label className="font-bold text-sm mb-1 block flex items-center gap-2"><Calendar size={14}/> Data de Fim</label><input type="date" value={tripForm.endDate || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div></div></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Tags & Público</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="font-bold text-sm mb-2 block flex items-center gap-2"><Tag size={14}/> Tags</label><PillInput value={tripForm.tags || []} onChange={v => setTripForm({...tripForm, tags: v})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_TAGS} customSuggestions={customSettings.tags} onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('tags', s)}/></div><div><label className="font-bold text-sm mb-2 block flex items-center gap-2"><Users size={14}/> Tipo de Viajante</label><PillInput value={tripForm.travelerTypes as string[] || []} onChange={v => setTripForm({...tripForm, travelerTypes: v as TravelerType[]})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_TRAVELERS} /></div></div></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Formas de Pagamento</h3><div><label className="font-bold text-sm mb-2 block flex items-center gap-2"><CreditCard size={14}/> Métodos Aceitos</label><PillInput value={tripForm.paymentMethods || []} onChange={v => setTripForm({...tripForm, paymentMethods: v})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_PAYMENTS} customSuggestions={customSettings.paymentMethods} onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('paymentMethods', s)}/></div></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Inclusos e Não Inclusos</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="font-bold text-sm mb-2 block flex items-center gap-2 text-green-600"><Check size={14}/> Itens Inclusos</label><PillInput value={tripForm.included || []} onChange={v => setTripForm({...tripForm, included: v})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_INCLUDED} customSuggestions={customSettings.included} onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('included', s)}/></div><div><label className="font-bold text-sm mb-2 block flex items-center gap-2 text-red-500"><X size={14}/> Itens NÃO Inclusos</label><PillInput value={tripForm.notIncluded || []} onChange={v => setTripForm({...tripForm, notIncluded: v})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_NOT_INCLUDED} customSuggestions={customSettings.notIncluded} onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('notIncluded', s)}/></div></div></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Descrição Detalhada</h3><p className="text-sm text-gray-500 mb-4">Use o editor abaixo para contar a história da sua viagem. Adicione títulos, listas e imagens para tornar o texto atrativo.</p><RichTextEditor value={tripForm.description || ''} onChange={v => setTripForm({...tripForm, description: v})} /></section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Galeria de Imagens</h3><ImageManager images={tripForm.images || []} onChange={imgs => setTripForm({...tripForm, images: imgs})} /></section>
             </form>
             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]"><div className="max-w-4xl mx-auto flex justify-between items-center"><p className="text-xs text-gray-500 hidden sm:block">Certifique-se de salvar todas as alterações.</p><div className="flex gap-3 w-full sm:w-auto"><button type="button" onClick={() => setShowPreview(true)} className="flex-1 sm:flex-initial bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-bold flex justify-center items-center hover:bg-gray-50 transition-colors"><Eye size={18} className="mr-2"/> Prévia</button><button onClick={handleTripSubmit} disabled={isSubmitting} className="flex-1 sm:flex-initial bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex justify-center items-center hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/30 transition-all">{isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18} className="mr-2"/>} Salvar Viagem</button></div></div></div>
         </div>
      )}

      {showPayment && selectedPlan && (
        <SubscriptionConfirmationModal 
            plan={selectedPlan}
            onClose={() => setShowPayment(false)}
            onConfirm={handleConfirmPayment}
            isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default AgencyDashboard;
