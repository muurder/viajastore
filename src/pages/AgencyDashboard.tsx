
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency, Plan, ItineraryDay, TripCategory, TravelerType, ThemeColors, Address, UserRole, BoardingPoint, Booking, OperationalData, PassengerSeat, RoomConfig, TransportConfig } from '../types';
import { PLANS } from '../services/mockData';
import { slugify } from '../utils/slugify';
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; 
import { Plus, Edit, Trash2, Save, ArrowLeft, X, Loader, Copy, Eye, Heading1, Heading2, Link as LinkIcon, ListOrdered, ExternalLink, Smartphone, Layout, Image as ImageIcon, Star, BarChart2, DollarSign, Users, Search, Tag, Calendar, Check, Plane, CreditCard, AlignLeft, AlignCenter, AlignRight, Quote, Smile, MapPin, Clock, ShoppingBag, Filter, ChevronUp, ChevronDown, MoreHorizontal, PauseCircle, PlayCircle, Globe, Bell, MessageSquare, Rocket, Palette, RefreshCw, LogOut, LucideProps, MonitorPlay, Info, AlertCircle, ShieldCheck, Upload, ArrowRight, CheckCircle, Bold, Italic, Underline, List, Settings, BedDouble, Bus, FileText, Download, UserCheck, GripVertical } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- HELPER COMPONENTS ---

const NavButton: React.FC<{ tabId: string; label: string; icon: React.ComponentType<LucideProps>; activeTab: string; onClick: (id: string) => void; hasNotification?: boolean }> = ({ tabId, label, icon: Icon, activeTab, onClick, hasNotification }) => (
    <button 
        onClick={() => onClick(tabId)}
        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap relative
            ${activeTab === tabId ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
        `}
    >
        <Icon size={18} /> {label}
        {hasNotification && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full"></span>}
    </button>
);

interface ActionsMenuProps { trip: Trip; onEdit: () => void; onManage: () => void; onDuplicate: () => void; onDelete: () => void; onToggleStatus: () => void; fullAgencyLink: string }
const ActionsMenu: React.FC<ActionsMenuProps> = ({ trip, onEdit, onManage, onDuplicate, onDelete, onToggleStatus, fullAgencyLink }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><MoreHorizontal size={20} /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-[scaleIn_0.1s] origin-top-right">
                    <div className="py-1">
                        <button onClick={onEdit} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"><Edit size={16}/> Editar Pacote</button>
                        <button onClick={onManage} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"><Users size={16}/> Gerenciar Passageiros</button>
                        <button onClick={onToggleStatus} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3">{trip.is_active ? <PauseCircle size={16}/> : <PlayCircle size={16}/>} {trip.is_active ? 'Pausar Vendas' : 'Ativar Vendas'}</button>
                        <button onClick={() => window.open(`${fullAgencyLink}/viagem/${trip.slug || trip.id}`, '_blank')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"><ExternalLink size={16}/> Ver Página</button>
                        <button onClick={onDuplicate} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"><Copy size={16}/> Duplicar</button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={onDelete} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"><Trash2 size={16}/> Excluir</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- OPERATIONAL COMPONENTS ---

const TransportManager: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onSave: (data: OperationalData) => void }> = ({ trip, bookings, clients, onSave }) => {
    // Determine initial seats from type
    const getInitialSeats = (type: string) => {
        if (type === 'BUS_46') return 46;
        if (type === 'BUS_50') return 50;
        if (type === 'MICRO_26') return 26;
        if (type === 'VAN_15') return 15;
        return 46;
    };

    const initialType = trip.operationalData?.transport?.type || 'BUS_46';
    const initialSeatsCount = getInitialSeats(initialType);

    const [config, setConfig] = useState<{ type: string; totalSeats: number; seats: PassengerSeat[] }>({ 
        type: initialType, 
        totalSeats: initialSeatsCount, 
        seats: trip.operationalData?.transport?.seats || [] 
    });
    
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);

    const allPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const client = clients.find(c => c.id === b.clientId);
        return Array.from({ length: b.passengers }).map((_, i) => ({
            id: `${b.id}-${i}`,
            bookingId: b.id,
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i} (${client?.name || ''})`,
            email: client?.email
        }));
    });

    const isSeatOccupied = (seatNum: string) => config.seats.find(s => s.seatNumber === seatNum);

    const handleSeatClick = (seatNum: string) => {
        const existingSeat = isSeatOccupied(seatNum);

        if (existingSeat) {
            if (window.confirm(`Remover ${existingSeat.passengerName} da poltrona ${seatNum}?`)) {
                const newSeats = config.seats.filter(s => s.seatNumber !== seatNum);
                const newConfig = { ...config, seats: newSeats };
                setConfig(newConfig);
                onSave({ ...trip.operationalData, transport: newConfig as TransportConfig });
            }
        } else if (selectedPassenger) {
            const newSeat: PassengerSeat = {
                seatNumber: seatNum,
                passengerName: selectedPassenger.name,
                bookingId: selectedPassenger.bookingId,
                status: 'occupied'
            };
            const newConfig = { ...config, seats: [...config.seats, newSeat] };
            setConfig(newConfig);
            onSave({ ...trip.operationalData, transport: newConfig as TransportConfig });
            setSelectedPassenger(null);
        }
    };

    const renderBusLayout = () => {
        const total = config.totalSeats;
        const rows = Math.ceil(total / 4);
        const grid = [];

        for (let r = 1; r <= rows; r++) {
            const seatsInRow = [];
            const s1 = ((r - 1) * 4) + 1;
            const s2 = ((r - 1) * 4) + 2;
            const s3 = ((r - 1) * 4) + 3;
            const s4 = ((r - 1) * 4) + 4;

            [s1, s2, s3, s4].forEach(num => {
                if (num <= total) {
                    const seatStr = num.toString();
                    const occupant = isSeatOccupied(seatStr);
                    seatsInRow.push(
                        <button 
                            key={num} 
                            onClick={() => handleSeatClick(seatStr)}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all border
                                ${occupant 
                                    ? 'bg-primary-600 text-white border-primary-700 shadow-md' 
                                    : selectedPassenger 
                                        ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 animate-pulse cursor-pointer' 
                                        : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
                                }
                            `}
                            title={occupant ? occupant.passengerName : `Poltrona ${num}`}
                        >
                            {occupant ? occupant.seatNumber : num}
                        </button>
                    );
                }
            });

            grid.push(
                <div key={r} className="flex justify-between items-center gap-8 mb-3">
                    <div className="flex gap-2">{seatsInRow[0]}{seatsInRow[1]}</div>
                    <div className="text-xs text-gray-300 font-mono">{r}</div>
                    <div className="flex gap-2">{seatsInRow[2]}{seatsInRow[3]}</div>
                </div>
            );
        }
        return grid;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <div className="w-full lg:w-1/3 bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto max-h-[600px]">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>Passageiros</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{allPassengers.length}</span>
                </h4>
                <div className="space-y-2">
                    {allPassengers.map(p => {
                        const isSeated = config.seats.some(s => s.bookingId === p.bookingId && s.passengerName === p.name);
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => !isSeated && setSelectedPassenger(p)}
                                className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between
                                    ${isSeated ? 'bg-gray-50 border-gray-100 opacity-60' : 
                                      selectedPassenger?.id === p.id ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' : 'bg-white border-gray-200 hover:border-primary-300'}
                                `}
                            >
                                <span className="font-medium text-gray-700 truncate">{p.name}</span>
                                {isSeated ? <CheckCircle size={14} className="text-green-500"/> : <div className="w-3 h-3 rounded-full border border-gray-300"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-8 flex flex-col items-center overflow-y-auto max-h-[600px]">
                <div className="bg-white p-8 rounded-[40px] border-2 border-gray-300 shadow-xl relative min-h-[600px]">
                    <div className="absolute top-6 left-6 border-b-2 border-gray-200 w-full mb-10">
                        <div className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center mb-4 text-gray-400">
                            <Users size={20}/>
                        </div>
                    </div>
                    <div className="mt-20">
                        {renderBusLayout()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoomingManager: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onSave: (data: OperationalData) => void }> = ({ trip, bookings, clients, onSave }) => {
    const [rooms, setRooms] = useState<RoomConfig[]>(trip.operationalData?.rooming || []);
    const [selectedPassenger, setSelectedPassenger] = useState<{id: string, name: string, bookingId: string} | null>(null);

    const allPassengers = bookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
        const client = clients.find(c => c.id === b.clientId);
        return Array.from({ length: b.passengers }).map((_, i) => ({
            id: `${b.id}-${i}`,
            bookingId: b.id,
            name: i === 0 ? (client?.name || 'Passageiro') : `Acompanhante ${i} (${client?.name || ''})`,
        }));
    });

    const getAssignedPassengers = () => {
        const assignedIds = new Set();
        rooms.forEach(r => r.guests.forEach(g => assignedIds.add(g.name + g.bookingId)));
        return assignedIds;
    };

    const assignedSet = getAssignedPassengers();
    const unassignedPassengers = allPassengers.filter(p => !assignedSet.has(p.name + p.bookingId));

    const addRoom = (type: 'DOUBLE' | 'TRIPLE' | 'QUAD') => {
        const capacity = type === 'DOUBLE' ? 2 : type === 'TRIPLE' ? 3 : 4;
        const newRoom: RoomConfig = {
            id: crypto.randomUUID(),
            name: `Quarto ${rooms.length + 1}`,
            type,
            capacity,
            guests: []
        };
        const updatedRooms = [...rooms, newRoom];
        setRooms(updatedRooms);
        onSave({ ...trip.operationalData, rooming: updatedRooms });
    };

    const assignPassengerToRoom = (roomId: string) => {
        if (!selectedPassenger) return;
        const updatedRooms = rooms.map(r => {
            if (r.id === roomId) {
                if (r.guests.length >= r.capacity) {
                    alert('Quarto cheio!');
                    return r;
                }
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

    const deleteRoom = (roomId: string) => {
        if(window.confirm('Excluir este quarto? Os hóspedes voltarão para a lista.')) {
            const updatedRooms = rooms.filter(r => r.id !== roomId);
            setRooms(updatedRooms);
            onSave({ ...trip.operationalData, rooming: updatedRooms });
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <button onClick={() => addRoom('DOUBLE')} className="bg-white border border-dashed border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16}/> Quarto Duplo</button>
                <button onClick={() => addRoom('TRIPLE')} className="bg-white border border-dashed border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16}/> Quarto Triplo</button>
                <button onClick={() => addRoom('QUAD')} className="bg-white border border-dashed border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center gap-2 text-sm"><Plus size={16}/> Quarto Quádruplo</button>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
                <div className="w-full lg:w-1/4 bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto max-h-[600px]">
                    <h4 className="font-bold text-gray-900 mb-4">Passageiros ({unassignedPassengers.length})</h4>
                    <div className="space-y-2">
                        {unassignedPassengers.map(p => (
                            <div key={p.id} onClick={() => setSelectedPassenger(selectedPassenger?.id === p.id ? null : p)} className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex items-center justify-between ${selectedPassenger?.id === p.id ? 'bg-primary-600 text-white border-primary-600 shadow-md transform scale-[1.02]' : 'bg-white border-gray-200 hover:border-primary-300 text-gray-700'}`}>
                                <span className="font-medium truncate">{p.name}</span>
                                {selectedPassenger?.id === p.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map(room => (
                            <div key={room.id} onClick={() => selectedPassenger && assignPassengerToRoom(room.id)} className={`bg-white rounded-xl border p-4 transition-all relative ${selectedPassenger && room.guests.length < room.capacity ? 'border-primary-400 ring-2 ring-primary-100 cursor-pointer hover:shadow-md' : 'border-gray-200'}`}>
                                <button onClick={(e) => { e.stopPropagation(); deleteRoom(room.id); }} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><X size={16}/></button>
                                <div className="flex items-center gap-2 mb-3">
                                    <BedDouble size={20} className="text-gray-400"/>
                                    <div><h5 className="font-bold text-gray-800 text-sm">{room.name}</h5><p className="text-[10px] text-gray-500 uppercase">{room.type} ({room.guests.length}/{room.capacity})</p></div>
                                </div>
                                <div className="space-y-2 min-h-[60px]">
                                    {room.guests.map((guest, idx) => (
                                        <div key={idx} className="bg-gray-50 px-2 py-1.5 rounded text-xs text-gray-700 flex justify-between items-center group">
                                            <span className="truncate max-w-[80%]">{guest.name}</span>
                                            <button onClick={(e) => { e.stopPropagation(); removeGuest(room.id, idx); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                        </div>
                                    ))}
                                    {Array.from({ length: Math.max(0, room.capacity - room.guests.length) }).map((_, i) => (<div key={i} className="border border-dashed border-gray-200 rounded px-2 py-1.5 text-xs text-gray-300 flex justify-center">Vazio</div>))}
                                </div>
                            </div>
                        ))}
                        {rooms.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 italic">Crie quartos para começar a organizar a hospedagem.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TripManagementModal: React.FC<{ trip: Trip; bookings: Booking[]; clients: any[]; onClose: () => void }> = ({ trip, bookings, clients, onClose }) => {
    const { updateTripOperationalData } = useData();
    const [activeView, setActiveView] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');

    const handleSave = async (data: OperationalData) => {
        await updateTripOperationalData(trip.id, data);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex border-b border-gray-200 mb-6 bg-white sticky top-0 z-10 px-6">
                <button onClick={() => setActiveView('TRANSPORT')} className={`px-6 py-4 font-bold text-sm border-b-2 flex items-center gap-2 ${activeView === 'TRANSPORT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Bus size={18}/> Mapa de Assentos</button>
                <button onClick={() => setActiveView('ROOMING')} className={`px-6 py-4 font-bold text-sm border-b-2 flex items-center gap-2 ${activeView === 'ROOMING' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><BedDouble size={18}/> Rooming List</button>
            </div>
            <div className="flex-1 p-6 overflow-hidden">
                {activeView === 'TRANSPORT' ? <TransportManager trip={trip} bookings={bookings} clients={clients} onSave={handleSave} /> : <RoomingManager trip={trip} bookings={bookings} clients={clients} onSave={handleSave} />}
            </div>
        </div>
    );
};

// --- MAIN AGENCY DASHBOARD ---

const AgencyDashboard: React.FC = () => {
  const { user, updateUser, logout, loading: authLoading, uploadImage } = useAuth();
  const { agencies, bookings, trips: allTrips, createTrip, updateTrip, deleteTrip, toggleTripStatus, updateAgencySubscription, updateAgencyReview, agencyReviews, getAgencyStats, getAgencyTheme, saveAgencyTheme, refreshData, updateAgencyProfileByAdmin, clients, updateTripOperationalData } = useData();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as any) || 'OVERVIEW';
  const { themes, activeTheme, setTheme, setAgencyTheme: setGlobalAgencyTheme } = useTheme();

  const currentAgency = agencies.find(a => a.id === user?.id);
  const navigate = useNavigate();
  
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0); 
  const [manageTripId, setManageTripId] = useState<string | null>(null); 
  const [selectedOperationalTripId, setSelectedOperationalTripId] = useState<string | null>(null);

  const [tripForm, setTripForm] = useState<Partial<Trip>>({});
  const [profileForm, setProfileForm] = useState<Partial<Agency>>({ name: '', description: '', whatsapp: '', phone: '', website: '', address: { zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: '' }, bankInfo: { bank: '', agency: '', account: '', pixKey: '' }, logo: '' });
  const [themeForm, setThemeForm] = useState<ThemeColors>({ primary: '#3b82f6', secondary: '#f97316', background: '#f9fafb', text: '#111827' });
  const [heroForm, setHeroForm] = useState({ heroMode: 'TRIPS', heroBannerUrl: '', heroTitle: '', heroSubtitle: '' });
  const [loading, setLoading] = useState(false);

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

  const handleTabChange = (tabId: string) => { setSearchParams({ tab: tabId }); setIsEditingTrip(false); setEditingTripId(null); setActiveStep(0); setSelectedOperationalTripId(null); };
  
  const handleLogout = () => {
      logout();
      navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      if (currentAgency) {
          await updateUser({ ...profileForm, heroMode: heroForm.heroMode as any, heroBannerUrl: heroForm.heroBannerUrl, heroTitle: heroForm.heroTitle, heroSubtitle: heroForm.heroSubtitle });
          showToast('Perfil atualizado!', 'success');
      }
      setLoading(false);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      if (currentAgency) {
          await saveAgencyTheme(currentAgency.agencyId, themeForm);
          showToast('Tema salvo com sucesso!', 'success');
      }
      setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const url = await uploadImage(e.target.files[0], 'agency-logos');
          if (url) setProfileForm({ ...profileForm, logo: url });
      }
  };

  const handleTripSubmit = async () => {
      setLoading(true);
      try {
          if (editingTripId) {
              await updateTrip({ ...tripForm, id: editingTripId } as Trip);
              showToast('Viagem atualizada!', 'success');
          } else {
              await createTrip({ ...tripForm, agencyId: currentAgency!.agencyId } as Trip);
              showToast('Viagem criada!', 'success');
          }
          setIsEditingTrip(false);
          setEditingTripId(null);
      } catch (err) {
          showToast('Erro ao salvar viagem.', 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleEditTrip = (trip: Trip) => {
      setTripForm(trip);
      setEditingTripId(trip.id);
      setIsEditingTrip(true);
  };

  const handleDuplicateTrip = async (trip: Trip) => {
      if (window.confirm('Duplicar este pacote?')) {
          await createTrip({ ...trip, id: crypto.randomUUID(), title: `${trip.title} (Cópia)`, slug: slugify(`${trip.title}-copia-${Date.now()}`), is_active: false });
          showToast('Pacote duplicado!', 'success');
      }
  };

  const handleDeleteTrip = async (id: string) => {
      if (window.confirm('Excluir este pacote?')) {
          await deleteTrip(id);
          showToast('Pacote excluído!', 'success');
      }
  };

  const renderTripBuilder = () => (
      <div className="space-y-6">
          {activeStep === 0 && (
              <div className="space-y-4">
                  <div><label className="block font-bold text-gray-700 mb-1">Título</label><input value={tripForm.title} onChange={e => setTripForm({...tripForm, title: e.target.value})} className="w-full border p-2 rounded-lg" /></div>
                  <div><label className="block font-bold text-gray-700 mb-1">Descrição</label><textarea value={tripForm.description} onChange={e => setTripForm({...tripForm, description: e.target.value})} rows={4} className="w-full border p-2 rounded-lg" /></div>
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-bold text-gray-700 mb-1">Destino</label><input value={tripForm.destination} onChange={e => setTripForm({...tripForm, destination: e.target.value})} className="w-full border p-2 rounded-lg" /></div>
                      <div><label className="block font-bold text-gray-700 mb-1">Categoria</label><select value={tripForm.category} onChange={e => setTripForm({...tripForm, category: e.target.value as TripCategory})} className="w-full border p-2 rounded-lg"><option value="PRAIA">Praia</option><option value="AVENTURA">Aventura</option><option value="ROMANTICO">Romântico</option><option value="FAMILIA">Família</option></select></div>
                  </div>
              </div>
          )}
          {/* ... Add other steps similarly ... */}
          {activeStep > 0 && <div className="text-center text-gray-500 py-10">Outros passos do builder simplificados para este exemplo.</div>}
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <div className="flex items-center gap-4">
            <div className="relative"><img src={currentAgency?.logo || `https://ui-avatars.com/api/?name=${currentAgency?.name}`} alt={currentAgency?.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" /><span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span></div>
            <div><h1 className="text-2xl font-bold text-gray-900">{currentAgency?.name}</h1><div className="flex items-center gap-3 text-sm text-gray-500"><span className="flex items-center"><Globe size={14} className="mr-1"/> {currentAgency?.slug}.viajastore.com</span><a href={`/#/${currentAgency?.slug}`} target="_blank" className="text-primary-600 hover:underline flex items-center font-bold"><ExternalLink size={12} className="mr-1"/> Ver Site</a></div></div>
        </div>
        <div className="flex gap-3"><Link to={`/${currentAgency?.slug}/client/BOOKINGS`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"><Users size={18}/> Área do Cliente</Link><button onClick={handleLogout} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"><LogOut size={18}/> Sair</button></div>
      </div>

      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-t-xl px-2 scrollbar-hide shadow-sm">
         <NavButton tabId="OVERVIEW" label="Visão Geral" icon={BarChart2} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="TRIPS" label="Meus Pacotes" icon={Plane} activeTab={activeTab} onClick={handleTabChange} />
         <NavButton tabId="OPERATIONS" label="Operações" icon={Bus} activeTab={activeTab} onClick={handleTabChange} />
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
            </div>
        )}

        {activeTab === 'TRIPS' && (
            <div className="space-y-6">
                {!isEditingTrip ? (
                    <>
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Meus Pacotes ({myTrips.length})</h2><button onClick={() => { setTripForm({ title: '', description: '', destination: '', price: 0, durationDays: 1, startDate: '', endDate: '', images: [], category: 'PRAIA', tags: [], travelerTypes: [], itinerary: [], paymentMethods: [], included: [], notIncluded: [], featured: false, is_active: true, boardingPoints: [{ id: crypto.randomUUID(), time: '', location: '' }] }); setIsEditingTrip(true); }} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2 shadow-sm"><Plus size={18}/> Novo Pacote</button></div>
                        {myTrips.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{myTrips.map(trip => (<div key={trip.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all"><div className="relative h-48 bg-gray-100"><img src={trip.images[0] || 'https://placehold.co/600x400?text=Sem+Imagem'} alt={trip.title} className="w-full h-full object-cover"/><div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold ${trip.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{trip.is_active ? 'Ativo' : 'Pausado'}</div></div><div className="p-5"><h3 className="font-bold text-gray-900 text-lg mb-1 truncate" title={trip.title}>{trip.title}</h3><p className="text-gray-500 text-sm mb-4 flex items-center"><MapPin size={14} className="mr-1"/> {trip.destination}</p><div className="flex justify-between items-center pt-4 border-t border-gray-100"><span className="font-bold text-primary-600">R$ {trip.price.toLocaleString()}</span><ActionsMenu trip={trip} onEdit={() => handleEditTrip(trip)} onManage={() => { setSelectedOperationalTripId(trip.id); handleTabChange('OPERATIONS'); }} onDuplicate={() => handleDuplicateTrip(trip)} onDelete={() => handleDeleteTrip(trip.id)} onToggleStatus={() => toggleTripStatus(trip.id)} fullAgencyLink={`${window.location.origin}/#/${currentAgency?.slug}`}/></div></div></div>))}</div>
                        ) : ( <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><Plane size={32}/></div><h3 className="font-bold text-gray-900 text-lg">Nenhum pacote criado</h3><p className="text-gray-500 mb-6">Comece a vender criando seu primeiro roteiro.</p><button onClick={() => setIsEditingTrip(true)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700">Criar Pacote</button></div> )}
                    </>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)]">
                        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                            <button onClick={() => setIsEditingTrip(false)} className="flex items-center text-gray-500 hover:text-gray-700 mb-8 font-medium transition-colors"><ArrowLeft size={18} className="mr-2"/> Voltar</button>
                            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingTripId ? 'Editar Pacote' : 'Novo Pacote'}</h2>
                            <div className="space-y-2 flex-1">
                                {['Informações Básicas', 'Detalhes & Datas', 'Locais de Embarque', 'Roteiro Dia a Dia', 'Galeria de Fotos'].map((step, idx) => (
                                    <button key={idx} onClick={() => setActiveStep(idx)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center transition-all ${activeStep === idx ? 'bg-white text-primary-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
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
                        <div className="flex-1 p-8 overflow-y-auto">
                            {renderTripBuilder()}
                            <div className="flex justify-between mt-8 pt-8 border-t border-gray-100">
                                <button onClick={() => setActiveStep(prev => Math.max(0, prev - 1))} disabled={activeStep === 0} className="px-6 py-2 rounded-lg text-gray-500 font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">Anterior</button>
                                {activeStep < 4 ? (<button onClick={() => setActiveStep(prev => Math.min(4, prev + 1))} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-black flex items-center gap-2">Próximo <ArrowRight size={16}/></button>) : (<span className="text-xs text-gray-400 font-medium flex items-center"><CheckCircle size={14} className="mr-1 text-green-500"/> Tudo pronto para publicar!</span>)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {activeTab === 'OPERATIONS' && (
            <div className="animate-[fadeIn_0.3s]">
                {!selectedOperationalTripId ? (
                    <div className="space-y-6">
                        <h2 className="text-lg font-bold text-gray-900">Selecione uma viagem para gerenciar</h2>
                        {myTrips.filter(t => t.is_active).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myTrips.filter(t => t.is_active).map(trip => {
                                    const tripBookings = myBookings.filter(b => b.tripId === trip.id && b.status === 'CONFIRMED');
                                    const paxCount = tripBookings.reduce((sum, b) => sum + b.passengers, 0);
                                    return (
                                        <div key={trip.id} onClick={() => setSelectedOperationalTripId(trip.id)} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group p-5">
                                            <div className="flex items-center gap-4 mb-4">
                                                <img src={trip.images[0]} className="w-16 h-16 rounded-lg object-cover" alt=""/>
                                                <div><h3 className="font-bold text-gray-900 line-clamp-1">{trip.title}</h3><p className="text-sm text-gray-500 flex items-center mt-1"><Calendar size={12} className="mr-1"/> {new Date(trip.startDate).toLocaleDateString()}</p></div>
                                            </div>
                                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                                <div className="text-sm font-bold text-gray-600 flex items-center gap-2"><Users size={16} className="text-primary-600"/> {paxCount} Passageiros</div>
                                                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold group-hover:bg-primary-600 group-hover:text-white transition-colors">Gerenciar</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-500">Nenhuma viagem ativa para gerenciar.</p></div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <button onClick={() => setSelectedOperationalTripId(null)} className="flex items-center text-gray-500 hover:text-gray-700 font-medium mb-4"><ArrowLeft size={18} className="mr-2"/> Voltar para lista</button>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-250px)] flex flex-col">
                            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <div><h2 className="text-xl font-bold text-gray-900">{myTrips.find(t => t.id === selectedOperationalTripId)?.title}</h2><p className="text-sm text-gray-500">Gestão Operacional</p></div>
                            </div>
                            <TripManagementModal trip={myTrips.find(t => t.id === selectedOperationalTripId)!} bookings={myBookings.filter(b => b.tripId === selectedOperationalTripId)} clients={clients} onClose={() => setSelectedOperationalTripId(null)} />
                        </div>
                    </div>
                )}
            </div>
        )}

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
        
        {activeTab === 'REVIEWS' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h2 className="text-lg font-bold text-gray-900">Avaliações Recebidas</h2><div className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-3 py-1 rounded-full"><Star size={16} fill="currentColor"/> {stats.averageRating.toFixed(1)}</div></div>
                <div className="grid gap-4">{myReviews.length > 0 ? myReviews.map(review => ( <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-start mb-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{review.clientName ? review.clientName.charAt(0) : 'C'}</div><div><p className="font-bold text-gray-900">{review.clientName || 'Cliente'}</p><div className="flex text-amber-400 text-xs">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-200'}/>)}</div></div></div><span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span></div><p className="text-gray-600 text-sm italic bg-gray-50 p-3 rounded-xl mb-4">"{review.comment}"</p>{review.response ? (<div className="ml-8 border-l-2 border-primary-200 pl-4"><p className="text-xs font-bold text-primary-600 mb-1">Sua resposta:</p><p className="text-sm text-gray-700">{review.response}</p></div>) : (<div className="flex gap-2"><button onClick={() => { const response = prompt('Digite sua resposta:'); if (response) updateAgencyReview(review.id, { response }); }} className="text-xs font-bold text-primary-600 hover:underline flex items-center"><MessageSquare size={14} className="mr-1"/> Responder</button></div>)}</div> )) : ( <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200"><p className="text-gray-500">Nenhuma avaliação ainda.</p></div> )}</div>
            </div>
        )}

        {activeTab === 'SETTINGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Dados da Agência</h2>
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative group">
                                <img src={profileForm.logo || `https://ui-avatars.com/api/?name=${profileForm.name}`} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-gray-100" />
                                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md"><Upload size={14} /><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label>
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
    </div>
  );
};

export default AgencyDashboard;
