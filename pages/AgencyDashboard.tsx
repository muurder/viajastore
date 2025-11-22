

import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, UserRole, Agency, TripCategory, TravelerType } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { Plus, Edit, Trash2, Save, ArrowLeft, Bold, Italic, Underline, List, Upload, Settings, CheckCircle, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MessageCircle, MapPin, Clock, ShieldCheck, Share2, Heart, ChevronDown, ChevronUp } from 'lucide-react';

// --- REUSABLE COMPONENTS (LOCAL TO THIS DASHBOARD) ---

const MAX_IMAGES = 8;

// --- CONSTANTS FOR SUGGESTIONS ---
const SUGGESTED_TAGS = ['Ecoturismo', 'História', 'Relaxamento', 'Esportes Radicais', 'Luxo', 'Econômico', 'All Inclusive', 'Pet Friendly', 'Acessível', 'LGBTQIA+'];
const SUGGESTED_TRAVELERS = ['SOZINHO', 'CASAL', 'FAMILIA', 'AMIGOS', 'MOCHILAO', 'MELHOR_IDADE'];
const SUGGESTED_PAYMENTS = ['Pix', 'Cartão de Crédito (até 12x)', 'Boleto Bancário', 'Transferência', 'Dinheiro'];
const SUGGESTED_INCLUDED = ['Hospedagem', 'Café da manhã', 'Passagens Aéreas', 'Transfer Aeroporto', 'Guia Turístico', 'Seguro Viagem', 'Ingressos', 'Almoço', 'Jantar', 'Passeios de Barco'];
const SUGGESTED_NOT_INCLUDED = ['Passagens Aéreas', 'Bebidas alcoólicas', 'Gorjetas', 'Despesas Pessoais', 'Jantar', 'Almoço', 'Taxas de Turismo'];

// Pill Input Component Enhanced
const PillInput: React.FC<{ 
    value: string[]; 
    onChange: (val: string[]) => void; 
    placeholder: string; 
    suggestions?: string[];
    customSuggestions?: string[];
    onDeleteCustomSuggestion?: (item: string) => void;
}> = ({ value, onChange, placeholder, suggestions = [], customSuggestions = [], onDeleteCustomSuggestion }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };
  
  const handleAdd = (item: string) => {
    if (!value.includes(item)) {
        onChange([...value, item]);
    }
  };
  
  const handleRemove = (itemToRemove: string) => {
    onChange(value.filter(item => item !== itemToRemove));
  };

  const handleDeleteCustom = (e: React.MouseEvent, item: string) => {
      e.stopPropagation();
      if (window.confirm(`Remover "${item}" das suas sugestões salvas?`)) {
          if (onDeleteCustomSuggestion) onDeleteCustomSuggestion(item);
      }
  };

  // Filter suggestions that are not yet selected
  const availableSuggestions = suggestions.filter(s => !value.includes(s));
  const availableCustom = customSuggestions.filter(s => !value.includes(s) && !suggestions.includes(s));

  return (
    <div className="space-y-3">
      {/* Suggestions Area */}
      {(availableSuggestions.length > 0 || availableCustom.length > 0) && (
        <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(s => (
                <button 
                    type="button"
                    key={s} 
                    onClick={() => handleAdd(s)}
                    className="text-xs bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded-md hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all flex items-center gap-1"
                >
                    <Plus size={10} /> {s}
                </button>
            ))}
            {availableCustom.map(s => (
                <button 
                    type="button"
                    key={s} 
                    onClick={() => handleAdd(s)}
                    className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100 transition-all flex items-center gap-1 group relative pr-6"
                >
                    <Plus size={10} /> {s}
                    <span 
                        onClick={(e) => handleDeleteCustom(e, s)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-300 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover sugestão salva"
                    >
                        <X size={10} />
                    </span>
                </button>
            ))}
        </div>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm"
      />
      
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((item, index) => (
          <div key={index} className="flex items-center bg-primary-50 text-primary-800 border border-primary-100 text-sm font-bold px-3 py-1.5 rounded-full animate-[scaleIn_0.2s]">
            <span>{item}</span>
            <button type="button" onClick={() => handleRemove(item)} className="ml-2 text-primary-400 hover:text-red-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Rich Text Editor
const RichTextEditor: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const execCmd = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  // Correction for typing backwards: Only update HTML if component is NOT focused
  useEffect(() => {
    if (contentRef.current) {
        const isActive = document.activeElement === contentRef.current;
        if (contentRef.current.innerHTML !== value && !isActive) {
            contentRef.current.innerHTML = value;
        }
        if (value === '' && contentRef.current.innerHTML !== '') {
            contentRef.current.innerHTML = '';
        }
    }
  }, [value]);

  const handleInput = () => {
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };
  
  // Fix Paste Refresh Bug: Intercept paste, strip HTML, insert text
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      if (contentRef.current) onChange(contentRef.current.innerHTML);
  };

  const addLink = () => {
      const url = prompt('Digite a URL do link:');
      if(url) execCmd('createLink', url);
  };

  const addImage = () => {
      const url = prompt('Cole a URL da imagem (ex: https://...):');
      if(url) execCmd('insertImage', url);
  };
  
  const addEmoji = (emoji: string) => {
      execCmd('insertText', emoji);
      setShowEmojiPicker(false);
  };

  const ToolbarButton = ({ cmd, icon: Icon, title, arg, active = false }: any) => (
    <button 
        type="button" 
        onClick={() => cmd && execCmd(cmd, arg)} 
        className={`p-2 rounded-lg transition-all ${active ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'}`}
        title={title}
    >
        <Icon size={18}/>
    </button>
  );

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
        
        <div className="relative">
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg" title="Emojis"><Smile size={18}/></button>
            {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg p-2 w-48 grid grid-cols-4 gap-1 z-20">
                    {COMMON_EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => addEmoji(e)} className="text-xl hover:bg-gray-100 p-1 rounded">{e}</button>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      <div 
        ref={contentRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full p-6 min-h-[300px] outline-none text-gray-800 prose prose-blue max-w-none 
        [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mb-2
        [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-800 [&>h3]:mb-2
        [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5
        [&>blockquote]:border-l-4 [&>blockquote]:border-primary-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600
        [&>img]:max-w-full [&>img]:rounded-lg [&>img]:shadow-md [&>img]:my-4"
      />
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
    
    if (images.length + files.length > MAX_IMAGES) {
        showToast(`Você pode enviar no máximo ${MAX_IMAGES} imagens.`, 'error');
        return;
    }

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadImage(file, 'trip-images');
        if (publicUrl) {
            newImages.push(publicUrl);
        } else {
            throw new Error('Upload falhou para um dos arquivos.');
        }
      }
      if (newImages.length > 0) onChange([...images, ...newImages]);
      showToast(`${newImages.length} imagem(ns) enviada(s) com sucesso!`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro no upload.', 'error');
    } finally {
      setUploading(false);
      // Reset file input to allow re-uploading the same file
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isLimitReached = images.length >= MAX_IMAGES;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
         <span className="text-sm font-bold text-gray-700">Gerenciar Fotos</span>
         <span className="text-xs text-gray-400">{images.length}/{MAX_IMAGES} imagens (Máx)</span>
      </div>
      
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
        try {
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
            <div className="w-24 h-24 rounded-full border-2 border-gray-200 bg-gray-50 overflow-hidden relative group shrink-0">
                <img src={currentLogo || `https://ui-avatars.com/api/?name=Logo&background=random`} alt="Logo" className="w-full h-full object-cover" />
                {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader className="animate-spin text-primary-600"/></div>}
            </div>
            <div>
                <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-pointer hover:bg-gray-50 inline-flex items-center gap-2 transition-colors text-sm">
                    <Upload size={16}/> Alterar Logomarca
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG ou WEBP. Max 2MB.</p>
                <button type="button" onClick={() => onUpload('')} className="text-xs text-red-500 hover:underline mt-1">Remover logo</button>
            </div>
        </div>
    );
};

const TripPreviewModal: React.FC<{ trip: Partial<Trip>; agency: Agency; onClose: () => void }> = ({ trip, agency, onClose }) => {
    const [openAccordion, setOpenAccordion] = useState<string | null>('included');
    const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key);
    
    const renderDescription = (desc: string) => {
        const isHTML = /<[a-z][\s\S]*>/i.test(desc) || desc.includes('<p>') || desc.includes('<ul>');
        if (isHTML) {
            return (
                <div 
                  className="prose prose-blue max-w-none text-gray-600 leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>a]:text-primary-600 [&>a]:underline"
                  dangerouslySetInnerHTML={{ __html: desc }} 
                />
            );
        }
        return <p className="leading-relaxed whitespace-pre-line">{desc}</p>;
    };

    const mainImage = trip.images && trip.images.length > 0 ? trip.images[0] : 'https://placehold.co/800x400/e2e8f0/94a3b8?text=Sem+Imagem';

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-[fadeIn_0.2s]">
            {/* Toolbar */}
            <div className="sticky top-0 z-50 bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2">
                    <Eye size={18} className="text-primary-400"/>
                    <span className="font-bold">Modo de Visualização</span>
                </div>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                    <X size={16}/> Fechar
                </button>
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-8 pb-20">
                <div className="flex items-center text-sm text-gray-500 mb-6">
                    <span>Home</span> <span className="mx-2">/</span> <span>Pacotes</span> <span className="mx-2">/</span> <span className="text-gray-900 font-medium">{trip.title || 'Sem Título'}</span>
                </div>

                {/* Images Grid Mock */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-8 h-[300px] md:h-[400px]">
                    <div className="md:col-span-2 h-full"><img src={mainImage} className="w-full h-full object-cover" alt="Main" /></div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-2 h-full">
                        <img src={trip.images?.[1] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="1" />
                        <img src={trip.images?.[2] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="2" />
                        <img src={trip.images?.[3] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="3" />
                        <img src={trip.images?.[4] || mainImage} className="w-full h-full object-cover bg-gray-100" alt="4" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                             <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">{trip.title || 'Título da Viagem'}</h1>
                             <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
                                <div className="flex items-center"><MapPin className="text-primary-500 mr-2" size={18}/> {trip.destination || 'Destino'}</div>
                                <div className="flex items-center"><Clock className="text-primary-500 mr-2" size={18}/> {trip.durationDays || 0} Dias</div>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                {trip.tags?.map((tag, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">{tag}</span>
                                ))}
                             </div>
                        </div>
                        
                        <div className="h-px bg-gray-200"></div>
                        
                        <div className="text-gray-600">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>
                            {renderDescription(trip.description || '')}
                        </div>

                        {/* Accordions Mock */}
                         <div className="space-y-4">
                             <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <button onClick={() => toggleAccordion('included')} className="w-full flex items-center justify-between p-4 bg-gray-50 font-bold text-gray-900"><span>O que está incluído</span>{openAccordion === 'included' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                                {openAccordion === 'included' && (
                                    <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {trip.included?.map((item, i) => <div key={i} className="flex items-start"><Check size={18} className="text-green-500 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>)}
                                    </div>
                                )}
                             </div>
                             <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <button onClick={() => toggleAccordion('notIncluded')} className="w-full flex items-center justify-between p-4 bg-gray-50 font-bold text-gray-900"><span>O que NÃO está incluído</span>{openAccordion === 'notIncluded' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
                                {openAccordion === 'notIncluded' && (
                                    <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {trip.notIncluded?.map((item, i) => <div key={i} className="flex items-start"><X size={18} className="text-red-400 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>)}
                                    </div>
                                )}
                             </div>
                         </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
                            <p className="text-sm text-gray-500 mb-1 font-medium">A partir de</p>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-extrabold text-gray-900">R$ {trip.price || 0}</span>
                                <span className="text-gray-500">/ pessoa</span>
                            </div>
                            <button disabled className="w-full bg-primary-600 text-white font-bold py-4 rounded-xl mb-4 opacity-50 cursor-not-allowed">Reservar Agora</button>
                            <p className="text-center text-xs text-gray-400">Botão desabilitado na prévia.</p>
                        </div>
                    </div>
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
  const { user, updateUser, uploadImage } = useAuth();
  const { getAgencyTrips, updateAgencySubscription, createTrip, updateTrip, deleteTrip, agencies, getAgencyStats } = useData();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'SUBSCRIPTION' | 'SETTINGS'>('OVERVIEW');
  const [settingsSection, setSettingsSection] = useState<'PROFILE' | 'PAGE'>('PROFILE');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripSearch, setTripSearch] = useState('');
  
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'PREMIUM' | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const myAgency = agencies.find(a => a.id === user?.id) as Agency;
  const [agencyForm, setAgencyForm] = useState<Partial<Agency>>({});

  const [tripForm, setTripForm] = useState<Partial<Trip>>(defaultTripForm);
  const [slugTouched, setSlugTouched] = useState(false);

  // Custom Settings from Agency
  const customSettings = myAgency?.customSettings || { tags: [], included: [], notIncluded: [], paymentMethods: [] };

  useEffect(() => {
      if(myAgency) {
          setAgencyForm({ 
              ...myAgency, 
              heroMode: myAgency.heroMode || 'TRIPS' 
          });
          if (myAgency.subscriptionStatus !== 'ACTIVE') setActiveTab('SUBSCRIPTION');
      }
  }, [myAgency]);

  if (!user || user.role !== UserRole.AGENCY) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin" /></div>;

  if (!myAgency) return <div className="min-h-screen flex justify-center items-center"><Loader className="animate-spin text-primary-600" /></div>;

  const isActive = myAgency.subscriptionStatus === 'ACTIVE';
  const myTrips = getAgencyTrips(user.id);
  const stats = getAgencyStats(user.id);

  const filteredTrips = myTrips.filter(t => t.title.toLowerCase().includes(tripSearch.toLowerCase()));
  
  const rawSlug = agencyForm.slug || myAgency.slug || '';
  const cleanSlug = rawSlug.replace(/[^a-z0-9-]/gi, '');
  const fullAgencyLink = cleanSlug ? `${window.location.origin}/#/${cleanSlug}` : '';

  const handleOpenCreate = () => {
    setEditingTripId(null);
    setTripForm(defaultTripForm);
    setSlugTouched(false);
    setViewMode('FORM');
  };

  const handleOpenEdit = (trip: Trip) => {
    setEditingTripId(trip.id);
    setTripForm({ 
        ...defaultTripForm, // Ensure all fields are present
        ...trip,
        startDate: trip.startDate?.split('T')[0] || defaultTripForm.startDate,
        endDate: trip.endDate?.split('T')[0] || defaultTripForm.endDate
    });
    setSlugTouched(true); 
    setViewMode('FORM');
  };
  
  const handleDuplicateTrip = async (trip: Trip) => {
      if(!window.confirm(`Deseja duplicar "${trip.title}"?`)) return;
      const { id, ...rest } = trip;
      const duplicatedTrip = {
          ...rest,
          title: `${trip.title} (Cópia)`,
          slug: `${slugify(trip.title)}-copia-${Date.now()}`, 
          active: false, views: 0, sales: 0, featuredInHero: false
      };
      
      try {
          await createTrip(duplicatedTrip as Trip);
          showToast('Pacote duplicado como Rascunho.', 'success');
      } catch (err) {
          showToast('Erro ao duplicar pacote.', 'error');
      }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTripForm(prev => ({ ...prev, title: newTitle, ...(!slugTouched && { slug: slugify(newTitle) }) }));
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const tripData = { ...tripForm, agencyId: user.id } as Trip;
    
    // --- PERSIST CUSTOM PILLS LOGIC ---
    const newSettings = { ...customSettings };
    let settingsChanged = false;

    const updateSuggestions = (key: keyof typeof newSettings, items: string[] | undefined, existingList: string[]) => {
        if (!items) return;
        items.forEach(item => {
            // Check if it's NOT in standard lists (we need to import SUGGESTED_X here or pass them)
            // Simplification: If it's not in user's saved settings, add it.
            // Ideally we check against standard lists too, but adding a standard item to custom list is harmless redundancy.
            if (!existingList.includes(item) && !newSettings[key]?.includes(item)) {
                newSettings[key] = [...(newSettings[key] || []), item];
                settingsChanged = true;
            }
        });
    };

    updateSuggestions('tags', tripData.tags, SUGGESTED_TAGS);
    updateSuggestions('included', tripData.included, SUGGESTED_INCLUDED);
    updateSuggestions('notIncluded', tripData.notIncluded, SUGGESTED_NOT_INCLUDED);
    updateSuggestions('paymentMethods', tripData.paymentMethods, SUGGESTED_PAYMENTS);

    if (settingsChanged) {
        await updateUser({ customSettings: newSettings });
    }
    // ----------------------------------

    try {
        if (editingTripId) {
            await updateTrip(tripData);
            showToast('Viagem atualizada!', 'success');
        } else {
            await createTrip({ ...tripData, active: true } as Trip);
            showToast('Viagem criada!', 'success');
        }
        setViewMode('LIST');
    } catch (err: any) { 
        showToast('Erro ao salvar: ' + (err.message || err), 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteCustomSuggestion = async (type: keyof typeof customSettings, item: string) => {
     const currentList = customSettings[type] || [];
     const newList = currentList.filter(i => i !== item);
     const newSettings = { ...customSettings, [type]: newList };
     await updateUser({ customSettings: newSettings });
     showToast('Sugestão removida.', 'success');
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
      if(res.success) showToast('Configurações salvas!', 'success');
      else showToast('Erro: ' + res.error, 'error');
  };
  
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || e.target.files.length === 0) return;
     setUploadingBanner(true);
     try {
        const url = await uploadImage(e.target.files[0], 'trip-images');
        if (url) {
            setAgencyForm({ ...agencyForm, heroBannerUrl: url });
            showToast('Banner enviado!', 'success');
        }
     } catch(e) {
         showToast('Erro no upload do banner', 'error');
     } finally {
         setUploadingBanner(false);
     }
  };

  const handleConfirmPayment = async () => {
      if (selectedPlan) {
          await updateAgencySubscription(user.id, 'ACTIVE', selectedPlan);
          showToast('Assinatura ativada!', 'success');
          setShowPayment(false);
          setActiveTab('OVERVIEW');
      }
  };

  const handleSlugChange = (val: string) => {
     const sanitized = slugify(val);
     setAgencyForm({...agencyForm, slug: sanitized});
  };

  const NavButton: React.FC<{tabId: any, children: React.ReactNode}> = ({ tabId, children }) => (
    <button onClick={() => setActiveTab(tabId)} className={`py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tabId ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{children}</button>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      
      {/* PREVIEW MODAL */}
      {showPreview && (
          <TripPreviewModal 
            trip={tripForm} 
            agency={myAgency} 
            onClose={() => setShowPreview(false)} 
          />
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex items-center gap-4 w-full">
           <img src={agencyForm.logo || myAgency.logo} className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover bg-white" alt="Logo" />
           <div>
             <h1 className="text-2xl font-bold text-gray-900">{myAgency.name}</h1>
             <div className="flex items-center gap-3 mt-1">
                {isActive ? <p className="text-green-600 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Ativo</p> : <p className="text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><X size={12}/> Pendente</p>}
                {cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs font-bold bg-primary-50 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-primary-100 hover:underline"><Eye size={12}/> Ver Página Pública</a>)}
             </div>
           </div>
        </div>
        <button onClick={() => { setActiveTab('SETTINGS'); setSettingsSection('PROFILE'); }} className="flex items-center px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-all"><Settings size={18} className="mr-2"/> Configurações</button>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide">
            <NavButton tabId="OVERVIEW">Visão Geral</NavButton>
            <NavButton tabId="TRIPS">Pacotes</NavButton>
            <NavButton tabId="SUBSCRIPTION">Assinatura</NavButton>
            <NavButton tabId="SETTINGS">Configurações</NavButton>
          </div>
          
          <div className="animate-[fadeIn_0.3s]">
          {activeTab === 'OVERVIEW' && isActive && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><Plane size={12} className="mr-1.5"/> Pacotes Ativos</p><h3 className="text-3xl font-extrabold text-gray-900 mt-2">{myTrips.filter(t => t.active).length}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><Users size={12} className="mr-1.5"/> Total Vendas</p><h3 className="text-3xl font-extrabold text-primary-600 mt-2">{stats.totalSales}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><Eye size={12} className="mr-1.5"/> Visualizações</p><h3 className="text-3xl font-extrabold text-gray-900 mt-2">{stats.totalViews.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase flex items-center"><DollarSign size={12} className="mr-1.5"/> Receita Total</p><h3 className="text-3xl font-extrabold text-green-600 mt-2">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                </div>
            </div>
          )}

          {activeTab === 'TRIPS' && isActive && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"><h2 className="text-xl font-bold">Meus Pacotes</h2>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input value={tripSearch} onChange={e => setTripSearch(e.target.value)} type="text" placeholder="Buscar pacote..." className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none focus:border-primary-500 bg-gray-50"/>
                    </div>
                    <button onClick={handleOpenCreate} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors whitespace-nowrap"><Plus size={18} className="mr-2"/> Novo Pacote</button>
                </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-100">
                     <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Preço</th><th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th></tr></thead>
                     <tbody className="divide-y divide-gray-100">
                        {filteredTrips.map(trip => (<tr key={trip.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={trip.images?.[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-12 h-12 rounded-lg object-cover bg-gray-100" alt={trip.title} /><span className="font-bold text-gray-900 text-sm">{trip.title}</span></div></td>
                            <td className="px-4 py-3"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${trip.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{trip.active ? 'ATIVO' : 'RASCUNHO'}</span></td>
                            <td className="px-4 py-3 text-sm font-bold text-gray-700">R$ {trip.price}</td>
                            <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                                <a href={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100" title="Visualizar"><Eye size={16}/></a>
                                <button onClick={() => handleDuplicateTrip(trip)} className="p-2 text-gray-400 hover:text-blue-500 rounded hover:bg-gray-100" title="Duplicar"><Copy size={16}/></button>
                                <button onClick={() => handleOpenEdit(trip)} className="p-2 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100" title="Editar"><Edit size={16}/></button>
                                <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100" title="Excluir"><Trash2 size={16}/></button>
                            </div></td>
                        </tr>))}
                     </tbody>
                 </table>
                 {filteredTrips.length === 0 && <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-gray-500">Nenhum pacote encontrado.</p></div>}
               </div>
            </div>
          )}

          {activeTab === 'SUBSCRIPTION' && (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {PLANS.map(plan => (<div key={plan.id} className="bg-white p-8 rounded-2xl border hover:border-primary-600 transition-all shadow-sm hover:shadow-xl">
                    <h3 className="text-xl font-bold">{plan.name}</h3><p className="text-3xl font-bold text-primary-600 mt-2">R$ {plan.price.toFixed(2)}</p>
                    <ul className="mt-6 space-y-3 text-gray-600 text-sm mb-8">{plan.features.map((f, i) => <li key={i} className="flex gap-2"><CheckCircle size={16} className="text-green-500 mt-0.5"/> {f}</li>)}</ul>
                    <button onClick={() => { setSelectedPlan(plan.id as any); setShowPayment(true); }} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20">Selecionar Plano</button>
                </div>))}
            </div>
          )}

          {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
                <div className="w-full md:w-64 bg-gray-50 p-6 border-r border-gray-100 rounded-l-2xl"><h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Menu</h3><nav className="space-y-2">
                    <button onClick={() => setSettingsSection('PROFILE')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${settingsSection === 'PROFILE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Perfil & Contato</button>
                    <button onClick={() => setSettingsSection('PAGE')} className={`w-full text-left px-4 py-2 rounded-lg text-sm font-bold transition-colors ${settingsSection === 'PAGE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>Página Pública (Hero)</button>
                </nav></div>
                <div className="flex-1 p-8"><form onSubmit={handleAgencyUpdate} className="space-y-8 max-w-2xl">
                    {settingsSection === 'PROFILE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><h2 className="text-xl font-bold text-gray-900 pb-2 border-b border-gray-100">Identidade & Contato</h2><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Logomarca</label><LogoUpload currentLogo={agencyForm.logo} onUpload={(url) => setAgencyForm({...agencyForm, logo: url})} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-bold mb-1">Nome da Agência</label><input value={agencyForm.name || ''} onChange={e => setAgencyForm({...agencyForm, name: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" /></div><div><label className="block text-xs font-bold mb-1">WhatsApp (Apenas números)</label><div className="relative"><Smartphone className="absolute left-3 top-3 text-gray-400" size={18} /><input value={agencyForm.whatsapp || ''} onChange={e => setAgencyForm({...agencyForm, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full border rounded-lg p-3 pl-10 outline-none focus:border-primary-500" placeholder="5511999999999"/></div></div></div><div><label className="block text-xs font-bold mb-1">Descrição</label><textarea rows={3} value={agencyForm.description || ''} onChange={e => setAgencyForm({...agencyForm, description: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-primary-500" placeholder="Sobre a agência..." /></div><div><label className="block text-xs font-bold mb-1">Slug (Endereço Personalizado)</label><div className="relative"><input value={agencyForm.slug || ''} onChange={e => handleSlugChange(e.target.value)} className="w-full border rounded-lg p-3 bg-gray-50 font-mono text-sm text-primary-700 font-medium pl-48" /><span className="absolute left-3 top-3 text-gray-500 text-sm select-none">{`${window.location.host}/#/`}</span></div>{cleanSlug && (<a href={fullAgencyLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-2 font-medium"><ExternalLink size={10} /> {fullAgencyLink}</a>)}</div></section>)}
                    {settingsSection === 'PAGE' && (<section className="space-y-6 animate-[fadeIn_0.2s]"><h2 className="text-xl font-bold text-gray-900 pb-2 border-b border-gray-100">Configuração do Hero (Banner)</h2><p className="text-sm text-gray-500">Escolha como o topo do seu site será exibido para os visitantes.</p><div><label className="block text-xs font-bold mb-3 uppercase text-gray-500">Modo de Exibição</label><div className="flex gap-4"><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'TRIPS' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'TRIPS' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Layout size={16}/> Carrossel de Viagens</div><p className="text-xs text-gray-500">Exibe suas viagens ativas e destacadas rotativamente.</p></button><button type="button" onClick={() => setAgencyForm({ ...agencyForm, heroMode: 'STATIC' })} className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${agencyForm.heroMode === 'STATIC' ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-gray-900 mb-1 flex items-center gap-2"><ImageIcon size={16}/> Banner Estático</div><p className="text-xs text-gray-500">Exibe uma imagem fixa com título e subtítulo.</p></button></div></div>{agencyForm.heroMode === 'STATIC' && (<div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4 animate-[fadeIn_0.3s]"><div><label className="block text-xs font-bold mb-1">Imagem do Banner</label><div className="flex items-center gap-4"><div className="w-32 h-16 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-300">{agencyForm.heroBannerUrl ? (<img src={agencyForm.heroBannerUrl} className="w-full h-full object-cover" alt="Banner" />) : (<div className="flex items-center justify-center h-full text-gray-400 text-xs">Sem imagem</div>)}{uploadingBanner && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader className="animate-spin"/></div>}</div><label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50"><input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner}/>Enviar Imagem</label></div></div><div><label className="block text-xs font-bold mb-1">Título do Hero</label><input value={agencyForm.heroTitle || ''} onChange={e => setAgencyForm({...agencyForm, heroTitle: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="Ex: Explore o Mundo Conosco"/></div><div><label className="block text-xs font-bold mb-1">Subtítulo do Hero</label><input value={agencyForm.heroSubtitle || ''} onChange={e => setAgencyForm({...agencyForm, heroSubtitle: e.target.value})} className="w-full border rounded-lg p-2 outline-none focus:border-primary-500" placeholder="Ex: As melhores experiências para você."/></div></div>)}</section>)}
                    <div className="pt-4 border-t border-gray-100"><button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all">Salvar Alterações</button></div>
                </form></div>
             </div>
          )}
          </div>
        </>
      ) : (
         <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-[scaleIn_0.2s]">
             <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
                 <button onClick={() => setViewMode('LIST')} className="flex items-center font-bold text-gray-600 hover:text-gray-900"><ArrowLeft size={18} className="mr-2"/> Voltar</button>
                 <div className="flex gap-3">
                     <button type="button" onClick={() => setShowPreview(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-50 transition-colors">
                        <Eye size={18} className="mr-2"/> Prévia
                     </button>
                     <button onClick={handleTripSubmit} disabled={isSubmitting} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 disabled:opacity-50 shadow-sm">
                        {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18} className="mr-2"/>} Salvar
                     </button>
                 </div>
             </div>
             
             <form onSubmit={handleTripSubmit} className="p-8 space-y-10 max-w-4xl mx-auto bg-gray-50/50 pb-32">
                 <section><div className="flex justify-between items-center border-b pb-2 mb-6"><h3 className="text-lg font-bold">Informações Básicas</h3><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!tripForm.featuredInHero} onChange={e => setTripForm({...tripForm, featuredInHero: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"/><span className="text-sm font-bold text-amber-600 flex items-center"><Star size={14} className="mr-1 fill-amber-500"/> Destacar na página da agência</span></label></div>
                    <div className="space-y-4">
                        <div><label className="font-bold text-sm mb-1 block">Título do Pacote</label><input value={tripForm.title || ''} onChange={handleTitleChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" placeholder="Ex: Fim de semana em Paraty"/></div>
                        <div><label className="font-bold text-sm mb-1 block">Slug (URL Amigável)</label><input value={tripForm.slug || ''} onFocus={() => setSlugTouched(true)} onChange={e => setTripForm({...tripForm, slug: slugify(e.target.value)}) } className="w-full border p-3 rounded-lg bg-gray-100 font-mono text-primary-700 outline-none focus:border-primary-500 transition-colors" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="font-bold text-sm mb-1 block">Preço (R$)</label><input type="number" value={tripForm.price || ''} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div>
                            <div><label className="font-bold text-sm mb-1 block">Duração (Dias)</label><input type="number" value={tripForm.durationDays || ''} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div>
                            <div><label className="font-bold text-sm mb-1 block">Categoria</label><select value={tripForm.category} onChange={(e) => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm"><option value="PRAIA">Praia</option><option value="AVENTURA">Aventura</option><option value="FAMILIA">Família</option><option value="ROMANTICO">Romântico</option><option value="URBANO">Urbano</option><option value="NATUREZA">Natureza</option><option value="CULTURA">Cultura</option><option value="GASTRONOMICO">Gastronômico</option></select></div>
                        </div>
                        <div><label className="font-bold text-sm mb-1 block">Destino (Cidade/Estado)</label><input value={tripForm.destination || ''} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div>
                    </div>
                 </section>
                 
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Datas da Viagem</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="font-bold text-sm mb-1 block flex items-center gap-2"><Calendar size={14}/> Data de Início</label><input type="date" value={tripForm.startDate || ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div>
                        <div><label className="font-bold text-sm mb-1 block flex items-center gap-2"><Calendar size={14}/> Data de Fim</label><input type="date" value={tripForm.endDate || ''} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500 transition-colors bg-white shadow-sm" /></div>
                    </div>
                 </section>
                 
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Tags & Público</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="font-bold text-sm mb-2 block flex items-center gap-2"><Tag size={14}/> Tags</label>
                            <PillInput 
                                value={tripForm.tags || []} 
                                onChange={v => setTripForm({...tripForm, tags: v})} 
                                placeholder="Digite ou selecione..." 
                                suggestions={SUGGESTED_TAGS}
                                customSuggestions={customSettings.tags}
                                onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('tags', s)}
                            />
                        </div>
                        <div><label className="font-bold text-sm mb-2 block flex items-center gap-2"><Users size={14}/> Tipo de Viajante</label><PillInput value={tripForm.travelerTypes as string[] || []} onChange={v => setTripForm({...tripForm, travelerTypes: v as TravelerType[]})} placeholder="Digite ou selecione..." suggestions={SUGGESTED_TRAVELERS} /></div>
                    </div>
                 </section>

                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Formas de Pagamento</h3>
                   <div>
                     <label className="font-bold text-sm mb-2 block flex items-center gap-2"><CreditCard size={14}/> Métodos Aceitos</label>
                     <PillInput 
                        value={tripForm.paymentMethods || []} 
                        onChange={v => setTripForm({...tripForm, paymentMethods: v})} 
                        placeholder="Digite ou selecione..." 
                        suggestions={SUGGESTED_PAYMENTS} 
                        customSuggestions={customSettings.paymentMethods}
                        onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('paymentMethods', s)}
                     />
                   </div>
                 </section>

                 <section><h3 className="text-lg font-bold border-b pb-2 mb-6">Inclusos e Não Inclusos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="font-bold text-sm mb-2 block flex items-center gap-2 text-green-600"><Check size={14}/> Itens Inclusos</label>
                            <PillInput 
                                value={tripForm.included || []} 
                                onChange={v => setTripForm({...tripForm, included: v})} 
                                placeholder="Digite ou selecione..." 
                                suggestions={SUGGESTED_INCLUDED} 
                                customSuggestions={customSettings.included}
                                onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('included', s)}
                            />
                        </div>
                        <div>
                            <label className="font-bold text-sm mb-2 block flex items-center gap-2 text-red-500"><X size={14}/> Itens NÃO Inclusos</label>
                            <PillInput 
                                value={tripForm.notIncluded || []} 
                                onChange={v => setTripForm({...tripForm, notIncluded: v})} 
                                placeholder="Digite ou selecione..." 
                                suggestions={SUGGESTED_NOT_INCLUDED} 
                                customSuggestions={customSettings.notIncluded}
                                onDeleteCustomSuggestion={s => handleDeleteCustomSuggestion('notIncluded', s)}
                            />
                        </div>
                    </div>
                 </section>

                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Descrição Detalhada</h3>
                   <p className="text-sm text-gray-500 mb-4">Use o editor abaixo para contar a história da sua viagem. Adicione títulos, listas e imagens para tornar o texto atrativo.</p>
                   <RichTextEditor value={tripForm.description || ''} onChange={v => setTripForm({...tripForm, description: v})} />
                 </section>
                 <section><h3 className="text-lg font-bold border-b pb-2 mb-4">Galeria de Imagens</h3><ImageManager images={tripForm.images || []} onChange={imgs => setTripForm({...tripForm, images: imgs})} /></section>
             </form>
             
             {/* Sticky Footer Bar */}
             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <p className="text-xs text-gray-500 hidden sm:block">Certifique-se de salvar todas as alterações.</p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button type="button" onClick={() => setShowPreview(true)} className="flex-1 sm:flex-initial bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-bold flex justify-center items-center hover:bg-gray-50 transition-colors">
                            <Eye size={18} className="mr-2"/> Prévia
                        </button>
                        <button onClick={handleTripSubmit} disabled={isSubmitting} className="flex-1 sm:flex-initial bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex justify-center items-center hover:bg-primary-700 disabled:opacity-50 shadow-lg shadow-primary-500/30 transition-all">
                            {isSubmitting ? <Loader className="animate-spin" size={18}/> : <Save size={18} className="mr-2"/>} Salvar Viagem
                        </button>
                    </div>
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