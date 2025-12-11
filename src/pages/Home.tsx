import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TripCard, TripCardSkeleton } from '../components/TripCard';
import HeroSearch from '../components/HeroSearch';
import { NoImagePlaceholder } from '../components/NoImagePlaceholder';
import { MapPin, ArrowRight, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock, MessageCircle, TrendingUp } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { Trip } from '../types';
import { logger } from '../utils/logger';

const INTEREST_CHIPS = [
  { label: 'Todos', icon: Globe, id: 'chip-all' },
  { label: 'Praia', icon: Umbrella, id: 'chip-praia' },
  { label: 'Aventura', icon: Mountain, id: 'chip-aventura' },
  { label: 'Natureza', icon: TreePine, id: 'chip-natureza' },
  { label: 'História', icon: Landmark, id: 'chip-historia' },
  { label: 'Gastronomia', icon: Utensils, id: 'chip-gastronomia' },
  { label: 'Romântico', icon: Heart, id: 'chip-romantico' },
  { label: 'Vida Noturna', icon: Moon, id: 'chip-vida-noturna' },
  { label: 'Cultura', icon: Drama, id: 'chip-cultura' },
  { label: 'Arte', icon: Palette, id: 'chip-arte' },
  { label: 'Viagem barata', icon: Wallet, id: 'chip-barata' },
];

// Removed DEFAULT_HERO_IMG - using NoImagePlaceholder instead

const Home: React.FC = () => {
  const { searchTrips, agencies, loading: dataLoading, fetchTripImages } = useData();
  const navigate = useNavigate();
  
  // Hero Data
  const [heroTrips, setHeroTrips] = useState<Trip[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

  // Featured Dock Trips (Top 4 by views or featured)
  const [featuredDockTrips, setFeaturedDockTrips] = useState<Trip[]>([]);
  const [dockLoading, setDockLoading] = useState(true);

  // Grid Data
  const [gridTrips, setGridTrips] = useState<Trip[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [gridLoading, setGridLoading] = useState(true); // FIX: Start as true to show loading on initial mount

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 1. Initial Load: Fetch Hero Trips (Random/Featured)
  useEffect(() => {
    // FIX: Wait for data to be loaded before searching
    if (dataLoading) {
      return; // Don't search while data is still loading
    }

    const loadHero = async () => {
        setHeroLoading(true);
        try {
            let tripsData: Trip[] = [];
            
            // Try to fetch a larger pool of featured trips
            const { data: featuredData } = await searchTrips({ limit: 20, featured: true, sort: 'DATE_ASC' });
            if (featuredData && featuredData.length > 0) {
                tripsData = featuredData;
            } else {
                // Fallback: If no featured trips, get general active trips
                const { data: generalData } = await searchTrips({ limit: 10, sort: 'DATE_ASC' });
                tripsData = generalData || [];
            }

            // Shuffle the results to randomize the hero
            if (tripsData.length > 0) {
                tripsData.sort(() => 0.5 - Math.random());
            }
            
            // FIX: Load images on-demand for each trip
            const tripsWithImages = await Promise.all(
                tripsData.map(async (trip) => {
                    if (!trip.images || trip.images.length === 0) {
                        const images = await fetchTripImages(trip.id);
                        return { ...trip, images };
                    }
                    return trip;
                })
            );
            
            setHeroTrips(tripsWithImages);
        } catch (error) {
            logger.error('Error loading hero trips:', error);
            setHeroTrips([]);
        } finally {
            setHeroLoading(false);
        }
    };
    loadHero();
  }, [searchTrips, dataLoading, fetchTripImages]);

  // 2. Load Featured Dock Trips (Top 4 by views or featured)
  useEffect(() => {
    // FIX: Wait for data to be loaded before searching
    if (dataLoading) {
      return; // Don't search while data is still loading
    }

    const loadFeaturedDock = async () => {
        setDockLoading(true);
        try {
            // First try to get featured trips sorted by views
            const { data: featuredData } = await searchTrips({ 
                limit: 10, 
                featured: true, 
                sort: 'RATING' // Will sort by rating, but we'll re-sort by views
            });
            
            let dockTrips: Trip[] = [];
            if (featuredData && featuredData.length > 0) {
                dockTrips = featuredData;
            } else {
                // Fallback: Get all trips and sort by views
                const { data: allData } = await searchTrips({ limit: 20, sort: 'RATING' });
                dockTrips = allData || [];
            }

            // Sort by views (descending) and take top 4
            dockTrips.sort((a, b) => (b.views || 0) - (a.views || 0));
            const top4Trips = dockTrips.slice(0, 4);
            
            // FIX: Load images on-demand for each trip
            const dockTripsWithImages = await Promise.all(
                top4Trips.map(async (trip) => {
                    if (!trip.images || trip.images.length === 0) {
                        const images = await fetchTripImages(trip.id);
                        return { ...trip, images };
                    }
                    return trip;
                })
            );
            
            setFeaturedDockTrips(dockTripsWithImages);
        } catch (error) {
            logger.error('Error loading featured dock trips:', error);
            setFeaturedDockTrips([]);
        } finally {
            setDockLoading(false);
        }
    };
    loadFeaturedDock();
  }, [searchTrips, dataLoading, fetchTripImages]);

  // 3. Fetch Grid Trips when Interest Changes
  useEffect(() => {
    // FIX: Wait for data to be loaded before searching
    if (dataLoading) {
      return; // Don't search while data is still loading
    }

    const loadGrid = async () => {
        setGridLoading(true);
        try {
            // If 'Todos' or empty, just fetch generic latest
            const category = selectedInterests.length > 0 && selectedInterests[0] !== 'Todos' 
                ? selectedInterests[0].toUpperCase().replace(' ', '_') // Simple mapping
                : undefined;

            // Map UI labels to API enum if needed, or rely on fuzzy search
            const { data } = await searchTrips({ 
                limit: 20, // Fetch more to allow for random shuffling
                // If mapping fails, the search might return empty, so ideally we map correctly or use tags
                // For now, simpler implementation:
                category: category === 'VIAGEM_BARATA' ? 'VIAGEM_BARATA' : undefined,
                // Fallback for tags if category not strict
                query: !category ? undefined : undefined 
            });

            if (data && data.length > 0) {
                // Shuffle the results for the grid as well
                const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 9);
                
                // FIX: Load images on-demand for each trip
                const gridTripsWithImages = await Promise.all(
                    shuffled.map(async (trip) => {
                        if (!trip.images || trip.images.length === 0) {
                            const images = await fetchTripImages(trip.id);
                            return { ...trip, images };
                        }
                        return trip;
                    })
                );
                
                setGridTrips(gridTripsWithImages);
            } else {
                // If no data, set empty array
                setGridTrips([]);
            }
        } catch (error) {
            logger.error('Error loading grid trips:', error);
            setGridTrips([]);
        } finally {
            setGridLoading(false);
        }
    };
    
    // FIX: Ensure loadGrid runs on mount and when dependencies change
    loadGrid();
  }, [selectedInterests, searchTrips, dataLoading, fetchTripImages]);


  // Carousel Logic
  useEffect(() => {
    if (!heroTrips.length) return;
    const id = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroTrips.length);
    }, 8000);
    return () => clearInterval(id);
  }, [heroTrips.length]);

  const currentHeroTrip = heroTrips[currentSlide];
  
  // Find Agency for WhatsApp (Assumes Agencies are small list or we fetch on demand)
  // For optimization, we are checking the pre-loaded agencies from context or could fetch
  const currentHeroAgency = useMemo(() => {
    return currentHeroTrip ? agencies.find(a => a.agencyId === currentHeroTrip.agencyId) : undefined;
  }, [currentHeroTrip, agencies]);

  const heroWhatsAppLink = (currentHeroAgency?.whatsapp && currentHeroTrip) 
      ? buildWhatsAppLink(currentHeroAgency.whatsapp, currentHeroTrip) 
      : null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleInterestClick = (label: string, id: string, e: React.MouseEvent<HTMLButtonElement>) => {
     if (label === 'Todos') {
         setSelectedInterests([]);
     } else {
         // Single select for this implementation to keep server query simple
         setSelectedInterests([label]);
     }
     e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };


  const clearFilters = () => {
    setSelectedInterests([]);
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % heroTrips.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + heroTrips.length) % heroTrips.length);

  return (
    <div className="space-y-12 pb-12">
      {/* HERO SECTION - IMERSIVA */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[600px] md:min-h-[700px] flex flex-col group bg-gray-900">
        
        {/* Background Images Carousel */}
        {heroTrips.length > 0 ? (
            heroTrips.map((trip, index) => {
                // FIX: Rigorously check if trip has valid images before using fallback
                const hasValidImages = trip.images && Array.isArray(trip.images) && trip.images.length > 0 && trip.images[0];
                const displayImage = hasValidImages ? trip.images[0] : null;
                
                return (
                    <div 
                        key={trip.id} 
                        className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                        {hasValidImages ? (
                            <img 
                                key={`hero-img-${trip.id}-${index}`}
                                src={trip.images[0]}
                                alt={trip.title} 
                                className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${index === currentSlide ? 'scale-110' : 'scale-100'} blur-[2px]`}
                                onError={(e) => { 
                                    // Hide image on error, placeholder will show
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : null}
                        {/* Show placeholder only if no valid image */}
                        {!hasValidImages && (
                            <div className="w-full h-full">
                                <NoImagePlaceholder 
                                    title={trip.title}
                                    category={trip.category}
                                    size="large"
                                    className="w-full h-full"
                                />
                            </div>
                        )}
                    </div>
                );
            })
        ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 via-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl font-bold text-gray-300 mb-4">ViajaStore</div>
                    <div className="text-gray-400">Carregando viagens...</div>
                </div>
            </div>
        )}

        {/* Enhanced Gradient Overlay - Stronger at bottom for dock readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/90 z-20 pointer-events-none"></div>
        
        {/* Main Content - Centered */}
        <div className="relative z-30 w-full max-w-[1600px] mx-auto px-6 md:px-12 flex-1 flex flex-col justify-center py-12 md:py-20">
          {/* Centered Typography */}
          <div className="text-center mb-10 animate-[fadeInUp_0.8s_ease-out]">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-2xl">
              Descubra o Brasil
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg">
              As melhores experiências de viagem você encontra aqui
            </p>
          </div>

          {/* Hero Search Bar - FIX: High z-index to ensure dropdowns appear above cards */}
          <div className="max-w-5xl mx-auto w-full animate-[fadeInUp_1.1s] relative z-[100]">
            <HeroSearch />
          </div>
        </div>

        {/* Featured Dock - Bottom Overlap - FIX: Lower z-index than search bar */}
        <div className="relative z-[20] w-full max-w-[1600px] mx-auto px-6 md:px-12 pb-6">
          {dockLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl animate-pulse">
                  <div className="w-full h-24 bg-gray-200 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : featuredDockTrips.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredDockTrips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/viagem/${trip.slug || trip.id}`}
                  className="group/dock bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-xl hover:bg-white hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <div className="relative w-full h-24 rounded-xl overflow-hidden mb-3">
                    {(trip.images && Array.isArray(trip.images) && trip.images.length > 0 && trip.images[0]) ? (
                      <img
                        key={`dock-img-${trip.id}`}
                        src={trip.images[0]}
                        alt={trip.title}
                        className="w-full h-full object-cover group-hover/dock:scale-110 transition-transform duration-500"
                        onError={(e) => { 
                            // Hide image on error, placeholder will show
                            e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <NoImagePlaceholder 
                        title={trip.title}
                        category={trip.category}
                        size="small"
                        className="w-full h-full"
                      />
                    )}
                    {(trip.featured || (trip.views || 0) > 100) && (
                      <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-lg">
                        <TrendingUp size={10} />
                        {trip.featured ? 'Em Alta' : 'Oferta'}
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-2 group-hover/dock:text-primary-600 transition-colors">
                    {trip.title}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-500 font-semibold">R$</span>
                    <span className="text-xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {/* Carousel Navigation */}
        {heroTrips.length > 1 && (
          <>
            <button 
              onClick={prevSlide} 
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-30 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              <ChevronLeft size={32}/>
            </button>
            <button 
              onClick={nextSlide} 
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-30 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              <ChevronRight size={32}/>
            </button>
          </>
        )}
      </div>

      {/* FILTERS & GRID */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
           <div className="flex items-center justify-between mb-3 px-1"><div className="flex items-center gap-2 text-gray-500"><Filter size={16} /><span className="text-xs font-bold uppercase tracking-wider">Filtrar por interesse</span></div></div>
           <div className="relative group/scroll bg-white/60 backdrop-blur-md border border-gray-100 shadow-sm rounded-xl py-3">
             {canScrollLeft && (<button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50"><ChevronLeft size={18} /></button>)}
             {canScrollRight && (<button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50"><ChevronRight size={18} /></button>)}
             <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center">
                {INTEREST_CHIPS.map(({label, icon: Icon, id}) => {
                   const isActive = selectedInterests.includes(label);
                   return (
                     <button key={label} id={id} onClick={(e) => handleInterestClick(label, id, e)} className={`snap-center flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border select-none ${isActive ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Icon size={14} fill={isActive ? "currentColor" : "none"} /> {label}
                     </button>
                   );
                })}
             </div>
           </div>
        </div>

        <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 px-1 gap-4">
              <div className="animate-[fadeIn_0.3s]">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedInterests.length === 0 ? 'Pacotes em Destaque' : `Explorando: ${selectedInterests.join(', ')}`}
                    {!gridLoading && <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{gridTrips.length}</span>}
                  </h2>
              </div>
              {selectedInterests.length > 0 && (<button onClick={clearFilters} className="text-sm text-red-500 font-bold hover:underline bg-red-50 px-3 py-1 rounded-lg">Limpar Filtros</button>)}
            </div>
            
            {gridLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">{[1, 2, 3].map((n) => <TripCardSkeleton key={n} />)}</div>
            ) : gridTrips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.5s]">{gridTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}</div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200 shadow-sm">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Search className="text-gray-300" size={32} /></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma viagem encontrada</h3>
                  <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline hover:text-primary-700 transition-colors">Limpar todos os filtros</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Home;