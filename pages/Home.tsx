
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard, { TripCardSkeleton } from '../components/TripCard';
import { MapPin, ArrowRight, Building, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Trip } from '../types';

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

  // --- HERO CAROUSEL LOGIC ---
  const [heroTrips] = useState(() => 
    allTrips.filter(trip => trip.featuredInHero).slice(0, 5)
  );
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (heroTrips.length > 1) {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % heroTrips.length);
        }, 7000); // Change trip every 7 seconds

        return () => clearInterval(timer);
    }
  }, [heroTrips.length]);
  
  const currentHeroTrip = heroTrips[currentSlide];
  // --- END HERO CAROUSEL LOGIC ---

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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

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

  const displayedTrips = selectedInterests.length === 0
    ? allTrips.sort((a, b) => b.rating - a.rating).slice(0, 9)
    : allTrips.filter(t => {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] md:min-h-[550px] flex items-center group mx-4 sm:mx-6 lg:mx-8 mt-4 bg-gray-900">
        <div className="absolute inset-0 transition-transform duration-[30s] hover:scale-105">
            <img 
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop"
            alt="Hero background showing a beautiful landscape" 
            className="w-full h-full object-cover animate-[kenburns_30s_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side: Text and Search */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg animate-[fadeInUp_0.7s]">
                Encontre sua<br/>próxima viagem.
              </h1>
              <p className="text-lg text-gray-200 mb-8 max-w-lg mx-auto lg:mx-0 font-light animate-[fadeInUp_0.9s]">
                Compare pacotes das melhores agências e compre com segurança.
              </p>

              <div className="animate-[fadeInUp_1.1s]">
                <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl mx-auto lg:mx-0">
                  <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all">
                    <MapPin className="text-primary-500 mr-3" />
                    <input 
                      type="text" 
                      placeholder="Para onde você quer ir?" 
                      className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-400 font-medium"
                      value={search}
                      onChange={(e) => setSearch.call(null, e.target.value)}
                    />
                  </div>
                  <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95 flex items-center justify-center">
                    <Search size={20} className="mr-2 md:hidden" /> Buscar
                  </button>
                </form>
              </div>
            </div>

            {/* Right Side: Featured Trip Carousel */}
            <div className="hidden lg:flex justify-center items-center h-full">
              {currentHeroTrip && (
                <Link 
                  to={`/viagem/${currentHeroTrip.slug || currentHeroTrip.id}`} 
                  key={currentHeroTrip.id} 
                  className="block w-full max-w-sm bg-black/20 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg hover:border-white/40 transition-all duration-300 animate-[fadeIn_1s]"
                  aria-live="polite"
                >
                    <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                        <img src={currentHeroTrip.images[0]} alt={currentHeroTrip.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">{currentHeroTrip.category.replace('_', ' ')}</div>
                    </div>
                    <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 min-h-[2.5rem]">{currentHeroTrip.title}</h3>
                    <div className="flex items-center text-xs text-gray-300 mt-2">
                        <MapPin size={12} className="mr-1.5" />
                        <span className="truncate">{currentHeroTrip.destination}</span>
                        <span className="mx-2">•</span>
                        <Clock size={12} className="mr-1.5" />
                        <span>{currentHeroTrip.durationDays} dias</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-end">
                        <div>
                            <p className="text-xs text-gray-300">A partir de</p>
                            <p className="text-2xl font-bold text-white">R$ {currentHeroTrip.price}</p>
                        </div>
                        <div className="text-xs font-bold text-white flex items-center group-hover:text-amber-300 transition-colors">
                            Ver Pacote <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </Link>
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
               <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md hidden md:flex"><ChevronLeft size={18} /></button>
             )}
             <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
             <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>
             {canScrollRight && (
               <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md hidden md:flex"><ChevronRight size={18} /></button>
             )}
             
             <div ref={scrollRef} onScroll={checkScroll} className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center">
                {INTEREST_CHIPS.map(({label, icon: Icon, id}) => {
                   const isAll = label === 'Todos';
                   const isActive = isAll ? selectedInterests.length === 0 : selectedInterests.includes(label);
                   
                   return (
                     <button
                        key={label}
                        id={id}
                        onClick={() => toggleInterest(label, id)}
                        className={`snap-start flex-shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border select-none ${isActive ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
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
                    {!loading && <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{displayedTrips.length}</span>}
                  </h2>
              </div>
              {selectedInterests.length > 0 && (
                  <button onClick={() => setSelectedInterests([])} className="text-sm text-red-500 font-bold hover:underline">
                      Limpar Filtros
                  </button>
              )}
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => <TripCardSkeleton key={n} />)}
                </div>
            ) : displayedTrips.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.5s]">
                    {displayedTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
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
                <Link key={agency.id} to={`/${agency.slug || agency.id}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center flex flex-col items-center">
                    <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full mb-4 object-cover border-2 border-gray-100"/>
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{agency.name}</h3>
                </Link>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Home;
