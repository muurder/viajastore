import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency, Plan, ItineraryDay, TripCategory, TravelerType, ThemeColors, Address, UserRole, BoardingPoint, Booking } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { Plus, Edit, Trash2, Save, ArrowLeft, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle, ShieldCheck, Upload, ArrowRight, CheckCircle, Bold, Italic, Underline, List, Settings, BedDouble, Bus, FileText, Download, UserCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- HELPER CONSTANTS & COMPONENTS ---

const MAX_IMAGES = 8;

const SUGGESTED_TAGS = ['Ecoturismo', 'História', 'Relaxamento', 'Esportes Radicais', 'Luxo', 'Econômico', 'All Inclusive', 'Pet Friendly', 'Acessível', 'LGBTQIA+'];
const SUGGESTED_TRAVELERS = ['SOZINHO', 'CASAL', 'FAMILIA', 'AMIGOS', 'MOCHILAO', 'MELHOR_IDADE'];
const SUGGESTED_INCLUDED = ['Hospedagem', 'Café da manhã', 'Passagens Aéreas', 'Transfer Aeroporto', 'Guia Turístico', 'Seguro Viagem', 'Ingressos', 'Almoço', 'Jantar', 'Passeios de Barco'];
const SUGGESTED_NOT_INCLUDED = ['Passagens Aéreas', 'Bebidas alcoólicas', 'Gorjetas', 'Despesas Pessoais', 'Jantar', 'Almoço', 'Taxas de Turismo'];

const NavButton: React.FC<{ tabId: string; label: string; icon: React.ComponentType<LucideProps>; activeTab: string; onClick: (tabId: string) => void; hasNotification?: boolean; }> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
  <button onClick={() => onClick(tabId)} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
    <Icon size={16} /> {label} {hasNotification && ( <span className="absolute top-2 right-2 flex h-2.5 w-2.5"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> </span> )} 
  </button>
);

const SubscriptionActivationView: React.FC<{ agency: Agency; onSelectPlan: (plan: Plan) => void; activatingPlanId: string | null; }> = ({ agency, onSelectPlan, activatingPlanId }) => {
  return (
    <div className="max-w-4xl mx-auto text-center py-12 animate-[fadeIn_0.3s]">
      <div className="bg-red-50 p-4 rounded-full inline-block border-4 border-red-100 mb-4"> <CreditCard size={32} className="text-red-500" /> </div>
      <h1 className="text-3xl font-bold text-gray-900">Ative sua conta de agência</h1>
      <p className="text-gray-500 mt-2 mb-8">Olá, {agency.name}! Para começar a vender e gerenciar seus pacotes, escolha um dos nossos planos de assinatura.</p>
      <div className="grid md:grid-cols-2 gap-8">
        {PLANS.map(plan => {
          const isLoading = activatingPlanId === plan.id;
          const isPremium = plan.id === 'PREMIUM';
          return (
            <div key={plan.id} className={`bg-white p-8 rounded-2xl border transition-all shadow-sm hover:shadow-xl relative overflow-hidden ${isPremium ? 'border-primary-500' : 'border-gray-200 hover:border-primary-300'}`}>
              {isPremium && <div className="absolute top-0 right-0 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-md">Recomendado</div>}
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-3xl font-extrabold text-primary-600 mt-2">R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span></p>
              <ul className="mt-8 space-y-4 text-gray-600 text-sm mb-8 text-left">{plan.features.map((f, i) => (<li key={i} className="flex gap-3 items-start"><CheckCircle size={18} className="text-green-500 mt-0.5 flex-shrink-0" /> <span className="leading-snug">{f}</span></li>))}</ul>
              <button onClick={() => onSelectPlan(plan)} disabled={!!activatingPlanId} className="w-full py-3 rounded-xl font-bold transition-colors bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                {isLoading ? (<span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Processando...</span>) : 'Selecionar Plano'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SubscriptionConfirmationModal: React.FC<{ plan: Plan; onClose: () => void; onConfirm: () => void; isSubmitting: boolean; }> = ({ plan, onClose, onConfirm, isSubmitting }) => {
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-4">Confirmar Assinatura</h3>
                <p className="mb-6">Você está prestes a ativar o <span className="font-bold">{plan.name}</span>.</p>
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <div className="flex justify-between items-center"><span className="font-bold">Total</span><span className="text-2xl font-bold text-primary-600">R$ {plan.price.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/mês</span></span></div>
                    <p className="text-xs text-gray-400 mt-1">Cobrança mensal</p>
                </div>
                <button onClick={onConfirm} disabled={isSubmitting} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    {isSubmitting ? (<span className="flex items-center justify-center gap-2"><Loader size={18} className="animate-spin" /> Processando...</span>) : 'Confirmar Assinatura'}
                </button>
            </div>
        </div>
  );
};

const ActionsMenu: React.FC<{ trip: Trip; onEdit: () => void; onManage: () => void; onDuplicate: () => void; onDelete: () => void; onToggleStatus: () => void; fullAgencyLink: string; }> = ({ trip, onEdit, onManage, onDuplicate, onDelete, onToggleStatus, fullAgencyLink }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPublished = trip.is_active;
  useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setIsOpen(false); } }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []);
  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onManage} className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-gray-900 text-white hover:bg-black border border-transparent shadow-sm">
            <Settings size={14} className="mr-1.5"/> Gerenciar
        </button>
        <button onClick={onEdit} className={`hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${isPublished ? 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:border-primary-200 hover:text-primary-600' : 'text-primary-700 bg-primary-50 border-primary-100 hover:bg-primary-100'}`}>
            Editar
        </button>
        <button onClick={() => setIsOpen(!isOpen)} className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}><MoreHorizontal size={20} /></button>
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[fadeIn_0.1s] origin-top-right ring-1 ring-black/5">
          <div className="py-1">
            <div className="px-4 py-2 border-b border-gray-50"><p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ações do Pacote</p></div>
            <button onClick={() => { onManage(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-bold"><Settings size={16} className="mr-3 text-gray-400"/> Gerenciar Operação</button>
            {isPublished ? ( <> <Link to={fullAgencyLink ? `${fullAgencyLink}/viagem/${trip.slug}` : '#'} target="_blank" rel="noopener noreferrer" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors" onClick={() => setIsOpen(false)}><Eye size={16} className="mr-3 text-gray-400"/> Ver público</Link> <button onClick={() => { onToggleStatus(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-amber-600 transition-colors"><PauseCircle size={16} className="mr-3 text-gray-400"/> Pausar vendas</button> </> ) : ( <> <button onClick={() => { onToggleStatus(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition-colors"><PlayCircle size={16} className="mr-3 text-green-500"/> {trip.is_active === false ? 'Publicar' : 'Retomar vendas'}</button> <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:hidden transition-colors"><Edit size={16} className="mr-3 text-gray-400"/> Editar</button> </> )}
            <button onClick={() => { onDuplicate(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"><Copy size={16} className="mr-3 text-gray-400"/> Duplicar</button>
            <div className="border-t border-gray-100 mt-1 pt-1"><button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-3"/> Excluir</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const PillInput: React.FC<{ value: string[]; onChange: (val: string[]) => void; placeholder: string; suggestions?: string[]; customSuggestions?: string[]; onDeleteCustomSuggestion?: (item: string) => void; }> = ({ value, onChange, placeholder, suggestions = [], customSuggestions = [], onDeleteCustomSuggestion }) => {
  const [inputValue, setInputValue] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && inputValue.trim() !== '') { e.preventDefault(); if (!value.includes(inputValue.trim())) onChange([...value, inputValue.trim()]); setInputValue(''); } };
  const handleAdd = (item: string) => !value.includes(item) && onChange([...value, item]);
  const handleRemove = (itemToRemove: string) => onChange(value.filter(item => item !== itemToRemove));
  const handleDeleteCustom = (e: React.MouseEvent, item: string) => { e.stopPropagation(); if (window.confirm(`Remover "${item}" das suas sugestões salvas?`)) onDeleteCustomSuggestion?.(item); };
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
  const execCmd = (command: string, arg?: string) => { document.execCommand(command, false, arg); if (contentRef.current) onChange(contentRef.current.innerHTML); };
  useEffect(() => { if (contentRef.current && contentRef.current.innerHTML !== value && document.activeElement !== contentRef.current) contentRef.current.innerHTML = value; if (value === '' && contentRef.current) contentRef.current.innerHTML = ''; }, [value]);
  const handleInput = () => contentRef.current && onChange(contentRef.current.innerHTML);
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, text); if (contentRef.current) onChange(contentRef.current.innerHTML); };
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
        <button type="button" onClick={addLink} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-all" title="Inserir Link"><LinkIcon size={18}/></button>
        <button type="button" onClick={addImage} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-all" title="Inserir Imagem"><ImageIcon size={18}/></button>
        <div className="relative"> <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-all" title="Emojis"><Smile size={18}/></button> {showEmojiPicker && <div className="absolute top-10 left-0 bg-white border border-gray-200 shadow-xl rounded-lg p-2 grid grid-cols-4 gap-1 w-48 z-20">{COMMON_EMOJIS.map(e => <button key={e} type="button" onClick={() => addEmoji(e)} className="p-2 hover:bg-gray-100 rounded text-xl">{e}</button>)}</div>} </div>
      </div>
      <div ref={contentRef} contentEditable onInput={handleInput} onPaste={handlePaste} className="p-4 min-h-[150px] outline-none prose prose-sm max-w-none overflow-y-auto" style={{ whiteSpace: 'pre-wrap' }} />
    </div>
  );
};

// --- TRIP MANAGEMENT MODAL ---
const TripManagementModal: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onClose: () => void }> = ({ trip, bookings, clients, onClose }) => {
    const [activeTab, setActiveTab] = useState<'MANIFEST' | 'TRANSPORT' | 'ROOMING'>('MANIFEST');
    
    // Manifest Data Preparation
    const passengers = bookings.filter(b => b.status === 'CONFIRMED').map(b => {
        const client = clients.find(c => c.id === b.clientId);
        return {
            bookingId: b.id,
            name: client?.name || 'Passageiro',
            cpf: client?.cpf || '---',
            phone: client?.phone || '---',
            email: client?.email || '---',
            voucher: b.voucherCode
        };
    });

    const exportManifestPDF = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Manifesto de Viagem: ${trip.title}`, 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Saída: ${new Date(trip.startDate).toLocaleDateString()} | Retorno: ${new Date(trip.endDate).toLocaleDateString()}`, 14, 28);
        doc.text(`Total Passageiros: ${passengers.length}`, 14, 34);

        const tableColumn = ["Nome", "CPF", "Telefone", "Email", "Voucher"];
        const tableRows = passengers.map(p => [p.name, p.cpf, p.phone, p.email, p.voucher]);

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        doc.save(`manifesto_${trip.slug}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl w-full h-full max-w-6xl max-h-[95vh] shadow-2xl relative flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{trip.title}</h2>
                        <p className="text-sm text-gray-500">Gestão Operacional • {passengers.length} Confirmados</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                </div>

                <div className="flex border-b border-gray-200 px-6">
                    <button onClick={() => setActiveTab('MANIFEST')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'MANIFEST' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Lista de Passageiros</button>
                    <button onClick={() => setActiveTab('TRANSPORT')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'TRANSPORT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Mapa de Transporte</button>
                    <button onClick={() => setActiveTab('ROOMING')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${activeTab === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Rooming List</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'MANIFEST' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={20} className="text-primary-600"/> Manifesto de Embarque</h3>
                                <button onClick={exportManifestPDF} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors"><Download size={16}/> Baixar PDF</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Nome Completo</th>
                                            <th className="px-4 py-3">Documento (CPF)</th>
                                            <th className="px-4 py-3">Contato</th>
                                            <th className="px-4 py-3">Voucher</th>
                                            <th className="px-4 py-3 text-center">Check-in</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {passengers.length > 0 ? passengers.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{p.cpf}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    <div>{p.phone}</div>
                                                    <div className="text-xs text-gray-400">{p.email}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">{p.voucher}</td>
                                                <td className="px-4 py-3 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"/></td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum passageiro confirmado ainda.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TRANSPORT' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-white p-8 rounded-full shadow-sm mb-4"><Bus size={48} className="text-primary-300"/></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Mapa de Assentos</h3>
                            <p className="text-gray-500 max-w-md mb-6">Em breve você poderá desenhar o layout do ônibus e arrastar os passageiros para seus assentos.</p>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">Funcionalidade Premium em Desenvolvimento</span>
                        </div>
                    )}

                    {activeTab === 'ROOMING' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="bg-white p-8 rounded-full shadow-sm mb-4"><BedDouble size={48} className="text-primary-300"/></div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Rooming List</h3>
                            <p className="text-gray-500 max-w-md mb-6">Em breve você poderá criar quartos e distribuir os passageiros para organizar a hospedagem.</p>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">Funcionalidade Premium em Desenvolvimento</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, logout, loading: authLoading, uploadImage } = useAuth();
  const { agencies, bookings, trips: allTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencySubscription, updateAgencyReview, agencyReviews, getAgencyStats, getAgencyTheme, saveAgencyTheme, refreshData, updateAgencyProfileByAdmin, clients } = useData();
  const { themes, activeTheme, setTheme, setAgencyTheme: setGlobalAgencyTheme } = useTheme();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';
  
  const currentAgency = agencies.find(a => a.id === user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== UserRole.AGENCY) {
      navigate('/unauthorized');
    }
  }, [user, navigate, authLoading]);

  useEffect(() => {
      if (currentAgency?.agencyId) {
          const loadTheme = async () => {
              const theme = await getAgencyTheme(currentAgency.agencyId);
              if (theme) setGlobalAgencyTheme(theme.colors);
          };
          loadTheme();
      }
  }, [currentAgency, getAgencyTheme, setGlobalAgencyTheme]);

  // --- TRIP EDITING STATE ---
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0); // 0: Basic, 1: Details, 2: Boarding, 3: Itinerary, 4: Gallery
  const [manageTripId, setManageTripId] = useState<string | null>(null); // For operational modal
  
  const [tripForm, setTripForm] = useState<Partial<Trip>>({ title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [] });
  
  const [profileForm, setProfileForm] = useState<Partial<Agency>>({ name: '', description: '', whatsapp: '', phone: '', website: '', address: { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, bankInfo: { bank: '', agency: '', account: '', pixKey: '' }, logo: '' });
  const [themeForm, setThemeForm] = useState<ThemeColors>({ primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' });
  const [heroForm, setHeroForm] = useState({ heroMode: 'TRIPS', heroBannerUrl: '', heroTitle: '', heroSubtitle: '' });

  const [loading, setLoading] = useState(false);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [showConfirmSubscription, setShowConfirmSubscription] = useState<Plan | null>(null);

  const stats = currentAgency ? getAgencyStats(currentAgency.agencyId) : { totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0 };
  const myTrips = allTrips.filter(t => t.agencyId === currentAgency?.agencyId);
  const myBookings = bookings.filter(b => b._trip?.agencyId === currentAgency?.agencyId);
  const myReviews = agencyReviews.filter(r => r.agencyId === currentAgency?.agencyId);

  useEffect(() => {
    if (currentAgency) {
      setProfileForm({ name: currentAgency.name, description: currentAgency.description, whatsapp: currentAgency.whatsapp || '', phone: currentAgency.phone || '', website: currentAgency.website || '', address: currentAgency.address || { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, bankInfo: currentAgency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' }, logo: currentAgency.logo });
      setHeroForm({ heroMode: currentAgency.heroMode || 'TRIPS', heroBannerUrl: currentAgency.heroBannerUrl || '', heroTitle: currentAgency.heroTitle || '', heroSubtitle: currentAgency.heroSubtitle || '' });
    }
  }, [currentAgency]);

  useEffect(() => {
      const fetchTheme = async () => { if (currentAgency) { const savedTheme = await getAgencyTheme(currentAgency.agencyId); if (savedTheme) { setThemeForm(savedTheme.colors); } } };
      fetchTheme();
  }, [currentAgency, getAgencyTheme]);

  if (authLoading || !currentAgency) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;

  const handleSelectPlan = (plan: Plan) => setShowConfirmSubscription(plan);
  const confirmSubscription = async () => { if (!showConfirmSubscription) return; setActivatingPlanId(showConfirmSubscription.id); try { await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', showConfirmSubscription.id as 'BASIC' | 'PREMIUM', new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()); showToast(`Plano ${showConfirmSubscription.name} ativado com sucesso!`, 'success'); window.location.reload(); } catch (error) { showToast('Erro ao ativar plano.', 'error'); } finally { setActivatingPlanId(null); setShowConfirmSubscription(null); } };

  if (currentAgency.subscriptionStatus !== 'ACTIVE') { return ( <> <SubscriptionActivationView agency={currentAgency} onSelectPlan={handleSelectPlan} activatingPlanId={activatingPlanId} /> {showConfirmSubscription && ( <SubscriptionConfirmationModal plan={showConfirmSubscription} onClose={() => setShowConfirmSubscription(null)} onConfirm={confirmSubscription} isSubmitting={!!activatingPlanId} /> )} </> ); }

  const handleTabChange = (tabId: string) => { setSearchParams({ tab: tabId }); setIsEditingTrip(false); setEditingTripId(null); setActiveStep(0); };
  
  const handleTripSubmit = async () => { if (!tripForm.title || !tripForm.destination || !tripForm.price) { showToast('Preencha os campos obrigatórios.', 'error'); return; } setLoading(true); try { if (isEditingTrip && editingTripId) { await updateTrip({ ...tripForm, id: editingTripId, agencyId: currentAgency.agencyId } as Trip); showToast('Pacote atualizado com sucesso!', 'success'); } else { await createTrip({ ...tripForm, agencyId: currentAgency.agencyId } as Trip); showToast('Pacote criado com sucesso!', 'success'); } setIsEditingTrip(false); setEditingTripId(null); setTripForm({ title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [] }); setActiveStep(0); } catch (err: any) { showToast(err.message || 'Erro ao salvar pacote.', 'error'); } finally { setLoading(false); } };
  
  const handleEditTrip = (trip: Trip) => { setTripForm(trip); setEditingTripId(trip.id); setIsEditingTrip(true); setActiveStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteTrip = async (id: string) => { if (window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) { await deleteTrip(id); showToast('Pacote excluído.', 'success'); } };
  const handleDuplicateTrip = async (trip: Trip) => { const newTrip = { ...trip, title: `${trip.title} (Cópia)`, is_active: false }; const { id, ...tripData } = newTrip; await createTrip({ ...tripData, agencyId: currentAgency.agencyId } as Trip); showToast('Pacote duplicado com sucesso!', 'success'); };
  const handleSaveProfile = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await updateUser(profileForm); await updateUser({ heroMode: heroForm.heroMode as 'TRIPS' | 'STATIC', heroBannerUrl: heroForm.heroBannerUrl, heroTitle: heroForm.heroTitle, heroSubtitle: heroForm.heroSubtitle }); showToast('Perfil atualizado!', 'success'); } catch (err) { showToast('Erro ao atualizar perfil.', 'error'); } finally { setLoading(false); } };
  const handleSaveTheme = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await saveAgencyTheme(currentAgency.agencyId, themeForm); setGlobalAgencyTheme(themeForm); showToast('Tema da agência atualizado!', 'success'); } catch (err) { showToast('Erro ao salvar tema.', 'error'); } finally { setLoading(false); } };
  const handleLogout = async () => { await logout(); navigate('/'); };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files || e.target.files.length === 0) return; const file = e.target.files[0]; setLoading(true); try { const url = await uploadImage(file, 'agency-logos'); if (url) { setProfileForm(prev => ({ ...prev, logo: url })); } } catch (e) { showToast('Erro ao fazer upload da imagem', 'error'); } finally { setLoading(false); } };

  // --- TRIP BUILDER HELPERS ---
  const handleAddItineraryDay = () => {
      setTripForm(prev => ({
          ...prev,
          itinerary: [...(prev.itinerary || []), { day: (prev.itinerary?.length || 0) + 1, title: '', description: '' }]
      }));
  };

  const handleRemoveItineraryDay = (index: number) => {
      setTripForm(prev => ({
          ...prev,
          itinerary: prev.itinerary?.filter((_, i) => i !== index).map((item, i) => ({ ...item, day: i + 1 }))
      }));
  };

  const handleUpdateItineraryDay = (index: number, field: keyof ItineraryDay, value: string) => {
      setTripForm(prev => ({
          ...prev,
          itinerary: prev.itinerary?.map((item, i) => i === index ? { ...item, [field]: value } : item)
      }));
  };

  const handleAddBoardingPoint = () => {
      setTripForm(prev => ({
          ...prev,
          boardingPoints: [...(prev.boardingPoints || []), { id: crypto.randomUUID(), time: '', location: '' }]
      }));
  };

  const handleRemoveBoardingPoint = (index: number) => {
      setTripForm(prev => ({
          ...prev,
          boardingPoints: prev.boardingPoints?.filter((_, i) => i !== index)
      }));
  };

  const handleUpdateBoardingPoint = (index: number, field: keyof BoardingPoint, value: string) => {
      setTripForm(prev => ({
          ...prev,
          boardingPoints: prev.boardingPoints?.map((item, i) => i === index ? { ...item, [field]: value } : item)
      }));
  };

  const handleAddImage = () => {
      const url = prompt('Cole a URL da imagem (ex: https://...):');
      if (url) {
          setTripForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
      }
  };

  const handleRemoveImage = (index: number) => {
      setTripForm(prev => ({ ...prev, images: prev.images?.filter((_, i) => i !== index) }));
  };

  const renderTripBuilder = () => {
      const steps = ['Básico', 'Detalhes', 'Embarques', 'Roteiro', 'Fotos'];
      switch (activeStep) {
          case 0: // Basic Info
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote</label>
                              <input value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: Fim de semana em Ilhabela" autoFocus/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Destino</label>
                              <div className="relative"><MapPin className="absolute left-3 top-3 text-gray-400" size={18} /><input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Cidade, Estado"/></div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa (R$)</label>
                              <div className="relative"><DollarSign className="absolute left-3 top-3 text-gray-400" size={18} /><input type="number" value={tripForm.price} onChange={e => setTripForm({...tripForm, price: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0,00"/></div>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-2">Categoria Principal</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {['PRAIA', 'AVENTURA', 'NATUREZA', 'ROMANTICO', 'FAMILIA', 'URBANO', 'CULTURA', 'GASTRONOMICO'].map(cat => (
                                      <button key={cat} type="button" onClick={() => setTripForm({...tripForm, category: cat as TripCategory})} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${tripForm.category === cat ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{cat}</button>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              );
          case 1: // Details
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Início</label><input type="date" value={tripForm.startDate?.split('T')[0]} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Fim</label><input type="date" value={tripForm.endDate?.split('T')[0]} onChange={e => setTripForm({...tripForm, endDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label><input type="number" value={tripForm.durationDays} onChange={e => setTripForm({...tripForm, durationDays: Number(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"/></div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Geral</label>
                          <RichTextEditor value={tripForm.description || ''} onChange={(val) => setTripForm({...tripForm, description: val})} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">O que está incluído</label><PillInput value={tripForm.included || []} onChange={(inc) => setTripForm({...tripForm, included: inc})} placeholder="Digite e Enter..." suggestions={SUGGESTED_INCLUDED}/></div>
                          <div><label className="block text-sm font-bold text-gray-700 mb-2">O que NÃO está incluído</label><PillInput value={tripForm.notIncluded || []} onChange={(not) => setTripForm({...tripForm, notIncluded: not})} placeholder="Digite e Enter..." suggestions={SUGGESTED_NOT_INCLUDED}/></div>
                      </div>
                  </div>
              );
          case 2: // Boarding Points
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Locais de Embarque</h3>
                          <button type="button" onClick={handleAddBoardingPoint} className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold hover:bg-primary-100 flex items-center gap-2"><Plus size={16}/> Adicionar Local</button>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          {tripForm.boardingPoints && tripForm.boardingPoints.length > 0 ? (
                              <div className="space-y-0 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary-200">
                                  {tripForm.boardingPoints.map((point, index) => (
                                      <div key={index} className="relative pl-14 pb-6 last:pb-0 group">
                                          <div className="absolute left-2.5 top-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm z-10">{index + 1}</div>
                                          <div className="flex gap-4 items-start">
                                              <div className="flex-1 grid grid-cols-3 gap-4">
                                                  <div className="col-span-1">
                                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horário</label>
                                                      <input type="time" value={point.time} onChange={e => handleUpdateBoardingPoint(index, 'time', e.target.value)} className="w-full border p-2 rounded-lg bg-white" />
                                                  </div>
                                                  <div className="col-span-2">
                                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local / Referência</label>
                                                      <input type="text" value={point.location} onChange={e => handleUpdateBoardingPoint(index, 'location', e.target.value)} className="w-full border p-2 rounded-lg bg-white" placeholder="Ex: Metrô Tatuapé" />
                                                  </div>
                                              </div>
                                              <button onClick={() => handleRemoveBoardingPoint(index)} className="text-gray-400 hover:text-red-500 mt-6"><X size={18}/></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-gray-500 italic">Nenhum local de embarque definido.</div>
                          )}
                      </div>
                  </div>
              );
          case 3: // Itinerary
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Roteiro Dia a Dia</h3>
                          <button type="button" onClick={handleAddItineraryDay} className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold hover:bg-primary-100 flex items-center gap-2"><Plus size={16}/> Adicionar Dia</button>
                      </div>
                      {tripForm.itinerary && tripForm.itinerary.length > 0 ? (
                          <div className="space-y-4">
                              {tripForm.itinerary.map((item, index) => (
                                  <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 relative group hover:border-primary-300 transition-colors">
                                      <div className="absolute -left-3 top-6 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{item.day}</div>
                                      <button onClick={() => handleRemoveItineraryDay(index)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"><X size={18}/></button>
                                      <div className="grid gap-4">
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Dia</label>
                                              <input value={item.title} onChange={e => handleUpdateItineraryDay(index, 'title', e.target.value)} className="w-full border-b border-gray-200 focus:border-primary-500 outline-none py-1 font-bold text-gray-900" placeholder="Ex: Chegada e Check-in" />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição das Atividades</label>
                                              <textarea value={item.description} onChange={e => handleUpdateItineraryDay(index, 'description', e.target.value)} rows={2} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Descreva o que acontecerá neste dia..." />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                              <ListOrdered size={32} className="mx-auto text-gray-400 mb-3"/>
                              <p className="text-gray-500 mb-4">Seu roteiro ainda está vazio.</p>
                              <button type="button" onClick={handleAddItineraryDay} className="text-primary-600 font-bold hover:underline">Começar a criar roteiro</button>
                          </div>
                      )}
                  </div>
              );
          case 4: // Gallery
              return (
                  <div className="space-y-6 animate-[fadeIn_0.3s]">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Galeria de Fotos</h3>
                          <button type="button" onClick={handleAddImage} className="text-primary-600 font-bold hover:underline flex items-center gap-1"><Plus size={16}/> Adicionar via URL</button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {tripForm.images?.map((url, index) => (
                              <div key={index} className="relative group rounded-xl overflow-hidden aspect-video shadow-sm border border-gray-200">
                                  <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                  <button onClick={() => handleRemoveImage(index)} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"><Trash2 size={14}/></button>
                              </div>
                          ))}
                          {(tripForm.images?.length || 0) < MAX_IMAGES && (
                              <button onClick={handleAddImage} className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors aspect-video bg-gray-50">
                                  <ImageIcon size={32} className="mb-2"/>
                                  <span className="text-sm font-medium">Adicionar Foto</span>
                              </button>
                          )}
                      </div>
                      <p className="text-xs text-gray-500">Recomendamos imagens horizontais de alta qualidade. Máximo {MAX_IMAGES} fotos.</p>
                  </div>
              );
          default: return null;
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
            <div className="relative"><img src={currentAgency.logo || `https://ui-avatars.com/api/?name=${currentAgency.name}`} alt={currentAgency.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" /><span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span></div>
            <div><h1 className="text-2xl font-bold text-gray-900">{currentAgency.name}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><span className="flex items-center"><Globe size={14} className="mr-1"/> {currentAgency.slug}.viajastore.com</span><a href={`/#/${currentAgency.slug}`} target="_blank" className="text-primary-600 hover:underline flex items-center font-bold"><ExternalLink size={12} className="mr-1"/> Ver Site</a></div></div>
        </div>
        <div className="flex gap-3"><Link to={`/${currentAgency.slug}/client/BOOKINGS`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"><Users size={18}/> Área do Cliente</Link><button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"><LogOut size={18}/> Sair</button></div>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
         <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="BOOKINGS" label="Reservas" icon={ShoppingBag} activeTab={activeTab} onClick={handleTabChange} hasNotification={bookings.some(b => b.status === 'PENDING')} />
         <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      <div className="animate-[fadeIn_0.3s]">
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-green-50 text-green-600"><DollarSign size={24}/></div><span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span></div><p className="text-sm text-gray-500 font-medium">Receita Total</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Vendas Realizadas</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalSales}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Eye size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Visualizações</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalViews}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Star size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Avaliação Média</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.averageRating.toFixed(1)} <span className="text-sm font-normal text-gray-400">({stats.totalReviews})</span></h3></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 mb-6 text-lg">Ações Rápidas</h3><div className="grid grid-cols-2 gap-4"><button onClick={() => { handleTabChange('TRIPS'); setIsEditingTrip(true); }} className="flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all group"><Plus size={24} className="text-gray-400 group-hover:text-primary-600 mb-2"/><span className="font-bold text-gray-700 group-hover:text-primary-700">Novo Pacote</span></button><button onClick={() => handleTabChange('BOOKINGS')} className="flex flex-col items-center justify-center p-6 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all group"><ListOrdered size={24} className="text-gray-400 group-hover:text-primary-600 mb-2"/><span className="font-bold text-gray-700 group-hover:text-primary-700">Gerenciar Reservas</span></button></div></div>
                    <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-8 rounded-2xl shadow-lg text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div><div className="relative z-10"><h3 className="text-2xl font-bold mb-2">Plano {currentAgency.subscriptionPlan === 'PREMIUM' ? 'Premium' : 'Básico'}</h3><p className="text-primary-200 mb-6 text-sm">Sua assinatura está ativa e válida até {new Date(currentAgency.subscriptionExpiresAt).toLocaleDateString()}.</p><div className="flex items-center gap-4"><div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm"><p className="text-xs uppercase font-bold text-primary-200">Status</p><p className="font-bold flex items-center gap-1"><CheckCircle size={14}/> Ativo</p></div><div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm"><p className="text-xs uppercase font-bold text-primary-200">Próxima Fatura</p><p className="font-bold">R$ {currentAgency.subscriptionPlan === 'PREMIUM' ? '199,90' : '99,90'}</p></div></div></div></div>
                </div>
            </div>
        )}

        {activeTab === 'TRIPS' && (
            <div className="space-y-6">
                {!isEditingTrip ? (
                    <>
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2><button onClick={() => { setTripForm({ title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [] }); setIsEditingTrip(true); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 shadow-sm"><Plus size={18}/> Novo Pacote</button></div>
                        {myTrips.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{myTrips.map(trip => (<div key={trip.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all"><div className="relative h-48 bg-gray-100"><img src={trip.images[0] || 'https://placehold.co/600x400?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover"/><div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold ${trip.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{trip.is_active ? 'Ativo' : 'Pausado'}</div></div><div className="p-5"><h3 className="font-bold text-gray-900 text-lg mb-1 truncate" title={trip.title}>{trip.title}</h3><p className="text-gray-500 text-sm mb-4 flex items-center"><MapPin size={14} className="mr-1"/> {trip.destination}</p><div className="flex justify-between items-center pt-4 border-t border-gray-100"><span className="font-bold text-primary-600">R$ {trip.price.toLocaleString()}</span><ActionsMenu trip={trip} onEdit={() => handleEditTrip(trip)} onManage={() => setManageTripId(trip.id)} onDuplicate={() => handleDuplicateTrip(trip)} onDelete={() => handleDeleteTrip(trip.id)} onToggleStatus={() => toggleTripStatus(trip.id)} fullAgencyLink={`${window.location.origin}/#/${currentAgency.slug}`}/></div></div></div>))}</div>
                        ) : ( <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Plane size={32}/></div><h3 className="font-bold text-gray-900 text-lg">Nenhum pacote criado</h3><p className="text-gray-500 mb-6">Comece a vender criando seu primeiro roteiro.</p><button onClick={() => setIsEditingTrip(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700">Criar Pacote</button></div> )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)]">
                        {/* STEPPER SIDEBAR */}
                        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                            <button onClick={() => setIsEditingTrip(false)} className="flex items-center text-gray-500 hover:text-gray-700 mb-8 font-medium transition-colors"><ArrowLeft size={18} className="mr-2"/> Voltar</button>
                            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingTripId ? 'Editar Pacote' : 'Novo Pacote'}</h2>
                            <div className="space-y-2 flex-1">
                                {['Informações Básicas', 'Detalhes & Datas', 'Locais de Embarque', 'Roteiro Dia a Dia', 'Galeria de Fotos'].map((step, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setActiveStep(idx)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center transition-all ${activeStep === idx ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 ${activeStep === idx ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'}`}>{idx + 1}</div>
                                        {step}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-6 border-t border-gray-200">
                                <button onClick={handleTripSubmit} disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30 disabled:opacity-50 transition-all active:scale-95">
                                    {loading ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} 
                                    {editingTripId ? 'Atualizar' : 'Publicar'}
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            {renderTripBuilder()}
                            
                            {/* Navigation Buttons inside content */}
                            <div className="flex justify-between mt-8 pt-8 border-t border-gray-100">
                                <button 
                                    onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                                    disabled={activeStep === 0}
                                    className="px-6 py-2 rounded-lg text-gray-500 font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                {activeStep < 4 ? (
                                    <button 
                                        onClick={() => setActiveStep(prev => Math.min(4, prev + 1))}
                                        className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black flex items-center gap-2"
                                    >
                                        Próximo <ArrowRight size={16}/>
                                    </button>
                                ) : (
                                    <span className="text-xs text-gray-400 font-medium flex items-center">
                                        <CheckCircle size={14} className="mr-1 text-green-500"/> Tudo pronto para publicar!
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'BOOKINGS' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Gerenciar Reservas</h2><div className="text-sm text-gray-500">Total: {myBookings.length}</div></div>
                {myBookings.length > 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50"><tr><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Reserva</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Pacote</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Cliente</th><th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Status</th><th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">Total</th></tr></thead>
                            <tbody className="divide-y divide-gray-100">{myBookings.map(booking => { const trip = booking._trip; return ( <tr key={booking.id} className="hover:bg-gray-50 transition-colors"> <td className="px-6 py-4"><div className="font-mono text-sm font-bold text-gray-700">{booking.voucherCode}</div><div className="text-xs text-gray-400">{new Date(booking.date).toLocaleDateString()}</div></td> <td className="px-6 py-4 text-sm text-gray-700">{trip?.title || 'Pacote Removido'}</td> <td className="px-6 py-4 text-sm text-gray-700">Cliente {booking.clientId.substring(0,6)}...</td> <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{booking.status === 'CONFIRMED' ? 'Confirmado' : booking.status === 'PENDING' ? 'Pendente' : 'Cancelado'}</span></td> <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td> </tr> ); })}</tbody>
                        </table>
                    </div>
                ) : ( <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-500">Nenhuma reserva encontrada.</p></div> )}
            </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'REVIEWS' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Avaliações Recebidas</h2><div className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-3 py-1 rounded-full"><Star size={16} fill="currentColor"/> {stats.averageRating.toFixed(1)}</div></div>
                <div className="grid gap-4">{myReviews.length > 0 ? myReviews.map(review => ( <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{review.clientName ? review.clientName.charAt(0) : 'C'}</div><div><p className="font-bold text-gray-900">{review.clientName || 'Cliente'}</p><div className="flex text-amber-400 text-xs">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-200'}/>)}</div></div></div><span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span></div><p className="text-gray-600 text-sm italic bg-gray-50 p-3 rounded-xl mb-4">"{review.comment}"</p>{review.response ? (<div className="ml-8 border-l-2 border-primary-200 pl-4"><p className="text-xs font-bold text-primary-600 mb-1">Sua resposta:</p><p className="text-sm text-gray-700">{review.response}</p></div>) : (<div className="flex gap-2"><button onClick={() => { const response = prompt('Digite sua resposta:'); if (response) updateAgencyReview(review.id, { response }); }} className="text-xs font-bold text-primary-600 hover:underline flex items-center"><MessageSquare size={14} className="mr-1"/> Responder</button></div>)}</div> )) : ( <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-500">Nenhuma avaliação ainda.</p></div> )}</div>
            </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Agency Profile Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Dados da Agência</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative group">
                                <img src={profileForm.logo || `https://ui-avatars.com/api/?name=${profileForm.name}`} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
                                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md">
                                    <Upload size={14} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia</label><input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" /></div>
                        </div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Descrição (Bio)</label><textarea value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">Website</label><input value={profileForm.website} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" /></div>
                        </div>
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Personalização do Microsite</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Modo da Capa (Hero)</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${heroForm.heroMode === 'TRIPS' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}><input type="radio" className="hidden" name="heroMode" checked={heroForm.heroMode === 'TRIPS'} onChange={() => setHeroForm({...heroForm, heroMode: 'TRIPS'})}/><div className="flex items-center gap-2 font-bold text-gray-900"><MonitorPlay size={18}/> Carrossel de Pacotes</div><p className="text-xs text-gray-500 mt-1">Exibe seus pacotes em destaque automaticamente.</p></label>
                                        <label className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${heroForm.heroMode === 'STATIC' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-200'}`}><input type="radio" className="hidden" name="heroMode" checked={heroForm.heroMode === 'STATIC'} onChange={() => setHeroForm({...heroForm, heroMode: 'STATIC'})}/><div className="flex items-center gap-2 font-bold text-gray-900"><ImageIcon size={18}/> Imagem Estática</div><p className="text-xs text-gray-500 mt-1">Uma imagem fixa com título personalizado.</p></label>
                                    </div>
                                </div>
                                {heroForm.heroMode === 'STATIC' && (
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-[fadeIn_0.2s]">
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título da Capa</label><input value={heroForm.heroTitle} onChange={e => setHeroForm({...heroForm, heroTitle: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Ex: Viaje com a gente"/></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subtítulo</label><input value={heroForm.heroSubtitle} onChange={e => setHeroForm({...heroForm, heroSubtitle: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Ex: As melhores experiências..."/></div>
                                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL da Imagem de Fundo</label><input value={heroForm.heroBannerUrl} onChange={e => setHeroForm({...heroForm, heroBannerUrl: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://..."/></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4"><button type="submit" disabled={loading} className="bg-gray-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-black flex items-center gap-2 disabled:opacity-50">{loading ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Alterações</button></div>
                    </form>
                </div>

                {/* 2. Theme Customizer */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                        <div className="flex items-center gap-2 mb-6"><Palette className="text-primary-600" size={20}/><h2 className="text-lg font-bold text-gray-900">Cores da Marca</h2></div>
                        <form onSubmit={handleSaveTheme} className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor Primária</label><div className="flex gap-2 items-center"><input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer p-1" /><input value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="flex-1 border border-gray-300 rounded-lg p-2 text-sm font-mono uppercase" maxLength={7} /></div></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor Secundária</label><div className="flex gap-2 items-center"><input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer p-1" /><input value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="flex-1 border border-gray-300 rounded-lg p-2 text-sm font-mono uppercase" maxLength={7} /></div></div>
                            <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Prévia do Botão</p>
                                <button type="button" style={{ backgroundColor: themeForm.primary, color: '#fff' }} className="w-full py-2.5 rounded-lg font-bold shadow-md transition-transform hover:scale-[1.02]">Botão Exemplo</button>
                                <div className="mt-3 flex justify-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeForm.secondary }}></div>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeForm.secondary, opacity: 0.5 }}></div>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeForm.secondary, opacity: 0.2 }}></div>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 mt-4 disabled:opacity-50">Salvar Tema</button>
                        </form>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Operational Modal */}
      {manageTripId && (
          <TripManagementModal 
              trip={myTrips.find(t => t.id === manageTripId)!} 
              bookings={myBookings.filter(b => b.tripId === manageTripId)}
              clients={clients}
              onClose={() => setManageTripId(null)} 
          />
      )}
    </div>
  );
};

export default AgencyDashboard;