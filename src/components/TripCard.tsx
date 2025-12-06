// This file is created to ensure the TripCard component exists at the correct path.
// It will use the correct trip.tripRating property.
import React from 'react';
import { Trip } from '../types';
import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';

export const TripCard: React.FC<{ trip: Trip }> = ({ trip }) => {
    return (
        <Link to={`/viagem/${trip.slug}`} className="group">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <img src={trip.images[0]} alt={trip.title} className="h-48 w-full object-cover" />
                <div className="p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold group-hover:text-primary-600">{trip.title}</h3>
                        <div className="flex items-center text-amber-500">
                            <Star size={16} className="fill-current" />
                            <span className="ml-1 font-bold">{trip.tripRating?.toFixed(1) || 'N/A'}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin size={14} className="mr-1" /> {trip.destination}
                    </p>
                    <p className="text-right font-bold text-lg mt-2">R$ {trip.price}</p>
                </div>
            </div>
        </Link>
    );
};

export const TripCardSkeleton: React.FC = () => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-4">
            <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
    </div>
);
