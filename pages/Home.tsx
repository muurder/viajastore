
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

// Interest Chips Data with Icons
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

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const Home: React.FC = () => {
  const { getPublicTrips, agencies, loading } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  // Filter State (Multi-select)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Hero Feature State
  const [featuredTrip, setFeaturedTrip] = useState<Trip | null>(null);

  // Scroll logic for Chips
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const allTrips = getPublicTrips();
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 5);

  // Init Hero Featured Trip on Mount or when trips load
  // UPDATED: Only set if we have trips and NOT loading, to prevent flickering
  useEffect(() => {
    if (!loading && allTrips.length > 0 && !featuredTrip) {
        const randomIndex = Math.floor(Math.random() * allTrips.length);
        setFeaturedTrip(allTrips[randomIndex]);
    }
  }, [allTrips, loading, featuredTrip]); 

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Tolerance of 5px for calculation errors
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

  // Chip Selection Logic
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

     // Auto Scroll to center
     const el = document.getElementById(elementId);
     if (el && scrollRef.current) {
         el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
     }
  };

  // Filter logic for the Home Grid
  const displayedTrips = selectedInterests.length === 0
    ? allTrips.sort((a, b) => b.rating - a.rating).slice(0, 9)
    : allTrips.filter(t => {
        // Improved OR Logic: Check categories and tags with normalization
        return selectedInterests.some(interest => {
            const cleanInterest = normalizeText(interest);
            const cleanCategory = normalizeText(t.category);
            
            // 1. Check Category (Exact or Mapped)
            if (cleanCategory === cleanInterest) return true;
            if (cleanCategory === cleanInterest.replace(/\s/g, '_')) return true; // Handles "Vida Noturna" -> "vida_noturna"
            
            // Specific fix for "Gastronomia" vs "Gastronomico"
            if (cleanInterest === 'gastronomia' && cleanCategory === 'gastronomico') return true;

            // 2. Check Tags (Partial match)
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
      {/* 1. Compact Hero Section with Featured Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[500px] md:min-h-[480px] flex flex-col justify-center group mx-4 sm:mx-6 lg:mx-8 mt-4 bg-gray-900">
        
        {/* Hero Background Image or Skeleton */}
        {(loading || !featuredTrip) ? (
           <div className="absolute inset-0 bg-gray-800 animate-pulse"></div>
        ) : (
           <div className="absolute inset-0 transition-transform duration-[30s] hover:scale-105">
                <img 
                key={featuredTrip.id} // Force re-render only when trip changes
                src={featuredTrip.images[0] || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"}
                alt="Hero" 
                className="w-full h-full object-cover animate-[kenburns_30s_infinite_alternate]"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent/80 md:to-transparent"></div>
           </div>
        )}
        
        <div className="relative z-10 px-6 md:px-12 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          
          {/* Left Content */}
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

          {/* Right Content: Featured Trip Card OR Skeleton */}
          {(loading || !featuredTrip) ? (
            <div className="w-full md:w-80 h-80 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-4 animate-pulse mt-4 md:mt-0">
               <div className="w-full h-32 bg-white/10 rounded-xl mb-3"></div>
               <div className="h-6 w-3/4 bg-white/10 rounded mb-2"></div>
               <div className="h-4 w-1/2 bg-white/10 rounded mb-4"></div>
               <div className="h-10 w-full bg-white/10 rounded"></div>
            </div>
          ) : (
            <div key={featuredTrip.id} className="w-full md:w-auto md:max-w-xs animate-[scaleIn_0.8s] mt-4 md:mt-0">
               <Link to={`/trip/${featuredTrip.id}`} className="block bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300 border border-white/20">
                  <div className="relative h-32 rounded-xl overflow-hidden mb-3 bg-gray-100">
                      <img 
                        src={featuredTrip.images[0] || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=60'} 
                        alt={featuredTrip.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=60';
                        }}
                      />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900 leading-tight mb-1 line-clamp-1">{featuredTrip.title}</h3>
                      <p className="text-xs text-gray-500 mb-2 flex items-center"><MapPin size={10} className="mr-1"/> {featuredTrip.destination}</p>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">{featuredTrip.description}</p>
                      
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

      {/* 2. Trips Grid with Filters (Main Content) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* COMPACT INTEREST CHIPS - SCROLLABLE & MULTI-SELECT */}
        <div className="mb-8">
           <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2 text-gray-400">
                 <Filter size={14} />
                 <span className="text-xs font-bold uppercase tracking-wider">Filtrar por interesse</span>
              </div>
           </div>
           
           <div className="relative group/scroll">
             {/* Left Arrow */}
             {canScrollLeft && (
               <button 
                 onClick={() => scroll('left')}
                 className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-gray-600 hover:text-primary-600 hover:scale-105 transition-all hidden md:flex items-center justify-center"
               >
                 <ChevronLeft size={18} />
               </button>
             )}
             
             {/* Gradient Masks */}
             <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}></div>
             <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 via-gray-50/90 to-transparent z-10 pointer-events-none transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}></div>

             {/* Right Arrow */}
             {canScrollRight && (
               <button 
                 onClick={() => scroll('right')}
                 className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-gray-600 hover:text-primary-600 hover:scale-105 transition-all hidden md:flex items-center justify-center"
               >
                 <ChevronRight size={18} />
               </button>
             )}
             
             {/* Scrollable Container */}
             <div 
               ref={scrollRef} 
               onScroll={checkScroll}
               className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center"
             >
                {INTEREST_CHIPS.map(({label, icon: Icon, id}) => {
                   const isAll = label === 'Todos';
                   const isActive = isAll 
                        ? selectedInterests.length === 0 
                        : selectedInterests.includes(label);
                   
                   return (
                     <button
                        key={label}
                        id={id}
                        onClick={() => toggleInterest(label, id)}
                        className={`
                          snap-start flex-shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border select-none
                          ${isActive 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                     >
                        <Icon size={14} className={isActive ? 'stroke-2' : 'stroke-[1.5]'} />
                        <span className="whitespace-nowrap">{label}</span>
                     </button>
                   );
                })}
                {/* Spacer for scrolling end */}
                <div className="w-4 flex-shrink-0"></div>
             </div>
           </div>
        </div>

        {/* Grid */}
        <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 px-1 gap-4">
              <div className="animate-[fadeIn_0.3s]">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedInterests.length === 0 ? 'Pacotes em Destaque' : `Explorando: ${selectedInterests.join(', ')}`}
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">Seleção especial com os melhores preços e avaliações.</p>
              </div>
              <Link 
                  to="/trips" 
                  className="text-primary-600 font-bold hover:text-primary-800 flex items-center text-sm bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors group"
              >
                  Ver catálogo completo <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={16} />
              </Link>
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full flex flex-col shadow-sm">
                            <div className="h-48 bg-gray-200 animate-pulse"></div>
                            <div className="p-5 flex-1 space-y-3">
                                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                <div className="h-6 bg-gray-200 rounded w-full animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                <div className="mt-auto pt-4 flex justify-between items-center">
                                    <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : displayedTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.5s]">
                {displayedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
            ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 animate-[fadeIn_0.3s]">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={24}/>
                </div>
                <p className="text-gray-500 text-lg font-medium">Nenhuma viagem encontrada para os filtros selecionados.</p>
                <button onClick={() => setSelectedInterests([])} className="text-primary-600 font-bold mt-2 hover:underline">Limpar filtros</button>
            </div>
            )}
        </div>
        
        {/* View All Button (Mobile Prominent) */}
        <div className="md:hidden px-1">
           <Link to="/trips" className="block w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-center shadow-sm hover:bg-gray-50 transition-colors">
             Ver +100 Opções de Viagem
           </Link>
        </div>
      </div>

      {/* 3. Categories (Secondary Discovery) */}
      <div className="bg-gray-100 py-12 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest">Navegue por Estilo</h2>
            <div className="w-12 h-1 bg-primary-500 mx-auto mt-3 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             {Object.keys(CATEGORY_IMAGES).map((cat) => (
               <button 
                 key={cat} 
                 onClick={() => navigate(`/trips?category=${cat}`)}
                 className="group relative h-28 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
               >
                 <img 
                    src={CATEGORY_IMAGES[cat]} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale-[20%] group-hover:grayscale-0" 
                    alt={cat}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity"></div>
                 
                 <div className="absolute inset-0 flex items-center justify-center p-2">
                    <span className="text-white font-bold text-sm uppercase tracking-wider text-center drop-shadow-lg transform group-hover:scale-105 transition-transform">{cat.replace('_', ' ')}</span>
                 </div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* 4. Featured Agencies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-4">
            <div>
               <h2 className="text-2xl font-bold text-gray-900">Agências Verificadas</h2>
               <p className="text-gray-500 text-sm mt-1">Empresas que fazem sua viagem acontecer com segurança.</p>
            </div>
            <Link to="/agencies" className="text-sm font-bold text-gray-500 hover:text-primary-600 flex items-center">Ver todas as agências <ArrowRight size={14} className="ml-1"/></Link>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loading ? (
                // Agency Skeletons
                [1,2,3,4,5].map(n => (
                    <div key={n} className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-gray-200 mb-4 animate-pulse"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                ))
            ) : (
                <>
                {activeAgencies.map(agency => (
                    <Link key={agency.id} to={`/agency/${agency.id}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary-100 transition-all text-center group flex flex-col items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                        <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full mb-4 object-cover border-2 border-gray-100 group-hover:border-primary-500 transition-colors shadow-sm"/>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">{agency.name}</h3>
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center mt-2"><ArrowRight size={10} className="mr-1"/> Verificado</span>
                    </Link>
                ))}
                <Link to="/signup" className="bg-gray-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl hover:bg-gray-100 hover:border-gray-300 transition-all text-center flex flex-col items-center justify-center text-gray-400 group h-full min-h-[180px]">
                    <div className="bg-white p-3 rounded-full mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <Building size={24} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-gray-500 group-hover:text-gray-800">Sua Agência Aqui</h3>
                    <p className="text-[10px] mt-1 max-w-[100px]">Cadastre-se e venda seus pacotes</p>
                </Link>
                </>
            )}
         </div>
      </div>
    </div>
  );
};

export default Home;
