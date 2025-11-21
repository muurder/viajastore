
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, ArrowRight, Building, Search, Filter, TreePine, Landmark, Utensils, Moon, Wallet, Drama, Palette, Umbrella, Mountain, Heart, Globe, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Trip } from '../types';

// CATEGORIES IMAGES
const CATEGORY_IMAGES: Record<string, string> = {
  PRAIA: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  AVENTURA: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800&auto=format&fit=crop',
  FAMILIA: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800&auto=format&fit=crop',
  ROMANTICO: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop',
  URBANO: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=800&auto=format&fit=crop',
  NATUREZA: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  CULTURA: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?q=80&w=800&auto=format&fit=crop',
  GASTRONOMICO: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
  VIDA_NOTURNA: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=800&auto=format&fit=crop', 
  VIAGEM_BARATA: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop',
  ARTE: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=800&auto=format&fit=crop',
};

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
  const [featuredTrip, setFeaturedTrip] = useState<Trip | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const allTrips = getPublicTrips();
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 5);

  // ROTATING HERO LOGIC
  useEffect(() => {
    if (!loading && allTrips.length > 0 && !featuredTrip) {
        // Prioritize 'featured' trips, fallback to random
        const featuredPool = allTrips.filter(t => t.featured);
        const pool = featuredPool.length > 0 ? featuredPool : allTrips;
        
        // Random Selection
        const randomTrip = pool[Math.floor(Math.random() * pool.length)];
        setFeaturedTrip(randomTrip);
    }
  }, [allTrips, loading, featuredTrip]); 

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
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] md:min-h-[480px] flex flex-col justify-center group mx-4 sm:mx-6 lg:mx-8 mt-4 bg-gray-900">
        {(loading || !featuredTrip) ? (
           <div className="absolute inset-0 bg-gray-800 animate-pulse"></div>
        ) : (
           <div className="absolute inset-0 transition-transform duration-[30s] hover:scale-105">
                <img 
                key={featuredTrip.id} 
                src={featuredTrip.images[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"}
                alt="Hero" 
                className="w-full h-full object-cover animate-[kenburns_30s_infinite_alternate]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent/80 md:to-transparent"></div>
           </div>
        )}
        
        <div className="relative z-10 px-6 md:px-12 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          <div className="max-w-2xl w-full pt-4 md:pt-0">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg animate-[fadeInUp_0.7s]">
              Encontre sua<br/>próxima viagem.
            </h1>
            <p className="text-lg text-gray-200 mb-8 max-w-lg font-light animate-[fadeInUp_0.9s]">
              Compare pacotes das melhores agências e compre com segurança.
            </p>

            <div className="animate-[fadeInUp_1.1s]">
              <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl">
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

          {/* Featured Card */}
          {(!loading && featuredTrip) && (
            <div key={featuredTrip.id} className="w-full md:w-auto md:max-w-xs animate-[scaleIn_0.8s] mt-4 md:mt-0">
               <Link to={`/trip/${featuredTrip.id}`} className="block bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 border border-white/20">
                  <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-gray-100">
                      <img 
                        src={featuredTrip.images[0]} 
                        alt={featuredTrip.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                          DESTAQUE
                      </div>
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900 leading-tight mb-1 line-clamp-1">{featuredTrip.title}</h3>
                      <p className="text-xs text-gray-500 mb-2 flex items-center"><MapPin size={10} className="mr-1"/> {featuredTrip.destination}</p>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                          <div className="flex items-center text-xs font-medium text-gray-500">
                              <Clock size={12} className="mr-1"/> {featuredTrip.durationDays} dias
                          </div>
                          <div className="text-sm font-bold text-primary-700">
                              R$ {featuredTrip.price}
                          </div>
                      </div>
                  </div>
               </Link>
            </div>
          )}
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
                    <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{displayedTrips.length}</span>
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
                    {[1, 2, 3].map((n) => <div key={n} className="h-80 bg-gray-200 rounded-2xl animate-pulse"></div>)}
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
