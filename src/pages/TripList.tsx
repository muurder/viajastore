import React, { useState, useEffect, useMemo, useCallback } from 'react';
// Fix: Add useData import
import { useData } from '../context/DataContext';
import { TripCard, TripCardSkeleton } from '../components/TripCard';
import TripListItem from '../components/TripListItem';
import TripMap from '../components/TripMap';
import HeroSearch from '../components/HeroSearch';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Filter, X, ArrowUpDown, Search, ChevronDown, ChevronUp, ArrowLeft, Loader, MapPin, Grid3x3, List, Map, Globe } from 'lucide-react';
import { debounce } from '../utils/debounce';

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Deterministic shuffle using seed (Fisher-Yates with seeded random)
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  // Simple seeded random number generator
  let currentSeed = seed;
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate a stable seed based on current day (for shuffle when no filters)
// This ensures the same order is maintained throughout the same day
const getDayBasedSeed = (): number => {
  const today = new Date();
  const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return Math.abs(daySeed);
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
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // FIX: Corrected typo 'true' to 'price' in initial state of openFilterSections
  const [openFilterSections, setOpenFilterSections] = useState<Record<string, boolean>>({
     traveler: true, style: true, duration: true, price: true, dest: true
  });
  
  // View mode: 'grid' | 'list' | 'map'
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [highlightedTripId, setHighlightedTripId] = useState<string | null>(null);
  
  // Search params from AdvancedSearchBar
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const adultsParam = searchParams.get('adults');
  const childrenParam = searchParams.get('children');

  // Extract URL Params
  const q = searchParams.get('q') || '';
  const tagsParam = searchParams.get('tags'); // comma separated
  const travelerParam = searchParams.get('traveler'); // comma separated
  const durationParam = searchParams.get('duration'); // '1-3', '4-7' etc
  const priceParam = searchParams.get('price'); // '0-500', '500-1000' etc
  const categoryParam = searchParams.get('category');
  const sortParam = searchParams.get('sort') || 'RELEVANCE';

  // Local state for search input with debounce
  const [searchInput, setSearchInput] = useState(q);

  // Update local state when URL param changes (e.g., from back button)
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  // Debounced update function
  const debouncedUpdateUrl = useMemo(
    () => debounce((value: string) => {
      updateUrl('q', value || null);
    }, 400),
    []
  );

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedUpdateUrl(value);
  }, [debouncedUpdateUrl]);

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

  // Memoize source trips to avoid recalculation
  const sourceTrips = useMemo(() => {
    if (isResolvingAgency) return [];
    return currentAgency ? getAgencyPublicTrips(currentAgency.agencyId) : trips;
  }, [currentAgency, trips, isResolvingAgency, getAgencyPublicTrips]);

  // Optimized filter logic with useMemo
  const filteredTrips = useMemo(() => {
    if (isResolvingAgency || sourceTrips.length === 0) return [];
    
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

    // 7. Date Range Filtering (from AdvancedSearchBar)
    if (startDateParam || endDateParam) {
        const searchStart = startDateParam ? new Date(startDateParam) : null;
        const searchEnd = endDateParam ? new Date(endDateParam) : null;
        
        result = result.filter(t => {
            const tripStart = new Date(t.startDate);
            const tripEnd = new Date(t.endDate);
            
            // Trip overlaps with search range if:
            // - Trip starts before search ends AND trip ends after search starts
            if (searchStart && searchEnd) {
                return tripStart <= searchEnd && tripEnd >= searchStart;
            }
            // If only start date provided, show trips that start on or after that date
            if (searchStart && !searchEnd) {
                return tripStart >= searchStart;
            }
            // If only end date provided, show trips that end on or before that date
            if (!searchStart && searchEnd) {
                return tripEnd <= searchEnd;
            }
            return true;
        });
    }

    // 8. Guest Filtering (from AdvancedSearchBar)
    if (childrenParam && parseInt(childrenParam) > 0) {
        // If children are included, filter trips that allow children
        result = result.filter(t => t.allowChildren !== false);
    }
    
    if (adultsParam || childrenParam) {
        const totalGuests = (adultsParam ? parseInt(adultsParam) : 0) + (childrenParam ? parseInt(childrenParam) : 0);
        if (totalGuests > 0) {
            result = result.filter(t => {
                // If trip has maxGuests defined, check if it can accommodate
                if (t.maxGuests !== undefined) {
                    return t.maxGuests >= totalGuests;
                }
                // If no maxGuests defined, allow the trip (assume it can accommodate)
                return true;
            });
        }
    }

    // Sorting
    switch (sortParam) {
        case 'LOW_PRICE': result.sort((a, b) => a.price - b.price); break;
        case 'HIGH_PRICE': result.sort((a, b) => b.price - a.price); break;
        case 'RATING': result.sort((a, b) => (b.tripRating || 0) - (a.tripRating || 0)); break;
        case 'DATE_ASC': result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); break;
        default: // RELEVANCE
           // Only shuffle when no filters are applied AND no search params exist
           // Use stable seed based on current day to ensure consistent ordering within the same day
           if (!q && !categoryParam && selectedTags.length === 0 && selectedTravelerTypes.length === 0 && 
               !durationParam && !priceParam && !startDateParam && !endDateParam && !adultsParam && !childrenParam) {
               // Use deterministic shuffle with day-based seed (changes once per day, stable within same day)
               const today = new Date();
               const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
               const stableSeed = Math.abs(daySeed);
               result = seededShuffle(result, stableSeed);
           } else {
               // When filters are applied, use relevance sorting (stable, not random)
               result.sort((a, b) => ((b.tripRating || 0) * 10 + (b.views || 0) / 100) - ((a.tripRating || 0) * 10 + (a.views || 0) / 100));
           }
    }

    return result;
  }, [sourceTrips, q, categoryParam, selectedTags, selectedTravelerTypes, durationParam, priceParam, sortParam, isResolvingAgency, startDateParam, endDateParam, adultsParam, childrenParam]);

  const clearFilters = () => {
      setSearchParams({});
  };

  if (isResolvingAgency || loading && !initialTrips.length) {
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
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
      {/* Premium Hero Section - Imersivo como Home */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[500px] md:min-h-[600px] flex flex-col items-center justify-center group bg-gray-900 z-[30]">
         {/* Background Image */}
         <div className="absolute inset-0 z-0">
            {headerImage ? (
                <img 
                    src={headerImage}
                    alt="Background" 
                    className="w-full h-full object-cover transition-transform duration-[10s] ease-linear scale-110 group-hover:scale-115 blur-[2px]"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100"></div>
            )}
            {/* Enhanced Gradient Overlay - Similar to Home */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/90 z-[1]"></div>
         </div>

         {/* Main Content - Centered like Home */}
         <div className="relative z-30 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex-1 flex flex-col justify-center py-12 md:py-20">
            {/* Centered Typography */}
            <div className="text-center mb-8 md:mb-10 animate-[fadeInUp_0.8s_ease-out]">
                {currentAgency && (
                    <Link 
                        to={`/${currentAgency.slug}`} 
                        className="inline-flex items-center text-gray-200 hover:text-white text-sm mb-6 transition-colors font-medium backdrop-blur-sm bg-white/10 px-4 py-2 rounded-full border border-white/20 hover:bg-white/20"
                    >
                        <ArrowLeft size={14} className="mr-2"/> Voltar para {currentAgency.name}
                    </Link>
                )}
                
                {currentAgency?.logo && (
                    <div className="mb-6 flex justify-center">
                        <img 
                            src={currentAgency.logo} 
                            alt={currentAgency.name} 
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/30 shadow-2xl object-cover"
                        />
                    </div>
                )}
                
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-2xl">
                    {currentAgency ? `Pacotes: ${currentAgency.name}` : "Encontre sua próxima viagem"}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg">
                    {currentAgency ? "Explore roteiros exclusivos selecionados para você." : "Centenas de destinos incríveis com as melhores tarifas do mercado."}
                </p>
            </div>

            {/* Hero Search Bar - Centered (from main page) */}
            <div className="max-w-5xl mx-auto w-full animate-[fadeInUp_1.1s] relative z-[100]">
                <HeroSearch
                  initialDestination={q}
                  initialDateRange={{
                    start: startDateParam ? new Date(startDateParam) : null,
                    end: endDateParam ? new Date(endDateParam) : null,
                  }}
                  initialGuests={{
                    adults: adultsParam ? parseInt(adultsParam) : 1,
                    children: childrenParam ? parseInt(childrenParam) : 0,
                  }}
                  onSearch={(params) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (params.destination) newParams.set('q', params.destination);
                    else newParams.delete('q');
                    if (params.dateRange.start) newParams.set('startDate', params.dateRange.start.toISOString().split('T')[0]);
                    else newParams.delete('startDate');
                    if (params.dateRange.end) newParams.set('endDate', params.dateRange.end.toISOString().split('T')[0]);
                    else newParams.delete('endDate');
                    if (params.guests.adults > 0) newParams.set('adults', params.guests.adults.toString());
                    else newParams.delete('adults');
                    if (params.guests.children > 0) newParams.set('children', params.guests.children.toString());
                    else newParams.delete('children');
                    setSearchParams(newParams);
                  }}
                />
            </div>
         </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 px-2">
        {/* Sidebar Filters */}
        <aside className={`
          md:w-72 flex-shrink-0 bg-white md:bg-transparent p-6 md:p-0 
          fixed md:static inset-0 z-40 overflow-y-auto transition-transform duration-300 scrollbar-hide
          ${showMobileFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block h-full
        `}>
          <div className="flex justify-between items-center md:hidden mb-4">
            <h2 className="text-xl font-bold">Filtros</h2>
            <button onClick={() => setShowMobileFilters(false)}><X /></button>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-24">
             
             {/* A - Traveler Type */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('traveler')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                    <span>Tipo de Viajante</span>
                    {openFilterSections['traveler'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['traveler'] && (
                    <div className="space-y-2">
                        {travelerOptions.map(type => (
                            <label key={type.id} className="flex items-center cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all ${selectedTravelerTypes.includes(type.id) ? 'bg-primary-600 border-primary-600' : 'border-gray-300 group-hover:border-primary-400 bg-white'}`}>
                                    {selectedTravelerTypes.includes(type.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={selectedTravelerTypes.includes(type.id)} 
                                  onChange={() => toggleSelection('traveler', selectedTravelerTypes, type.id)} 
                                />
                                <span className={`text-sm ${selectedTravelerTypes.includes(type.id) ? 'text-primary-700 font-bold' : 'text-gray-600'}`}>{type.label}</span>
                            </label>
                        ))}
                    </div>
                )}
             </div>

             {/* B - Style / Tags */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('style')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                    <span>Estilo de Viagem</span>
                    {openFilterSections['style'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['style'] && (
                    <div className="flex flex-wrap gap-2">
                        {styleOptions.map(tag => (
                            <button 
                              key={tag}
                              onClick={() => toggleSelection('tags', selectedTags, tag)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedTags.includes(tag) ? 'bg-primary-50 text-primary-700 border-primary-200 font-bold' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
             </div>

             {/* C - Duration */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('duration')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                    <span>Duração</span>
                    {openFilterSections['duration'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['duration'] && (
                    <div className="space-y-2">
                        {durationOptions.map(opt => (
                            <div 
                                key={opt.id} 
                                onClick={() => {
                                    // Toggle: if already selected, deselect; otherwise select
                                    updateUrl('duration', durationParam === opt.id ? null : opt.id);
                                }}
                                className="flex items-center cursor-pointer group"
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all ${durationParam === opt.id ? 'bg-primary-600 border-primary-600' : 'border-gray-300 group-hover:border-primary-400 bg-white'}`}>
                                    {durationParam === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className={`text-sm ${durationParam === opt.id ? 'text-primary-700 font-bold' : 'text-gray-600'}`}>{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* D - Price */}
             <div className="border-b border-gray-100 pb-4">
                <button onClick={() => toggleAccordion('price')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                    <span>Faixa de Preço</span>
                    {openFilterSections['price'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {openFilterSections['price'] && (
                    <div className="space-y-2">
                        {priceOptions.map(opt => (
                            <div 
                                key={opt.id} 
                                onClick={() => {
                                    // Toggle: if already selected, deselect; otherwise select
                                    updateUrl('price', priceParam === opt.id ? null : opt.id);
                                }}
                                className="flex items-center cursor-pointer group"
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all ${priceParam === opt.id ? 'bg-primary-600 border-primary-600' : 'border-gray-300 group-hover:border-primary-400 bg-white'}`}>
                                    {priceParam === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <span className={`text-sm ${priceParam === opt.id ? 'text-primary-700 font-bold' : 'text-gray-600'}`}>{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* E - Popular Destinations (Only show if not in agency microsite mode) */}
             {!agencySlug && (
                <div>
                   <button onClick={() => toggleAccordion('dest')} className="w-full flex justify-between items-center font-bold text-gray-900 mb-3 hover:text-primary-600 transition-colors">
                       <span>Destinos Populares</span>
                       {openFilterSections['dest'] ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                   </button>
                   {openFilterSections['dest'] && (
                       <div className="flex flex-wrap gap-2">
                           {popularDestinations.map(dest => (
                               <button 
                                 key={dest}
                                 onClick={() => {
                                   // Toggle: if already selected, deselect; otherwise select
                                   updateUrl('q', q === dest ? null : dest);
                                 }}
                                 className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${q === dest ? 'bg-primary-50 text-primary-700 border-primary-200 font-bold' : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'}`}
                               >
                                   {dest}
                               </button>
                           ))}
                       </div>
                   )}
                </div>
             )}

             {/* Clear Filters Button */}
             {(q || tagsParam || travelerParam || durationParam || priceParam || categoryParam) && (
                <div className="pt-6 border-t border-gray-100">
                    <button onClick={clearFilters} className="w-full text-red-600 font-bold hover:underline py-2.5 bg-red-50 rounded-xl flex items-center justify-center gap-2">
                        <X size={16}/> Limpar Todos os Filtros
                    </button>
                </div>
             )}
          </div>
        </aside>

        {/* Mobile Filter Toggle */}
        <button 
          onClick={() => setShowMobileFilters(true)} 
          className="md:hidden fixed bottom-24 right-4 z-[60] bg-primary-600 text-white p-4 rounded-full shadow-lg flex items-center gap-2 font-bold hover:bg-primary-700 transition-all active:scale-95 animate-[scaleIn_0.5s]"
        >
            <Filter size={20}/> Filtros
        </button>

        {/* Trip Cards/List/Map */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {currentAgency ? `Pacotes de ${currentAgency.name}` : 'Todas as Viagens'} ({filteredTrips.length})
            </h2>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Visualização em grade"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Visualização em lista"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'map' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Visualização no mapa"
                >
                  <Map size={18} />
                </button>
              </div>
              
              <select 
                value={sortParam} 
                onChange={(e) => updateUrl('sort', e.target.value)} 
                className="bg-white border border-gray-200 rounded-lg text-sm p-2.5 outline-none focus:ring-primary-500 focus:border-primary-500 cursor-pointer font-medium text-gray-700"
              >
                <option value="RELEVANCE">Relevância</option>
                <option value="DATE_ASC">Próximas Saídas</option>
                <option value="LOW_PRICE">Menor Preço</option>
                <option value="HIGH_PRICE">Maior Preço</option>
                <option value="RATING">Melhor Avaliação</option>
              </select>
            </div>
          </div>

          {filteredTrips.length > 0 ? (
            <>
              {viewMode === 'map' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                  {/* List on left, Map on right */}
                  <div className="overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                    {filteredTrips.map(trip => (
                      <TripListItem
                        key={trip.id}
                        trip={trip}
                        onHover={setHighlightedTripId}
                        highlighted={trip.id === highlightedTripId}
                        adults={adultsParam ? parseInt(adultsParam) : 1}
                      />
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <TripMap
                      trips={filteredTrips}
                      highlightedTripId={highlightedTripId}
                      onMarkerClick={setHighlightedTripId}
                    />
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                <div className="space-y-4 animate-[fadeInUp_0.5s]">
                  {filteredTrips.map(trip => (
                    <TripListItem
                      key={trip.id}
                      trip={trip}
                      adults={adultsParam ? parseInt(adultsParam) : 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 animate-[fadeInUp_0.5s]">
                  {filteredTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="text-gray-300" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma viagem encontrada</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Não encontramos resultados para sua busca. Tente ajustar os filtros ou buscar por termos mais genéricos.</p>
                <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline hover:text-primary-700 transition-colors">
                  Limpar todos os filtros
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Voltar para ViajaStore - Prominent button for agency microsite context */}
      {currentAgency && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col items-center justify-center gap-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 px-6 py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 hover:text-primary-800 font-bold rounded-xl transition-all shadow-sm hover:shadow-md border border-primary-200 text-sm uppercase tracking-wider"
            >
              <Globe size={16} className="text-primary-600" />
              Voltar para ViajaStore
            </Link>
            <p className="text-xs text-gray-500 text-center max-w-md">
              Explore mais destinos e experiências incríveis no marketplace ViajaStore
            </p>
          </div>
        </div>
      )}
    </div>
  );
};