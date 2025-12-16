import React, { useState, useEffect } from 'react';
import {
    Search, Bus, Calendar, ChevronRight, ChevronLeft, Menu, Download, BedDouble
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Trip, Booking, OperationalData, Agency, PassengerSeat } from '../../../../types';
import { useToast } from '../../../../context/ToastContext';
import { useData } from '../../../../context/DataContext';
import { logger } from '../../../../utils/logger';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import { TransportManager } from '../AgencyTransport';
import { RoomingManager } from '../AgencyRooming';
import { DEFAULT_OPERATIONAL_DATA } from '../constants';

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

interface OperationsModuleProps {
    myTrips: Trip[];
    myBookings: Booking[];
    clients: any[];
    selectedTripId: string | null;
    onSelectTrip: (id: string | null) => void;
    onSaveTripData: (tripId: string, data: OperationalData) => void;
    currentAgency: Agency;
    isGuide?: boolean;
}

export const OperationsModule: React.FC<OperationsModuleProps> = ({
    myTrips, myBookings, clients, selectedTripId, onSelectTrip, onSaveTripData, currentAgency, isGuide = false
}) => {
    const tripLabel = isGuide ? 'Experiência' : 'Pacote';
    const tripLabelLower = isGuide ? 'experiência' : 'pacote';
    const selectedTrip = myTrips.find(t => t.id === selectedTripId);
    const [activeView, setActiveView] = useState<'TRANSPORT' | 'ROOMING'>('TRANSPORT');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const { deleteTrip, refreshData } = useData();
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);
    const [isDeletingTripInOps, setIsDeletingTripInOps] = useState(false);

    const filteredTrips = myTrips.filter(t => t.is_active && t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        if (selectedTripId) {
            refreshData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTripId]);


    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;
        setIsDeletingTripInOps(true);
        try {
            await deleteTrip(tripToDelete);
            setTripToDelete(null);
            showToast(`${tripLabel} excluído com sucesso.`, 'success');
            if (selectedTripId === tripToDelete) {
                onSelectTrip(null);
            }
        } catch (error: any) {
            logger.error('Error deleting trip:', error);
            showToast(`Erro ao excluir ${tripLabelLower}: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setIsDeletingTripInOps(false);
        }
    };

    const handleTripSelect = (id: string) => {
        onSelectTrip(id);
        setIsSidebarOpen(false);
    };

    // PDF Generator
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
            const tripBookings = myBookings.filter(b => b.tripId && String(b.tripId) === String(selectedTrip.id) && b.status === 'CONFIRMED');
            const totalPax = (opData.manualPassengers?.length || 0) + tripBookings.reduce((sum, b) => sum + b.passengers, 0);
            doc.text(`Total Passageiros: ${totalPax}`, 15, 80);

            // Helper for seat lookup
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
                const { supabase } = await import('../../../../services/supabase');
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
                logger.error('Error fetching passengers from DB:', err);
            }

            // Helper to get full detail
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
                const detail = opData.passengerDetails?.[id];
                return {
                    name: detail?.name || fallbackName,
                    document: detail?.document || '-',
                    phone: detail?.phone || '-',
                    birthDate: detail?.birthDate || '-',
                    seat: getPassengerSeat(id)
                };
            };

            // PASSENGER LIST
            doc.addPage();
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('LISTA COMPLETA DE PASSAGEIROS', 15, 20);
            doc.setFont(undefined, 'normal');

            const allPax: Array<{ name: string, phone: string, seat: string, document: string, birthDate: string, type: string }> = [];

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
                for (let i = 1; i < b.passengers; i++) {
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

            // Draw Table
            let yPos = 30;
            const rowHeight = 10;
            const colWidths = [8, 45, 28, 32, 28, 23, 18];

            // Header
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            let xOffset = 15;
            doc.rect(xOffset, yPos, colWidths[0], rowHeight, 'F');
            doc.text('Foto', xOffset + colWidths[0] / 2, yPos + 5.5, { align: 'center' });
            xOffset += colWidths[0];
            doc.rect(xOffset, yPos, colWidths[1], rowHeight, 'F');
            doc.text('Nome', xOffset + 2, yPos + 5.5);
            xOffset += colWidths[1];
            doc.rect(xOffset, yPos, colWidths[2], rowHeight, 'F');
            doc.text('Telefone', xOffset + 2, yPos + 5.5);
            xOffset += colWidths[2];
            doc.rect(xOffset, yPos, colWidths[3], rowHeight, 'F');
            doc.text('Assento', xOffset + 2, yPos + 5.5);
            xOffset += colWidths[3];
            doc.rect(xOffset, yPos, colWidths[4], rowHeight, 'F');
            doc.text('RG/CPF', xOffset + 2, yPos + 5.5);
            xOffset += colWidths[4];
            doc.rect(xOffset, yPos, colWidths[5], rowHeight, 'F');
            doc.text('Nasc.', xOffset + 2, yPos + 5.5);
            xOffset += colWidths[5];
            doc.rect(xOffset, yPos, colWidths[6], rowHeight, 'F');
            doc.text('Tipo', xOffset + 2, yPos + 5.5);

            yPos += rowHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            const getInitials = (name: string): string => {
                const parts = name.trim().split(' ').filter(p => p.length > 0);
                if (parts.length === 0) return '??';
                if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            };

            allPax.forEach((pax, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                const isEven = index % 2 === 0;
                if (isEven) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(15, yPos, 190, rowHeight, 'F');
                }

                xOffset = 15;
                doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.circle(xOffset + colWidths[0] / 2, yPos + rowHeight / 2, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(6);
                doc.text(getInitials(pax.name), xOffset + colWidths[0] / 2, yPos + rowHeight / 2 + 1.5, { align: 'center' });
                doc.setTextColor(0, 0, 0);
                xOffset += colWidths[0];

                doc.setFontSize(7);
                doc.text(pax.name.length > 30 ? pax.name.substring(0, 28) + '...' : pax.name, xOffset + 2, yPos + 5.5);
                xOffset += colWidths[1];

                doc.text(pax.phone, xOffset + 2, yPos + 5.5);
                xOffset += colWidths[2];
                doc.text(pax.seat.length > 18 ? pax.seat.substring(0, 16) + '...' : pax.seat, 17 + colWidths[0] + colWidths[1], yPos + 5.5);
                doc.text(pax.document, 17 + colWidths[0] + colWidths[1] + colWidths[2], yPos + 5.5);
                doc.text(pax.birthDate !== '-' ? new Date(pax.birthDate).toLocaleDateString('pt-BR') : '-', 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 5.5);
                doc.text(pax.type, 17 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], yPos + 5.5);

                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.1);
                doc.line(15, yPos + rowHeight, 205, yPos + rowHeight);

                yPos += rowHeight;
            });

            // BUS VISUAL
            if (opData.transport?.vehicles && opData.transport.vehicles.length > 0) {
                opData.transport.vehicles.forEach((vehicle) => {
                    doc.addPage();
                    const { cols, totalSeats, aisleAfterCol } = vehicle.config;

                    doc.setFontSize(16);
                    doc.setFont(undefined, 'bold');
                    doc.text(`MAPA DE ASSENTOS - ${vehicle.name.toUpperCase()}`, 15, 20);
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    doc.text(`${vehicle.config.label} - ${totalSeats} lugares`, 15, 27);

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
                    for (let r = 1; r <= rows; r++) {
                        let currentX = startX;
                        for (let c = 1; c <= cols; c++) {
                            const seatNum = ((r - 1) * cols) + c;
                            if (seatNum <= totalSeats) {
                                const occupant = vehicle.seats?.find(s => s.seatNumber === seatNum.toString());

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
                                doc.text(seatNum.toString(), currentX + seatSize / 2, currentY + seatSize / 2 + 1, { align: 'center' });

                                if (occupant) {
                                    doc.setFontSize(5);
                                    const nameParts = occupant.passengerName.split(' ');
                                    const shortName = nameParts.length > 1
                                        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
                                        : occupant.passengerName;
                                    const displayName = shortName.length > 12 ? shortName.substring(0, 10) + '...' : shortName;
                                    doc.text(displayName, currentX + seatSize / 2, currentY + seatSize + 3, { align: 'center' });
                                }

                                currentX += seatSize + seatSpacing;
                            }

                            if (c === aisleAfterCol) {
                                currentX += aisleWidth;
                            }
                        }
                        currentY += rowHeight;
                    }

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

                    let listY = legendY + 12;
                    const occupiedSeats = vehicle.seats?.filter(s => s.seatNumber) || [];
                    if (occupiedSeats.length > 0) {
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'bold');
                        doc.text('LISTA DE ASSENTOS OCUPADOS:', 15, listY);
                        listY += 6;
                        doc.setFont(undefined, 'normal');
                        doc.setFontSize(8);

                        const sortedSeats = [...occupiedSeats].sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber));
                        sortedSeats.forEach((seat, idx) => {
                            if (listY > 280) {
                                doc.addPage();
                                listY = 20;
                            }
                            const dbPassenger = bookingPassengersMap.get(seat.bookingId.split('-')[0] + '-' + (seat.bookingId.includes('-') ? seat.bookingId.split('-')[1] : '0'));
                            const passengerName = dbPassenger?.full_name || seat.passengerName;
                            doc.text(`Assento ${seat.seatNumber}: ${passengerName}`, 15, listY);
                            listY += 5;
                        });
                    }
                });
            } else if (opData.transport?.vehicleConfig) {
                // Legacy Single Vehicle Support
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
                for (let r = 1; r <= rows; r++) {
                    let currentX = startX;
                    for (let c = 1; c <= cols; c++) {
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
                            doc.text(seatNum.toString(), currentX + seatSize / 2, currentY + seatSize / 2 + 1, { align: 'center' });

                            if (occupant) {
                                doc.setFontSize(5);
                                const nameParts = occupant.passengerName.split(' ');
                                const shortName = nameParts.length > 1
                                    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
                                    : occupant.passengerName;
                                const displayName = shortName.length > 12 ? shortName.substring(0, 10) + '...' : shortName;
                                doc.text(displayName, currentX + seatSize / 2, currentY + seatSize + 3, { align: 'center' });
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

            // HOTELS VISUAL
            if (opData.hotels && opData.hotels.length > 0) {
                opData.hotels.forEach((hotel) => {
                    let currentY = 20;
                    if (currentY < 40) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFillColor(100, 100, 100);
                    doc.rect(15, currentY, 180, 12, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(16);
                    doc.setFont(undefined, 'bold');
                    doc.text(`HOSPEDAGEM - ${hotel.name.toUpperCase()}`, 20, currentY + 8);
                    doc.setFont(undefined, 'normal');
                    currentY += 18;

                    doc.setFillColor(59, 130, 246);
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    const headerY = currentY;
                    doc.rect(15, headerY, 180, 8, 'F');
                    doc.text('Quarto', 20, headerY + 5.5);
                    doc.text('Tipo', 60, headerY + 5.5);
                    doc.text('Hóspedes', 100, headerY + 5.5);
                    doc.text('Capacidade', 150, headerY + 5.5);
                    currentY += 10;

                    doc.setTextColor(0, 0, 0);
                    doc.setFont(undefined, 'normal');
                    doc.setFontSize(9);

                    hotel.rooms?.forEach((room, rIndex) => {
                        if (currentY > 270) {
                            doc.addPage();
                            doc.setFillColor(100, 100, 100);
                            doc.rect(15, 20, 180, 12, 'F');
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(16);
                            doc.setFont(undefined, 'bold');
                            doc.text(`HOSPEDAGEM - ${hotel.name.toUpperCase()}`, 20, 28);
                            doc.setFont(undefined, 'normal');

                            doc.setFillColor(59, 130, 246);
                            doc.rect(15, 35, 180, 8, 'F');
                            doc.setFontSize(10);
                            doc.setFont(undefined, 'bold');
                            doc.text('Quarto', 20, 40.5);
                            doc.text('Tipo', 60, 40.5);
                            doc.text('Hóspedes', 100, 40.5);
                            doc.text('Capacidade', 150, 40.5);
                            currentY = 45;
                            doc.setTextColor(0, 0, 0);
                            doc.setFont(undefined, 'normal');
                            doc.setFontSize(9);
                        }

                        const isEven = rIndex % 2 === 0;
                        if (isEven) {
                            doc.setFillColor(245, 245, 245);
                            doc.rect(15, currentY, 180, 8, 'F');
                        }

                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.1);
                        doc.rect(15, currentY, 180, 8, 'S');

                        doc.text(room.name || `Quarto ${rIndex + 1}`, 20, currentY + 5.5);
                        doc.text(room.type || 'Padrão', 60, currentY + 5.5);

                        const guestNames = room.guests && room.guests.length > 0
                            ? room.guests.map(g => {
                                const guestId = g.id || g.bookingId || '';
                                const dbGuest = bookingPassengersMap.get(guestId);
                                return dbGuest?.full_name || g.name || 'Hóspede (Sem nome)';
                            }).join(', ')
                            : 'Vazio';
                        const truncatedGuests = guestNames.length > 40 ? guestNames.substring(0, 38) + '...' : guestNames;
                        doc.text(truncatedGuests, 100, currentY + 5.5);

                        const guestCount = room.guests ? room.guests.length : 0;
                        doc.text(`${guestCount}/${room.capacity || 0}`, 150, currentY + 5.5);

                        currentY += 9;
                    });
                });
            } else if (opData.rooming && opData.rooming.length > 0) {
                // Legacy Rooming - Simplified
                doc.addPage();
                doc.setFontSize(16);
                doc.setFont(undefined, 'bold');
                doc.text('HOSPEDAGEM', 15, 20);
                doc.setFont(undefined, 'normal');

                let currentY = 35;
                opData.rooming.forEach((room) => {
                    if (currentY > 270) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.text(`${room.name} (${room.type})`, 15, currentY);
                    room.guests.forEach((g) => {
                        currentY += 5;
                        doc.text(`- ${g.name}`, 20, currentY);
                    });
                    currentY += 10;
                });
            }

            doc.save(`manifesto_${selectedTrip.slug}.pdf`);
            showToast('PDF gerado com sucesso!', 'success');
        } catch (e: any) {
            logger.error(e);
            showToast('Erro ao gerar PDF: ' + e.message, 'error');
        }
    };

    const tripBookings = selectedTrip && selectedTripId
        ? myBookings.filter(b => b.tripId && String(b.tripId) === String(selectedTripId))
        : [];

    return (
        <div className="flex h-full overflow-hidden bg-white relative">
            <ConfirmDialog
                isOpen={!!tripToDelete}
                onClose={() => setTripToDelete(null)}
                onConfirm={confirmDeleteTrip}
                title="Excluir Pacote"
                message="Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita."
                variant="danger"
                confirmText={isDeletingTripInOps ? "Excluindo..." : "Excluir"}
                isConfirming={isDeletingTripInOps}
            />

            <aside className={`
                flex-shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden
                ${isSidebarOpen ? 'w-80' : 'w-0'}
            `}>
                <div className={`min-w-[20rem] h-full flex flex-col transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Selecione a Viagem</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar viagem..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredTrips.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">
                                <Bus size={24} className="mx-auto mb-2 opacity-50" />
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
                                            {trip.images && trip.images.length > 0 ? (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow-sm">
                                                    <img
                                                        src={trip.images[0]}
                                                        alt={trip.title}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=IMG';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                    <Bus size={20} className="text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm mb-1 line-clamp-2 ${selectedTripId === trip.id ? 'text-primary-700' : 'text-gray-800'}`}>
                                                    {trip.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                                    <Calendar size={12} />
                                                    <span>{safeDate(trip.startDate)}</span>
                                                </div>
                                                {trip.destination && (
                                                    <p className="text-xs text-gray-400 line-clamp-1">{trip.destination}</p>
                                                )}
                                            </div>
                                            {selectedTripId === trip.id && (
                                                <ChevronRight size={16} className="text-primary-500 flex-shrink-0 mt-1" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-20 flex-shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-gray-500 hover:text-primary-600 p-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                            title={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
                        >
                            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                        </button>

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

                    {selectedTrip && (
                        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveView('TRANSPORT')}
                                    className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'TRANSPORT' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Bus size={14} className="inline mr-1 mb-0.5" /> <span className="hidden md:inline">Transporte</span>
                                </button>
                                <button
                                    onClick={() => setActiveView('ROOMING')}
                                    className={`px-3 md:px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'ROOMING' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <BedDouble size={14} className="inline mr-1 mb-0.5" /> <span className="hidden md:inline">Hospedagem</span>
                                </button>
                            </div>
                            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                            <button
                                onClick={generateManifest}
                                className="flex items-center gap-2 text-gray-600 hover:text-primary-600 text-xs font-bold transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
                                title="Exportar Manifesto para PDF"
                            >
                                <Download size={16} /> <span className="hidden md:inline">Exportar PDF</span>
                            </button>
                        </div>
                    )}
                </header>

                <section className="flex-1 overflow-hidden relative">
                    {selectedTrip ? (
                        activeView === 'TRANSPORT' ? (
                            <TransportManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                        ) : (
                            <RoomingManager trip={selectedTrip} bookings={tripBookings} clients={clients} onSave={(data) => onSaveTripData(selectedTrip.id, data)} />
                        )
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-primary-100 rounded-full flex items-center justify-center shadow-sm mb-6">
                                <Bus size={40} className="text-primary-300" />
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
                                    <Menu size={18} />
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
