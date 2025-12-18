import React, { useEffect, useState } from 'react';
import { Trip } from '../../types';
import { TripCard } from '../TripCard';
import { useData } from '../../context/DataContext';
import { Sparkles, ArrowRight, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DiscoveryFeedProps {
    limit?: number;
    excludeTripIds?: string[];
    className?: string;
}

/**
 * DiscoveryFeed - Section showcasing new/recommended trips
 * Shows the latest trips added to the platform
 */
const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({
    limit = 3,
    excludeTripIds = [],
    className = ''
}) => {
    const { searchTrips, fetchTripImages } = useData();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTrips();
    }, []);

    const loadTrips = async () => {
        setLoading(true);
        try {
            // Get featured or recent trips
            const { data } = await searchTrips({
                limit: limit + excludeTripIds.length + 2, // Get extra in case some are excluded
                sort: 'DATE_ASC',
                featured: true
            });

            let tripsData = data || [];

            // If no featured trips, get any recent trips
            if (tripsData.length === 0) {
                const { data: recentData } = await searchTrips({
                    limit: limit + excludeTripIds.length + 2,
                    sort: 'DATE_ASC'
                });
                tripsData = recentData || [];
            }

            // Filter out excluded trips and limit
            const filteredTrips = tripsData
                .filter(trip => !excludeTripIds.includes(trip.id))
                .slice(0, limit);

            // Load images for trips that don't have them
            const tripsWithImages = await Promise.all(
                filteredTrips.map(async (trip) => {
                    if (!trip.images || trip.images.length === 0) {
                        try {
                            const images = await fetchTripImages(trip.id);
                            return { ...trip, images };
                        } catch {
                            return trip;
                        }
                    }
                    return trip;
                })
            );

            setTrips(tripsWithImages);
        } catch (error) {
            console.error('[DiscoveryFeed] Error loading trips:', error);
            setTrips([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`${className}`}>
                <div className="flex items-center justify-center py-12">
                    <Loader size={24} className="animate-spin text-stone-400" />
                </div>
            </div>
        );
    }

    if (trips.length === 0) {
        return null;
    }

    return (
        <div className={`${className}`}>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} className="text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Acabou de Chegar</h2>
                        <p className="text-sm text-stone-500">Novas viagens na SouNativo</p>
                    </div>
                </div>
                <Link
                    to="/trips"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                    Ver todas
                    <ArrowRight size={16} />
                </Link>
            </div>

            {/* Trips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
        </div>
    );
};

export default DiscoveryFeed;
