
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  Trip, Agency, Plan, OperationalData, PassengerSeat, RoomConfig, ManualPassenger, Booking, ThemeColors, VehicleType, VehicleLayoutConfig, DashboardStats, TransportConfig, VehicleInstance
} from '../types'; 
import { PLANS } from '../services/mockData';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { 
  Plus, Edit, Save, ArrowLeft, X, Loader, Copy, Eye, ExternalLink, Star, BarChart2, DollarSign, Users, Calendar, Plane, CreditCard, MapPin, ShoppingBag, MoreHorizontal, PauseCircle, PlayCircle, Settings, BedDouble, Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, AlertTriangle, PenTool, LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, ImageIcon, FileText, Download, Rocket,
  LogOut, Globe, Trash2, CheckCircle, ChevronDown, MessageCircle, Info, Palette, Search, LucideProps, Zap, Camera, Upload, FileDown, Building, Armchair, MousePointer2, RefreshCw, Archive, ArchiveRestore, Trash, Ban, Send, ArrowRight, CornerDownRight, Minus
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
    transport: { vehicles: [] }, 
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
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100 text-red-600' : variant === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    <AlertTriangle size={24}/>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">Cancelar</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-white rounded-lg font-bold ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}>{confirmText}</button>
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

// --- TRANSPORT MANAGER (FLEET SUPPORT) ---

interface TransportManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void; 
}

const TransportManager: React.FC<TransportManagerProps> = ({ trip, bookings, clients, onSave }) => {
    // Current data structure access
    const transportData = trip.operationalData?.transport;
    const currentManualPassengers = trip.operationalData?.manualPassengers || [];
    const nameOverrides = (trip.operationalData as any)?.passengerNameOverrides || {};

    // --- State ---
    const [vehicles, setVehicles] = useState<VehicleInstance[]>([]);
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(currentManualPassengers);
    
    // UI State
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);
    const [filterText, setFilterText] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);
    
    // Modals
    const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    const { showToast } = useToast();

    // --- Migration & Initialization ---
    useEffect(() => {
        if (transportData?.vehicles && transportData.vehicles.length > 0) {
            // Already in new format
            setVehicles(transportData.vehicles);
            if (!activeVehicleId) setActiveVehicleId(transportData.vehicles[0].id);
        } else if (transportData?.vehicleConfig) {
            // Old format: Migrate to fleet array
            const migratedVehicle: VehicleInstance = {
                id: 'migrated-1',
                name: 'Veículo 1',
                config: transportData.vehicleConfig,
                seats: transportData.seats || []
            };
            const newFleet = [migratedVehicle];
            setVehicles(newFleet);
            setActiveVehicleId('migrated-1');
            // Save immediately to persist migration
            onSave({ ...trip.operationalData, transport: { vehicles: newFleet } });
        } else {
            // Empty state
            setVehicles([]);
        }
    }, [transportData]); // Run once on data load

    const activeVehicle = useMemo(() => vehicles.find(v => v.id === activeVehicleId), [vehicles, activeVehicleId]);

    // Derived Passengers List
    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                const originalName = i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`;
                return { id, bookingId: b.id, name: nameOverrides[id] || originalName, isManual: false };
            });
        });
        const manual = manualPassengers.map(p => ({
            id: p.id, bookingId: p.id, name: nameOverrides[p.id] || p.name, isManual: true
        }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides]);

    // Assigned Map (Global across ALL vehicles)
    const assignedMap = useMemo(() => {
        const map = new Map<string, string>(); // bookingId -> vehicleName + seat
        vehicles.forEach(v => {
            v.seats.forEach(s => {
                map.set(s.bookingId, `${v.name} - ${s.seatNumber}`);
            });
        });
        return map;
    }, [vehicles]);

    const filteredPassengers = useMemo(() => {
        if (!filterText) return allPassengers;
        return allPassengers.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
    }, [allPassengers, filterText]);

    // --- Actions ---

    const handleAddVehicle = (type: VehicleType, customData?: any) => {
        const config = type === 'CUSTOM' ? {
            type: 'CUSTOM',
            label: customData.label || 'Personalizado',
            totalSeats: customData.totalSeats,
            cols: customData.cols,
            aisleAfterCol: Math.floor(customData.cols / 2)
        } : VEHICLE_TYPES[type];

        const newVehicle: VehicleInstance = {
            id: `v-${Date.now()}`,
            name: `${config.label.split(' ')[0]} ${vehicles.length + 1}`,
            config: config as VehicleLayoutConfig,
            seats: []
        };

        const updatedFleet = [...vehicles, newVehicle];
        setVehicles(updatedFleet);
        setActiveVehicleId(newVehicle.id);
        onSave({ ...trip.operationalData, transport: { vehicles: updatedFleet } });
        setShowAddVehicleModal(false);
    };

    const handleDeleteVehicle = () => {
        if (!activeVehicleId) return;
        const updatedFleet = vehicles.filter(v => v.id !== activeVehicleId);
        setVehicles(updatedFleet);
        setActiveVehicleId(updatedFleet.length > 0 ? updatedFleet[0].id : null);
        onSave({ ...trip.operationalData, transport: { vehicles: updatedFleet } });
        setShowResetConfirm(false);
        showToast('Veículo removido da frota.', 'success');
    };

    const handleAssign = (seatNum: string, passenger: { id: string, name: string }) => {
        if (!activeVehicle) return;
        
        // Check if seat is occupied in THIS vehicle
        if (activeVehicle.seats.find(s => s.seatNumber === seatNum)) {
            showToast('Assento ocupado!', 'warning');
            return;
        }

        // Remove passenger from ANY other vehicle first (Global unassign)
        const cleanedFleet = vehicles.map(v => ({
            ...v,
            seats: v.seats.filter(s => s.bookingId !== passenger.id)
        }));

        // Assign to current vehicle
        const updatedFleet = cleanedFleet.map(v => {
            if (v.id === activeVehicleId) {
                return {
                    ...v,
                    seats: [...v.seats, {
                        seatNumber: seatNum,
                        passengerName: passenger.name,
                        bookingId: passenger.id,
                        status: 'occupied' as const
                    }]
                };
            }
            return v;
        });

        setVehicles(updatedFleet);
        onSave({ ...trip.operationalData, transport: { vehicles: updatedFleet } });
        if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
    };

    const confirmRemoveSeat = () => {
        if (!activeVehicle || !seatToDelete) return;
        
        const updatedFleet = vehicles.map(v => {
            if (v.id === activeVehicleId) {
                return {
                    ...v,
                    seats: v.seats.filter(s => s.seatNumber !== seatToDelete.seatNum)
                };
            }
            return v;
        });

        setVehicles(updatedFleet);
        onSave({ ...trip.operationalData, transport: { vehicles: updatedFleet } });
        setSeatToDelete(null);
    };

    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    // Render Logic for Bus Layout
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
                    const occupant = activeVehicle.seats.find(s => s.seatNumber === seatStr);
                    const isTarget = dragOverSeat === seatStr || (selectedPassenger && !occupant);
                    
                    rowSeats.push(
                        <div
                            key={seatNum}
                            onDragOver={(e) => { e.preventDefault(); if(!occupant) setDragOverSeat(seatStr); }}
                            onDragLeave={() => setDragOverSeat(null)}
                            onDrop={(e) => { e.preventDefault(); setDragOverSeat(null); if(!occupant) { 
                                const data = e.dataTransfer.getData('application/json');
                                try { handleAssign(seatStr, JSON.parse(data)); } catch(e){} 
                            }}}
                            onClick={() => {
                                if (occupant) setSeatToDelete({ seatNum: seatStr, name: occupant.passengerName });
                                else if (selectedPassenger) handleAssign(seatStr, selectedPassenger);
                            }}
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

    // Stats
    const totalFleetCapacity = vehicles.reduce((sum, v) => sum + v.config.totalSeats, 0);
    const assignedCount = assignedMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

    // Custom Add Vehicle Modal
    const AddVehicleModal = () => {
        const [mode, setMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
        const [customData, setCustomData] = useState({ label: '', totalSeats: 4, cols: 2 });

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative">
                    <button onClick={() => setShowAddVehicleModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Adicionar Veículo à Frota</h2>
                    
                    {mode === 'PRESET' ? (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                {Object.values(VEHICLE_TYPES).filter(v => v.type !== 'CUSTOM').map(v => (
                                    <button key={v.type} onClick={() => handleAddVehicle(v.type as VehicleType)} className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-center">
                                        <Truck size={24} className="mb-2 text-gray-400"/>
                                        <span className="font-bold text-gray-700 text-sm">{v.label}</span>
                                        <span className="text-xs text-gray-400">{v.totalSeats} Lugares</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setMode('CUSTOM')} className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200">Criar Personalizado</button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold mb-1">Nome do Veículo</label><input value={customData.label} onChange={e => setCustomData({...customData, label: e.target.value})} className="w-full border p-2 rounded" placeholder="Ex: Van Executiva"/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold mb-1">Lugares</label><input type="number" value={customData.totalSeats} onChange={e => setCustomData({...customData, totalSeats: parseInt(e.target.value)})} className="w-full border p-2 rounded"/></div>
                                <div><label className="block text-sm font-bold mb-1">Colunas</label><select value={customData.cols} onChange={e => setCustomData({...customData, cols: parseInt(e.target.value)})} className="w-full border p-2 rounded"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setMode('PRESET')} className="flex-1 py-2 bg-gray-100 font-bold rounded text-gray-600">Voltar</button>
                                <button onClick={() => handleAddVehicle('CUSTOM', customData)} className="flex-1 py-2 bg-primary-600 text-white font-bold rounded hover:bg-primary-700">Criar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Remover ${seatToDelete?.name}?`} variant="warning" />
            <ConfirmationModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={handleDeleteVehicle} title="Excluir Veículo" message="Remover este veículo da frota? Os passageiros ficarão sem assento." variant="danger" confirmText="Excluir"/>
            {showAddVehicleModal && <AddVehicleModal />}

            {/* Sidebar - Passenger List */}
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
                        <input type="text" placeholder="Buscar passageiro..." className="w-full pl-8 pr-2 py-1.5 text-xs border rounded-lg focus:ring-1 focus:ring-primary-500 outline-none" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
                    </div>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                    {filteredPassengers.map(p => {
                        const assignedInfo = assignedMap.get(p.id);
                        const accompanyMatch = p.name.match(/^Acompanhante (\d+) \((.*)\)$/);
                        
                        return (
                            <div 
                                key={p.id} 
                                draggable={!assignedInfo} 
                                onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(p))}
                                onClick={() => !assignedInfo && setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)} 
                                className={`
                                    p-3 rounded-lg border text-sm flex items-center justify-between group select-none transition-all
                                    ${assignedInfo ? 'bg-green-50/50 border-green-200 text-gray-500 opacity-90 cursor-default' : 'bg-white border-gray-200 hover:border-primary-300 cursor-grab active:cursor-grabbing'}
                                    ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-primary-100' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {!assignedInfo && <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}/>}
                                    {assignedInfo && <CheckCircle size={14} className="text-green-600 flex-shrink-0"/>}
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
                                {assignedInfo && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap max-w-[80px] truncate" title={assignedInfo}>{assignedInfo}</span>}
                            </div>
                        );
                    })}
                </div>
                <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-400 text-center">Total Frota: {totalFleetCapacity} lugares.</div>
            </div>

            {/* Main Area: Fleet Management */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                
                {/* Fleet Tab Bar */}
                <div className="bg-white border-b px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-hide shadow-sm z-20">
                    {vehicles.map(v => (
                        <button 
                            key={v.id} 
                            onClick={() => setActiveVehicleId(v.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-t border-x transition-all min-w-[120px] justify-center
                                ${activeVehicleId === v.id 
                                    ? 'bg-slate-100 text-primary-700 border-slate-200 border-b-slate-100 -mb-px shadow-sm' 
                                    : 'bg-white text-gray-500 border-transparent hover:bg-gray-50'
                                }
                            `}
                        >
                            {v.name}
                            <span className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full text-black/60">{v.config.totalSeats}</span>
                        </button>
                    ))}
                    <button 
                        onClick={() => setShowAddVehicleModal(true)}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors mb-1 ml-1"
                    >
                        <Plus size={14}/> Add Veículo
                    </button>
                </div>

                {/* Active Vehicle View */}
                {activeVehicle ? (
                    <div className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide">
                        <div className="bg-white px-8 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative min-h-[600px] w-fit h-fit my-auto animate-[fadeIn_0.3s]">
                            <div className="absolute top-4 right-4 flex gap-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeVehicle.config.label}</span>
                                <button onClick={() => setShowResetConfirm(true)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                            
                            <div className="absolute top-0 left-0 right-0 h-24 border-b-2 border-slate-200 bg-slate-50 flex justify-center items-center rounded-t-[34px]">
                                <User size={24} className="text-slate-300"/>
                            </div>
                            
                            <div className="mt-12 space-y-2 select-none">
                                {renderBusLayout()}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <Truck size={48} className="mb-4 opacity-50"/>
                        <p className="text-lg font-medium">Nenhum veículo na frota.</p>
                        <button onClick={() => setShowAddVehicleModal(true)} className="mt-4 text-primary-600 font-bold hover:underline">Adicionar Primeiro Veículo</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 2. ROOMING MANAGER (Config em Lote + Smart Click)
const ROOM_PRESETS = [
    { id: 'SINGLE', label: 'Single', cap: 1 },
    { id: 'DOUBLE', label: 'Duplo', cap: 2 },
    { id: 'TRIPLE', label: 'Triplo', cap: 3 },
    { id: 'QUAD', label: 'Quádruplo', cap: 4 },
];

interface RoomingManagerProps {
    trip: Trip; 
    bookings: Booking[]; 
    clients: any[]; 
    onSave: (data: OperationalData) => void;
}

const RoomingManager: React.FC<RoomingManagerProps> = ({ trip, bookings, clients, onSave }) => {
    const [rooms, setRooms] = useState<RoomConfig[]>(trip.operationalData?.rooming || []);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [nameOverrides, setNameOverrides] = useState<Record<string, string>>((trip.operationalData as any)?.passengerNameOverrides || {});
    
    // UI
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');
    
    // Improved Batch Config State
    const [creationMode, setCreationMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
    const [selectedPresetCap, setSelectedPresetCap] = useState<number>(2); // Default Double
    const [customCapacity, setCustomCapacity] = useState<number>(5);
    const [roomQuantity, setRoomQuantity] = useState<number>(1);

    // Confirmation States
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [guestToRemove, setGuestToRemove] = useState<{roomId: string, guestId: string, name: string} | null>(null);

    const activeCapacity = creationMode === 'PRESET' ? selectedPresetCap : customCapacity;

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

    const assignedMap = useMemo(() => {
        const map = new Map<string, string>();
        rooms.forEach(r => r.guests.forEach(g => map.set(g.bookingId, r.name)));
        return map;
    }, [rooms]);

    const filteredPassengers = useMemo(() => {
        if (!filterText) return allPassengers;
        return allPassengers.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
    }, [allPassengers, filterText]);

    // Actions
    const handleBatchCreate = () => {
        const newRooms: RoomConfig[] = [];
        
        // Map capacity to strict ENUM type
        let typeStr: 'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE' = 'COLLECTIVE';
        if (activeCapacity <= 2) typeStr = 'DOUBLE';
        else if (activeCapacity === 3) typeStr = 'TRIPLE';
        else if (activeCapacity === 4) typeStr = 'QUAD';
        
        const startIdx = rooms.length + 1;
        for(let i=0; i<roomQuantity; i++) {
            newRooms.push({ 
                id: crypto.randomUUID(), 
                name: `Quarto ${startIdx+i}`, 
                type: typeStr, 
                capacity: activeCapacity, 
                guests: [] 
            });
        }
        const updated = [...rooms, ...newRooms];
        setRooms(updated);
        onSave({ ...trip.operationalData, rooming: updated });
    };

    const handleAssign = (roomId: string, passenger: { id: string, name: string, bookingId: string }) => {
        const target = rooms.find(r => r.id === roomId);
        if (target && target.guests.length < target.capacity) {
            // Remove from old room if exists
            const prevRoomName = assignedMap.get(passenger.id);
            let tempRooms = rooms;
            if (prevRoomName) {
                tempRooms = rooms.map(r => r.name === prevRoomName ? { ...r, guests: r.guests.filter(g => g.bookingId !== passenger.id) } : r);
            }

            const updated = tempRooms.map(r => r.id === roomId ? { ...r, guests: [...r.guests, { name: passenger.name, bookingId: passenger.id }] } : r);
            setRooms(updated);
            onSave({ ...trip.operationalData, rooming: updated });
            if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
        } else {
            alert('Quarto lotado!');
        }
    };

    const confirmRemoveGuest = () => {
        if (guestToRemove) {
            const updated = rooms.map(r => r.id === guestToRemove.roomId ? { ...r, guests: r.guests.filter(g => g.bookingId !== guestToRemove.guestId) } : r);
            setRooms(updated);
            onSave({ ...trip.operationalData, rooming: updated });
            setGuestToRemove(null);
        }
    };
    
    const confirmDeleteRoom = () => {
        if (roomToDelete) {
            const updated = rooms.filter(r => r.id !== roomToDelete);
            setRooms(updated);
            onSave({ ...trip.operationalData, rooming: updated });
            setRoomToDelete(null);
        }
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
    const totalCap = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupied = rooms.reduce((sum, r) => sum + r.guests.length, 0);
    const assignedCount = assignedMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <ConfirmationModal 
                isOpen={!!roomToDelete} 
                onClose={() => setRoomToDelete(null)} 
                onConfirm={confirmDeleteRoom} 
                title="Excluir Quarto" 
                message="Tem certeza que deseja excluir este quarto? Todos os passageiros alocados serão removidos."
                variant="danger"
                confirmText="Excluir"
            />

            <ConfirmationModal 
                isOpen={!!guestToRemove} 
                onClose={() => setGuestToRemove(null)} 
                onConfirm={confirmRemoveGuest} 
                title="Remover Passageiro" 
                message={`Deseja remover ${guestToRemove?.name} deste quarto?`}
                variant="warning"
                confirmText="Remover"
            />

            {/* Improved Header Config */}
            <div className="bg-slate-50 border-b p-4 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0 shadow-sm z-20">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
                    
                    {/* Quick Selectors & Custom Input */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-2">
                            {ROOM_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => { setCreationMode('PRESET'); setSelectedPresetCap(preset.cap); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        creationMode === 'PRESET' && selectedPresetCap === preset.cap
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                            : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setCreationMode('CUSTOM')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    creationMode === 'CUSTOM'
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                                        : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                                }`}
                            >
                                Personalizado
                            </button>
                        </div>

                        {creationMode === 'CUSTOM' && (
                            <div className="flex items-center gap-2 border-l pl-3 animate-[fadeIn_0.2s]">
                                <span className="text-xs font-bold text-gray-500 uppercase">Capacidade:</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="20" 
                                    value={customCapacity} 
                                    onChange={e => setCustomCapacity(parseInt(e.target.value) || 1)} 
                                    className="w-14 border border-gray-300 rounded-md p-1 text-center text-sm font-bold focus:ring-1 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Quantity Stepper & Add Button */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm">
                            <button 
                                onClick={() => setRoomQuantity(Math.max(1, roomQuantity - 1))} 
                                className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                <Minus size={14}/>
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-gray-800 border-x border-gray-100">{roomQuantity}</span>
                            <button 
                                onClick={() => setRoomQuantity(Math.min(10, roomQuantity + 1))} 
                                className="px-3 py-1.5 hover:bg-gray-100 text-gray-600 transition-colors"
                            >
                                <Plus size={14}/>
                            </button>
                        </div>
                        
                        <button 
                            onClick={handleBatchCreate} 
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center gap-2 shadow-md transition-transform active:scale-95"
                        >
                            <Plus size={16}/> Adicionar Quartos
                        </button>
                    </div>
                </div>

                <div className="flex gap-4 text-xs text-gray-600 font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
                    <span>Vagas: <b>{totalCap}</b></span>
                    <span>Ocupado: <b className="text-blue-600">{occupied}</b></span>
                    <span>Livre: <b className="text-green-600">{totalCap - occupied}</b></span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                        {rooms.map(room => {
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
                                    <div className="p-3 border-b flex justify-between items-center bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isFull ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}><BedDouble size={18}/></div>
                                            <div>
                                                <h5 className="font-bold text-gray-800 text-sm">{room.name}</h5>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase"><span>{room.type}</span><span className={isFull?'text-green-600':'text-blue-600'}>{room.guests.length}/{room.capacity}</span></div>
                                            </div>
                                        </div>
                                        <button onClick={(e) => {e.stopPropagation(); setRoomToDelete(room.id);}} className="text-gray-300 hover:text-red-500 p-1.5"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="p-3 space-y-2 min-h-[80px]">
                                        {room.guests.map(g => (
                                            <div key={g.bookingId} className="bg-blue-50/50 px-3 py-2 rounded text-xs font-medium flex justify-between items-center group/guest border border-blue-100/50">
                                                <div className="flex items-center gap-2"><User size={12} className="text-blue-400"/><span className="truncate max-w-[120px]">{g.name}</span></div>
                                                <button onClick={(e)=>{e.stopPropagation(); setGuestToRemove({roomId: room.id, guestId: g.bookingId, name: g.name});}} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100"><X size={14}/></button>
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
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export const AgencyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    agencies, trips, bookings, clients,
    getAgencyStats, refreshData, deleteTrip, toggleTripStatus, updateTripOperationalData,
    loading: dataLoading
  } = useData();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeTab = searchParams.get('tab') || 'OVERVIEW';
  const currentAgency = agencies.find(a => a.id === user?.id);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Partial<Trip> | undefined>(undefined);
  
  // Operations State
  const [opsTripId, setOpsTripId] = useState<string | null>(null);
  const opsTrip = trips.find(t => t.id === opsTripId);

  useEffect(() => {
    if (currentAgency) {
      getAgencyStats(currentAgency.agencyId).then(setStats);
    }
  }, [currentAgency, trips, bookings]);

  if (!user || user.role !== 'AGENCY') return <div className="p-8">Acesso negado.</div>;
  if (!currentAgency) return <div className="p-8"><Loader className="animate-spin"/> Carregando dados da agência...</div>;

  const agencyTrips = trips.filter(t => t.agencyId === currentAgency.agencyId);
  const agencyBookings = bookings.filter(b => b._trip?.agencyId === currentAgency.agencyId);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    if (tab !== 'OPERATIONS') setOpsTripId(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    const newStats = await getAgencyStats(currentAgency.agencyId);
    setStats(newStats);
    setIsRefreshing(false);
  };

  const handleEditTrip = (trip: Trip) => {
    setTripToEdit(trip);
    setShowWizard(true);
  };

  const handleCreateTrip = () => {
    setTripToEdit(undefined);
    setShowWizard(true);
  };

  const handleDeleteTrip = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pacote?')) {
        await deleteTrip(id);
    }
  };

  const saveOpsData = async (data: OperationalData) => {
      if (opsTrip) {
          await updateTripOperationalData(opsTrip.id, data);
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
       {/* Wizard Modal */}
       {showWizard && (
         <CreateTripWizard 
            onClose={() => setShowWizard(false)} 
            onSuccess={() => { setShowWizard(false); handleRefresh(); }}
            initialTripData={tripToEdit}
         />
       )}

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
              <h1 className="text-2xl font-bold text-gray-900">Olá, {currentAgency.name}</h1>
              <p className="text-gray-500 text-sm">Gerencie seus pacotes e acompanhe suas vendas.</p>
          </div>
          <div className="flex gap-3">
              <Link to={`/${currentAgency.slug}`} target="_blank" className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-50 transition-colors">
                  <ExternalLink size={18} className="mr-2"/> Ver Minha Página
              </Link>
              <button onClick={handleCreateTrip} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors shadow-sm">
                  <Plus size={18} className="mr-2"/> Criar Pacote
              </button>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
          <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
          <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
          <NavButton tabId="BOOKINGS" label="Vendas" icon={ShoppingBag} activeTab={activeTab} onClick={handleTabChange} />
          <NavButton tabId="OPERATIONS" label="Operacional" icon={ListChecks} activeTab={activeTab} onClick={handleTabChange} />
          <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
       </div>

       {activeTab === 'OVERVIEW' && (
           <div className="space-y-8 animate-[fadeIn_0.3s]">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   <StatCard title="Receita Total" value={`R$ ${stats?.totalRevenue.toLocaleString() || '0'}`} subtitle="Vendas confirmadas" icon={DollarSign} color="green"/>
                   <StatCard title="Vendas (Pax)" value={stats?.totalSales || 0} subtitle="Passageiros confirmados" icon={ShoppingBag} color="blue"/>
                   <StatCard title="Visualizações" value={stats?.totalViews || 0} subtitle="Total de acessos aos pacotes" icon={Eye} color="purple"/>
                   <StatCard title="Avaliação Média" value={stats?.averageRating?.toFixed(1) || '0.0'} subtitle={`${stats?.totalReviews || 0} avaliações`} icon={Star} color="amber"/>
               </div>
               <RecentBookingsTable bookings={agencyBookings} clients={clients} />
           </div>
       )}

       {activeTab === 'TRIPS' && (
           <div className="animate-[fadeIn_0.3s]">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                           {agencyTrips.map(trip => (
                               <tr key={trip.id} className="hover:bg-gray-50">
                                   <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                           <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                               <img src={trip.images[0]} className="w-full h-full object-cover" />
                                           </div>
                                           <div className="truncate max-w-[200px]">
                                               <p className="font-bold text-gray-900 text-sm truncate">{trip.title}</p>
                                               <p className="text-xs text-gray-500 truncate">{trip.destination}</p>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4 text-sm text-gray-600">{new Date(trip.startDate).toLocaleDateString()}</td>
                                   <td className="px-6 py-4 text-sm font-bold text-gray-900">R$ {trip.price.toLocaleString()}</td>
                                   <td className="px-6 py-4"><Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'Ativo' : 'Rascunho'}</Badge></td>
                                   <td className="px-6 py-4 text-right">
                                       <div className="flex justify-end gap-2">
                                           <button onClick={() => handleEditTrip(trip)} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Edit size={16}/></button>
                                           <button onClick={() => toggleTripStatus(trip.id)} className="p-2 hover:bg-gray-100 rounded text-gray-600" title={trip.is_active ? 'Pausar' : 'Publicar'}>
                                               {trip.is_active ? <PauseCircle size={16}/> : <PlayCircle size={16}/>}
                                           </button>
                                           <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16}/></button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                           {agencyTrips.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum pacote criado.</td></tr>}
                       </tbody>
                   </table>
               </div>
           </div>
       )}

       {activeTab === 'BOOKINGS' && (
           <div className="animate-[fadeIn_0.3s]">
               <RecentBookingsTable bookings={agencyBookings} clients={clients} />
           </div>
       )}

       {activeTab === 'OPERATIONS' && (
           <div className="animate-[fadeIn_0.3s]">
               {!opsTrip ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {agencyTrips.filter(t => t.is_active).map(trip => (
                           <div key={trip.id} onClick={() => setOpsTripId(trip.id)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-primary-500 hover:ring-2 hover:ring-primary-100 transition-all group">
                               <div className="flex justify-between items-start mb-4">
                                   <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold text-lg">{trip.startDate.substring(8,10)}</div>
                                   <Badge color="blue">{trip.durationDays} dias</Badge>
                               </div>
                               <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{trip.title}</h3>
                               <p className="text-sm text-gray-500 mb-4">{trip.destination}</p>
                               <div className="flex items-center text-xs font-bold text-gray-400">
                                   <Users size={14} className="mr-1"/> {bookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED').reduce((s,b) => s + b.passengers, 0)} confirmados
                               </div>
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="space-y-6">
                       <div className="flex items-center gap-4 mb-4">
                           <button onClick={() => setOpsTripId(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
                           <h2 className="text-xl font-bold text-gray-900">{opsTrip.title} - Operacional</h2>
                       </div>
                       
                       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                           <div className="border-b bg-gray-50 px-6 py-3 flex gap-6">
                               <div className="font-bold text-sm text-primary-700 border-b-2 border-primary-600 pb-2.5 -mb-3.5">Transporte & Rooming</div>
                           </div>
                           <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                               <div className="h-full flex flex-col">
                                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Bus size={18}/> Transporte</h3>
                                   <div className="flex-1 border rounded-xl overflow-hidden">
                                       <TransportManager 
                                            trip={opsTrip} 
                                            bookings={bookings.filter(b => b.tripId === opsTrip.id && b.status === 'CONFIRMED')}
                                            clients={clients}
                                            onSave={saveOpsData}
                                       />
                                   </div>
                               </div>
                               <div className="h-full flex flex-col">
                                   <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BedDouble size={18}/> Rooming List</h3>
                                   <div className="flex-1 border rounded-xl overflow-hidden">
                                       <RoomingManager 
                                            trip={opsTrip}
                                            bookings={bookings.filter(b => b.tripId === opsTrip.id && b.status === 'CONFIRMED')}
                                            clients={clients}
                                            onSave={saveOpsData}
                                       />
                                   </div>
                               </div>
                           </div>
                       </div>
                   </div>
               )}
           </div>
       )}

       {activeTab === 'SETTINGS' && (
           <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Agência</h2>
               <p className="text-gray-500 mb-4">Gerencie seu perfil, cores e plano.</p>
               <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 mb-6">
                   <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-gray-700">Plano Atual</span>
                       <Badge color={currentAgency.subscriptionPlan === 'PREMIUM' ? 'purple' : 'gray'}>{currentAgency.subscriptionPlan}</Badge>
                   </div>
                   <p className="text-sm text-gray-500">Expira em: {new Date(currentAgency.subscriptionExpiresAt).toLocaleDateString()}</p>
               </div>
               <button className="w-full border border-gray-300 py-3 rounded-lg font-bold text-gray-700 hover:bg-gray-50">Editar Perfil Completo</button>
           </div>
       )}
    </div>
  );
};
