
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import TripCard, { TripCardSkeleton } from '../components/TripCard';
import { MapPin, ArrowRight, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

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

const DEFAULT_HERO_IMG = "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop";

const normalizeText = (text: string) => {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const Home: React.FC = () => {
  const { getPublicTrips, agencies, loading } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const allTrips = getPublicTrips();
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 5);

  // --- HERO LOGIC (INDEPENDENT) ---
  // Select a random sample of up to 5 trips from the entire catalog for the Hero
  const heroTrips = useMemo(() => 
    allTrips.length > 0 ? allTrips.sort(() => 0.5 - Math.random()).slice(0, 5) : [], 
  [allTrips]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<number | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (heroTrips.length > 1) {
      timerRef.current = window.setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % heroTrips.length);
      }, 7000);
    }
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroTrips.length]);
  
  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % heroTrips.length);
    resetTimer();
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + heroTrips.length) % heroTrips.length);
    resetTimer();
  };

  const currentHeroTrip = heroTrips[currentSlide];
  // --- END HERO LOGIC ---

  // --- GRID LOGIC (INDEPENDENT) ---
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

  const toggleInterest = (label: string, elementId: string) => {
     if (label === 'Todos') {
         setSelectedInterests([]);
     } else {
         setSelectedInterests(prev => {
             if (prev.includes(label)) {
                 return prev.filter(i => i !== label);
             } else {
                 return [...prev, label];
             }
         });
     }
  };

  // Explicitly separate the grid trips logic from the hero logic
  const featuredGridTrips = useMemo(() => {
    if (selectedInterests.length === 0) {
        // Default View: Sort by Rating or Sales, ensuring high quality first
        return [...allTrips].sort((a, b) => b.rating - a.rating).slice(0, 9);
    }

    // Filtered View
    return allTrips.filter(t => {
        return selectedInterests.some(interest => {
            const cleanInterest = normalizeText(interest);
            const cleanCategory = normalizeText(t.category);
            
            if (cleanCategory === cleanInterest) return true;
            if (cleanCategory === cleanInterest.replace(/\s/g, '_')) return true; 
            if (cleanInterest === 'gastronomia' && cleanCategory === 'gastronomico') return true;

            return t.tags.some(tag => {
                const cleanTag = normalizeText(tag);
                return cleanTag.includes(cleanInterest) || cleanInterest.includes(cleanTag);
            });
        });
    }).slice(0, 9);
  }, [allTrips, selectedInterests]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] md:min-h-[550px] flex items-center group bg-gray-900 transition-all duration-500">
        
        {/* DYNAMIC BACKGROUND LAYER (Z-0) */}
        {heroTrips.length > 0 ? (
            heroTrips.map((trip, index) => (
                <div 
                    key={trip.id} 
                    className={`absolute inset-0 transition-all duration-[1500ms] ease-out ${
                        index === currentSlide 
                            ? 'opacity-100 scale-100' 
                            : 'opacity-0 scale-110' // Slight zoom effect ("Ken Burns") for smoother feel
                    }`}
                >
                    <img 
                        src={trip.images?.[0] || DEFAULT_HERO_IMG}
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = DEFAULT_HERO_IMG; }}
                    />
                </div>
            ))
        ) : (
            // Fallback Background
            <div className="absolute inset-0">
                <img 
                    src={DEFAULT_HERO_IMG}
                    alt="Hero background" 
                    className="w-full h-full object-cover"
                />
            </div>
        )}

        {/* STATIC OVERLAY LAYER (Z-10) */}
        {/* Constant gradient to ensure text readability regardless of image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent/20 z-10 pointer-events-none"></div>
        
        {/* CONTENT LAYER (Z-20) */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Text and Search */}
            <div className="text-center lg:text-left">
              
              {/* Animated Text Container: Re-mounts when currentSlide changes to trigger animation */}
              <div key={currentHeroTrip?.id || 'static-hero-text'} className="animate-[fadeInUp_0.8s_ease-out]">
                  <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
                    {currentHeroTrip ? (
                        <>
                            Explore <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-white">
                                {currentHeroTrip.title.split(':')[0] || 'Novos Destinos'}
                            </span>
                        </>
                    ) : (
                        <>Encontre sua<br/>próxima viagem.</>
                    )}
                  </h1>
                  <p className="text-lg text-gray-200 mb-8 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed">
                    {currentHeroTrip 
                        ? (currentHeroTrip.description.substring(0, 100) + "...") 
                        : "Compare pacotes das melhores agências e compre com segurança."
                    }
                  </p>
              </div>

              {/* Static Search Bar (Doesn't re-animate on slide change to avoid annoying user) */}
              <div className="animate-[fadeInUp_1.1s]">
                <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl mx-auto lg:mx-0">
                  <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all">
                    <MapPin className="text-primary-500 mr-3" />
                    <input 
                      type="text" 
                      placeholder="Para onde você quer ir?" 
                      className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-400 font-medium"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95 flex items-center justify-center">
                    <Search size={20} className="mr-2 md:hidden" /> Buscar
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: Featured Trip Carousel */}
            <div className="hidden lg:flex justify-center items-center h-full relative">
              {loading ? (
                 <div className="w-full max-w-sm h-80 bg-black/20 backdrop-blur-md border border-dashed border-white/20 rounded-2xl shadow-lg animate-pulse"></div>
              ) : currentHeroTrip ? (
                /* The KEY prop here ensures the card re-renders with animation when the trip changes */
                <Link 
                  to={`/viagem/${currentHeroTrip.slug || currentHeroTrip.id}`} 
                  key={currentHeroTrip.id} 
                  className="block w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl hover:bg-white/20 hover:border-white/40 hover:scale-[1.02] transition-all duration-500 animate-[fadeIn_0.8s_ease-out] group/card"
                  aria-live="polite"
                >
                    <div className="relative h-56 w-full rounded-2xl overflow-hidden mb-5 shadow-lg">
                        <img src={currentHeroTrip.images[0]} alt={currentHeroTrip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                            {currentHeroTrip.category.replace('_', ' ')}
                        </div>
                    </div>
                    <h3 className="font-bold text-white text-2xl leading-tight line-clamp-2 min-h-[4rem] mb-3 drop-shadow-md">
                        {currentHeroTrip.title}
                    </h3>
                    
                    <div className="flex items-center text-sm text-gray-200 mb-6 bg-black/20 p-2 rounded-lg w-fit">
                        <MapPin size={16} className="mr-1.5 text-primary-300" />
                        <span className="truncate max-w-[150px] font-medium">{currentHeroTrip.destination}</span>
                        <span className="mx-2 opacity-30">|</span>
                        <Clock size={16} className="mr-1.5 text-primary-300" />
                        <span className="font-medium">{currentHeroTrip.durationDays} dias</span>
                    </div>

                    <div className="pt-5 border-t border-white/10 flex justify-between items-end">
                        <div className="flex flex-col">
                            <p className="text-[10px] uppercase font-bold text-gray-300 mb-1 tracking-wider">A partir de</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-semibold text-primary-300">R$</span>
                                <p className="text-3xl font-extrabold text-white">{currentHeroTrip.price.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-white text-primary-600 rounded-full flex items-center justify-center group-hover/card:bg-primary-500 group-hover/card:text-white transition-all shadow-lg">
                            <ArrowRight size={20} className="-rotate-45 group-hover/card:rotate-0 transition-transform duration-300" />
                        </div>
                    </div>
                </Link>
              ) : (
                 <div className="w-full max-w-sm text-center bg-black/20 backdrop-blur-md border border-dashed border-white/20 rounded-2xl p-8 shadow-lg">
                    <p className="text-white font-medium">Nenhum pacote em destaque no momento.</p>
                 </div>
              )}

              {heroTrips.length > 1 && (
                <>
                  <button onClick={prevSlide} aria-label="Anterior" className="absolute -left-16 top-1/2 -translate-y-1/2 z-20 text-white/30 hover:text-white hover:scale-110 transition-all p-3 rounded-full hover:bg-white/10"><ChevronLeft size={48}/></button>
                  <button onClick={nextSlide} aria-label="Próximo" className="absolute -right-16 top-1/2 -translate-y-1/2 z-20 text-white/30 hover:text-white hover:scale-110 transition-all p-3 rounded-full hover:bg-white/10"><ChevronRight size={48}/></button>
                  
                  {/* Progress Indicators */}
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                      {heroTrips.map((_, idx) => (
                          <button 
                            key={idx} 
                            aria-label={`Ir para o slide ${idx + 1}`} 
                            onClick={() => { setCurrentSlide(idx); resetTimer(); }} 
                            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${idx === currentSlide ? 'bg-white w-12 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/20 w-2 hover:bg-white/40'}`} 
                          />
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS & GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
           <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-gray-400">
                 <Filter size={14} />
                 <span className="text-xs font-bold uppercase tracking-wider">Filtrar por interesse</span>
              </div>
           </div>
           
           <div className="relative group/scroll">
             {canScrollLeft && (
               <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md hidden md:flex hover:bg-white text-gray-700"><ChevronLeft size={18} /></button>
             )}
             <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
             <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>
             {canScrollRight && (
               <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md hidden md:flex hover:bg-white text-gray-700"><ChevronRight size={18} /></button>
             )}
             
             <div ref={scrollRef} onScroll={checkScroll} className="flex gap-2 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center">
                {INTEREST_CHIPS.map(({label, icon: Icon, id}) => {
                   const isAll = label === 'Todos';
                   const isActive = isAll ? selectedInterests.length === 0 : selectedInterests.includes(label);
                   
                   return (
                     <button
                        key={label}
                        id={id}
                        onClick={() => toggleInterest(label, id)}
                        className={`snap-start flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border select-none ${isActive ? 'bg-gray-900 text-white border-gray-900 shadow-lg transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
                     >
                        <Icon size={14} /> {label}
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
                    {!loading && <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{featuredGridTrips.length}</span>}
                  </h2>
              </div>
              {selectedInterests.length > 0 && (
                  <button onClick={() => setSelectedInterests([])} className="text-sm text-red-500 font-bold hover:underline bg-red-50 px-3 py-1 rounded-lg">
                      Limpar Filtros
                  </button>
              )}
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => <TripCardSkeleton key={n} />)}
                </div>
            ) : featuredGridTrips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.5s]">
                    {featuredGridTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                    <Search className="text-gray-400 mx-auto mb-4" size={32}/>
                    <p className="text-gray-500 text-lg font-medium">Nenhuma viagem encontrada para os filtros selecionados.</p>
                    <button onClick={() => setSelectedInterests([])} className="text-primary-600 font-bold mt-2 hover:underline">Limpar filtros</button>
                </div>
            )}
        </div>
      </div>
      
      {/* Featured Agencies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Agências Verificadas</h2>
            <Link to="/agencies" className="text-sm font-bold text-gray-500 hover:text-primary-600 flex items-center">Ver todas <ArrowRight size={14} className="ml-1"/></Link>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeAgencies.map(agency => (
                <Link key={agency.id} to={`/${agency.slug || agency.id}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center group">
                    <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full mb-4 object-cover border-2 border-gray-100 group-hover:border-primary-100 transition-colors"/>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">{agency.name}</h3>
                </Link>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Home;
