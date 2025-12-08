
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  LucideProps,
  Zap,
  Camera,
  Upload,
  FileDown,
  Building,
  Armchair // Added Armchair icon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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

// Confirmation Modal
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

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ComponentType<LucideProps>; label: string }> = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} className={`w-full flex items-center px-6 py-3.5 text-sm font-bold transition-all border-l-4 ${active ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
        <Icon size={20} className={`mr-3 ${active ? 'text-primary-600' : 'text-gray-400'}`}/>
        {label}
    </button>
);

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

// --- REFACTORED TRANSPORT MANAGER (DRAG & DROP + SMART CLICK) ---

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
    const [showManualForm, setShowManualForm] = useState(false);
    
    // UI State
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [dragOverSeat, setDragOverSeat] = useState<string | null>(null);
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);

    // Custom Vehicle Form
    const [showCustomVehicleForm, setShowCustomVehicleForm] = useState(false);
    const [customVehicleData, setCustomVehicleData] = useState({ label: '', totalSeats: 4, cols: 2 });
    
    const { showToast } = useToast();

    // Consolidated Passengers List
    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                const originalName = i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`;
                return { 
                    id, 
                    bookingId: b.id, 
                    name: nameOverrides[id] || originalName, 
                    isManual: false
                };
            });
        });
        const manual = manualPassengers.map(p => ({
            id: p.id,
            bookingId: p.id,
            name: nameOverrides[p.id] || p.name,
            isManual: true
        }));
        return [...booked, ...manual];
    }, [bookings, clients, manualPassengers, nameOverrides]);

    const isSeatOccupied = (seatNum: string) => config.seats.find(s => s.seatNumber === seatNum);

    // Get unassigned passengers for the list
    const unassignedPassengers = useMemo(() => {
        const assignedIds = new Set(config.seats.map(s => s.bookingId));
        // Use bookingId/id combination to track uniqueness
        return allPassengers.filter(p => !assignedIds.has(p.id));
    }, [allPassengers, config.seats]);

    // --- ACTIONS ---

    const handleAssign = (seatNum: string, passenger: { id: string, name: string, bookingId: string }) => {
        // Check if seat is occupied
        if (isSeatOccupied(seatNum)) {
            showToast(`Assento ${seatNum} já ocupado.`, 'warning');
            return;
        }

        const newSeat: PassengerSeat = {
            seatNumber: seatNum,
            passengerName: passenger.name,
            bookingId: passenger.id, // Using the unique passenger ID derived above
            status: 'occupied'
        };

        const newSeats = [...config.seats, newSeat];
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig);
        onSave({ ...trip.operationalData, transport: newConfig });
        
        // Clear selection if it was a smart click
        if (selectedPassenger?.id === passenger.id) {
            setSelectedPassenger(null);
        }
    };

    const handleUnassign = (seatNum: string) => {
        const newSeats = config.seats.filter(s => s.seatNumber !== seatNum);
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig);
        onSave({ ...trip.operationalData, transport: newConfig });
    };

    const confirmRemoveSeat = () => {
        if (seatToDelete) {
            handleUnassign(seatToDelete.seatNum);
            setSeatToDelete(null);
        }
    };

    // --- DRAG AND DROP HANDLERS ---

    const handleDragStart = (e: React.DragEvent, passenger: { id: string, name: string, bookingId: string }) => {
        e.dataTransfer.setData('application/json', JSON.stringify(passenger));
        e.dataTransfer.effectAllowed = 'move';
        // Optional: Set custom drag image or styling here
    };

    const handleDragOver = (e: React.DragEvent, seatNum: string) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
        if (dragOverSeat !== seatNum) setDragOverSeat(seatNum);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragOverSeat(null);
    };

    const handleDrop = (e: React.DragEvent, seatNum: string) => {
        e.preventDefault();
        setDragOverSeat(null);
        try {
            const data = e.dataTransfer.getData('application/json');
            const passenger = JSON.parse(data);
            if (passenger && passenger.id) {
                handleAssign(seatNum, passenger);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    // --- SMART CLICK HANDLER ---

    const handleSeatClick = (seatNum: string) => {
        const occupant = isSeatOccupied(seatNum);
        
        if (occupant) {
            setSeatToDelete({ seatNum, name: occupant.passengerName });
        } else if (selectedPassenger) {
            handleAssign(seatNum, selectedPassenger);
        }
    };

    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') { setShowCustomVehicleForm(true); return; }
        const newConfig = VEHICLE_TYPES[type];
        setConfig({ vehicleConfig: newConfig, seats: [] });
        onSave({ ...trip.operationalData, transport: { vehicleConfig: newConfig, seats: [] } });
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
        setConfig({ vehicleConfig: newConfig, seats: [] });
        onSave({ ...trip.operationalData, transport: { vehicleConfig: newConfig, seats: [] } });
        setShowCustomVehicleForm(false);
    };

    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    // --- RENDER BUS LAYOUT ---
    const renderBusLayout = () => {
        if (!config.vehicleConfig) return null;
        const { totalSeats, cols, aisleAfterCol } = config.vehicleConfig;
        const rows = Math.ceil(totalSeats / cols);
        const grid: React.ReactElement[] = []; 

        for (let r = 1; r <= rows; r++) {
            const rowSeats: React.ReactElement[] = []; 
            for (let c = 1; c <= cols; c++) {
                const seatNum = ((r - 1) * cols) + c;
                
                // Aisle
                if (c === aisleAfterCol + 1) { 
                    rowSeats.push(
                        <div key={`aisle-${r}-${c}`} className="w-8 flex justify-center items-center text-xs text-slate-300 font-mono select-none">
                            {r}
                        </div>
                    ); 
                }

                if (seatNum <= totalSeats) {
                    const seatStr = seatNum.toString();
                    const occupant = isSeatOccupied(seatStr);
                    const isTarget = dragOverSeat === seatStr || (selectedPassenger && !occupant);
                    const isHovered = dragOverSeat === seatStr;

                    rowSeats.push(
                        <div
                            key={seatNum}
                            onDragOver={(e) => !occupant && handleDragOver(e, seatStr)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => !occupant && handleDrop(e, seatStr)}
                            onClick={() => handleSeatClick(seatStr)}
                            className={`
                                relative w-12 h-12 md:w-14 md:h-14 flex flex-col items-center justify-center transition-all duration-200
                                ${occupant 
                                    ? 'cursor-pointer text-primary-600' 
                                    : isTarget 
                                        ? 'cursor-pointer scale-105' 
                                        : 'cursor-default text-gray-300'
                                }
                            `}
                            title={occupant ? occupant.passengerName : `Poltrona ${seatNum}`}
                        >
                            <Armchair 
                                size={40} 
                                className={`
                                    transition-all duration-300
                                    ${occupant ? 'fill-primary-100 stroke-primary-600 stroke-[1.5px]' : 'fill-white stroke-gray-300 stroke-[1px]'}
                                    ${isHovered ? 'stroke-green-500 stroke-[2px] fill-green-50 scale-110' : ''}
                                    ${selectedPassenger && !occupant ? 'hover:stroke-green-500 hover:fill-green-50' : ''}
                                `} 
                            />
                            <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold ${occupant ? 'text-primary-700' : 'text-gray-400'}`}>
                                {occupant 
                                    ? occupant.passengerName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() 
                                    : seatNum}
                            </span>
                            
                            {/* Hover Name Tooltip */}
                            {occupant && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg opacity-0 hover:opacity-100 whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                    {occupant.passengerName}
                                </div>
                            )}
                        </div>
                    );
                } else {
                    rowSeats.push(<div key={`empty-${seatNum}`} className="w-12 h-12 md:w-14 md:h-14"></div>);
                }
            }
            grid.push(<div key={`row-${r}`} className="flex justify-center items-center gap-1 mb-2">{rowSeats}</div>);
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
                    {!showCustomVehicleForm ? ( <> <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600"><Settings2 size={32}/></div> <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure o Transporte</h2> <p className="text-gray-500 mb-8 max-w-md mx-auto"> Escolha um modelo padrão ou crie um layout personalizado. </p> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {Object.values(VEHICLE_TYPES).map(v => ( <button key={v.type} onClick={() => handleSelectVehicleType(v.type)} className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 hover:shadow-md transition-all group bg-white"> <Truck size={24} className="mb-3 text-gray-400 group-hover:text-primary-600"/> <span className="font-bold text-gray-700 group-hover:text-primary-700 text-sm">{v.label}</span> <span className="text-xs text-gray-400 mt-1">{v.totalSeats > 0 ? `${v.totalSeats} Lugares` : 'Definir'}</span> </button> ))} </div> </> ) : ( <form onSubmit={handleSaveCustomVehicle} className="text-left max-w-sm mx-auto"> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Veículo Personalizado</h3><button type="button" onClick={() => setShowCustomVehicleForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div> <div className="space-y-4"> <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Doblo Prata"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Lugares</label><input type="number" required min="1" max="100" value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"><option value={2}>2 Colunas</option><option value={3}>3 Colunas</option><option value={4}>4 Colunas</option></select></div> <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg mt-4 flex items-center justify-center gap-2"><Check size={18} /> Criar Layout</button> </div> </form> )} </div> </div> 
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-0 h-full overflow-hidden bg-white">
            <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Deseja remover ${seatToDelete?.name} da poltrona ${seatToDelete?.seatNum}?`} confirmText="Liberar" variant="warning" />

            {/* Sidebar with Passengers */}
            <div className="w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Passageiros ({unassignedPassengers.length})</h4>
                    <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors" title="Adicionar Manual"><Plus size={18}/></button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                    <div className="space-y-2">
                        {unassignedPassengers.map(p => (
                            <div 
                                key={p.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, p)}
                                onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : { id: p.id, name: p.name, bookingId: p.bookingId })}
                                className={`
                                    p-3 rounded-lg border text-sm cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group select-none
                                    ${selectedPassenger?.id === p.id 
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-[1.02] ring-2 ring-primary-100' 
                                        : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm text-gray-700'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex flex-col items-center justify-center">
                                        <Grip size={12} className={`mb-1 ${selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'}`}/>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedPassenger?.id === p.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="font-medium truncate block">{p.name}</span>
                                        {p.isManual && <span className="text-[10px] opacity-70 block">Manual</span>}
                                    </div>
                                </div>
                                {selectedPassenger?.id === p.id && <CheckCircle size={16} className="text-white"/>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                    Arraste para o assento ou clique para selecionar.
                </div>
            </div>

            {/* Bus Visualizer */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative">
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-xs font-bold text-gray-600 z-20 flex items-center gap-2">
                    <Truck size={14} /> {config.vehicleConfig?.label}
                    <span className="w-px h-4 bg-gray-300 mx-1"></span>
                    <span className={occupancyRate >= 80 ? 'text-green-600' : 'text-gray-500'}>{occupancyRate.toFixed(0)}% Ocupado</span>
                    <button onClick={() => { if(window.confirm('Resetar layout?')) { setConfig({ vehicleConfig: null, seats: [] }); onSave({ ...trip.operationalData, transport: undefined }); } }} className="ml-2 text-gray-400 hover:text-red-500" title="Trocar Veículo"><Settings size={14} /></button>
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
                            
                            <div className="mt-16 space-y-2 select-none">
                                {renderBusLayout()}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// RoomingManager Component (Basic implementation)
const RoomingManager: React.FC<{ trip: Trip; bookings: Booking[]; onSave: (data: OperationalData) => void }> = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <BedDouble size={48} className="mb-4 text-gray-300"/>
            <p>Gerenciamento de Rooming List em desenvolvimento.</p>
        </div>
    )
}

// OperationsModule Component
const OperationsModule: React.FC<{ trip: Trip; onClose: () => void }> = ({ trip, onClose }) => {
    const { bookings, clients, updateTripOperationalData } = useData();
    const [activeTab, setActiveTab] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');
    
    // Filter bookings for this trip
    const tripBookings = bookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED');

    const handleSave = async (data: OperationalData) => {
        await updateTripOperationalData(trip.id, data);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-[fadeIn_0.2s]">
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center bg-white shadow-sm z-10">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings size={24} className="text-primary-600"/> 
                        Operações: {trip.title}
                    </h2>
                    <p className="text-sm text-gray-500">Gerencie transporte e hospedagem</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="flex border-b border-gray-200 bg-gray-50 px-6">
                <button onClick={() => setActiveTab('TRANSPORT')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'TRANSPORT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <Bus size={18}/> Transporte
                </button>
                <button onClick={() => setActiveTab('ROOMING')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <BedDouble size={18}/> Rooming List
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'TRANSPORT' ? (
                    <TransportManager trip={trip} bookings={tripBookings} clients={clients} onSave={handleSave} />
                ) : (
                    <RoomingManager trip={trip} bookings={tripBookings} onSave={handleSave} />
                )}
            </div>
        </div>
    );
};

// AgencyDashboard Component
export const AgencyDashboard: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { agencies, trips, bookings, getAgencyStats, refreshData, toggleTripStatus } = useData();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // UI States
    const activeTab = (searchParams.get('tab') as 'OVERVIEW' | 'TRIPS' | 'BOOKINGS' | 'SETTINGS') || 'OVERVIEW';
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [createTripModal, setCreateTripModal] = useState(false);
    const [editTripData, setEditTripData] = useState<Trip | undefined>(undefined);
    const [operationsTrip, setOperationsTrip] = useState<Trip | null>(null);

    const agency = useMemo(() => {
        return agencies.find(a => a.id === user?.id);
    }, [agencies, user]);

    useEffect(() => {
        if (agency) {
            getAgencyStats(agency.agencyId).then(setStats);
        }
    }, [agency, getAgencyStats, trips, bookings]);

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        if (agency) getAgencyStats(agency.agencyId).then(setStats);
        setIsRefreshing(false);
    };

    if (!user || user.role !== 'AGENCY') return <div className="p-8 text-center">Acesso Negado</div>;
    if (!agency) return <div className="p-8 text-center"><Loader className="animate-spin inline mr-2"/> Carregando dados da agência...</div>;

    const myTrips = trips.filter(t => t.agencyId === agency.agencyId);
    const myBookings = bookings.filter(b => b._trip?.agencyId === agency.agencyId);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <img src={agency.logo} className="w-16 h-16 rounded-full border-2 border-gray-100 object-cover" alt="Logo"/>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{agency.name}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase">{agency.subscriptionPlan}</span>
                            <Link to={`/${agency.slug}`} target="_blank" className="flex items-center hover:text-primary-600 hover:underline">
                                /{agency.slug} <ExternalLink size={12} className="ml-1"/>
                            </Link>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRefresh} disabled={isRefreshing} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center hover:bg-gray-200 transition-colors disabled:opacity-50">
                        {isRefreshing ? <Loader size={18} className="animate-spin mr-2"/> : <Zap size={18} className="mr-2"/>} Atualizar
                    </button>
                    <button onClick={() => { setEditTripData(undefined); setCreateTripModal(true); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20">
                        <Plus size={18} className="mr-2"/> Criar Pacote
                    </button>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
                <button onClick={() => handleTabChange('OVERVIEW')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'OVERVIEW' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><BarChart2 size={16}/> Visão Geral</button>
                <button onClick={() => handleTabChange('TRIPS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'TRIPS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Plane size={16}/> Meus Pacotes <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{myTrips.length}</span></button>
                <button onClick={() => handleTabChange('BOOKINGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'BOOKINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><ShoppingBag size={16}/> Reservas <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{myBookings.length}</span></button>
                <button onClick={() => handleTabChange('SETTINGS')} className={`flex items-center gap-2 py-4 px-6 font-bold text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'SETTINGS' ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Settings size={16}/> Configurações</button>
            </div>

            {/* Content */}
            <div className="animate-[fadeIn_0.3s]">
                {activeTab === 'OVERVIEW' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Receita Total" value={`R$ ${stats?.totalRevenue.toLocaleString() || '0'}`} subtitle="Vendas confirmadas" icon={DollarSign} color="green"/>
                        <StatCard title="Vendas" value={stats?.totalSales || 0} subtitle="Passageiros totais" icon={Users} color="blue"/>
                        <StatCard title="Visualizações" value={stats?.totalViews || 0} subtitle="Total de acessos" icon={Eye} color="purple"/>
                        <StatCard title="Avaliação Média" value={stats?.averageRating?.toFixed(1) || '-'} subtitle={`${stats?.totalReviews || 0} avaliações`} icon={Star} color="amber"/>
                    </div>
                )}

                {activeTab === 'TRIPS' && (
                    <div className="space-y-6">
                        {myTrips.map(trip => (
                            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4 items-center hover:border-primary-200 transition-colors">
                                <img src={trip.images[0]} className="w-full md:w-32 h-32 md:h-24 object-cover rounded-lg" alt=""/>
                                <div className="flex-1 w-full text-center md:text-left">
                                    <h3 className="font-bold text-gray-900 text-lg">{trip.title}</h3>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 mt-1">
                                        <span className="flex items-center"><Calendar size={14} className="mr-1"/> {new Date(trip.startDate).toLocaleDateString()}</span>
                                        <span className="flex items-center"><DollarSign size={14} className="mr-1"/> R$ {trip.price}</span>
                                        <Badge color={trip.is_active ? 'green' : 'gray'}>{trip.is_active ? 'ATIVO' : 'PAUSADO'}</Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <button onClick={() => setOperationsTrip(trip)} className="flex-1 md:flex-none bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 flex items-center justify-center gap-2"><Settings size={16}/> Operações</button>
                                    <button onClick={() => { setEditTripData(trip); setCreateTripModal(true); }} className="flex-1 md:flex-none bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center justify-center gap-2"><Edit size={16}/> Editar</button>
                                    <button onClick={() => toggleTripStatus(trip.id)} className={`flex-1 md:flex-none px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${trip.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                                        {trip.is_active ? <PauseCircle size={16}/> : <PlayCircle size={16}/>}
                                        {trip.is_active ? 'Pausar' : 'Ativar'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {myTrips.length === 0 && <div className="text-center py-12 text-gray-500">Nenhum pacote criado.</div>}
                    </div>
                )}

                {activeTab === 'BOOKINGS' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reserva</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pacote</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Valor</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {myBookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{booking.voucherCode}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{(booking as any)._client?.name || 'Cliente'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{booking._trip?.title}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">R$ {booking.totalPrice}</td>
                                        <td className="px-6 py-4"><Badge color={booking.status === 'CONFIRMED' ? 'green' : 'amber'}>{booking.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {myBookings.length === 0 && <div className="text-center py-12 text-gray-500">Nenhuma reserva encontrada.</div>}
                    </div>
                )}

                {activeTab === 'SETTINGS' && (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4">Em breve</h2>
                        <p className="text-gray-500">Configurações avançadas da agência.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            {createTripModal && (
                <CreateTripWizard 
                    onClose={() => setCreateTripModal(false)} 
                    onSuccess={() => { setCreateTripModal(false); handleRefresh(); }} 
                    initialTripData={editTripData}
                />
            )}

            {operationsTrip && (
                <OperationsModule 
                    trip={operationsTrip} 
                    onClose={() => setOperationsTrip(null)}
                />
            )}
        </div>
    );
};
