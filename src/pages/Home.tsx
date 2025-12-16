import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TripCard, TripCardSkeleton } from '../components/TripCard';
import HeroSearch from '../components/HeroSearch';
import { NoImagePlaceholder } from '../components/NoImagePlaceholder';
import { MapPin, ArrowRight, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const HERO_PHRASES = [
  'O Brasil que você ainda não viu.',
  'Sua próxima aventura começa aqui.',
  'Conecte-se com a natureza.',
  'Experiências autênticas, memórias eternas.',
  'Descubra o extraordinário.',
  'Rotas secretas, emoções verdadeiras.',
  'Luxo discreto em cenários inesquecíveis.',
  'Para quem busca sentir, não só visitar.',
  'Histórias para contar, paisagens para lembrar.',
  'Viaje com curadoria, viva o inesquecível.',
  'Onde a natureza encontra a cultura.',
  'Momentos únicos, destinos inesquecíveis.',
  'Explore o Brasil com novos olhos.',
  'Cada viagem é uma nova história.',
  'Descubra lugares que tocam a alma.',
  'Experiências que transformam sua perspectiva.',
  'O melhor do Brasil em cada roteiro.',
  'Viagens que ficam para sempre na memória.',
  'Conecte-se com o que realmente importa.',
  'Seu próximo destino te espera.'
];

// Removed DEFAULT_HERO_IMG - using NoImagePlaceholder instead

const Home: React.FC = () => {
  const { searchTrips, agencies, loading: dataLoading, fetchTripImages } = useData();

  // Hero Data
  const [heroTrips, setHeroTrips] = useState<Trip[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroLoading, setHeroLoading] = useState(true);

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

  // Get featured trip for the highlighted card
  const featuredTrip = heroTrips.length > 0 ? heroTrips[currentSlide] : null;
  // Select random phrase on mount (changes on each refresh/F5)
  const [heroPhrase] = useState(() => {
    return HERO_PHRASES[Math.floor(Math.random() * HERO_PHRASES.length)];
  });

  return (
    <div className="pb-12">
      {/* HERO SHOWCASE */}
      <div className="relative h-[85vh] min-h-[600px] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          {featuredTrip && featuredTrip.images && featuredTrip.images.length > 0 && featuredTrip.images[0] ? (
            <img
              src={featuredTrip.images[0]}
              alt={featuredTrip.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-white/30 mb-4">SouNativo</div>
                <div className="text-white/50">Carregando viagens...</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Left: Inspiration + Search */}
            <div className="xl:col-span-7 text-left space-y-4 md:space-y-6">
              <div className="animate-[fadeInUp_0.8s_ease-out] space-y-3 md:space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.1] drop-shadow-2xl tracking-tight">
                  Descubra o Brasil
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-white/90 font-light leading-relaxed drop-shadow-lg animate-in fade-in duration-1000">
                  {heroPhrase}
                </p>
              </div>
              <div className="w-full animate-[fadeInUp_1.1s]">
                <HeroSearch />
              </div>
            </div>

            {/* Right: Glass Card Featured - Premium Design */}
            {featuredTrip && (
              <div className="xl:col-span-5 w-full xl:w-auto mt-8 xl:mt-0">
                <Link
                  to={`/viagem/${featuredTrip.slug || featuredTrip.id}`}
                  className="block backdrop-blur-xl bg-gradient-to-br from-white/20 via-white/15 to-white/10 border border-white/40 rounded-3xl p-7 md:p-9 text-white max-w-md mx-auto xl:ml-auto xl:mr-0 shadow-2xl shadow-black/50 relative overflow-hidden hover:scale-[1.02] hover:shadow-3xl hover:shadow-black/60 transition-all duration-300 cursor-pointer group"
                >
                  {/* Subtle gradient overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-900/10 via-transparent to-secondary-500/10 pointer-events-none rounded-3xl"></div>
                  
                  <div className="relative z-10 space-y-5">
                    {/* Badge - Premium */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm text-white px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] border border-white/30">
                        <span className="w-1.5 h-1.5 bg-secondary-300 rounded-full animate-pulse"></span>
                        Destaque da Semana
                      </span>
                    </div>

                    {/* Title - Elegant Typography */}
                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold leading-[1.2] text-white drop-shadow-lg group-hover:text-secondary-200 transition-colors">
                        {featuredTrip.title}
                      </h2>
                      <div className="h-px w-16 bg-gradient-to-r from-secondary-300 to-transparent group-hover:w-24 transition-all"></div>
                    </div>

                    {/* Description - Refined */}
                    <p className="text-white/85 text-sm md:text-base leading-relaxed line-clamp-2 font-light group-hover:text-white/95 transition-colors">
                      Uma experiência inesquecível em {featuredTrip.destination}. Curadoria premium para quem busca viver o extraordinário.
                    </p>

                    {/* Meta Info - Clean Icons */}
                    <div className="flex items-center gap-5 text-white/80 text-xs md:text-sm flex-wrap pt-1">
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 group-hover:bg-white/15 transition-colors">
                        <MapPin size={15} className="text-secondary-200" />
                        <span className="font-medium">{featuredTrip.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 group-hover:bg-white/15 transition-colors">
                        <Clock size={15} className="text-secondary-200" />
                        <span className="font-medium">{featuredTrip.durationDays} {featuredTrip.durationDays === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    </div>

                    {/* Price & CTA - Premium Layout */}
                    <div className="flex items-end justify-between gap-4 pt-3 border-t border-white/20">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-white/60 uppercase tracking-wider font-semibold mb-1">A partir de</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm text-white/70 font-semibold">R$</span>
                          <span className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg tracking-tight group-hover:text-secondary-200 transition-colors">{featuredTrip.price.toLocaleString('pt-BR')}</span>
                        </div>
                        <span className="text-[10px] text-white/50 mt-0.5">por pessoa</span>
                      </div>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 bg-white text-secondary-600 px-5 py-3 rounded-full font-bold hover:bg-white/95 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-black/40"
                      >
                        Explorar
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GRID SECTION - Below Featured Card */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-6 lg:px-8 mt-10 md:mt-16">
        {/* FILTERS */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1"><div className="flex items-center gap-2 text-gray-500"><Filter size={16} /><span className="text-xs font-bold uppercase tracking-wider">Filtrar por interesse</span></div></div>
          <div className="relative group/scroll bg-white/60 backdrop-blur-md border border-gray-100 shadow-sm rounded-xl py-3">
            {canScrollLeft && (<button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50"><ChevronLeft size={18} /></button>)}
            {canScrollRight && (<button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50"><ChevronRight size={18} /></button>)}
            <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center">
              {INTEREST_CHIPS.map(({ label, icon: Icon, id }) => {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">{[1, 2, 3].map((n) => <TripCardSkeleton key={n} />)}</div>
          ) : gridTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.5s] items-stretch">{gridTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}</div>
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