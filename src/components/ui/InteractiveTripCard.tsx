import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../types';
import { MapPin, Star, Clock, MessageCircle, ArrowRight, Check, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { buildWhatsAppLink } from '../../utils/whatsapp';
import { NoImagePlaceholder } from '../NoImagePlaceholder';

interface InteractiveTripCardProps {
    trip: Trip;
}

const InteractiveTripCardComponent: React.FC<InteractiveTripCardProps> = ({ trip }) => {
    const { user } = useAuth();
    const { toggleFavorite, clients, agencies, fetchTripImages } = useData();
    const { showToast } = useToast();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imgError, setImgError] = useState(false);
    const [tripWithImages, setTripWithImages] = useState<Trip>(trip);
    const { agencySlug } = useParams<{ agencySlug?: string }>();

    // Load images logic (similar to original card)
    useEffect(() => {
        const loadImages = async () => {
            if (trip.images && trip.images.length > 0) {
                setTripWithImages(trip);
                return;
            }
            if (fetchTripImages) {
                try {
                    const images = await fetchTripImages(trip.id);
                    if (images && images.length > 0) {
                        setTripWithImages({ ...trip, images });
                    } else {
                        setTripWithImages(trip);
                    }
                } catch (error) {
                    setTripWithImages(trip);
                }
            } else {
                setTripWithImages(trip);
            }
        };
        loadImages();
    }, [trip.id]);

    useEffect(() => {
        if (trip.id !== tripWithImages.id) {
            setTripWithImages(trip);
            setImgError(false);
            setCurrentImageIndex(0);
        } else if (trip.images && trip.images.length > 0) {
            // Update if images changed
            const currentImages = tripWithImages.images || [];
            const newImages = trip.images || [];
            if (newImages.length > 0 && (currentImages.length === 0 || currentImages[0] !== newImages[0])) {
                setTripWithImages(trip);
                setImgError(false);
                setCurrentImageIndex(0);
            }
        }
    }, [trip, tripWithImages.id]);

    const images = tripWithImages.images && tripWithImages.images.length > 0 ? tripWithImages.images : [];
    const hasMultipleImages = images.length > 1;

    // Navigation handlers
    const nextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasMultipleImages) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasMultipleImages) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
        }
    };

    const handleDotClick = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentImageIndex(index);
    };

    // Memoized helpers
    const linkTarget = useMemo(() =>
        agencySlug ? `/${agencySlug}/viagem/${trip.slug}` : `/viagem/${trip.slug}`,
        [agencySlug, trip.slug]
    );

    const isFavorite = useMemo(() => {
        if (!user || user.role !== 'CLIENT') return false;
        const currentUserData = clients.find(c => c.id === user.id);
        return currentUserData?.favorites.includes(trip.id) || false;
    }, [user, clients, trip.id]);

    const { agency, whatsappLink } = useMemo(() => {
        const foundAgency = agencies.find(a => a.agencyId === tripWithImages.agencyId);
        const contactNumber = foundAgency?.whatsapp || foundAgency?.phone;
        // Construct detailed message
        const message = `Olá, vi a viagem ${tripWithImages.title} no site e gostaria de mais informações.`;
        return {
            agency: foundAgency,
            whatsappLink: contactNumber ? `https://wa.me/55${contactNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : null
        };
    }, [agencies, tripWithImages]);


    const handleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            showToast('Faça login para favoritar.', 'info');
            return;
        }
        if (user.role === 'CLIENT') {
            toggleFavorite(trip.id, user.id);
        } else {
            showToast('Apenas viajantes podem favoritar.', 'warning');
        }
    };

    const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (whatsappLink) {
            window.open(whatsappLink, '_blank');
        }
    };

    const shouldShowPlaceholder = images.length === 0 || imgError;
    const rating = (tripWithImages as any).tripRating || tripWithImages.rating || 0;

    return (
        <div className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full relative">
            {/* Image Section */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden rounded-t-2xl">
                <Link to={linkTarget} className="block w-full h-full">
                    {shouldShowPlaceholder ? (
                        <NoImagePlaceholder
                            title={tripWithImages.title}
                            category={tripWithImages.category}
                            size="medium"
                        />
                    ) : (
                        <img
                            src={images[currentImageIndex]}
                            alt={`${tripWithImages.title} - ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.15]"
                            onError={() => setImgError(true)}
                        />
                    )}
                </Link>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />


                {/* Favorite Button */}
                <button
                    onClick={handleFavorite}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white shadow-sm transition-all"
                >
                    <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "text-red-500" : ""} />
                </button>

                {/* Navigation Arrows */}
                {hasMultipleImages && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/30 hover:bg-white/90 text-white hover:text-gray-900 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/30 hover:bg-white/90 text-white hover:text-gray-900 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </>
                )}

                {/* Rating Badge */}
                {rating > 0 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-bold border border-white/20">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        {rating.toFixed(1)}
                    </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-gray-800 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    {tripWithImages.category?.replace(/_/g, ' ') || 'Viagem'}
                </div>
            </div>

            {/* Thumbnails (Mini-Gallery) */}
            {hasMultipleImages && (
                <div className="px-4 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide border-b border-gray-50 h-[50px] items-center">
                    {images.slice(0, 5).map((img, idx) => (
                        <button
                            key={idx}
                            onMouseEnter={() => setCurrentImageIndex(idx)}
                            onClick={(e) => handleDotClick(e, idx)}
                            className={`relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0 transition-all ${idx === currentImageIndex
                                ? 'ring-2 ring-primary-500 ring-offset-1 z-10 scale-105'
                                : 'opacity-70 hover:opacity-100'
                                }`}
                        >
                            <img src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                    ))}
                    {images.length > 5 && (
                        <div className="text-[10px] text-gray-400 font-bold px-1">+{images.length - 5}</div>
                    )}
                </div>
            )}

            {/* Info Section */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <MapPin size={13} className="text-primary-500" />
                        <span className="truncate max-w-[150px]">{tripWithImages.destination}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1" title="Duração">
                        <Clock size={13} />
                        <span>{tripWithImages.durationDays} dias</span>
                    </div>
                </div>

                <Link to={linkTarget} className="block mb-3">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-primary-600 transition-colors" title={tripWithImages.title}>
                        {tripWithImages.title}
                    </h3>
                </Link>

                {/* Price */}
                <div className="mt-auto mb-4">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">A partir de</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-medium text-gray-500">R$</span>
                        <span className="text-xl font-extrabold text-gray-900">{tripWithImages.price.toLocaleString('pt-BR')}</span>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="grid grid-cols-5 gap-2 pt-4 border-t border-gray-100">
                    <Link
                        to={linkTarget}
                        className="col-span-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-100 text-gray-600 font-bold text-xs hover:border-primary-100 hover:text-primary-600 hover:bg-primary-50 transition-all"
                    >
                        Ver Detalhes
                    </Link>

                    {whatsappLink ? (
                        <button
                            onClick={handleWhatsAppClick}
                            className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs hover:bg-[#128C7E] transition-all shadow-sm hover:shadow-md"
                            title="Falar no WhatsApp"
                        >
                            <MessageCircle size={16} />
                            Whats
                        </button>
                    ) : (
                        <button disabled className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-bold text-xs cursor-not-allowed">
                            <MessageCircle size={16} />
                            Whats
                        </button>
                    )}
                </div>
            </div>

            {/* Explicit Border Overlay */}
            <div className="absolute inset-0 rounded-2xl border border-gray-100 pointer-events-none z-20" />
        </div>
    );
};

export const InteractiveTripCard = React.memo(InteractiveTripCardComponent);
