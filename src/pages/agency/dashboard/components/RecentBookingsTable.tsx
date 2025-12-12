import React, { useState, useEffect, useMemo } from 'react';
import { Booking } from '../../../../types';
import { ShoppingBag, Eye, X, Users, MessageCircle, FileText, CreditCard as CreditCardIcon, User } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { logger } from '../../../../utils/logger';
import { jsPDF } from 'jspdf';
import { Badge } from '../../../../components/ui/Badge';

interface RecentBookingsTableProps {
    bookings: Booking[];
    clients: any[];
}

const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings, clients }) => {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [bookingPassengers, setBookingPassengers] = useState<any[]>([]);
    const { showToast } = useToast();

    const recentBookings = useMemo(() => {
        return [...bookings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [bookings]);

    const isNew = (date: string) => {
        return (new Date().getTime() - new Date(date).getTime()) < 24 * 60 * 60 * 1000;
    };

    useEffect(() => {
        const fetchPassengers = async () => {
            if (!selectedBooking) {
                setBookingPassengers([]);
                return;
            }
            
            try {
                const { supabase } = await import('../../../../services/supabase');
                if (supabase) {
                    const { data, error } = await supabase
                        .from('booking_passengers')
                        .select('*')
                        .eq('booking_id', selectedBooking.id)
                        .order('passenger_index', { ascending: true });
                    
                    if (!error && data) {
                        setBookingPassengers(data);
                    }
                }
            } catch (err) {
                logger.error('Error fetching passengers:', err);
            }
        };

        fetchPassengers();
    }, [selectedBooking]);

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone) {
            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        } else {
            showToast('Número de WhatsApp não disponível', 'warning');
        }
    };

    const generatePDF = async (booking: Booking) => {
        const trip = booking._trip;
        const agency = booking._agency;
        const clientData = clients.find(c => c.id === booking.clientId);

        if (!trip) {
            showToast('Não foi possível carregar todos os dados para o voucher. Tente novamente.', 'error');
            return;
        }

        try {
            const doc = new jsPDF();
            doc.setFillColor(59, 130, 246);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('VOUCHER DE VIAGEM', 105, 25, { align: 'center' });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            let y = 60;
            const addField = (label: string, value: string) => { 
                doc.setFont('helvetica', 'bold'); 
                doc.text(label, 20, y); 
                doc.setFont('helvetica', 'normal'); 
                doc.text(value, 70, y); 
                y += 10; 
            };
            addField('Código da Reserva:', booking.voucherCode);
            y += 5;
            addField('Pacote:', trip.title || '---');
            addField('Destino:', trip.destination || '---');
            const dateStr = trip.startDate;
            addField('Data da Viagem:', dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : '---');
            const duration = trip.durationDays;
            addField('Duração:', `${duration} Dias`);
            y += 5;
            addField('Agência Responsável:', agency?.name || 'ViajaStore Partner');
            if (agency?.phone) addField('Contato Agência:', agency.phone);
            y += 10;
            
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y, 190, y);
            y += 15;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Passageiros', 20, y);
            y += 10;
            
            if (bookingPassengers.length > 0) {
                bookingPassengers.forEach((passenger, index) => {
                    if (y > 250) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${index === 0 ? 'Passageiro Principal' : `Acompanhante ${index}`}:`, 20, y);
                    doc.setFont('helvetica', 'normal');
                    y += 7;
                    doc.setFontSize(10);
                    doc.text(`Nome: ${passenger.full_name}`, 25, y);
                    y += 6;
                    if (passenger.cpf) {
                        doc.text(`CPF: ${passenger.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`, 25, y);
                        y += 6;
                    }
                    if (passenger.birth_date) {
                        doc.text(`Data de Nascimento: ${new Date(passenger.birth_date).toLocaleDateString('pt-BR')}`, 25, y);
                        y += 6;
                    }
                    if (passenger.whatsapp) {
                        doc.text(`WhatsApp: ${passenger.whatsapp}`, 25, y);
                        y += 6;
                    }
                    y += 5;
                });
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Passageiro Principal: ${clientData?.name || 'N/A'}`, 25, y);
                y += 6;
                if (clientData?.cpf) {
                    doc.text(`CPF: ${clientData.cpf}`, 25, y);
                    y += 6;
                }
                if (booking.passengers > 1) {
                    doc.text(`Total de passageiros: ${booking.passengers}`, 25, y);
                    y += 6;
                }
            }
            
            y += 10;
            doc.setDrawColor(200, 200, 200);
            doc.line(20, y, 190, y);
            y += 15;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Instruções', 20, y);
            y += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('1. Apresente este voucher (digital ou impresso) no momento do check-in.', 20, y);
            y += 6;
            doc.text('2. É obrigatória a apresentação de documento original com foto.', 20, y);
            y += 6;
            doc.text('3. Chegue com pelo menos 30 minutos de antecedência ao ponto de encontro.', 20, y);
            y = 280;
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Emitido por ViajaStore - O maior marketplace de viagens do Brasil.', 105, y, { align: 'center' });
            doc.save(`voucher_${booking.voucherCode}.pdf`);
            showToast('Voucher baixado com sucesso!', 'success');
        } catch (error) {
            logger.error('Erro ao gerar PDF:', error);
            showToast('Ocorreu um erro ao gerar o PDF. Tente novamente.', 'error');
        }
    };

    return (
        <>
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
                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase">Ações</th>
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
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedBooking(booking)}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors flex items-center gap-1 mx-auto"
                                            >
                                                <Eye size={14}/> Ver Detalhes
                                            </button>
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

        {/* Booking Details Modal - Simplified version */}
        {selectedBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setSelectedBooking(null)}>
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Detalhes da Reserva</h2>
                                <p className="text-primary-100 text-sm font-mono">{selectedBooking.voucherCode}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Pacote</p>
                                <p className="text-lg font-bold text-gray-900">{selectedBooking._trip?.title || 'N/A'}</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Valor Total</p>
                                <p className="text-2xl font-bold text-green-600">R$ {selectedBooking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        {clients.find(c => c.id === selectedBooking.clientId) && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cliente</p>
                                <p className="text-base font-bold text-gray-900">{clients.find(c => c.id === selectedBooking.clientId)?.name || 'N/A'}</p>
                            </div>
                        )}
                    </div>
                    <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-end gap-3">
                        <button onClick={() => setSelectedBooking(null)} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-colors">
                            Fechar
                        </button>
                        <button onClick={() => generatePDF(selectedBooking)} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center gap-2">
                            <FileText size={18}/> Baixar Voucher (PDF)
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default RecentBookingsTable;
