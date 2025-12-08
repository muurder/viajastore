
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Trip, Agency, Plan, OperationalData, PassengerSeat, RoomConfig, ManualPassenger, Booking, ThemeColors, VehicleType, VehicleLayoutConfig, DashboardStats, TransportConfig 
} from '../types'; 
import { PLANS } from '../services/mockData';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { 
  Plus, Edit, Save, ArrowLeft, X, Loader, Copy, Eye, ExternalLink, Star, BarChart2, DollarSign, Users, Calendar, Plane, CreditCard, MapPin, ShoppingBag, MoreHorizontal, PauseCircle, PlayCircle, Settings, BedDouble, Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, AlertTriangle, PenTool, LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, ImageIcon, FileText, Download, Rocket,
  LogOut, 
  Globe, 
  Trash2, 
  CheckCircle, 
  ChevronDown, 
  MessageCircle, 
  Info, 
  Palette, 
  Search, 
  LucideProps 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CreateTripWizard from '../components/agency/CreateTripWizard';

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

// Safe Date Helper to prevent crashes
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

// --- CUSTOM COMPONENTS FOR DASHBOARD ---

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
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreHorizontal size={18} />
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

interface RecentBookingsTableProps {
    bookings: Booking[];
    clients: any[]; 
}

const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings, clients }) => {
    const recentBookings = [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentBookings.map(booking => {
                                const client = clients.find(c => c.id === booking.clientId);
                                return (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{client?.name?.charAt(0)}</div>
                                                <span className="font-medium text-gray-900">{client?.name || 'Cliente'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{booking._trip?.title || 'N/A'}</td>
                                        <td className="px-4 py-3 text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <Badge color={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>
                                                {booking.status}
                                            </Badge>
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
    );
};

interface TopTripsCardProps {
    trips: Trip[];
}

const TopTripsCard: React.FC<TopTripsCardProps> = ({ trips }) => {
    const topTrips = [...trips].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Star size={20} className="mr-2 text-amber-500"/> Top Pacotes</h3>
            {topTrips.length > 0 ? (
                <div className="space-y-4">
                    {topTrips.map(trip => (
                        <Link to={`/viagem/${trip.slug}`} key={trip.id} className="flex items-center gap-4 group hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors">
                            <img src={trip.images?.[0] || 'https://placehold.co/80x60?text=Viagem'} alt={trip.title} className="w-16 h-12 object-cover rounded-md flex-shrink-0" />
                            <div className="flex-1">
                                <p className="font-bold text-gray-900 text-sm group-hover:text-primary-600 truncate">{trip.title}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span className="flex items-center"><Eye size={12}/> {trip.views || 0}</span>
                                    <span className="flex items-center"><ShoppingBag size={12}/> {trip.sales || 0}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                    <Plane size={32} className="mx-auto mb-3"/>
                    <p>Nenhum pacote para mostrar no Top.</p>
                </div>
            )}
        </div>
    );
};


// --- CUSTOM MODALS ---

const ConfirmationModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative scale-100 animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
            
            <div className="flex gap-3 w-full">
                <button 
                    onClick={onClose} 
                    className="flex-1 py-2.5 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm"
                >
                    {cancelText}
                </button>
                <button 
                    onClick={() => { onConfirm(); onClose(); }} 
                    className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors text-sm shadow-sm ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const AddRoomModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (name: string, capacity: number) => void; 
}> = ({ isOpen, onClose, onConfirm }) => {
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(2);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setCapacity(2);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        onConfirm(name, capacity);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Adicionar Quarto</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Quarto</label>
                        <input 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Ex: Suíte 01, Chalé Família..." 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacidade (Pessoas)</label>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setCapacity(Math.max(1, capacity - 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600 font-bold">-</button>
                            <input 
                                type="number" 
                                value={capacity} 
                                onChange={e => setCapacity(Math.max(1, parseInt(e.target.value) || 1))} 
                                className="flex-1 text-center font-bold text-gray-900 text-lg border-none focus:ring-0"
                            />
                            <button type="button" onClick={() => setCapacity(capacity + 1)} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600 font-bold">+</button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 flex justify-center items-center gap-2">
                        <Plus size={18}/> Criar Quarto
                    </button>
                </form>
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

// --- DYNAMIC SEAT MAP LOGIC ---

interface TransportManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void; 
}

const TransportManager: React.FC<TransportManagerProps> = ({ trip, bookings, clients, onSave }) => {
    const currentVehicleConfig = trip.operationalData?.transport?.vehicleConfig;
    const currentSeats = trip.operationalData?.transport?.seats || [];
    const currentManualPassengers = trip.operationalData?.manualPassengers || [];
    
    const [config, setConfig] = useState<TransportConfig>({ 
        vehicleConfig: currentVehicleConfig || null,
        seats: currentSeats
    });
    
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(currentManualPassengers);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    
    const [showCustomVehicleForm, setShowCustomVehicleForm] = useState(false);
    const [customVehicleData, setCustomVehicleData] = useState({
        label: '',
        totalSeats: 4,
        cols: 2
    });
    
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);

    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') {
            setShowCustomVehicleForm(true);
            return;
        }

        const newConfig = VEHICLE_TYPES[type];
        const newTransportState: TransportConfig = {
            vehicleConfig: newConfig,
            seats: []
        };
        setConfig(newTransportState);
        onSave({ 
            ...trip.operationalData, 
            transport: newTransportState
        });
    };

    const handleSaveCustomVehicle = (e: React.FormEvent) => {
        e.preventDefault();
        const newConfig: VehicleLayoutConfig = {
            type: 'CUSTOM',
            label: customVehicleData.label || 'Veículo Personalizado',
            totalSeats: customVehicleData.totalSeats,
            cols: customVehicleData.cols,
            aisleAfterCol: Math.floor(customVehicleData.cols / 2)
        };
        
        const newTransportState: TransportConfig = {
            vehicleConfig: newConfig,
            seats: []
        };
        setConfig(newTransportState);
        onSave({ ...trip.operationalData, 
            transport: newTransportState
        });
        setShowCustomVehicleForm(false);
    };

    const bookingPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const client = clients.find(c => c.id === b.clientId);
        return Array.from({ length: b.passengers }).map((_, i) => ({
            id: `${b.id}-${i}`,
            bookingId: b.id,
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i + 1} (${client?.name || ''})`, 
        }));
    });

    const allPassengers = [
        ...bookingPassengers,
        ...manualPassengers.map(p => ({ id: p.id, bookingId: p.id, name: p.name }))
    ];

    const isSeatOccupied = (seatNum: string) => config.seats.find(s => s.seatNumber === seatNum);

    const handleSeatClick = (seatNum: string) => {
        const existingSeat = isSeatOccupied(seatNum);

        if (existingSeat) {
            setSeatToDelete({ seatNum, name: existingSeat.passengerName });
        } else if (selectedPassenger) {
            const newSeat: PassengerSeat = {
                seatNumber: seatNum,
                passengerName: selectedPassenger.name,
                bookingId: selectedPassenger.bookingId,
                status: 'occupied'
            };
            const newConfig = { ...config, seats: [...config.seats, newSeat] };
            setConfig(newConfig);
            onSave({ ...trip.operationalData, transport: newConfig });
            setSelectedPassenger(null);
        }
    };

    const confirmRemoveSeat = () => {
        if (!seatToDelete) return;
        const newSeats = config.seats.filter(s => s.seatNumber !== seatToDelete.seatNum);
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig);
        onSave({ ...trip.operationalData, transport: newConfig });
        setSeatToDelete(null);
    };

    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    const renderBusLayout = () => {
        if (!config.vehicleConfig) return null;

        const { totalSeats, cols, aisleAfterCol } = config.vehicleConfig;
        const rows = Math.ceil(totalSeats / cols);
        const grid: React.ReactElement[] = []; 

        for (let r = 1; r <= rows; r++) {
            const rowSeats: React.ReactElement[] = []; 
            
            for (let c = 1; c <= cols; c++) {
                const seatNum = ((r - 1) * cols) + c;
                
                if (c === aisleAfterCol + 1) {
                    rowSeats.push(<div key={`aisle-${r}-${c}`} className="w-8 flex justify-center items-center text-xs text-slate-300 font-mono select-none">{r}</div>); 
                }

                if (seatNum <= totalSeats) {
                    const seatStr = seatNum.toString();
                    const occupant = isSeatOccupied(seatStr);
                    
                    rowSeats.push(
                        <button 
                            key={seatNum} 
                            onClick={() => handleSeatClick(seatStr)}
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all border-2 shadow-sm relative group
                                ${occupant 
                                    ? 'bg-primary-600 text-white border-primary-700 shadow-primary-500/30' 
                                    : selectedPassenger 
                                        ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:scale-105 cursor-pointer border-dashed' 
                                        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-50'
                                }
                            `}
                            title={occupant ? occupant.passengerName : `Poltrona ${seatNum}`}
                        >
                            <User size={16} className={`mb-0.5 ${occupant ? 'fill-current' : ''}`}/>
                            <span className="text-[10px]">{seatNum}</span>
                            {occupant && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {occupant.passengerName}
                                </div>
                            )}
                        </button>
                    );
                } else {
                    rowSeats.push(<div key={`empty-${seatNum}`} className="w-10 h-10 md:w-12 md:h-12"></div>);
                }
            }

            grid.push(
                <div key={`row-${r}`} className="flex justify-center items-center gap-2 mb-3">
                    {rowSeats}
                </div>
            );
        }
        return grid;
    };

    const occupancyRate = config.vehicleConfig && config.vehicleConfig.totalSeats > 0 
        ? (config.seats.length / config.vehicleConfig.totalSeats) * 100 
        : 0;

    if (!config.vehicleConfig) {
        return (
            <div className="flex-1 h-full bg-slate-50 flex flex-col items-center justify-center p-8 animate-[fadeIn_0.3s]">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-2xl w-full text-center">
                    
                    {!showCustomVehicleForm ? (
                        <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600">
                                <Settings2 size={32}/>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure o Transporte</h2>
                            <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                Escolha um modelo padrão ou crie um layout personalizado para seu veículo.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.values(VEHICLE_TYPES).map(v => (
                                    <button 
                                        key={v.type}
                                        onClick={() => handleSelectVehicleType(v.type)}
                                        className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 hover:shadow-md transition-all group bg-white"
                                    >
                                        <Truck size={24} className="mb-3 text-gray-400 group-hover:text-primary-600"/>
                                        <span className="font-bold text-gray-700 group-hover:text-primary-700 text-sm">{v.label}</span>
                                        <span className="text-xs text-gray-400 mt-1">{v.totalSeats > 0 ? `${v.totalSeats} Lugares` : 'Definir'}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleSaveCustomVehicle} className="text-left max-w-sm mx-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Veículo Personalizado</h3>
                                <button type="button" onClick={() => setShowCustomVehicleForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Veículo</label>
                                    <input 
                                        required
                                        value={customVehicleData.label} 
                                        onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" 
                                        placeholder="Ex: Doblo Prata, Carro do Guia, Van Alugada"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade de Lugares</label>
                                    <input 
                                        type="number"
                                        required
                                        min="1"
                                        max="100"
                                        value={customVehicleData.totalSeats} 
                                        onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" 
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Insira o número exato de assentos disponíveis.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Disposição Visual</label>
                                    <select 
                                        value={customVehicleData.cols} 
                                        onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" 
                                    >
                                        <option value={2}>2 Colunas (Carros / Vans Pequenas)</option>
                                        <option value={3}>3 Colunas (Vans Médias / Executivas)</option>
                                        <option value={4}>4 Colunas (Ônibus)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Como os assentos serão desenhados na tela.</p>
                                </div>
                                <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg mt-4 flex items-center justify-center gap-2">
                                    <Check size={18} /> Criar Layout
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden bg-white">
            <ConfirmationModal 
                isOpen={!!seatToDelete} 
                onClose={() => setSeatToDelete(null)} 
                onConfirm={confirmRemoveSeat} 
                title="Liberar Assento" 
                message={`Deseja remover ${seatToDelete?.name} da poltrona ${seatToDelete?.seatNum}?`} 
                confirmText="Liberar"
                variant="warning"
            />

            <div className="w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Lista de Passageiros</h4>
                    <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors" title="Adicionar Manual"><Plus size={18}/></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                    <div className="space-y-2">
                        {allPassengers.map(p => {
                            const isSeated = config.seats.some(s => s.bookingId === p.bookingId && s.passengerName === p.name);
                            return (
                                <div 
                                    key={p.id} 
                                    onClick={() => !isSeated && setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)}
                                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between group ${isSeated ? 'bg-gray-50 border-gray-100 opacity-60' : selectedPassenger?.id === p.id ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 shadow-sm' : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSeated ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>{p.name.charAt(0).toUpperCase()}</div>
                                        <span className={`truncate ${isSeated ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>{p.name}</span>
                                    </div>
                                    {isSeated ? <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">OK</div> : <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-primary-400 transition-colors"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-xs font-bold text-gray-600 z-20 flex items-center gap-2">
                    <Truck size={14} /> {config.vehicleConfig?.label}
                    <span className="w-px h-4 bg-gray-300 mx-1"></span>
                    <span className={occupancyRate >= 80 ? 'text-green-600' : 'text-gray-500'}>{occupancyRate.toFixed(0)}% Ocupado</span>
                    <button 
                        onClick={() => {
                            if(window.confirm('Isso irá resetar o layout do veículo. Deseja continuar?')) {
                                setConfig({ vehicleConfig: null, seats: [] });
                                onSave({ ...trip.operationalData, transport: undefined });
                            }
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500"
                        title="Trocar Veículo"
                    >
                        <Settings size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide">
                    <div className="w-full max-w-lg pb-20">
                        <div className="bg-white px-6 md:px-12 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative transition-all duration-500 min-h-[600px]">
                            <div className="absolute top-0 left-0 right-0 h-28 border-b-2 border-slate-200 rounded-t-[34px] bg-gradient-to-b from-slate-50 to-white flex justify-between px-8 pt-6">
                                <div className="flex flex-col items-center justify-center opacity-50">
                                    <div className="w-10 h-10 rounded-full border-4 border-slate-300 flex items-center justify-center text-slate-300 bg-slate-50 shadow-inner mb-1"><User size={20} /></div>
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Frente</span>
                                </div>
                                <div className="w-10"></div> 
                            </div>
                            <div className="mt-16 space-y-2">{renderBusLayout()}</div>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface RoomingManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void;
}

const RoomingManager: React.FC<RoomingManagerProps> = ({ trip, bookings, clients, onSave }) => {
    const [rooms, setRooms] = useState<RoomConfig[]>(trip.operationalData?.rooming || []);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [showAddRoomModal, setShowAddRoomModal] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);

    const bookingPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const client = clients.find(c => c.id === b.clientId);
        return Array.from({ length: b.passengers }).map((_, i) => ({
            id: `${b.id}-${i}`,
            bookingId: b.id,
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i + 1} (${client?.name || ''})`, 
        }));
    });

    const allPassengers = [
        ...bookingPassengers,
        ...manualPassengers.map(p => ({ id: p.id, bookingId: p.id, name: p.name }))
    ];

    const getAssignedPassengers = () => {
        const assignedIds = new Set<string>();
        rooms.forEach(r => r.guests.forEach(g => assignedIds.add(g.name + g.bookingId)));
        return assignedIds;
    };

    const assignedSet = getAssignedPassengers();
    const unassignedPassengers = allPassengers.filter(p => !assignedSet.has(p.name + p.bookingId));

    const addRoom = (name: string, capacity: number, type: 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE' = 'COLLECTIVE') => {
        const newRoom: RoomConfig = {
            id: crypto.randomUUID(),
            name,
            type,
            capacity,
            guests: []
        };
        const updatedRooms = [...rooms, newRoom];
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
    };

    const handleCreateCustomRoom = (name: string, capacity: number) => addRoom(name, capacity);
    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    const assignPassengerToRoom = (roomId: string) => {
        if (!selectedPassenger) return;
        const updatedRooms = rooms.map(r => {
            if (r.id === roomId) {
                if (r.guests.length >= r.capacity) { alert('Quarto cheio!'); return r; }
                return { ...r, guests: [...r.guests, { name: selectedPassenger.name, bookingId: selectedPassenger.bookingId }] };
            }
            return r;
        });
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
        setSelectedPassenger(null);
    };

    const removeGuest = (roomId: string, guestIndex: number) => {
        const updatedRooms = rooms.map(r => {
            if (r.id === roomId) {
                const newGuests = [...r.guests];
                newGuests.splice(guestIndex, 1);
                return { ...r, guests: newGuests };
            }
            return r;
        });
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
    };

    const confirmDeleteRoom = () => {
        if(roomToDelete) {
            const updatedRooms = rooms.filter(r => r.id !== roomToDelete);
            setRooms(updatedRooms);
            onSave({ ...trip.operationalData, rooming: updatedRooms });
            setRoomToDelete(null);
        }
    };

    const updateRoomDetails = (id: string, name: string, capacity: number) => {
        const updatedRooms = rooms.map(r => r.id === id ? { ...r, name, capacity } : r);
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
        setEditingRoomId(null);
    };

    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupied = rooms.reduce((sum, r) => sum + r.guests.length, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!roomToDelete} onClose={() => setRoomToDelete(null)} onConfirm={confirmDeleteRoom} title="Excluir Quarto" message="Tem certeza que deseja excluir este quarto? Os hóspedes serão removidos." />
            <AddRoomModal isOpen={showAddRoomModal} onClose={() => setShowAddRoomModal(false)} onConfirm={handleCreateCustomRoom} />

            <div className="bg-slate-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between text-xs">
                <div className="flex gap-4 text-gray-600">
                    <span className="font-bold">Capacidade Hotel: <span className="text-gray-900">{totalCapacity}</span></span>
                    <span>Ocupado: <span className="font-bold text-blue-600">{totalOccupied}</span></span>
                    <span>Livre: <span className="font-bold text-green-600">{totalCapacity - totalOccupied}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${occupancyRate}%` }}></div>
                    </div>
                    <span className="font-bold text-gray-700">{occupancyRate}%</span>
                </div>
            </div>

            <div className="flex gap-3 mb-2 overflow-x-auto pb-2 flex-shrink-0 items-center px-6 pt-4">
                <button onClick={() => setShowAddRoomModal(true)} className="bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 shadow-md shadow-primary-500/30 transition-all flex items-center gap-2 text-sm font-bold active:scale-95 whitespace-nowrap"><Plus size={18}/> Novo Quarto</button>
                <div className="h-8 w-px bg-gray-300 mx-2"></div>
                {/* FIX: Explicitly call addRoom with type and room length */}
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 2, 'DOUBLE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Duplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 3, 'TRIPLE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Triplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 4, 'QUAD')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Quádruplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 5, 'COLLECTIVE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Quíntuplo</button>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-0 h-full overflow-hidden border-t border-gray-100">
                <div className="w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Hóspedes ({unassignedPassengers.length})</h4>
                        <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"><Plus size={18}/></button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                         {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                        <div className="space-y-2">
                            {unassignedPassengers.map(p => (
                                <div key={p.id} onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)} className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between group ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white border-primary-600 shadow-md transform scale-[1.02]' : 'bg-white border-gray-200 hover:border-primary-300 text-gray-700 hover:shadow-sm'}`}>
                                    <span className="font-medium truncate">{p.name}</span>
                                    {selectedPassenger?.id === p.id ? <CheckCircle size={16} className="text-white"/> : <div className="w-2 h-2 bg-gray-300 rounded-full group-hover:bg-primary-400"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 h-full custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                        {rooms.map(room => (
                            <div key={room.id} onClick={() => selectedPassenger && assignPassengerToRoom(room.id)} className={`bg-white rounded-xl border transition-all relative h-fit shadow-sm group overflow-hidden ${selectedPassenger && room.guests.length < room.capacity ? 'border-primary-400 ring-2 ring-primary-100 cursor-pointer hover:shadow-lg scale-[1.01]' : 'border-gray-200'}`}>
                                <div className="p-3 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${room.guests.length >= room.capacity ? 'bg-green-100 text-green-600' : 'bg-white border border-gray-200 text-gray-400'}`}><BedDouble size={18}/></div>
                                        <div>
                                            {editingRoomId === room.id ? (
                                                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                                    <input defaultValue={room.name} className="text-sm border rounded p-1 w-28" id={`name-${room.id}`} />
                                                    <input type="number" defaultValue={room.capacity} className="text-xs border rounded p-1 w-16" id={`cap-${room.id}`} />
                                                    <button onClick={() => { const nameInput = document.getElementById(`name-${room.id}`) as HTMLInputElement; const capInput = document.getElementById(`cap-${room.id}`) as HTMLInputElement; const name = nameInput.value; const cap = parseInt(capInput.value); updateRoomDetails(room.id, name, cap); }} className="text-xs bg-primary-600 text-white rounded px-2 py-1 mt-1">Salvar</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h5 className="font-bold text-gray-800 text-sm">{room.name}</h5>
                                                    <div className="flex items-center gap-1.5 mt-0.5"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${room.guests.length >= room.capacity ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{room.guests.length}/{room.capacity}</span><span className="text-[10px] text-gray-400 uppercase font-bold">Vagas</span></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingRoomId(room.id); }} className="text-gray-400 hover:text-primary-500 p-1.5 rounded hover:bg-white"><Edit size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setRoomToDelete(room.id); }} className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-white"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <div className="p-3 space-y-2 min-h-[100px]">
                                    {room.guests.map((guest, idx) => (
                                        <div key={idx} className="bg-blue-50 px-3 py-2 rounded-lg text-xs text-blue-900 font-medium flex justify-between items-center group/guest border border-blue-100 animate-[fadeIn_0.2s]">
                                            <span className="truncate max-w-[85%] flex items-center gap-2"><User size={12} className="text-blue-400"/>{guest.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); removeGuest(room.id, idx); }} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100 transition-opacity"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {Array.from({ length: Math.max(0, room.capacity - room.guests.length) }).map((_, i) => (
                                        <div key={i} className="border-2 border-dashed border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-300 flex items-center justify-center gap-1 select-none"><Plus size={12}/> Vaga Disponível</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// NEW: OperationsModule
interface OperationsModuleProps {
    myTrips: Trip[];
    myBookings: Booking[];
    clients: any[];
    selectedTripId: string | null;
    onSelectTrip: (id: string | null) => void;
    onSaveTripData: (tripId: string, data: OperationalData) => void;
}

const OperationsModule: React.FC<OperationsModuleProps> = ({ myTrips, myBookings, clients, selectedTripId, onSelectTrip, onSaveTripData }) => {
    const [activeView, setActiveView] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');
    
    // Using React.useMemo since useMemo might not be imported in destructured list
    const selectedTrip = React.useMemo(() => myTrips.find(t => t.id === selectedTripId), [myTrips, selectedTripId]);
    
    const tripBookings = React.useMemo(() => 
        selectedTripId ? myBookings.filter(b => b.tripId === selectedTripId && b.status === 'CONFIRMED') : [], 
    [myBookings, selectedTripId]);

    if (!selectedTripId) {
        return (
            <div className="flex h-full min-h-[500px]">
                <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Selecione uma Viagem</div>
                    {myTrips.filter(t => t.is_active).map(trip => (
                        <div 
                            key={trip.id} 
                            onClick={() => onSelectTrip(trip.id)}
                            className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div className="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{trip.title}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Calendar size={12}/> {new Date(trip.startDate).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {myTrips.filter(t => t.is_active).length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">Nenhuma viagem ativa encontrada.</div>
                    )}
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center text-gray-400 flex-col">
                    <Bus size={48} className="mb-4 opacity-50"/>
                    <p>Selecione uma viagem para gerenciar o operacional.</p>
                </div>
            </div>
        );
    }

    if (!selectedTrip) return null;

    return (
        <div className="flex flex-col h-full min-h-[600px]">
            <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-6">
                <button onClick={() => setActiveView('TRANSPORT')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'TRANSPORT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Bus size={18}/> Transporte</button>
                <button onClick={() => setActiveView('ROOMING')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeView === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><BedDouble size={18}/> Rooming List</button>
                <div className="ml-auto flex items-center gap-2 text-sm text-gray-500"><span className="font-bold text-gray-900">{tripBookings.reduce((acc, b) => acc + b.passengers, 0)}</span> Passageiros Confirmados</div>
            </div>
            <div className="flex-1 overflow-hidden relative">
                {activeView === 'TRANSPORT' ? <TransportManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)}/> : <RoomingManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)}/>}
            </div>
        </div>
    );
};

const AgencyDashboard: React.FC = () => {
  const { user, logout, loading: authLoading, updateUser } = useAuth(); // FIX: Destructure updateUser
  const { agencies, bookings, trips: allTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencySubscription, agencyReviews, getAgencyStats, getAgencyTheme, saveAgencyTheme, updateTripOperationalData, clients } = useData(); // FIX: Destructure all needed from useData
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as string) || 'OVERVIEW';
  const { setAgencyTheme: setGlobalAgencyTheme } = useTheme();

  const currentAgency = agencies.find(a => a.id === user?.id);
  const navigate = useNavigate();
  
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [selectedOperationalTripId, setSelectedOperationalTripId] = useState<string | null>(null);
  const [tripViewMode, setTripViewMode] = useState<'GRID' | 'TABLE'>('GRID');

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
  
  const handleEditTrip = (trip: Trip) => { 
      const opData = trip.operationalData || DEFAULT_OPERATIONAL_DATA;
      setTripForm({ ...trip, operationalData: opData }); 
      setEditingTripId(trip.id); 
      setIsEditingTrip(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const handleDeleteTrip = async (id: string) => { if (window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) { await deleteTrip(id); showToast('Pacote excluído.', 'success'); } };
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
          await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', showConfirmSubscription.id as 'BASIC' | 'PREMIUM', new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()); 
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
    { label: 'Gerenciar Operacional', icon: Bus, onClick: () => setSelectedOperationalTripId(trip.id) },
    { label: 'Duplicar', icon: Copy, onClick: () => handleDuplicateTrip(trip) },
    { label: trip.is_active ? 'Pausar' : 'Publicar', icon: trip.is_active ? PauseCircle : PlayCircle, onClick: () => toggleTripStatus(trip.id) },
    { label: 'Excluir', icon: Trash2, onClick: () => handleDeleteTrip(trip.id), variant: 'danger' as const }
  ];

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

      {selectedOperationalTripId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              <div className="bg-white rounded-2xl max-w-7xl w-full h-[95vh] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedOperationalTripId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full z-50"><X size={20}/></button>
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center"><Truck size={20}/></div>
                      <h2 className="text-xl font-bold text-gray-900">Gerenciar Operacional: {myTrips.find(t => t.id === selectedOperationalTripId)?.title}</h2>
                  </div>
                  <OperationsModule 
                      myTrips={myTrips} 
                      myBookings={myBookings} 
                      clients={clients} 
                      selectedTripId={selectedOperationalTripId} 
                      onSelectTrip={setSelectedOperationalTripId}
                      onSaveTripData={updateTripOperationalData}
                  />
              </div>
          </div>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Reservas ({myBookings.length})</h2>
              {myBookings.length > 0 ? (
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50/50">
                              <tr>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider"># Reserva</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pacote</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Total</th>
                                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                              {myBookings.map(booking => {
                                  const client = clients.find(c => c.id === booking.clientId);
                                  return (
                                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4 font-mono text-xs text-gray-700">{booking.voucherCode}</td>
                                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{booking._trip?.title || 'N/A'}</td>
                                          <td className="px-6 py-4 text-sm text-gray-700">{client?.name || 'Cliente Desconhecido'}</td>
                                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                                          <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td>
                                          <td className="px-6 py-4">
                                              <Badge color={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>{booking.status}</Badge>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="text-center py-16 text-gray-400 text-sm">
                      <ShoppingBag size={32} className="mx-auto mb-3" />
                      <p>Nenhuma reserva encontrada. Comece a vender!</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'OPERATIONS' && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Bus size={24}/> Gerenciar Operacional</h2>
                  <p className="text-gray-600 mb-4">Organize seus passageiros em assentos e quartos para cada viagem.</p>
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-start gap-3">
                    <Info size={20} className="flex-shrink-0 mt-0.5"/>
                    <p className="text-sm">
                        Selecione uma viagem na barra lateral para começar a configurar o layout do transporte e a lista de quartos.
                        As alterações são salvas automaticamente.
                    </p>
                  </div>
              </div>
              <OperationsModule 
                  myTrips={myTrips} 
                  myBookings={myBookings} 
                  clients={clients} 
                  selectedTripId={selectedOperationalTripId} 
                  onSelectTrip={setSelectedOperationalTripId}
                  onSaveTripData={updateTripOperationalData}
              />
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

                              <div className="mt-4 pt-4 border-t border-gray-100">
                                  {review.response ? (
                                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Sua Resposta:</h4>
                                          <p className="text-sm text-gray-700 italic">"{review.response}"</p>
                                      </div>
                                  ) : (
                                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2">
                                          <MessageCircle size={16}/> Responder Avaliação
                                      </button>
                                  )}
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

      {activeTab === 'PROFILE' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Gerenciar Meu Perfil</h2>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label><input value={profileForm.name || ''} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp || ''} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone Fixo</label><input value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Website</label><input value={profileForm.website || ''} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="https://suaagencia.com.br" /></div>
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
                                      <label className="block text-sm font-bold text-gray-700 mb-1">URL da Imagem do Hero</label>
                                      <input value={heroForm.heroBannerUrl || ''} onChange={e => setHeroForm({...heroForm, heroBannerUrl: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="https://suaagencia.com/banner.jpg" />
                                      {heroForm.heroBannerUrl && <img src={heroForm.heroBannerUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mt-3 border border-gray-200" />}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalizar Tema do Meu Microsite</h2>
              <form onSubmit={handleSaveTheme} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                          <div className="flex items-center gap-2">
                              <input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-8 h-8 rounded-full border" />
                              <input value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                          <div className="flex items-center gap-2">
                              <input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-8 h-8 rounded-full border" />
                              <input value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500" />
                          </div>
                      </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-700 flex items-start gap-3">
                      <Info size={20} className="flex-shrink-0 mt-0.5"/>
                      <p className="text-sm">
                          Estas cores serão aplicadas apenas na sua página de agência (microsite). O tema padrão da ViajaStore permanecerá o mesmo no marketplace principal.
                      </p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                      {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Salvar Tema
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export { AgencyDashboard };
