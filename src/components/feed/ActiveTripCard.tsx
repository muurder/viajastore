import React, { useState } from 'react';
import { Trip, BookingWithDetails, Agency } from '../../types';
import { Calendar, MapPin, Users, ArrowRight, Ticket, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActiveTripCardProps {
    booking: BookingWithDetails;
    trip: Trip;
    agency?: Agency | null;
    className?: string;
}

/**
 * ActiveTripCard - Compact horizontal card for upcoming trips
 * Fixed height to prevent layout shift, robust image handling
 */
const ActiveTripCard: React.FC<ActiveTripCardProps> = ({
    booking,
    trip,
    agency,
    className = ''
}) => {
    const [imgError, setImgError] = useState(false);

    // Calculate days until trip
    const getDaysUntil = (): number | null => {
        if (!trip.startDate) return null;
        const departure = new Date(trip.startDate);
        const now = new Date();
        const diffMs = departure.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / 86400000);
        return diffDays > 0 ? diffDays : null;
    };

    const daysUntil = getDaysUntil();

    // Robust image handling - try multiple sources
    const getTripImage = (): string => {
        // 1. Try trip.images array
        if (trip.images && trip.images.length > 0 && trip.images[0]) {
            return trip.images[0];
        }
        // 2. Try trip.cover_url (if exists in your schema)
        if ((trip as any).cover_url) {
            return (trip as any).cover_url;
        }
        // 3. Fallback to Unsplash travel image
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80';
    };

    const tripImage = getTripImage();

    // Format date
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short'
        });
    };

    // Get passenger names from booking
    const getPassengerNames = (): string[] => {
        if (booking.booking_passengers && booking.booking_passengers.length > 0) {
            return booking.booking_passengers.map(p => p.full_name);
        }
        if (booking.passengerDetails && booking.passengerDetails.length > 0) {
            return booking.passengerDetails.map(p => p.name);
        }
        return [];
    };

    const passengers = getPassengerNames();

    return (
        <div className={`relative bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden group hover:shadow-md transition-all ${className}`}>
            <div className="flex flex-col sm:flex-row">
                {/* Image Section - FIXED HEIGHT to prevent layout shift */}
                <div className="relative w-full sm:w-1/3 h-48 sm:h-[180px] flex-shrink-0">
                    {!imgError ? (
                        <img
                            src={tripImage}
                            alt={trip.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        /* Fallback with SAME dimensions as image */
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center">
                            <div className="text-center px-4">
                                <MapPin size={32} className="text-white/80 mx-auto mb-2" />
                                <p className="text-white text-sm font-semibold line-clamp-2">{trip.title}</p>
                            </div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Days countdown badge */}
                    {daysUntil && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow">
                            <span className="text-primary-700 font-bold text-xs">
                                {daysUntil === 1 ? 'Amanhã!' : `${daysUntil} dias`}
                            </span>
                        </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute bottom-2 left-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${booking.status === 'CONFIRMED'
                                ? 'bg-green-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                            <Ticket size={10} />
                            {booking.status === 'CONFIRMED' ? 'Confirmada' : 'Pendente'}
                        </div>
                    </div>
                </div>

                {/* Content Section - Compact */}
                <div className="flex-1 p-4 min-w-0">
                    <div className="flex flex-col h-full">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-stone-900 truncate group-hover:text-primary-700 transition-colors">
                                    {trip.title}
                                </h3>
                                {agency && (
                                    <p className="text-[10px] text-stone-500 uppercase tracking-wide">
                                        {agency.name}
                                    </p>
                                )}
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] text-stone-400">Código</p>
                                <p className="font-mono text-xs font-bold text-stone-600">{booking.id.slice(0, 6).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Details row - inline */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mb-3">
                            <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-stone-400" />
                                {trip.destination}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={12} className="text-stone-400" />
                                {formatDate(trip.startDate)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={12} className="text-stone-400" />
                                {booking.passengers || 1} pax
                            </span>
                        </div>

                        {/* Passengers - if logged in */}
                        {passengers.length > 0 && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-stone-50 rounded-lg">
                                <User size={12} className="text-stone-400 shrink-0" />
                                <p className="text-xs text-stone-600 truncate">
                                    {passengers.slice(0, 2).join(', ')}
                                    {passengers.length > 2 && ` +${passengers.length - 2}`}
                                </p>
                            </div>
                        )}

                        {/* CTA */}
                        <div className="mt-auto">
                            <Link
                                to={`/client/dashboard/BOOKINGS?booking=${booking.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-all active:scale-[0.98]"
                            >
                                Ver Detalhes
                                <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActiveTripCard;
