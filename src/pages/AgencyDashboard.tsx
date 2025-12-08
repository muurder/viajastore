
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
  Building
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CreateTripWizard from '../components/agency/CreateTripWizard';
import { slugify } from '../utils/slugify';

// --- CONSTANTS ---

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

// --- HELPER COMPONENTS ---

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

// --- TRANSPORT MANAGER ---
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
    const [customVehicleData, setCustomVehicleData] = useState({ label: '', totalSeats: 4, cols: 2 });
    const [seatToDelete, setSeatToDelete] = useState<{ seatNum: string; name: string } | null>(null);

    const handleSelectVehicleType = (type: VehicleType) => {
        if (type === 'CUSTOM') { setShowCustomVehicleForm(true); return; }
        const newConfig = VEHICLE_TYPES[type];
        const newTransportState: TransportConfig = { vehicleConfig: newConfig, seats: [] };
        setConfig(newTransportState);
        onSave({ ...trip.operationalData, transport: newTransportState });
    };

    const handleSaveCustomVehicle = (e: React.FormEvent) => {
        e.preventDefault();
        const newConfig: VehicleLayoutConfig = { type: 'CUSTOM', label: customVehicleData.label || 'Veículo Personalizado', totalSeats: customVehicleData.totalSeats, cols: customVehicleData.cols, aisleAfterCol: Math.floor(customVehicleData.cols / 2) };
        const newTransportState: TransportConfig = { vehicleConfig: newConfig, seats: [] };
        setConfig(newTransportState);
        onSave({ ...trip.operationalData, transport: newTransportState });
        setShowCustomVehicleForm(false);
    };

    const bookingPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
        return Array.from({ length: b.passengers }).map((_, i) => ({ id: `${b.id}-${i}`, bookingId: b.id, name: i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`, }));
    });

    const allPassengers = [ ...bookingPassengers, ...manualPassengers.map(p => ({ id: p.id, bookingId: p.id, name: p.name })) ];
    const isSeatOccupied = (seatNum: string) => config.seats.find(s => s.seatNumber === seatNum);

    const handleSeatClick = (seatNum: string) => {
        const existingSeat = isSeatOccupied(seatNum);
        if (existingSeat) { setSeatToDelete({ seatNum, name: existingSeat.passengerName }); } else if (selectedPassenger) {
            const newSeat: PassengerSeat = { seatNumber: seatNum, passengerName: selectedPassenger.name, bookingId: selectedPassenger.bookingId, status: 'occupied' };
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
                if (c === aisleAfterCol + 1) { rowSeats.push(<div key={`aisle-${r}-${c}`} className="w-8 flex justify-center items-center text-xs text-slate-300 font-mono select-none">{r}</div>); }
                if (seatNum <= totalSeats) {
                    const seatStr = seatNum.toString();
                    const occupant = isSeatOccupied(seatStr);
                    rowSeats.push(<button key={seatNum} onClick={() => handleSeatClick(seatStr)} className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all border-2 shadow-sm relative group ${occupant ? 'bg-primary-600 text-white border-primary-700 shadow-primary-500/30' : selectedPassenger ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:scale-105 cursor-pointer border-dashed' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:bg-gray-50'}`} title={occupant ? occupant.passengerName : `Poltrona ${seatNum}`}> <User size={16} className={`mb-0.5 ${occupant ? 'fill-current' : ''}`}/> <span className="text-[10px]">{seatNum}</span> {occupant && ( <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"> {occupant.passengerName} </div> )} </button>);
                } else { rowSeats.push(<div key={`empty-${seatNum}`} className="w-10 h-10 md:w-12 md:h-12"></div>); }
            }
            grid.push(<div key={`row-${r}`} className="flex justify-center items-center gap-2 mb-3">{rowSeats}</div>);
        }
        return grid;
    };
    const occupancyRate = config.vehicleConfig && config.vehicleConfig.totalSeats > 0 ? (config.seats.length / config.vehicleConfig.totalSeats) * 100 : 0;

    if (!config.vehicleConfig) {
        return ( <div className="flex-1 h-full bg-slate-50 flex flex-col items-center justify-center p-8 animate-[fadeIn_0.3s]"> <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-2xl w-full text-center"> {!showCustomVehicleForm ? ( <> <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-primary-600"><Settings2 size={32}/></div> <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure o Transporte</h2> <p className="text-gray-500 mb-8 max-w-md mx-auto"> Escolha um modelo padrão ou crie um layout personalizado. </p> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {Object.values(VEHICLE_TYPES).map(v => ( <button key={v.type} onClick={() => handleSelectVehicleType(v.type)} className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-500 hover:bg-primary-50 hover:shadow-md transition-all group bg-white"> <Truck size={24} className="mb-3 text-gray-400 group-hover:text-primary-600"/> <span className="font-bold text-gray-700 group-hover:text-primary-700 text-sm">{v.label}</span> <span className="text-xs text-gray-400 mt-1">{v.totalSeats > 0 ? `${v.totalSeats} Lugares` : 'Definir'}</span> </button> ))} </div> </> ) : ( <form onSubmit={handleSaveCustomVehicle} className="text-left max-w-sm mx-auto"> <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Veículo Personalizado</h3><button type="button" onClick={() => setShowCustomVehicleForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div> <div className="space-y-4"> <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome</label><input required value={customVehicleData.label} onChange={e => setCustomVehicleData({...customVehicleData, label: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Doblo Prata"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Lugares</label><input type="number" required min="1" max="100" value={customVehicleData.totalSeats} onChange={e => setCustomVehicleData({...customVehicleData, totalSeats: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div> <div><label className="block text-sm font-bold text-gray-700 mb-1">Colunas</label><select value={customVehicleData.cols} onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"><option value={2}>2 Colunas</option><option value={3}>3 Colunas</option><option value={4}>4 Colunas</option></select></div> <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg mt-4 flex items-center justify-center gap-2"><Check size={18} /> Criar Layout</button> </div> </form> )} </div> </div> );
    }

    return ( <div className="flex flex-col lg:flex-row gap-0 h-full overflow-hidden bg-white"> <ConfirmationModal isOpen={!!seatToDelete} onClose={() => setSeatToDelete(null)} onConfirm={confirmRemoveSeat} title="Liberar Assento" message={`Deseja remover ${seatToDelete?.name} da poltrona ${seatToDelete?.seatNum}?`} confirmText="Liberar" variant="warning" /> <div className="w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10"> <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"> <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Lista de Passageiros</h4> <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors" title="Adicionar Manual"><Plus size={18}/></button> </div> <div className="p-4 flex-1 overflow-y-auto custom-scrollbar"> {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />} <div className="space-y-2"> {allPassengers.map(p => { const isSeated = config.seats.some(s => s.bookingId === p.bookingId && s.passengerName === p.name); return ( <div key={p.id} onClick={() => !isSeated && setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)} className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between group ${isSeated ? 'bg-gray-50 border-gray-100 opacity-60' : selectedPassenger?.id === p.id ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 shadow-sm' : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm'}`}> <div className="flex items-center gap-3 overflow-hidden"> <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSeated ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>{p.name.charAt(0).toUpperCase()}</div> <span className={`truncate ${isSeated ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>{p.name}</span> </div> {isSeated ? <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">OK</div> : <div className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-primary-400 transition-colors"></div>} </div> ); })} </div> </div> </div> <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 relative"> <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-200 text-xs font-bold text-gray-600 z-20 flex items-center gap-2"> <Truck size={14} /> {config.vehicleConfig?.label} <span className="w-px h-4 bg-gray-300 mx-1"></span> <span className={occupancyRate >= 80 ? 'text-green-600' : 'text-gray-500'}>{occupancyRate.toFixed(0)}% Ocupado</span> <button onClick={() => { if(window.confirm('Resetar layout?')) { setConfig({ vehicleConfig: null, seats: [] }); onSave({ ...trip.operationalData, transport: undefined }); } }} className="ml-2 text-gray-400 hover:text-red-500" title="Trocar Veículo"><Settings size={14} /></button> </div> <div className="flex-1 overflow-auto p-8 flex justify-center scrollbar-hide"> <div className="w-full max-w-lg pb-20"> <div className="bg-white px-6 md:px-12 py-16 rounded-[40px] border-[6px] border-slate-300 shadow-2xl relative transition-all duration-500 min-h-[600px]"> <div className="absolute top-0 left-0 right-0 h-28 border-b-2 border-slate-200 rounded-t-[34px] bg-gradient-to-b from-slate-50 to-white flex justify-between px-8 pt-6"> <div className="flex flex-col items-center justify-center opacity-50"> <div className="w-10 h-10 rounded-full border-4 border-slate-300 flex items-center justify-center text-slate-300 bg-slate-50 shadow-inner mb-1"><User size={20} /></div> <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Frente</span> </div> <div className="w-10"></div> </div> <div className="mt-16 space-y-2">{renderBusLayout()}</div> <div className="absolute bottom-0 left-0 right-0 h-12 bg-slate-100 rounded-b-[34px] border-t border-slate-200"></div> </div> </div> </div> </div> </div> );
};


// --- ROOMING MANAGER ---
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
    
    // UI State
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');
    
    // Inventory Config State
    const [invQty, setInvQty] = useState(1);
    const [invType, setInvType] = useState<'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE'>('DOUBLE');

    // Derived Passengers List
    const allPassengers = useMemo(() => {
        const booked = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                const originalName = i === 0 ? (clientName || 'Passageiro') : `Acompanhante ${i + 1} (${clientName || ''})`;
                return { 
                    id, 
                    bookingId: b.id, 
                    name: nameOverrides[id] || originalName, // Use override if exists
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

    // Assigned Check
    const getAssignedPassengers = () => {
        const assignedIds = new Set<string>();
        rooms.forEach(r => r.guests.forEach(g => assignedIds.add(g.bookingId))); // bookingId here serves as unique passenger ref
        return assignedIds;
    };

    const assignedSet = getAssignedPassengers();
    const unassignedPassengers = allPassengers.filter(p => !assignedSet.has(p.id));

    // --- ACTIONS ---

    const handleBatchCreate = () => {
        const newRooms: RoomConfig[] = [];
        const capacityMap = { 'DOUBLE': 2, 'TRIPLE': 3, 'QUAD': 4, 'COLLECTIVE': 6 };
        const startIdx = rooms.length + 1;

        for(let i=0; i<invQty; i++) {
            newRooms.push({
                id: crypto.randomUUID(),
                name: `Quarto ${startIdx + i}`,
                type: invType,
                capacity: capacityMap[invType],
                guests: []
            });
        }
        
        const updatedRooms = [...rooms, ...newRooms];
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
    };

    const handleAssign = (roomId: string) => {
        if (!selectedPassenger) return;
        
        const targetRoom = rooms.find(r => r.id === roomId);
        if (!targetRoom) return;
        
        if (targetRoom.guests.length >= targetRoom.capacity) {
            alert('Este quarto já está lotado.');
            return;
        }

        const updatedRooms = rooms.map(r => {
            if (r.id === roomId) {
                return { ...r, guests: [...r.guests, { name: selectedPassenger.name, bookingId: selectedPassenger.id }] }; // Storing unique ID in bookingId field for Guests
            }
            return r;
        });

        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
        setSelectedPassenger(null); // Clear selection
    };

    const handleRemoveGuest = (roomId: string, guestId: string) => {
        const updatedRooms = rooms.map(r => {
            if (r.id === roomId) {
                return { ...r, guests: r.guests.filter(g => g.bookingId !== guestId) };
            }
            return r;
        });
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
    };

    const handleDeleteRoom = (roomId: string) => {
        if(confirm('Excluir este quarto e desalocar os hóspedes?')) {
            const updatedRooms = rooms.filter(r => r.id !== roomId);
            setRooms(updatedRooms);
            onSave({ ...trip.operationalData, rooming: updatedRooms });
        }
    };

    const handleAddManual = (p: ManualPassenger) => {
        const newManuals = [...manualPassengers, p];
        setManualPassengers(newManuals);
        onSave({ ...trip.operationalData, manualPassengers: newManuals });
    };

    const handleRename = (id: string, newName: string) => {
        const updatedOverrides = { ...nameOverrides, [id]: newName };
        setNameOverrides(updatedOverrides);
        setEditingNameId(null);
        // Save overrides to operationalData
        onSave({ 
            ...trip.operationalData, 
            passengerNameOverrides: updatedOverrides 
        } as any);
    };

    // Stats
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupied = rooms.reduce((sum, r) => sum + r.guests.length, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            
            {/* Header: Inventory Config & Stats */}
            <div className="bg-slate-50 border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                
                {/* Config Toolbar */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase ml-2 flex items-center gap-1"><Building size={14}/> Config Hotel:</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            min="1" 
                            max="50" 
                            value={invQty} 
                            onChange={e => setInvQty(parseInt(e.target.value) || 1)} 
                            className="w-14 border border-gray-300 rounded-lg p-1.5 text-sm text-center font-bold outline-none focus:border-primary-500"
                        />
                        <select 
                            value={invType} 
                            onChange={e => setInvType(e.target.value as any)} 
                            className="border border-gray-300 rounded-lg p-1.5 text-sm outline-none focus:border-primary-500"
                        >
                            <option value="DOUBLE">Duplo (2)</option>
                            <option value="TRIPLE">Triplo (3)</option>
                            <option value="QUAD">Quádruplo (4)</option>
                            <option value="COLLECTIVE">Coletivo (6)</option>
                        </select>
                        <button 
                            onClick={handleBatchCreate} 
                            className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-1"
                        >
                            <Plus size={14}/> Adicionar
                        </button>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex items-center gap-4 text-xs">
                     <div className="flex gap-4 text-gray-600 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                        <span>Vagas: <span className="font-bold text-gray-900">{totalCapacity}</span></span>
                        <span>Ocupado: <span className="font-bold text-blue-600">{totalOccupied}</span></span>
                        <span>Livre: <span className="font-bold text-green-600">{totalCapacity - totalOccupied}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
                        </div>
                        <span className="font-bold text-gray-700">{occupancyRate}%</span>
                    </div>
                </div>
            </div>

            {/* Body: Split View */}
            <div className="flex flex-1 overflow-hidden">
                
                {/* LEFT: Passenger List */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full z-10 shadow-[2px_0_10px_rgba(0,0,0,0.05)]">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Sem Quarto ({unassignedPassengers.length})</h4>
                        <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"><Plus size={18}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {showManualForm && <ManualPassengerForm onAdd={handleAddManual} onClose={() => setShowManualForm(false)} />}
                        
                        {unassignedPassengers.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : { id: p.id, name: p.name, bookingId: p.bookingId })}
                                onDoubleClick={() => { setEditingNameId(p.id); setTempName(p.name); }}
                                className={`
                                    p-3 rounded-xl border text-sm cursor-pointer transition-all flex items-center justify-between group relative select-none
                                    ${selectedPassenger?.id === p.id 
                                        ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-[1.02] ring-2 ring-primary-200 ring-offset-1' 
                                        : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-sm text-gray-700'
                                    }
                                `}
                            >
                                {editingNameId === p.id ? (
                                    <input 
                                        autoFocus
                                        value={tempName}
                                        onChange={e => setTempName(e.target.value)}
                                        onBlur={() => handleRename(p.id, tempName)}
                                        onKeyDown={e => e.key === 'Enter' && handleRename(p.id, tempName)}
                                        className="w-full text-black text-xs p-1 rounded border border-blue-300 outline-none"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 overflow-hidden w-full">
                                        <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${selectedPassenger?.id === p.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-medium truncate block">{p.name}</span>
                                            {p.isManual && <span className="text-[10px] opacity-70 block">Manual</span>}
                                        </div>
                                    </div>
                                )}
                                {selectedPassenger?.id === p.id && <CheckCircle size={16} className="text-white flex-shrink-0"/>}
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-gray-50 text-[10px] text-gray-400 text-center border-t border-gray-100">
                        Dica: Duplo clique para editar nomes. Clique para selecionar.
                    </div>
                </div>

                {/* RIGHT: Room Grid */}
                <div className="flex-1 bg-slate-100 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                        {rooms.map(room => {
                            const isFull = room.guests.length >= room.capacity;
                            const isTarget = selectedPassenger && !isFull;
                            
                            return (
                                <div 
                                    key={room.id} 
                                    onClick={() => handleAssign(room.id)}
                                    className={`
                                        bg-white rounded-2xl border transition-all relative overflow-hidden group shadow-sm
                                        ${isTarget ? 'cursor-pointer ring-2 ring-primary-400 border-primary-400 shadow-lg hover:scale-[1.01]' : 'border-gray-200'}
                                    `}
                                >
                                    {/* Header */}
                                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isFull ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <BedDouble size={18}/>
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-gray-800 text-sm">{room.name}</h5>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase">{room.type}</span>
                                                    <span className={`text-[10px] font-bold ${isFull ? 'text-green-600' : 'text-blue-600'}`}>
                                                        {room.guests.length}/{room.capacity}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }} 
                                            className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>

                                    {/* Guests Slot */}
                                    <div className="p-3 space-y-2 min-h-[100px]">
                                        {room.guests.map((guest) => (
                                            <div key={guest.bookingId} className="bg-blue-50/50 px-3 py-2 rounded-lg text-xs text-blue-900 font-medium flex justify-between items-center group/guest border border-blue-100/50 hover:bg-white hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-2">
                                                    <User size={12} className="text-blue-400"/>
                                                    <span className="truncate max-w-[120px]">{guest.name}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveGuest(room.id, guest.bookingId); }} 
                                                    className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100 transition-opacity"
                                                >
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Empty Slots */}
                                        {Array.from({ length: Math.max(0, room.capacity - room.guests.length) }).map((_, i) => (
                                            <div key={i} className={`border-2 border-dashed rounded-lg px-3 py-2 text-xs flex items-center justify-center gap-1 select-none transition-colors ${isTarget ? 'border-primary-200 bg-primary-50 text-primary-600 font-bold' : 'border-gray-100 text-gray-300'}`}>
                                                {isTarget ? <><CheckCircle size={12}/> Alocar Aqui</> : 'Vaga Livre'}
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

// --- OPERATIONS MODULE ---
const OperationsModule: React.FC = () => {
    const { user } = useAuth();
    const { trips, bookings, clients, updateTripOperationalData } = useData();
    const { showToast } = useToast();
    
    // Filter trips for current agency
    const agencyTrips = useMemo(() => trips.filter(t => t.agencyId === (user as Agency).agencyId), [trips, user]);
    
    const [selectedTripId, setSelectedTripId] = useState<string>(agencyTrips.length > 0 ? agencyTrips[0].id : '');
    const [opTab, setOpTab] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');

    const selectedTrip = agencyTrips.find(t => t.id === selectedTripId);
    
    const tripBookings = useMemo(() => 
        selectedTrip ? bookings.filter(b => b.tripId === selectedTrip.id && b.status === 'CONFIRMED') : [], 
        [selectedTrip, bookings]
    );

    // Persist operational data
    const handleSaveOps = async (data: OperationalData) => {
        if (!selectedTrip) return;
        try {
            await updateTripOperationalData(selectedTrip.id, data);
            // Toast is handled in context, but maybe we want specific feedback here
        } catch (error) {
            console.error(error);
        }
    };

    if (agencyTrips.length === 0) {
        return <div className="text-center py-20 text-gray-500">Você ainda não tem viagens cadastradas para gerenciar operações.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0 z-20">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative">
                        <select 
                            value={selectedTripId} 
                            onChange={e => setSelectedTripId(e.target.value)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-4 pr-10 py-2.5 font-bold"
                        >
                            {agencyTrips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    </div>
                    {selectedTrip && (
                        <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 border-l border-gray-200 pl-4 h-8">
                            <span className="flex items-center"><Calendar size={14} className="mr-1"/> {new Date(selectedTrip.startDate).toLocaleDateString()}</span>
                            <span className="flex items-center"><Users size={14} className="mr-1"/> {tripBookings.reduce((acc, b) => acc + b.passengers, 0)} Passageiros</span>
                        </div>
                    )}
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setOpTab('TRANSPORT')} 
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${opTab === 'TRANSPORT' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Bus size={16}/> Transporte
                    </button>
                    <button 
                        onClick={() => setOpTab('ROOMING')} 
                        className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${opTab === 'ROOMING' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BedDouble size={16}/> Rooming List
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-50">
                {selectedTrip ? (
                    opTab === 'TRANSPORT' ? (
                        <TransportManager 
                            key={`transport-${selectedTrip.id}`} // Force remount on trip change
                            trip={selectedTrip} 
                            bookings={tripBookings} 
                            clients={clients} 
                            onSave={handleSaveOps} 
                        />
                    ) : (
                        <RoomingManager 
                            key={`rooming-${selectedTrip.id}`} // Force remount on trip change
                            trip={selectedTrip} 
                            bookings={tripBookings} 
                            clients={clients} 
                            onSave={handleSaveOps}
                        />
                    )
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">Selecione uma viagem</div>
                )}
            </div>
        </div>
    );
};

// --- AGENCY DASHBOARD MAIN ---
export const AgencyDashboard: React.FC = () => {
    const { user } = useAuth();
    const { trips, bookings, getAgencyStats, refreshData } = useData();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TRIPS' | 'BOOKINGS' | 'OPERATIONS' | 'SETTINGS'>('OVERVIEW');
    const [showWizard, setShowWizard] = useState(false);
    const [editingTrip, setEditingTrip] = useState<Trip | undefined>(undefined);

    // Sync tab with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);

    const handleTabChange = (tab: string) => {
        setSearchParams({ tab });
        setActiveTab(tab as any);
    };

    // Load Stats
    useEffect(() => {
        const loadStats = async () => {
            if (user && user.role === 'AGENCY') {
                const s = await getAgencyStats((user as Agency).agencyId);
                setStats(s);
            }
        };
        loadStats();
    }, [user, getAgencyStats, trips, bookings]);

    if (!user || user.role !== 'AGENCY') return <div className="p-8 text-center">Acesso restrito.</div>;

    const agency = user as Agency;
    const myTrips = trips.filter(t => t.agencyId === agency.agencyId);
    // Sort bookings by date descending
    const myBookings = bookings.filter(b => b._trip?.agencyId === agency.agencyId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Painel da Agência</h1>
                        <p className="text-gray-500 mt-1">Gerencie suas viagens e acompanhe resultados.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to={`/${agency.slug}`} className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center hover:bg-gray-50 transition-colors shadow-sm">
                            <ExternalLink size={18} className="mr-2"/> Ver Minha Página
                        </Link>
                        <button onClick={() => setShowWizard(true)} className="bg-primary-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30">
                            <Plus size={18} className="mr-2"/> Criar Pacote
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Nav */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                            <div className="p-6 border-b border-gray-100 text-center">
                                <img src={agency.logo} className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-gray-50 object-cover" alt={agency.name}/>
                                <h3 className="font-bold text-gray-900 truncate">{agency.name}</h3>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <Badge color={agency.subscriptionStatus === 'ACTIVE' ? 'green' : 'red'}>{agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge>
                                    <Badge color="purple">{agency.subscriptionPlan}</Badge>
                                </div>
                            </div>
                            <nav className="flex flex-col">
                                <NavButton active={activeTab === 'OVERVIEW'} onClick={() => handleTabChange('OVERVIEW')} icon={BarChart2} label="Visão Geral" />
                                <NavButton active={activeTab === 'TRIPS'} onClick={() => handleTabChange('TRIPS')} icon={Plane} label="Meus Pacotes" />
                                <NavButton active={activeTab === 'BOOKINGS'} onClick={() => handleTabChange('BOOKINGS')} icon={ShoppingBag} label="Reservas" />
                                <NavButton active={activeTab === 'OPERATIONS'} onClick={() => handleTabChange('OPERATIONS')} icon={ListChecks} label="Operacional" />
                                <NavButton active={activeTab === 'SETTINGS'} onClick={() => handleTabChange('SETTINGS')} icon={Settings} label="Configurações" />
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="lg:col-span-3">
                        
                        {activeTab === 'OVERVIEW' && stats && (
                            <div className="space-y-8 animate-[fadeIn_0.3s]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <StatCard title="Vendas Totais" value={stats.totalSales} subtitle="Passageiros confirmados" icon={Users} color="blue" />
                                    <StatCard title="Receita Estimada" value={`R$ ${stats.totalRevenue.toLocaleString()}`} subtitle="Valor total vendido" icon={DollarSign} color="green" />
                                    <StatCard title="Visualizações" value={stats.totalViews} subtitle="Acessos aos seus pacotes" icon={Eye} color="purple" />
                                    <StatCard title="Conversão" value={`${stats.conversionRate.toFixed(1)}%`} subtitle="Vendas / Visualizações" icon={Rocket} color="amber" />
                                    <StatCard title="Avaliação Média" value={stats.averageRating ? stats.averageRating.toFixed(1) : '-'} subtitle={`${stats.totalReviews} avaliações`} icon={Star} color="amber" />
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">Próximas Viagens</h3>
                                    {myTrips.filter(t => new Date(t.startDate) > new Date()).slice(0, 3).length > 0 ? (
                                        <div className="space-y-4">
                                            {myTrips.filter(t => new Date(t.startDate) > new Date()).slice(0, 3).map(trip => (
                                                <div key={trip.id} className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-primary-100 hover:shadow-sm transition-all bg-gray-50/50">
                                                    <img src={trip.images[0]} className="w-16 h-16 rounded-lg object-cover" alt="" />
                                                    <div className="ml-4 flex-1">
                                                        <h4 className="font-bold text-gray-900">{trip.title}</h4>
                                                        <p className="text-sm text-gray-500">{new Date(trip.startDate).toLocaleDateString()} • {trip.sales || 0} Passageiros</p>
                                                    </div>
                                                    <Link to={`/agency/dashboard?tab=OPERATIONS`} className="text-sm font-bold text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors">
                                                        Gerenciar
                                                    </Link>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">Nenhuma viagem futura agendada.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'TRIPS' && (
                            <div className="space-y-6 animate-[fadeIn_0.3s]">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2>
                                </div>
                                {myTrips.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {myTrips.map(trip => (
                                            <div key={trip.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                                <div className="relative h-40">
                                                    <img src={trip.images[0]} className="w-full h-full object-cover" alt={trip.title} />
                                                    <div className="absolute top-3 right-3 flex gap-2">
                                                        <button onClick={() => { setEditingTrip(trip); setShowWizard(true); }} className="bg-white/90 p-2 rounded-full hover:text-primary-600 shadow-sm transition-colors"><Edit size={16}/></button>
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${trip.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>{trip.is_active ? 'ATIVO' : 'RASCUNHO'}</span>
                                                    </div>
                                                </div>
                                                <div className="p-5">
                                                    <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">{trip.title}</h3>
                                                    <p className="text-sm text-gray-500 flex items-center mb-4"><MapPin size={14} className="mr-1"/> {trip.destination}</p>
                                                    <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-4">
                                                        <span className="font-bold text-gray-900">R$ {trip.price.toLocaleString()}</span>
                                                        <div className="flex gap-3 text-gray-500">
                                                            <span className="flex items-center" title="Visualizações"><Eye size={14} className="mr-1"/> {trip.views || 0}</span>
                                                            <span className="flex items-center" title="Vendas"><ShoppingBag size={14} className="mr-1"/> {trip.sales || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                        <Plane size={32} className="text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-4">Você ainda não criou nenhum pacote.</p>
                                        <button onClick={() => setShowWizard(true)} className="text-primary-600 font-bold hover:underline">Criar primeiro pacote</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'BOOKINGS' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-900">Reservas Recentes</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4">Reserva</th>
                                                <th className="px-6 py-4">Cliente</th>
                                                <th className="px-6 py-4">Pacote</th>
                                                <th className="px-6 py-4">Data Compra</th>
                                                <th className="px-6 py-4">Valor</th>
                                                <th className="px-6 py-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {myBookings.map(booking => (
                                                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-gray-600">{booking.voucherCode}</td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">{(booking as any)._client?.name || 'Cliente'}</td>
                                                    <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate">{booking._trip?.title}</td>
                                                    <td className="px-6 py-4 text-gray-500">{new Date(booking.date).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td>
                                                    <td className="px-6 py-4"><Badge color="green">{booking.status}</Badge></td>
                                                </tr>
                                            ))}
                                            {myBookings.length === 0 && (
                                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhuma reserva encontrada.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'OPERATIONS' && (
                            <div className="animate-[fadeIn_0.3s]">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Gestão Operacional</h2>
                                <OperationsModule />
                            </div>
                        )}

                        {activeTab === 'SETTINGS' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                                <div className="text-center py-12">
                                    <Settings size={48} className="text-gray-200 mx-auto mb-4"/>
                                    <h2 className="text-xl font-bold text-gray-900">Configurações da Agência</h2>
                                    <p className="text-gray-500 mt-2">Em breve você poderá personalizar sua página e dados aqui.</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Create Trip Wizard Modal */}
            {showWizard && (
                <CreateTripWizard 
                    onClose={() => { setShowWizard(false); setEditingTrip(undefined); }} 
                    onSuccess={() => { refreshData(); setShowWizard(false); setEditingTrip(undefined); }}
                    initialTripData={editingTrip}
                />
            )}
        </div>
    );
};
