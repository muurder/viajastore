import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency, Plan, OperationalData, PassengerSeat, RoomConfig, TransportConfig, ManualPassenger, Booking, ThemeColors, VehicleType, VehicleLayoutConfig } from '../types';
import { PLANS } from '../services/mockData';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { Plus, Edit, Trash2, Save, ArrowLeft, X, Loader, Copy, Eye, ExternalLink, Star, BarChart2, DollarSign, Users, Calendar, Plane, CreditCard, MapPin, ShoppingBag, MoreHorizontal, PauseCircle, PlayCircle, Globe, Settings, BedDouble, Bus, CheckCircle, UserPlus, Armchair, User, Rocket, LogOut, AlertTriangle, PenTool, Check, LayoutGrid, List, ChevronRight, Truck, Grip, UserCheck, Image as ImageIcon, FileText, Download, Settings2, Car, Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- HELPER CONSTANTS & COMPONENTS ---

const VEHICLE_TYPES: Record<VehicleType, VehicleLayoutConfig> = {
    'CAR_4': { type: 'CAR_4', label: 'Carro de Passeio (4L)', totalSeats: 4, cols: 2, aisleAfterCol: 1 },
    'VAN_15': { type: 'VAN_15', label: 'Van Executiva (15L)', totalSeats: 15, cols: 3, aisleAfterCol: 1 }, // 1 esq, corredor, 2 dir
    'VAN_20': { type: 'VAN_20', label: 'Van Alongada (20L)', totalSeats: 20, cols: 3, aisleAfterCol: 1 },
    'MICRO_26': { type: 'MICRO_26', label: 'Micro-ônibus (26L)', totalSeats: 26, cols: 4, aisleAfterCol: 2 }, // Alguns micros são 2+2, outros 1+2
    'BUS_46': { type: 'BUS_46', label: 'Ônibus Executivo (46L)', totalSeats: 46, cols: 4, aisleAfterCol: 2 },
    'BUS_50': { type: 'BUS_50', label: 'Ônibus Leito Turismo (50L)', totalSeats: 50, cols: 4, aisleAfterCol: 2 },
    'DD_60': { type: 'DD_60', label: 'Double Decker (60L)', totalSeats: 60, cols: 4, aisleAfterCol: 2, lowerDeckSeats: 12 }, // 12 embaixo, 48 cima
    'CUSTOM': { type: 'CUSTOM', label: 'Personalizado', totalSeats: 0, cols: 2, aisleAfterCol: 1 }
};

const DEFAULT_OPERATIONAL_DATA: OperationalData = {
    transport: undefined, // Force user setup
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

const NavButton: React.FC<{ tabId: string; label: string; icon: React.ComponentType<any>; activeTab: string; onClick: (tabId: string) => void; hasNotification?: boolean; }> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
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

const TransportManager: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onSave: (data: OperationalData) => void }> = ({ trip, bookings, clients, onSave }) => {
    const vehicleConfig = trip.operationalData?.transport?.vehicleConfig;
    
    const [config, setConfig] = useState<{ vehicleConfig: VehicleLayoutConfig | null; seats: PassengerSeat[] }>({ 
        vehicleConfig: vehicleConfig || null,
        seats: trip.operationalData?.transport?.seats || [] 
    });
    
    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
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
        const newTransportState = {
            vehicleConfig: newConfig,
            seats: []
        };
        setConfig(newTransportState);
        onSave({ 
            ...trip.operationalData, 
            transport: newTransportState as TransportConfig 
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
        
        const newTransportState = {
            vehicleConfig: newConfig,
            seats: []
        };
        setConfig(newTransportState);
        onSave({ 
            ...trip.operationalData, 
            transport: newTransportState as TransportConfig 
        });
        setShowCustomVehicleForm(false);
    };

    const bookingPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const client = clients.find(c => c.id === b.clientId);
        return Array.from({ length: b.passengers }).map((_, i) => ({
            id: `${b.id}-${i}`,
            bookingId: b.id,
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i} (${client?.name || ''})`,
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
            setConfig(newConfig as any);
            onSave({ ...trip.operationalData, transport: newConfig as TransportConfig });
            setSelectedPassenger(null);
        }
    };

    const confirmRemoveSeat = () => {
        if (!seatToDelete) return;
        const newSeats = config.seats.filter(s => s.seatNumber !== seatToDelete.seatNum);
        const newConfig = { ...config, seats: newSeats };
        setConfig(newConfig as any);
        onSave({ ...trip.operationalData, transport: newConfig as TransportConfig });
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
        const grid = [];

        for (let r = 1; r <= rows; r++) {
            const rowSeats = [];
            
            for (let c = 1; c <= cols; c++) {
                const seatNum = ((r - 1) * cols) + c;
                
                if (c === aisleAfterCol + 1) {
                    rowSeats.push(<div key={`aisle-${r}`} className="w-8 flex justify-center items-center text-xs text-slate-300 font-mono select-none">{r}</div>);
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
                            <Armchair size={16} className={`mb-0.5 ${occupant ? 'fill-current' : ''}`}/>
                            <span className="text-[10px]">{seatNum}</span>
                            {occupant && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {occupant.passengerName}
                                </div>
                            )}
                        </button>
                    );
                } else {
                    rowSeats.push(<div key={`empty-${c}`} className="w-10 h-10 md:w-12 md:h-12"></div>);
                }
            }

            grid.push(
                <div key={r} className="flex justify-center items-center gap-2 mb-3">
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
                                        onChange={e => setCustomVehicleData({...customVehicleData, cols: parseInt(e.target.value)})}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500" 
                                    >
                                        <option value={2}>2 Colunas (Carros / Vans Pequenas)</option>
                                        <option value={3}>3 Colunas (Vans Médias / Executivas)</option>
                                        <option value={4}>4 Colunas (Ônibus / Micro)</option>
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
                    <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors" title="Adicionar Manual"><UserPlus size={18}/></button>
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
                    <Truck size={14} /> {config.vehicleConfig.label}
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
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full border-4 border-slate-300 flex items-center justify-center text-slate-300 bg-slate-50 shadow-inner"><User size={20} /></div>
                                </div>
                                <div className="flex flex-col items-center justify-center opacity-50"><span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Frente</span></div>
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

const RoomingManager: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onSave: (data: OperationalData) => void }> = ({ trip, bookings, clients, onSave }) => {
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
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i} (${client?.name || ''})`,
        }));
    });

    const allPassengers = [
        ...bookingPassengers,
        ...manualPassengers.map(p => ({ id: p.id, bookingId: p.id, name: p.name }))
    ];

    const getAssignedPassengers = () => {
        const assignedIds = new Set();
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
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 2, 'DOUBLE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Duplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 3, 'TRIPLE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Triplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 4, 'QUAD')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Quádruplo</button>
                <button onClick={() => addRoom(`Quarto ${rooms.length + 1}`, 5, 'COLLECTIVE')} className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-2 text-xs font-bold whitespace-nowrap"><Plus size={14}/> Quíntuplo</button>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-0 h-full overflow-hidden border-t border-gray-100">
                <div className="w-full lg:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm z-10">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16}/> Hóspedes ({unassignedPassengers.length})</h4>
                        <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"><UserPlus size={18}/></button>
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
                                                    <button onClick={() => { const name = (document.getElementById(`name-${room.id}`) as HTMLInputElement).value; const cap = parseInt((document.getElementById(`cap-${room.id}`) as HTMLInputElement).value); updateRoomDetails(room.id, name, cap); }} className="text-xs bg-primary-600 text-white rounded px-2 py-1 mt-1">Salvar</button>
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

const OperationsModule: React.FC<{ 
    myTrips: Trip[]; 
    myBookings: Booking[]; 
    clients: any[]; 
    selectedTripId: string | null; 
    onSelectTrip: (id: string | null) => void;
    onSaveTripData: (tripId: string, data: OperationalData) => Promise<void>;
}> = ({ myTrips, myBookings, clients, selectedTripId, onSelectTrip, onSaveTripData }) => {
    const activeTrips = myTrips.filter(t => t.is_active);
    const selectedTrip = myTrips.find(t => t.id === selectedTripId);
    
    const [viewMode, setViewMode] = useState<'MAP' | 'ROOMING'>('MAP');
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Optimistic Save with timeout safety
    const handleSave = async (data: OperationalData) => {
        if (!selectedTripId) return;
        setIsSaving(true);
        
        // Safety timeout to prevent infinite spinner
        const timer = setTimeout(() => setIsSaving(false), 5000);

        try {
            await onSaveTripData(selectedTripId, data);
        } catch (error) {
            showToast('Erro ao salvar.', 'error');
        } finally {
            clearTimeout(timer);
            setIsSaving(false);
        }
    };

    const handleExportPDF = () => {
        if (!selectedTrip) return;
        
        try {
            const doc = new jsPDF();
            const dateStr = safeDate(selectedTrip.startDate);
            const opData = selectedTrip.operationalData || { transport: { vehicleConfig: null, seats: [] }, rooming: [], manualPassengers: [] };
            
            doc.setFontSize(22);
            doc.text('Manifesto de Viagem', 14, 20);
            doc.setFontSize(12);
            doc.text(`${selectedTrip.title}`, 14, 30);
            doc.setFontSize(10);
            doc.text(`Data: ${dateStr}`, 14, 36);
            
            const paxData: any[] = [];
            const tripBookings = myBookings.filter(b => b.tripId === selectedTrip.id && b.status === 'CONFIRMED');
            tripBookings.forEach(b => {
                const client = clients.find(c => c.id === b.clientId);
                paxData.push([client?.name || 'Cliente', client?.cpf || '---', client?.phone || '---']);
                for(let i=1; i<b.passengers; i++) paxData.push([`Convidado de ${client?.name || '...'}`, '---', '---']);
            });
            opData.manualPassengers?.forEach(p => paxData.push([p.name, p.document || '---', '---']));

            (doc as any).autoTable({ startY: 45, head: [['Nome Completo', 'Documento', 'Telefone']], body: paxData, theme: 'striped' });

            let finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('Rooming List (Hospedagem)', 14, finalY);
            
            const roomData = opData.rooming?.map(r => [r.name, r.type, `${r.guests.length}/${r.capacity}`, r.guests.map(g => g.name).join(', ')]) || [];
            (doc as any).autoTable({ startY: finalY + 5, head: [['Quarto', 'Tipo', 'Ocupação', 'Hóspedes']], body: roomData, theme: 'grid' });

            finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text('Mapa de Assentos', 14, finalY);

            const seatData = opData.transport?.seats?.sort((a,b) => parseInt(a.seatNumber) - parseInt(b.seatNumber)).map(s => [s.seatNumber, s.passengerName]) || [];
            (doc as any).autoTable({ startY: finalY + 5, head: [['Poltrona', 'Passageiro']], body: seatData, theme: 'plain' });

            doc.save(`manifesto_${selectedTrip.slug}.pdf`);
            showToast('PDF gerado com sucesso!', 'success');

        } catch (e: any) {
            console.error(e);
            showToast('Erro ao gerar PDF: ' + e.message, 'error');
        }
    };

    return (
        <div className="flex h-[calc(100vh-220px)] min-h-[600px] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="w-1/3 min-w-[300px] border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-2"><Bus size={16} /> Viagens Ativas</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {activeTrips.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            Nenhuma viagem ativa encontrada.
                        </div>
                    )}
                    {activeTrips.map(trip => {
                        const tripBookings = myBookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED');
                        const paxCount = tripBookings.reduce((sum, b) => sum + b.passengers, 0);
                        const totalSeats = trip.operationalData?.transport?.vehicleConfig?.totalSeats || 0; // Fixed: default to 0 to avoid NaN
                        const occupancy = totalSeats > 0 ? Math.round((paxCount / totalSeats) * 100) : 0;
                        const isSelected = selectedTripId === trip.id;

                        return (
                            <div 
                                key={trip.id} 
                                onClick={() => onSelectTrip(trip.id)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 shadow-sm' : 'bg-white border-gray-100 hover:border-primary-200 hover:shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>{trip.title}</h4>
                                    <span className="text-[10px] font-mono text-gray-400">{safeDate(trip.startDate)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <Users size={14} />
                                        <span>{paxCount}/{totalSeats || '-'}</span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-full font-bold ${occupancy > 80 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {occupancy}%
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${occupancy > 80 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${occupancy}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50 relative">
                {selectedTrip ? (
                    <>
                        <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-20">
                            <div className="flex items-center gap-6">
                                <button onClick={() => setViewMode('MAP')} className={`flex items-center gap-2 pb-2 border-b-2 text-sm font-bold transition-all ${viewMode === 'MAP' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Grip size={18}/> Mapa de Assentos</button>
                                <button onClick={() => setViewMode('ROOMING')} className={`flex items-center gap-2 pb-2 border-b-2 text-sm font-bold transition-all ${viewMode === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><BedDouble size={18}/> Rooming List</button>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={handleExportPDF} className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all active:scale-95"><FileText size={14}/> Exportar Manifesto</button>
                                <div className="h-6 w-px bg-gray-200 mx-1"></div>
                                {isSaving ? <span className="text-xs font-bold text-primary-600 flex items-center bg-primary-50 px-3 py-1.5 rounded-full"><Loader size={12} className="animate-spin mr-1.5"/> Salvando...</span> : <span className="text-xs font-bold text-green-600 flex items-center bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle size={12} className="mr-1.5"/> Salvo</span>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {viewMode === 'MAP' ? (
                                <TransportManager 
                                    key={selectedTrip.id} 
                                    trip={selectedTrip} 
                                    bookings={myBookings.filter(b => b.tripId === selectedTrip.id)} 
                                    clients={clients} 
                                    onSave={handleSave} 
                                />
                            ) : (
                                <RoomingManager 
                                    key={selectedTrip.id} 
                                    trip={selectedTrip} 
                                    bookings={myBookings.filter(b => b.tripId === selectedTrip.id)} 
                                    clients={clients} 
                                    onSave={handleSave} 
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100"><Truck size={32} className="text-gray-300" /></div>
                        <p className="font-medium text-lg text-gray-500">Selecione uma viagem ao lado</p>
                        <p className="text-sm max-w-xs text-center mt-2">Gerencie assentos e quartos selecionando um pacote ativo na lista.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AgencyDashboard: React.FC = () => {
  const { user, logout, loading: authLoading, updateUser } = useAuth();
  const { agencies, bookings, trips: allTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencySubscription, agencyReviews, getAgencyStats, getAgencyTheme, saveAgencyTheme, updateTripOperationalData, clients } = useData();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';
  const { setAgencyTheme: setGlobalAgencyTheme } = useTheme();

  const currentAgency = agencies.find(a => a.id === user?.id);
  const navigate = useNavigate();
  
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [selectedOperationalTripId, setSelectedOperationalTripId] = useState<string | null>(null);
  const [tripViewMode, setTripViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  const [tripForm, setTripForm] = useState<Partial<Trip>>({ 
      title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [],
      operationalData: DEFAULT_OPERATIONAL_DATA
  });

  const [profileForm, setProfileForm] = useState<Partial<Agency>>({ name: '', description: '', whatsapp: '', phone: '', website: '', address: { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, bankInfo: { bank: '', agency: '', account: '', pixKey: '' }, logo: '' });
  const [themeForm, setThemeForm] = useState<ThemeColors>({ primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' });
  const [heroForm, setHeroForm] = useState({ heroMode: 'TRIPS', heroBannerUrl: '', heroTitle: '', heroSubtitle: '' });

  const [loading, setLoading] = useState(false);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [showConfirmSubscription, setShowConfirmSubscription] = useState<Plan | null>(null);

  const stats = currentAgency ? getAgencyStats(currentAgency.agencyId) : { totalRevenue: 0, totalViews: 0, totalSales: 0, conversionRate: 0, averageRating: 0, totalReviews: 0 };
  const myTrips = allTrips.filter(t => t.agencyId === currentAgency?.agencyId);
  const myBookings = bookings.filter(b => b._trip?.agencyId === currentAgency?.agencyId);

  useEffect(() => { if (currentAgency) { setProfileForm({ name: currentAgency.name, description: currentAgency.description, whatsapp: currentAgency.whatsapp || '', phone: currentAgency.phone || '', website: currentAgency.website || '', address: currentAgency.address || { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, bankInfo: currentAgency.bankInfo || { bank: '', agency: '', account: '', pixKey: '' }, logo: currentAgency.logo }); setHeroForm({ heroMode: currentAgency.heroMode || 'TRIPS', heroBannerUrl: currentAgency.heroBannerUrl || '', heroTitle: currentAgency.heroTitle || '', heroSubtitle: currentAgency.heroSubtitle || '' }); } }, [currentAgency]);
  useEffect(() => { const fetchTheme = async () => { if (currentAgency) { const savedTheme = await getAgencyTheme(currentAgency.agencyId); if (savedTheme) { setThemeForm(savedTheme.colors); } } }; fetchTheme(); }, [currentAgency, getAgencyTheme]);

  const handleTabChange = (tabId: string) => { setSearchParams({ tab: tabId }); setIsEditingTrip(false); setEditingTripId(null); setSelectedOperationalTripId(null); };
  
  const handleEditTrip = (trip: Trip) => { 
      const bp = (trip.boardingPoints && trip.boardingPoints.length > 0) ? trip.boardingPoints : [{ id: crypto.randomUUID(), time: '', location: '' }];
      const opData = trip.operationalData || DEFAULT_OPERATIONAL_DATA;
      setTripForm({ ...trip, boardingPoints: bp, operationalData: opData }); 
      setEditingTripId(trip.id); 
      setIsEditingTrip(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  const handleDeleteTrip = async (id: string) => { if (window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) { await deleteTrip(id); showToast('Pacote excluído.', 'success'); } };
  const handleDuplicateTrip = async (trip: Trip) => { const newTrip = { ...trip, title: `${trip.title} (Cópia)`, is_active: false }; const { id, ...tripData } = newTrip; await createTrip({ ...tripData, agencyId: currentAgency.agencyId } as Trip); showToast('Pacote duplicado com sucesso!', 'success'); };
  const handleSaveProfile = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await updateUser(profileForm); await updateUser({ heroMode: heroForm.heroMode as 'TRIPS' | 'STATIC', heroBannerUrl: heroForm.heroBannerUrl, heroTitle: heroForm.heroTitle, heroSubtitle: heroForm.heroSubtitle }); showToast('Perfil atualizado!', 'success'); } catch (err) { showToast('Erro ao atualizar perfil.', 'error'); } finally { setLoading(false); } };
  const handleSaveTheme = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { await saveAgencyTheme(currentAgency.agencyId, themeForm); setGlobalAgencyTheme(themeForm); showToast('Tema da agência atualizado!', 'success'); } catch (err) { showToast('Erro ao salvar tema.', 'error'); } finally { setLoading(false); } };
  const handleLogout = async () => { await logout(); navigate('/'); };
  
  const handleSelectPlan = (plan: Plan) => setShowConfirmSubscription(plan);
  const confirmSubscription = async () => { if (!showConfirmSubscription) return; setActivatingPlanId(showConfirmSubscription.id); try { await updateAgencySubscription(currentAgency.agencyId, 'ACTIVE', showConfirmSubscription.id as 'BASIC' | 'PREMIUM', new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()); showToast(`Plano ${showConfirmSubscription.name} ativado com sucesso!`, 'success'); window.location.reload(); } catch (error) { showToast('Erro ao ativar plano.', 'error'); } finally { setActivatingPlanId(null); setShowConfirmSubscription(null); } };

  const handleSaveTrip = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          if (!tripForm.startDate) throw new Error('Data de início é obrigatória.');
          if (!tripForm.title) throw new Error('Título é obrigatório.');

          const finalTripData = {
              ...tripForm,
              operationalData: tripForm.operationalData || DEFAULT_OPERATIONAL_DATA
          };

          if (editingTripId) {
              await updateTrip({ ...finalTripData, id: editingTripId } as Trip);
              showToast('Pacote atualizado!', 'success');
          } else {
              await createTrip({ ...finalTripData, agencyId: currentAgency.agencyId } as Trip);
              showToast('Novo pacote criado!', 'success');
          }
          setIsEditingTrip(false);
          setEditingTripId(null);
          setTripForm({ title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [], operationalData: DEFAULT_OPERATIONAL_DATA });
      } catch (error: any) {
          showToast(error.message, 'error');
      } finally {
          setLoading(false);
      }
  };

  if (authLoading || !currentAgency) return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex items-center gap-4">
            <div className="relative"><img src={currentAgency?.logo || `https://ui-avatars.com/api/?name=${currentAgency?.name}`} alt={currentAgency?.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" /><span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span></div>
            <div><h1 className="text-2xl font-bold text-gray-900">{currentAgency?.name}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><span className="flex items-center"><Globe size={14} className="mr-1"/> {currentAgency?.slug}.viajastore.com</span><a href={`/#/${currentAgency?.slug}`} target="_blank" className="text-primary-600 hover:underline flex items-center font-bold"><ExternalLink size={12} className="mr-1"/> Ver Site</a></div></div>
        </div>
        <div className="flex gap-3"><Link to={`/${currentAgency?.slug}/client/BOOKINGS`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"><Users size={18}/> Área do Cliente</Link><button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"><LogOut size={18}/> Sair</button></div>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm flex-shrink-0">
         <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="OPERATIONS" label="Operações" icon={Bus} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="BOOKINGS" label="Reservas" icon={ShoppingBag} activeTab={activeTab} onClick={handleTabChange} hasNotification={bookings.some(b => b.status === 'PENDING')} />
         <NavButton tabId="REVIEWS" label="Avaliações" icon={Star} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="PLAN" label="Meu Plano" icon={CreditCard} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="SETTINGS" label="Configurações" icon={Settings} activeTab={activeTab} onClick={handleTabChange} />
      </div>

      <div className="animate-[fadeIn_0.3s] flex-1 flex flex-col min-h-0">
        {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-green-50 text-green-600"><DollarSign size={24}/></div><span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span></div><p className="text-sm text-gray-500 font-medium">Receita Total</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">R$ {stats.totalRevenue.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Vendas Realizadas</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalSales}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Eye size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Visualizações</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.totalViews}</h3></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-4"><div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Star size={24}/></div></div><p className="text-sm text-gray-500 font-medium">Avaliação Média</p><h3 className="text-3xl font-extrabold text-gray-900 mt-1">{stats.averageRating.toFixed(1)} <span className="text-sm font-normal text-gray-400">({stats.totalReviews})</span></h3></div>
                </div>
            </div>
        )}
        
        {activeTab === 'TRIPS' && (
             <div className="space-y-6">
                {!isEditingTrip ? (
                    <>
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                Meus Pacotes <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{myTrips.length}</span>
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                    <button onClick={() => setTripViewMode('GRID')} className={`p-1.5 rounded-md transition-colors ${tripViewMode === 'GRID' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`} title="Grade"><LayoutGrid size={18}/></button>
                                    <button onClick={() => setTripViewMode('TABLE')} className={`p-1.5 rounded-md transition-colors ${tripViewMode === 'TABLE' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`} title="Lista"><List size={18}/></button>
                                </div>
                                <button onClick={() => { 
                                    setTripForm({ 
                                        title: '', description: '', destination: '', price: 0, durationDays: 1, 
                                        startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], 
                                        travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], 
                                        featured: false, is_active: true, boardingPoints: [{ id: crypto.randomUUID(), time: '', location: '' }],
                                        operationalData: DEFAULT_OPERATIONAL_DATA
                                    }); 
                                    setIsEditingTrip(true); 
                                }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 shadow-sm transition-all active:scale-95">
                                    <Plus size={18}/> Novo Pacote
                                </button>
                            </div>
                        </div>
                        
                        {myTrips.length > 0 ? (
                            tripViewMode === 'GRID' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.3s]">
                                    {myTrips.map(trip => {
                                        const tripBookings = myBookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED');
                                        const paxCount = tripBookings.reduce((sum, b) => sum + b.passengers, 0);
                                        const totalSeats = trip.operationalData?.transport?.vehicleConfig?.totalSeats || 0; 
                                        const occupancy = totalSeats > 0 ? Math.round((paxCount / totalSeats) * 100) : 0;

                                        return (
                                            <div key={trip.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all flex flex-col">
                                                <div className="relative h-48 bg-gray-100">
                                                    <img src={trip.images[0] || 'https://placehold.co/600x400?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover"/>
                                                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold shadow-sm ${trip.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {trip.is_active ? 'Ativo' : 'Rascunho'}
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                                        <div className="flex items-center text-white text-xs font-bold gap-4">
                                                            <span className="flex items-center gap-1"><Users size={12}/> {occupancy}% Ocupado</span>
                                                            <span className="flex items-center gap-1"><Eye size={12}/> {trip.views || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate" title={trip.title}>{trip.title}</h3>
                                                    <div className="flex items-center text-sm text-gray-500 mb-4 gap-3">
                                                        <span className="flex items-center"><MapPin size={14} className="mr-1"/> {trip.destination}</span>
                                                        <span className="flex items-center"><Calendar size={14} className="mr-1"/> {safeDate(trip.startDate)}</span>
                                                    </div>
                                                    
                                                    {/* NEW ACTION BAR FOR GRID */}
                                                    <div className="mt-auto pt-4 border-t border-gray-100">
                                                        <div className="flex justify-between items-end mb-3">
                                                            <span className="font-bold text-primary-600 text-lg">R$ {trip.price.toLocaleString()}</span>
                                                            <button 
                                                                onClick={() => { setSelectedOperationalTripId(trip.id); handleTabChange('OPERATIONS'); }}
                                                                className="text-xs font-bold text-white bg-primary-600 px-4 py-1.5 rounded-lg hover:bg-primary-700 flex items-center gap-1.5 transition-colors shadow-sm shadow-primary-500/30 active:scale-95"
                                                            >
                                                                <Bus size={14}/> Gerenciar
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1 text-gray-400">
                                                            <div className="flex gap-1">
                                                                <button title="Ver Online" onClick={() => window.open(`/#/${currentAgency?.slug}/viagem/${trip.slug || trip.id}`, '_blank')} className="p-2 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={18}/></button>
                                                                <button title="Editar" onClick={() => handleEditTrip(trip)} className="p-2 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><Edit size={18}/></button>
                                                                <button title="Duplicar" onClick={() => handleDuplicateTrip(trip)} className="p-2 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"><Copy size={18}/></button>
                                                                <button title={trip.is_active ? "Pausar" : "Ativar"} onClick={() => toggleTripStatus(trip.id)} className={`p-2 rounded-lg transition-colors ${trip.is_active ? 'hover:text-amber-600 hover:bg-amber-50' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                                                                    {trip.is_active ? <PauseCircle size={18}/> : <PlayCircle size={18}/>}
                                                                </button>
                                                            </div>
                                                            <div className="h-4 w-px bg-gray-200 mx-1"></div>
                                                            <button title="Excluir" onClick={() => handleDeleteTrip(trip.id)} className="p-2 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-[fadeIn_0.3s]">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-4">Pacote</th>
                                                <th className="px-6 py-4">Data</th>
                                                <th className="px-6 py-4">Ocupação</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Preço</th>
                                                <th className="px-6 py-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {myTrips.map(trip => {
                                                const tripBookings = myBookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED');
                                                const paxCount = tripBookings.reduce((sum, b) => sum + b.passengers, 0);
                                                const totalSeats = trip.operationalData?.transport?.vehicleConfig?.totalSeats || 0; 
                                                const occupancy = totalSeats > 0 ? Math.round((paxCount / totalSeats) * 100) : 0;

                                                return (
                                                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="px-6 py-4 font-bold text-gray-900">
                                                            <div className="flex items-center gap-3">
                                                                {trip.images[0] && <img src={trip.images[0]} className="w-10 h-10 rounded object-cover" />}
                                                                {trip.title}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">{safeDate(trip.startDate)}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${occupancy > 80 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${occupancy}%` }}></div>
                                                                </div>
                                                                <span className="text-xs font-bold text-gray-500">{paxCount}/{totalSeats || '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${trip.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{trip.is_active ? 'Ativo' : 'Rascunho'}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-bold text-gray-700">R$ {trip.price.toLocaleString()}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            {/* NEW ACTION BAR FOR TABLE */}
                                                            <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button title="Gerenciar" onClick={() => { setSelectedOperationalTripId(trip.id); handleTabChange('OPERATIONS'); }} className="p-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded mr-2"><Bus size={16}/></button>
                                                                <button title="Ver Online" onClick={() => window.open(`/#/${currentAgency?.slug}/viagem/${trip.slug || trip.id}`, '_blank')} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Eye size={16}/></button>
                                                                <button title="Editar" onClick={() => handleEditTrip(trip)} className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"><Edit size={16}/></button>
                                                                <button title="Duplicar" onClick={() => handleDuplicateTrip(trip)} className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded"><Copy size={16}/></button>
                                                                <button title={trip.is_active ? "Pausar" : "Ativar"} onClick={() => toggleTripStatus(trip.id)} className={`p-1.5 rounded ${trip.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                                                                    {trip.is_active ? <PauseCircle size={16}/> : <PlayCircle size={16}/>}
                                                                </button>
                                                                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                                                                <button title="Excluir" onClick={() => handleDeleteTrip(trip.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : ( 
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Plane size={32}/></div>
                                <h3 className="font-bold text-gray-900 text-lg">Nenhum pacote criado</h3>
                                <p className="text-gray-500 mb-6">Comece a vender criando seu primeiro roteiro.</p>
                                <button onClick={() => setIsEditingTrip(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700">Criar Pacote</button>
                            </div> 
                        )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.2s]">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-2xl font-bold text-gray-900">{editingTripId ? 'Editar Pacote' : 'Novo Pacote'}</h2>
                            <button onClick={() => { setIsEditingTrip(false); setEditingTripId(null); }} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveTrip} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote</label>
                                    <input value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" required placeholder="Ex: Final de Semana em Campos do Jordão" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Destino</label>
                                    <input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" required placeholder="Cidade, UF" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label>
                                    <input type="number" value={tripForm.price} onChange={e => setTripForm({...tripForm, price: parseFloat(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" required min="0" step="0.01" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início</label>
                                    <input type="date" value={tripForm.startDate ? tripForm.startDate.split('T')[0] : ''} onChange={e => setTripForm({...tripForm, startDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label>
                                    <input type="number" value={tripForm.durationDays} onChange={e => setTripForm({...tripForm, durationDays: parseInt(e.target.value)})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" required min="1" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Completa</label>
                                    <textarea value={tripForm.description} onChange={e => setTripForm({...tripForm, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" rows={5} placeholder="Detalhes do roteiro, o que levar, etc." />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Veículo Padrão</label>
                                    <select 
                                        value={tripForm.operationalData?.transport?.vehicleConfig?.type || 'BUS_46'} 
                                        onChange={e => {
                                            const type = e.target.value as VehicleType;
                                            const newConfig = VEHICLE_TYPES[type];
                                            setTripForm({
                                                ...tripForm,
                                                operationalData: {
                                                    ...tripForm.operationalData!,
                                                    transport: {
                                                        ...(tripForm.operationalData?.transport || DEFAULT_OPERATIONAL_DATA.transport!),
                                                        vehicleConfig: newConfig
                                                    }
                                                }
                                            });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                                    >
                                        {Object.values(VEHICLE_TYPES).map(v => (
                                            <option key={v.type} value={v.type}>{v.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Isso define o layout inicial do mapa de assentos.</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => { setIsEditingTrip(false); setEditingTripId(null); }} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Pacote
                                </button>
                            </div>
                        </form>
                    </div>
                )}
             </div>
        )}

        {activeTab === 'OPERATIONS' && (
             <div className="h-full">
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

        {activeTab === 'BOOKINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-[fadeIn_0.3s]">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                         <tr>
                             <th className="px-6 py-4">Reserva</th>
                             <th className="px-6 py-4">Pacote</th>
                             <th className="px-6 py-4">Cliente</th>
                             <th className="px-6 py-4">Data</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4 text-right">Valor</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {myBookings.map(booking => {
                             const client = clients.find(c => c.id === booking.clientId);
                             return (
                                 <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-6 py-4 font-mono text-gray-600">{booking.voucherCode}</td>
                                     <td className="px-6 py-4 font-bold text-gray-900">{booking._trip?.title}</td>
                                     <td className="px-6 py-4 flex items-center gap-2">
                                         <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{client?.name?.charAt(0)}</div>
                                         {client?.name}
                                     </td>
                                     <td className="px-6 py-4 text-gray-600">{new Date(booking.date).toLocaleDateString()}</td>
                                     <td className="px-6 py-4">
                                         <span className={`px-2 py-1 rounded text-xs font-bold ${booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{booking.status}</span>
                                     </td>
                                     <td className="px-6 py-4 text-right font-bold text-gray-900">R$ {booking.totalPrice.toLocaleString()}</td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
                 {myBookings.length === 0 && <div className="p-8 text-center text-gray-500">Nenhuma reserva encontrada.</div>}
             </div>
        )}

        {activeTab === 'REVIEWS' && (
             <div className="space-y-4 animate-[fadeIn_0.3s]">
                 {agencyReviews.length > 0 ? agencyReviews.map(review => (
                     <div key={review.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                         <div className="flex justify-between items-start mb-2">
                             <div>
                                 <h4 className="font-bold text-gray-900">{review.clientName}</h4>
                                 <div className="flex text-amber-400 text-sm">
                                     {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)}
                                 </div>
                             </div>
                             <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                         </div>
                         <p className="text-gray-600 text-sm italic mb-4">"{review.comment}"</p>
                         {review.tripTitle && <div className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-1 rounded w-fit mb-2">Pacote: {review.tripTitle}</div>}
                         
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                             <p className="text-xs font-bold text-gray-500 uppercase mb-1">Sua Resposta</p>
                             {review.response ? (
                                 <p className="text-sm text-gray-700">{review.response}</p>
                             ) : (
                                 <button className="text-xs text-primary-600 font-bold hover:underline">Responder</button>
                             )}
                         </div>
                     </div>
                 )) : <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-500">Nenhuma avaliação recebida.</div>}
             </div>
        )}

        {activeTab === 'PLAN' && (
             <div className="space-y-8 animate-[fadeIn_0.3s]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {PLANS.map(plan => {
                         const isCurrent = currentAgency?.subscriptionPlan === plan.id;
                         return (
                             <div key={plan.id} className={`p-6 rounded-2xl border-2 transition-all ${isCurrent ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-gray-100 bg-white shadow-sm hover:border-primary-200'}`}>
                                 <div className="flex justify-between items-center mb-4">
                                     <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                     {isCurrent && <span className="bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">Atual</span>}
                                 </div>
                                 <p className="text-3xl font-extrabold text-gray-900 mb-6">R$ {plan.price.toFixed(2)}<span className="text-sm font-medium text-gray-500">/mês</span></p>
                                 <ul className="space-y-3 mb-8">
                                     {plan.features.map((feature, i) => (
                                         <li key={i} className="flex items-center text-sm text-gray-600"><CheckCircle size={16} className="text-green-500 mr-2 flex-shrink-0"/> {feature}</li>
                                     ))}
                                 </ul>
                                 <button 
                                    onClick={() => !isCurrent && handleSelectPlan(plan)}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${isCurrent ? 'bg-gray-200 text-gray-500 cursor-default' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                                 >
                                     {isCurrent ? 'Plano Ativo' : 'Mudar para este plano'}
                                 </button>
                             </div>
                         );
                     })}
                 </div>
                 {showConfirmSubscription && (
                     <SubscriptionConfirmationModal 
                        plan={showConfirmSubscription} 
                        onClose={() => setShowConfirmSubscription(null)} 
                        onConfirm={confirmSubscription}
                        isSubmitting={!!activatingPlanId}
                     />
                 )}
             </div>
        )}

        {activeTab === 'SETTINGS' && (
             <div className="space-y-8 animate-[fadeIn_0.3s]">
                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                     <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center"><User size={20} className="mr-2"/> Dados da Agência</h3>
                     <form onSubmit={handleSaveProfile} className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia</label><input value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                             <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefone / WhatsApp</label><input value={profileForm.whatsapp} onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                             <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label><textarea value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                             <div><label className="block text-sm font-bold text-gray-700 mb-1">Site</label><input value={profileForm.website} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                             <div><label className="block text-sm font-bold text-gray-700 mb-1">Logo URL</label><input value={profileForm.logo} onChange={e => setProfileForm({...profileForm, logo: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                         </div>
                         
                         <div className="pt-6 border-t border-gray-100">
                             <h4 className="text-sm font-bold text-gray-900 mb-4">Configuração do Microsite</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Modo Hero</label><select value={heroForm.heroMode} onChange={e => setHeroForm({...heroForm, heroMode: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"><option value="TRIPS">Carrossel de Viagens</option><option value="STATIC">Banner Estático</option></select></div>
                                {heroForm.heroMode === 'STATIC' && (
                                    <>
                                        <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Banner URL</label><input value={heroForm.heroBannerUrl} onChange={e => setHeroForm({...heroForm, heroBannerUrl: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Título Hero</label><input value={heroForm.heroTitle} onChange={e => setHeroForm({...heroForm, heroTitle: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                                        <div><label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo Hero</label><input value={heroForm.heroSubtitle} onChange={e => setHeroForm({...heroForm, heroSubtitle: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"/></div>
                                    </>
                                )}
                             </div>
                         </div>

                         <button type="submit" disabled={loading} className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">{loading ? <Loader size={18} className="animate-spin"/> : <Save size={18}/>} Salvar Alterações</button>
                     </form>
                 </div>

                 <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                     <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center"><Palette size={20} className="mr-2"/> Personalização de Cores</h3>
                     <form onSubmit={handleSaveTheme} className="flex flex-wrap gap-6 items-end">
                         <div><label className="block text-sm font-bold text-gray-700 mb-1">Cor Primária</label><div className="flex items-center gap-2"><input type="color" value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="w-10 h-10 rounded border cursor-pointer"/><input value={themeForm.primary} onChange={e => setThemeForm({...themeForm, primary: e.target.value})} className="border p-2 rounded-lg w-28 uppercase font-mono"/></div></div>
                         <div><label className="block text-sm font-bold text-gray-700 mb-1">Cor Secundária</label><div className="flex items-center gap-2"><input type="color" value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="w-10 h-10 rounded border cursor-pointer"/><input value={themeForm.secondary} onChange={e => setThemeForm({...themeForm, secondary: e.target.value})} className="border p-2 rounded-lg w-28 uppercase font-mono"/></div></div>
                         <button type="submit" disabled={loading} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black disabled:opacity-50 h-[42px]">Salvar Tema</button>
                     </form>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default AgencyDashboard;