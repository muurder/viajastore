import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { 
  Trip, Agency, Plan, OperationalData, PassengerSeat, RoomConfig, ManualPassenger, Booking, ThemeColors, VehicleType, VehicleLayoutConfig, DashboardStats, TransportConfig 
} from '../types'; 
import { PLANS } from '../services/mockData';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { 
  Plus, Edit, Save, ArrowLeft, X, Loader, Copy, Eye, ExternalLink, Star, BarChart2, DollarSign, Users, Calendar, Plane, CreditCard, MapPin, ShoppingBag, MoreHorizontal, PauseCircle, PlayCircle, Settings, BedDouble, Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, AlertTriangle, PenTool, LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, ImageIcon, FileText, Download, Rocket,
  LogOut, Globe, Trash2, CheckCircle, ChevronDown, MessageCircle, Info, Palette, Search, LucideProps, Zap, Camera, Upload, FileDown, Building, Armchair, MousePointer2, RefreshCw, Archive, ArchiveRestore, Trash, Ban, Send
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

// --- SUB-COMPONENTS FOR OPERATIONS ---

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
    const nameOverrides = (trip.operationalData as any)?.passengerNameOverrides || {};

    const [config, setConfig] = useState<TransportConfig>({ 
        vehicleConfig: currentVehicleConfig || null,
        seats: currentSeats
    });
    
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(currentManualPassengers);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);
    
    // Config Mode
    const [showCustomVehicleForm, setShowCustomVehicleForm] = useState(false);
    const [customVehicleData, setCustomVehicleData] = useState({ label: '', totalSeats: 4, cols: 2 });
    const [showManualForm, setShowManualForm] = useState(false);

    const { showToast } = useToast();

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

    const isSeatOccupied = (seatNum: string) => config.seats.find(s => s.seatNumber === seatNum);
    
    const unassignedPassengers = useMemo(() => {
        const assignedIds = new Set(config.seats.map(s => s.bookingId));
        return allPassengers.filter(p => !assignedIds.has(p.id));
    }, [allPassengers, config.seats]);

    // Actions
    const handleAssign = (seatNum: string, passenger: { id: string, name: string, bookingId: string }) => {
        if (isSeatOccupied(seatNum)) {
            showToast(`Assento ${seatNum} já ocupado.`, 'warning');
            return;
        }
        const newSeat: PassengerSeat = {
            seatNumber: seatNum,
            passengerName: passenger.name,
            bookingId: passenger.id,
            status: 'occupied'
        };
        const newSeats = [...config.seats, newSeat];
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig);
        onSave({ ...trip.operationalData, transport: newConfig });
        if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
    };

    const confirmRemoveSeat = () => {
        if (!seatToDelete) return;
        const newSeats = config.seats.filter(s => s.seatNumber !== seatToDelete.seatNum);
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig);
        onSave({ ...trip.operationalData, transport: newConfig });
        setSeatToDelete(null);
    };

    // Handlers
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

    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') { setShowCustomVehicleForm(true); return; }
        const newConfig = VEHICLE_TYPES[type];
        const newTransportState = { vehicleConfig: newConfig, seats: [] };
        setConfig(newTransportState);
        onSave({ ...trip.operationalData, transport: newTransportState });
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
        const newTransportState = { vehicleConfig: newConfig, seats: [] };
        setConfig(newTransportState);
        onSave({ ...trip.operationalData, transport: newTransportState });
        setShowCustomVehicleForm(false);
    };
    
    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    // Render Logic
    const renderBusLayout = () => {
        if (!config.vehicleConfig) return null;
        const { totalSeats, cols, aisleAfterCol } = config.vehicleConfig;
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
                            onDrop={(e) => !occupant && handleDrop(e, seatStr)}
                            onClick={() => handleSeatClick(seatStr)}
                            className={`
                                relative w-12 h-12 flex flex-col items-center justify-center transition-all duration-200
                                ${occupant ? 'cursor-pointer text-primary-600' : isTarget ? 'cursor-pointer scale-110 text-green-500' : 'cursor-pointer text-gray-300 hover:text-gray-400'}
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

    if (!config.vehicleConfig) {
        return (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-slate-50 animate-[fadeIn_0.3s]">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-2xl w-full text-center">
                    {!showCustomVehicleForm ? (
                        <>
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600"><Settings2 size={32}/></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure o Transporte</h2>
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
    
    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Remover ${seatToDelete?.name}?`} variant="warning" />

            {/* Sidebar */}
            <div className="w-full lg:w-80 border-r border-gray-200 bg-white flex flex-col h-full shadow-sm z-10 flex-shrink-0">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Passageiros ({unassignedPassengers.length})</h4>
                    <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded"><Plus size={18}/></button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                    {unassignedPassengers.map(p => (
                        <div key={p.id} draggable onDragStart={(e) => handleDragStart(e, p)} onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)} className={`p-3 rounded-lg border text-sm cursor-grab active:cursor-grabbing flex items-center justify-between group select-none ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white border-primary-600 shadow-md ring-2 ring-primary-100' : 'bg-white border-gray-200 hover:border-primary-300'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}/>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedPassenger?.id === p.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{p.name.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0"><span className="font-medium truncate block">{p.name}</span>{p.isManual && <span className="text-[10px] opacity-70 block">Manual</span>}</div>
                            </div>
                            {selectedPassenger?.id === p.id && <CheckCircle size={16}/>}
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-400 text-center">Arraste para o assento ou clique para selecionar.</div>
            </div>

            {/* Bus Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-xs font-bold text-gray-600 z-20 flex items-center gap-2">
                    <Truck size={14} /> {config.vehicleConfig.label}
                    <button onClick={() => { if(window.confirm('Resetar layout?')) { setConfig({ vehicleConfig: null, seats: [] }); onSave({ ...trip.operationalData, transport: undefined }); } }} className="ml-2 text-gray-400 hover:text-red-500"><Settings size={14}/></button>
                </div>
                <div className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide">
                    <div className="bg-white px-8 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative min-h-[600px] w-fit">
                        <div className="absolute top-0 left-0 right-0 h-24 border-b-2 border-slate-200 bg-slate-50 flex justify-center items-center rounded-t-[34px]"><User size={24} className="text-slate-300"/></div>
                        <div className="mt-12 space-y-2 select-none">{renderBusLayout()}</div>
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                    </div>
                </div>
            </div>
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
    const [rooms, setRooms] = useState<RoomConfig[]>(trip.operationalData?.rooming || []);
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [nameOverrides, setNameOverrides] = useState<Record<string, string>>((trip.operationalData as any)?.passengerNameOverrides || {});
    
    // UI
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
    
    // Batch Config
    const [invQty, setInvQty] = useState(1);
    const [invType, setInvType] = useState<'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE'>('DOUBLE');

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

    const unassignedPassengers = useMemo(() => {
        const assignedIds = new Set();
        rooms.forEach(r => r.guests.forEach(g => assignedIds.add(g.bookingId)));
        return allPassengers.filter(p => !assignedIds.has(p.id));
    }, [allPassengers, rooms]);

    // Actions
    const handleBatchCreate = () => {
        const newRooms: RoomConfig[] = [];
        const capMap = { 'DOUBLE': 2, 'TRIPLE': 3, 'QUAD': 4, 'COLLECTIVE': 6 };
        const startIdx = rooms.length + 1;
        for(let i=0; i<invQty; i++) {
            newRooms.push({ id: crypto.randomUUID(), name: `Quarto ${startIdx+i}`, type: invType, capacity: capMap[invType], guests: [] });
        }
        const updated = [...rooms, ...newRooms];
        setRooms(updated);
        onSave({ ...trip.operationalData, rooming: updated });
    };

    const handleAssign = (roomId: string, passenger: { id: string, name: string, bookingId: string }) => {
        const target = rooms.find(r => r.id === roomId);
        if (target && target.guests.length < target.capacity) {
            const updated = rooms.map(r => r.id === roomId ? { ...r, guests: [...r.guests, { name: passenger.name, bookingId: passenger.id }] } : r);
            setRooms(updated);
            onSave({ ...trip.operationalData, rooming: updated });
            if (selectedPassenger?.id === passenger.id) setSelectedPassenger(null);
        } else {
            alert('Quarto lotado!');
        }
    };

    const handleRemoveGuest = (roomId: string, guestId: string) => {
        const updated = rooms.map(r => r.id === roomId ? { ...r, guests: r.guests.filter(g => g.bookingId !== guestId) } : r);
        setRooms(updated);
        onSave({ ...trip.operationalData, rooming: updated });
    };
    
    const handleDeleteRoom = (roomId: string) => {
        if(confirm('Excluir quarto?')) {
            const updated = rooms.filter(r => r.id !== roomId);
            setRooms(updated);
            onSave({ ...trip.operationalData, rooming: updated });
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

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Header Config */}
            <div className="bg-slate-50 border-b p-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase ml-2"><Building size={14}/> Config:</span>
                    <input type="number" min="1" max="20" value={invQty} onChange={e => setInvQty(parseInt(e.target.value)||1)} className="w-12 border rounded p-1 text-center text-sm font-bold"/>
                    <select value={invType} onChange={e => setInvType(e.target.value as any)} className="border rounded p-1 text-sm"><option value="DOUBLE">Duplo</option><option value="TRIPLE">Triplo</option><option value="QUAD">Quádruplo</option><option value="COLLECTIVE">Coletivo</option></select>
                    <button onClick={handleBatchCreate} className="bg-primary-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-primary-700 flex items-center gap-1"><Plus size={14}/> Add</button>
                </div>
                <div className="flex gap-4 text-xs text-gray-600 font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
                    <span>Vagas: <b>{totalCap}</b></span><span>Ocupado: <b className="text-blue-600">{occupied}</b></span><span>Livre: <b className="text-green-600">{totalCap - occupied}</b></span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left List */}
                <div className="w-80 border-r bg-white flex flex-col h-full shadow-sm z-10 flex-shrink-0">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Sem Quarto ({unassignedPassengers.length})</h4>
                        <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded"><Plus size={18}/></button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                         {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                         {unassignedPassengers.map(p => (
                             <div key={p.id} draggable onDragStart={(e) => handleDragStart(e, p)} onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : {id: p.id, name: p.name, bookingId: p.bookingId})} className={`p-3 rounded-lg border text-sm cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white shadow-md scale-[1.02]' : 'bg-white border-gray-200 hover:border-primary-300'}`}>
                                 <div className="flex items-center gap-3 overflow-hidden">
                                     <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}/>
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedPassenger?.id === p.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{p.name.charAt(0).toUpperCase()}</div>
                                     <span className="truncate font-medium">{p.name}</span>
                                 </div>
                                 {selectedPassenger?.id === p.id && <CheckCircle size={16}/>}
                             </div>
                         ))}
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
                                        <button onClick={(e) => {e.stopPropagation(); handleDeleteRoom(room.id);}} className="text-gray-300 hover:text-red-500 p-1.5"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="p-3 space-y-2 min-h-[80px]">
                                        {room.guests.map(g => (
                                            <div key={g.bookingId} className="bg-blue-50/50 px-3 py-2 rounded text-xs font-medium flex justify-between items-center group/guest border border-blue-100/50">
                                                <div className="flex items-center gap-2"><User size={12} className="text-blue-400"/><span className="truncate max-w-[120px]">{g.name}</span></div>
                                                <button onClick={(e)=>{e.stopPropagation(); handleRemoveGuest(room.id, g.bookingId);}} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100"><X size={14}/></button>
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

// 3. OPERATIONS MODULE (CONTAINER)
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
    const { showToast } = useToast();

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

            // Stats
            const opData = selectedTrip.operationalData || DEFAULT_OPERATIONAL_DATA;
            const tripBookings = myBookings.filter(b => b.tripId === selectedTrip.id && b.status === 'CONFIRMED');
            const totalPax = (opData.manualPassengers?.length || 0) + tripBookings.reduce((sum, b) => sum + b.passengers, 0);
            doc.text(`Total Passageiros: ${totalPax}`, 15, 80);

            // SEAT MAP
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Mapa de Assentos', 15, 20);
            if (opData.transport?.vehicleConfig) {
                const { cols, totalSeats, aisleAfterCol } = opData.transport.vehicleConfig;
                const rows = Math.ceil(totalSeats / cols);
                const seatData = [];
                for(let r = 1; r <= rows; r++) {
                    const rowData = [];
                    for(let c = 1; c <= cols; c++) {
                        const seatNum = ((r - 1) * cols) + c;
                        if (c === aisleAfterCol + 1) rowData.push(''); 
                        if (seatNum <= totalSeats) {
                            const occupant = opData.transport.seats?.find(s => s.seatNumber === seatNum.toString());
                            rowData.push(occupant ? `${seatNum}: ${occupant.passengerName}` : `${seatNum} [Livre]`);
                        } else rowData.push('');
                    }
                    seatData.push(rowData);
                }
                (doc as any).autoTable({ head: [], body: seatData, startY: 30, theme: 'grid', styles: { fontSize: 8, halign: 'center' } });
            }

            // ROOMING LIST
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Rooming List', 15, 20);
            const roomData = opData.rooming?.map(r => [r.name, r.type, r.guests.map(g => g.name).join('\n')]) || [];
            (doc as any).autoTable({ head: [['Quarto', 'Tipo', 'Hóspedes']], body: roomData, startY: 30, theme: 'grid' });

            // PAX LIST
            doc.addPage();
            doc.setFontSize(14);
            doc.text('Lista de Passageiros', 15, 20);
            const allPax: any[] = [];
            tripBookings.forEach(b => {
                const name = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name || 'Cliente';
                allPax.push([name, 'Principal', b.voucherCode]);
                for(let i=1; i<b.passengers; i++) allPax.push([`Acompanhante ${i} de ${name}`, 'Acompanhante', b.voucherCode]);
            });
            opData.manualPassengers?.forEach(p => allPax.push([p.name, 'Manual', p.document || '-']));
            (doc as any).autoTable({ head: [['Nome', 'Tipo', 'Ref']], body: allPax, startY: 30 });

            doc.save(`manifesto_${selectedTrip.slug}.pdf`);
            showToast('PDF gerado!', 'success');
        } catch (e: any) { console.error(e); showToast('Erro no PDF: '+e.message, 'error'); }
    };

    if (!selectedTripId || !selectedTrip) {
        return (
            <div className="flex h-full">
                <div className="w-80 border-r border-gray-200 bg-white p-4 overflow-y-auto custom-scrollbar flex-shrink-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Selecione uma viagem</h3>
                    <div className="space-y-2">
                        {myTrips.map(trip => (
                            <button key={trip.id} onClick={() => onSelectTrip(trip.id)} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 border border-gray-100 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 flex items-center justify-between group">
                                <span className="truncate">{trip.title}</span>
                                <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-600"/>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><Bus size={32} className="opacity-50"/></div>
                    <p className="font-medium">Selecione um pacote para gerenciar.</p>
                </div>
            </div>
        );
    }

    const tripBookings = myBookings.filter(b => b.tripId === selectedTripId);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center border-b border-gray-200 bg-white px-6 py-2 shrink-0 h-14">
                <div className="flex gap-6 h-full">
                    <button onClick={() => setActiveView('TRANSPORT')} className={`flex items-center gap-2 h-full border-b-2 text-sm font-bold transition-colors ${activeView === 'TRANSPORT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Bus size={18}/> Transporte</button>
                    <button onClick={() => setActiveView('ROOMING')} className={`flex items-center gap-2 h-full border-b-2 text-sm font-bold transition-colors ${activeView === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><BedDouble size={18}/> Hospedagem</button>
                </div>
                <button onClick={generateManifest} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm"><FileDown size={14}/> Manifesto PDF</button>
            </div>
            
            <div className="flex-1 overflow-hidden min-h-0 bg-slate-50">
                {activeView === 'TRANSPORT' ? (
                    <TransportManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                ) : (
                    <RoomingManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                )}
            </div>
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
    { label: 'Gerenciar Operacional', icon: Bus, onClick: () => setSelectedOperationalTripId(trip.id) },
    { label: 'Duplicar', icon: Copy, onClick: () => handleDuplicateTrip(trip) },
    { label: trip.is_active ? 'Pausar' : 'Publicar', icon: trip.is_active ? PauseCircle : PlayCircle, onClick: () => toggleTripStatus(trip.id) },
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

      {selectedOperationalTripId && currentAgency && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
              {/* Changed h-[95vh] to h-[90vh] and added flex flex-col overflow-hidden to parent */}
              <div className="bg-white rounded-2xl max-w-7xl w-full h-[90vh] shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedOperationalTripId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full z-50"><X size={20}/></button>
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center"><Truck size={20}/></div>
                      <h2 className="text-xl font-bold text-gray-900">Gerenciar Operacional</h2>
                  </div>
                  
                  {/* Container for the module needs to be flex-1 and handle overflow */}
                  <div className="flex-1 overflow-hidden min-h-0">
                      <OperationsModule 
                          myTrips={myTrips} 
                          myBookings={myBookings} 
                          clients={clients} 
                          selectedTripId={selectedOperationalTripId} 
                          onSelectTrip={setSelectedOperationalTripId}
                          onSaveTripData={updateTripOperationalData}
                          currentAgency={currentAgency}
                      />
                  </div>
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
                              {sortedBookings.map(booking => {
                                  const client = clients.find(c => c.id === booking.clientId);
                                  const isNew = isNewBooking(booking.date);
                                  return (
                                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4 font-mono text-xs text-gray-700">{booking.voucherCode}</td>
                                          <td className="px-6 py-4 text-sm font-bold text-gray-900">{booking._trip?.title || 'N/A'}</td>
                                          <td className="px-6 py-4 text-sm text-gray-700">{client?.name || 'Cliente Desconhecido'}</td>
                                          <td className="px-6 py-4 text-sm text-gray-500">
                                              <div className="flex items-center gap-2">
                                                  {new Date(booking.date).toLocaleDateString()}
                                                  {isNew && <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">NOVO</span>}
                                              </div>
                                          </td>
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
                      <ShoppingBag size={32} className="mx-auto mb-3"/>
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
              
              {selectedOperationalTripId && currentAgency ? (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
                      {/* Changed h-[95vh] to h-[90vh] and added flex flex-col overflow-hidden to parent */}
                      <div className="bg-white rounded-2xl max-w-7xl w-full h-[90vh] shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedOperationalTripId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full z-50"><X size={20}/></button>
                          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4 shrink-0">
                              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center"><Truck size={20}/></div>
                              <h2 className="text-xl font-bold text-gray-900">Gerenciar Operacional</h2>
                          </div>
                          
                          {/* Container for the module needs to be flex-1 and handle overflow */}
                          <div className="flex-1 overflow-hidden min-h-0">
                              <OperationsModule 
                                  myTrips={myTrips} 
                                  myBookings={myBookings} 
                                  clients={clients} 
                                  selectedTripId={selectedOperationalTripId} 
                                  onSelectTrip={setSelectedOperationalTripId}
                                  onSaveTripData={updateTripOperationalData}
                                  currentAgency={currentAgency}
                              />
                          </div>
                      </div>
                  </div>
              ) : (
                   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
                       <p>Selecione uma viagem na aba "Meus Pacotes" e clique em "Gerenciar Operacional" para abrir o painel.</p>
                   </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome da Agência</label><input value={profileForm.name || ''} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label><input value={profileForm.whatsapp || ''} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone Fixo</label><input value={profileForm.phone || ''} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="(XX) XXXX-XXXX" /></div>
                      <div><label className="block text-sm font-bold text-gray-700 mb-1">Website</label><input value={profileForm.website || ''} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border p-2.5 rounded-lg outline-none focus:ring-primary-500 focus:border-primary-500" placeholder="https://suaagencia.com.br" /></div>
                      
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalizar Tema do Meu Microsite</h2>
              <form onSubmit={handleSaveTheme} className="space-y-6">
                  
                  {/* Preset Colors */}
                  <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Cores Rápidas</label>
                      <div className="flex gap-3 flex-wrap">
                          {[
                              {p: '#3b82f6', s: '#f97316'}, // Default
                              {p: '#10b981', s: '#3b82f6'}, // Emerald/Blue
                              {p: '#8b5cf6', s: '#ec4899'}, // Purple/Pink
                              {p: '#f59e0b', s: '#ef4444'}, // Amber/Red
                              {p: '#06b6d4', s: '#10b981'}, // Cyan/Emerald
                              {p: '#6366f1', s: '#8b5cf6'}, // Indigo/Purple
                          ].map((c, i) => (
                              <button 
                                key={i}
                                type="button"
                                onClick={() => setThemeForm({ ...themeForm, primary: c.p, secondary: c.s })}
                                className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform ring-1 ring-gray-200 overflow-hidden relative"
                              >
                                  <div className="absolute left-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: c.p }}></div>
                                  <div className="absolute right-0 top-0 bottom-0 w-1/2" style={{ backgroundColor: c.s }}></div>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Primária</label>
                          <div className="flex items-center gap-2">
                              <input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                              <input value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 uppercase" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Cor Secundária</label>
                          <div className="flex items-center gap-2">
                              <input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                              <input value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="flex-1 border p-2.5 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500 uppercase" />
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