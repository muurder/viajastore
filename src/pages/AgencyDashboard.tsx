import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  Trip, Agency, Plan, OperationalData, PassengerSeat, RoomConfig, ManualPassenger, Booking, ThemeColors, VehicleType, VehicleLayoutConfig, DashboardStats, TransportConfig, VehicleInstance, HotelInstance
} from '../types'; 
import { PLANS } from '../services/mockData';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { 
  Plus, Edit, Save, ArrowLeft, X, Loader, Copy, Eye, ExternalLink, Star, BarChart2, DollarSign, Users, Calendar, Plane, CreditCard, MapPin, ShoppingBag, MoreHorizontal, PauseCircle, PlayCircle, Settings, BedDouble, Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, AlertTriangle, PenTool, LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, ImageIcon, FileText, Download, Rocket,
  LogOut, Globe, Trash2, CheckCircle, ChevronDown, MessageCircle, Info, Palette, Search, LucideProps, Zap, Camera, Upload, FileDown, Building, Armchair, MousePointer2, RefreshCw, Archive, ArchiveRestore, Trash, Ban, Send, ArrowRight, CornerDownRight, Menu, ChevronLeft, Phone, Briefcase, Edit3
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import CreateTripWizard from '../components/agency/CreateTripWizard';
import BusVisualizer from '../components/agency/BusVisualizer';
import { slugify } from '../utils/slugify';

// --- HELPER CONSTANTS & COMPONENTS ---

const VEHICLE_TYPES: Record<VehicleType, VehicleLayoutConfig> = {
    'CAR_4': { type: 'CAR_4', label: 'Carro de Passeio (4L)', totalSeats: 4, cols: 2, aisleAfterCol: 1 },
    'VAN_15': { type: 'VAN_15', label: 'Van Executiva (15L)', totalSeats: 15, cols: 3, aisleAfterCol: 1 }, 
    'VAN_20': { type: 'VAN_20', label: 'Van Alongada (20L)', totalSeats: 20, cols: 3, aisleAfterCol: 1 },
    'MICRO_26': { type: 'MICRO_26', label: 'Micro-ônibus (26L)', totalSeats: 26, cols: 4, aisleAfterCol: 2 }, 
    'BUS_46': { type: 'BUS_46', label: 'Ônibus Executivo (46L)', totalSeats: 46, cols: 4, aisleAfterCol: 2 },
    'BUS_50': { type: 'BUS_50', label: 'Ônibus Leito Turismo (50L)', totalSeats: 50, cols: 4, aisleAfterCol: 2 },
    'DD_60': { type: 'DD_60', label: 'Double Decker (60L)', totalSeats: 60, cols: 4, aisleAfterCol: 2, lowerDeckSeats: 12 }, 
    'CUSTOM': { type: 'CUSTOM', label: 'Personalizado', totalSeats: 0, cols: 2, aisleAfterCol: 1 }
};

const DEFAULT_OPERATIONAL_DATA: OperationalData = {
    transport: undefined, 
    rooming: [],
    manualPassengers: []
};

const safeDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Data n/a';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Data Inválida';
        return d.toLocaleDateString();
    } catch (e) {
        return 'Data Erro';
    }
};

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

interface StatCardProps { 
    title: string; 
    value: string | number; 
    subtitle: string; 
    icon: React.ComponentType<LucideProps>; 
    color: 'green' | 'blue' | 'purple' | 'amber';
    onClick?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color, onClick }) => {
    const bgColors = {
        green: 'bg-green-50 text-green-600',
        blue: 'bg-blue-50 text-blue-600',
        purple: 'bg-purple-50 text-purple-600',
        amber: 'bg-amber-50 text-amber-600',
    };
    return (
        <div 
            onClick={onClick} 
            className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group 
                ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-primary-100 hover:scale-[1.02] transition-all' : ''}
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${bgColors[color]} group-hover:scale-105 transition-transform`}><Icon size={24}/></div>
            </div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{value}</h3>
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
        </div>
    );
};

interface ActionMenuProps { actions: { label: string; onClick: () => void; icon: React.ComponentType<LucideProps>; variant?: 'danger' | 'default' }[] }
const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
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
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors group"
            >
                <MoreHorizontal size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right ring-2 ring-primary-100">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-3 text-white">
                            <p className="text-xs font-bold uppercase tracking-wide">Ações do Pacote</p>
                        </div>
                        <div className="py-2">
                            {actions.map((action, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        action.onClick(); 
                                        setIsOpen(false); 
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-3 transition-all hover:scale-[1.02] ${
                                        action.variant === 'danger' 
                                            ? 'text-red-600 hover:bg-red-50 border-l-4 border-red-500' 
                                            : 'text-gray-700 hover:bg-primary-50 border-l-4 border-transparent hover:border-primary-500'
                                    }`}
                                >
                                    <action.icon size={18} className={action.variant === 'danger' ? 'text-red-500' : 'text-primary-600'} /> 
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const ConfirmationModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: () => void; 
    title: string; 
    message: string; 
    confirmText?: string; 
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' 
}> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar',
    variant = 'danger' 
}) => {
    if (!isOpen) return null;
    
    const iconConfig = {
        danger: { icon: AlertTriangle, bg: 'bg-red-50', iconColor: 'text-red-600', border: 'border-red-200' },
        warning: { icon: AlertTriangle, bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-200' },
        info: { icon: Info, bg: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-blue-200' }
    };
    
    const buttonConfig = {
        danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
        warning: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
        info: 'bg-primary-600 hover:bg-primary-700 active:bg-primary-800'
    };
    
    const config = iconConfig[variant];
    const Icon = config.icon;
    
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" 
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-[scaleIn_0.2s] transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header com gradiente */}
                <div className={`${config.bg} ${config.border} border-b p-6`}>
                    <div className={`w-16 h-16 ${config.bg} rounded-full flex items-center justify-center mx-auto border-2 ${config.border}`}>
                        <Icon size={28} className={config.iconColor}/>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 shadow-sm"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }} 
                            className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-all duration-200 shadow-lg ${buttonConfig[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavButton: React.FC<{ tabId: string; label: string; icon: React.ComponentType<LucideProps>; activeTab: string; onClick: (tabId: string) => void; hasNotification?: boolean; }> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
  <button onClick={() => onClick(tabId)} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors relative ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
    <Icon size={16} /> {label} {hasNotification && ( <span className="absolute top-2 right-2 flex h-2.5 w-2.5"> <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span> <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span> </span> )} 
  </button>
);

const SubscriptionConfirmationModal: React.FC<{ 
  plan: Plan; 
  onClose: () => void; 
  onConfirm: () => void; 
  isSubmitting: boolean 
}> = ({ plan, onClose, onConfirm, isSubmitting }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
        <div className="text-center mb-6">
            <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                <Rocket size={32}/>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mudar para {plan.name}?</h2>
            <p className="text-gray-500">Você terá acesso a todos os recursos deste plano imediatamente após a confirmação.</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-600">Novo Valor Mensal</span>
                <span className="text-xl font-extrabold text-gray-900">R$ {plan.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
            <p className="text-xs text-gray-400 text-center">Cobrança recorrente no cartão cadastrado.</p>
        </div>

        <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
            <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader size={18} className="animate-spin"/> : 'Confirmar Mudança'}
            </button>
        </div>
      </div>
    </div>
  );
};

const ManualPassengerForm: React.FC<{ onAdd: (p: ManualPassenger) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
    const [name, setName] = useState('');
    const [doc, setDoc] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        onAdd({ id: `manual-${Date.now()}`, name, document: doc });
        onClose();
    };
    return (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4 animate-[fadeIn_0.2s]">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Novo Passageiro Manual</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome Completo" className="w-full text-sm border p-2 rounded focus:ring-1 focus:ring-primary-500 outline-none" autoFocus />
                <input value={doc} onChange={e => setDoc(e.target.value)} placeholder="RG/CPF (Opcional)" className="w-full text-sm border p-2 rounded focus:ring-1 focus:ring-primary-500 outline-none" />
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 text-xs bg-white border border-gray-300 text-gray-700 p-2 rounded hover:bg-gray-50 font-medium">Cancelar</button>
                    <button type="submit" className="flex-1 text-xs bg-primary-600 text-white p-2 rounded hover:bg-primary-700 font-bold shadow-sm">Adicionar</button>
                </div>
            </form>
        </div>
    );
};

// --- REFACTORED BOOKING TABLE (SORTED) ---
interface RecentBookingsTableProps {
    bookings: Booking[];
    clients: any[];
}

interface BookingDetailsViewProps {
    bookings: Booking[];
    clients: any[];
}

const BookingDetailsView: React.FC<BookingDetailsViewProps> = ({ bookings, clients }) => {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [bookingPassengers, setBookingPassengers] = useState<any[]>([]);
    const { showToast } = useToast();

    const sortedBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bookings]);

    const isNewBooking = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); 
        return diffHours <= 24;
    };

    // Fetch passengers when booking is selected
    useEffect(() => {
        const fetchPassengers = async () => {
            if (!selectedBooking) {
                setBookingPassengers([]);
                return;
            }
            
            try {
                const { supabase } = await import('../services/supabase');
                if (supabase) {
                    const { data, error } = await supabase
                        .from('booking_passengers')
                        .select('*')
                        .eq('booking_id', selectedBooking.id)
                        .order('passenger_index', { ascending: true });
                    
                    if (!error && data) {
                        setBookingPassengers(data);
                    }
                }
            } catch (err) {
                console.error('Error fetching passengers:', err);
            }
        };

        fetchPassengers();
    }, [selectedBooking]);

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone) {
            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        } else {
            showToast('Número de WhatsApp não disponível', 'warning');
        }
    };

    return (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Reservas ({bookings.length})</h2>
            {sortedBookings.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"># Reserva</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Passageiros</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Total</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {sortedBookings.map(booking => {
                                const client = clients.find(c => c.id === booking.clientId);
                                const isNew = isNewBooking(booking.date);
                                return (
                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-700 font-bold">{booking.voucherCode}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{booking._trip?.title || 'N/A'}</span>
                                                <span className="text-xs text-gray-500">{booking._trip?.destination || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {client?.avatar ? (
                                                    <img src={client.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                        {client?.name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{client?.name || 'Cliente Desconhecido'}</span>
                                                    {client?.phone && (
                                                        <span className="text-xs text-gray-500">{client.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users size={16} className="text-primary-600"/>
                                                <span className="text-sm font-bold text-gray-900">{booking.passengers}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                {new Date(booking.date).toLocaleDateString('pt-BR')}
                                                {isNew && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">NOVO</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4">
                                            <Badge color={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>{booking.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedBooking(booking)}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 mx-auto"
                                            >
                                                <Eye size={14}/> Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-400">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50"/>
                    <p className="text-lg">Nenhuma reserva ainda</p>
                </div>
            )}
        </div>

        {/* Premium Booking Details Modal */}
        {selectedBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Detalhes Completos da Reserva</h2>
                                <p className="text-primary-100 text-sm">#{selectedBooking.voucherCode}</p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={24}/>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Booking Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pacote</p>
                                <p className="text-lg font-bold text-gray-900 mb-1">{selectedBooking._trip?.title || 'N/A'}</p>
                                <p className="text-sm text-gray-600">{selectedBooking._trip?.destination || ''}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Valor Total</p>
                                <p className="text-2xl font-bold text-green-600">R$ {selectedBooking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                <p className="text-xs text-gray-500 mt-1">R$ {(selectedBooking.totalPrice / selectedBooking.passengers).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por passageiro</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Passageiros</p>
                                <p className="text-2xl font-bold text-purple-600">{selectedBooking.passengers}</p>
                                <p className="text-xs text-gray-500 mt-1">{selectedBooking.passengers === 1 ? 'passageiro' : 'passageiros'}</p>
                            </div>
                        </div>

                        {/* Client Info */}
                        {(() => {
                            const clientData = (selectedBooking as any)._client || clients.find(c => c.id === selectedBooking.clientId);
                            return clientData ? (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <User size={20} className="text-primary-600"/> Dados do Comprador
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</p>
                                            <p className="text-base font-bold text-gray-900">{clientData.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                                            <p className="text-base text-gray-700">{clientData.email || 'N/A'}</p>
                                        </div>
                                        {clientData.phone && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Telefone</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-base text-gray-700">{clientData.phone}</p>
                                                    <button
                                                        onClick={() => openWhatsApp(clientData.phone)}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <MessageCircle size={14}/> WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {clientData.cpf && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">CPF</p>
                                                <p className="text-base text-gray-700">{clientData.cpf}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Passengers List */}
                        {bookingPassengers.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-primary-600"/> Passageiros ({bookingPassengers.length})
                                </h3>
                                <div className="space-y-3">
                                    {bookingPassengers.map((passenger, index) => (
                                        <div key={passenger.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{passenger.full_name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {index === 0 ? 'Passageiro Principal' : `Acompanhante ${index}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {passenger.whatsapp && (
                                                    <button
                                                        onClick={() => openWhatsApp(passenger.whatsapp)}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <MessageCircle size={14}/> WhatsApp
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                {passenger.cpf && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">CPF</p>
                                                        <p className="font-medium text-gray-900">{passenger.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                                                    </div>
                                                )}
                                                {passenger.birth_date && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Data de Nascimento</p>
                                                        <p className="font-medium text-gray-900">{new Date(passenger.birth_date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                )}
                                                {passenger.whatsapp && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">WhatsApp</p>
                                                        <p className="font-medium text-gray-900">{passenger.whatsapp}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings, clients }) => {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [bookingPassengers, setBookingPassengers] = useState<any[]>([]);
    const { showToast } = useToast();

    const recentBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [bookings]);

    const isNew = (date: string) => {
        return (new Date().getTime() - new Date(date).getTime()) < 24 * 60 * 60 * 1000;
    };

    // Fetch passengers when booking is selected
    useEffect(() => {
        const fetchPassengers = async () => {
            if (!selectedBooking) {
                setBookingPassengers([]);
                return;
            }
            
            try {
                const { supabase } = await import('../services/supabase');
                if (supabase) {
                    const { data, error } = await supabase
                        .from('booking_passengers')
                        .select('*')
                        .eq('booking_id', selectedBooking.id)
                        .order('passenger_index', { ascending: true });
                    
                    if (!error && data) {
                        setBookingPassengers(data);
                    }
                }
            } catch (err) {
                console.error('Error fetching passengers:', err);
            }
        };

        fetchPassengers();
    }, [selectedBooking]);

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone) {
            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        } else {
            showToast('Número de WhatsApp não disponível', 'warning');
        }
    };

    return (
        <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><ShoppingBag size={20} className="mr-2 text-primary-600"/> Últimas Vendas</h3>
            {recentBookings.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Cliente</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Valor</th>
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentBookings.map(booking => {
                                const clientData = (booking as any)._client || clients.find(c => c.id === booking.clientId);
                                return (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {clientData?.avatar ? (
                                                    <img src={clientData.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                        {clientData?.name?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900 truncate max-w-[120px]">{clientData?.name || 'Cliente'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 truncate max-w-[150px]">{booking._trip?.title || 'N/A'}</td>
                                        <td className="px-4 py-3 text-gray-500 flex items-center gap-2">
                                            {new Date(booking.date).toLocaleDateString()}
                                            {isNew(booking.date) && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">NOVO</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <Badge color={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>
                                                {booking.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedBooking(booking)}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors flex items-center gap-1 mx-auto"
                                            >
                                                <Eye size={14}/> Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                    <ShoppingBag size={32} className="mx-auto mb-3"/>
                    <p>Nenhuma venda recente ainda. Sua primeira venda está chegando!</p>
                </div>
            )}
        </div>

        {/* Premium Booking Details Modal */}
        {selectedBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Detalhes da Reserva</h2>
                                <p className="text-primary-100 text-sm">#{selectedBooking.voucherCode}</p>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X size={24}/>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Booking Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Pacote</p>
                                <p className="text-lg font-bold text-gray-900">{selectedBooking._trip?.title || 'N/A'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Valor Total</p>
                                <p className="text-lg font-bold text-primary-600">R$ {selectedBooking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Passageiros</p>
                                <p className="text-lg font-bold text-gray-900">{selectedBooking.passengers} {selectedBooking.passengers === 1 ? 'passageiro' : 'passageiros'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Data da Reserva</p>
                                <p className="text-lg font-bold text-gray-900">{new Date(selectedBooking.date).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* Client Info */}
                        {(() => {
                            const clientData = (selectedBooking as any)._client || clients.find(c => c.id === selectedBooking.clientId);
                            return clientData ? (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <User size={20} className="text-primary-600"/> Dados do Comprador
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</p>
                                            <p className="text-base font-bold text-gray-900">{clientData.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                                            <p className="text-base text-gray-700">{clientData.email || 'N/A'}</p>
                                        </div>
                                        {clientData.phone && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Telefone</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-base text-gray-700">{clientData.phone}</p>
                                                    <button
                                                        onClick={() => openWhatsApp(clientData.phone)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <MessageCircle size={14}/> WhatsApp
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {clientData.cpf && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">CPF</p>
                                                <p className="text-base text-gray-700">{clientData.cpf}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        {/* Passengers List */}
                        {bookingPassengers.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-primary-600"/> Passageiros ({bookingPassengers.length})
                                </h3>
                                <div className="space-y-3">
                                    {bookingPassengers.map((passenger, index) => (
                                        <div key={passenger.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{passenger.full_name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {index === 0 ? 'Passageiro Principal' : `Acompanhante ${index}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {passenger.whatsapp && (
                                                    <button
                                                        onClick={() => openWhatsApp(passenger.whatsapp)}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    >
                                                        <MessageCircle size={14}/> WhatsApp
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                {passenger.cpf && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">CPF</p>
                                                        <p className="font-medium text-gray-900">{passenger.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                                                    </div>
                                                )}
                                                {passenger.birth_date && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Data de Nascimento</p>
                                                        <p className="font-medium text-gray-900">{new Date(passenger.birth_date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                )}
                                                {passenger.whatsapp && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">WhatsApp</p>
                                                        <p className="font-medium text-gray-900">{passenger.whatsapp}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

// --- SUB-COMPONENTS FOR OPERATIONS ---

interface TransportManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void; 
}

const TransportManager: React.FC<TransportManagerProps> = ({ trip, bookings, clients, onSave }) => {
    // Legacy support: Check for old structure
    const legacyTransport = trip.operationalData?.transport;
    
    // New State for Multiple Vehicles
    const [vehicles, setVehicles] = useState<VehicleInstance[]>([]);
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
    const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false); // For click menu
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null); // To know if we are creating or updating
    
    // UI States
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    // Passenger Edit Modal
    const [passengerEditId, setPassengerEditId] = useState<string | null>(null);
    const [passengerEditForm, setPassengerEditForm] = useState({ name: '', document: '', phone: '', birthDate: '', rg: '', rgOrg: '' });
    const [passengerToDelete, setPassengerToDelete] = useState<string | null>(null);

    // Config Mode
    const [showCustomVehicleForm, setShowCustomVehicleForm] = useState(false);
    const [customVehicleData, setCustomVehicleData] = useState({ label: '', totalSeats: 4, cols: 2 });
    const [filterText, setFilterText] = useState('');

    const { showToast } = useToast();

    // Data Migration & Initialization Effect - Só inicializa uma vez
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        // Só inicializar uma vez quando o componente monta
        if (isInitialized || vehicles.length > 0) return;
        
        if (legacyTransport?.vehicles && legacyTransport.vehicles.length > 0) {
            // New structure exists
            const currentVehicles = legacyTransport.vehicles;
            setVehicles(currentVehicles);
            if (!activeVehicleId) {
                setActiveVehicleId(currentVehicles[0].id);
            }
            setIsInitialized(true);
        } else if (legacyTransport?.vehicleConfig) {
            // Migrate legacy single vehicle to array
            const migratedVehicle: VehicleInstance = {
                id: 'v-legacy',
                name: 'Veículo Principal',
                type: legacyTransport.vehicleConfig.type,
                config: legacyTransport.vehicleConfig,
                seats: legacyTransport.seats || []
            };
            setVehicles([migratedVehicle]);
            if (!activeVehicleId) {
                setActiveVehicleId(migratedVehicle.id);
            }
            setIsInitialized(true);
        }
    }, [trip.operationalData?.transport]); // Só roda quando transport muda pela primeira vez

    // Derived State: Active Vehicle
    const activeVehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);

    // Fetch passenger data from database
    const [dbPassengers, setDbPassengers] = useState<Map<string, any>>(new Map());
    
    useEffect(() => {
        const fetchPassengers = async () => {
            try {
                const { supabase } = await import('../services/supabase');
                if (supabase && bookings.length > 0) {
                    const bookingIds = bookings.filter(b => b.status === 'CONFIRMED').map(b => b.id);
                    if (bookingIds.length > 0) {
                        const { data, error } = await supabase
                            .from('booking_passengers')
                            .select('*')
                            .in('booking_id', bookingIds)
                            .order('booking_id', { ascending: true })
                            .order('passenger_index', { ascending: true });
                        
                        if (!error && data) {
                            const map = new Map<string, any>();
                            data.forEach(p => {
                                const key = `${p.booking_id}-${p.passenger_index}`;
                                map.set(key, p);
                            });
                            setDbPassengers(map);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching passengers:', err);
            }
        };
        fetchPassengers();
    }, [bookings]);

    // Derived Passengers List
    const opData = trip.operationalData as any;
    const nameOverrides = opData?.passengerNameOverrides || {};
    const passengerDetails = opData?.passengerDetails || {}; // New: Details map { [id]: { name, document, phone } }

    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                // Try database first, then operational data, then fallback
                const dbPassenger = dbPassengers.get(`${b.id}-${i}`);
                const dbName = dbPassenger?.full_name;
                const detailName = passengerDetails[id]?.name || nameOverrides[id];
                
                // For main passenger (i === 0), use client name as fallback
                // For companions (i > 0), only use database or details - don't use "Acompanhante X" as name
                let finalName: string;
                if (i === 0) {
                    // Main passenger: database > details > override > client name > "Passageiro"
                    finalName = dbName || detailName || nameOverrides[id] || clientName || 'Passageiro';
                } else {
                    // Companion: database > details > override > empty (will show "Acompanhante" label below)
                    finalName = dbName || detailName || nameOverrides[id] || '';
                }
                
                return { 
                    id, 
                    bookingId: b.id, 
                    name: finalName,
                    isMain: i === 0,
                    isAccompaniment: i > 0,
                    isManual: false,
                    passengerIndex: i,
                    // Pass extra details for display - prioritize database
                    details: dbPassenger ? {
                        name: dbPassenger.full_name,
                        document: dbPassenger.cpf,
                        phone: dbPassenger.whatsapp,
                        birthDate: dbPassenger.birth_date
                    } : passengerDetails[id]
                };
            });
        });
        const manual = manualPassengers.map(p => ({
            id: p.id, 
            bookingId: p.id, 
            name: passengerDetails[p.id]?.name || nameOverrides[p.id] || p.name, 
            isManual: true,
            isMain: false,
            isAccompaniment: false,
            details: passengerDetails[p.id]
        }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides, passengerDetails, dbPassengers]);

    // Global Assignment Map (Passenger ID -> Vehicle Name + Seat)
    const globalAssignmentMap = useMemo(() => {
        const map = new Map<string, string>();
        vehicles.forEach(v => {
            v.seats.forEach(s => map.set(s.bookingId, `${v.name} - ${s.seatNumber}`));
        });
        return map;
    }, [vehicles]);

    const filteredPassengers = useMemo(() => {
        if (!filterText) return allPassengers;
        return allPassengers.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
    }, [allPassengers, filterText]);

    const isSeatOccupied = (seatNum: string) => activeVehicle?.seats.find(s => s.seatNumber === seatNum);
    
    // --- ACTIONS ---

    const saveVehicles = (updatedVehicles: VehicleInstance[]) => {
        // Atualizar estado local primeiro
        setVehicles(updatedVehicles);
        
        // Salvar no banco
        onSave({ 
            ...trip.operationalData, 
            transport: { ...trip.operationalData?.transport, vehicles: updatedVehicles } 
        });
    };

    const handleAssign = (seatNum: string, passenger: { id: string, name: string, bookingId: string }) => {
        if (!activeVehicle) return;
        if (isSeatOccupied(seatNum)) {
            showToast(`Assento ${seatNum} já ocupado.`, 'warning');
            return;
        }
        
        // Remove from ANY other vehicle first (prevent duplicates)
        const cleanedVehicles = vehicles.map(v => ({
            ...v,
            seats: v.seats.filter(s => s.bookingId !== passenger.id)
        }));

        const targetVehicleIndex = cleanedVehicles.findIndex(v => v.id === activeVehicle.id);
        if (targetVehicleIndex === -1) return;

        // Get passenger name from database or details first
        const passengerName = passenger.details?.name || passenger.name;
        
        const newSeat: PassengerSeat = {
            seatNumber: seatNum,
            passengerName: passengerName,
            bookingId: passenger.id,
            status: 'occupied'
        };

        cleanedVehicles[targetVehicleIndex].seats.push(newSeat);
        saveVehicles(cleanedVehicles);
        if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
    };

    const confirmRemoveSeat = () => {
        if (!seatToDelete || !activeVehicle) return;
        
        const updatedVehicles = vehicles.map(v => {
            if (v.id === activeVehicle.id) {
                return { ...v, seats: v.seats.filter(s => s.seatNumber !== seatToDelete.seatNum) };
            }
            return v;
        });

        saveVehicles(updatedVehicles);
        // Modal will close via onClose() in ConfirmationModal button
    };

    // Auto-preenchimento inteligente
    const handleAutoFill = () => {
        if (!activeVehicle) {
            showToast('Selecione um veículo primeiro', 'warning');
            return;
        }

        // Filtrar apenas passageiros não atribuídos
        const unassignedPassengers = allPassengers.filter(p => !globalAssignmentMap.has(p.id));

        if (unassignedPassengers.length === 0) {
            showToast('Todos os passageiros já estão atribuídos', 'info');
            return;
        }

        // Agrupar passageiros por bookingId (titular + acompanhantes juntos)
        const passengerGroups: Map<string, typeof unassignedPassengers> = new Map();
        
        unassignedPassengers.forEach(p => {
            const groupKey = p.bookingId;
            if (!passengerGroups.has(groupKey)) {
                passengerGroups.set(groupKey, []);
            }
            passengerGroups.get(groupKey)!.push(p);
        });

        // Ordenar grupos: grupos maiores primeiro (mais acompanhantes)
        const sortedGroups = Array.from(passengerGroups.values()).sort((a, b) => b.length - a.length);

        // Obter assentos disponíveis do veículo ativo
        const occupiedSeats = new Set(activeVehicle.seats.map(s => s.seatNumber));
        const availableSeats: number[] = [];
        for (let i = 1; i <= activeVehicle.config.totalSeats; i++) {
            if (!occupiedSeats.has(i.toString())) {
                availableSeats.push(i);
            }
        }

        if (availableSeats.length === 0) {
            showToast('Não há assentos disponíveis neste veículo', 'warning');
            return;
        }

        if (availableSeats.length < unassignedPassengers.length) {
            showToast(`Apenas ${availableSeats.length} assentos disponíveis para ${unassignedPassengers.length} passageiros`, 'warning');
        }

        // Limpar assentos atuais do veículo ativo (apenas os que serão realocados)
        const cleanedVehicles = vehicles.map(v => {
            if (v.id === activeVehicle.id) {
                // Manter apenas assentos de passageiros que não estão na lista de não atribuídos
                const keepSeats = v.seats.filter(s => {
                    const passenger = allPassengers.find(p => p.id === s.bookingId);
                    return passenger && globalAssignmentMap.has(passenger.id);
                });
                return { ...v, seats: keepSeats };
            }
            return v;
        });

        const newSeats: PassengerSeat[] = [...cleanedVehicles.find(v => v.id === activeVehicle.id)!.seats];
        const usedSeats = new Set(newSeats.map(s => parseInt(s.seatNumber)));
        let availableIndex = 0;

        // Preencher grupos tentando manter juntos
        sortedGroups.forEach(group => {
            const groupSize = group.length;
            let startIndex = availableIndex;
            let foundConsecutive = false;

            // Tentar encontrar assentos consecutivos para o grupo
            for (let i = 0; i <= availableSeats.length - groupSize; i++) {
                const consecutive = availableSeats.slice(i, i + groupSize);
                if (consecutive.length === groupSize) {
                    // Verificar se esses assentos ainda estão disponíveis
                    const stillAvailable = consecutive.every(seat => !usedSeats.has(seat));
                    if (stillAvailable) {
                        startIndex = i;
                        foundConsecutive = true;
                        break;
                    }
                }
            }

            // Atribuir assentos ao grupo
            group.forEach((passenger, idx) => {
                let seatNum: number;
                if (foundConsecutive && startIndex + idx < availableSeats.length) {
                    seatNum = availableSeats[startIndex + idx];
                } else {
                    // Encontrar próximo assento disponível
                    while (availableIndex < availableSeats.length && usedSeats.has(availableSeats[availableIndex])) {
                        availableIndex++;
                    }
                    if (availableIndex < availableSeats.length) {
                        seatNum = availableSeats[availableIndex];
                        availableIndex++;
                    } else {
                        return; // Sem mais assentos disponíveis
                    }
                }

                if (!usedSeats.has(seatNum)) {
                    newSeats.push({
                        seatNumber: seatNum.toString(),
                        passengerName: passenger.name,
                        bookingId: passenger.id,
                        status: 'occupied'
                    });
                    usedSeats.add(seatNum);
                }
            });

            // Atualizar índice para próximo grupo
            if (foundConsecutive) {
                availableIndex = startIndex + groupSize;
            }
        });

        // Atualizar veículo com novos assentos
        const finalVehicles = cleanedVehicles.map(v => {
            if (v.id === activeVehicle.id) {
                return { ...v, seats: newSeats };
            }
            return v;
        });

        saveVehicles(finalVehicles);
        const newlyAssigned = newSeats.length - cleanedVehicles.find(v => v.id === activeVehicle.id)!.seats.length;
        showToast(`${newlyAssigned} passageiros atribuídos automaticamente!`, 'success');
    };

    // Limpar todos os assentos
    const [showClearSeatsModal, setShowClearSeatsModal] = useState(false);
    
    const handleClearAllSeats = () => {
        if (!activeVehicle) {
            showToast('Selecione um veículo primeiro', 'warning');
            return;
        }
        setShowClearSeatsModal(true);
    };

    const confirmClearSeats = () => {
        if (!activeVehicle) return;
        
        const updatedVehicles = vehicles.map(v => {
            if (v.id === activeVehicle.id) {
                return { ...v, seats: [] };
            }
            return v;
        });

        saveVehicles(updatedVehicles);
        showToast('Todos os assentos foram limpos', 'success');
        // Modal will close via onClose() in ConfirmationModal button
    };

    const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
    
    const handleDeleteVehicle = (vehicleId: string) => {
        setVehicleToDelete(vehicleId);
    };

    const confirmDeleteVehicle = () => {
        if (!vehicleToDelete) return;
        
        const updatedVehicles = vehicles.filter(v => v.id !== vehicleToDelete);
        saveVehicles(updatedVehicles);
        if (activeVehicleId === vehicleToDelete) {
            setActiveVehicleId(updatedVehicles[0]?.id || null);
        }
        // Modal will close via onClose() in ConfirmationModal button
    };

    const handleEditVehicle = (vehicle: VehicleInstance) => {
        setCustomVehicleData({
            label: vehicle.name, // Use vehicle name as label here for editing
            totalSeats: vehicle.config.totalSeats,
            cols: vehicle.config.cols
        });
        setEditingVehicleId(vehicle.id);
        setShowCustomVehicleForm(true);
    };

    // Handlers for New Vehicle
    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') { 
            setEditingVehicleId(null);
            setCustomVehicleData({ label: '', totalSeats: 4, cols: 2 });
            setShowCustomVehicleForm(true); 
            setIsVehicleMenuOpen(false);
            return; 
        }
        
        const config = VEHICLE_TYPES[type];
        if (!config) {
            showToast('Tipo de veículo inválido', 'error');
            return;
        }
        
        const vehicleNumber = vehicles.length + 1;
        const vehicleName = config.label.split('(')[0].trim();
        const newVehicle: VehicleInstance = {
            id: `v-${Date.now()}`,
            name: `${vehicleName} ${vehicleNumber}`,
            type,
            config,
            seats: []
        };
        
        const updatedVehicles = [...vehicles, newVehicle];
        
        // Save vehicles (updates local state AND saves to database)
        saveVehicles(updatedVehicles);
        setActiveVehicleId(newVehicle.id);
        
        // Marcar como inicializado para evitar que o useEffect sobrescreva
        setIsInitialized(true);
        
        // Feedback ao usuário
        showToast(`Veículo "${newVehicle.name}" criado com sucesso!`, 'success');
        
        // Fechar menu
        setIsVehicleMenuOpen(false);
        
        // Feedback ao usuário
        showToast(`Veículo "${newVehicle.name}" criado com sucesso!`, 'success');
        
        setIsVehicleMenuOpen(false);
    };

    const handleSaveCustomVehicle = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Base config object
        const config: VehicleLayoutConfig = { 
            type: 'CUSTOM', 
            label: 'Personalizado', 
            totalSeats: customVehicleData.totalSeats, 
            cols: customVehicleData.cols, 
            aisleAfterCol: Math.floor(customVehicleData.cols / 2) 
        };

        let updatedVehicles: VehicleInstance[];

        if (editingVehicleId) {
            // Updating existing vehicle - use map to update the specific vehicle
            updatedVehicles = vehicles.map(v => {
                if (v.id === editingVehicleId) {
                    return {
                        ...v,
                        name: customVehicleData.label || v.name, // Update name
                        config: config // Update config (seats count etc)
                    };
                }
                return v;
            });
        } else {
            // Creating new vehicle
            const newVehicle: VehicleInstance = {
                id: `v-${Date.now()}`,
                name: customVehicleData.label || `Veículo ${vehicles.length + 1}`,
                type: 'CUSTOM',
                config,
                seats: []
            };
            updatedVehicles = [...vehicles, newVehicle];
            
            // Set the new vehicle as active
            setActiveVehicleId(newVehicle.id);
        }

        // Save vehicles (updates local state AND saves to database)
        saveVehicles(updatedVehicles);
        
        // Feedback ao usuário
        if (!editingVehicleId) {
            showToast(`Veículo "${customVehicleData.label || `Veículo ${vehicles.length + 1}`}" criado com sucesso!`, 'success');
        } else {
            showToast('Veículo atualizado com sucesso!', 'success');
        }
        
        // Reset form and close modal
        setShowCustomVehicleForm(false);
        setEditingVehicleId(null);
        setCustomVehicleData({ label: '', totalSeats: 4, cols: 2 });
    };
    
    // Drag & Drop Handlers
    const handleDragStart = (e: React.DragEvent, passenger: any) => {
        e.dataTransfer.setData('application/json', JSON.stringify(passenger));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, seatNum: string) => {
        e.preventDefault();
        setDragOverSeat(null);
        try {
            const data = e.dataTransfer.getData('application/json');
            const passenger = JSON.parse(data);
            if (passenger?.id) handleAssign(seatNum, passenger);
        } catch (err) {}
    };

    const handleSeatClick = (seatNum: string) => {
        const occupant = isSeatOccupied(seatNum);
        if (occupant) setSeatToDelete({ seatNum, name: occupant.passengerName });
        else if (selectedPassenger) handleAssign(seatNum, selectedPassenger);
    };
    
    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    // Passenger Editing Logic
    const handleOpenPassengerEdit = (p: any) => {
        setPassengerEditId(p.id);
        // Prioritize database data, then operational data, then passenger name
        // Extract bookingId and passengerIndex from the passenger object
        const bookingId = p.bookingId;
        const passengerIndex = p.passengerIndex !== undefined ? p.passengerIndex : (p.id.includes('-') ? parseInt(p.id.split('-')[1]) : 0);
        
        const dbPassenger = dbPassengers.get(`${bookingId}-${passengerIndex}`);
        const details = p.details || passengerDetails?.[p.id]; // Access safely
        
        // Get name - prioritize database, then details, then name (but avoid "Acompanhante X" as name)
        let passengerName = dbPassenger?.full_name || details?.name || p.name || '';
        // If name is still "Acompanhante X (...)", try to extract from details or leave empty
        if (passengerName.match(/^Acompanhante \d+ \(/)) {
            passengerName = details?.name || '';
        }
        
        setPassengerEditForm({
            name: passengerName,
            document: dbPassenger?.cpf || details?.document || '',
            phone: dbPassenger?.whatsapp || details?.phone || '',
            birthDate: dbPassenger?.birth_date || details?.birthDate || '',
            rg: details?.rg || '',
            rgOrg: details?.rgOrg || ''
        });
    };

    const handleSavePassengerDetails = () => {
        if (!passengerEditId) return;
        
        // Construct new details object
        const newDetails = {
            ...passengerDetails,
            [passengerEditId]: {
                name: passengerEditForm.name,
                document: passengerEditForm.document,
                phone: passengerEditForm.phone,
                birthDate: passengerEditForm.birthDate,
                rg: passengerEditForm.rg,
                rgOrg: passengerEditForm.rgOrg
            }
        };

        // Also update name overrides for backward compatibility in list display
        const newNameOverrides = {
            ...nameOverrides,
            [passengerEditId]: passengerEditForm.name
        };

        onSave({ 
            ...trip.operationalData, 
            passengerDetails: newDetails,
            passengerNameOverrides: newNameOverrides
        });
        setPassengerEditId(null);
        showToast('Dados do passageiro salvos.', 'success');
    };

    const handleDeletePassenger = () => {
        if (!passengerToDelete) return;
        
        // Remove from manual passengers if it's a manual passenger
        if (passengerToDelete.startsWith('manual-')) {
            const updatedManual = manualPassengers.filter(p => p.id !== passengerToDelete);
            setManualPassengers(updatedManual);
            // Remove from operational data
            const newPassengerDetails = { ...passengerDetails };
            delete newPassengerDetails[passengerToDelete];
            const newNameOverrides = { ...nameOverrides };
            delete newNameOverrides[passengerToDelete];
            onSave({ 
                ...trip.operationalData, 
                passengerDetails: newPassengerDetails,
                passengerNameOverrides: newNameOverrides
            });
        } else {
            // For booked passengers, we can't delete them from the booking, but we can remove them from operational data
            const newPassengerDetails = { ...passengerDetails };
            delete newPassengerDetails[passengerToDelete];
            const newNameOverrides = { ...nameOverrides };
            delete newNameOverrides[passengerToDelete];
            onSave({ 
                ...trip.operationalData, 
                passengerDetails: newPassengerDetails,
                passengerNameOverrides: newNameOverrides
            });
        }
        
        // Remove from any assigned seats
        const updatedVehicles = vehicles.map(v => ({
            ...v,
            seats: v.seats.filter(s => s.bookingId !== passengerToDelete)
        }));
        saveVehicles(updatedVehicles);
        
        setPassengerToDelete(null);
        showToast('Passageiro removido.', 'success');
    };

    // Handlers for BusVisualizer
    const handleDragOverSeat = (e: React.DragEvent, seatNum: string) => {
        e.preventDefault();
        const occupant = isSeatOccupied(seatNum);
        if (!occupant) setDragOverSeat(seatNum);
    };

    const handleDragLeaveSeat = () => {
        setDragOverSeat(null);
    };

    // If no vehicles, show empty state selection
    if (vehicles.length === 0) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-50 animate-[fadeIn_0.3s]">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-2xl w-full text-center">
                    {!showCustomVehicleForm && !isVehicleMenuOpen ? (
                        <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600"><Settings2 size={32}/></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Adicione o Primeiro Veículo</h2>
                            <p className="text-gray-500 mb-6">Escolha o tipo de transporte para começar a organizar sua frota.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                {Object.values(VEHICLE_TYPES).map(v => (
                                    <button 
                                        key={v.type} 
                                        onClick={() => handleSelectVehicleType(v.type)} 
                                        className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all"
                                    >
                                        <Truck size={24} className="mb-3 text-gray-400"/>
                                        <span className="font-bold text-gray-700 text-sm">{v.label}</span>
                                        <span className="text-xs text-gray-400 mt-1">{v.totalSeats > 0 ? `${v.totalSeats} Lugares` : 'Definir'}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : showCustomVehicleForm ? (
                        <form onSubmit={handleSaveCustomVehicle} className="text-left max-w-sm mx-auto">
                             <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">{editingVehicleId ? 'Editar Veículo' : 'Veículo Personalizado'}</h3><button type="button" onClick={() => setShowCustomVehicleForm(false)}><X size={20}/></button></div>
                             <div className="space-y-4">
                                <div><label className="text-sm font-bold">Nome</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border p-2 rounded"/></div>
                                <div><label className="text-sm font-bold">Lugares</label><input type="number" required value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"/></div>
                                <div><label className="text-sm font-bold">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
                                <button className="w-full bg-primary-600 text-white py-2 rounded font-bold">
                                    {editingVehicleId ? 'Salvar Alterações' : 'Criar'}
                                </button>
                             </div>
                        </form>
                    ) : null}
                </div>
            </div>
        );
    }
    
    const assignedCount = globalAssignmentMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white">
            {/* Modals */}
            <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Remover ${seatToDelete?.name} do assento ${seatToDelete?.seatNum}?`} variant="warning" />
            <ConfirmationModal isOpen={showClearSeatsModal} onClose={() => setShowClearSeatsModal(false)} onConfirm={confirmClearSeats} title="Limpar Todos os Assentos" message="Tem certeza que deseja limpar todos os assentos deste veículo? Esta ação não pode ser desfeita." variant="warning" confirmText="Limpar" />
            <ConfirmationModal isOpen={!!vehicleToDelete} onClose={() => setVehicleToDelete(null)} onConfirm={confirmDeleteVehicle} title="Remover Veículo" message="Tem certeza que deseja remover este veículo? Todos os passageiros serão desvinculados." variant="danger" confirmText="Remover" />
            <ConfirmationModal isOpen={!!passengerToDelete} onClose={() => setPassengerToDelete(null)} onConfirm={handleDeletePassenger} title="Remover Passageiro" message="Tem certeza que deseja remover este passageiro da lista? Ele será desvinculado de qualquer assento atribuído." variant="danger" confirmText="Remover" />
            
            {/* Passenger Edit Modal */}
            {passengerEditId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Passageiro</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                <input value={passengerEditForm.name} onChange={e => setPassengerEditForm({...passengerEditForm, name: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                                <input value={passengerEditForm.document} onChange={e => setPassengerEditForm({...passengerEditForm, document: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" placeholder="000.000.000-00" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RG</label>
                                    <input value={passengerEditForm.rg} onChange={e => setPassengerEditForm({...passengerEditForm, rg: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" placeholder="00.000.000-0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Órgão Emissor</label>
                                    <input value={passengerEditForm.rgOrg} onChange={e => setPassengerEditForm({...passengerEditForm, rgOrg: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" placeholder="SSP" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                                <div className="flex gap-2">
                                    <input value={passengerEditForm.phone} onChange={e => setPassengerEditForm({...passengerEditForm, phone: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" placeholder="(00) 00000-0000" />
                                    {passengerEditForm.phone && (
                                        <a href={`https://wa.me/55${passengerEditForm.phone.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center" title="Abrir WhatsApp">
                                            <MessageCircle size={18}/>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Nascimento</label>
                                <input type="date" value={passengerEditForm.birthDate} onChange={e => setPassengerEditForm({...passengerEditForm, birthDate: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setPassengerEditId(null)} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-bold">Cancelar</button>
                            <button onClick={handleSavePassengerDetails} className="flex-1 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Sidebar - Passenger List */}
            <aside className="w-full lg:w-80 border-r border-gray-200 bg-white flex flex-col h-full shadow-sm z-10 flex-shrink-0">
                <div className="p-4 border-b bg-gray-50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Passageiros ({assignedCount}/{allPassengers.length})</h4>
                        <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded" title="Adicionar Manual"><Plus size={18}/></button>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                        <input 
                            type="text" 
                            placeholder="Buscar passageiro..." 
                            className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                    {filteredPassengers.map(p => {
                        const isAssigned = globalAssignmentMap.has(p.id);
                        const assignedInfo = globalAssignmentMap.get(p.id);
                        const isSelected = selectedPassenger?.id === p.id;
                        
                        // Get passenger name from database first, then details, then name
                        // When selected, use the name from selectedPassenger to ensure consistency
                        let passengerName: string;
                        if (isSelected && selectedPassenger?.name && selectedPassenger.name.trim() !== '') {
                            // Use the name from selectedPassenger when selected (only if it's not empty)
                            passengerName = selectedPassenger.name;
                        } else {
                            // Calculate name normally when not selected - prioritize database
                            const dbPassenger = dbPassengers.get(`${p.bookingId}-${p.passengerIndex}`);
                            passengerName = dbPassenger?.full_name || p.details?.name || p.name || '';
                            // If name is "Acompanhante X (...)", try to get from database or details
                            if (passengerName.match(/^Acompanhante \d+ \(/)) {
                                passengerName = dbPassenger?.full_name || p.details?.name || '';
                            }
                            // For main passenger, use client name as fallback
                            if (!passengerName && !p.isAccompaniment) {
                                const booking = bookings.find(b => b.id === p.bookingId);
                                const clientName = booking ? ((booking as any)._client?.name || clients.find(c => c.id === booking.clientId)?.name) : '';
                                passengerName = clientName || 'Passageiro';
                            }
                            // For companions, use a descriptive fallback
                            if (!passengerName && p.isAccompaniment) {
                                passengerName = 'Acompanhante';
                            }
                            // Last resort fallback
                            if (!passengerName) {
                                passengerName = p.name || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                            }
                        }
                        const displayName = passengerName || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                        const displayInitial = displayName.charAt(0).toUpperCase();

                        return (
                            <div 
                                key={p.id} 
                                draggable={!isAssigned} 
                                onDragStart={(e) => handleDragStart(e, p)} 
                                onClick={() => {
                                    if (!isAssigned) {
                                        // Get passenger name - prioritize database first
                                        const dbPassenger = dbPassengers.get(`${p.bookingId}-${p.passengerIndex}`);
                                        let passengerName = dbPassenger?.full_name || p.details?.name || p.name || '';
                                        
                                        // If name is "Acompanhante X (...)", try to get from database or details
                                        if (passengerName.match(/^Acompanhante \d+ \(/)) {
                                            passengerName = dbPassenger?.full_name || p.details?.name || '';
                                        }
                                        
                                        // For main passenger, use client name as fallback
                                        if (!passengerName && !p.isAccompaniment) {
                                            const booking = bookings.find(b => b.id === p.bookingId);
                                            const clientName = booking ? ((booking as any)._client?.name || clients.find(c => c.id === booking.clientId)?.name) : '';
                                            passengerName = clientName || 'Passageiro';
                                        }
                                        
                                        // For companions, use a descriptive fallback
                                        if (!passengerName && p.isAccompaniment) {
                                            passengerName = 'Acompanhante';
                                        }
                                        
                                        // Ensure we always have a valid name
                                        if (!passengerName) {
                                            // Last resort: use the name from p.name or a default
                                            passengerName = p.name || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                                        }
                                        
                                        // Debug: log the name being set
                                        console.log('[TransportManager] Setting selected passenger:', { 
                                            id: p.id, 
                                            name: passengerName, 
                                            bookingId: p.bookingId, 
                                            dbPassenger: dbPassenger?.full_name, 
                                            pName: p.name, 
                                            pDetails: p.details?.name,
                                            isAccompaniment: p.isAccompaniment,
                                            passengerIndex: p.passengerIndex
                                        });
                                        
                                        // Ensure passengerName is never empty before setting
                                        if (!passengerName || passengerName.trim() === '') {
                                            console.warn('[TransportManager] Warning: passengerName is empty, using fallback');
                                            passengerName = p.name || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                                        }
                                        
                                        setSelectedPassenger(isSelected ? null : {id: p.id, name: passengerName, bookingId: p.bookingId});
                                    }
                                }} 
                                className={`
                                    p-3 rounded-lg border text-sm flex items-center justify-between group select-none transition-all relative
                                    ${isSelected ? 'bg-primary-600 border-primary-600 shadow-md ring-2 ring-primary-100 text-white' : ''}
                                    ${isAssigned && !isSelected ? 'bg-green-50/50 border-green-200 text-gray-500 opacity-90 cursor-default' : ''}
                                    ${!isAssigned && !isSelected ? 'bg-white border-gray-200 hover:border-primary-300 cursor-grab active:cursor-grabbing' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden pr-6">
                                    {!isAssigned && <Grip size={12} className={isSelected ? 'text-white/50' : 'text-gray-300'}/>}
                                    {isAssigned && <CheckCircle size={14} className="text-green-600 flex-shrink-0"/>}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{displayInitial}</div>
                                    
                                    {/* Always show full name on top, type below */}
                                    <div className={`min-w-0 flex flex-col`}>
                                        <span className={`font-bold text-sm truncate leading-tight`} style={{ color: isSelected ? '#ffffff' : '#111827' }}>
                                            {displayName}
                                        </span>
                                        <div className={`flex items-center text-xs mt-0.5`} style={{ color: isSelected ? 'rgba(255, 255, 255, 0.8)' : '#6b7280' }}>
                                            {p.isManual ? (
                                                <>
                                                    <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                    <span className="truncate">Manual</span>
                                                </>
                                            ) : p.isAccompaniment ? (
                                                <>
                                                    <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                    <span className="truncate">Acompanhante {p.passengerIndex}</span>
                                                </>
                                            ) : (
                                                <span className={`text-[10px] uppercase font-bold tracking-wide ${isSelected ? 'text-white/90' : 'text-primary-600/70'}`}>
                                                    Titular
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isAssigned && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap truncate max-w-[80px]">{assignedInfo}</span>}
                                
                                {/* Action Buttons - Always visible */}
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleOpenPassengerEdit(p); }}
                                        className={`p-1.5 rounded-full transition-all ${isSelected ? 'text-white hover:bg-white/20 bg-white/10' : 'text-blue-500 hover:bg-blue-50 bg-blue-50/50'}`}
                                        title="Editar dados do passageiro"
                                    >
                                        <Edit3 size={14}/>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPassengerToDelete(p.id); }}
                                        className={`p-1.5 rounded-full transition-all ${isSelected ? 'text-white hover:bg-white/20 bg-white/10' : 'text-red-500 hover:bg-red-50 bg-red-50/50'}`}
                                        title="Remover passageiro"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-400 text-center">Arraste para o assento ou clique para selecionar.</div>
            </aside>

            {/* Main Content Area - Vehicle Management */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                
                {/* Vehicle Tabs Header */}
                <header className="flex items-center bg-white border-b border-gray-200 px-4 py-2 gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                    {vehicles.map(vehicle => (
                        <div 
                            key={vehicle.id} 
                            onClick={() => setActiveVehicleId(vehicle.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 cursor-pointer transition-all min-w-[120px] justify-between group
                                ${activeVehicleId === vehicle.id ? 'border-primary-500 text-primary-600 bg-primary-50 font-bold' : 'border-transparent text-gray-500 hover:bg-gray-50'}
                            `}
                        >
                            <span className="truncate max-w-[100px] text-xs">{vehicle.name} <span className="opacity-50 font-normal">({vehicle.config.totalSeats})</span></span>
                            {activeVehicleId === vehicle.id && (
                                <div className="flex items-center gap-1 ml-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditVehicle(vehicle); }} 
                                        className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors"
                                        title="Editar veículo"
                                    >
                                        <Edit3 size={12}/>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(vehicle.id); }}
                                        className="p-1 hover:bg-red-100 rounded-full text-red-500 hover:text-red-600 transition-colors"
                                        title="Remover veículo"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Add Vehicle Button - Mostra menu se há veículos, senão mostra tela completa */}
                    {vehicles.length > 0 ? (
                        <div className="relative z-30">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVehicleMenuOpen(!isVehicleMenuOpen);
                                }}
                                className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${isVehicleMenuOpen ? 'bg-primary-100 text-primary-700' : 'text-primary-600 hover:bg-primary-50'}`}
                            >
                                <Plus size={14}/> Add Veículo
                            </button>
                            
                            {isVehicleMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsVehicleMenuOpen(false);
                                        }}
                                    ></div>
                                    <div 
                                        className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-[scaleIn_0.1s]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-2">Selecione o Tipo</p>
                                        {Object.values(VEHICLE_TYPES).slice(0, 5).map(v => (
                                            <button 
                                                key={v.type} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectVehicleType(v.type);
                                                }} 
                                                className="w-full text-left px-2 py-1.5 hover:bg-gray-50 text-xs text-gray-700 rounded-lg flex items-center gap-2"
                                            >
                                                <Truck size={12} className="text-gray-400"/> {v.label.split('(')[0]}
                                            </button>
                                        ))}
                                        <div className="border-t my-1"></div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectVehicleType('CUSTOM');
                                            }} 
                                            className="w-full text-left px-2 py-1.5 hover:bg-gray-50 text-xs text-primary-600 font-bold rounded-lg"
                                        >
                                            Personalizado...
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsVehicleMenuOpen(true)}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg text-primary-600 hover:bg-primary-50"
                        >
                            <Plus size={14}/> Add Veículo
                        </button>
                    )}
                </header>

                {/* Action Buttons Bar */}
                {activeVehicle && vehicles.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 flex-shrink-0">
                        <button
                            onClick={handleAutoFill}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                            title="Preencher automaticamente mantendo acompanhantes juntos"
                        >
                            <Zap size={14}/> Auto Preencher
                        </button>
                        <button
                            onClick={handleClearAllSeats}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                            title="Limpar todos os assentos deste veículo"
                        >
                            <Trash2 size={14}/> Limpar Assentos
                        </button>
                    </div>
                )}

                {/* Bus Visualization Area */}
                <section className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide relative">
                    {activeVehicle ? (
                        <>
                            {/* Botões de Ação do Veículo - Visíveis sempre */}
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                                <button 
                                    onClick={() => handleEditVehicle(activeVehicle)} 
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-colors text-xs font-bold"
                                    title="Editar veículo (alterar número de vagas)"
                                >
                                    <Edit3 size={14}/> Editar Veículo
                                </button>
                                <button 
                                    onClick={() => handleDeleteVehicle(activeVehicle.id)} 
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors text-xs font-bold"
                                    title="Remover veículo"
                                >
                                    <Trash2 size={14}/> Remover
                                </button>
                            </div>
                            <div className="bg-white px-8 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative min-h-[600px] w-fit h-fit my-auto animate-[scaleIn_0.3s]">
                                <div className="absolute top-0 left-0 right-0 h-24 border-b-2 border-slate-200 bg-slate-50 flex justify-center items-center rounded-t-[34px]"><User size={24} className="text-slate-300"/></div>
                                <div className="mt-12 space-y-2 select-none">
                                    {activeVehicle && (
                                        <BusVisualizer
                                            vehicle={activeVehicle}
                                            selectedPassenger={selectedPassenger}
                                            dragOverSeat={dragOverSeat}
                                            onDragOver={handleDragOverSeat}
                                            onDragLeave={handleDragLeaveSeat}
                                            onDrop={handleDrop}
                                            onSeatClick={handleSeatClick}
                                            isSeatOccupied={isSeatOccupied}
                                        />
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Selecione ou crie um veículo.</div>
                    )}
                </section>
            </main>
            
            {/* Custom Vehicle Modal (Create/Edit) */}
            {showCustomVehicleForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowCustomVehicleForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        <h3 className="text-lg font-bold mb-4">{editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                        <form onSubmit={handleSaveCustomVehicle} className="space-y-4">
                            <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Nome do Veículo</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500" placeholder="Ex: Ônibus 1"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Lugares</label><input type="number" required value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500"/></div>
                                <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded outline-none focus:ring-1 focus:ring-primary-500"><option value={2}>2 (Van)</option><option value={3}>3 (Exec)</option><option value={4}>4 (Padrão)</option></select></div>
                            </div>
                            <button className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm">{editingVehicleId ? 'Salvar Alterações' : 'Criar Veículo'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. ROOMING MANAGER (Config em Lote + Smart Click)
interface RoomingManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void;
}

const RoomingManager: React.FC<RoomingManagerProps> = ({ trip, bookings, clients, onSave }) => {
    // State for Hotels
    const [hotels, setHotels] = useState<HotelInstance[]>([]);
    const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
    const [editHotelNameId, setEditHotelNameId] = useState<string | null>(null); // ID of hotel being renamed
    const [tempHotelName, setTempHotelName] = useState('');

    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [nameOverrides, setNameOverrides] = useState<Record<string, string>>((trip.operationalData as any)?.passengerNameOverrides || {});
    
    // UI
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');
    
    // Batch Config
    const [invQty, setInvQty] = useState(1);
    const [invType, setInvType] = useState<'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE'>('DOUBLE');
    const [invCustomCap, setInvCustomCap] = useState<number | ''>(''); 

    // Delete/Remove States
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [guestToRemove, setGuestToRemove] = useState<{roomId: string, guestId: string, guestName: string} | null>(null);
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null);

    // Initialization & Migration
    useEffect(() => {
        if (trip.operationalData?.hotels && trip.operationalData.hotels.length > 0) {
            setHotels(trip.operationalData.hotels);
            if (!activeHotelId) setActiveHotelId(trip.operationalData.hotels[0].id);
        } else if (trip.operationalData?.rooming && trip.operationalData.rooming.length > 0) {
            // Migrate legacy rooms
            const legacyHotel: HotelInstance = {
                id: 'h-legacy',
                name: 'Hotel Principal',
                rooms: trip.operationalData.rooming
            };
            setHotels([legacyHotel]);
            setActiveHotelId(legacyHotel.id);
        } else {
            // Default empty state
            const defaultHotel: HotelInstance = { id: `h-${Date.now()}`, name: 'Hotel Principal', rooms: [] };
            setHotels([defaultHotel]);
            setActiveHotelId(defaultHotel.id);
        }
    }, [trip.operationalData]);

    const activeHotel = useMemo(() => hotels.find(h => h.id === activeHotelId), [hotels, activeHotelId]);

    // Fetch passenger data from database
    const [dbPassengers, setDbPassengers] = useState<Map<string, any>>(new Map());
    
    useEffect(() => {
        const fetchPassengers = async () => {
            try {
                const { supabase } = await import('../services/supabase');
                if (supabase && bookings.length > 0) {
                    const bookingIds = bookings.filter(b => b.status === 'CONFIRMED').map(b => b.id);
                    if (bookingIds.length > 0) {
                        const { data, error } = await supabase
                            .from('booking_passengers')
                            .select('*')
                            .in('booking_id', bookingIds)
                            .order('booking_id', { ascending: true })
                            .order('passenger_index', { ascending: true });
                        
                        if (!error && data) {
                            const map = new Map<string, any>();
                            data.forEach(p => {
                                const key = `${p.booking_id}-${p.passenger_index}`;
                                map.set(key, p);
                            });
                            setDbPassengers(map);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching passengers:', err);
            }
        };
        fetchPassengers();
    }, [bookings]);

    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                // Try database first, then override, then fallback
                const dbPassenger = dbPassengers.get(`${b.id}-${i}`);
                const dbName = dbPassenger?.full_name;
                
                // For main passenger (i === 0), use client name as fallback
                // For companions (i > 0), only use database or details - don't use "Acompanhante X" as name
                let finalName: string;
                if (i === 0) {
                    // Main passenger: database > override > client name > "Passageiro"
                    finalName = dbName || nameOverrides[id] || clientName || 'Passageiro';
                } else {
                    // Companion: database > override > empty (will show "Acompanhante" label below)
                    finalName = dbName || nameOverrides[id] || '';
                }
                
                return { 
                    id, 
                    bookingId: b.id, 
                    name: finalName,
                    isMain: i === 0,
                    isAccompaniment: i > 0,
                    isManual: false,
                    passengerIndex: i,
                    details: dbPassenger ? {
                        name: dbPassenger.full_name,
                        document: dbPassenger.cpf,
                        phone: dbPassenger.whatsapp,
                        birthDate: dbPassenger.birth_date
                    } : undefined
                };
            });
        });
        const manual = manualPassengers.map(p => ({ 
            id: p.id, 
            bookingId: p.id, 
            name: nameOverrides[p.id] || p.name, 
            isManual: true,
            isMain: false,
            isAccompaniment: false
        }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides, dbPassengers]);

    // Global Assignment Map across all hotels
    const assignedMap = useMemo(() => {
        const map = new Map<string, string>();
        hotels.forEach(h => {
            h.rooms.forEach(r => {
                r.guests.forEach(g => map.set(g.bookingId, `${h.name} - ${r.name}`));
            });
        });
        return map;
    }, [hotels]);

    const filteredPassengers = useMemo(() => {
        if (!filterText) return allPassengers;
        return allPassengers.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
    }, [allPassengers, filterText]);

    // Actions
    const saveHotels = (updatedHotels: HotelInstance[]) => {
        setHotels(updatedHotels);
        onSave({ ...trip.operationalData, hotels: updatedHotels });
    };

    const handleBatchCreate = () => {
        if (!activeHotelId) return;
        const newRooms: RoomConfig[] = [];
        const capMap = { 'DOUBLE': 2, 'TRIPLE': 3, 'QUAD': 4, 'COLLECTIVE': 6 };
        
        let capacity = capMap[invType];
        if (invType === 'COLLECTIVE' && invCustomCap !== '' && Number(invCustomCap) > 0) {
            capacity = Number(invCustomCap);
        }

        // Calculate start index based on active hotel's rooms
        const currentRooms = activeHotel?.rooms || [];
        const startIdx = currentRooms.length + 1;
        
        for(let i=0; i<invQty; i++) {
            newRooms.push({ id: crypto.randomUUID(), name: `Quarto ${startIdx+i}`, type: invType, capacity: capacity, guests: [] });
        }

        const updatedHotels = hotels.map(h => {
            if (h.id === activeHotelId) {
                return { ...h, rooms: [...h.rooms, ...newRooms] };
            }
            return h;
        });
        
        saveHotels(updatedHotels);
    };

    const handleAssign = (roomId: string, passenger: { id: string, name: string, bookingId: string, details?: any }) => {
        // Remove from ANY existing hotel/room first
        const cleanedHotels = hotels.map(h => ({
            ...h,
            rooms: h.rooms.map(r => ({
                ...r,
                guests: r.guests.filter(g => g.bookingId !== passenger.id)
            }))
        }));

        // Find target hotel and room
        const targetHotelIndex = cleanedHotels.findIndex(h => h.id === activeHotelId);
        if (targetHotelIndex === -1) return;

        const targetHotel = cleanedHotels[targetHotelIndex];
        const targetRoomIndex = targetHotel.rooms.findIndex(r => r.id === roomId);
        
        if (targetRoomIndex !== -1) {
            const room = targetHotel.rooms[targetRoomIndex];
            if (room.guests.length < room.capacity) {
                // Get passenger name from details first
                const passengerName = passenger.details?.name || passenger.name;
                room.guests.push({ name: passengerName, bookingId: passenger.id });
                saveHotels(cleanedHotels);
                if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
            } else {
                showToast('Quarto lotado! Não há mais vagas disponíveis.', 'warning');
            }
        }
    };

    const confirmRemoveGuest = () => {
        if (!guestToRemove || !activeHotelId) return;
        
        const updatedHotels = hotels.map(h => {
            // Only search in the current hotel context logic, but since IDs are unique, we map all
            // To be safe, we iterate rooms
            return {
                ...h,
                rooms: h.rooms.map(r => {
                    if (r.id === guestToRemove.roomId) {
                        return { ...r, guests: r.guests.filter(g => g.bookingId !== guestToRemove.guestId) };
                    }
                    return r;
                })
            };
        });
        
        saveHotels(updatedHotels);
        // Modal will close via onClose() in ConfirmationModal button
    };
    
    const confirmDeleteRoom = () => {
        if (!roomToDelete) return;
        
        const updatedHotels = hotels.map(h => ({
            ...h,
            rooms: h.rooms.filter(r => r.id !== roomToDelete)
        }));
        
        saveHotels(updatedHotels);
        // Modal will close via onClose() in ConfirmationModal button
    };
    
    // Hotel Management Actions
    const handleAddHotel = () => {
        const newHotel: HotelInstance = {
            id: `h-${Date.now()}`,
            name: `Hotel ${hotels.length + 1}`,
            rooms: []
        };
        const updated = [...hotels, newHotel];
        saveHotels(updated);
        setActiveHotelId(newHotel.id);
    };

    const handleDeleteHotel = (hotelId: string) => {
        setHotelToDelete(hotelId);
    };

    const confirmDeleteHotel = () => {
        if (!hotelToDelete) return;
        
        const updated = hotels.filter(h => h.id !== hotelToDelete);
        // Ensure at least one hotel remains
        if (updated.length === 0) {
            updated.push({ id: `h-${Date.now()}`, name: 'Hotel Principal', rooms: [] });
        }
        saveHotels(updated);
        if (activeHotelId === hotelToDelete) setActiveHotelId(updated[0].id);
        // Modal will close via onClose() in ConfirmationModal button
    };

    const startRenameHotel = (hotelId: string, currentName: string) => {
        setEditHotelNameId(hotelId);
        setTempHotelName(currentName);
    };

    const saveRenameHotel = () => {
        if (!editHotelNameId) return;
        const updated = hotels.map(h => h.id === editHotelNameId ? { ...h, name: tempHotelName } : h);
        saveHotels(updated);
        setEditHotelNameId(null);
    };

    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, passenger: any) => {
        e.dataTransfer.setData('application/json', JSON.stringify(passenger));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, roomId: string) => {
        e.preventDefault();
        setDragOverRoom(null);
        try {
            const data = e.dataTransfer.getData('application/json');
            const passenger = JSON.parse(data);
            if (passenger?.id) handleAssign(roomId, passenger);
        } catch (err) {}
    };

    // Stats
    const totalCap = activeHotel?.rooms.reduce((sum, r) => sum + r.capacity, 0) || 0;
    const occupied = activeHotel?.rooms.reduce((sum, r) => sum + r.guests.length, 0) || 0;
    const assignedCount = assignedMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

    // Helper for Quick Selectors
    const QuickSelector = ({ type, label, active }: { type: string; label: string; active: boolean }) => (
        <button 
            onClick={() => setInvType(type as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-primary-600 text-white border-primary-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!roomToDelete} onClose={() => setRoomToDelete(null)} onConfirm={confirmDeleteRoom} title="Excluir Quarto" message="Tem certeza que deseja excluir este quarto? Os passageiros voltarão para a lista." variant="danger" />
            <ConfirmationModal isOpen={!!guestToRemove} onClose={() => setGuestToRemove(null)} onConfirm={confirmRemoveGuest} title="Remover Passageiro" message={`Remover ${guestToRemove?.guestName} deste quarto?`} variant="warning" confirmText="Remover" />
            <ConfirmationModal isOpen={!!hotelToDelete} onClose={() => setHotelToDelete(null)} onConfirm={confirmDeleteHotel} title="Remover Hotel" message="Tem certeza que deseja remover este hotel? Todos os quartos e alocações serão perdidos." variant="danger" confirmText="Remover" />

            {/* Header Config */}
            <div className="bg-slate-50 border-b p-4 flex flex-col gap-4 flex-shrink-0">
                {/* Hotel Tabs Row */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {hotels.map(hotel => (
                        <div 
                            key={hotel.id}
                            onClick={() => setActiveHotelId(hotel.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-all min-w-[140px] justify-between group
                                ${activeHotelId === hotel.id ? 'bg-white border-primary-500 text-primary-700 shadow-sm ring-1 ring-primary-100' : 'bg-white/50 border-transparent hover:bg-white text-gray-600'}
                            `}
                        >
                            {editHotelNameId === hotel.id ? (
                                <input 
                                    value={tempHotelName}
                                    onChange={e => setTempHotelName(e.target.value)}
                                    onBlur={saveRenameHotel}
                                    onKeyDown={e => e.key === 'Enter' && saveRenameHotel()}
                                    autoFocus
                                    className="w-full text-xs font-bold bg-transparent outline-none border-b border-primary-300"
                                />
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    <Building size={14} className={activeHotelId === hotel.id ? "text-primary-500" : "text-gray-400"} />
                                    <span className="text-xs font-bold truncate">{hotel.name}</span>
                                    {activeHotelId === hotel.id && (
                                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); startRenameHotel(hotel.id, hotel.name); }} className="text-gray-400 hover:text-blue-500"><Edit size={10}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHotel(hotel.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={10}/></button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddHotel} className="p-2 rounded-lg bg-white border border-dashed border-gray-300 text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors">
                        <Plus size={16}/>
                    </button>
                </div>

                {/* Room Config Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2">Adicionar:</span>
                        <div className="flex gap-2 mr-2">
                            <QuickSelector type="DOUBLE" label="Single/Duplo" active={invType === 'DOUBLE'} />
                            <QuickSelector type="TRIPLE" label="Triplo" active={invType === 'TRIPLE'} />
                            <QuickSelector type="QUAD" label="Quádruplo" active={invType === 'QUAD'} />
                            <QuickSelector type="COLLECTIVE" label="Personalizado" active={invType === 'COLLECTIVE'} />
                        </div>

                        {invType === 'COLLECTIVE' && (
                            <div className="relative animate-[fadeIn_0.2s]">
                                <input 
                                    type="number" 
                                    min="1" 
                                    placeholder="Cap." 
                                    value={invCustomCap} 
                                    onChange={e => setInvCustomCap(e.target.value === '' ? '' : parseInt(e.target.value))} 
                                    className="w-16 border rounded-lg p-1.5 text-center text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-300 mx-2"></div>

                        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
                            <button onClick={() => setInvQty(Math.max(1, invQty-1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-l-md font-bold">-</button>
                            <span className="px-2 text-xs font-bold min-w-[20px] text-center">{invQty}</span>
                            <button onClick={() => setInvQty(invQty+1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-r-md font-bold">+</button>
                        </div>

                        <button onClick={handleBatchCreate} className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center gap-1 shadow-sm ml-2">
                            <Plus size={14}/> Criar
                        </button>
                    </div>
                    
                    <div className="flex gap-4 text-xs text-gray-600 font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
                        <span>Total: <b>{totalCap}</b></span><span>Ocupado: <b className="text-blue-600">{occupied}</b></span><span>Livre: <b className="text-green-600">{totalCap - occupied}</b></span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left List */}
                <div className="w-80 border-r bg-white flex flex-col h-full shadow-sm z-10 flex-shrink-0">
                    <div className="p-4 border-b bg-gray-50 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Passageiros ({assignedCount}/{allPassengers.length})</h4>
                            <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded" title="Adicionar Manual"><Plus size={18}/></button>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14}/>
                            <input 
                                type="text" 
                                placeholder="Buscar passageiro..." 
                                className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                         {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                         {filteredPassengers.map(p => {
                             const assignedInfo = assignedMap.get(p.id); // "Hotel Name - Room Name"
                             const isSelected = selectedPassenger?.id === p.id;

                             return (
                                 <div 
                                    key={p.id} 
                                    draggable={!assignedInfo} 
                                    onDragStart={(e) => handleDragStart(e, p)} 
                                    onClick={() => {
                                        if (!assignedInfo) {
                                            // Get passenger name - prioritize database first
                                            const dbPassenger = dbPassengers.get(`${p.bookingId}-${p.passengerIndex}`);
                                            let passengerName = dbPassenger?.full_name || p.details?.name || p.name || '';
                                            
                                            // If name is "Acompanhante X (...)", try to get from database or details
                                            if (passengerName.match(/^Acompanhante \d+ \(/)) {
                                                passengerName = dbPassenger?.full_name || p.details?.name || '';
                                            }
                                            
                                            // For main passenger, use client name as fallback
                                            if (!passengerName && !p.isAccompaniment) {
                                                const booking = bookings.find(b => b.id === p.bookingId);
                                                const clientName = booking ? ((booking as any)._client?.name || clients.find(c => c.id === booking.clientId)?.name) : '';
                                                passengerName = clientName || 'Passageiro';
                                            }
                                            
                                            // For companions, use a descriptive fallback
                                            if (!passengerName && p.isAccompaniment) {
                                                passengerName = 'Acompanhante';
                                            }
                                            
                                            // Ensure we always have a valid name
                                            if (!passengerName) {
                                                // Last resort: use the name from p.name or a default
                                                passengerName = p.name || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                                            }
                                            
                                            // Debug: log the name being set
                                            console.log('[RoomingManager] Setting selected passenger:', { 
                                                id: p.id, 
                                                name: passengerName, 
                                                bookingId: p.bookingId, 
                                                dbPassenger: dbPassenger?.full_name, 
                                                pName: p.name, 
                                                pDetails: p.details?.name,
                                                isAccompaniment: p.isAccompaniment,
                                                passengerIndex: p.passengerIndex
                                            });
                                            
                                            // Ensure passengerName is never empty before setting
                                            if (!passengerName || passengerName.trim() === '') {
                                                console.warn('[RoomingManager] Warning: passengerName is empty, using fallback');
                                                passengerName = p.name || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                                            }
                                            
                                            setSelectedPassenger(selectedPassenger?.id === p.id ? null : {id: p.id, name: passengerName, bookingId: p.bookingId});
                                        }
                                    }} 
                                    className={`
                                        p-3 rounded-lg border text-sm flex items-center justify-between group transition-all select-none
                                        ${selectedPassenger?.id === p.id ? 'bg-primary-600 border-primary-600 text-white shadow-md scale-[1.02]' : ''}
                                        ${assignedInfo && selectedPassenger?.id !== p.id ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-default' : ''}
                                        ${!assignedInfo && selectedPassenger?.id !== p.id ? 'bg-white border-gray-200 hover:border-primary-300 cursor-grab active:cursor-grabbing' : ''}
                                    `}
                                 >
                                     <div className="flex items-center gap-3 overflow-hidden">
                                         {!assignedInfo && <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}/>}
                                         {assignedInfo && <CheckCircle size={14} className="text-blue-600 flex-shrink-0"/>}
                                         {(() => {
                                             const isSelected = selectedPassenger?.id === p.id;
                                             // When selected, use the name from selectedPassenger to ensure consistency
                                             let passengerName: string;
                                             if (isSelected && selectedPassenger?.name) {
                                                 // Use the name from selectedPassenger when selected
                                                 passengerName = selectedPassenger.name;
                                             } else {
                                                 // Calculate name normally when not selected - prioritize database
                                                 const dbPassenger = dbPassengers.get(`${p.bookingId}-${p.passengerIndex}`);
                                                 passengerName = dbPassenger?.full_name || p.details?.name || p.name || '';
                                                 // If name is "Acompanhante X (...)", try to get from database or details
                                                 if (passengerName.match(/^Acompanhante \d+ \(/)) {
                                                     passengerName = dbPassenger?.full_name || p.details?.name || '';
                                                 }
                                                 // For main passenger, use client name as fallback
                                                 if (!passengerName && !p.isAccompaniment) {
                                                     const booking = bookings.find(b => b.id === p.bookingId);
                                                     const clientName = booking ? ((booking as any)._client?.name || clients.find(c => c.id === booking.clientId)?.name) : '';
                                                     passengerName = clientName || 'Passageiro';
                                                 }
                                                 // For companions, use a descriptive fallback
                                                 if (!passengerName && p.isAccompaniment) {
                                                     passengerName = 'Acompanhante';
                                                 }
                                             }
                                             const displayName = passengerName || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                                             const displayInitial = displayName.charAt(0).toUpperCase();
                                             return (
                                                 <>
                                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{displayInitial}</div>
                                                     
                                                     {/* Always show full name on top, type below */}
                                                     <div className={`min-w-0 flex flex-col`}>
                                                         <span className={`font-bold text-sm truncate leading-tight`} style={{ color: isSelected ? '#ffffff' : '#111827' }}>
                                                             {displayName}
                                                         </span>
                                                         <div className={`flex items-center text-xs mt-0.5 ${selectedPassenger?.id === p.id ? 'text-white/80' : 'text-gray-500'}`}>
                                                             {p.isManual ? (
                                                                 <>
                                                                     <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                                     <span className="truncate">Manual</span>
                                                                 </>
                                                             ) : p.isAccompaniment ? (
                                                                 <>
                                                                     <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                                     <span className="truncate">Acompanhante {p.passengerIndex}</span>
                                                                 </>
                                                             ) : (
                                                                 <span className={`text-[10px] uppercase font-bold tracking-wide ${selectedPassenger?.id === p.id ? 'text-white/90' : 'text-primary-600/70'}`}>
                                                                     Titular
                                                                 </span>
                                                             )}
                                                         </div>
                                                     </div>
                                                 </>
                                             );
                                         })()}
                                     </div>
                                     {assignedInfo && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[80px]" title={assignedInfo}>{assignedInfo.split(' - ').pop()}</span>}
                                 </div>
                             );
                         })}
                    </div>
                    <div className="p-2 bg-gray-50 text-[10px] text-gray-400 text-center border-t">Arraste para o quarto ou clique para selecionar.</div>
                </div>

                {/* Right Grid */}
                <div className="flex-1 bg-slate-100 overflow-y-auto p-6 custom-scrollbar">
                    {activeHotel ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                            {activeHotel.rooms.map(room => {
                                const isFull = room.guests.length >= room.capacity;
                                const isTarget = (selectedPassenger && !isFull) || dragOverRoom === room.id;
                                return (
                                    <div 
                                        key={room.id} 
                                        onDragOver={(e) => { e.preventDefault(); if(!isFull) setDragOverRoom(room.id); }}
                                        onDragLeave={() => setDragOverRoom(null)}
                                        onDrop={(e) => handleDrop(e, room.id)}
                                        onClick={() => selectedPassenger && handleAssign(room.id, selectedPassenger)}
                                        className={`bg-white rounded-2xl border transition-all relative overflow-hidden group shadow-sm ${isTarget ? 'cursor-pointer ring-2 ring-primary-400 border-primary-400 shadow-lg scale-[1.01]' : 'border-gray-200'}`}
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50 w-full">
                                            <div className="flex items-center gap-3 flex-1 min-w-0 truncate">
                                                <div className={`p-2 rounded-lg ${isFull ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}><BedDouble size={18}/></div>
                                                <div className="truncate flex-1">
                                                    <h5 className="font-bold text-gray-800 text-sm truncate" title={room.name}>{room.name}</h5>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase"><span>{room.type}</span><span className={isFull?'text-green-600':'text-blue-600'}>{room.guests.length}/{room.capacity}</span></div>
                                                </div>
                                            </div>
                                            <button onClick={(e) => {e.stopPropagation(); setRoomToDelete(room.id);}} className="text-gray-300 hover:text-red-500 p-1.5 flex-shrink-0"><Trash2 size={16}/></button>
                                        </div>
                                        <div className="p-3 space-y-2 min-h-[80px]">
                                            {room.guests.map(g => (
                                                <div key={g.bookingId} className="bg-blue-50/50 px-3 py-2 rounded text-xs font-medium flex justify-between items-center group/guest border border-blue-100/50">
                                                    <div className="flex items-center gap-2"><User size={12} className="text-blue-400"/><span className="truncate max-w-[120px]">{g.name}</span></div>
                                                    <button onClick={(e)=>{e.stopPropagation(); setGuestToRemove({roomId: room.id, guestId: g.bookingId, guestName: g.name});}} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100"><X size={14}/></button>
                                                </div>
                                            ))}
                                            {Array.from({length: Math.max(0, room.capacity - room.guests.length)}).map((_,i) => (
                                                <div key={i} className={`border-2 border-dashed rounded px-3 py-2 text-xs flex items-center justify-center gap-1 select-none ${isTarget ? 'border-primary-200 bg-primary-50 text-primary-600 font-bold' : 'border-gray-100 text-gray-300'}`}>
                                                    {isTarget ? <><MousePointer2 size={12}/> Alocar Aqui</> : 'Vaga Livre'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Selecione ou adicione um hotel para gerenciar os quartos.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 3. OPERATIONS MODULE (MASTER-DETAIL LAYOUT REFACTOR)
interface OperationsModuleProps {
    myTrips: Trip[];
    myBookings: Booking[];
    clients: any[];
    selectedTripId: string | null;
    onSelectTrip: (id: string | null) => void;
    onSaveTripData: (tripId: string, data: OperationalData) => void;
    currentAgency: Agency;
}

const OperationsModule: React.FC<OperationsModuleProps> = ({ myTrips, myBookings, clients, selectedTripId, onSelectTrip, onSaveTripData, currentAgency }) => {
    const selectedTrip = myTrips.find(t => t.id === selectedTripId);
    const [activeView, setActiveView] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Added collapsible state
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const { deleteTrip, refreshData } = useData(); // Import deleteTrip and refreshData
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);

    const filteredTrips = myTrips.filter(t => t.is_active && t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // Reload data when trip is selected to ensure fresh data
    useEffect(() => {
        if (selectedTripId) {
            refreshData();
        }
    }, [selectedTripId, refreshData]);

    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;
        try {
            await deleteTrip(tripToDelete);
            setTripToDelete(null);
            showToast('Pacote excluído.', 'success');
            // If the deleted trip was selected, clear the selection
            if (selectedTripId === tripToDelete) {
                onSelectTrip(null);
            }
        } catch (error: any) {
            console.error('Error deleting trip:', error);
            showToast('Erro ao excluir pacote.', 'error');
        }
    };

    // Auto-close sidebar on selection
    const handleTripSelect = (id: string) => {
        onSelectTrip(id);
        setIsSidebarOpen(false);
    };

    // PDF Generator - Melhorado com desenhos visuais (sem autoTable)
    const generateManifest = async () => {
        if (!selectedTrip) return;
        try {
            const doc = new jsPDF();
            const primaryColor = [59, 130, 246]; // Blue
            
            // COVER PAGE
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text(currentAgency.name.toUpperCase(), 15, 20);
            doc.setFontSize(10);
            doc.text('MANIFESTO DE VIAGEM', 195, 20, { align: 'right' });
            
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(18);
            doc.text(selectedTrip.title, 15, 55);
            doc.setFontSize(10);
            doc.text(`Destino: ${selectedTrip.destination}`, 15, 65);
            doc.text(`Data: ${safeDate(selectedTrip.startDate)} - ${safeDate(selectedTrip.endDate)}`, 15, 70);

            // Stats
            const opData = selectedTrip.operationalData || DEFAULT_OPERATIONAL_DATA;
            const tripBookings = myBookings.filter(b => b.tripId === selectedTrip.id && b.status === 'CONFIRMED');
            const totalPax = (opData.manualPassengers?.length || 0) + tripBookings.reduce((sum, b) => sum + b.passengers, 0);
            doc.text(`Total Passageiros: ${totalPax}`, 15, 80);

            // Helper para obter assento do passageiro
            const getPassengerSeat = (passengerId: string) => {
                if (!opData.transport?.vehicles) return '-';
                for (const vehicle of opData.transport.vehicles) {
                    const seat = vehicle.seats?.find(s => s.bookingId === passengerId);
                    if (seat) {
                        return `${vehicle.name} - Assento ${seat.seatNumber}`;
                    }
                }
                return '-';
            };

            // Fetch passenger data from database
            let bookingPassengersMap = new Map<string, any>();
            try {
                const { supabase } = await import('../services/supabase');
                if (supabase) {
                    const bookingIds = tripBookings.map(b => b.id);
                    if (bookingIds.length > 0) {
                        const { data, error } = await supabase
                            .from('booking_passengers')
                            .select('*')
                            .in('booking_id', bookingIds)
                            .order('booking_id', { ascending: true })
                            .order('passenger_index', { ascending: true });
                        
                        if (!error && data) {
                            data.forEach(p => {
                                const key = `${p.booking_id}-${p.passenger_index}`;
                                bookingPassengersMap.set(key, p);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching passengers from DB:', err);
            }

            // Helper to get detail completo - busca do banco primeiro
            const getPaxDetail = (id: string, bookingId: string, passengerIndex: number, fallbackName: string) => {
                // Try database first
                const dbPassenger = bookingPassengersMap.get(`${bookingId}-${passengerIndex}`);
                if (dbPassenger) {
                    return {
                        name: dbPassenger.full_name || fallbackName,
                        document: dbPassenger.cpf ? dbPassenger.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-',
                        phone: dbPassenger.whatsapp || '-',
                        birthDate: dbPassenger.birth_date ? new Date(dbPassenger.birth_date).toLocaleDateString('pt-BR') : '-',
                        seat: getPassengerSeat(id)
                    };
                }
                // Fallback to operational data
                const detail = opData.passengerDetails?.[id];
                return {
                    name: detail?.name || fallbackName,
                    document: detail?.document || '-',
                    phone: detail?.phone || '-',
                    birthDate: detail?.birthDate || '-',
                    seat: getPassengerSeat(id)
                };
            };

            // LISTA DE PASSAGEIROS (Primeiro) - Tabela manual
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('LISTA COMPLETA DE PASSAGEIROS', 15, 20);
            doc.setFont(undefined, 'normal');
            
            const allPax: Array<{name: string, phone: string, seat: string, document: string, birthDate: string, type: string}> = [];

            tripBookings.forEach(b => {
                const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name || 'Cliente';
                
                // Main Passenger
                const mainPaxId = `${b.id}-0`;
                const mainInfo = getPaxDetail(mainPaxId, b.id, 0, clientName);
                allPax.push({
                    name: mainInfo.name,
                    phone: mainInfo.phone,
                    seat: mainInfo.seat,
                    document: mainInfo.document,
                    birthDate: mainInfo.birthDate,
                    type: 'Principal'
                });

                // Accompanying
                for(let i=1; i<b.passengers; i++) {
                    const accId = `${b.id}-${i}`;
                    const originalAccName = `Acompanhante ${i} de ${clientName}`;
                    const accInfo = getPaxDetail(accId, b.id, i, originalAccName);
                    allPax.push({
                        name: accInfo.name,
                        phone: accInfo.phone,
                        seat: accInfo.seat,
                        document: accInfo.document,
                        birthDate: accInfo.birthDate,
                        type: 'Acompanhante'
                    });
                }
            });
            
            opData.manualPassengers?.forEach(p => {
                const info = getPaxDetail(p.id, '', -1, p.name);
                allPax.push({
                    name: info.name,
                    phone: info.phone,
                    seat: info.seat,
                    document: info.document !== '-' ? info.document : (p.document || '-'),
                    birthDate: info.birthDate,
                    type: 'Manual'
                });
            });

            // Desenhar tabela manualmente
            let yPos = 30;
            const rowHeight = 8;
            const colWidths = [50, 30, 35, 30, 25, 20]; // Nome, Telefone, Assento, RG, Nascimento, Tipo
            
            // Cabeçalho
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.rect(15, yPos, colWidths[0], rowHeight, 'F');
            doc.text('Nome', 17, yPos + 5.5);
            doc.rect(15 + colWidths[0], yPos, colWidths[1], rowHeight, 'F');
            doc.text('Telefone', 17 + colWidths[0], yPos + 5.5);
            doc.rect(15 + colWidths[0] + colWidths[1], yPos, colWidths[2], rowHeight, 'F');
            doc.text('Assento', 17 + colWidths[0] + colWidths[1], yPos + 5.5);
            doc.rect(15 + colWidths[0] + colWidths[1] + colWidths[2], yPos, colWidths[3], rowHeight, 'F');
            doc.text('RG/CPF', 17 + colWidths[0] + colWidths[1] + colWidths[2], yPos + 5.5);
            doc.rect(15 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos, colWidths[4], rowHeight, 'F');
            doc.text('Nasc.', 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 5.5);
            doc.rect(15 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos, colWidths[5], rowHeight, 'F');
            doc.text('Tipo', 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos + 5.5);
            
            yPos += rowHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            
            // Linhas de dados
            allPax.forEach((pax, index) => {
                if (yPos > 270) { // Nova página se necessário
                    doc.addPage();
                    yPos = 20;
                }
                
                const isEven = index % 2 === 0;
                if (isEven) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(15, yPos, 190, rowHeight, 'F');
                }
                
                doc.text(pax.name.length > 25 ? pax.name.substring(0, 23) + '...' : pax.name, 17, yPos + 5.5);
                doc.text(pax.phone, 17 + colWidths[0], yPos + 5.5);
                doc.text(pax.seat.length > 18 ? pax.seat.substring(0, 16) + '...' : pax.seat, 17 + colWidths[0] + colWidths[1], yPos + 5.5);
                doc.text(pax.document, 17 + colWidths[0] + colWidths[1] + colWidths[2], yPos + 5.5);
                doc.text(pax.birthDate !== '-' ? new Date(pax.birthDate).toLocaleDateString('pt-BR') : '-', 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 5.5);
                doc.text(pax.type, 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos + 5.5);
                
                // Linha divisória
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.1);
                doc.line(15, yPos + rowHeight, 205, yPos + rowHeight);
                
                yPos += rowHeight;
            });

            // DESENHO VISUAL DO ÔNIBUS
            if (opData.transport?.vehicles && opData.transport.vehicles.length > 0) {
                opData.transport.vehicles.forEach((vehicle, vIndex) => {
                    doc.addPage();
                    const { cols, totalSeats, aisleAfterCol } = vehicle.config;
                    
                    // Título
                    doc.setFontSize(16);
                    doc.setFont(undefined, 'bold');
                    doc.text(`MAPA DE ASSENTOS - ${vehicle.name.toUpperCase()}`, 15, 20);
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text(`${vehicle.config.label} - ${totalSeats} lugares`, 15, 27);
                    
                    // Desenho visual do ônibus
                    const seatSize = 8; // Tamanho de cada assento em mm
                    const seatSpacing = 2;
                    const rowHeight = seatSize + seatSpacing;
                    const rows = Math.ceil(totalSeats / cols);
                    const startX = 20;
                    const startY = 40;
                    const aisleWidth = 8;
                    
                    // Desenhar contorno do ônibus
                    const busWidth = (cols * (seatSize + seatSpacing)) + aisleWidth;
                    const busHeight = rows * rowHeight + 10;
                    doc.setDrawColor(100, 100, 100);
                    doc.setLineWidth(0.5);
                    doc.rect(startX - 5, startY - 5, busWidth + 10, busHeight + 10);
                    
                    // Desenhar assentos
                    let currentY = startY;
                    for(let r = 1; r <= rows; r++) {
                        let currentX = startX;
                        for(let c = 1; c <= cols; c++) {
                            const seatNum = ((r - 1) * cols) + c;
                            if (seatNum <= totalSeats) {
                                const occupant = vehicle.seats?.find(s => s.seatNumber === seatNum.toString());
                                
                                // Desenhar retângulo do assento
                                if (occupant) {
                                    doc.setFillColor(59, 130, 246); // Azul para ocupado
                                    doc.setDrawColor(59, 130, 246);
                                } else {
                                    doc.setFillColor(240, 240, 240); // Cinza para livre
                                    doc.setDrawColor(200, 200, 200);
                                }
                                doc.rect(currentX, currentY, seatSize, seatSize, 'FD');
                                
                                // Número do assento
                                doc.setTextColor(occupant ? 255 : 100);
                                doc.setFontSize(6);
                                doc.text(seatNum.toString(), currentX + seatSize/2, currentY + seatSize/2 + 1, { align: 'center' });
                                
                                // Nome do passageiro (se ocupado)
                                if (occupant) {
                                    doc.setFontSize(5);
                                    const nameParts = occupant.passengerName.split(' ');
                                    const shortName = nameParts.length > 1 
                                        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` 
                                        : occupant.passengerName;
                                    const displayName = shortName.length > 12 ? shortName.substring(0, 10) + '...' : shortName;
                                    doc.text(displayName, currentX + seatSize/2, currentY + seatSize + 3, { align: 'center' });
                                }
                                
                                currentX += seatSize + seatSpacing;
                            }
                            
                            // Adicionar corredor
                            if (c === aisleAfterCol) {
                                currentX += aisleWidth;
                            }
                        }
                        currentY += rowHeight;
                    }
                    
                    // Legenda
                    const legendY = startY + busHeight + 15;
                    doc.setFontSize(8);
                    doc.setTextColor(0, 0, 0);
                    doc.setFillColor(59, 130, 246);
                    doc.rect(15, legendY, 4, 4, 'F');
                    doc.text('Ocupado', 21, legendY + 3);
                    
                    doc.setFillColor(240, 240, 240);
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(50, legendY, 4, 4, 'FD');
                    doc.text('Livre', 56, legendY + 3);
                });
            } else if (opData.transport?.vehicleConfig) {
                // Legacy single vehicle support - desenho visual
                const { cols, totalSeats, aisleAfterCol } = opData.transport.vehicleConfig;
                doc.addPage();
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('MAPA DE ASSENTOS', 15, 20);
                doc.setFont(undefined, 'normal');
                
                const seatSize = 8;
                const seatSpacing = 2;
                const rowHeight = seatSize + seatSpacing;
                const rows = Math.ceil(totalSeats / cols);
                const startX = 20;
                const startY = 40;
                const aisleWidth = 8;
                
                const busWidth = (cols * (seatSize + seatSpacing)) + aisleWidth;
                const busHeight = rows * rowHeight + 10;
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.5);
                doc.rect(startX - 5, startY - 5, busWidth + 10, busHeight + 10);
                
                let currentY = startY;
                for(let r = 1; r <= rows; r++) {
                    let currentX = startX;
                    for(let c = 1; c <= cols; c++) {
                        const seatNum = ((r - 1) * cols) + c;
                        if (seatNum <= totalSeats) {
                            const occupant = opData.transport.seats?.find((s: PassengerSeat) => s.seatNumber === seatNum.toString());
                            
                            if (occupant) {
                                doc.setFillColor(59, 130, 246);
                                doc.setDrawColor(59, 130, 246);
                            } else {
                                doc.setFillColor(240, 240, 240);
                                doc.setDrawColor(200, 200, 200);
                            }
                            doc.rect(currentX, currentY, seatSize, seatSize, 'FD');
                            
                            doc.setTextColor(occupant ? 255 : 100);
                            doc.setFontSize(6);
                            doc.text(seatNum.toString(), currentX + seatSize/2, currentY + seatSize/2 + 1, { align: 'center' });
                            
                            if (occupant) {
                                doc.setFontSize(5);
                                const nameParts = occupant.passengerName.split(' ');
                                const shortName = nameParts.length > 1 
                                    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` 
                                    : occupant.passengerName;
                                const displayName = shortName.length > 12 ? shortName.substring(0, 10) + '...' : shortName;
                                doc.text(displayName, currentX + seatSize/2, currentY + seatSize + 3, { align: 'center' });
                            }
                            
                            currentX += seatSize + seatSpacing;
                        }
                        
                        if (c === aisleAfterCol) {
                            currentX += aisleWidth;
                        }
                    }
                    currentY += rowHeight;
                }
            }

            // DESENHO VISUAL DOS QUARTOS
            if (opData.hotels && opData.hotels.length > 0) {
                opData.hotels.forEach((hotel, hIndex) => {
                    doc.addPage();
                    doc.setFontSize(16);
                    doc.setFont(undefined, 'bold');
                    doc.text(`HOSPEDAGEM - ${hotel.name.toUpperCase()}`, 15, 20);
                    doc.setFont(undefined, 'normal');
                    
                    let currentY = 35;
                    const roomWidth = 60;
                    const roomHeight = 40;
                    const roomSpacing = 10;
                    let currentX = 15;
                    let roomsPerRow = 0;
                    const maxRoomsPerRow = 3;
                    
                    hotel.rooms?.forEach((room, rIndex) => {
                        // Nova linha se necessário
                        if (roomsPerRow >= maxRoomsPerRow) {
                            currentX = 15;
                            currentY += roomHeight + roomSpacing;
                            roomsPerRow = 0;
                        }
                        
                        // Desenhar quarto
                        doc.setDrawColor(100, 100, 100);
                        doc.setLineWidth(0.5);
                        doc.setFillColor(250, 250, 250);
                        doc.rect(currentX, currentY, roomWidth, roomHeight, 'FD');
                        
                        // Título do quarto
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(0, 0, 0);
                        doc.text(room.name, currentX + 2, currentY + 6);
                        doc.setFont(undefined, 'normal');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 100, 100);
                        doc.text(`Tipo: ${room.type} (${room.capacity} pessoas)`, currentX + 2, currentY + 12);
                        
                        // Desenhar camas/leitos - layout melhorado
                        const bedWidth = 28;
                        const bedHeight = 10;
                        const bedSpacing = 2;
                        let bedY = currentY + 18;
                        let bedX = currentX + 2;
                        let bedsInRow = 0;
                        const maxBedsPerRow = 2;
                        
                        room.guests.forEach((guest, gIndex) => {
                            // Nova linha se necessário
                            if (bedsInRow >= maxBedsPerRow) {
                                bedY += bedHeight + bedSpacing;
                                bedX = currentX + 2;
                                bedsInRow = 0;
                            }
                            
                            // Desenhar "cama" (retângulo)
                            doc.setFillColor(200, 220, 255);
                            doc.setDrawColor(100, 150, 255);
                            doc.setLineWidth(0.3);
                            doc.rect(bedX, bedY, bedWidth, bedHeight, 'FD');
                            
                            // Nome do hóspede
                            doc.setFontSize(6);
                            doc.setTextColor(0, 0, 0);
                            const guestName = guest.name.length > 18 ? guest.name.substring(0, 16) + '...' : guest.name;
                            doc.text(guestName, bedX + bedWidth/2, bedY + bedHeight/2 + 2, { align: 'center' });
                            
                            bedX += bedWidth + bedSpacing;
                            bedsInRow++;
                        });
                        
                        currentX += roomWidth + roomSpacing;
                        roomsPerRow++;
                    });
                });
            } else if (opData.rooming && opData.rooming.length > 0) {
                // Legacy Rooming
                doc.addPage();
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('HOSPEDAGEM', 15, 20);
                doc.setFont(undefined, 'normal');
                
                let currentY = 35;
                const roomWidth = 60;
                const roomHeight = 40;
                const roomSpacing = 10;
                let currentX = 15;
                let roomsPerRow = 0;
                const maxRoomsPerRow = 3;
                
                opData.rooming.forEach((room, rIndex) => {
                    if (roomsPerRow >= maxRoomsPerRow) {
                        currentX = 15;
                        currentY += roomHeight + roomSpacing;
                        roomsPerRow = 0;
                    }
                    
                    doc.setDrawColor(100, 100, 100);
                    doc.setLineWidth(0.5);
                    doc.setFillColor(250, 250, 250);
                    doc.rect(currentX, currentY, roomWidth, roomHeight, 'FD');
                    
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(room.name, currentX + 2, currentY + 6);
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Tipo: ${room.type} (${room.capacity} pessoas)`, currentX + 2, currentY + 12);
                    
                    const bedWidth = 28;
                    const bedHeight = 10;
                    const bedSpacing = 2;
                    let bedY = currentY + 18;
                    let bedX = currentX + 2;
                    let bedsInRow = 0;
                    const maxBedsPerRow = 2;
                    
                    room.guests.forEach((guest, gIndex) => {
                        if (bedsInRow >= maxBedsPerRow) {
                            bedY += bedHeight + bedSpacing;
                            bedX = currentX + 2;
                            bedsInRow = 0;
                        }
                        
                        doc.setFillColor(200, 220, 255);
                        doc.setDrawColor(100, 150, 255);
                        doc.setLineWidth(0.3);
                        doc.rect(bedX, bedY, bedWidth, bedHeight, 'FD');
                        
                        doc.setFontSize(6);
                        doc.setTextColor(0, 0, 0);
                        const guestName = guest.name.length > 18 ? guest.name.substring(0, 16) + '...' : guest.name;
                        doc.text(guestName, bedX + bedWidth/2, bedY + bedHeight/2 + 2, { align: 'center' });
                        
                        bedX += bedWidth + bedSpacing;
                        bedsInRow++;
                    });
                    
                    currentX += roomWidth + roomSpacing;
                    roomsPerRow++;
                });
            }

            doc.save(`manifesto_${selectedTrip.slug}.pdf`);
            showToast('PDF gerado com sucesso!', 'success');
        } catch (e: any) { 
            console.error(e); 
            showToast('Erro ao gerar PDF: '+e.message, 'error'); 
        }
    };

    const tripBookings = selectedTrip ? myBookings.filter(b => b.tripId === selectedTripId) : [];

    return (
        <div className="flex h-full overflow-hidden bg-white relative">
            <ConfirmationModal 
                isOpen={!!tripToDelete} 
                onClose={() => setTripToDelete(null)} 
                onConfirm={confirmDeleteTrip} 
                title="Excluir Pacote" 
                message="Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita." 
                variant="danger" 
                confirmText="Excluir" 
            />
            
            {/* LEFT SIDEBAR: TRIP LIST (Collapsible) */}
            <aside className={`
                flex-shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden
                ${isSidebarOpen ? 'w-80' : 'w-0'}
            `}>
                <div className={`min-w-[20rem] h-full flex flex-col transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Selecione a Viagem</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input 
                                type="text" 
                                placeholder="Buscar viagem..." 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Trip List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTrips.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                                <Bus size={24} className="mx-auto mb-2 opacity-50"/>
                                <p>Nenhuma viagem ativa.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredTrips.map(trip => (
                                    <button 
                                        key={trip.id}
                                        onClick={() => handleTripSelect(trip.id)}
                                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${selectedTripId === trip.id ? 'bg-primary-50 border-primary-500' : 'border-transparent'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Trip Image */}
                                            {trip.images && trip.images.length > 0 ? (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow-sm">
                                                    <img 
                                                        src={trip.images[0]} 
                                                        alt={trip.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=IMG';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                    <Bus size={20} className="text-gray-400"/>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${selectedTripId === trip.id ? 'text-primary-700' : 'text-gray-800'}`}>
                                                    {trip.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                    <Calendar size={12}/>
                                                    <span>{safeDate(trip.startDate)}</span>
                                                </div>
                                                {trip.destination && (
                                                    <p className="text-xs text-gray-400 line-clamp-1">{trip.destination}</p>
                                                )}
                                            </div>
                                            {selectedTripId === trip.id && (
                                                <ChevronRight size={16} className="text-primary-500 flex-shrink-0 mt-1"/>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA: DETAILS */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                
                {/* Header Bar */}
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-20 flex-shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Toggle Sidebar Button */}
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                            className="text-gray-500 hover:text-primary-600 p-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                            title={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
                        >
                            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                        </button>

                        {/* Selected Trip Info */}
                        {selectedTrip ? (
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {selectedTrip.images && selectedTrip.images.length > 0 && (
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 hidden md:block">
                                        <img 
                                            src={selectedTrip.images[0]} 
                                            alt={selectedTrip.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-sm md:text-lg font-bold text-gray-900 flex items-center gap-2 line-clamp-1">
                                        {selectedTrip.title}
                                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase hidden md:inline-block">Ativa</span>
                                    </h2>
                                    {selectedTrip.destination && (
                                        <p className="text-xs text-gray-500 hidden md:block line-clamp-1">{selectedTrip.destination}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-w-0">
                                <h2 className="text-sm md:text-lg font-bold text-gray-400">Nenhuma viagem selecionada</h2>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {selectedTrip && (
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                            {/* Navigation Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setActiveView('TRANSPORT')}
                                    className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'TRANSPORT' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Bus size={14} className="inline mr-1 mb-0.5"/> <span className="hidden md:inline">Transporte</span>
                                </button>
                                <button 
                                    onClick={() => setActiveView('ROOMING')}
                                    className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'ROOMING' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <BedDouble size={14} className="inline mr-1 mb-0.5"/> <span className="hidden md:inline">Hospedagem</span>
                                </button>
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                            <button 
                                onClick={generateManifest} 
                                className="flex items-center gap-2 text-gray-600 hover:text-primary-600 text-xs font-bold transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50" 
                                title="Exportar Manifesto para PDF"
                            >
                                <Download size={16}/> <span className="hidden md:inline">Exportar PDF</span>
                            </button>
                        </div>
                    )}
                </header>

                {/* Content Area with Independent Scroll */}
                <section className="flex-1 overflow-hidden relative">
                    {selectedTrip ? (
                        activeView === 'TRANSPORT' ? (
                            <TransportManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                        ) : (
                            <RoomingManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                        )
                    ) : (
                        // Empty State - Elegant Placeholder
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full flex items-center justify-center shadow-sm mb-6">
                                <Bus size={40} className="text-primary-300"/>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-600 mb-3">Selecione uma viagem</h3>
                            <p className="text-sm max-w-md text-center text-gray-500 mb-6">
                                {isSidebarOpen 
                                    ? "Clique em uma viagem na lista à esquerda para começar a gerenciar o transporte e a hospedagem."
                                    : "Clique no botão de menu para abrir a lista de viagens e selecionar uma viagem."
                                }
                            </p>
                            {!isSidebarOpen && (
                                <button 
                                    onClick={() => setIsSidebarOpen(true)} 
                                    className="flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-primary-700 transition-colors shadow-md"
                                >
                                    <Menu size={18}/>
                                    Abrir Lista de Viagens
                                </button>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

// Define TopTripsCard component
interface TopTripsCardProps {
  trips: Trip[];
}

const TopTripsCard: React.FC<TopTripsCardProps> = ({ trips }) => {
  const topTrips = useMemo(() => {
    // Sort by sales descending
    return [...trips].sort((a, b) => ((b.sales || 0) - (a.sales || 0))).slice(0, 5);
  }, [trips]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <Plane size={20} className="mr-2 text-primary-600"/> Top Pacotes
      </h3>
      {topTrips.length > 0 && topTrips[0].sales && topTrips[0].sales > 0 ? (
        <div className="space-y-4">
          {topTrips.map((trip, idx) => (
            <div key={trip.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => window.open(`/#/${trip.slug}`, '_blank')}>
              <span className={`font-bold text-lg w-6 text-center ${idx < 3 ? 'text-amber-500' : 'text-gray-300'}`}>{idx + 1}</span>
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                 <img src={trip.images[0] || 'https://placehold.co/100x100?text=IMG'} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{trip.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center"><ShoppingBag size={10} className="mr-1"/> {trip.sales || 0} vendas</span>
                    <span className="flex items-center"><Eye size={10} className="mr-1"/> {trip.views || 0} views</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">R$ {trip.price.toLocaleString()}</p>
                <div className="flex items-center justify-end text-amber-500 text-xs font-bold">
                    <Star size={10} className="fill-current mr-0.5"/> {trip.tripRating?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Plane size={32} className="mx-auto mb-3 opacity-50" />
          <p>Seus pacotes mais vendidos aparecerão aqui.</p>
        </div>
      )}
    </div>
  );
};

const AgencyDashboard: React.FC = () => {
  const { user, logout, loading: authLoading, updateUser, uploadImage } = useAuth(); // Import uploadImage
  const { agencies, bookings, trips: allTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencySubscription, agencyReviews, getAgencyStats, getAgencyTheme, saveAgencyTheme, updateTripOperationalData, clients, updateAgencyReview } = useData(); // Import updateAgencyReview
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as string) || 'OVERVIEW';
  const { setAgencyTheme: setGlobalAgencyTheme } = useTheme();

  const currentAgency = agencies.find(a => a.id === user?.id);
  const navigate = useNavigate();
  
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [selectedOperationalTripId, setSelectedOperationalTripId] = useState<string | null>(null);
  const [tripViewMode, setTripViewMode] = useState<'GRID' | 'TABLE'>(() => {
      return (localStorage.getItem('agencyTripViewMode') as 'GRID' | 'TABLE') || 'GRID';
  });

  // FILTERS STATE
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');

  const [tripForm, setTripForm] = useState<Partial<Trip>>(() => ({ 
      title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [],
      operationalData: DEFAULT_OPERATIONAL_DATA
  }));

  const [profileForm, setProfileForm] = useState<Partial<Agency>>(() => ({ 
      name: '', description: '', whatsapp: '', phone: '', website: '', 
      address: { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, 
      bankInfo: { bank: '', agency: '', account: '', pixKey: '' }, 
      logo: '', // FIX: Added default for logo to avoid undefined issues
      slug: '', // FIX: Added default for slug
      is_active: false, // FIX: Added default for is_active
      heroMode: 'TRIPS', // FIX: Added default
      subscriptionStatus: 'INACTIVE', // FIX: Added default
      subscriptionPlan: 'BASIC', // FIX: Added default
      subscriptionExpiresAt: new Date().toISOString(), // FIX: Added default
  }));
  const [themeForm, setThemeForm] = useState<ThemeColors>(() => ({ primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' }));
  const [heroForm, setHeroForm] = useState(() => ({ heroMode: 'TRIPS' as 'TRIPS' | 'STATIC', heroBannerUrl: '', heroTitle: '', heroSubtitle: '' })); // FIX: Explicit type for heroMode

  const [loading, setLoading] = useState(false);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [showConfirmSubscription, setShowConfirmSubscription] = useState<Plan | null>(null);
  const [stats, setStats] = useState<DashboardStats>(() => ({ totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0 }));

  // Helper to determine new booking
  const isNewBooking = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60)); 
      return diffHours <= 24;
  };

  useEffect(() => {
      const loadStats = async () => {
          if (currentAgency?.agencyId) { // Ensure agencyId exists
              const loadedStats = await getAgencyStats(currentAgency.agencyId);
              setStats(loadedStats);
          }
      };
      loadStats();
  }, [currentAgency?.agencyId, getAgencyStats]); // Depend on agencyId

  const rawTrips = allTrips.filter(t => t.agencyId === currentAgency?.agencyId);
  const myBookings = bookings.filter(b => b._trip?.agencyId === currentAgency?.agencyId);

  // Apply filters to trips
  const myTrips = rawTrips.filter(trip => {
      const matchesSearch = trip.title.toLowerCase().includes(tripSearch.toLowerCase()) || 
                            trip.destination.toLowerCase().includes(tripSearch.toLowerCase());
      const matchesStatus = tripStatusFilter === 'ALL' ? true : 
                            tripStatusFilter === 'ACTIVE' ? trip.is_active : !trip.is_active;
      return matchesSearch && matchesStatus;
  });

  useEffect(() => { 
    if (currentAgency) { 
        setProfileForm({ 
            name: currentAgency.name, 
            description: currentAgency.description, 
            whatsapp: currentAgency.whatsapp || '', 
            phone: currentAgency.phone || '', 
            website: currentAgency.website || '', 
            slug: currentAgency.slug || '',
            logo: currentAgency.logo || '',
            address: currentAgency.address || { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, 
            bankInfo: currentAgency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' }, 
            logo: currentAgency.logo 
        }); 
        setHeroForm({ 
            heroMode: currentAgency.heroMode || 'TRIPS', 
            heroBannerUrl: currentAgency.heroBannerUrl || '', 
            heroTitle: currentAgency.heroTitle || '', 
            heroSubtitle: currentAgency.heroSubtitle || '' 
        }); 
    } 
  }, [currentAgency]);

  useEffect(() => { 
    const fetchTheme = async () => { 
        if (currentAgency?.agencyId) { // Ensure agencyId exists before fetching theme
            const savedTheme = await getAgencyTheme(currentAgency.agencyId); 
            if (savedTheme) { 
                setThemeForm(savedTheme.colors); 
            } 
        } 
    }; 
    fetchTheme(); 
  }, [currentAgency?.agencyId, getAgencyTheme]);

  const handleTabChange = (tabId: string) => { setSearchParams({ tab: tabId }); setIsEditingTrip(false); setEditingTripId(null); setSelectedOperationalTripId(null); };
  
  // Custom handler for switching to operational view with a pre-selected trip
  const handleGoToOperational = (tripId: string) => {
      setSearchParams({ tab: 'OPERATIONS' });
      setSelectedOperationalTripId(tripId);
      // We manually set this here because handleTabChange clears the selection
  };

  const handleEditTrip = (trip: Trip) => { 
      const opData = trip.operationalData || DEFAULT_OPERATIONAL_DATA;
      setTripForm({ ...trip, operationalData: opData }); 
      setEditingTripId(trip.id); 
      setIsEditingTrip(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  
  const handleDeleteTrip = async (id: string) => { 
    setTripToDelete(id);
  };
  
  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    await deleteTrip(tripToDelete); 
    showToast('Pacote excluído.', 'success');
    // Modal will close via onClose() in ConfirmationModal button
  };
  const handleDuplicateTrip = async (trip: Trip) => { const newTrip = { ...trip, title: `${trip.title} (Cópia)`, is_active: false }; const { id, ...tripData } = newTrip; await createTrip({ ...tripData, agencyId: currentAgency!.agencyId } as Trip); showToast('Pacote duplicado com sucesso!', 'success'); };
  const handleSaveProfile = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      setLoading(true); 
      try { 
          await updateUser(profileForm); // FIX: call updateUser with profileForm
          await updateUser({ // FIX: call updateUser with heroForm data
              heroMode: heroForm.heroMode, 
              heroBannerUrl: heroForm.heroBannerUrl, 
              heroTitle: heroForm.heroTitle, 
              heroSubtitle: heroForm.heroSubtitle 
          }); 
          showToast('Perfil atualizado!', 'success'); 
      } catch (err: any) { 
          showToast('Erro ao atualizar perfil: ' + err.message, 'error'); // FIX: Added error message
      } finally { 
          setLoading(false); 
      } 
  };
  const handleSaveTheme = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      setLoading(true); 
      try { 
          await saveAgencyTheme(currentAgency!.agencyId, themeForm); 
          setGlobalAgencyTheme(themeForm); 
          showToast('Tema da agência atualizado!', 'success'); 
      } catch (err: any) { 
          showToast('Erro ao salvar tema: ' + err.message, 'error'); // FIX: Added error message
      } finally { 
          setLoading(false); 
      } 
  };
  const handleLogout = async () => { await logout(); navigate('/'); };
  
  const handleSelectPlan = (plan: Plan) => setShowConfirmSubscription(plan);
  const confirmSubscription = async () => { 
      if (!showConfirmSubscription || !currentAgency) return; 
      setActivatingPlanId(showConfirmSubscription.id); 
      try { 
          // FIX: Add 30 days to current date for expiration
          const nextMonth = new Date();
          nextMonth.setDate(nextMonth.getDate() + 30);
          
          await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', showConfirmSubscription.id as 'BASIC' | 'PREMIUM', nextMonth.toISOString()); 
          showToast(`Plano ${showConfirmSubscription.name} ativado com sucesso!`, 'success'); 
          window.location.reload(); 
      } catch (error: any) { 
          showToast('Erro ao ativar plano: ' + error.message, 'error'); // FIX: Added error message
      } finally { 
          setActivatingPlanId(null); 
          setShowConfirmSubscription(null); 
      } 
  };

  // Reusable Action Menu Generator
  const getTripActions = (trip: Trip) => [
    { label: 'Ver Online', icon: ExternalLink, onClick: () => window.open(`/#/${currentAgency?.slug}/viagem/${trip.slug || trip.id}`, '_blank') },
    { label: 'Editar', icon: Edit, onClick: () => handleEditTrip(trip) },
    { label: 'Gerenciar Operacional', icon: Bus, onClick: () => handleGoToOperational(trip.id) },
    { label: 'Duplicar', icon: Copy, onClick: () => handleDuplicateTrip(trip) },
    { label: 'Pausar', icon: trip.is_active ? PauseCircle : PlayCircle, onClick: () => toggleTripStatus(trip.id) },
    { label: 'Excluir', icon: Trash2, onClick: () => handleDeleteTrip(trip.id), variant: 'danger' as const }
  ];

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  const handleSendReply = async (reviewId: string) => {
      if (!replyText.trim()) return;
      try {
          await updateAgencyReview(reviewId, { response: replyText });
          setReplyText('');
          setActiveReplyId(null);
          showToast('Resposta enviada!', 'success');
      } catch (error) {
          showToast('Erro ao enviar resposta.', 'error');
      }
  };

  // Render Plan Tab Content
  const renderPlanTab = () => {
      const today = new Date();
      const expiryDate = new Date(currentAgency?.subscriptionExpiresAt || '');
      const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const totalCycleDays = 30; // Assuming monthly cycle for visuals
      const progressPercent = Math.max(0, Math.min(100, (daysLeft / totalCycleDays) * 100));
      
      const isPremium = currentAgency?.subscriptionPlan === 'PREMIUM';
      const planColor = isPremium ? 'bg-purple-600' : 'bg-blue-600';
      const planName = isPremium ? 'Premium' : 'Básico';
      const planPrice = isPremium ? 'R$ 199,90' : 'R$ 99,90';

      return (
          <div className="space-y-8 animate-[fadeIn_0.3s]">
              {/* Subscription Status Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className={`h-2 ${planColor}`}></div>
                  <div className="p-8">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                          <div>
                              <div className="flex items-center gap-3 mb-2">
                                  <h2 className="text-2xl font-bold text-gray-900">Meu Plano</h2>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider ${planColor}`}>
                                      {planName}
                                  </span>
                              </div>
                              <p className="text-gray-500 text-sm">Gerencie sua assinatura e cobranças.</p>
                          </div>
                          <div className="flex gap-3">
                              <button className="bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">
                                  Gerenciar Pagamento
                              </button>
                              <button className={`text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-lg shadow-gray-200 text-sm ${planColor} hover:opacity-90`}>
                                  Renovar Agora
                              </button>
                          </div>
                      </div>

                      {/* Progress Bar Section */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 mb-8">
                          <div className="flex justify-between items-center mb-2 text-sm font-bold text-gray-700">
                              <span>Dias Restantes</span>
                              <span className={daysLeft < 7 ? 'text-red-500' : 'text-green-600'}>{daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                              <div 
                                  className={`h-2.5 rounded-full transition-all duration-1000 ${daysLeft < 7 ? 'bg-red-500' : daysLeft < 15 ? 'bg-amber-500' : 'bg-green-500'}`} 
                                  style={{ width: `${progressPercent}%` }}
                              ></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><Calendar size={16}/></div>
                                  <div>
                                      <p className="text-gray-500 text-xs uppercase font-bold">Próxima Cobrança</p>
                                      <p className="font-bold text-gray-900">{expiryDate.toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><DollarSign size={16}/></div>
                                  <div>
                                      <p className="text-gray-500 text-xs uppercase font-bold">Valor do Plano</p>
                                      <p className="font-bold text-gray-900">{planPrice}/mês</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-400"><Zap size={16}/></div>
                                  <div>
                                      <p className="text-gray-500 text-xs uppercase font-bold">Status</p>
                                      <p className="font-bold text-green-600 flex items-center gap-1">
                                          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Ativo
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Plans Options */}
              <div className="grid md:grid-cols-2 gap-8">
                  {PLANS.map((plan) => (
                      <div 
                          key={plan.id} 
                          className={`bg-white rounded-2xl shadow-sm border p-8 transition-all hover:shadow-md relative ${currentAgency?.subscriptionPlan === plan.id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-100'}`}
                      >
                          {currentAgency?.subscriptionPlan === plan.id && (
                              <div className="absolute top-4 right-4 bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1 rounded-full border border-primary-100">
                                  Plano Atual
                              </div>
                          )}
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                          <div className="flex items-baseline gap-1 mb-6">
                              <span className="text-3xl font-extrabold text-gray-900">R$ {plan.price.toFixed(2)}</span>
                              <span className="text-gray-500 font-medium">/mês</span>
                          </div>
                          <ul className="space-y-4 mb-8">
                              {plan.features.map((feature, i) => (
                                  <li key={i} className="flex items-start text-sm text-gray-600">
                                      <Check size={16} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                      {feature}
                                  </li>
                              ))}
                          </ul>
                          <button
                              onClick={() => handleSelectPlan(plan)}
                              disabled={currentAgency?.subscriptionPlan === plan.id}
                              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                                  currentAgency?.subscriptionPlan === plan.id
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20'
                              }`}
                          >
                              {currentAgency?.subscriptionPlan === plan.id ? 'Plano Atual' : 'Mudar Plano'}
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const sortedBookings = useMemo(() => {
      return [...myBookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [myBookings]);

  if (authLoading || !currentAgency) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex items-center gap-4">
            <div className="relative"><img src={currentAgency?.logo || `https://ui-avatars.com/api/?name=${currentAgency?.name}`} alt={currentAgency?.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" /><span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span></div>
            <div><h1 className="text-2xl font-bold text-gray-900">{currentAgency?.name}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><span className="flex items-center"><Globe size={14} className="mr-1"/> {currentAgency?.slug}.viajastore.com</span><a href={`/#/${currentAgency?.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">Ver site <ExternalLink size={10} className="ml-1"/></a></div></div>
         </div>
         <div className="flex flex-wrap gap-3">
            <button onClick={() => handleTabChange('PROFILE')} className="bg-white text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
                <Settings size={18} className="mr-2"/> Gerenciar Perfil
            </button>
            <button onClick={handleLogout} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-red-100 transition-colors shadow-sm border border-red-100">
                <LogOut size={18} className="mr-2"/> Sair
            </button>
         </div>
      </div>
      
      {isEditingTrip && (
          <CreateTripWizard 
              onClose={() => { setIsEditingTrip(false); setEditingTripId(null); setTripForm({}); }} 
              onSuccess={() => { setIsEditingTrip(false); setEditingTripId(null); setTripForm({}); handleTabChange('TRIPS'); }} 
              initialTripData={editingTripId ? myTrips.find(t => t.id === editingTripId) : undefined}
          />
      )}

      {showConfirmSubscription && (
        <SubscriptionConfirmationModal 
          plan={showConfirmSubscription} 
          onClose={() => setShowConfirmSubscription(null)} 
          onConfirm={confirmSubscription} 
          isSubmitting={!!activatingPlanId}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
        <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="BOOKINGS" label="Reservas" icon={ShoppingBag} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="OPERATIONS" label="Operacional" icon={Bus} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="PLAN" label="Meu Plano" icon={CreditCard} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="PROFILE" label="Meu Perfil" icon={User} activeTab={activeTab} onClick={handleTabChange} />
        <NavButton tabId="THEME" label="Meu Tema" icon={Palette} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      {/* Content based on activeTab */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8 animate-[fadeIn_0.3s]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Receita Total" 
                    value={`R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    subtitle="Total acumulado em vendas" 
                    icon={DollarSign} 
                    color="green"
                    onClick={() => handleTabChange('BOOKINGS')}
                />
                <StatCard 
                    title="Pacotes Ativos" 
                    value={myTrips.filter(t => t.is_active).length} 
                    subtitle={`${myTrips.filter(t => !t.is_active).length} rascunhos`} 
                    icon={Plane} 
                    color="blue"
                    onClick={() => handleTabChange('TRIPS')}
                />
                <StatCard 
                    title="Reservas Confirmadas" 
                    value={myBookings.filter(b => b.status === 'CONFIRMED').length} 
                    subtitle={`${myBookings.filter(b => b.status === 'PENDING').length} pendentes`} 
                    icon={ShoppingBag} 
                    color="purple"
                    onClick={() => handleTabChange('BOOKINGS')}
                />
                <StatCard 
                    title="Avaliação Média" 
                    value={stats.averageRating ? stats.averageRating.toFixed(1) : '-'} 
                    subtitle={`${stats.totalReviews || 0} avaliações no total`} 
                    icon={Star} 
                    color="amber"
                    onClick={() => handleTabChange('REVIEWS')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Últimas Vendas */}
                <RecentBookingsTable bookings={myBookings} clients={clients} />

                {/* Top Pacotes */}
                <TopTripsCard trips={myTrips} />
            </div>
        </div>
      )}

      {activeTab === 'TRIPS' && (
        <div className="space-y-6 animate-[fadeIn_0.3s]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou destino..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm transition-all text-sm"
                            value={tripSearch}
                            onChange={(e) => setTripSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-40">
                        <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            value={tripStatusFilter}
                            onChange={(e) => setTripStatusFilter(e.target.value as any)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none shadow-sm appearance-none cursor-pointer text-gray-700 font-medium text-sm"
                        >
                            <option value="ALL">Todos os Status</option>
                            <option value="ACTIVE">Ativos</option>
                            <option value="DRAFT">Rascunhos</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 flex-shrink-0">
                        <button onClick={() => setTripViewMode('GRID')} className={`p-2 rounded-lg transition-all ${tripViewMode === 'GRID' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setTripViewMode('TABLE')} className={`p-2 rounded-lg transition-all ${tripViewMode === 'TABLE' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={18} /></button>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => { setIsEditingTrip(true); setEditingTripId(null); setTripForm({ agencyId: currentAgency!.agencyId, images: [], itinerary: [{ day: 1, title: '', description: '' }], boardingPoints: [{ id: crypto.randomUUID(), time: '', location: '' }], included: [], notIncluded: [], paymentMethods: [], tags: [], travelerTypes: [], is_active: true, operationalData: DEFAULT_OPERATIONAL_DATA, category: 'PRAIA', description: '', destination: '', durationDays: 1, endDate: '', price: 0, startDate: '', slug: '', title: '' }); }} 
                className="bg-primary-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 mb-6"
            >
                <Plus size={18}/> Novo Pacote
            </button>

            {myTrips.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                    <Plane size={32} className="text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Nenhum pacote criado ainda</h3>
                    <p className="text-gray-500 mt-1 mb-6">Crie seu primeiro pacote de viagem para começar a vender na ViajaStore!</p>
                    <button onClick={() => { setIsEditingTrip(true); setEditingTripId(null); setTripForm({ agencyId: currentAgency!.agencyId, images: [], itinerary: [{ day: 1, title: '', description: '' }], boardingPoints: [{ id: crypto.randomUUID(), time: '', location: '' }], included: [], notIncluded: [], paymentMethods: [], tags: [], travelerTypes: [], is_active: true, operationalData: DEFAULT_OPERATIONAL_DATA, category: 'PRAIA', description: '', destination: '', durationDays: 1, endDate: '', price: 0, startDate: '', slug: '', title: '' }); }} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                        <Plus size={16}/> Criar Pacote
                    </button>
                </div>
            ) : tripViewMode === 'GRID' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myTrips.map(trip => (
                        <div key={trip.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow group relative">
                            {/* Trip Image & Actions */}
                            <div className="relative h-48 w-full">
                                <img src={trip.images[0] || 'https://placehold.co/800x600?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover"/>
                                <div className="absolute top-3 left-3">
                                    <Badge color={trip.is_active ? 'green' : 'gray'}><Check size={12}/> {trip.is_active ? 'Ativo' : 'Rascunho'}</Badge>
                                </div>
                                
                                {/* New Top Action Menu */}
                                <div className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white rounded-full shadow-sm backdrop-blur-sm transition-all p-0.5">
                                   <ActionMenu actions={getTripActions(trip)} />
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                {/* Clickable Title */}
                                <h3 
                                    onClick={() => window.open(`/#/${currentAgency?.slug}/viagem/${trip.slug || trip.id}`, '_blank')}
                                    className="font-bold text-lg text-gray-900 mb-1 line-clamp-2 hover:text-primary-600 hover:underline cursor-pointer transition-colors"
                                >
                                    {trip.title}
                                </h3>
                                
                                <p className="text-sm text-gray-500 mb-3 flex items-center"><MapPin size={14} className="mr-2"/>{trip.destination}</p>
                                
                                <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mt-auto pt-4 border-t border-gray-100">
                                    <div className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1.5 text-blue-400"/> {trip.views || 0}</div>
                                    <div className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1.5 text-green-500"/> {trip.sales || 0}</div>
                                    <div className="flex items-center ml-auto font-bold text-gray-900 text-base">R$ {trip.price.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : ( // TABLE VIEW
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Destino</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Preço</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Performance</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {myTrips.map(trip => (
                                <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <img src={trip.images[0] || 'https://placehold.co/100x100/e2e8f0/e2e8f0'} className="w-full h-full object-cover" alt={trip.title} />
                                            </div>
                                            <div className="truncate">
                                                {/* Clickable Title in List */}
                                                <p 
                                                    onClick={() => window.open(`/#/${currentAgency?.slug}/viagem/${trip.slug || trip.id}`, '_blank')}
                                                    className="font-bold text-gray-900 text-sm line-clamp-1 max-w-[200px] hover:text-primary-600 hover:underline cursor-pointer transition-colors"
                                                >
                                                    {trip.title}
                                                </p>
                                                <p className="text-xs text-gray-500">{trip.category.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-700">{trip.destination}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'RASCUNHO'}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <div className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1.5 text-blue-400"/> {trip.views || 0}</div>
                                            <div className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1.5 text-green-500"/> {trip.sales || 0}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <ActionMenu actions={getTripActions(trip)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      {activeTab === 'BOOKINGS' && (
          <BookingDetailsView bookings={myBookings} clients={clients} />
      )}

      {activeTab === 'OPERATIONS' && (
          <div className="animate-[fadeIn_0.3s] h-[calc(100vh-140px)] flex flex-col overflow-hidden">
              {currentAgency ? (
                  <OperationsModule 
                      myTrips={myTrips} 
                      myBookings={myBookings} 
                      clients={clients} 
                      selectedTripId={selectedOperationalTripId} 
                      onSelectTrip={setSelectedOperationalTripId}
                      onSaveTripData={updateTripOperationalData}
                      currentAgency={currentAgency}
                  />
              ) : (
                  <div className="p-8 text-center text-gray-500">Carregando dados da agência...</div>
              )}
          </div>
      )}

      {activeTab === 'REVIEWS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações da Minha Agência ({agencyReviews.filter(r => r.agencyId === currentAgency?.agencyId).length})</h2>
              {agencyReviews.filter(r => r.agencyId === currentAgency?.agencyId).length > 0 ? (
                  <div className="space-y-4">
                      {agencyReviews.filter(r => r.agencyId === currentAgency?.agencyId).map(review => (
                          <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{review.clientName?.charAt(0)}</div>
                                      <div>
                                          <p className="font-bold text-gray-900 text-sm">{review.clientName || 'Cliente ViajaStore'}</p>
                                          <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                                  <div className="flex text-amber-400">{[...Array(5)].map((_, i) => (<Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />))}</div>
                              </div>
                              <p className="text-gray-700 text-sm italic mb-3">"{review.comment}"</p>
                              {review.tags && review.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-3">
                                      {review.tags.map(tag => (
                                          <span key={tag} className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">{tag}</span>
                                      ))}
                                  </div>
                              )}
                              {review.tripTitle && (
                                  <p className="text-xs text-gray-500 mb-3">Avaliação do pacote: <span className="font-bold">{review.tripTitle}</span></p>
                              )}

                              <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-3">
                                   <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                                       {currentAgency?.name.charAt(0)}
                                   </div>
                                  <div className="flex-1 w-full relative group/reply">
                                      {review.response ? (
                                           <div className="bg-white p-3 rounded-lg border border-gray-200 w-full relative">
                                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sua Resposta:</p>
                                                <p className="text-sm text-gray-700 italic">{review.response}</p>
                                                <button onClick={() => { setReplyText(review.response || ''); setActiveReplyId(review.id); }} className="absolute top-2 right-2 text-gray-400 hover:text-primary-600 opacity-0 group-hover/reply:opacity-100 transition-opacity"><Edit size={14}/></button>
                                           </div>
                                      ) : (
                                           activeReplyId === review.id ? (
                                                <div className="bg-white p-3 rounded-lg border border-primary-200 shadow-sm w-full">
                                                    <textarea 
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Escreva sua resposta..."
                                                        className="w-full text-sm p-2 outline-none resize-none h-20 bg-transparent"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button onClick={() => setActiveReplyId(null)} className="text-xs text-gray-500 font-bold hover:bg-gray-100 px-3 py-1.5 rounded">Cancelar</button>
                                                        <button onClick={() => handleSendReply(review.id)} className="text-xs bg-primary-600 text-white font-bold px-4 py-1.5 rounded hover:bg-primary-700 flex items-center gap-1"><Send size={12}/> Enviar</button>
                                                    </div>
                                                </div>
                                           ) : (
                                                <button onClick={() => { setActiveReplyId(review.id); setReplyText(''); }} className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-2 py-1.5">
                                                    <MessageCircle size={16}/> Responder
                                                </button>
                                           )
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-16 text-gray-400 text-sm">
                      <Star size={32} className="mx-auto mb-3" />
                      <p>Nenhuma avaliação ainda. Mantenha a qualidade para receber feedback!</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'PLAN' && renderPlanTab()}

      {activeTab === 'PROFILE' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Meu Perfil</h2>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Logo Upload */}
                  <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Logo da Agência</label>
                      <div className="flex items-center gap-4">
                          {profileForm.logo && (
                              <img src={profileForm.logo} alt="Logo" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                          )}
                          <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-2">
                              <Upload size={16}/> {profileForm.logo ? 'Alterar Logo' : 'Fazer Upload'}
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  if(e.target.files?.[0]) {
                                      const url = await uploadImage(e.target.files[0], 'agency-logos');
                                      if(url) {
                                          setProfileForm({...profileForm, logo: url});
                                          showToast('Logo atualizado! Salve o perfil para confirmar.', 'success');
                                      }
                                  }
                              }}/>
                          </label>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label><input value={profileForm.name || ''} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp || ''} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone Fixo</label><input value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Website / Redes Sociais</label><input value={profileForm.website || ''} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="https://instagram.com/suaagencia ou https://facebook.com/suaagencia" /></div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">Link do seu Site (Slug)</label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                viajastore.com/
                            </span>
                            <input 
                                value={profileForm.slug || ''} 
                                onChange={e => setProfileForm({...profileForm, slug: slugify(e.target.value)})} 
                                className="flex-1 min-w-0 block w-full px-3 py-2.5 rounded-none rounded-r-lg border border-gray-300 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="minha-agencia"
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Este é o endereço do seu site exclusivo.</p>
                      </div>

                      <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Curta</label>
                          <textarea value={profileForm.description || ''} onChange={e => setProfileForm({...profileForm, description: e.target.value})} rows={3} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="Fale um pouco sobre sua agência..." />
                      </div>
                  </div>
                  <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Configurações do Microsite (Página de Agência)</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Modo Hero</label>
                              <select value={heroForm.heroMode} onChange={e => setHeroForm({...heroForm, heroMode: e.target.value as 'TRIPS' | 'STATIC'})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500 cursor-pointer">
                                  <option value="TRIPS">Carrossel de Viagens</option>
                                  <option value="STATIC">Imagem Estática</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">Define o que aparece no topo da sua página pública.</p>
                          </div>
                          {heroForm.heroMode === 'STATIC' && (
                              <div className="space-y-4 animate-[fadeIn_0.3s]">
                                  <div>
                                      <label className="block text-sm font-bold text-gray-700 mb-1">Imagem do Hero</label>
                                      <div className="flex items-center gap-4">
                                          {heroForm.heroBannerUrl && <img src={heroForm.heroBannerUrl} alt="Preview" className="w-20 h-12 object-cover rounded-lg border border-gray-200" />}
                                          <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-2">
                                              <Upload size={16}/> Fazer Upload
                                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                  if(e.target.files?.[0]) {
                                                      const url = await uploadImage(e.target.files[0], 'agency-logos');
                                                      if(url) setHeroForm({...heroForm, heroBannerUrl: url});
                                                  }
                                              }}/>
                                          </label>
                                      </div>
                                  </div>
                                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Título do Hero</label><input value={heroForm.heroTitle || ''} onChange={e => setHeroForm({...heroForm, heroTitle: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="Bem-vindo à Sua Agência" /></div>
                                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo do Hero</label><textarea value={heroForm.heroSubtitle || ''} onChange={e => setHeroForm({...heroForm, heroSubtitle: e.target.value})} rows={2} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="As melhores experiências esperam por você!" /></div>
                              </div>
                          )}
                      </div>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                      {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                  </button>
              </form>
          </div>
      )}

      {activeTab === 'THEME' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
              <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Personalizar Tema</h2>
                  <p className="text-gray-500">Customize as cores do seu microsite de forma rápida e fácil</p>
              </div>
              
              <form onSubmit={handleSaveTheme} className="space-y-8">
                  {/* Preset Colors - Improved */}
                  <div>
                      <label className="block text-sm font-bold text-gray-700 mb-4">🎨 Cores Pré-definidas</label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                          {[
                              {p: '#3b82f6', s: '#f97316', name: 'Azul/Laranja'},
                              {p: '#10b981', s: '#3b82f6', name: 'Verde/Azul'},
                              {p: '#8b5cf6', s: '#ec4899', name: 'Roxo/Rosa'},
                              {p: '#f59e0b', s: '#ef4444', name: 'Amarelo/Vermelho'},
                              {p: '#06b6d4', s: '#10b981', name: 'Ciano/Verde'},
                              {p: '#6366f1', s: '#8b5cf6', name: 'Índigo/Roxo'},
                          ].map((c, i) => (
                              <button 
                                key={i}
                                type="button"
                                onClick={() => setThemeForm({ ...themeForm, primary: c.p, secondary: c.s })}
                                className="group relative p-4 rounded-xl border-2 border-gray-200 hover:border-primary-500 transition-all hover:shadow-lg bg-white"
                              >
                                  <div className="flex items-center gap-3 mb-2">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-200">
                                          <div className="absolute left-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: c.p }}></div>
                                          <div className="absolute right-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: c.s }}></div>
                                      </div>
                                  </div>
                                  <p className="text-xs font-bold text-gray-700 text-center">{c.name}</p>
                                  {(themeForm.primary === c.p && themeForm.secondary === c.s) && (
                                      <div className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                                          <Check size={12} className="text-white"/>
                                      </div>
                                  )}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Custom Colors - Improved */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-6">🎨 Cores Personalizadas</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white p-5 rounded-xl border border-gray-200">
                              <label className="block text-sm font-bold text-gray-700 mb-3">Cor Primária</label>
                              <div className="flex items-center gap-3">
                                  <div className="relative">
                                      <input 
                                          type="color" 
                                          value={themeForm.primary} 
                                          onChange={e => setThemeForm({...themeForm, primary: e.target.value})} 
                                          className="w-16 h-16 rounded-xl border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <input 
                                          value={themeForm.primary} 
                                          onChange={e => setThemeForm({...themeForm, primary: e.target.value})} 
                                          className="w-full border-2 border-gray-200 p-3 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase bg-gray-50"
                                          placeholder="#3b82f6"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">Usada em botões e destaques</p>
                                  </div>
                              </div>
                          </div>
                          <div className="bg-white p-5 rounded-xl border border-gray-200">
                              <label className="block text-sm font-bold text-gray-700 mb-3">Cor Secundária</label>
                              <div className="flex items-center gap-3">
                                  <div className="relative">
                                      <input 
                                          type="color" 
                                          value={themeForm.secondary} 
                                          onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} 
                                          className="w-16 h-16 rounded-xl border-2 border-gray-300 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <input 
                                          value={themeForm.secondary} 
                                          onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} 
                                          className="w-full border-2 border-gray-200 p-3 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase bg-gray-50"
                                          placeholder="#f97316"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">Usada em elementos complementares</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">👁️ Preview</h3>
                      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                          <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full" style={{ backgroundColor: themeForm.primary }}></div>
                              <div>
                                  <div className="h-4 rounded mb-2 w-32" style={{ backgroundColor: themeForm.primary }}></div>
                                  <div className="h-3 rounded w-24" style={{ backgroundColor: themeForm.secondary }}></div>
                              </div>
                          </div>
                          <button 
                              type="button"
                              className="px-6 py-3 rounded-lg font-bold text-white transition-all hover:scale-105 shadow-lg"
                              style={{ backgroundColor: themeForm.primary }}
                          >
                              Botão de Exemplo
                          </button>
                      </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-700 flex items-start gap-3">
                      <Info size={20} className="flex-shrink-0 mt-0.5"/>
                      <p className="text-sm">
                          Estas cores serão aplicadas apenas na sua página de agência (microsite). O tema padrão da ViajaStore permanecerá o mesmo no marketplace principal.
                      </p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition-all hover:scale-[1.02]">
                      {loading ? <Loader size={20} className="animate-spin" /> : <><Save size={20} /> Salvar Tema</>}
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export { AgencyDashboard };