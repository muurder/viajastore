import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Trip } from '../../types';
import { getDailyHeroImage } from '../../utils/dailyHeroImage';

interface WelcomeHeroProps {
    userName: string;
    userAvatar?: string | null;
    stats?: {
        totalTrips: number;
        upcomingTrips: number;
    };
    trips?: Trip[]; // Available trips for background images
    className?: string;
    ctaText?: string; // Custom CTA button text
    ctaLink?: string; // Custom CTA button link
    showUpcomingBadge?: boolean; // Show "X viagens chegando" badge (default: true)
}

/**
 * Get initials from name for avatar fallback
 */
const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * WelcomeHero - Premium welcome section with trip background images
 * Features dynamic greeting, user avatar with fallback, and inspirational message
 * Background image is shared across all components and changes once per day
 */
const WelcomeHero: React.FC<WelcomeHeroProps> = ({
    userName,
    userAvatar,
    stats,
    trips = [],
    className = '',
    ctaText = 'Explorar Viagens',
    ctaLink = '/trips',
    showUpcomingBadge = true
}) => {
    const [avatarError, setAvatarError] = useState(false);

    // Get the shared daily hero image
    const bgImage = getDailyHeroImage(trips);

    // Reset avatar error when userAvatar changes
    useEffect(() => {
        setAvatarError(false);
    }, [userAvatar]);

    // Dynamic greeting based on time of day
    const getGreeting = (): string => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Bom dia';
        if (hour >= 12 && hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    // Inspirational messages - deterministic based on day
    const inspirationalMessages = [
        'O mundo espera por você. Vamos planejar sua próxima aventura?',
        'Novas experiências estão te esperando. Que tal explorar?',
        'Cada viagem começa com um sonho. Qual é o seu?',
        'Pronto para descobrir lugares incríveis?',
        'Sua próxima memória inesquecível está a um clique de distância.',
    ];

    // Get consistent message for the day
    const getDailyMessage = (): string => {
        const today = new Date();
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
        const index = dayOfYear % inspirationalMessages.length;
        return inspirationalMessages[index];
    };

    const firstName = userName?.split(' ')[0] || 'Viajante';
    const initials = getInitials(userName);
    const showFallbackAvatar = !userAvatar || avatarError;

    return (
        <div className={`relative overflow-hidden rounded-3xl ${className}`}>
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
                {bgImage && (
                    <img
                        src={bgImage}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                )}
                {/* Dark gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/80 to-primary-700/70" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            {/* Decorative Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative px-8 py-10 md:px-12 md:py-14">
                <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
                    {/* Avatar with Fallback */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm p-1 ring-4 ring-white/30">
                                {showFallbackAvatar ? (
                                    /* Fallback: Initials Avatar */
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                                        <span className="text-white text-2xl md:text-3xl font-bold">
                                            {initials}
                                        </span>
                                    </div>
                                ) : (
                                    /* User Avatar */
                                    <img
                                        src={userAvatar}
                                        alt={firstName}
                                        className="w-full h-full rounded-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg">
                                <Sparkles size={14} className="text-primary-600" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                            {getGreeting()}, {firstName}!
                        </h1>
                        <p className="text-white/90 text-lg md:text-xl font-light max-w-xl drop-shadow-md">
                            {getDailyMessage()}
                        </p>

                        {/* Quick Stats */}
                        {stats && (
                            <div className="flex items-center gap-6 mt-6">
                                <div className="flex items-center gap-2 text-white">
                                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <span className="text-2xl font-bold drop-shadow-sm">{stats.totalTrips}</span>
                                        <span className="text-white/80 text-sm ml-1">viagens</span>
                                    </div>
                                </div>
                                {showUpcomingBadge && stats.upcomingTrips > 0 && (
                                    <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                                        🎉 {stats.upcomingTrips} viagem{stats.upcomingTrips > 1 ? 's' : ''} chegando!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CTA Button */}
                    <div className="flex-shrink-0">
                        <Link
                            to={ctaLink}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold shadow-lg shadow-black/20 hover:bg-white/95 hover:scale-[1.02] transition-all active:scale-[0.98]"
                        >
                            {ctaText}
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeHero;
