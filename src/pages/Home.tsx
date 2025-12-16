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

  // Hero Data - Removed, now in Layout

  // Grid Data
  const [gridTrips, setGridTrips] = useState<Trip[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [gridLoading, setGridLoading] = useState(true); // FIX: Start as true to show loading on initial mount

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Hero loading removed - now in Layout

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


  // Carousel logic removed - now in Layout

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

  // Hero slide logic removed - now in Layout

  return (
    <div className="pb-12">
      {/* GRID SECTION - Banner is now in Layout header */}
      <div className="w-full px-6 sm:px-6 lg:px-8 mt-10 md:mt-16">
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