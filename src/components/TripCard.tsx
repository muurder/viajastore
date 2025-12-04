

import React, { useState } from 'react';
import { Trip } from '../types';
import { MapPin, Star, Heart, Clock, MessageCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { buildWhatsAppLink } from '../utils/whatsapp';

interface TripCardProps {
  trip: Trip;
}

export const TripCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
    <div className="h-48 bg-gray-200 w-full"></div>
    <div className="p-5 flex-1 flex flex-col">
      <div className="flex justify-between mb-3">
        <div className="h-4 bg-gray-200 w-24 rounded"></div>
        <div className="h-4 bg-gray-200 w-12 rounded"></div>
      </div>
      <div className="h-6 bg-gray-200 w-full rounded mb-2"></div>
      <div className="h-6 bg-gray-200 w-2/3 rounded mb-4"></div>
      
      <div className="h-4 bg-gray-200 w-20 rounded mb-4"></div>
      
      <div className="flex gap-2 mb-5">
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
        <div className="h-5 bg-gray-200 w-16 rounded-full"></div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
        <div className="h-8 bg-gray-200 w-24 rounded"></div>
        <div className="h-8 bg-gray-200 w-24 rounded-full"></div>
      </div>
    </div>
  </div>
);

const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const { user } = useAuth();
  const { toggleFavorite, clients, agencies } = useData();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  
  // Context awareness for link generation
  const { agencySlug } = useParams<{ agencySlug?: string }>();

  // Determine the link target based on context
  // If we are inside an agency route, keep the context. If global, keep global.
  const linkTarget = agencySlug 
    ? `/${agencySlug}/viagem/${trip.slug || trip.id}` 
    : `/viagem/${trip.slug || trip.id}`;

  // Ensure clients data is loaded and use current user's favorites
  const currentUserData = clients.find(c => c.id === user?.id);
  const isFavorite = user?.role === 'CLIENT' && currentUserData?.favorites.includes(trip.id);

  // Find Agency for WhatsApp
  // FIX: Find agency by 'agencyId' (PK) to match trip.agencyId, not by user 'id'.
  const agency = agencies.find(a => a.agencyId === trip.agencyId);
  // UPDATE: Check for both whatsapp and phone fields for robustness
  const contactNumber = agency?.whatsapp || agency?.phone;
  const whatsappLink = contactNumber ? buildWhatsAppLink(contactNumber, trip) : null;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop bubbling
    
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
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation(); // Stop bubbling
    if (whatsappLink) {
        window.open(whatsappLink, '_blank');
    }
  };

  // Fallback images by category if the main image fails
  const categoryImages: Record<string, string> = {
    'PRAIA': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    'AVENTURA': 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
    'FAMILIA': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    'ROMANTICO': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80',
    'URBANO': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=800&q=80',
    'NATUREZA': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
    'CULTURA': 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?auto=format&fit=crop&w=800&q=80',
    'GASTRONOMICO': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    'VIDA_NOTURNA': 'https://images.unsplash.com/photo-1514525253440-b393452e233e?auto=format&fit=crop&w=800&q=80',
    'VIAGEM_BARATA': 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80',
    'ARTE': 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80',
  };

  const displayImage = (imgError || !trip.images || !trip.images[0])
    ? (categoryImages[trip.category] || categoryImages['PRAIA'])
    : trip.images[0];

  return (
    <Link to={linkTarget} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition