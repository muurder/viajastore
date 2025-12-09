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
  LogOut, Globe, Trash2, CheckCircle, ChevronDown, MessageCircle, Info, Palette, Search, LucideProps, Zap, Camera, Upload, FileDown, Building, Armchair, MousePointer2, RefreshCw, Archive, ArchiveRestore, Trash, Ban, Send, ArrowRight, CornerDownRight, Menu, ChevronLeft, Edit3, Phone, Briefcase
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CreateTripWizard from '../components/agency/CreateTripWizard';
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

const ConfirmationModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; variant?: 'danger' | 'warning' | 'info' }> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', variant = 'danger' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${variant === 'danger' ? 'bg-red-100 text-red-600' : variant === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <AlertTriangle size={24}/>
                </div>
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-sm text-gray-600">{message}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white rounded-lg font-bold transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}>{confirmText}</button>
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

const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings, clients }) => {
    const recentBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [bookings]);

    const isNew = (date: string) => {
        return (new Date().getTime() - new Date(date).getTime()) < 24 * 60 * 60 * 1000;
    };

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
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null); // For vehicle edit modal
    
    // UI States
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    
    // Passenger Edit Modal State
    const [editingPassenger, setEditingPassenger] = useState<{id: string, name: string} | null>(null);
    const [passengerForm, setPassengerForm] = useState({ name: '', doc: '', phone: '', email: '' });

    // Config Mode
    const [showCustomVehicleForm, setShowCustomVehicleForm] = useState(false);
    const [customVehicleData, setCustomVehicleData] = useState({ label: '', totalSeats: 4, cols: 2 });
    const [filterText, setFilterText] = useState('');

    const { showToast } = useToast();

    // Data Migration & Initialization Effect
    useEffect(() => {
        if (legacyTransport?.vehicles && legacyTransport.vehicles.length > 0) {
            // New structure exists
            setVehicles(legacyTransport.vehicles);
            if (!activeVehicleId) setActiveVehicleId(legacyTransport.vehicles[0].id);
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
            setActiveVehicleId(migratedVehicle.id);
        }
    }, [trip.operationalData]); 

    // Derived State: Active Vehicle
    const activeVehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);

    // Access passengerDetails safely from operationalData
    const passengerDetails = trip.operationalData?.passengerDetails || {};

    // Derived Passengers List
    const nameOverrides = trip.operationalData?.passengerNameOverrides || {};
    
    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                // Priority: Details > Overrides > Calculated
                const details = passengerDetails[id];
                const displayName = details?.name || nameOverrides[id] || (i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`);
                
                return { id, bookingId: b.id, name: displayName, isManual: false, details: details || {} };
            });
        });
        const manual = manualPassengers.map(p => ({
            id: p.id, bookingId: p.id, name: nameOverrides[p.id] || p.name, isManual: true, details: {}
        }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides, passengerDetails]);

    // Global Assignment Map
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
        setVehicles(updatedVehicles);
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
        
        const cleanedVehicles = vehicles.map(v => ({
            ...v,
            seats: v.seats.filter(s => s.bookingId !== passenger.id)
        }));

        const targetVehicleIndex = cleanedVehicles.findIndex(v => v.id === activeVehicle.id);
        if (targetVehicleIndex === -1) return;

        const newSeat: PassengerSeat = {
            seatNumber: seatNum,
            passengerName: passenger.name,
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
        setSeatToDelete(null);
    };

    const handleDeleteVehicle = (vehicleId: string) => {
        if(window.confirm('Tem certeza que deseja remover este veículo? Todos os passageiros serão desvinculados.')) {
            const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
            saveVehicles(updatedVehicles);
            if (activeVehicleId === vehicleId) {
                setActiveVehicleId(updatedVehicles[0]?.id || null);
            }
        }
    };

    // --- Vehicle Management (Add/Edit) ---
    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') { 
            setCustomVehicleData({ label: '', totalSeats: 4, cols: 2 }); // Reset for new
            setEditingVehicleId(null);
            setShowCustomVehicleForm(true); 
            setShowAddMenu(false);
            return; 
        }
        
        const config = VEHICLE_TYPES[type];
        const newVehicle: VehicleInstance = {
            id: `v-${Date.now()}`,
            name: `${config.label.split(' ')[0]} ${vehicles.length + 1}`,
            type,
            config,
            seats: []
        };
        
        const updatedVehicles = [...vehicles, newVehicle];
        saveVehicles(updatedVehicles);
        setActiveVehicleId(newVehicle.id);
        setShowAddMenu(false);
    };

    const handleEditVehicle = (vehicle: VehicleInstance) => {
        setCustomVehicleData({
            label: vehicle.name,
            totalSeats: vehicle.config.totalSeats,
            cols: vehicle.config.cols
        });
        setEditingVehicleId(vehicle.id);
        setShowCustomVehicleForm(true);
    };

    const handleSaveCustomVehicle = (e: React.FormEvent) => {
        e.preventDefault();
        
        const config: VehicleLayoutConfig = { 
            type: 'CUSTOM', 
            label: customVehicleData.label || 'Veículo Personalizado', 
            totalSeats: customVehicleData.totalSeats, 
            cols: customVehicleData.cols, 
            aisleAfterCol: Math.floor(customVehicleData.cols / 2) 
        };

        if (editingVehicleId) {
            // Update existing
            const updatedVehicles = vehicles.map(v => {
                if (v.id === editingVehicleId) {
                    return {
                        ...v,
                        name: customVehicleData.label || v.name,
                        config
                    };
                }
                return v;
            });
            saveVehicles(updatedVehicles);
        } else {
            // Create new
            const newVehicle: VehicleInstance = {
                id: `v-${Date.now()}`,
                name: customVehicleData.label || `Veículo ${vehicles.length + 1}`,
                type: 'CUSTOM',
                config,
                seats: []
            };
            const updatedVehicles = [...vehicles, newVehicle];
            saveVehicles(updatedVehicles);
            setActiveVehicleId(newVehicle.id);
        }
        
        setShowCustomVehicleForm(false);
        setEditingVehicleId(null);
    };
    
    // --- Passenger Details Edit ---
    const handleOpenPassengerEdit = (p: any) => {
        setEditingPassenger({ id: p.id, name: p.name });
        // Load existing details or blank
        const details = passengerDetails[p.id];
        setPassengerForm({
            name: details?.name || p.name,
            doc: details?.doc || '',
            phone: details?.phone || '',
            email: details?.email || ''
        });
    };

    const handleSavePassengerDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPassenger) return;

        const newDetails = { ...passengerDetails, [editingPassenger.id]: passengerForm };
        onSave({ ...(trip.operationalData || {}), passengerDetails: newDetails }); // Save to generic bag
        setEditingPassenger(null);
        showToast('Dados do passageiro salvos.', 'success');
    };

    const openWhatsApp = (phone: string) => {
        const num = phone.replace(/\D/g, '');
        if (num) window.open(`https://wa.me/${num}`, '_blank');
    };

    // Drag & Drop
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

    // Render Bus Grid
    const renderBusLayout = () => {
        if (!activeVehicle) return null;
        const { totalSeats, cols, aisleAfterCol } = activeVehicle.config;
        const rows = Math.ceil(totalSeats / cols);
        const grid = [];

        for (let r = 1; r <= rows; r++) {
            const rowSeats = [];
            for (let c = 1; c <= cols; c++) {
                const seatNum = ((r - 1) * cols) + c;
                if (c === aisleAfterCol + 1) rowSeats.push(<div key={`aisle-${r}`} className="w-8 flex justify-center items-center text-xs text-gray-300 font-mono select-none">{r}</div>);
                
                if (seatNum <= totalSeats) {
                    const seatStr = seatNum.toString();
                    const occupant = isSeatOccupied(seatStr);
                    const isTarget = dragOverSeat === seatStr || (selectedPassenger && !occupant);
                    
                    rowSeats.push(
                        <div
                            key={seatNum}
                            onDragOver={(e) => { e.preventDefault(); if(!occupant) setDragOverSeat(seatStr); }}
                            onDragLeave={() => setDragOverSeat(null)}
                            onDrop={(e) => { e.preventDefault(); setDragOverSeat(null); if(!occupant) handleDrop(e, seatStr); }}
                            onClick={() => handleSeatClick(seatStr)}
                            className={`
                                relative w-12 h-12 flex flex-col items-center justify-center transition-all duration-200
                                ${occupant ? 'cursor-pointer text-primary-600' : isTarget ? 'cursor-pointer scale-110 text-green-500 bg-green-50 rounded-lg shadow-sm border border-green-200' : 'cursor-pointer text-gray-300 hover:text-gray-400'}
                            `}
                            title={occupant ? occupant.passengerName : `Poltrona ${seatNum}`}
                        >
                            <Armchair size={40} className={`transition-all ${occupant ? 'fill-primary-100 stroke-primary-600' : isTarget ? 'fill-green-50 stroke-green-500' : 'fill-white stroke-current'}`} strokeWidth={1.5} />
                            <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold ${occupant ? 'text-primary-700' : 'text-gray-400'}`}>
                                {occupant ? occupant.passengerName.substring(0,2).toUpperCase() : seatNum}
                            </span>
                            {occupant && <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow opacity-0 hover:opacity-100 pointer-events-none whitespace-nowrap z-10">{occupant.passengerName}</div>}
                        </div>
                    );
                } else {
                    rowSeats.push(<div key={`empty-${seatNum}`} className="w-12 h-12"></div>);
                }
            }
            grid.push(<div key={`row-${r}`} className="flex justify-center items-center gap-1 mb-2">{rowSeats}</div>);
        }
        return grid;
    };

    // If no vehicles, show empty state selection
    if (vehicles.length === 0) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-50 animate-[fadeIn_0.3s]">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-2xl w-full text-center">
                    {!showCustomVehicleForm ? (
                        <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600"><Settings2 size={32}/></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Adicione o Primeiro Veículo</h2>
                            <p className="text-gray-500 mb-6">Escolha o tipo de transporte para começar a organizar sua frota.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                {Object.values(VEHICLE_TYPES).map(v => (
                                    <button key={v.type} onClick={() => handleSelectVehicleType(v.type)} className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all">
                                        <Truck size={24} className="mb-3 text-gray-400"/>
                                        <span className="font-bold text-gray-700 text-sm">{v.label}</span>
                                        <span className="text-xs text-gray-400 mt-1">{v.totalSeats > 0 ? `${v.totalSeats} Lugares` : 'Definir'}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleSaveCustomVehicle} className="text-left max-w-sm mx-auto">
                             <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Veículo Personalizado</h3><button type="button" onClick={() => setShowCustomVehicleForm(false)}><X size={20}/></button></div>
                             <div className="space-y-4">
                                <div><label className="text-sm font-bold">Nome</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border p-2 rounded"/></div>
                                <div><label className="text-sm font-bold">Lugares</label><input type="number" required value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"/></div>
                                <div><label className="text-sm font-bold">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
                                <button className="w-full bg-primary-600 text-white py-2 rounded font-bold">Criar</button>
                             </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }
    
    const assignedCount = globalAssignmentMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Remover ${seatToDelete?.name}?`} variant="warning" />
            
            {/* Passenger Edit Modal */}
            {editingPassenger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Editar Passageiro</h3>
                            <button onClick={() => setEditingPassenger(null)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleSavePassengerDetails} className="space-y-3">
                            <div><label className="text-xs font-bold uppercase text-gray-500">Nome Completo</label><input value={passengerForm.name} onChange={e => setPassengerForm({...passengerForm, name: e.target.value})} className="w-full border p-2 rounded-lg text-sm" autoFocus /></div>
                            <div><label className="text-xs font-bold uppercase text-gray-500">Documento (RG/CPF)</label><input value={passengerForm.doc} onChange={e => setPassengerForm({...passengerForm, doc: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="Ex: 123.456.789-00" /></div>
                            <div><label className="text-xs font-bold uppercase text-gray-500">Telefone / WhatsApp</label>
                                <div className="flex gap-2">
                                    <input value={passengerForm.phone} onChange={e => setPassengerForm({...passengerForm, phone: e.target.value})} className="w-full border p-2 rounded-lg text-sm" placeholder="(11) 99999-9999" />
                                    {passengerForm.phone && (
                                        <button type="button" onClick={() => openWhatsApp(passengerForm.phone)} className="bg-green-100 text-green-600 p-2 rounded-lg hover:bg-green-200" title="Abrir WhatsApp"><MessageCircle size={18}/></button>
                                    )}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg hover:bg-primary-700 mt-2">Salvar Dados</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-full lg:w-80 border-r border-gray-200 bg-white flex flex-col h-full shadow-sm z-10 flex-shrink-0">
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
                        const accompanyMatch = p.name.match(/^Acompanhante (\d+) \((.*)\)$/);
                        const isSelected = selectedPassenger?.id === p.id;
                        
                        return (
                            <div 
                                key={p.id} 
                                draggable={!isAssigned} 
                                onDragStart={(e) => handleDragStart(e, p)} 
                                onClick={() => !isAssigned && setSelectedPassenger(isSelected ? null : p)} 
                                className={`
                                    p-3 rounded-lg border text-sm flex items-center justify-between group select-none transition-all relative
                                    ${isAssigned ? 'bg-green-50/50 border-green-200 opacity-90 cursor-default' : 'bg-white border-gray-200 hover:border-primary-300 cursor-grab active:cursor-grabbing'}
                                    ${isSelected ? 'bg-primary-600 border-primary-600 shadow-md ring-2 ring-primary-100 !text-white' : 'text-gray-500'}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {!isAssigned && <Grip size={12} className={isSelected ? 'text-white/50' : 'text-gray-300'}/>}
                                    {isAssigned && <CheckCircle size={14} className="text-green-600 flex-shrink-0"/>}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{p.name.charAt(0).toUpperCase()}</div>
                                    
                                    {accompanyMatch ? (
                                        <div className="min-w-0 flex flex-col">
                                            <span className={`font-bold text-sm truncate leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                                {p.name.includes('Acompanhante') ? `Acompanhante ${accompanyMatch[1]}` : p.name}
                                            </span>
                                            <div className={`flex items-center text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                                <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                <span className="truncate">Via: {accompanyMatch[2]}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="min-w-0 flex flex-col">
                                            <span className={`font-bold text-sm truncate leading-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>{p.name}</span>
                                            {p.isManual ? (
                                                <div className={`flex items-center text-xs mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                                    <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                    <span className="truncate">Manual</span>
                                                </div>
                                            ) : (
                                                <div className={`flex items-center text-[10px] uppercase font-bold mt-0.5 tracking-wide ${isSelected ? 'text-white/90' : 'text-primary-600/70'}`}>
                                                    Titular
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAssigned && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded whitespace-nowrap truncate max-w-[80px]">{assignedInfo}</span>}
                                    <button onClick={(e) => { e.stopPropagation(); handleOpenPassengerEdit(p); }} className={`p-1.5 rounded-full hover:bg-white/20 transition-colors ${isSelected ? 'text-white' : 'text-gray-400 hover:text-primary-600'}`}>
                                        <Edit3 size={14}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-400 text-center">Arraste para o assento ou clique para selecionar.</div>
            </div>

            {/* Bus Area (Tabs + Map) */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                
                {/* Vehicle Tabs */}
                <div className="flex items-center bg-white border-b border-gray-200 px-4 py-2 gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
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
                                <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditVehicle(vehicle); }}
                                        className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-500"
                                        title="Editar Veículo"
                                    >
                                        <Edit3 size={12}/>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(vehicle.id); }}
                                        className="p-1 hover:bg-red-100 rounded-full text-red-400 hover:text-red-500"
                                        title="Excluir Veículo"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Add Vehicle Menu (Click-based) */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${showAddMenu ? 'bg-primary-100 text-primary-700' : 'text-primary-600 hover:bg-primary-50'}`}
                        >
                            <Plus size={14}/> Add Veículo
                        </button>
                        
                        {showAddMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)}></div>
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-[scaleIn_0.1s]">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-2">Selecione o Tipo</p>
                                    {Object.values(VEHICLE_TYPES).slice(0, 5).map(v => (
                                        <button key={v.type} onClick={() => handleSelectVehicleType(v.type)} className="w-full text-left px-2 py-1.5 hover:bg-gray-50 text-xs text-gray-700 rounded-lg flex items-center gap-2">
                                            <Truck size={12} className="text-gray-400"/> {v.label.split('(')[0]}
                                        </button>
                                    ))}
                                    <div className="border-t my-1"></div>
                                    <button onClick={() => handleSelectVehicleType('CUSTOM')} className="w-full text-left px-2 py-1.5 hover:bg-gray-50 text-xs text-primary-600 font-bold rounded-lg">Personalizado...</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Seat Map */}
                <div className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide">
                    {activeVehicle ? (
                        <div className="bg-white px-8 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative min-h-[600px] w-fit h-fit my-auto animate-[scaleIn_0.3s]">
                            <div className="absolute top-0 left-0 right-0 h-24 border-b-2 border-slate-200 bg-slate-50 flex justify-center items-center rounded-t-[34px]"><User size={24} className="text-slate-300"/></div>
                            <div className="mt-12 space-y-2 select-none">{renderBusLayout()}</div>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Selecione ou crie um veículo.</div>
                    )}
                </div>
            </div>
            
            {/* Custom Vehicle Modal */}
            {showCustomVehicleForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setShowCustomVehicleForm(false)} className="absolute top-4 right-4"><X size={20}/></button>
                        <h3 className="text-lg font-bold mb-4">{editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
                        <form onSubmit={handleSaveCustomVehicle} className="space-y-4">
                            <div><label className="text-xs font-bold uppercase">Nome</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border p-2 rounded"/></div>
                            <div><label className="text-xs font-bold uppercase">Lugares</label><input type="number" required value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"/></div>
                            <div><label className="text-xs font-bold uppercase">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border p-2 rounded"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
                            <button className="w-full bg-primary-600 text-white py-2 rounded font-bold">{editingVehicleId ? 'Salvar Alterações' : 'Criar Veículo'}</button>
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
    const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(trip.operationalData?.passengerNameOverrides || {});
    
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

    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                return { id, bookingId: b.id, name: nameOverrides[id] || (i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`), isManual: false };
            });
        });
        const manual = manualPassengers.map(p => ({ id: p.id, bookingId: p.id, name: nameOverrides[p.id] || p.name, isManual: true }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides]);

    // Global Assigned Map (Checks ALL hotels to remove from sidebar)
    const assignedMap = useMemo(() => {
        const map = new Map<string, string>();
        hotels.forEach(hotel => {
            hotel.rooms.forEach(r => r.guests.forEach(g => map.set(g.bookingId, `${hotel.name} - ${r.name}`)));
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

    const handleAddHotel = () => {
        const newHotel: HotelInstance = { id: `h-${Date.now()}`, name: `Hotel ${hotels.length + 1}`, rooms: [] };
        const updated = [...hotels, newHotel];
        saveHotels(updated);
        setActiveHotelId(newHotel.id);
    };

    const handleDeleteHotel = (hotelId: string) => {
        if (window.confirm('Excluir este local de hospedagem? Todos os passageiros alocados aqui voltarão para a lista.')) {
            const updated = hotels.filter(h => h.id !== hotelId);
            saveHotels(updated);
            if (activeHotelId === hotelId) setActiveHotelId(updated[0]?.id || null);
        }
    };

    const handleRenameHotel = (hotelId: string) => {
        setEditHotelNameId(hotelId);
        setTempHotelName(hotels.find(h => h.id === hotelId)?.name || '');
    };

    const saveHotelName = () => {
        if (editHotelNameId) {
            const updated = hotels.map(h => h.id === editHotelNameId ? { ...h, name: tempHotelName } : h);
            saveHotels(updated);
            setEditHotelNameId(null);
        }
    };

    const handleBatchCreate = () => {
        if (!activeHotel) return;
        
        const newRooms: RoomConfig[] = [];
        const capMap = { 'DOUBLE': 2, 'TRIPLE': 3, 'QUAD': 4, 'COLLECTIVE': 6 };
        
        let capacity = capMap[invType];
        if (invType === 'COLLECTIVE' && invCustomCap !== '' && Number(invCustomCap) > 0) {
            capacity = Number(invCustomCap);
        }

        const startIdx = activeHotel.rooms.length + 1;
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

    const handleAssign = (roomId: string, passenger: { id: string, name: string, bookingId: string }) => {
        if (!activeHotel) return;
        const targetRoomIndex = activeHotel.rooms.findIndex(r => r.id === roomId);
        if (targetRoomIndex === -1) return;
        
        const targetRoom = activeHotel.rooms[targetRoomIndex];

        // Check if passenger already assigned (Globally)
        if (assignedMap.has(passenger.id)) {
             // Logic to remove from previous room could be complex across hotels.
             // For now, assume drag/drop only enabled for unassigned.
             // But if we want move:
             const prevHotel = hotels.find(h => h.rooms.some(r => r.guests.some(g => g.bookingId === passenger.id)));
             if (prevHotel) {
                 // Remove from old
                 const updatedHotels = hotels.map(h => {
                     if (h.id === prevHotel.id) {
                         return { 
                             ...h, 
                             rooms: h.rooms.map(r => ({
                                 ...r,
                                 guests: r.guests.filter(g => g.bookingId !== passenger.id)
                             }))
                         };
                     }
                     return h;
                 });
                 // Add to new (needs careful index handling since 'updatedHotels' is fresh)
                 // Simplest is to save removal first, then add. Or do in one pass.
                 // Let's do one pass logic locally
             }
        }

        if (targetRoom.guests.length < targetRoom.capacity) {
            // Remove from ANY room in ANY hotel first
            const cleanedHotels = hotels.map(h => ({
                ...h,
                rooms: h.rooms.map(r => ({
                    ...r,
                    guests: r.guests.filter(g => g.bookingId !== passenger.id)
                }))
            }));

            // Add to target
            const hotelIndex = cleanedHotels.findIndex(h => h.id === activeHotelId);
            const roomIndex = cleanedHotels[hotelIndex].rooms.findIndex(r => r.id === roomId);
            cleanedHotels[hotelIndex].rooms[roomIndex].guests.push({ name: passenger.name, bookingId: passenger.id });

            saveHotels(cleanedHotels);
            if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
        } else {
            alert('Quarto lotado!');
        }
    };

    const confirmRemoveGuest = () => {
        if (!guestToRemove || !activeHotel) return;
        const updatedHotels = hotels.map(h => {
            if (h.id === activeHotelId) {
                return {
                    ...h,
                    rooms: h.rooms.map(r => r.id === guestToRemove.roomId ? { ...r, guests: r.guests.filter(g => g.bookingId !== guestToRemove.guestId) } : r)
                };
            }
            return h;
        });
        saveHotels(updatedHotels);
        setGuestToRemove(null);
    };
    
    const confirmDeleteRoom = () => {
        if (!roomToDelete || !activeHotel) return;
        const updatedHotels = hotels.map(h => {
            if (h.id === activeHotelId) {
                return { ...h, rooms: h.rooms.filter(r => r.id !== roomToDelete) };
            }
            return h;
        });
        saveHotels(updatedHotels);
        setRoomToDelete(null);
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

            {/* Hotel Tabs */}
            <div className="flex items-center bg-white border-b border-gray-200 px-4 py-2 gap-2 overflow-x-auto scrollbar-hide flex-shrink-0">
                {hotels.map(hotel => (
                    <div 
                        key={hotel.id} 
                        onClick={() => setActiveHotelId(hotel.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 cursor-pointer transition-all min-w-[120px] justify-between group
                            ${activeHotelId === hotel.id ? 'border-primary-500 text-primary-600 bg-primary-50 font-bold' : 'border-transparent text-gray-500 hover:bg-gray-50'}
                        `}
                    >
                        {editHotelNameId === hotel.id ? (
                            <div className="flex items-center gap-1">
                                <input 
                                    value={tempHotelName} 
                                    onChange={e => setTempHotelName(e.target.value)} 
                                    className="w-24 text-xs border rounded px-1" 
                                    autoFocus 
                                    onBlur={saveHotelName}
                                    onKeyDown={e => e.key === 'Enter' && saveHotelName()}
                                />
                                <button onMouseDown={saveHotelName} className="text-green-600"><Check size={12}/></button>
                            </div>
                        ) : (
                            <span className="truncate max-w-[120px] text-xs">{hotel.name} <span className="opacity-50 font-normal">({hotel.rooms.length})</span></span>
                        )}
                        
                        {activeHotelId === hotel.id && !editHotelNameId && (
                            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRenameHotel(hotel.id); }}
                                    className="p-1 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-500"
                                >
                                    <Edit3 size={12}/>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteHotel(hotel.id); }}
                                    className="p-1 hover:bg-red-100 rounded-full text-red-400 hover:text-red-500"
                                >
                                    <Trash2 size={12}/>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                <button onClick={handleAddHotel} className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Plus size={14}/> Add Hotel
                </button>
            </div>

            {/* Header Config */}
            <div className="bg-slate-50 border-b p-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center mr-2"><Building size={14} className="mr-1"/> Config:</span>
                    
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
                        <Plus size={14}/> Adicionar Quartos
                    </button>
                </div>
                
                <div className="flex gap-4 text-xs text-gray-600 font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
                    <span>Vagas: <b>{totalCap}</b></span><span>Ocupado: <b className="text-blue-600">{occupied}</b></span><span>Livre: <b className="text-green-600">{totalCap - occupied}</b></span>
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
                             const assignedRoom = assignedMap.get(p.id);
                             const accompanyMatch = p.name.match(/^Acompanhante (\d+) \((.*)\)$/);

                             return (
                                 <div 
                                    key={p.id} 
                                    draggable={!assignedRoom} 
                                    onDragStart={(e) => handleDragStart(e, p)} 
                                    onClick={() => !assignedRoom && setSelectedPassenger(selectedPassenger?.id === p.id ? null : {id: p.id, name: p.name, bookingId: p.bookingId})} 
                                    className={`
                                        p-3 rounded-lg border text-sm flex items-center justify-between group transition-all select-none
                                        ${assignedRoom ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-default' : 'bg-white border-gray-200 hover:border-primary-300 cursor-grab active:cursor-grabbing'}
                                        ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white shadow-md scale-[1.02]' : ''}
                                    `}
                                 >
                                     <div className="flex items-center gap-3 overflow-hidden">
                                         {!assignedRoom && <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}/>}
                                         {assignedRoom && <CheckCircle size={14} className="text-blue-600 flex-shrink-0"/>}
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedPassenger?.id === p.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{p.name.charAt(0).toUpperCase()}</div>
                                         
                                         {accompanyMatch ? (
                                            <div className={`min-w-0 flex flex-col ${selectedPassenger?.id === p.id ? 'text-white' : ''}`}>
                                                <span className={`font-bold text-sm truncate leading-tight ${selectedPassenger?.id === p.id ? 'text-white' : 'text-gray-900'}`}>
                                                    Acompanhante {accompanyMatch[1]}
                                                </span>
                                                <div className={`flex items-center text-xs mt-0.5 ${selectedPassenger?.id === p.id ? 'text-white/80' : 'text-gray-400'}`}>
                                                    <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                    <span className="truncate">Via: {accompanyMatch[2]}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`min-w-0 flex flex-col ${selectedPassenger?.id === p.id ? 'text-white' : ''}`}>
                                                <span className={`font-bold text-sm truncate leading-tight ${selectedPassenger?.id === p.id ? 'text-white' : 'text-gray-900'}`}>{p.name}</span>
                                                {p.isManual ? (
                                                    <div className={`flex items-center text-xs mt-0.5 ${selectedPassenger?.id === p.id ? 'text-white/80' : 'text-gray-400'}`}>
                                                        <CornerDownRight size={10} className="mr-1 flex-shrink-0" />
                                                        <span className="truncate">Manual</span>
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center text-[10px] uppercase font-bold mt-0.5 tracking-wide ${selectedPassenger?.id === p.id ? 'text-white/90' : 'text-primary-600/70'}`}>
                                                        Titular
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                     </div>
                                     {assignedRoom && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[80px]">{assignedRoom}</span>}
                                 </div>
                             );
                         })}
                    </div>
                    <div className="p-2 bg-gray-50 text-[10px] text-gray-400 text-center border-t">Arraste para o quarto ou clique para selecionar.</div>
                </div>

                {/* Right Grid */}
                <div className="flex-1 bg-slate-100 overflow-y-auto p-6 custom-scrollbar">
                    {hotels.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Adicione um hotel para começar.</div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                        {activeHotel?.rooms.map(room => {
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

    const filteredTrips = myTrips.filter(t => t.is_active && t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // PDF Generator
    const generateManifest = () => {
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
            
            // PASSENGER LIST
            const rows: any[] = [];
            const bookingsForTrip = myBookings.filter(b => b.tripId === selectedTrip.id && b.status === 'CONFIRMED');
            
            // Collect all passengers with details
            bookingsForTrip.forEach(booking => {
                const client = (booking as any)._client || clients.find(c => c.id === booking.clientId);
                const clientName = client?.name || 'Cliente';
                
                for(let i=0; i<booking.passengers; i++) {
                    const pId = `${booking.id}-${i}`;
                    const details = selectedTrip.operationalData?.passengerDetails?.[pId];
                    const nameOverride = selectedTrip.operationalData?.passengerNameOverrides?.[pId];
                    
                    let finalName = details?.name || nameOverride;
                    if (!finalName) {
                        finalName = i===0 ? clientName : `Acompanhante ${i+1}`;
                    }
                    
                    const docInfo = details?.doc || '---';
                    const phoneInfo = details?.phone || (i===0 ? (client?.phone || '') : '');
                    
                    // Find assignment
                    let assignment = '---';
                    if (selectedTrip.operationalData?.transport?.vehicles) {
                        // Search in all vehicles
                        for(const v of selectedTrip.operationalData.transport.vehicles) {
                            const seat = v.seats.find(s => s.bookingId === pId);
                            if (seat) {
                                assignment = `${v.name} - ${seat.seatNumber}`;
                                break;
                            }
                        }
                    } else if (selectedTrip.operationalData?.transport?.seats) {
                        // Legacy check
                        const seat = selectedTrip.operationalData.transport.seats.find(s => s.bookingId === pId);
                        if (seat) assignment = seat.seatNumber;
                    }

                    rows.push([finalName, docInfo, phoneInfo, assignment]);
                }
            });
            
            // Sort alphabetical
            rows.sort((a,b) => a[0].localeCompare(b[0]));

            (doc as any).autoTable({
                startY: 80,
                head: [['Nome Passageiro', 'Documento (RG/CPF)', 'Contato', 'Assento']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 9 }
            });
            
            doc.save(`manifesto_${slugify(selectedTrip.title)}.pdf`);
            showToast('PDF gerado com sucesso!', 'success');
        } catch (e: any) {
            console.error(e);
            showToast('Erro ao gerar PDF: ' + e.message, 'error');
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Sidebar List (Collapsible) */}
            <div className={`border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                <div className="p-4 border-b bg-white">
                    <h3 className="font-bold text-gray-900 mb-3">Selecione uma Viagem</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input 
                            type="text" 
                            placeholder="Buscar viagem..." 
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredTrips.map(trip => (
                        <button 
                            key={trip.id}
                            onClick={() => { onSelectTrip(trip.id); setIsSidebarOpen(false); }}
                            className={`w-full text-left p-4 border-b border-gray-100 hover:bg-white transition-colors ${selectedTripId === trip.id ? 'bg-white border-l-4 border-l-primary-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}
                        >
                            <h4 className={`font-bold text-sm ${selectedTripId === trip.id ? 'text-primary-700' : 'text-gray-800'}`}>{trip.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{safeDate(trip.startDate)}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white relative">
                {/* Toggle Button */}
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                    className="absolute top-4 left-4 z-20 bg-white p-2 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 transition-colors text-gray-600"
                    title={isSidebarOpen ? "Fechar Lista" : "Abrir Lista"}
                >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>

                {selectedTrip ? (
                    <>
                        {/* Header Toolbar */}
                        <div className="border-b px-6 py-3 flex justify-between items-center bg-white pl-16">
                            <div>
                                <h2 className="font-bold text-lg text-gray-900 truncate max-w-md">{selectedTrip.title}</h2>
                                <p className="text-xs text-gray-500">Gerenciamento Operacional</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setActiveView('TRANSPORT')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'TRANSPORT' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Transporte</button>
                                    <button onClick={() => setActiveView('ROOMING')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'ROOMING' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Hospedagem</button>
                                </div>
                                <button onClick={generateManifest} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black transition-colors">
                                    <FileText size={14}/> Manifesto PDF
                                </button>
                            </div>
                        </div>

                        {/* Module Content */}
                        <div className="flex-1 overflow-hidden relative">
                            {activeView === 'TRANSPORT' ? (
                                <TransportManager 
                                    trip={selectedTrip} 
                                    bookings={myBookings.filter(b => b.tripId === selectedTrip.id)}
                                    clients={clients}
                                    onSave={(data) => onSaveTripData(selectedTrip.id, data)}
                                />
                            ) : (
                                <RoomingManager 
                                    trip={selectedTrip} 
                                    bookings={myBookings.filter(b => b.tripId === selectedTrip.id)}
                                    clients={clients}
                                    onSave={(data) => onSaveTripData(selectedTrip.id, data)}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Truck size={48} className="mb-4 opacity-20"/>
                        <p>Selecione uma viagem para gerenciar o operacional.</p>
                        <button onClick={() => setIsSidebarOpen(true)} className="mt-4 text-primary-600 text-sm font-bold hover:underline">Abrir Lista de Viagens</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { agencies, trips, bookings, clients, updateTripOperationalData, createTrip, updateTrip } = useData(); // Added createTrip/updateTrip
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'OVERVIEW';
  const { showToast } = useToast();

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const currentAgency = agencies.find(a => a.id === user?.id);
  const myTrips = trips.filter(t => t.agencyId === currentAgency?.agencyId);
  
  // Stats
  const totalSales = myTrips.reduce((acc, t) => acc + (t.sales || 0), 0);
  const totalRevenue = bookings
    .filter(b => b._trip?.agencyId === currentAgency?.agencyId && b.status === 'CONFIRMED')
    .reduce((acc, b) => acc + b.totalPrice, 0);
  const totalViews = myTrips.reduce((acc, t) => acc + (t.views || 0), 0);

  const handleTabChange = (tab: string) => setSearchParams({ tab });

  const handleSaveOperationalData = async (tripId: string, data: OperationalData) => {
      try {
          await updateTripOperationalData(tripId, data);
          // Toast handled in context
      } catch (e) {
          console.error(e);
      }
  };

  const handleEditTrip = (trip: Trip) => {
      setEditingTrip(trip);
      setShowWizard(true);
  };

  const handleWizardSuccess = () => {
      setShowWizard(false);
      setEditingTrip(null);
      // Data refresh handled by context
  };

  if (!user || user.role !== 'AGENCY') return <div className="p-8 text-center">Acesso restrito a agências.</div>;
  if (!currentAgency) return <div className="p-8 text-center"><Loader className="animate-spin inline mr-2"/> Carregando perfil da agência...</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
        {/* Wizard Modal */}
        {showWizard && (
            <CreateTripWizard 
                onClose={() => { setShowWizard(false); setEditingTrip(null); }} 
                onSuccess={handleWizardSuccess}
                initialTripData={editingTrip || undefined}
            />
        )}

        <div className="flex flex-col md:flex-row justify-between items-end mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Painel da Agência</h1>
                <p className="text-gray-500 mt-1">Bem-vindo, {currentAgency.name}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowWizard(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2">
                    <Plus size={18}/> Novo Pacote
                </button>
            </div>
        </div>

        {/* Tab Nav */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
            <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
            <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Briefcase} activeTab={activeTab} onClick={handleTabChange} />
            <NavButton tabId="OPERATIONS" label="Operacional" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
            <NavButton tabId="FINANCIAL" label="Financeiro" icon={DollarSign} activeTab={activeTab} onClick={handleTabChange} />
        </div>

        {/* Content */}
        <div className="animate-[fadeIn_0.3s]">
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Vendas Totais" value={totalSales} subtitle="Passageiros confirmados" icon={Users} color="blue" />
                        <StatCard title="Receita Bruta" value={`R$ ${totalRevenue.toLocaleString()}`} subtitle="Total em vendas" icon={DollarSign} color="green" />
                        <StatCard title="Visualizações" value={totalViews} subtitle="Acessos aos pacotes" icon={Eye} color="purple" />
                        <StatCard title="Avaliação Média" value="4.8" subtitle="Baseado em 50 reviews" icon={Star} color="amber" />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <RecentBookingsTable bookings={bookings.filter(b => b._trip?.agencyId === currentAgency.agencyId)} clients={clients} />
                        </div>
                        <div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center"><Rocket className="mr-2 text-primary-600" size={20}/> Dicas para vender mais</h3>
                                <ul className="space-y-4 text-sm text-gray-600">
                                    <li className="flex gap-3"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <span>Complete o perfil da sua agência com fotos e descrição detalhada.</span></li>
                                    <li className="flex gap-3"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <span>Crie pacotes com títulos atrativos e fotos de alta qualidade.</span></li>
                                    <li className="flex gap-3"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <span>Responda rapidamente às dúvidas dos clientes no WhatsApp.</span></li>
                                    <li className="flex gap-3"><CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/> <span>Incentive seus clientes a deixarem avaliações após a viagem.</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TRIPS' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-900">Seus Pacotes Cadastrados</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input type="text" placeholder="Buscar pacote..." className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-primary-500"/>
                        </div>
                    </div>
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Preço</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myTrips.map(trip => (
                                <tr key={trip.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={trip.images[0] || 'https://placehold.co/100'} className="w-10 h-10 rounded-lg object-cover" alt=""/>
                                            <div className="font-medium text-gray-900 text-sm">{trip.title}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(trip.startDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">R$ {trip.price}</td>
                                    <td className="px-6 py-4"><Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'Ativo' : 'Rascunho'}</Badge></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleEditTrip(trip)} className="text-primary-600 hover:text-primary-800 text-sm font-bold">Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'OPERATIONS' && (
                <OperationsModule 
                    myTrips={myTrips}
                    myBookings={bookings.filter(b => b._trip?.agencyId === currentAgency.agencyId)}
                    clients={clients}
                    selectedTripId={null} // Default
                    onSelectTrip={(id) => { /* handled inside module state usually, but passed for lift */ }}
                    onSaveTripData={handleSaveOperationalData}
                    currentAgency={currentAgency}
                />
            )}

            {activeTab === 'FINANCIAL' && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <DollarSign size={48} className="text-gray-300 mx-auto mb-4"/>
                    <h3 className="text-xl font-bold text-gray-900">Módulo Financeiro</h3>
                    <p className="text-gray-500">Em breve você poderá gerenciar seus recebimentos por aqui.</p>
                </div>
            )}
        </div>
    </div>
  );
};