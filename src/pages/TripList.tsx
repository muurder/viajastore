

import React, { useState, useEffect } from 'react';
// Fix: Add useData import
import { useData } from '../context/DataContext';
import TripCard, { TripCardSkeleton } from '../components/TripCard';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Filter, X, ArrowUpDown, Search, ChevronDown, ChevronUp, ArrowLeft, Loader, MapPin } from 'lucide-react';

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// @FIX: Changed from default export to named export
export const TripList: React.FC = () => {
  // Detect if we are in an agency microsite
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const { getPublicTrips, getAgencyPublicTrips, getAgencyBySlug, loading, trips } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Try to get agency if in microsite mode
  const currentAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

  // Determine if we should wait for data
  // If we have a slug but no agency yet, check if we are still loading data
  const isResolvingAgency = !!agencySlug && !currentAgency && loading;
  const isAgencyNotFound = !!agencySlug && !currentAgency && !loading;
  
  // Filter trips based on context
  // TRUST THE DB: If DB sends data, show it.
  const initialTrips = isResolvingAgency 
    ? [] 
    : (currentAgency ? getAgencyPublicTrips(currentAgency.agencyId) : trips);
  
  const [filteredTrips, setFilteredTrips] = useState(initialTrips);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [openFilterSections, setOpenFilterSections] = useState<Record<string, boolean>>({
     traveler: true, style: true, duration: true, price: true, dest: true
  });

  // Update initial trips when data loads or route changes
  useEffect(() => {
     if (isResolvingAgency) return; // Wait until loaded

     // Corrected: Use agencyId (PK) instead of id (Auth ID)
     const sourceTrips = currentAgency ? getAgencyPublicTrips(currentAgency.agencyId) : trips;
     setFilteredTrips(sourceTrips);
  }, [currentAgency, agencySlug, loading, trips]);

  // Extract URL Params
  const q = searchParams.get('q') || '';
  const tagsParam = searchParams.get('tags'); // comma separated
  const travelerParam = searchParams.get('traveler'); // comma separated
  const durationParam = searchParams.get('duration'); // '1-3', '4-7' etc
  const priceParam = searchParams.get('price'); // '0-500', '500-1000' etc
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort') || 'RELEVANCE';

  // Derived State from URL
  const selectedTags = tagsParam ? tagsParam.split(',') : [];
  const selectedTravelerTypes = travelerParam ? travelerParam.split(',') : [];
  
  // Options Data
  const travelerOptions = [
    { id: 'SOZINHO', label: 'Sozinho' },
    { id: 'CASAL', label: 'Casal' },
    { id: 'FAMILIA', label: 'Família' },
    { id: 'AMIGOS', label: 'Amigos' },
    { id: 'MOCHILAO', label: 'Mochilão' },
    { id: 'MELHOR_IDADE', label: 'Melhor Idade' }
  ];

  const styleOptions = [
    'Natureza', 'História', 'Gastronomia', 'Vida Noturna', 'Viagem barata', 
    'Cultura', 'Arte', 'Praia', 'Aventura', 'Romântico', 'Camping', 'Místico', 'Religioso'
  ];

  const durationOptions = [
    { id: '1-3', label: '1 a 3 dias' },
    { id: '4-7', label: '4 a 7 dias' },
    { id: '8-14', label: '8 a 14 dias' },
    { id: '15+', label: '15+ dias' }
  ];

  const priceOptions = [
    { id: '0-500', label: 'Até R$ 500' },
    { id: '500-1000', label: 'R$ 500 - R$ 1.000' },
    { id: '1000-3000', label: 'R$ 1.000 - R$ 3.000' },
    { id: '3000+', label: 'Acima de R$ 3.000' }
  ];

  const popularDestinations = [
    'Rio de Janeiro', 'São Thomé', 'Bonito', 'Jalapão', 
    'Ubatuba', 'Salvador', 'Foz do Iguaçu', 'Noronha'
  ];

  // Helper to update URL Params
  const updateUrl = (key: string, value: string | string[] | null) => {
      const newParams = new URLSearchParams(searchParams);
      if (!value || (Array.isArray(value) && value.length === 0)) {
          newParams.delete(key);
      } else {
          newParams.set(key, Array.isArray(value) ? value.join(',') : value);
      }
      setSearchParams(newParams, { replace: true });
  };

  const toggleSelection = (key: string, currentList: string[], item: string) => {
     const newList = currentList.includes(item) 
        ? currentList.filter(i => i !== item)
        : [...currentList, item];
     updateUrl(key, newList);
  };

  const toggleAccordion = (section: string) => {
     setOpenFilterSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter Logic
  useEffect(() => {
    if (isResolvingAgency) return;

    // Corrected: Use agencyId (PK) instead of id (Auth ID)
    const sourceTrips = currentAgency ? getAgencyPublicTrips(currentAgency.agencyId) : trips;
    let result = [...sourceTrips];

    // 1. Search Term (Generalized Search)
    if (q) {
       const cleanQ = normalizeText(q);
       result = result.filter(t => 
         normalizeText(t.title).includes(cleanQ) || 
         normalizeText(t.destination).includes(cleanQ) ||
         normalizeText(t.description).includes(cleanQ) || 
         t.tags.some(tag => normalizeText(tag).includes(cleanQ))
       );
    }

    // 2. Category
    if (categoryParam) {
        result = result.filter(t => t.category === categoryParam);
    }

    // 3. Traveler Type (OR logic)
    if (selectedTravelerTypes.length > 0) {
        result = result.filter(t => 
           t.travelerTypes.some(type => selectedTravelerTypes.includes(type))
        );
    }

    // 4. Style / Tags (OR logic with Partial Match)
    if (selectedTags.length > 0) {
        result = result.filter(t => 
            t.tags.some(tag => selectedTags.includes(tag)) ||
            t.tags.some(tag => selectedTags.some(sTag => tag.includes(sTag))) // Partial matching for broader filters
        );
    }

    // 5. Duration
    if (durationParam) {
        // Parse duration param e.g., '1-3', '15+'
        result = result.filter(t => {
            if (durationParam === '15+') return t.durationDays >= 15;
            const [min, max] = durationParam.split('-').map(Number);
            return t.durationDays >= min && t.durationDays <= max;
        });
    }

    // 6. Price
    if (priceParam) {
        result = result.filter(t => {
             if (priceParam === '3000+') return t.price >= 3000;
             const [min, max] = priceParam.split('-').map(Number);
             return t.price >= min && t.price <= max;
        });
    }

    // Sorting
    switch (sortParam) {
        case 'LOW_PRICE': result.sort((a, b) => a.price - b.price); break;
        case 'HIGH_PRICE': result.sort((a, b) => b.price - a.price); break;
        case 'RATING': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
        default: // RELEVANCE
           result.sort((a, b) => ((b.rating || 0) * 10 + (b.views || 0) / 100) - ((a.rating || 0) * 10 + (a.views || 0) / 100));
    }

    setFilteredTrips(result);
  }, [currentAgency, q, categoryParam, tagsParam, travelerParam, durationParam, priceParam, sortParam, isResolvingAgency, trips]);

  const clearFilters = () => {
      setSearchParams({});
  };

  if (isResolvingAgency || loading && !initialTrips.length) {
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <TripCardSkeleton key={i} />)}
          </div>
      );
  }

  if (isAgencyNotFound) {
      return (
          <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Agência não encontrada</h2>
              <p className="text-gray-500 mb-6">O endereço que você tentou acessar não existe.</p>
              <Link to="/agencies" className="text-primary-600 font-bold hover:underline">Voltar para lista de agências</Link>
          </div>
      );
  }

  const headerImage = currentAgency?.heroBannerUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop";

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Hero Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[300px] flex items-center group mx-0 lg:mx-0">
         {/* Background Image */}
         <div className="absolute inset-0 z-0">
            <img 
                src={headerImage}
                alt="Background" 
                className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-110"
            />
            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent z-10"></div>
         </div>

         {/* Content */}
         <div className="relative z-20 w-full max-w-7xl mx-auto px-8 py-10 flex flex-col lg:flex-row justify-between items-center gap-8">
             <div className="flex-1