

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import TripCard, { TripCardSkeleton } from '../components/TripCard';
import { MapPin, ArrowRight, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock, MessageCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { buildWhatsAppLink } from '../utils/whatsapp';

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
  const { trips, agencies, loading } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // TRUST THE DB: We show what the database (via DataContext) gives us.
  const activeTrips = useMemo(() => trips, [trips]);
  const activeAgencies = useMemo(() => agencies.slice(0, 5), [agencies]);

  // --- HERO LOGIC (INDEPENDENT) ---
  // Select a random sample of up to 5 trips from the entire catalog for the Hero
  // We use useMemo to ensure this list doesn't change on every render (e.g. slider updates)
  const heroTrips = useMemo(() => {
    if (activeTrips.length === 0) return [];
    // Fisher-Yates Shuffle for true randomness
    const shuffled = [...activeTrips];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 5);
  }, [activeTrips]);

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
  
  // Get Agency for Hero Trip to generate WhatsApp Link
  // FIX: Find agency by 'agencyId' (PK) to match trip.agencyId, not by user 'id'.
  const currentHeroAgency = useMemo(() => {
    return currentHeroTrip ? agencies.find(a => a.agencyId === currentHeroTrip.agencyId) : undefined;
  }, [currentHeroTrip, agencies]);

  const heroWhatsAppLink = (currentHeroAgency?.whatsapp && currentHeroTrip) 
      ? buildWhatsAppLink(currentHeroAgency.whatsapp, currentHeroTrip) 
      : null;

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

  const handleInterestClick = (label: string, id: string, e: React.MouseEvent<HTMLButtonElement>) => {
     // 1. Toggle Logic
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

     // 2. Scroll Logic (UX Improvement)
     e.currentTarget.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
     });
  };

  // Explicitly separate the grid trips logic from the hero logic
  const featuredGridTrips = useMemo(() => {
    if (selectedInterests.length === 0) {
        // Default View: Randomize order to give fair visibility to all agencies on every refresh
        // Using Fisher-Yates shuffle method client-side for uniform distribution
        const shuffled = [...activeTrips];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, 9);
    }

    // Filtered View
    return activeTrips.filter(t => {
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
  }, [activeTrips, selectedInterests]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedInterests([]);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (heroWhatsAppLink) {
        window.open(heroWhatsAppLink, '_blank');
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[500px] md:min-h-[580px] flex items-center group bg-gray-900">
        
        {/* DYNAMIC BACKGROUND LAYER (Z-0) */}
        {heroTrips.length > 0 ? (
            heroTrips.map((trip, index) => (
                <div 
                    key={trip.id} 
                    className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${
                        index === currentSlide 
                            ? 'opacity-100 z-10' 
                            : 'opacity-0 z-0' 
                    }`}
                >
                    <img 
                        src={trip.images?.[0] || DEFAULT_HERO_IMG}
                        alt="" 
                        className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${index === currentSlide ? 'scale-110' : 'scale-100'}`}
                        onError={(e) => { e.currentTarget.src = DEFAULT_HERO_IMG; }}
                    />
                </div>
            ))
        ) : (
            // Fallback Background
            <div className="absolute inset-0 z-0">
                <img 
                    src={DEFAULT_HERO_IMG}
                    alt="Hero background" 
                    className="w-full h-full object-cover"
                />
            </div>
        )}

        {/* STATIC OVERLAY LAYER (Z-10) - Adjusted Gradient as requested */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-20 pointer-events-none"></div>
        
        {/* CONTENT LAYER (Z-30) */}
        <div className="relative z-30 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Text and Search */}
            <div className="text-center lg:text-left">
              
              {/* Static Headline - Fixed Text */}
              <div className="animate-[fadeInUp_0.8s_ease-out]">
                  <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6 drop-shadow-xl">
                    Encontre sua <br/>
                    próxima viagem.
                  </h1>
                  <p className="text-lg text-gray-200 mb-10 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed drop-shadow-md">
                    Compare pacotes das melhores agências e compre com segurança e facilidade.
                  </p>
              </div>

              {/* Static Search Bar */}
              <div className="animate-[fadeInUp_1.1s]">
                <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl mx-auto lg:mx-0 transform transition-transform hover:scale-[1.01]">
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
                 <div className="w-full max-w-sm h-96 bg-gray-800/50 backdrop-blur-sm rounded-3xl animate-pulse border border-white/10"></div>
              ) : currentHeroTrip ? (
                /* Glassmorphism Card Style - Adjusted to be lighter and more translucent */
                <Link 
                  to={`/viagem/${currentHeroTrip.slug || currentHeroTrip.id}`} 
                  key={currentHeroTrip.id} 
                  className="block w-full max-w-sm bg-black/30 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl hover:bg-black/40 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 animate-[fadeIn_0.5s_ease-out] group/card relative z-10"
                  aria-live="polite"
                >
                    <div className="relative h-52 w-full rounded-2xl overflow-hidden mb-5 shadow-md">
                        <img src={currentHeroTrip.images[0]} alt={currentHeroTrip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                            {currentHeroTrip.category.replace('_', ' ')}
                        </div>
                    </div>
                    <h3 className="font-bold text-white text-2xl leading-tight line-clamp-2 min-h-[3.5rem] mb-3 group-hover/card:text-primary-400 transition-colors drop-shadow-sm">
                        {currentHeroTrip.title}
                    </h3>
                    
                    <div className="flex items-center text-sm text-gray-300 mb-6 pb-4 border-b border-white/10">
                        <MapPin size={14} className="mr-1.5 text-gray-400" />
                        <span className="truncate max-w-[150px] font-medium">{currentHeroTrip.destination}</span>
                        <span className="mx-2 opacity-30">|</span>
                        <Clock size={14} className="mr-1.5 text-gray-400" />
                        <span className="font-medium">{currentHeroTrip.durationDays} dias</span>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">A partir de</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xs font-semibold text-gray-400">R$</span>
                                <p className="text-3xl font-extrabold text-white drop-shadow-sm">{currentHeroTrip.price.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             {heroWhatsAppLink && (
                                <button
                                    onClick={handleWhatsAppClick}
                                    className="p-3 bg-green-500/80 hover:bg-green-600 text-white rounded-xl shadow-lg transition-colors backdrop-blur-sm flex items-center justify-center border border-green-400/30"
                                    title="Falar com a agência"
                                >
                                    <MessageCircle size={20} />
                                </button>
                             )}
                            <div className="px-5 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold flex items-center group-hover/card:bg-primary-500 transition-colors shadow-lg shadow-primary-900/20">
                                Ver Pacote <ArrowRight size={16} className="ml-2 group-hover/card:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                </Link>
              ) : (
                 <div className="w-full max-w-sm text-center bg-black/30 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-xl">
                    <p className="text-gray-300 font-medium">Nenhum pacote em destaque no momento.</p>
                 </div>
              )}

              {heroTrips.length > 1 && (
                <>
                  <button onClick={prevSlide} aria-label="Anterior" className="absolute -left-16 top-1/2 -translate-y-1/2 z-30 text-white/50 hover:text-white hover:scale-110 transition-all p-3 rounded-full hover:bg-white/10"><ChevronLeft size={48}/></button>
                  <button onClick={nextSlide} aria-label="Próximo" className="absolute -right-16 top-1/2 -translate-y-1/2 z-30 text-white/50 hover:text-white hover:scale-110 transition-all p-3 rounded-full hover:bg-white/10"><ChevronRight size={48}/></button>
                  
                  {/* Progress Indicators */}
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
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
              <div className="flex items-center gap-2 text-gray-500">
                 <Filter size={16} />
                 <span className="text-xs font-bold uppercase tracking-wider">Filtrar por interesse</span>
              </div>
           </div>
           
           <div className="relative group/scroll bg-white/60 backdrop-blur-md border border-gray-100 shadow-sm rounded-xl py-3">
             {canScrollLeft && (
               <button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50 text-gray-700 transition-all active:scale-95"><ChevronLeft size={18} /></button>
             )}
             
             {/* Fades Laterais ajustados ao container */}
             <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none transition-opacity duration-300 rounded-l-xl ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
             <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none transition-opacity duration-300 rounded-r-xl ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>
             
             {canScrollRight && (
               <button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white shadow-md p-1.5 rounded-full hover:bg-gray-50 text-gray-700 transition-all active:scale-95"><ChevronRight size={18} /></button>
             )}
             
             <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center">
                {INTEREST_CHIPS.map(({label, icon: Icon, id}) => {
                   const isAll = label === 'Todos';
                   const isActive = isAll ? selectedInterests.length === 0 : selectedInterests.includes(label);
                   
                   return (
                     <button
                        key={label}
                        id={id}
                        onClick={(e) => handleInterestClick(label, id, e)}
                        className={`snap-center flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border select-none 
                        ${isActive 
                           ? 'bg-gray-900 text-white border-gray-900 shadow-md ring-2 ring-primary-500/30 transform scale-105' 
                           : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                        }`}
                     >
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
      
      {/* Featured Agencies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Agências Verificadas</h2>
            <Link to="/agencies" className="text-sm font-bold text-gray-500 hover:text-primary-600 flex items-center">Ver todas <ArrowRight size={14} className="ml-1"/></Link>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeAgencies.map(agency => (
                <Link key={agency.id} to={`/${agency.slug}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center group">
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