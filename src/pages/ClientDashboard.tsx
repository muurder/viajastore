
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, BookingWithDetails, Address, AgencyReview, Agency, Trip, Client } from '../types';
import { TripCard } from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star, MessageCircle, Send, ExternalLink, Edit, Briefcase, Smile, Plane, Compass, Users, Clock, CreditCard, Eye, ArrowRight, CheckCircle2, AlertCircle, XCircle, Grid3x3, List, ArrowUpDown, ArrowDownAZ } from 'lucide-react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { generateTripVoucherPDF } from '../utils/pdfGenerator';
import { slugify } from '../utils/slugify';
import { logger } from '../utils/logger';

// Helper function to build the WhatsApp URL
const buildWhatsAppUrl = (phone: string | null | undefined, tripTitle: string) => {
  if (!phone) return null;

  // Sanitize phone number to digits only
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const message = `Olá, tenho uma dúvida sobre minha viagem "${tripTitle}".`;
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${digits}?text=${encoded}`;
};

// Component for Booking Details Modal Content
interface BookingDetailsModalContentProps {
  booking: BookingWithDetails;
  trip: Trip;
  agency: Agency | null;
  bookingPassengers: any[];
  currentClient: Client | null;
  fetchTripImages?: (tripId: string, forceRefresh?: boolean) => Promise<string[]>;
  getTripById: (tripId: string) => Trip | undefined;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const BookingDetailsModalContent: React.FC<BookingDetailsModalContentProps> = ({
  booking,
  trip: initialTrip,
  agency,
  bookingPassengers: initialBookingPassengers,
  currentClient,
  fetchTripImages,
  getTripById,
  onClose,
  showToast
}) => {
  const [tripWithImages, setTripWithImages] = useState<Trip>(initialTrip);
  const [imgError, setImgError] = useState(false);
  const [bookingPassengers, setBookingPassengers] = useState<any[]>(initialBookingPassengers || []);
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  // Load images on mount if they don't exist - same logic as BookingCard
  useEffect(() => {
    const loadImages = async () => {
      // If trip already has images, use them
      if (initialTrip.images && initialTrip.images.length > 0) {
        setTripWithImages(initialTrip);
        return;
      }
      
      // Otherwise, try to fetch images
      if (fetchTripImages) {
        try {
          const images = await fetchTripImages(initialTrip.id);
          if (images && images.length > 0) {
            setTripWithImages({ ...initialTrip, images });
          } else {
            setTripWithImages(initialTrip);
          }
        } catch (error) {
          // Silently fail - will show placeholder
          setTripWithImages(initialTrip);
        }
      } else {
        setTripWithImages(initialTrip);
      }
    };

    loadImages();
  }, [initialTrip, fetchTripImages]);

  // Update when trip prop changes
  useEffect(() => {
    setTripWithImages(initialTrip);
    setImgError(false);
  }, [initialTrip]);

  // Load passengers if not available
  useEffect(() => {
    const loadPassengers = async () => {
      // If already have passengers, use them
      if (initialBookingPassengers && initialBookingPassengers.length > 0) {
        setBookingPassengers(initialBookingPassengers);
        return;
      }

      // Try to fetch from booking_passengers
      if (booking.booking_passengers && booking.booking_passengers.length > 0) {
        setBookingPassengers(booking.booking_passengers);
        return;
      }

      // Try to fetch from database
      if (booking.id && bookingPassengers.length === 0) {
        setLoadingPassengers(true);
        try {
          const { supabase } = await import('../services/supabase');
          if (supabase) {
            const { data, error } = await supabase
              .from('booking_passengers')
              .select('*')
              .eq('booking_id', booking.id)
              .order('created_at', { ascending: true });
            
            if (!error && data && data.length > 0) {
              setBookingPassengers(data);
            } else if (booking.passengerDetails && booking.passengerDetails.length > 0) {
              // Fallback to passengerDetails
              setBookingPassengers(booking.passengerDetails);
            }
          }
        } catch (error) {
          logger.warn('Error loading passengers:', error);
          // Fallback to passengerDetails if available
          if (booking.passengerDetails && booking.passengerDetails.length > 0) {
            setBookingPassengers(booking.passengerDetails);
          }
        } finally {
          setLoadingPassengers(false);
        }
      }
    };

    loadPassengers();
  }, [booking.id, booking.booking_passengers, booking.passengerDetails, initialBookingPassengers]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Get boarding point
  const boardingPoint = tripWithImages.boardingPoints && tripWithImages.boardingPoints.length > 0 
    ? tripWithImages.boardingPoints[0] 
    : null;

  // WhatsApp URL
  const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, tripWithImages.title);

  const imgUrl = tripWithImages.images?.[0] || null;

  // Function to generate PDF
  const handleGeneratePDF = async () => {
    try {
      let pdfPassengers: any[] = [];
      if (bookingPassengers && bookingPassengers.length > 0) {
        pdfPassengers = bookingPassengers.map((p: any) => {
          const rawDoc = p.document?.replace(/\D/g, '') || p.cpf?.replace(/\D/g, '') || '';
          let passengerType: string | undefined;
          if (p.birth_date || p.birthDate) {
            try {
              const today = new Date();
              const birth = new Date(p.birth_date || p.birthDate);
              if (!isNaN(birth.getTime())) {
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                passengerType = age < 12 ? 'child' : 'adult';
              }
            } catch (err) {
              logger.warn('Error calculating age:', err);
            }
          }
          return {
            name: p.full_name || p.name || '---',
            document: rawDoc,
            birthDate: p.birth_date || p.birthDate,
            type: passengerType || 'adult',
            age: undefined
          };
        });
      }
      await generateTripVoucherPDF({
        booking,
        trip: tripWithImages,
        agency: agency || null,
        passengers: pdfPassengers,
        voucherCode: booking.voucherCode,
        client: currentClient || null
      });
      showToast('PDF gerado com sucesso!', 'success');
    } catch (error: any) {
      logger.error('Error generating PDF:', error);
      showToast(error?.message || 'Erro ao gerar o PDF. Tente novamente.', 'error');
    }
  };

  return (
    <>
      {/* Premium Header with Trip Image and Action Buttons */}
      <div className="relative h-72 w-full overflow-hidden">
        {!imgError && imgUrl ? (
          <>
            <img
              src={imgUrl}
              alt={tripWithImages.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 flex items-center justify-center">
            <div className="text-center">
              <Plane size={56} className="text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">Sem imagem disponível</p>
            </div>
          </div>
        )}
        
        {/* Header Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 pb-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight drop-shadow-lg">{tripWithImages.title}</h2>
            <div className="flex items-center gap-4 text-white/95 mb-4">
              {tripWithImages.destination && (
                <>
                  <MapPin size={18} className="text-white/90" />
                  <span className="text-base font-medium">{tripWithImages.destination}</span>
                </>
              )}
            </div>
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <div className={`w-2 h-2 rounded-full ${
                booking.status === 'CONFIRMED' ? 'bg-emerald-400' :
                booking.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-sm font-semibold text-white">
                {booking.status === 'CONFIRMED' ? 'Confirmada' :
                 booking.status === 'PENDING' ? 'Pendente' : 'Cancelada'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Action Buttons - Outside Card */}
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={handleGeneratePDF} 
              className="px-3 py-2 bg-white text-primary-600 rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-primary-50 transition-all shadow-sm hover:shadow-md active:scale-95 border border-primary-200"
            >
              <Download size={16} /> 
              PDF
            </button>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-[#25D366] text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <MessageCircle size={16} className="fill-white" /> 
                WhatsApp
              </a>
            )}
          </div>

          {/* Financial Summary - Premium Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/5 to-transparent rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <ShoppingBag size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Resumo Financeiro</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Total</p>
                  <p className="text-3xl font-bold text-slate-900">{formatCurrency(booking.totalPrice)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Método de Pagamento</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {booking.paymentMethod === 'PIX' ? 'PIX' :
                     booking.paymentMethod === 'CREDIT_CARD' ? 'Cartão de Crédito' :
                     booking.paymentMethod === 'BOLETO' ? 'Boleto' : '---'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Código da Reserva</p>
                  <p className="text-lg font-mono font-bold text-primary-600 tracking-wider">{booking.voucherCode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passengers List - Premium Enhanced Design */}
          {loadingPassengers ? (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-center py-8">
                <Loader size={24} className="animate-spin text-primary-600" />
                <span className="ml-3 text-slate-600">Carregando passageiros...</span>
              </div>
            </div>
          ) : bookingPassengers.length > 0 ? (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <Users size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Passageiros</h3>
                    <p className="text-sm text-slate-500 mt-0.5">{bookingPassengers.length} {bookingPassengers.length === 1 ? 'passageiro' : 'passageiros'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {bookingPassengers.map((passenger: any, idx: number) => {
                  // Handle different field names
                  const passengerName = passenger.full_name || passenger.name || `Passageiro ${idx + 1}`;
                  const passengerDoc = passenger.document || passenger.cpf || '';
                  const passengerBirthDate = passenger.birth_date || passenger.birthDate || null;
                  
                  const formattedDoc = passengerDoc 
                    ? (passengerDoc.replace(/\D/g, '').length === 11 
                        ? passengerDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                        : passengerDoc)
                    : '---';
                  
                  const isPrimary = passenger.is_primary || passenger.isPrimary || idx === 0;
                  
                  // Calculate age if birth_date is available
                  let age: number | null = null;
                  let ageDisplay = '';
                  if (passengerBirthDate) {
                    try {
                      const today = new Date();
                      const birth = new Date(passengerBirthDate);
                      if (!isNaN(birth.getTime())) {
                        age = today.getFullYear() - birth.getFullYear();
                        const monthDiff = today.getMonth() - birth.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                          age--;
                        }
                        ageDisplay = age < 12 ? 'Criança' : age < 18 ? 'Adolescente' : 'Adulto';
                      }
                    } catch (err) {
                      // Ignore
                    }
                  }
                  
                  return (
                    <div
                      key={idx}
                      className={`group relative overflow-hidden rounded-xl p-6 border-2 transition-all duration-200 ${
                        isPrimary
                          ? 'bg-gradient-to-br from-primary-50 via-white to-primary-50/30 border-primary-300/60 shadow-md'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-base shadow-lg transition-transform group-hover:scale-110 ${
                          isPrimary
                            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white'
                            : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p className="font-bold text-slate-900 text-lg leading-tight mb-1">
                                {passengerName}
                              </p>
                              {isPrimary && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 border border-primary-200">
                                  Passageiro Principal
                                </span>
                              )}
                            </div>
                            {ageDisplay && (
                              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                age! < 12 
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {ageDisplay}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                            {formattedDoc && formattedDoc !== '---' && (
                              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <CreditCard size={16} className="text-slate-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Documento</p>
                                  <p className="font-mono text-sm font-bold text-slate-900">{formattedDoc}</p>
                                </div>
                              </div>
                            )}
                            {passengerBirthDate && (
                              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <Calendar size={16} className="text-slate-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Data de Nascimento</p>
                                  <p className="text-sm font-bold text-slate-900">
                                    {new Date(passengerBirthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            )}
                            {age !== null && (
                              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                                <User size={16} className="text-slate-500 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Idade</p>
                                  <p className="text-sm font-bold text-slate-900">{age} {age === 1 ? 'ano' : 'anos'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Users size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Passageiros</h3>
              </div>
              <div className="text-center py-8">
                <Users size={48} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhum passageiro encontrado</p>
                <p className="text-sm text-slate-400 mt-1">Os dados dos passageiros não estão disponíveis no momento.</p>
              </div>
            </div>
          )}

          {/* Trip Details Grid - Minimalist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tripWithImages.startDate && (
              <div className="bg-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Calendar size={16} className="text-slate-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data de Partida</p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {new Date(tripWithImages.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
            {tripWithImages.durationDays && (
              <div className="bg-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Clock size={16} className="text-slate-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração</p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {tripWithImages.durationDays} {tripWithImages.durationDays === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            )}
            {booking.date && (
              <div className="bg-white rounded-xl p-5 border border-slate-200/60 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Calendar size={16} className="text-slate-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data da Reserva</p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {new Date(booking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* Boarding Point - Premium Card */}
          {boardingPoint && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <MapPin size={20} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Ponto de Embarque</h3>
              </div>
              <div className="bg-white rounded-xl p-6 border border-slate-200/60 shadow-sm">
                <p className="font-bold text-slate-900 text-lg mb-3">{boardingPoint.location || boardingPoint.address}</p>
                {boardingPoint.time && (
                  <div className="flex items-center gap-2 mb-4 text-slate-600">
                    <Clock size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">Horário: {boardingPoint.time}</span>
                  </div>
                )}
                {boardingPoint.location && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(boardingPoint.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 border border-primary-200/60"
                  >
                    <ExternalLink size={16} />
                    Abrir no Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

// Component for loading trip images in list view
interface TripImageProps {
  tripId: string;
  tripImages?: string[];
  tripTitle: string;
  fetchTripImages?: (tripId: string, forceRefresh?: boolean) => Promise<string[]>;
  onImageLoaded?: (tripId: string, images: string[]) => void;
}

const TripImage: React.FC<TripImageProps> = ({ tripId, tripImages, tripTitle, fetchTripImages, onImageLoaded }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(tripImages?.[0] || null);
  const [imgError, setImgError] = useState(false);
  const onImageLoadedRef = useRef(onImageLoaded);

  // Update ref when callback changes
  useEffect(() => {
    onImageLoadedRef.current = onImageLoaded;
  }, [onImageLoaded]);

  // Load images on mount if they don't exist - same logic as BookingCard
  useEffect(() => {
    const loadImages = async () => {
      // If trip already has images, use them
      if (tripImages && tripImages.length > 0) {
        setImageUrl(tripImages[0]);
        setImgError(false);
        if (onImageLoadedRef.current) {
          onImageLoadedRef.current(tripId, tripImages);
        }
        return;
      }
      
      // Otherwise, try to fetch images
      if (fetchTripImages) {
        try {
          const images = await fetchTripImages(tripId);
          if (images && images.length > 0) {
            setImageUrl(images[0]);
            setImgError(false);
            if (onImageLoadedRef.current) {
              onImageLoadedRef.current(tripId, images);
            }
          } else {
            setImageUrl(null);
          }
        } catch (error) {
          // Silently fail - will show placeholder
          logger.warn('Error loading trip images:', error);
          setImageUrl(null);
        }
      } else {
        setImageUrl(null);
      }
    };

    loadImages();
  }, [tripId, tripImages, fetchTripImages]);

  // Update when tripImages prop changes
  useEffect(() => {
    setImageUrl(tripImages?.[0] || null);
    setImgError(false);
  }, [tripImages]);

  if (imgError || !imageUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <Plane size={20} className="text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={tripTitle}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
};

// Helper function for dynamic greetings
const getRandomGreeting = (userName: string) => {
  const greetings = [
    `Pronto para decolar, ${userName}? 🚀`,
    `O mundo te espera, ${userName}! 🌍`,
    `Que bom ter você de volta, ${userName}! ✨`,
    `Sua próxima aventura começa aqui, ${userName}? 🗺️`,
    `Vamos planejar algo incrível, ${userName}? ✈️`,
    `Novas memórias aguardam, ${userName}! 📸`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

// Component to handle booking card with dynamic image loading
interface BookingCardProps {
  booking: BookingWithDetails;
  trip: Trip;
  agency: Agency | null;
  hasReviewed: boolean;
  onOpenVoucher: (booking: Booking) => void;
  onViewDetails?: (booking: BookingWithDetails) => void;
  fetchTripImages?: (tripId: string, forceRefresh?: boolean) => Promise<string[]>;
  currentClient?: Client | null;
  user?: any;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, trip, agency, hasReviewed, onOpenVoucher, onViewDetails, fetchTripImages, currentClient, user }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tripWithImages, setTripWithImages] = useState<Trip>(trip);
  const [imgError, setImgError] = useState(false);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  // Load images on mount if they don't exist
  useEffect(() => {
    const loadImages = async () => {
      // If trip already has images, use them
      if (trip.images && trip.images.length > 0) {
        setTripWithImages(trip);
        return;
      }
      
      // Otherwise, try to fetch images
      if (fetchTripImages) {
        try {
          const images = await fetchTripImages(trip.id);
          if (images && images.length > 0) {
            setTripWithImages({ ...trip, images });
          } else {
            setTripWithImages(trip);
          }
        } catch (error) {
          // Silently fail - will show placeholder
          setTripWithImages(trip);
        }
      } else {
        setTripWithImages(trip);
      }
    };

    loadImages();
  }, [trip, fetchTripImages]);

  // Update when trip prop changes
  useEffect(() => {
    setTripWithImages(trip);
    setImgError(false);
  }, [trip]);

  // Use booking_passengers from booking if available, otherwise fetch
  useEffect(() => {
    if (booking.booking_passengers && booking.booking_passengers.length > 0) {
      // Use passengers from booking (already loaded from query)
      const formattedPassengers = booking.booking_passengers.map(p => {
        let formattedDoc = p.document || '---';
        if (formattedDoc && formattedDoc !== '---') {
          const digits = formattedDoc.replace(/\D/g, '');
          if (digits.length === 11) {
            formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          }
        }
        
        let age: number | undefined;
        let passengerType: string = 'Adulto';
        if (p.birth_date) {
          try {
            const today = new Date();
            const birth = new Date(p.birth_date);
            if (!isNaN(birth.getTime())) {
              age = today.getFullYear() - birth.getFullYear();
              const monthDiff = today.getMonth() - birth.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
              }
              passengerType = age < 12 ? 'Criança' : 'Adulto';
            }
          } catch (err) {
            logger.warn('Error calculating age:', err);
          }
        }
        
        return {
          name: p.full_name || '---',
          document: formattedDoc,
          birthDate: p.birth_date,
          type: passengerType,
          age,
          isPrimary: p.is_primary || false
        };
      });
      setPassengers(formattedPassengers);
      setLoadingPassengers(false);
    } else {
      // Fallback: fetch passengers if not in booking
      const fetchPassengers = async () => {
        if (!booking?.id) return;
        
        setLoadingPassengers(true);
        try {
          const { supabase } = await import('../services/supabase');
          if (supabase) {
            const { data, error } = await supabase
              .from('booking_passengers')
              .select('*')
              .eq('booking_id', booking.id)
              .order('created_at', { ascending: true });
            
            if (!error && data) {
              const formattedPassengers = data.map(p => {
                let formattedDoc = p.document || '---';
                if (formattedDoc && formattedDoc !== '---') {
                  const digits = formattedDoc.replace(/\D/g, '');
                  if (digits.length === 11) {
                    formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  }
                }
                
                let age: number | undefined;
                let passengerType: string = 'Adulto';
                if (p.birth_date) {
                  try {
                    const today = new Date();
                    const birth = new Date(p.birth_date);
                    if (!isNaN(birth.getTime())) {
                      age = today.getFullYear() - birth.getFullYear();
                      const monthDiff = today.getMonth() - birth.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                        age--;
                      }
                      passengerType = age < 12 ? 'Criança' : 'Adulto';
                    }
                  } catch (err) {
                    logger.warn('Error calculating age:', err);
                  }
                }
                
                return {
                  name: p.full_name || '---',
                  document: formattedDoc,
                  birthDate: p.birth_date,
                  type: passengerType,
                  age,
                  isPrimary: p.is_primary || false
                };
              });
              setPassengers(formattedPassengers);
            } else if (booking.passengerDetails && booking.passengerDetails.length > 0) {
              const formattedPassengers = booking.passengerDetails.map((p: any) => {
                let formattedDoc = p.document || p.cpf || '---';
                if (formattedDoc && formattedDoc !== '---') {
                  const digits = formattedDoc.replace(/\D/g, '');
                  if (digits.length === 11) {
                    formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  }
                }
                return {
                  name: p.name || '---',
                  document: formattedDoc,
                  birthDate: p.birthDate || p.birth_date,
                  type: p.type || 'Adulto',
                  isPrimary: false
                };
              });
              setPassengers(formattedPassengers);
            } else {
              setPassengers([]);
            }
          }
        } catch (err) {
          logger.error('Error fetching passengers:', err);
          setPassengers([]);
        } finally {
          setLoadingPassengers(false);
        }
      };
      fetchPassengers();
    }
  }, [booking]);

  const imgUrl = tripWithImages.images?.[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem';
  const startDate = tripWithImages.startDate;
  const agencySlugForNav = agency?.slug;
  const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, tripWithImages.title);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calculate days until trip
  const getDaysUntilTrip = () => {
    if (!startDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripDate = new Date(startDate);
    tripDate.setHours(0, 0, 0, 0);
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilTrip();
  const isPast = daysUntil !== null && daysUntil < 0;
  const isToday = daysUntil === 0;
  const isUrgent = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;

  // Get passenger count
  const passengerCount = passengers.length || booking.passengers || 1;
  const otherPassengers = passengerCount - 1;

  // Category display
  const categoryDisplay = tripWithImages.categories && tripWithImages.categories.length > 0
    ? tripWithImages.categories.map((c: any) => c.name || c).join(' • ')
    : tripWithImages.category || 'Viagem';

  const durationDisplay = tripWithImages.durationDays
    ? `${tripWithImages.durationDays} ${tripWithImages.durationDays === 1 ? 'dia' : 'dias'}`
    : '';

  const microDescription = durationDisplay
    ? `${categoryDisplay} • ${durationDisplay}`
    : categoryDisplay;

  // Status badge
  const getStatusBadge = () => {
    switch (booking.status) {
      case 'CONFIRMED':
  return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} />
            Confirmado
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1">
            <AlertCircle size={12} />
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
            <XCircle size={12} />
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  // Countdown badge
  const getCountdownBadge = () => {
    if (isPast) return null;
    if (isToday) {
      return (
        <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full animate-pulse">
          É hoje! Boa viagem 🚀
        </span>
      );
    }
    if (isUrgent) {
      return (
        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
          Faltam {daysUntil} {daysUntil === 1 ? 'dia' : 'dias'}!
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Image Header - Full width on mobile, left on desktop */}
      <div className="relative h-48 md:h-40 w-full md:w-64 md:float-left md:mr-6">
      {!imgError ? (
        <img 
          src={imgUrl} 
          alt={tripWithImages.title} 
            className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <Plane size={32} className="text-gray-400" />
        </div>
      )}
        {/* Status and Countdown Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {getStatusBadge()}
          {getCountdownBadge()}
         </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {/* Title & Destination */}
        <div className="mb-3">
          <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-2">
            {tripWithImages.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <MapPin size={14} className="text-primary-600" />
            <span>{tripWithImages.destination}</span>
          </div>
          {agency && (
            <Link to={`/${agency.slug || ''}`} className="text-sm text-primary-600 hover:underline font-medium">
              Organizado por {agency.name}
            </Link>
          )}
        </div>

        {/* Micro Description */}
        <p className="text-sm text-gray-500 mb-4">{microDescription}</p>

        {/* Passengers Preview */}
        {passengers.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {passengers.slice(0, 3).map((p, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-xs font-bold text-primary-700"
                >
                  {p.name?.charAt(0) || '?'}
                </div>
              ))}
              {otherPassengers > 2 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-700">
                  +{otherPassengers - 2}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-600">
              {otherPassengers > 0 ? `Você e +${otherPassengers} pessoa${otherPassengers > 1 ? 's' : ''}` : 'Você'}
            </span>
          </div>
        )}

        {/* Trip Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-2">
            <Calendar size={14} className="text-primary-600 mr-2" />
            <span className="font-medium">
              {startDate ? new Date(startDate).toLocaleDateString('pt-BR') : '---'}
            </span>
          </div>
          {tripWithImages.durationDays && (
            <div className="flex items-center text-gray-700 bg-gray-50 rounded-lg p-2">
              <Clock size={14} className="text-primary-600 mr-2" />
              <span className="font-medium">{durationDisplay}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap border-t border-gray-200 pt-4">
            <button 
              onClick={async () => {
                // Generate PDF using passengers from booking (already loaded from query)
                try {
                  // Use passengers from state (already formatted)
                  let pdfPassengers: any[] = [];
                  
                  if (passengers.length > 0) {
                    // Use formatted passengers from state
                    pdfPassengers = passengers.map(p => ({
                      name: p.name,
                      document: p.document?.replace(/\D/g, '') || '', // Raw digits for PDF
                      birthDate: p.birthDate,
                      type: p.type === 'Criança' ? 'child' : 'adult',
                      age: p.age
                    }));
                  } else if (booking.booking_passengers && booking.booking_passengers.length > 0) {
                    // Use booking_passengers directly
                    pdfPassengers = booking.booking_passengers.map(p => {
                      const rawDoc = p.document?.replace(/\D/g, '') || '';
                      let passengerType: string | undefined;
                      if (p.birth_date) {
                        try {
                          const today = new Date();
                          const birth = new Date(p.birth_date);
                          if (!isNaN(birth.getTime())) {
                            let age = today.getFullYear() - birth.getFullYear();
                            const monthDiff = today.getMonth() - birth.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                              age--;
                            }
                            passengerType = age < 12 ? 'child' : 'adult';
                          }
                        } catch (err) {
                          logger.warn('Error calculating age:', err);
                        }
                      }
                      return {
                        name: p.full_name || '---',
                        document: rawDoc,
                        birthDate: p.birth_date,
                        type: passengerType || 'adult',
                        age: undefined
                      };
                    });
                  } else if (booking.passengerDetails && booking.passengerDetails.length > 0) {
                    // Fallback to booking.passengerDetails
                    pdfPassengers = booking.passengerDetails.map((p: any) => ({
                      name: p.name || '---',
                      document: (p.document || p.cpf || '').replace(/\D/g, ''),
                      birthDate: p.birthDate || p.birth_date,
                      type: p.type || 'adult',
                      age: p.age
                    }));
                  } else {
                    // Last resort: use client as main passenger
                    const rawDoc = (currentClient?.cpf || '').replace(/\D/g, '');
                    pdfPassengers = [{
                      name: currentClient?.name || user?.name || 'Cliente',
                      document: rawDoc,
                      type: 'adult'
                    }];
                  }

                  logger.info(`Generating PDF from BookingCard with ${pdfPassengers.length} passenger(s):`, pdfPassengers.map(p => ({ name: p.name, document: p.document })));

                  // Generate PDF using unified function
                  await generateTripVoucherPDF({
                    booking,
                    trip,
                    agency: agency || null,
                    passengers: pdfPassengers,
                    voucherCode: booking.voucherCode,
                    client: currentClient || null
                  });

                  showToast('PDF gerado com sucesso!', 'success');
                } catch (error: any) {
                  logger.error('Error generating PDF from BookingCard:', error);
                  showToast(error?.message || 'Erro ao gerar o PDF. Tente novamente.', 'error');
                }
              }}
              className="bg-primary-600 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm"
            >
                 <Download size={16} /> Voucher PDF
            </button>
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(booking)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Eye size={16} />
                Ver Detalhes
              </button>
            )}
            <button 
               onClick={() => {
                 if (agencySlugForNav) {
                   navigate(`/${agencySlugForNav}?tab=REVIEWS`);
                 } else {
                   showToast('Não foi possível encontrar a página da agência.', 'error');
                 }
               }}
               disabled={!agencySlugForNav}
               className="bg-amber-50 text-amber-600 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Star size={16} /> {hasReviewed ? 'Ver/Editar Avaliação' : 'Avaliar Agência'}
            </button>
            {whatsappUrl && (
             <a
               href={whatsappUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-[#25D366] text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-[#128C7E] transition-colors shadow-sm"
             >
               <MessageCircle size={16} className="fill-white/20"/> Falar com a Agência
             </a>
            )}
         </div>
      </div>
    </div>
  );
};

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword, loading: authLoading, reloadUser } = useAuth();
  const { bookings, getTripById, clients, addAgencyReview, getReviewsByClientId, deleteAgencyReview, updateAgencyReview, refreshUserData: refreshAllData, getPublicTrips, trips, updateClientProfile, fetchTripImages } = useData();
  const { showToast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<BookingWithDetails | null>(null);
  const [bookingPassengers, setBookingPassengers] = useState<any[]>([]); 
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Sorting and view preferences (persisted in localStorage)
  const [sortBy, setSortBy] = useState<'date' | 'alphabetical'>(() => {
    const saved = localStorage.getItem('clientDashboard_sortBy');
    return (saved === 'date' || saved === 'alphabetical') ? saved : 'date';
  });
  const [viewMode, setViewMode] = useState<'card' | 'list'>(() => {
    const saved = localStorage.getItem('clientDashboard_viewMode');
    return (saved === 'card' || saved === 'list') ? saved : 'card';
  });
  
  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('clientDashboard_sortBy', sortBy);
  }, [sortBy]);
  
  useEffect(() => {
    localStorage.setItem('clientDashboard_viewMode', viewMode);
  }, [viewMode]);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<AgencyReview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for profile saving

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', tags: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const navigate = useNavigate();

  const { agencySlug, tab } = useParams<{ agencySlug?: string; tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const impersonateClientId = searchParams.get('impersonate');
  const activeTab = tab ? tab.toUpperCase() : 'PROFILE';
  
  const isMicrositeMode = !!agencySlug;

  // Impersonate logic: if admin is impersonating, use that client's data
  const impersonatedClient = impersonateClientId ? clients.find(c => c.id === impersonateClientId) : null;
  const isImpersonating = !!impersonateClientId && user?.role === 'ADMIN';

  // Ensure impersonate parameter is preserved when navigating
  useEffect(() => {
    if (isImpersonating && impersonateClientId && !searchParams.get('impersonate')) {
      setSearchParams({ impersonate: impersonateClientId }, { replace: true });
    }
  }, [isImpersonating, impersonateClientId, searchParams, setSearchParams]);

  // Ensure user is defined before accessing its id or role
  const dataContextClient = isImpersonating && impersonatedClient 
    ? impersonatedClient 
    : (user ? clients.find(c => c.id === user.id) : undefined);
  const currentClient = dataContextClient || (user as any); // Fallback to basic user if dataContextClient is undefined

  // Fix: Initialize with empty defaults, will be populated by useEffect
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: ''
  });

  // Fix: Initialize with empty defaults, will be populated by useEffect
  const [addressForm, setAddressForm] = useState<Address>(() => ({
     zipCode: '',
     street: '',
     number: '',
     complement: '',
     district: '',
     city: '',
     state: ''
  }));

  const [passForm, setPassForm] = useState({
     newPassword: '',
     confirmPassword: ''
  });

  // State for account deletion password
  const [passwordToDelete, setPasswordToDelete] = useState('');
  
  // State for password change loading
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // State for suggested trips
  const [suggestedTrips, setSuggestedTrips] = useState<Trip[]>([]);

  const [greeting, setGreeting] = useState('');

  // State to store loaded trip images
  const [loadedTripImages, setLoadedTripImages] = useState<Record<string, string[]>>({});

  // --- Data Reactivity Fix: Refresh data on mount/focus ---
  // Use ref to track if we're currently saving to avoid refresh loops
  const isSavingRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const handleRefresh = useCallback(async () => {
    // Skip refresh if currently saving to avoid loops
    if (isSavingRef.current) return;
    
    // Only refresh if user is a client and not currently loading auth
    if (!authLoading && user?.role === UserRole.CLIENT) {
      await refreshAllData(); // Calls DataContext's refreshUserData
      // FIX: Pass the current user object to reloadUser
      await reloadUser(user); // Reload AuthContext's user to get latest favorites/profile
    }
  }, [authLoading, user?.role, user?.id, refreshAllData, reloadUser]); // Use specific user properties instead of whole user object

  useEffect(() => {
    // Only refresh on mount once, not on every user change
    if (!authLoading && user?.role === UserRole.CLIENT && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      handleRefresh();
    }

    // Add event listener for window focus
    const handleFocus = () => {
      if (!isSavingRef.current && hasRefreshedRef.current) {
        handleRefresh();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authLoading, user?.role, handleRefresh]); // Only depend on authLoading and role, not whole user object
  // --- END Data Reactivity Fix ---

  // Generate greeting on mount - use impersonated client name if impersonating
  useEffect(() => {
    const nameToUse = isImpersonating && impersonatedClient?.name 
      ? impersonatedClient.name 
      : user?.name;
    if (nameToUse) {
      setGreeting(getRandomGreeting(nameToUse.split(' ')[0]));
    }
  }, [user?.name, isImpersonating, impersonatedClient?.name]);

  // Load and shuffle suggested trips
  useEffect(() => {
    const allTrips = getPublicTrips();
    if (allTrips.length > 0) {
      // Fisher-Yates shuffle for better randomness
      const shuffled = [...allTrips].sort(() => Math.random() - 0.5);
      // Select first 3 trips
      setSuggestedTrips(shuffled.slice(0, 3));
    } else {
      setSuggestedTrips([]);
    }
  }, [trips, getPublicTrips]); // Re-shuffle when trips data changes

  // Effect to update forms when currentClient changes
  useEffect(() => {
      if (currentClient) {
          setEditForm({
              name: currentClient.name || '',
              email: currentClient.email || '',
              phone: currentClient.phone || '',
              cpf: currentClient.cpf || '',
              birthDate: currentClient.birthDate || ''
          });
          setAddressForm(currentClient.address || {
              zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: ''
          });
      }
  }, [currentClient]);


  useEffect(() => {
    if (!authLoading && user?.role === 'AGENCY' && !window.location.hash.includes('dashboard')) {
      const agencyUser = user as Agency;
      const slug = agencyUser.slug || slugify(agencyUser.name);
      navigate(`/${slug}`);
    } else if (!authLoading && user && user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN && !isImpersonating) {
      // Allow ADMIN to access client dashboard without impersonation
      navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized', { replace: true });
    }
  }, [user, authLoading, isMicrositeMode, agencySlug, navigate, isImpersonating]);
  
  useEffect(() => {
    if(editingReview) {
      setReviewForm({ rating: editingReview.rating, comment: editingReview.comment, tags: editingReview.tags || [] });
      setShowEditReviewModal(true);
    } else {
      setShowEditReviewModal(false);
    }
  }, [editingReview]);

  // VOUCHER MODAL: Add ESC key listener and overlay click
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedBooking]);

  // Fetch passengers when booking is selected
  useEffect(() => {
    const fetchPassengers = async () => {
      if (!selectedBooking) {
        setBookingPassengers([]);
        return;
      }
      
      try {
        const { supabase } = await import('../services/supabase');
        if (supabase) {
          const { data, error } = await supabase
            .from('booking_passengers')
            .select('*')
            .eq('booking_id', selectedBooking.id)
            .order('created_at', { ascending: true });
          
          if (!error && data) {
            logger.info(`Loaded ${data.length} passengers for booking ${selectedBooking.id}:`, data.map(p => ({ name: p.full_name, document: p.document || p.cpf, birth_date: p.birth_date })));
            setBookingPassengers(data);
          } else {
            logger.warn(`No passengers found for booking ${selectedBooking.id}`, error);
            setBookingPassengers([]);
          }
        }
      } catch (err) {
        logger.error('Error fetching passengers:', err);
        setBookingPassengers([]);
      }
    };

    fetchPassengers();
  }, [selectedBooking]);

  // Allow access if user is CLIENT, ADMIN (can access directly), or ADMIN impersonating a client
  if (authLoading || !user || (user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN && !isImpersonating)) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-slate-600" size={32} /></div>;
  }

  // Use up-to-date values from DataContext - use impersonated client ID if impersonating
  const effectiveClientId = isImpersonating && impersonatedClient ? impersonatedClient.id : user.id;
  const myBookings = bookings.filter(b => b.clientId === effectiveClientId) as BookingWithDetails[];
  
  // Separate bookings into "Próximas" (future) and "Histórico" (past)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Helper function to get trip for sorting
  const getTripForSorting = (booking: BookingWithDetails) => {
    return booking._trip || getTripById(booking.tripId);
  };
  
  // Sort function based on selected sort option
  const sortBookings = (a: BookingWithDetails, b: BookingWithDetails, ascending: boolean = true) => {
    if (sortBy === 'alphabetical') {
      const tripA = getTripForSorting(a);
      const tripB = getTripForSorting(b);
      const titleA = tripA?.title || '';
      const titleB = tripB?.title || '';
      return ascending 
        ? titleA.localeCompare(titleB, 'pt-BR', { sensitivity: 'base' })
        : titleB.localeCompare(titleA, 'pt-BR', { sensitivity: 'base' });
    } else {
      // Sort by date
      const tripA = getTripForSorting(a);
      const tripB = getTripForSorting(b);
      const dateA = tripA?.startDate || '';
      const dateB = tripB?.startDate || '';
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return ascending ? timeA - timeB : timeB - timeA;
    }
  };
  
  const upcomingBookings = myBookings
    .filter(booking => {
      const trip = getTripForSorting(booking);
      if (!trip?.startDate) return false;
      const tripDate = new Date(trip.startDate);
      tripDate.setHours(0, 0, 0, 0);
      return tripDate >= today;
    })
    .sort((a, b) => sortBookings(a, b, true)); // Ascending for upcoming
  
  const pastBookings = myBookings
    .filter(booking => {
      const trip = getTripForSorting(booking);
      if (!trip?.startDate) return true; // If no date, consider as past
      const tripDate = new Date(trip.startDate);
      tripDate.setHours(0, 0, 0, 0);
      return tripDate < today;
    })
    .sort((a, b) => sortBookings(a, b, false)); // Descending for past
  
  const myReviews = getReviewsByClientId(effectiveClientId);
  
  // Helper function to calculate days until trip
  const getDaysUntilTrip = (trip: Trip | undefined) => {
    if (!trip?.startDate) return null;
    const tripDate = new Date(trip.startDate);
    tripDate.setHours(0, 0, 0, 0);
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const favoriteIds = currentClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => getTripById(id)).filter((t: Trip | undefined) => t !== undefined) as Trip[]; // Cast to Trip[]

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      try {
        const url = await uploadImage(e.target.files[0], 'avatars');
        if (url) {
            if (isImpersonating && impersonatedClient) {
              // If admin is impersonating, use updateClientProfile to update the impersonated client
              await updateClientProfile(impersonatedClient.id, { avatar: url });
              showToast('Foto de perfil atualizada!', 'success');
              await refreshAllData(); // Refresh to show updated avatar
            } else {
              // Normal user update
              const result = await updateUser({ avatar: url });
              if (result.success) {
                // Reload user data to refresh avatar immediately
                await reloadUser();
                await refreshAllData(); // Also refresh all data context
                showToast('Foto de perfil atualizada!', 'success');
              } else {
                showToast('Erro ao atualizar foto: ' + (result.error || 'Erro desconhecido'), 'error');
              }
            }
            // Reset input to allow selecting the same file again
            e.target.value = '';
        } else {
          showToast('Erro ao fazer upload da foto.', 'error');
        }
      } catch (error: any) {
        showToast('Erro ao fazer upload da foto: ' + (error.message || 'Erro desconhecido'), 'error');
      } finally {
        setUploading(false);
      }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressForm({ ...addressForm, zipCode: value });

    const cleanCep = value.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setAddressForm(prev => ({
            ...prev,
            street: data.logradouro || '',
            district: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
        } else {
            showToast('CEP não encontrado.', 'warning');
        }
      } catch (error) {
        logger.error("Erro ao buscar CEP", error);
        showToast('Erro ao buscar CEP. Verifique a conexão.', 'error');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    isSavingRef.current = true; // Set flag immediately to prevent refresh loops
    
    try {
      if (isImpersonating && impersonatedClient) {
        // If admin is impersonating, use updateClientProfile to update the impersonated client
        await updateClientProfile(impersonatedClient.id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          cpf: editForm.cpf,
          birthDate: editForm.birthDate,
          address: addressForm
        });
        showToast('Perfil atualizado com sucesso!', 'success');
        // Refresh data to show updated values
        setTimeout(async () => {
          await refreshAllData();
          isSavingRef.current = false;
        }, 500);
      } else {
        // Normal user update
        const res = await updateUser({ 
            name: editForm.name, 
            email: editForm.email,
            phone: editForm.phone,
            cpf: editForm.cpf,
            birthDate: editForm.birthDate,
            address: addressForm
        });
        
        if (res.success) {
          showToast('Perfil atualizado com sucesso!', 'success');
          // Reload user data to refresh the form with updated values
          // Use a small delay to let the DB update propagate
          setTimeout(async () => {
            if (user) {
              // Force refresh of DataContext first to get updated client data
              await refreshAllData();
              // Then reload user from AuthContext
              await reloadUser(user);
            }
            // Reset flag after reload completes
            isSavingRef.current = false;
          }, 500);
        } else {
          showToast('Erro ao atualizar: ' + (res.error || 'Erro desconhecido'), 'error');
          isSavingRef.current = false;
        }
      }
    } catch (error: any) {
      logger.error('Error saving profile:', error);
      showToast('Erro ao atualizar perfil. Tente novamente.', 'error');
      isSavingRef.current = false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Prevent multiple submissions
      if (isChangingPassword) return;
      
      // Validations
      if (passForm.newPassword !== passForm.confirmPassword) {
          showToast('As senhas não coincidem.', 'error');
          return;
      }
      if (passForm.newPassword.length < 6) {
          showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
          return;
      }
      
      setIsChangingPassword(true);
      
      try {
          const res = await updatePassword(passForm.newPassword);
          if (res.success) {
              // Success feedback
              showToast('Senha alterada com sucesso!', 'success');
              // Clear form fields
              setPassForm({ newPassword: '', confirmPassword: '' });
          } else {
              // Error feedback
              showToast('Erro: ' + (res.error || 'Não foi possível alterar a senha. Tente novamente.'), 'error');
          }
      } catch (error: any) {
          logger.error('Error changing password:', error);
          showToast('Erro ao alterar senha. Tente novamente.', 'error');
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handleDeleteAccount = async () => {
      // FIX: Require password for account deletion
      if (!passwordToDelete) {
          showToast('Por favor, digite sua senha para confirmar a exclusão.', 'warning');
          return;
      }

      const confirm = window.confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
      if (confirm) {
          const result = await deleteAccount(passwordToDelete); // Pass password
          if (result.success) {
              navigate('/');
          } else {
              showToast("Erro ao excluir conta: " + result.error, 'error');
          }
      }
  };

  const handleDeleteReview = async (id: string) => {
      if(window.confirm('Excluir sua avaliação?')) {
          await deleteAgencyReview(id);
          showToast('Avaliação excluída!', 'success');
      }
  };

  const generatePDF = async () => {
      if (!selectedBooking) return;
      const trip = selectedBooking._trip;
      const agency = selectedBooking._agency; 

      if (!trip) {
          showToast('Não foi possível carregar todos os dados para o voucher. Tente novamente.', 'error');
          return;
      }

      try {
        // Use booking_passengers from booking if available (already loaded from query)
        let passengersData: any[] = [];
        
        // Priority 1: Use booking_passengers from booking (already loaded from query)
        if (selectedBooking.booking_passengers && selectedBooking.booking_passengers.length > 0) {
          passengersData = selectedBooking.booking_passengers;
          logger.info(`✅ Using ${passengersData.length} passengers from booking.booking_passengers`);
        } else {
          // Priority 2: Fetch from database
        try {
          const { supabase } = await import('../services/supabase');
          if (supabase) {
              logger.info(`🔍 Fetching passengers for booking ${selectedBooking.id}...`);
            const { data, error } = await supabase
              .from('booking_passengers')
              .select('*')
              .eq('booking_id', selectedBooking.id)
                .order('created_at', { ascending: true });
            
              if (error) {
                logger.error('❌ Error fetching passengers from database:', error);
              } else if (data) {
              passengersData = data;
                logger.info(`✅ Found ${data.length} passengers in database`);
              } else {
                logger.warn('⚠️ No passengers data returned from query');
            }
          }
        } catch (err) {
          logger.error('Error fetching passengers:', err);
        }

          // Priority 3: Use state as fallback
          if (passengersData.length === 0 && bookingPassengers.length > 0) {
            logger.info('Using passengers from state as fallback');
            passengersData = bookingPassengers;
          }
        }

        // Use EXACTLY the same logic as CheckoutSuccess
        // Priority: database passengers > booking.passengerDetails > empty array (same as CheckoutSuccess)
        let passengers: any[] = [];
        
        logger.info('=== PASSENGER DATA ANALYSIS ===');
        logger.info(`Raw passengersData from DB: ${passengersData.length} records`);
        logger.info('Raw data:', JSON.stringify(passengersData, null, 2));
        logger.info(`Booking passengerDetails: ${selectedBooking.passengerDetails?.length || 0} records`);
        logger.info('Booking passengerDetails data:', JSON.stringify(selectedBooking.passengerDetails, null, 2));
        
        if (passengersData.length > 0) {
          // Convert database format to PassengerDetail format (EXACTLY as CheckoutSuccess receives from state)
          passengers = passengersData.map((p, idx) => {
            // Get document - keep raw digits, pdfGenerator will format
            const rawDoc = p.document || p.cpf || '';
            const docDigits = rawDoc.replace(/\D/g, '');
            
            const passenger = {
              name: p.full_name || p.name || `Passageiro ${idx + 1}`,
              document: docDigits || '---', // Raw digits, same as CheckoutSuccess
              cpf: docDigits || undefined, // Keep for compatibility
              birthDate: p.birth_date || p.birthDate || undefined,
              type: (() => {
                // Calculate type same way as CheckoutSuccess would
                if (p.age !== undefined && p.age !== null) {
                  return p.age < 12 ? 'child' : 'adult';
                }
                if (p.birth_date) {
                  try {
                    const today = new Date();
                    const birth = new Date(p.birth_date);
                    if (!isNaN(birth.getTime())) {
                      let age = today.getFullYear() - birth.getFullYear();
                      const monthDiff = today.getMonth() - birth.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                        age--;
                      }
                      return age < 12 ? 'child' : 'adult';
                    }
                  } catch (err) {
                    // Silent fail, let pdfGenerator determine
                  }
                }
                return undefined; // Let pdfGenerator determine
              })(),
              age: p.age
            };
            
            logger.info(`Passenger ${idx + 1}:`, {
              name: passenger.name,
              document: passenger.document,
              type: passenger.type,
              birthDate: passenger.birthDate,
              rawData: p
            });
            
            return passenger;
          });
          
          logger.info(`✅ Converted ${passengers.length} passengers from database (CheckoutSuccess format)`);
        } else if (selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0) {
          // Use booking.passengerDetails directly (EXACT format as CheckoutSuccess receives)
          passengers = selectedBooking.passengerDetails.map((p: any, idx: number) => {
            const passenger = {
              name: p.name || `Passageiro ${idx + 1}`,
              document: p.document || p.cpf || '---',
              cpf: p.cpf || p.document || undefined,
              birthDate: p.birthDate || p.birth_date || undefined,
              type: p.type || undefined,
              age: p.age
            };
            
            logger.info(`Passenger ${idx + 1} from booking.passengerDetails:`, passenger);
            
            return passenger;
          });
          logger.info(`✅ Using ${passengers.length} passengers from booking.passengerDetails`);
        } else {
          // Empty array (EXACT same as CheckoutSuccess fallback)
          passengers = [];
          logger.warn('⚠️ No passengers found - using empty array');
        }
        
        logger.info(`=== FINAL PASSENGERS ARRAY: ${passengers.length} ===`);
        passengers.forEach((p, idx) => {
          logger.info(`  [${idx + 1}] ${p.name} | Doc: ${p.document} | Type: ${p.type || 'undefined'}`);
        });

        // Final validation and logging
        logger.info('=== FINAL PDF GENERATION DEBUG ===');
        logger.info(`Booking ID: ${selectedBooking.id}`);
        logger.info(`Voucher Code: ${selectedBooking.voucherCode}`);
        logger.info(`Passengers from database: ${passengersData.length}`);
        logger.info(`Passengers formatted: ${passengers.length}`);
        logger.info(`Booking passengerDetails: ${selectedBooking.passengerDetails?.length || 0}`);
        logger.info('=== FINAL PASSENGERS ARRAY TO PDF ===');
        passengers.forEach((p, idx) => {
          logger.info(`  [${idx + 1}] Name: "${p.name}" | Document: "${p.document}" | Type: "${p.type || 'undefined'}" | BirthDate: "${p.birthDate || 'none'}"`);
        });
        
        if (passengers.length === 0) {
          logger.error('❌ CRITICAL: NO PASSENGERS FOUND FOR PDF!');
          logger.error('Raw database data:', JSON.stringify(passengersData, null, 2));
          logger.error('Booking passengerDetails:', JSON.stringify(selectedBooking.passengerDetails, null, 2));
          logger.error('Booking object:', JSON.stringify(selectedBooking, null, 2));
          showToast('Atenção: Nenhum passageiro encontrado. O PDF será gerado apenas com dados básicos.', 'warning');
        } else {
          logger.info(`✅ Generating PDF with ${passengers.length} passenger(s) - ALL SHOULD APPEAR IN PDF`);
        }

        // Call with EXACTLY the same parameters as CheckoutSuccess
        logger.info('=== CALLING generateTripVoucherPDF ===');
        logger.info(`Passengers count: ${passengers.length}`);
        logger.info('Passengers array:', JSON.stringify(passengers, null, 2));
        
        await generateTripVoucherPDF({
          booking: selectedBooking,
          trip,
          agency: agency || null,
          passengers, // Same format as CheckoutSuccess
          voucherCode: selectedBooking.voucherCode,
          client: currentClient || null
        });
        
        logger.info('✅ PDF generation completed');
      } catch (error: any) {
          logger.error('Erro ao gerar PDF:', error);
          showToast(error?.message || 'Ocorreu um erro ao gerar o PDF. Tente novamente.', 'error');
      }
  };

  const openWhatsApp = () => {
    if (!selectedBooking) return;
    const phone = selectedBooking._agency?.phone || selectedBooking._agency?.whatsapp;
    if (!phone) {
        showToast('Nenhum contato de WhatsApp disponível para esta agência.', 'info');
        return;
    }

    const digits = phone.replace(/\D/g, '');
    const tripTitle = selectedBooking._trip?.title || 'minha viagem';
    const msg = `Olá! Tenho uma dúvida sobre minha viagem "${tripTitle}".`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBooking || isSubmitting) return;
      setIsSubmitting(true);
      try {
          await addAgencyReview({
              agencyId: selectedBooking._trip?.agencyId || selectedBooking._trip?.agency_id, // Ensure agencyId is correctly accessed
              clientId: user.id,
              bookingId: selectedBooking.id,
              rating: reviewForm.rating,
              comment: reviewForm.comment,
              tags: reviewForm.tags
          });
          setShowReviewModal(false);
          setSelectedBooking(null);
          setReviewForm({ rating: 5, comment: '', tags: [] });
          showToast('Avaliação enviada com sucesso!', 'success');
      } catch (error) {
          logger.error(error);
          showToast('Erro ao enviar avaliação.', 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleEditReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || isSubmitting) return;
    setIsSubmitting(true);
    try {
        await updateAgencyReview(editingReview.id, {
            rating: reviewForm.rating,
            comment: reviewForm.comment,
            tags: reviewForm.tags
        });
        setEditingReview(null);
        setReviewForm({ rating: 5, comment: '', tags: [] });
        showToast('Avaliação atualizada com sucesso!', 'success');
    } catch(err) {
        logger.error(err);
        showToast('Erro ao atualizar avaliação.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Helper to preserve impersonate parameter in links
  const preserveImpersonate = (url: string) => {
    if (isImpersonating && impersonateClientId) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}impersonate=${impersonateClientId}`;
    }
    return url;
  };

  const getNavLink = (tab: string) => {
    const baseLink = isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
    // Preserve impersonate parameter if in impersonate mode
    return preserveImpersonate(baseLink);
  };
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-slate-50 text-slate-900 border-slate-900' : 'border-transparent text-slate-600 hover:bg-slate-50'}`;

  // Helper for ReviewForm tags
  const toggleReviewTag = (tag: string) => {
    setReviewForm(prev => {
      const newTags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const SUGGESTED_REVIEW_TAGS = ['Atendimento', 'Organização', 'Custo-benefício', 'Hospedagem', 'Passeios', 'Pontualidade'];


  return (
    <div className="max-w-[1600px] mx-auto py-6">
      {/* Admin Impersonate Banner */}
      {isImpersonating && (
        <div className="mb-6 bg-amber-50 border-b border-amber-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={20} />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Modo Admin - Visualização</p>
              <p className="text-xs text-amber-700">Você está visualizando o painel como: <strong>{currentClient?.name || impersonatedClient?.name}</strong></p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard?tab=USERS')}
            className="px-4 py-2 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-semibold text-sm transition-colors"
          >
            Voltar ao Admin
          </button>
        </div>
      )}

      {!isMicrositeMode && <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center mb-6 relative">
             <div className="relative w-24 h-24 mx-auto mb-4 border-4 border-slate-200 rounded-full bg-slate-100 shadow-sm">
                 <img 
                   key={user?.avatar || currentClient?.avatar || 'avatar'} 
                   src={currentClient?.avatar || user?.avatar || `https://ui-avatars.com/api/?name=${currentClient?.name || user?.name || 'Cliente'}`} 
                   alt={currentClient?.name || user?.name || 'Cliente'} 
                   className="w-full h-full rounded-full object-cover" 
                 />
                 <label className="absolute bottom-0 right-0 bg-white text-slate-700 p-2 rounded-full cursor-pointer hover:bg-slate-100 shadow-md transition-transform hover:scale-110 border border-slate-200">
                     <Camera size={14} />
                     <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                 </label>
                 {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full"><div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div></div>}
             </div>
             <h2 className="text-xl font-semibold text-slate-900 truncate">{currentClient?.name || user?.name || 'Cliente'}</h2>
             <p className="text-sm text-slate-600 font-light truncate">{greeting}</p> {/* Dynamic Greeting */}
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[ { id: 'PROFILE', icon: User, label: 'Meu Perfil' }, { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' }, { id: 'REVIEWS', icon: Star, label: 'Minhas Avaliações' }, { id: 'FAVORITES', icon: Heart, label: 'Favoritos' }, { id: 'SETTINGS', icon: Settings, label: 'Dados & Endereço' }, { id: 'SECURITY', icon: Shield, label: 'Segurança' } ].map((item) => ( <Link key={item.id} to={getNavLink(item.id)} className={getTabClass(item.id)}> <item.icon size={18} className="mr-3" /> {item.label} </Link> ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <button onClick={handleLogout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent transition-colors"> <LogOut size={18} className="mr-3" /> Sair da Conta </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-semibold text-slate-900">Resumo do Perfil</h2> <Link to={getNavLink('SETTINGS')} className="text-slate-600 text-sm font-semibold hover:text-slate-900 hover:underline">Editar Dados</Link> </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Stat Card: Viagens */}
                 <div className="bg-slate-50 p-6 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                    <div className="bg-white p-3 rounded-full shadow-sm text-slate-700"><Plane size={24} strokeWidth={1.5}/></div>
                    <div>
                        <p className="text-3xl font-semibold text-slate-900">{myBookings.length}</p>
                        <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Viagens Reservadas</p>
                    </div>
                 </div>
                 {/* Stat Card: Favoritos */}
                 <div className="bg-slate-50 p-6 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                    <div className="bg-white p-3 rounded-full shadow-sm text-slate-700"><Heart size={24} strokeWidth={1.5}/></div>
                    <div>
                        <p className="text-3xl font-semibold text-slate-900">{favoriteTrips.length}</p>
                        <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Viagens Favoritas</p>
                    </div>
                 </div>
               </div>

               {/* Profile Details */}
               <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome</label> <p className="text-slate-900 font-medium">{currentClient?.name || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label> <p className="text-slate-900 font-medium">{currentClient?.email || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF</label> <p className="text-slate-900 font-medium">{currentClient?.cpf || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Telefone</label> <p className="text-slate-900 font-medium">{currentClient?.phone || '---'}</p> </div>
                 {currentClient?.address?.city && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço</label> <p className="text-slate-900 font-medium">{currentClient.address.street}, {currentClient.address.number} - {currentClient.address.city}/{currentClient.address.state}</p> </div>
                 )}
               </div>

               {/* Suggested Trips Section */}
               {suggestedTrips.length > 0 && (
                 <div className="mt-12 pt-8 border-t border-gray-100">
                   <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                     <Compass size={24} className="text-slate-700" />
                     🌎 Inspire-se para sua próxima aventura
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {suggestedTrips.map((trip) => (
                       <TripCard key={trip.id} trip={trip} />
                     ))}
                   </div>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-8 animate-[fadeIn_0.3s]">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <h2 className="text-2xl font-bold text-gray-900">Minhas Viagens</h2>
                 
                 {/* Sort and View Controls */}
                 <div className="flex items-center gap-3 flex-wrap">
                   {/* Sort By */}
                   <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                     <button
                       onClick={() => setSortBy('date')}
                       className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                         sortBy === 'date'
                           ? 'bg-primary-600 text-white'
                           : 'text-gray-700 hover:bg-gray-50'
                       }`}
                     >
                       <ArrowUpDown size={14} />
                       Data
                     </button>
                     <button
                       onClick={() => setSortBy('alphabetical')}
                       className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                         sortBy === 'alphabetical'
                           ? 'bg-primary-600 text-white'
                           : 'text-gray-700 hover:bg-gray-50'
                       }`}
                     >
                       <ArrowDownAZ size={14} />
                       A-Z
                     </button>
                   </div>
                   
                   {/* View Mode */}
                   <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
                     <button
                       onClick={() => setViewMode('card')}
                       className={`p-2 rounded-md transition-colors ${
                         viewMode === 'card'
                           ? 'bg-primary-600 text-white'
                           : 'text-gray-700 hover:bg-gray-50'
                       }`}
                       title="Visualização em Cards"
                     >
                       <Grid3x3 size={18} />
                     </button>
                     <button
                       onClick={() => setViewMode('list')}
                       className={`p-2 rounded-md transition-colors ${
                         viewMode === 'list'
                           ? 'bg-primary-600 text-white'
                           : 'text-gray-700 hover:bg-gray-50'
                       }`}
                       title="Visualização em Lista"
                     >
                       <List size={18} />
                     </button>
                   </div>
                 </div>
               </div>
               
               {/* Próximas Viagens */}
               {upcomingBookings.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                     <Calendar size={20} className="text-primary-600" />
                     Próximas Viagens ({upcomingBookings.length})
                   </h3>
                   <div className={viewMode === 'card' ? 'space-y-4' : 'space-y-2'}>
                     {upcomingBookings.map(booking => {
                    const trip = booking._trip || getTripById(booking.tripId);
                    const agency = booking._agency; 
                    if (!trip) return null;
                    
                       if (viewMode === 'list') {
                         // List view - compact horizontal layout
                         const agencySlugForNav = agency?.slug;
                         const hasReviewedBooking = myReviews.some(r => r.bookingId === booking.id);
                         const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, trip.title);
                         
                         return (
                           <div
                      key={booking.id} 
                             className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
                           >
                             <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                               {/* Image */}
                               <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
                                 <TripImage
                                   tripId={trip.id}
                                   tripImages={trip.images}
                                   tripTitle={trip.title}
                                   fetchTripImages={fetchTripImages}
                                   onImageLoaded={(tripId, images) => {
                                     setLoadedTripImages(prev => ({ ...prev, [tripId]: images }));
                                   }}
                                 />
                               </div>
                               
                               {/* Content */}
                               <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-gray-900 truncate">{trip.title}</h3>
                                 <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                   <MapPin size={12} />
                                   {trip.destination}
                                 </p>
                                 <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                   <span className="flex items-center gap-1">
                                     <Calendar size={12} />
                                     {trip.startDate ? new Date(trip.startDate).toLocaleDateString('pt-BR') : '---'}
                                   </span>
                                   {trip.durationDays && (
                                     <span className="flex items-center gap-1">
                                       <Clock size={12} />
                                       {trip.durationDays} {trip.durationDays === 1 ? 'dia' : 'dias'}
                                     </span>
                                   )}
                                 </div>
                               </div>
                               
                               {/* Actions */}
                               <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                 <button
                                   onClick={async () => {
                                     try {
                                       let pdfPassengers: any[] = [];
                                       if (booking.booking_passengers && booking.booking_passengers.length > 0) {
                                         pdfPassengers = booking.booking_passengers.map(p => {
                                           const rawDoc = p.document?.replace(/\D/g, '') || '';
                                           let passengerType: string | undefined;
                                           if (p.birth_date) {
                                             try {
                                               const today = new Date();
                                               const birth = new Date(p.birth_date);
                                               if (!isNaN(birth.getTime())) {
                                                 let age = today.getFullYear() - birth.getFullYear();
                                                 const monthDiff = today.getMonth() - birth.getMonth();
                                                 if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                                                   age--;
                                                 }
                                                 passengerType = age < 12 ? 'child' : 'adult';
                                               }
                                             } catch (err) {
                                               logger.warn('Error calculating age:', err);
                                             }
                                           }
                                           return {
                                             name: p.full_name || '---',
                                             document: rawDoc,
                                             birthDate: p.birth_date,
                                             type: passengerType || 'adult',
                                             age: undefined
                                           };
                                         });
                                       }
                                       await generateTripVoucherPDF({
                                         booking,
                                         trip,
                                         agency: agency || null,
                                         passengers: pdfPassengers,
                                         voucherCode: booking.voucherCode,
                                         client: currentClient || null
                                       });
                                       showToast('PDF gerado com sucesso!', 'success');
                                     } catch (error: any) {
                                       logger.error('Error generating PDF:', error);
                                       showToast(error?.message || 'Erro ao gerar o PDF. Tente novamente.', 'error');
                                     }
                                   }}
                                   className="px-3 py-1.5 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                 >
                                   <Download size={14} />
                                   Voucher PDF
                                 </button>
                                 <button
                                   onClick={() => {
                                     setSelectedBookingDetails(booking);
                                     setShowDetailsModal(true);
                                   }}
                                   className="px-3 py-1.5 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                                 >
                                   <Eye size={14} />
                                   Ver Detalhes
                                 </button>
                                 <button 
                                   onClick={() => {
                                     if (agencySlugForNav) {
                                       navigate(`/${agencySlugForNav}?tab=REVIEWS`);
                                     } else {
                                       showToast('Não foi possível encontrar a página da agência.', 'error');
                                     }
                                   }}
                                   disabled={!agencySlugForNav}
                                   className="px-3 py-1.5 bg-amber-50 text-amber-600 text-sm font-bold rounded-lg flex items-center gap-1.5 hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                   <Star size={14} /> {hasReviewedBooking ? 'Ver/Editar Avaliação' : 'Avaliar Agência'}
                                 </button>
                                 {whatsappUrl && (
                                   <a
                                     href={whatsappUrl}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="px-3 py-1.5 bg-[#25D366] text-white text-sm font-bold rounded-lg flex items-center gap-1.5 hover:bg-[#128C7E] transition-colors shadow-sm"
                                   >
                                     <MessageCircle size={14} className="fill-white/20"/> Falar com a Agência
                                   </a>
                                 )}
                               </div>
                             </div>
                           </div>
                         );
                       }
                       
                       // Card view (default)
                       return (
                         <BookingCard
                           key={booking.id}
                           currentClient={currentClient}
                           user={user}
                      booking={booking} 
                      trip={trip} 
                      agency={agency}
                      hasReviewed={myReviews.some(r => r.bookingId === booking.id)}
                      onOpenVoucher={setSelectedBooking}
                           onViewDetails={(b) => {
                             setSelectedBookingDetails(b);
                             setShowDetailsModal(true);
                           }}
                      fetchTripImages={fetchTripImages}
                         />
                       );
                     })}
                   </div>
                 </div>
               )}
               
               {/* Histórico */}
               {pastBookings.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                     <Clock size={20} className="text-gray-500" />
                     Histórico ({pastBookings.length})
                   </h3>
                   <div className={viewMode === 'card' ? 'space-y-4' : 'space-y-2'}>
                     {pastBookings.map(booking => {
                       const trip = booking._trip || getTripById(booking.tripId);
                       const agency = booking._agency; 
                       if (!trip) return null;
                       
                       if (viewMode === 'list') {
                         // List view - compact horizontal layout
                         const agencySlugForNav = agency?.slug;
                         const hasReviewedBooking = myReviews.some(r => r.bookingId === booking.id);
                         const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, trip.title);
                         
                         return (
                           <div
                             key={booking.id}
                             className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all opacity-75"
                           >
                             <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                               {/* Image */}
                               <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200">
                                 <TripImage
                                   tripId={trip.id}
                                   tripImages={trip.images}
                                   tripTitle={trip.title}
                                   fetchTripImages={fetchTripImages}
                                   onImageLoaded={(tripId, images) => {
                                     setLoadedTripImages(prev => ({ ...prev, [tripId]: images }));
                                   }}
                                 />
                               </div>
                               
                               {/* Content */}
                               <div className="flex-1 min-w-0">
                                 <h3 className="font-bold text-gray-900 truncate">{trip.title}</h3>
                                 <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                   <MapPin size={12} />
                                   {trip.destination}
                                 </p>
                                 <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                   <span className="flex items-center gap-1">
                                     <Calendar size={12} />
                                     {trip.startDate ? new Date(trip.startDate).toLocaleDateString('pt-BR') : '---'}
                                   </span>
                                   {trip.durationDays && (
                                     <span className="flex items-center gap-1">
                                       <Clock size={12} />
                                       {trip.durationDays} {trip.durationDays === 1 ? 'dia' : 'dias'}
                                     </span>
                                   )}
                                 </div>
                               </div>
                               
                               {/* Actions */}
                               <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                                 <button
                                   onClick={async () => {
                                     try {
                                       let pdfPassengers: any[] = [];
                                       if (booking.booking_passengers && booking.booking_passengers.length > 0) {
                                         pdfPassengers = booking.booking_passengers.map(p => {
                                           const rawDoc = p.document?.replace(/\D/g, '') || '';
                                           let passengerType: string | undefined;
                                           if (p.birth_date) {
                                             try {
                                               const today = new Date();
                                               const birth = new Date(p.birth_date);
                                               if (!isNaN(birth.getTime())) {
                                                 let age = today.getFullYear() - birth.getFullYear();
                                                 const monthDiff = today.getMonth() - birth.getMonth();
                                                 if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                                                   age--;
                                                 }
                                                 passengerType = age < 12 ? 'child' : 'adult';
                                               }
                                             } catch (err) {
                                               logger.warn('Error calculating age:', err);
                                             }
                                           }
                                           return {
                                             name: p.full_name || '---',
                                             document: rawDoc,
                                             birthDate: p.birth_date,
                                             type: passengerType || 'adult',
                                             age: undefined
                                           };
                                         });
                                       }
                                       await generateTripVoucherPDF({
                                         booking,
                                         trip,
                                         agency: agency || null,
                                         passengers: pdfPassengers,
                                         voucherCode: booking.voucherCode,
                                         client: currentClient || null
                                       });
                                       showToast('PDF gerado com sucesso!', 'success');
                                     } catch (error: any) {
                                       logger.error('Error generating PDF:', error);
                                       showToast(error?.message || 'Erro ao gerar o PDF. Tente novamente.', 'error');
                                     }
                                   }}
                                   className="px-3 py-1.5 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                 >
                                   <Download size={14} />
                                   Voucher PDF
                                 </button>
                                 <button
                                   onClick={() => {
                                     setSelectedBookingDetails(booking);
                                     setShowDetailsModal(true);
                                   }}
                                   className="px-3 py-1.5 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                                 >
                                   <Eye size={14} />
                                   Ver Detalhes
                                 </button>
                                 <button 
                                   onClick={() => {
                                     if (agencySlugForNav) {
                                       navigate(`/${agencySlugForNav}?tab=REVIEWS`);
                                     } else {
                                       showToast('Não foi possível encontrar a página da agência.', 'error');
                                     }
                                   }}
                                   disabled={!agencySlugForNav}
                                   className="px-3 py-1.5 bg-amber-50 text-amber-600 text-sm font-bold rounded-lg flex items-center gap-1.5 hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                   <Star size={14} /> {hasReviewedBooking ? 'Ver/Editar Avaliação' : 'Avaliar Agência'}
                                 </button>
                                 {whatsappUrl && (
                                   <a
                                     href={whatsappUrl}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="px-3 py-1.5 bg-[#25D366] text-white text-sm font-bold rounded-lg flex items-center gap-1.5 hover:bg-[#128C7E] transition-colors shadow-sm"
                                   >
                                     <MessageCircle size={14} className="fill-white/20"/> Falar com a Agência
                                   </a>
                                 )}
                               </div>
                             </div>
                           </div>
                         );
                       }
                       
                       // Card view (default)
                       return (
                         <BookingCard
                           key={booking.id}
                           currentClient={currentClient}
                           user={user}
                           booking={booking}
                           trip={trip}
                           agency={agency}
                           hasReviewed={myReviews.some(r => r.bookingId === booking.id)}
                           onOpenVoucher={setSelectedBooking}
                           onViewDetails={(b) => {
                             setSelectedBookingDetails(b);
                             setShowDetailsModal(true);
                           }}
                           fetchTripImages={fetchTripImages}
                         />
                       );
                     })}
                   </div>
                 </div>
               )}
               
               {myBookings.length === 0 && (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                    <Plane size={32} className="text-gray-300 mx-auto mb-4" /> 
                    <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3> 
                    <p className="text-gray-500 mt-1 mb-6">Parece que você ainda não tem nenhuma reserva ativa.</p> 
                    <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                        <Compass size={16}/> Explorar Pacotes
                    </Link>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'REVIEWS' && (
               <div className="space-y-6 animate-[fadeIn_0.3s]">
                   <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Avaliações</h2>
                   {myReviews.length > 0 ? (
                       <div className="space-y-4">
                           {myReviews.map(review => (
                               <div key={review.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                   <div className="flex justify-between items-start mb-3">
                                       <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border border-gray-200"> {review.agencyLogo ? <img src={review.agencyLogo} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200"/>} </div>
                                           <div> <h4 className="font-bold text-gray-900">{review.agencyName}</h4> <div className="flex text-amber-400 text-sm"> {[...Array(5)].map((_,i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)} </div> </div>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <button onClick={() => setEditingReview(review)} className="text-gray-400 hover:text-primary-500 p-2 rounded-full hover:bg-primary-50 transition-colors" aria-label="Editar avaliação"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteReview(review.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" aria-label="Excluir avaliação"><Trash2 size={16}/></button>
                                       </div>
                                   </div>
                                   <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-xl italic">"{review.comment}"</p>
                                   <div className="mt-4 flex justify-end"> <Link to={`/${review.agencyName ? slugify(review.agencyName) : ''}`} className="text-xs font-bold text-primary-600 hover:underline flex items-center">Ver Página da Agência <ExternalLink size={12} className="ml-1"/></Link> </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                          <MessageCircle size={32} className="text-gray-300 mx-auto mb-4" /> 
                          <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação</h3> 
                          <p className="text-gray-500 mt-1 mb-6">Você ainda não avaliou nenhuma agência. Que tal contar sua experiência?</p> 
                          <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                                <Compass size={16}/> Encontre sua próxima viagem
                          </Link>
                       </div>
                   )}
               </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos ({favoriteTrips.length})</h2>
               {favoriteTrips.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"> {favoriteTrips.map((trip: any) => (trip && <TripCard key={trip.id} trip={trip} />))} </div> ) : ( 
                <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                    <Heart size={32} className="text-gray-300 mx-auto mb-4" /> 
                    <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3> 
                    <p className="text-gray-500 mt-2 mb-6">Você ainda não favoritou nenhuma viagem. Clique no coração para adicionar!</p> 
                    <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                        <Compass size={16}/> Explorar Pacotes
                    </Link>
                </div> 
               )}
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Pessoais & Endereço</h2>
               <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2"> <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label> <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Email</label> <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">CPF</label> <input value={editForm.cpf} onChange={(e) => setEditForm({...editForm, cpf: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="000.000.000-00" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label> <input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Data de Nascimento</label> <input type="date" value={editForm.birthDate} onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                  </div>
                  <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1 relative"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label> <input value={addressForm.zipCode} onChange={handleCepChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="00000-000" /> {loadingCep && <div className="absolute right-3 top-8"><Loader size={14} className="animate-spin text-primary-600"/></div>} </div>
                          <div className="md:col-span-3"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label> <input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label> <input value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comp.</label> <input value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-2"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label> <input value={addressForm.district} onChange={e => setAddressForm({...addressForm, district: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-3"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label> <input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label> <input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" placeholder="UF" /> </div>
                      </div>
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                  </button>
               </form>
             </div>
           )}

           {activeTab === 'SECURITY' && (
              <div className="space-y-6 animate-[fadeIn_0.3s]">
                  {/* Password Change Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Lock className="text-primary-600" size={20} />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Alterar Senha</h2>
                      </div>
                      <form onSubmit={handleChangePassword} className="max-w-md space-y-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Nova Senha</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                      type="password" 
                                      value={passForm.newPassword} 
                                      onChange={e => setPassForm({...passForm, newPassword: e.target.value})} 
                                      className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                      required 
                                      minLength={6}
                                      placeholder="Mínimo 6 caracteres"
                                      disabled={isChangingPassword}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Nova Senha</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                      type="password" 
                                      value={passForm.confirmPassword} 
                                      onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} 
                                      className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                      required 
                                      minLength={6}
                                      placeholder="Digite a senha novamente"
                                      disabled={isChangingPassword}
                                  />
                              </div>
                          </div>
                          <button 
                              type="submit" 
                              disabled={isChangingPassword}
                              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                              {isChangingPassword ? (
                                  <>
                                      <Loader size={18} className="animate-spin" />
                                      Alterando...
                                  </>
                              ) : (
                                  <>
                                      <Lock size={18} />
                                      Alterar Senha
                                  </>
                              )}
                          </button>
                      </form>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                          <AlertTriangle size={20} />
                          Zona de Perigo
                      </h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6"> 
                          <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              Ao excluir sua conta, todos os seus dados serão removidos permanentemente. 
                              Esta ação não pode ser desfeita.
                          </p> 
                          <div className="mb-4">
                              <label htmlFor="delete-password" className="block text-sm font-bold text-red-700 mb-2">
                                  Digite sua senha para confirmar
                              </label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                                  <input
                                      id="delete-password"
                                      type="password"
                                      value={passwordToDelete}
                                      onChange={(e) => setPasswordToDelete(e.target.value)}
                                      className="w-full border border-red-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-gray-900 transition-all"
                                      placeholder="Sua senha atual"
                                  />
                              </div>
                          </div>
                          <button 
                              onClick={handleDeleteAccount} 
                              disabled={!passwordToDelete}
                              className="flex items-center justify-center gap-2 bg-white border-2 border-red-300 text-red-600 px-6 py-3 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-red-600 disabled:hover:border-red-300"
                          >
                              <Trash2 size={16} /> 
                              Excluir minha conta
                          </button> 
                      </div>
                  </div>
              </div>
           )}
        </div>
      </div>

      {selectedBooking && !showReviewModal && !showEditReviewModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setSelectedBooking(null)}>
            <div className="bg-white rounded-3xl max-w-lg w-full max-w-[calc(100vw-2rem)] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-gray-600 hover:bg-white border border-gray-200 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-lg cursor-pointer"
                    aria-label="Fechar voucher"
                >
                    <X size={20} />
                </button>

                {/* TOP BANNER - Trip Image with Overlay (160px height) */}
                <div className="relative h-40 overflow-hidden">
                    {selectedBooking._trip?.images && selectedBooking._trip.images.length > 0 ? (
                        <>
                            <img 
                                src={selectedBooking._trip.images[0]} 
                                alt={selectedBooking._trip.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40"></div>
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-700"></div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                        <h3 className="text-2xl font-bold mb-2 drop-shadow-2xl">{selectedBooking._trip?.title || 'Pacote de Viagem'}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/95 font-medium">
                            <Calendar size={16} />
                            <span>{new Date(selectedBooking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                        {selectedBooking._trip?.destination && (
                            <div className="flex items-center gap-2 text-sm text-white/90 mt-1">
                                <MapPin size={14} />
                                <span>{selectedBooking._trip.destination}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BODY - White Background */}
                <div className="p-6 bg-white">
                    {/* Voucher Code - Large & Monospace */}
                    <div className="text-center mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código da Reserva</p>
                        <p className="text-3xl font-mono font-bold text-primary-600 tracking-wider">{selectedBooking.voucherCode}</p>
                    </div>

                    {/* Grid: Data, Horário, Status */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data</p>
                            <p className="text-sm font-semibold text-gray-900">{new Date(selectedBooking.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
                            <p className="text-sm font-semibold text-green-600">
                                {selectedBooking.status === 'CONFIRMED' ? 'Confirmada' : 
                                 selectedBooking.status === 'PENDING' ? 'Pendente' : 'Cancelada'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Passageiros</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedBooking.passengers || bookingPassengers.length || 1}</p>
                        </div>
                    </div>

                    {/* Dashed Separator (Picote Effect) */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <div className="bg-white px-4">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-white border-4 border-gray-200 rounded-2xl p-2 sm:p-3 shadow-sm flex items-center justify-center">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedBooking.voucherCode)}`} 
                                        alt="QR Code" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Passengers List - Visual with Avatars */}
                    {(bookingPassengers.length > 0 || (selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0)) && (
                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                <Users size={16} className="text-gray-400"/>
                                Passageiros ({bookingPassengers.length > 0 ? bookingPassengers.length : selectedBooking.passengerDetails?.length || 0})
                            </p>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {bookingPassengers.length > 0 ? (
                                    bookingPassengers.map((passenger, idx) => {
                                        const doc = passenger.document || passenger.cpf || '---';
                                        const formattedDoc = doc !== '---' && /^\d{11}$/.test(doc.replace(/\D/g, '')) 
                                            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                                            : doc;
                                        const isChild = passenger.birth_date ? (() => {
                                            const age = new Date().getFullYear() - new Date(passenger.birth_date).getFullYear();
                                            return age < 12;
                                        })() : false;
                                        
                                        return (
                                            <div key={passenger.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 truncate">{passenger.full_name || passenger.name || 'Passageiro'}</span>
                                                        {isChild && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Criança</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{formattedDoc}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0 ? (
                                    selectedBooking.passengerDetails.map((p: any, idx: number) => {
                                        const doc = p.document || p.cpf || '---';
                                        const formattedDoc = doc !== '---' && /^\d{11}$/.test(doc.replace(/\D/g, '')) 
                                            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                                            : doc;
                                        const isChild = p.birthDate ? (() => {
                                            const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                                            return age < 12;
                                        })() : false;
                                        
                                        return (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 truncate">{p.name || 'Passageiro'}</span>
                                                        {isChild && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Criança</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{formattedDoc}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons - Full Width */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={generatePDF} 
                            className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                        >
                            <Download size={20}/> 
                            Baixar PDF Oficial
                        </button>
                        {selectedBooking._agency && (selectedBooking._agency.whatsapp || selectedBooking._agency.phone) && (
                            <button 
                                onClick={openWhatsApp} 
                                className="w-full bg-white text-green-600 border-2 border-green-600 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <MessageCircle size={20}/> 
                                WhatsApp da Agência
                            </button>
                        )}
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBookingDetails && (() => {
        const trip = selectedBookingDetails._trip || getTripById(selectedBookingDetails.tripId);
        const agency = selectedBookingDetails._agency;
        const bookingPassengers = selectedBookingDetails.booking_passengers || selectedBookingDetails.passengerDetails || [];
        
        if (!trip) return null;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-[fadeIn_0.2s]" onClick={() => setShowDetailsModal(false)}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-w-[calc(100vw-2rem)] max-h-[92vh] overflow-hidden shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] relative flex flex-col animate-[scaleIn_0.2s]" onClick={e => e.stopPropagation()}>
              {/* Close Button - Premium Style */}
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-5 right-5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white border border-gray-200/80 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>

              <BookingDetailsModalContent
                booking={selectedBookingDetails}
                trip={trip}
                agency={agency}
                bookingPassengers={bookingPassengers}
                currentClient={currentClient || null}
                fetchTripImages={fetchTripImages}
                getTripById={getTripById}
                onClose={() => setShowDetailsModal(false)}
                showToast={showToast}
              />
            </div>
          </div>
        );
      })()}

      {(showReviewModal && selectedBooking) || (showEditReviewModal && editingReview) ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => { setShowReviewModal(false); setShowEditReviewModal(false); setSelectedBooking(null); setEditingReview(null); }}>
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6"> 
                      <h3 className="text-xl font-bold text-gray-900">{showEditReviewModal ? "Editar Avaliação" : "Avaliar Agência"}</h3> 
                      <button onClick={() => { setShowReviewModal(false); setShowEditReviewModal(false); setSelectedBooking(null); setEditingReview(null); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button> 
                  </div>
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      {(selectedBooking?._agency?.logo || editingReview?.agencyLogo) && ( <img src={selectedBooking?._agency?.logo || editingReview?.agencyLogo} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200"/> )}
                      <div> 
                          <p className="text-xs text-gray-500 uppercase font-bold">Agência</p> 
                          <p className="font-bold text-gray-900">{selectedBooking?._agency?.name || editingReview?.agencyName || 'Parceiro ViajaStore'}</p> 
                      </div>
                  </div>
                  <form onSubmit={showEditReviewModal ? handleEditReviewSubmit : handleReviewSubmit}>
                      <div className="mb-6 text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sua Experiência</label>
                          <div className="flex justify-center gap-2"> {[1, 2, 3, 4, 5].map((star) => ( <button type="button" key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })} className="focus:outline-none transition-transform hover:scale-110"> <Star size={32} className={star <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} /> </button> ))} </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags (Opcional)</label>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_REVIEW_TAGS.map(tag => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => toggleReviewTag(tag)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${reviewForm.tags.includes(tag) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Comentário</label>
                          <textarea className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none" placeholder="Conte como foi sua experiência com a agência..." value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} required/>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"> {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Send size={18}/>} {showEditReviewModal ? "Salvar Alterações" : "Enviar Avaliação"}</button>
                  </form>
              </div>
          </div>
      ) : null}
    </div>
  );
};

export default ClientDashboard;
