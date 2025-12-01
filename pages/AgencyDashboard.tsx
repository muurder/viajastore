

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType, ThemeColors, Plan } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw, LogOut } from 'lucide-react';
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
  const { user, updateUser, uploadImage, reloadUser, logout } = useAuth();
  const { getAgencyTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, agencies, getAgencyStats, trips, bookings, clients, getReviewsByAgencyId, getAgencyTheme, saveAgencyTheme, refreshData } = useData();
  const { setAgencyTheme } = useTheme(); // For previewing
  const { showToast } = useToast();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') || 'OVERVIEW';
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  const isAgencyActive = (user as Agency)?.subscriptionStatus === 'ACTIVE';

  const [editFormData, setEditFormData] = useState<Partial<Agency>>({}); // For Settings tab
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
  
  const fullAgencyLink = currentAgency?.slug ? `/#/${currentAgency.slug}` : '';

  useEffect(() => {
    if (user?.role !== UserRole.AGENCY && !user) {
        navigate('/unauthorized'); // Redirect if not agency or logged out
    }
  }, [user, navigate]);

  useEffect(() => {
    if (currentAgency) {
      setEditFormData({
        name: currentAgency.name,
        description: currentAgency.description,
        cnpj: currentAgency.cnpj,
        slug: currentAgency.slug,
        phone: currentAgency.phone,
        whatsapp: currentAgency.whatsapp,
        website: currentAgency.website,
        address: currentAgency.address,
        bankInfo: currentAgency.bankInfo,
        heroMode: currentAgency.heroMode,
        heroBannerUrl: currentAgency.heroBannerUrl,
        heroTitle: currentAgency.heroTitle,
        heroSubtitle: currentAgency.heroSubtitle,
        customSettings: currentAgency.customSettings
      });
      setTripForm(prev => ({...prev, agencyId: currentAgency.agencyId}));
      
      // Load custom settings for tags, includes, etc. into current form context if applicable.
      if (currentAgency.customSettings?.tags) SUGGESTED_TAGS.push(...currentAgency.customSettings.tags.filter(t => !SUGGESTED_TAGS.includes(t)));
      if (currentAgency.customSettings?.included) SUGGESTED_INCLUDED.push(...currentAgency.customSettings.included.filter(t => !SUGGESTED_INCLUDED.includes(t)));
      if (currentAgency.customSettings?.notIncluded) SUGGESTED_NOT_INCLUDED.push(...currentAgency.customSettings.notIncluded.filter(t => !SUGGESTED_NOT_INCLUDED.includes(t)));
      if (currentAgency.customSettings?.paymentMethods) SUGGESTED_PAYMENTS.push(...currentAgency.customSettings.paymentMethods.filter(t => !SUGGESTED_PAYMENTS.includes(t)));
    }
  }, [currentAgency]);

  const handleTabChange = (tab: 'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS') => {
    setSearchParams({ tab });
    if (tab !== 'TRIPS') {
        // Reset trip form when switching tabs
        setTripForm({...defaultTripForm, agencyId: currentAgency?.agencyId || ''});
        setIsNewTrip(true);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency || !user) return;
    setIsSavingSettings(true);
    try {
      // FIX: The user.id should be the 'user_id' in the `agencies` table to match for update.
      await updateUser(editFormData);
      showToast('Configurações salvas com sucesso!', 'success');
      reloadUser(); // Fetch latest user data
    } catch (error: any) {
      showToast('Erro ao salvar configurações: ' + error.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleImageUpload = async (file: File, field: 'logo' | 'heroBannerUrl') => {
    if (!user) return;
    if (field === 'logo') setIsUploadingLogo(true); else setIsUploadingBanner(true);
    try {
      const bucket = field === 'logo' ? 'agency-logos' : 'agency-banners'; // Assuming 'agency-banners' bucket
      const url = await uploadImage(file, bucket);
      if (url) {
        setEditFormData(prev => ({ ...prev, [field]: url }));
        // Directly update user object to reflect change immediately in UI (if user is currentAgency)
        await updateUser({ [field]: url } as Partial<Agency>);
        showToast('Imagem enviada com sucesso!', 'success');
      } else {
        showToast('Erro ao enviar imagem.', 'error');
      }
    } catch (error: any) {
      showToast('Erro no upload: ' + error.message, 'error');
    } finally {
      if (field === 'logo') setIsUploadingLogo(false); else setIsUploadingBanner(false);
    }
  };

  const handleTripFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setTripForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleItineraryChange = (index: number, field: string, value: string) => {
      const updatedItinerary = [...(tripForm.itinerary || [])];
      if (!updatedItinerary[index]) {
          updatedItinerary[index] = { day: index + 1, title: '', description: '' };
      }
      (updatedItinerary[index] as any)[field] = value;
      setTripForm(prev => ({ ...prev, itinerary: updatedItinerary }));
  };

  const handleAddItineraryDay = () => {
      setTripForm(prev => ({
          ...prev,
          itinerary: [...(prev.itinerary || []), { day: (prev.itinerary?.length || 0) + 1, title: '', description: '' }]
      }));
  };

  const handleRemoveItineraryDay = (index: number) => {
      setTripForm(prev => ({
          ...prev,
          itinerary: prev.itinerary?.filter((_, i) => i !== index).map((item, i) => ({ ...item, day: i + 1 })) || []
      }));
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency || isSubmittingTrip) return;
    setIsSubmittingTrip(true);
    try {
      const finalTripData = {
          ...tripForm,
          agencyId: currentAgency.agencyId, // Ensure agencyId is set from currentAgency
          slug: tripForm.slug || slugify(tripForm.title || ''),
          price: Number(tripForm.price),
          durationDays: Number(tripForm.durationDays),
          is_active: tripForm.is_active || false,
          featured: tripForm.featured || false,
          featuredInHero: tripForm.featuredInHero || false,
          popularNearSP: tripForm.popularNearSP || false,
          views: tripForm.views || 0,
          sales: tripForm.sales || 0,
          // Ensure all array fields are not undefined
          tags: tripForm.tags || [],
          travelerTypes: tripForm.travelerTypes || [],
          itinerary: tripForm.itinerary || [],
          paymentMethods: tripForm.paymentMethods || [],
          included: tripForm.included || [],
          notIncluded: tripForm.notIncluded || [],
          description: tripForm.description || '', // Ensure description is not undefined
          images: tripForm.images || []
      } as Trip;

      if (isNewTrip) {
        await createTrip(finalTripData);
        showToast('Viagem criada com sucesso!', 'success');
      } else {
        await updateTrip(finalTripData);
        showToast('Viagem atualizada com sucesso!', 'success');
      }
      setTripForm({...defaultTripForm, agencyId: currentAgency.agencyId});
      setIsNewTrip(true);
      setSearchParams({ tab: 'TRIPS' }); // Go back to trip list view
    } catch (error: any) {
      showToast('Erro ao salvar viagem: ' + error.message, 'error');
    } finally {
      setIsSubmittingTrip(false);
    }
  };

  const handleEditTrip = (trip: Trip) => {
    setTripForm(trip);
    setIsNewTrip(false);
    setSearchParams({ tab: 'TRIPS', view: 'form' });
  };

  const handleDuplicateTrip = async (tripToDuplicate: Trip) => {
    if (!currentAgency) return;
    if (window.confirm(`Deseja duplicar a viagem "${tripToDuplicate.title}"?`)) {
      setIsSubmittingTrip(true);
      try {
        const duplicatedTrip: Partial<Trip> = {
          ...tripToDuplicate,
          id: undefined, // Let DB generate new ID
          title: `Cópia de ${tripToDuplicate.title}`,
          slug: slugify(`Copia de ${tripToDuplicate.title}-${Date.now().toString().slice(-4)}`),
          is_active: false, // Duplicates are inactive by default
          featured: false,
          featuredInHero: false,
          views: 0,
          sales: 0,
          agencyId: currentAgency.agencyId // Ensure correct agency ID
        };
        await createTrip(duplicatedTrip as Trip);
        showToast('Viagem duplicada com sucesso!', 'success');
      } catch (error: any) {
        showToast('Erro ao duplicar viagem: ' + error.message, 'error');
      } finally {
        setIsSubmittingTrip(false);
      }
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanForConfirmation(plan);
    setShowSubscriptionConfirmModal(true);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlanForConfirmation || !currentAgency) return;
    setActivatingPlanId(selectedPlanForConfirmation.id);
    try {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year subscription
        await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', selectedPlanForConfirmation.id as 'BASIC' | 'PREMIUM', expiresAt.toISOString());
        showToast('Plano ativado com sucesso! Bem-vindo(a)!', 'success');
        setShowSubscriptionConfirmModal(false);
        setActivatingPlanId(null);
        await reloadUser(); // Reload user to update subscription status in AuthContext
    } catch (error) {
        // Toast is already handled by updateAgencySubscription
        setActivatingPlanId(null);
    }
  };

  // Function to save custom suggestions
  const saveCustomSuggestions = async (key: 'tags' | 'included' | 'notIncluded' | 'paymentMethods', newItems: string[]) => {
    if (!currentAgency) return;
    const updatedCustomSettings = {
        ...currentAgency.customSettings,
        [key]: newItems
    };
    try {
        // Update user state first for responsiveness
        await updateUser({ customSettings: updatedCustomSettings });
        // Then send to DB
        await supabase.from('agencies').update({ custom_settings: updatedCustomSettings }).eq('id', currentAgency.agencyId);
        showToast('Sugestões salvas!', 'success');
        reloadUser(); // Ensure custom settings are refreshed
    } catch (error: any) {
        showToast('Erro ao salvar sugestões: ' + error.message, 'error');
        console.error(error);
    }
  };

  const handleDeleteCustomSuggestion = async (key: 'tags' | 'included' | 'notIncluded' | 'paymentMethods', itemToRemove: string) => {
    if (!currentAgency) return;
    const currentList = currentAgency.customSettings?.[key] || [];
    const updatedList = currentList.filter(item => item !== itemToRemove);
    await saveCustomSuggestions(key, updatedList);
  };

  // Helper to dynamically get current custom suggestions list
  const getCustomSuggestions = (key: 'tags' | 'included' | 'notIncluded' | 'paymentMethods') => {
    return currentAgency?.customSettings?.[key] || [];
  };

  // Filtered trips for the list view
  const filteredMyTrips = myTrips.filter(t => 
    t.title.toLowerCase().includes(searchTripTerm.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchTripTerm.toLowerCase())
  );

  // If agency is not active, redirect to subscription tab
  if (currentAgency && !isAgencyActive && activeTab !== 'SUBSCRIPTION' && activeTab !== 'SETTINGS') {
      handleTabChange('SUBSCRIPTION');
      showToast('Sua agência precisa de um plano ativo para usar o painel.', 'info');
  }
  
  if (!user || user.role !== UserRole.AGENCY) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <Loader size={32} className="animate-spin text-primary-600"/>
              <p className="text-gray-600 ml-3">Carregando painel...</p>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Olá, {currentAgency?.name || user.name}!</h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            {isAgencyActive ? 'Gerencie suas viagens, vendas e configurações.' : 'Selecione um plano para começar a usar o painel.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
            <a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors">
                <Globe size={18} className="mr-2"/> Ver Perfil Público
            </a>
            <button onClick={logout} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors">
                <LogOut size={18} className="mr-2"/> Sair
            </button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} hasNotification={currentAgency?.subscriptionStatus === 'PENDING'} />
        <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="SUBSCRIPTION" label="Assinatura" icon={CreditCard} activeTab={activeTab} onClick={handleTabChange} hasNotification={!isAgencyActive} />
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} hasNotification={myReviews.length > 0 && myReviews.some(r => !r.response)} />
        <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          {isAgencyActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-primary-50 text-primary-600 group-hover:scale-105 transition-transform"><DollarSign size={24}/></div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Receita Estimada</p>
                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {agencyStats.totalRevenue.toLocaleString('pt-BR')}</h3>
                    <p className="text-xs text-gray-400 mt-2">Total de vendas confirmadas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform"><ShoppingBag size={24}/></div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total de Vendas</p>
                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.totalSales}</h3>
                    <p className="text-xs text-gray-400 mt-2">Reservas confirmadas</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform"><Eye size={24}/></div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Visualizações</p>
                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.totalViews.toLocaleString('pt-BR')}</h3>
                    <p className="text-xs text-gray-400 mt-2">Total de views nos pacotes</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-100 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-green-50 text-green-600 group-hover:scale-105 transition-transform"><BarChart2 size={24}/></div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Taxa de Conversão</p>
                    <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{agencyStats.conversionRate.toFixed(2)}%</h3>
                    <p className="text-xs text-gray-400 mt-2">Vendas / Visualizações</p>
                </div>
            </div>
          ) : (
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center animate-[fadeIn_0.3s]">
                <Info size={32} className="text-blue-600 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-blue-800">Sua agência está inativa!</h3>
                <p className="text-blue-700 mt-2 mb-4">Para acessar as métricas, ative sua assinatura.</p>
                <button onClick={() => handleTabChange('SUBSCRIPTION')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    Gerenciar Assinatura
                </button>
             </div>
          )}
        </div>
      )}

      {activeTab === 'TRIPS' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          {isAgencyActive ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2>
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input type="text" placeholder="Buscar pacote..." value={searchTripTerm} onChange={e => setSearchTripTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"/>
                    </div>
                    <button onClick={() => { setTripForm({...defaultTripForm, agencyId: currentAgency?.agencyId || ''}); setIsNewTrip(true); setSearchParams({ tab: 'TRIPS', view: 'form' }); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors">
                      <Plus size={18} className="mr-2"/> Adicionar Novo
                    </button>
                    <button onClick={() => setSearchParams({ tab: 'TRIPS', view: viewMode === 'list' ? 'grid' : 'list' })} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
                       {viewMode === 'grid' ? <List size={18}/> : <Layout size={18}/>}
                    </button>
                </div>
              </div>

              {searchParams.get('view') === 'form' ? (
                // Trip Form
                <form onSubmit={handleTripSubmit} className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{isNewTrip ? 'Novo Pacote de Viagem' : `Editar Pacote: ${tripForm.title}`}</h3>
                    <button type="button" onClick={() => setSearchParams({ tab: 'TRIPS' })} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6">
                        <ArrowLeft size={16}/> Voltar para lista
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote</label><input type="text" name="title" value={tripForm.title || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Destino</label><input type="text" name="destination" value={tripForm.destination || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa (R$)</label><input type="number" name="price" value={tripForm.price || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required min="0"/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label><input type="number" name="durationDays" value={tripForm.durationDays || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required min="1"/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label><input type="date" name="startDate" value={tripForm.startDate?.split('T')[0] || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-2">Data de Término</label><input type="date" name="endDate" value={tripForm.endDate?.split('T')[0] || ''} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required/></div>
                        <div className="md:col-span-2">
                           <label className="block text-sm font-bold text-gray-700 mb-2">Slug (URL Amigável)</label>
                           <input 
                             type="text" 
                             name="slug" 
                             value={tripForm.slug || slugify(tripForm.title || '')} 
                             onChange={e => setTripForm(prev => ({ ...prev, slug: slugify(e.target.value) }))} 
                             className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 bg-gray-50 font-mono text-primary-700" 
                             readOnly={!isNewTrip} // Make slug read-only after creation to prevent accidental changes
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                           <select name="category" value={tripForm.category || 'PRAIA'} onChange={handleTripFormChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                             {['PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO', 'NATUREZA', 'CULTURA', 'GASTRONOMICO', 'VIDA_NOTURNA', 'VIAGEM_BARATA', 'ARTE'].map(cat => <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>)}
                           </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tipos de Viajantes</label>
                            <PillInput 
                                value={tripForm.travelerTypes || []} 
                                onChange={(val) => setTripForm(prev => ({...prev, travelerTypes: val}))} 
                                placeholder="Adicionar tipo de viajante..." 
                                suggestions={SUGGESTED_TRAVELERS}
                            />
                        </div>
                    </div>
                    
                    <div className="h-px bg-gray-100 my-8"></div>

                    <div>
                        <ImageManager 
                          images={tripForm.images || []} 
                          onChange={(imgs) => setTripForm(prev => ({...prev, images: imgs}))} 
                        />
                    </div>
                    
                    <div className="h-px bg-gray-100 my-8"></div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Completa da Experiência</label>
                        <RichTextEditor 
                          value={tripForm.description || ''} 
                          onChange={(val) => setTripForm(prev => ({...prev, description: val}))} 
                        />
                    </div>

                    <div className="h-px bg-gray-100 my-8"></div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-4">Roteiro Detalhado</label>
                        <div className="space-y-4">
                            {tripForm.itinerary?.map((item, index) => (
                                <div key={index} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="text-lg font-bold text-gray-700 shrink-0">Dia {item.day}</span>
                                    <div className="flex-1 space-y-2">
                                        <input type="text" value={item.title} onChange={e => handleItineraryChange(index, 'title', e.target.value)} placeholder="Título do dia (ex: Chegada em Foz)" className="w-full border p-2 rounded-lg outline-none focus:border-primary-500"/>
                                        <textarea rows={2} value={item.description} onChange={e => handleItineraryChange(index, 'description', e.target.value)} placeholder="Descrição detalhada das atividades do dia" className="w-full border p-2 rounded-lg outline-none focus:border-primary-500"/>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItineraryDay(index)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 self-start"><Trash2 size={18}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddItineraryDay} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                                <Plus size={18}/> Adicionar Dia ao Roteiro
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-8"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tags do Pacote</label>
                            <PillInput 
                                value={tripForm.tags || []} 
                                onChange={(val) => {
                                    setTripForm(prev => ({...prev, tags: val}));
                                    saveCustomSuggestions('tags', val);
                                }} 
                                placeholder="Adicionar tag..." 
                                suggestions={SUGGESTED_TAGS}
                                customSuggestions={getCustomSuggestions('tags')}
                                onDeleteCustomSuggestion={(item) => handleDeleteCustomSuggestion('tags', item)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Formas de Pagamento</label>
                            <PillInput 
                                value={tripForm.paymentMethods || []} 
                                onChange={(val) => {
                                    setTripForm(prev => ({...prev, paymentMethods: val}));
                                    saveCustomSuggestions('paymentMethods', val);
                                }} 
                                placeholder="Adicionar forma de pagamento..." 
                                suggestions={SUGGESTED_PAYMENTS}
                                customSuggestions={getCustomSuggestions('paymentMethods')}
                                onDeleteCustomSuggestion={(item) => handleDeleteCustomSuggestion('paymentMethods', item)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">O que está incluído</label>
                            <PillInput 
                                value={tripForm.included || []} 
                                onChange={(val) => {
                                    setTripForm(prev => ({...prev, included: val}));
                                    saveCustomSuggestions('included', val);
                                }} 
                                placeholder="Adicionar item incluído..." 
                                suggestions={SUGGESTED_INCLUDED}
                                customSuggestions={getCustomSuggestions('included')}
                                onDeleteCustomSuggestion={(item) => handleDeleteCustomSuggestion('included', item)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">O que NÃO está incluído</label>
                            <PillInput 
                                value={tripForm.notIncluded || []} 
                                onChange={(val) => {
                                    setTripForm(prev => ({...prev, notIncluded: val}));
                                    saveCustomSuggestions('notIncluded', val);
                                }} 
                                placeholder="Adicionar item não incluído..." 
                                suggestions={SUGGESTED_NOT_INCLUDED}
                                customSuggestions={getCustomSuggestions('notIncluded')}
                                onDeleteCustomSuggestion={(item) => handleDeleteCustomSuggestion('notIncluded', item)}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-8"></div>

                    <div className="flex flex-col gap-4">
                        <label className="flex items-center text-gray-700">
                            <input type="checkbox" name="is_active" checked={tripForm.is_active || false} onChange={handleTripFormChange} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            <span className="font-bold">Ativar Pacote (Publicar na ViajaStore)</span>
                        </label>
                        <label className="flex items-center text-gray-700">
                            <input type="checkbox" name="featured" checked={tripForm.featured || false} onChange={handleTripFormChange} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            <span className="font-bold">Destaque Global (ViajaStore Home)</span>
                        </label>
                        <label className="flex items-center text-gray-700">
                            <input type="checkbox" name="featuredInHero" checked={tripForm.featuredInHero || false} onChange={handleTripFormChange} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            <span className="font-bold">Destaque no Hero (Microsite da Agência)</span>
                        </label>
                        <label className="flex items-center text-gray-700">
                            <input type="checkbox" name="popularNearSP" checked={tripForm.popularNearSP || false} onChange={handleTripFormChange} className="mr-2 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                            <span className="font-bold">Popular Perto de SP</span>
                        </label>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-gray-100">
                        <button type="submit" disabled={isSubmittingTrip} className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                            {isSubmittingTrip ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} {isNewTrip ? 'Criar Pacote' : 'Salvar Alterações'}
                        </button>
                        <button type="button" onClick={() => setShowTripPreview(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors">
                            <Eye size={18} className="mr-2"/> Prévia
                        </button>
                    </div>
                </form>
              ) : (
                // Trip List
                myTrips.length > 0 ? (
                  <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}`}>
                      {filteredMyTrips.map(trip => (
                          <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-5 relative">
                              <img src={trip.images?.[0] || 'https://placehold.co/100x80/e2e8f0/94a3b8?text=Sem+Imagem'} alt={trip.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
                              <div className="flex-1">
                                  <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{trip.title}</h3>
                                  <p className="text-sm text-gray-500 line-clamp-1">{trip.destination} - {trip.durationDays} dias</p>
                                  <div className="flex items-center gap-2 mt-2">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${trip.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{trip.is_active ? 'Ativo' : 'Inativo'}</span>
                                      {trip.featured && <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700">Destaque</span>}
                                  </div>
                              </div>
                              <ActionsMenu 
                                trip={trip} 
                                onEdit={() => handleEditTrip(trip)} 
                                onDuplicate={() => handleDuplicateTrip(trip)} 
                                onDelete={() => deleteTrip(trip.id)}
                                onToggleStatus={() => toggleTripStatus(trip.id)}
                                fullAgencyLink={fullAgencyLink}
                              />
                          </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Plane size={32} className="text-gray-300 mx-auto mb-4"/>
                    <p className="text-gray-900 font-bold text-lg mb-2">Nenhum pacote cadastrado</p>
                    <p className="text-gray-500 mb-6">Comece sua jornada criando seu primeiro pacote de viagem incrível!</p>
                    <button onClick={() => { setTripForm({...defaultTripForm, agencyId: currentAgency?.agencyId || ''}); setIsNewTrip(true); setSearchParams({ tab: 'TRIPS', view: 'form' }); }} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors">
                        <Plus size={18} className="mr-2"/> Criar Novo Pacote
                    </button>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center animate-[fadeIn_0.3s]">
                <Info size={32} className="text-blue-600 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-blue-800">Sua agência está inativa!</h3>
                <p className="text-blue-700 mt-2 mb-4">Para criar e gerenciar pacotes, ative sua assinatura.</p>
                <button onClick={() => handleTabChange('SUBSCRIPTION')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    Gerenciar Assinatura
                </button>
             </div>
          )}
        </div>
      )}

      {activeTab === 'SUBSCRIPTION' && currentAgency && (
          <div className="animate-[fadeIn_0.3s]">
              {currentAgency.subscriptionStatus !== 'ACTIVE' ? (
                  <SubscriptionActivationView 
                    agency={currentAgency} 
                    onSelectPlan={handleSelectPlan} 
                    activatingPlanId={activatingPlanId}
                  />
              ) : (
                  <div className="max-w-xl mx-auto text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                      <CheckCircle size={32} className="text-green-500 mx-auto mb-4"/>
                      <h2 className="text-2xl font-bold text-gray-900">Sua Assinatura está Ativa!</h2>
                      <p className="text-gray-600 mt-2 text-lg">Plano: <span className="font-bold text-primary-600">{currentAgency.subscriptionPlan}</span></p>
                      <p className="text-gray-500 mt-1 mb-6">Expira em: <span className="font-medium">{new Date(currentAgency.subscriptionExpiresAt).toLocaleDateString()}</span></p>
                      
                      <button onClick={() => showToast('Funcionalidade em desenvolvimento.', 'info')} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors">
                          Gerenciar Pagamento
                      </button>
                      <p className="text-sm text-gray-400 mt-4">Você será notificado antes da renovação.</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'REVIEWS' && currentAgency && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
          {isAgencyActive ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações de Clientes ({myReviews.length})</h2>
              {myReviews.length > 0 ? (
                <div className="space-y-6">
                  {myReviews.map(review => (
                    <div key={review.id} className="bg-gray-50 p-6 rounded-xl border border-gray-100 relative">
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                          <button onClick={() => showToast('Funcionalidade em desenvolvimento.', 'info')} className="text-gray-400 hover:text-primary-500 p-2 rounded-full hover:bg-primary-50 transition-colors" title="Responder avaliação"><MessageCircle size={16}/></button>
                          <button onClick={() => showToast('Funcionalidade em desenvolvimento.', 'info')} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title="Excluir avaliação"><Trash2 size={16}/></button>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <img src={review.clientAvatar || `https://ui-avatars.com/api/?name=${review.clientName || 'Cliente'}&background=random`} alt={review.clientName || 'Cliente'} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{review.clientName}</p>
                          <div className="flex text-amber-400 text-sm">
                            {[...Array(5)].map((_,i) => <Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 italic">"{review.comment}"</p>
                      {review.response && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-600 mb-2">Sua resposta:</p>
                          <p className="text-sm text-gray-700 italic">"{review.response}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Star size={32} className="text-gray-300 mx-auto mb-4"/>
                    <p className="text-gray-900 font-bold text-lg mb-2">Nenhuma avaliação ainda</p>
                    <p className="text-gray-500 mb-6">Peça aos seus clientes para deixarem uma avaliação após a viagem!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center animate-[fadeIn_0.3s]">
                <Info size={32} className="text-blue-600 mx-auto mb-4"/>
                <h3 className="text-xl font-bold text-blue-800">Sua agência está inativa!</h3>
                <p className="text-blue-700 mt-2 mb-4">Para visualizar e gerenciar avaliações, ative sua assinatura.</p>
                <button onClick={() => handleTabChange('SUBSCRIPTION')} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    Gerenciar Assinatura
                </button>
             </div>
          )}
        </div>
      )}

      {activeTab === 'SETTINGS' && currentAgency && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Agência</h2>
          <form onSubmit={handleSettingsSubmit} className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Informações Básicas</h3>
            
            <LogoUpload currentLogo={editFormData.logo} onUpload={(url) => { setEditFormData(prev => ({...prev, logo: url})); }} />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Agência</label>
              <input type="text" name="name" value={editFormData.name || ''} onChange={e => setEditFormData(prev => ({...prev, name: e.target.value}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Descrição</label>
              <textarea name="description" value={editFormData.description || ''} onChange={e => setEditFormData(prev => ({...prev, description: e.target.value}))} rows={4} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">CNPJ</label>
              <input type="text" name="cnpj" value={editFormData.cnpj || ''} onChange={e => setEditFormData(prev => ({...prev, cnpj: e.target.value}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Slug da Agência (URL Pública)</label>
              <input type="text" name="slug" value={editFormData.slug || ''} onChange={e => setEditFormData(prev => ({...prev, slug: slugify(e.target.value || '')}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 bg-gray-50 font-mono text-primary-700" required />
              <p className="text-xs text-gray-500 mt-1">Sua página será: viajastore.com/#/{editFormData.slug}</p>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 pt-8">Contatos</h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
              <input type="text" name="phone" value={editFormData.phone || ''} onChange={e => setEditFormData(prev => ({...prev, phone: e.target.value}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp</label>
              <input type="text" name="whatsapp" value={editFormData.whatsapp || ''} onChange={e => setEditFormData(prev => ({...prev, whatsapp: e.target.value}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Website</label>
              <input type="text" name="website" value={editFormData.website || ''} onChange={e => setEditFormData(prev => ({...prev, website: e.target.value}))} placeholder="https://seusite.com" className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 pt-8">Endereço</h3>
            {/* Address fields */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CEP</label>
                <input type="text" name="address.zipCode" value={editFormData.address?.zipCode || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, zipCode: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Rua</label>
                <input type="text" name="address.street" value={editFormData.address?.street || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, street: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Número</label>
                <input type="text" name="address.number" value={editFormData.address?.number || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, number: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Complemento</label>
                <input type="text" name="address.complement" value={editFormData.address?.complement || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, complement: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Bairro</label>
                <input type="text" name="address.district" value={editFormData.address?.district || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, district: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Cidade</label>
                <input type="text" name="address.city" value={editFormData.address?.city || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, city: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Estado</label>
                <input type="text" name="address.state" value={editFormData.address?.state || ''} onChange={e => setEditFormData(prev => ({...prev, address: {...prev.address, state: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>


            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 pt-8">Configurações do Microsite</h3>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Modo do Hero</label>
                <select name="heroMode" value={editFormData.heroMode || 'TRIPS'} onChange={e => setEditFormData(prev => ({...prev, heroMode: e.target.value as 'TRIPS' | 'STATIC'}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500">
                    <option value="TRIPS">Carrossel de Viagens</option>
                    <option value="STATIC">Banner Estático Personalizado</option>
                </select>
            </div>
            {editFormData.heroMode === 'STATIC' && (
                <>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Título do Hero</label>
                        <input type="text" name="heroTitle" value={editFormData.heroTitle || ''} onChange={e => setEditFormData(prev => ({...prev, heroTitle: e.target.value}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Subtítulo do Hero</label>
                        <textarea name="heroSubtitle" value={editFormData.heroSubtitle || ''} onChange={e => setEditFormData(prev => ({...prev, heroSubtitle: e.target.value}))} rows={2} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">URL do Banner do Hero</label>
                        <div className="flex items-center gap-2">
                            <input type="text" name="heroBannerUrl" value={editFormData.heroBannerUrl || ''} onChange={e => setEditFormData(prev => ({...prev, heroBannerUrl: e.target.value}))} className="flex-1 border p-3 rounded-lg outline-none focus:border-primary-500" />
                            <label className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-gray-200 inline-flex items-center gap-2 transition-colors text-sm">
                                {isUploadingBanner ? <Loader size={16} className="animate-spin"/> : <Upload size={16}/>} Upload
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files?.[0] as File, 'heroBannerUrl')} disabled={isUploadingBanner}/>
                            </label>
                        </div>
                        {editFormData.heroBannerUrl && <img src={editFormData.heroBannerUrl} alt="Hero Banner Preview" className="mt-4 max-h-48 object-cover rounded-lg shadow-sm border border-gray-100"/>}
                    </div>
                </>
            )}

            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2 pt-8">Dados Bancários</h3>
            {/* Bank Info fields */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Banco</label>
                <input type="text" name="bankInfo.bank" value={editFormData.bankInfo?.bank || ''} onChange={e => setEditFormData(prev => ({...prev, bankInfo: {...prev.bankInfo, bank: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Agência</label>
                <input type="text" name="bankInfo.agency" value={editFormData.bankInfo?.agency || ''} onChange={e => setEditFormData(prev => ({...prev, bankInfo: {...prev.bankInfo, agency: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Conta</label>
                <input type="text" name="bankInfo.account" value={editFormData.bankInfo?.account || ''} onChange={e => setEditFormData(prev => ({...prev, bankInfo: {...prev.bankInfo, account: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Chave Pix</label>
                <input type="text" name="bankInfo.pixKey" value={editFormData.bankInfo?.pixKey || ''} onChange={e => setEditFormData(prev => ({...prev, bankInfo: {...prev.bankInfo, pixKey: e.target.value}}))} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500" />
            </div>

            <div className="pt-8 border-t border-gray-100">
              <button type="submit" disabled={isSavingSettings} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isSavingSettings ? <Loader size={18} className="animate-spin" /> : <Save size={18}/>} Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}

      {showTripPreview && tripForm && currentAgency && (
          <TripPreviewModal 
            trip={tripForm} 
            agency={currentAgency} 
            onClose={() => setShowTripPreview(false)} 
          />
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
