import React, { useState, useEffect, useMemo } from 'react';
import {
    Building, Edit, Trash2, Plus, Users, Search, CornerDownRight,
    Grip, CheckCircle, BedDouble, MousePointer2, X, User
} from 'lucide-react';
import { Trip, Booking, OperationalData, HotelInstance, RoomConfig, ManualPassenger } from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { logger } from '../../../utils/logger';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { ManualPassengerForm } from './components/ManualPassengerForm';

interface RoomingManagerProps {
    trip: Trip;
    bookings: Booking[];
    clients: any[];
    onSave: (data: OperationalData) => void;
}

export const RoomingManager: React.FC<RoomingManagerProps> = ({ trip, bookings, clients, onSave }) => {
    // State for Hotels
    const [hotels, setHotels] = useState<HotelInstance[]>([]);
    const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
    const [editHotelNameId, setEditHotelNameId] = useState<string | null>(null); // ID of hotel being renamed
    const [tempHotelName, setTempHotelName] = useState('');

    const [manualPassengers, setManualPassengers] = useState<ManualPassenger[]>(trip.operationalData?.manualPassengers || []);
    const [nameOverrides, setNameOverrides] = useState<Record<string, string>>((trip.operationalData as any)?.passengerNameOverrides || {});

    // UI
    const [selectedPassenger, setSelectedPassenger] = useState<{ id: string, name: string, bookingId: string } | null>(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
    const [filterText, setFilterText] = useState('');

    // Batch Config
    const [invQty, setInvQty] = useState(1);
    const [invType, setInvType] = useState<'DOUBLE' | 'TRIPLE' | 'QUAD' | 'COLLECTIVE'>('DOUBLE');
    const [invCustomCap, setInvCustomCap] = useState<number | ''>('');

    // Delete/Remove States
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [guestToRemove, setGuestToRemove] = useState<{ roomId: string, guestId: string, guestName: string } | null>(null);
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null);

    const { showToast } = useToast();

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
                const { supabase } = await import('../../../services/supabase');
                const validBookings = bookings.filter(b => b.tripId && String(b.tripId) === String(trip.id));
                if (supabase && validBookings.length > 0) {
                    const bookingIds = validBookings.filter(b => b.status === 'CONFIRMED').map(b => b.id);
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
                logger.error('Error fetching passengers:', err);
            }
        };
        fetchPassengers();
    }, [bookings, trip.id]);

    const allPassengers = useMemo(() => {
        const validBookings = bookings.filter(b => b.tripId && String(b.tripId) === String(trip.id));
        const booked = validBookings.filter(b => b.status === 'CONFIRMED').flatMap(b => {
            const clientName = (b as any)._client?.name || clients.find(c => c.id === b.clientId)?.name;
            return Array.from({ length: b.passengers }).map((_, i) => {
                const id = `${b.id}-${i}`;
                const dbPassenger = dbPassengers.get(`${b.id}-${i}`);
                const dbName = dbPassenger?.full_name;

                let finalName: string;
                if (i === 0) {
                    finalName = dbName || nameOverrides[id] || clientName || 'Passageiro';
                } else {
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
            isAccompaniment: false,
            passengerIndex: 0 // Default for manual
        }));
        return [...booked, ...manual];
    }, [bookings, trip.id, clients, manualPassengers, nameOverrides, dbPassengers]);

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

        const currentRooms = activeHotel?.rooms || [];
        const startIdx = currentRooms.length + 1;

        for (let i = 0; i < invQty; i++) {
            newRooms.push({ id: crypto.randomUUID(), name: `Quarto ${startIdx + i}`, type: invType, capacity: capacity, guests: [] });
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
        const cleanedHotels = hotels.map(h => ({
            ...h,
            rooms: h.rooms.map(r => ({
                ...r,
                guests: r.guests.filter(g => g.bookingId !== passenger.id)
            }))
        }));

        const targetHotelIndex = cleanedHotels.findIndex(h => h.id === activeHotelId);
        if (targetHotelIndex === -1) return;

        const targetHotel = cleanedHotels[targetHotelIndex];
        const targetRoomIndex = targetHotel.rooms.findIndex(r => r.id === roomId);

        if (targetRoomIndex !== -1) {
            const room = targetHotel.rooms[targetRoomIndex];
            if (room.guests.length < room.capacity) {
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
    };

    const confirmDeleteRoom = () => {
        if (!roomToDelete) return;

        const updatedHotels = hotels.map(h => ({
            ...h,
            rooms: h.rooms.filter(r => r.id !== roomToDelete)
        }));

        saveHotels(updatedHotels);
    };

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
        if (updated.length === 0) {
            updated.push({ id: `h-${Date.now()}`, name: 'Hotel Principal', rooms: [] });
        }
        saveHotels(updated);
        if (activeHotelId === hotelToDelete) setActiveHotelId(updated[0].id);
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

    const handleDragStart = (e: React.DragEvent, passenger: any) => {
        const dbPassenger = dbPassengers.get(`${passenger.bookingId}-${passenger.passengerIndex}`);
        const passengerWithData = {
            ...passenger,
            name: dbPassenger?.full_name || passenger.details?.name || passenger.name || 'Passageiro (Sem nome)',
            document: dbPassenger?.cpf || passenger.details?.document || '',
            phone: dbPassenger?.whatsapp || passenger.details?.phone || '',
            birthDate: dbPassenger?.birth_date || passenger.details?.birthDate || ''
        };
        e.dataTransfer.setData('application/json', JSON.stringify(passengerWithData));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, roomId: string) => {
        e.preventDefault();
        setDragOverRoom(null);
        try {
            const data = e.dataTransfer.getData('application/json');
            const passenger = JSON.parse(data);
            if (passenger?.id) handleAssign(roomId, passenger);
        } catch (err) { }
    };

    const totalCap = activeHotel?.rooms.reduce((sum, r) => sum + r.capacity, 0) || 0;
    const occupied = activeHotel?.rooms.reduce((sum, r) => sum + r.guests.length, 0) || 0;
    const assignedCount = assignedMap.size;
    const progress = Math.min(100, Math.round((assignedCount / (allPassengers.length || 1)) * 100));

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
            <ConfirmDialog isOpen={!!roomToDelete} onClose={() => setRoomToDelete(null)} onConfirm={confirmDeleteRoom} title="Excluir Quarto" message="Tem certeza que deseja excluir este quarto? Os passageiros voltarão para a lista." variant="danger" />
            <ConfirmDialog isOpen={!!guestToRemove} onClose={() => setGuestToRemove(null)} onConfirm={confirmRemoveGuest} title="Remover Passageiro" message={`Remover ${guestToRemove?.guestName} deste quarto?`} variant="warning" confirmText="Remover" />
            <ConfirmDialog isOpen={!!hotelToDelete} onClose={() => setHotelToDelete(null)} onConfirm={confirmDeleteHotel} title="Remover Hotel" message="Tem certeza que deseja remover este hotel? Todos os quartos e alocações serão perdidos." variant="danger" confirmText="Remover" />

            <div className="bg-slate-50 border-b p-4 flex flex-col gap-4 flex-shrink-0">
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
                                            <button onClick={(e) => { e.stopPropagation(); startRenameHotel(hotel.id, hotel.name); }} className="text-gray-400 hover:text-blue-500"><Edit size={10} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHotel(hotel.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={10} /></button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={handleAddHotel} className="p-2 rounded-lg bg-white border border-dashed border-gray-300 text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>

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
                            <button onClick={() => setInvQty(Math.max(1, invQty - 1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-l-md font-bold">-</button>
                            <span className="px-2 text-xs font-bold min-w-[20px] text-center">{invQty}</span>
                            <button onClick={() => setInvQty(invQty + 1)} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-r-md font-bold">+</button>
                        </div>

                        <button onClick={handleBatchCreate} className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center gap-1 shadow-sm ml-2">
                            <Plus size={14} /> Criar
                        </button>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-600 font-medium bg-white px-4 py-2 rounded-full border shadow-sm">
                        <span>Total: <b>{totalCap}</b></span><span>Ocupado: <b className="text-blue-600">{occupied}</b></span><span>Livre: <b className="text-green-600">{totalCap - occupied}</b></span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="w-full md:w-80 border-r bg-white flex flex-col h-1/3 md:h-full shadow-sm z-10 flex-shrink-0">
                    <div className="p-4 border-b bg-gray-50 space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Users size={16} /> Passageiros ({assignedCount}/{allPassengers.length})</h4>
                            <button onClick={() => setShowManualForm(!showManualForm)} className="text-primary-600 hover:bg-primary-50 p-1.5 rounded" title="Adicionar Manual"><Plus size={18} /></button>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
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
                            const assignedInfo = assignedMap.get(p.id);
                            const isSelected = selectedPassenger?.id === p.id;
                            let passengerName = p.name;
                            const displayName = passengerName || (p.isAccompaniment ? 'Acompanhante' : 'Passageiro');
                            const displayInitial = displayName.charAt(0).toUpperCase();

                            return (
                                <div
                                    key={p.id}
                                    draggable={!assignedInfo}
                                    onDragStart={(e) => handleDragStart(e, p)}
                                    onClick={() => {
                                        if (!assignedInfo) {
                                            setSelectedPassenger(selectedPassenger?.id === p.id ? null : { id: p.id, name: displayName, bookingId: p.bookingId });
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
                                        {!assignedInfo && <Grip size={12} className={selectedPassenger?.id === p.id ? 'text-white/50' : 'text-gray-300'} />}
                                        {assignedInfo && <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{displayInitial}</div>
                                        <div className={`min-w-0 flex flex-col`}>
                                            <span className={`font-bold text-sm truncate leading-tight`}>{displayName}</span>
                                            <div className={`flex items-center text-xs mt-0.5 ${selectedPassenger?.id === p.id ? 'text-white/80' : 'text-gray-500'}`}>
                                                {p.isManual ? <><CornerDownRight size={10} className="mr-1" />Manual</> : p.isAccompaniment ? <><CornerDownRight size={10} className="mr-1" />Acompanhante {p.passengerIndex}</> : 'Titular'}
                                            </div>
                                        </div>
                                    </div>
                                    {assignedInfo && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[80px]" title={assignedInfo}>{assignedInfo.split(' - ').pop()}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 bg-slate-100 overflow-y-auto p-6 custom-scrollbar">
                    {activeHotel ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-20">
                            {activeHotel.rooms.map(room => {
                                const isFull = room.guests.length >= room.capacity;
                                const isTarget = (selectedPassenger && !isFull) || dragOverRoom === room.id;
                                return (
                                    <div
                                        key={room.id}
                                        onDragOver={(e) => { e.preventDefault(); if (!isFull) setDragOverRoom(room.id); }}
                                        onDragLeave={() => setDragOverRoom(null)}
                                        onDrop={(e) => handleDrop(e, room.id)}
                                        onClick={() => selectedPassenger && handleAssign(room.id, selectedPassenger)}
                                        className={`bg-white rounded-2xl border transition-all relative overflow-hidden group shadow-sm ${isTarget ? 'cursor-pointer ring-2 ring-primary-400 border-primary-400 shadow-lg scale-[1.01]' : 'border-gray-200'}`}
                                    >
                                        <div className="p-3 border-b flex justify-between items-center bg-gray-50/50 w-full">
                                            <div className="flex items-center gap-3 flex-1 min-w-0 truncate">
                                                <div className={`p-2 rounded-lg ${isFull ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}><BedDouble size={18} /></div>
                                                <div className="truncate flex-1">
                                                    <h5 className="font-bold text-gray-800 text-sm truncate" title={room.name}>{room.name}</h5>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase"><span>{room.type}</span><span className={isFull ? 'text-green-600' : 'text-blue-600'}>{room.guests.length}/{room.capacity}</span></div>
                                                </div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setRoomToDelete(room.id); }} className="text-gray-300 hover:text-red-500 p-1.5 flex-shrink-0"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="p-3 space-y-2 min-h-[80px]">
                                            {room.guests.map(g => (
                                                <div key={g.bookingId} className="bg-blue-50/50 px-3 py-2 rounded text-xs font-medium flex justify-between items-center group/guest border border-blue-100/50">
                                                    <div className="flex items-center gap-2"><User size={12} className="text-blue-400" /><span className="truncate max-w-[120px]">{g.name}</span></div>
                                                    <button onClick={(e) => { e.stopPropagation(); setGuestToRemove({ roomId: room.id, guestId: g.bookingId, guestName: g.name }); }} className="text-blue-300 hover:text-red-500 opacity-0 group-hover/guest:opacity-100"><X size={14} /></button>
                                                </div>
                                            ))}
                                            {Array.from({ length: Math.max(0, room.capacity - room.guests.length) }).map((_, i) => (
                                                <div key={i} className={`border-2 border-dashed rounded px-3 py-2 text-xs flex items-center justify-center gap-1 select-none ${isTarget ? 'border-primary-200 bg-primary-50 text-primary-600 font-bold' : 'border-gray-100 text-gray-300'}`}>
                                                    {isTarget ? <><MousePointer2 size={12} /> Alocar Aqui</> : 'Vaga Livre'}
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
