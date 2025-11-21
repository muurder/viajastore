
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, Search, Globe, Heart, Umbrella, Mountain, TreePine, Landmark, Utensils, Moon, Drama, Palette, Wallet, Smartphone, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Trip } from '../types';

// Reuse Filters from Home
const INTEREST_CHIPS = [
  { label: 'Todos', id: 'chip-all' },
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

const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const AgencyLandingPage: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const { getAgencyBySlug, getAgencyPublicTrips, loading } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Hero Carousel State
  const [heroTrips, setHeroTrips] = useState<Trip[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Wait for data loading
  if (loading) {
      return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const agency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

  if (!agency) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
              <Search size={48} className="text-gray-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Agência não encontrada</h1>
            <p className="text-gray-500 mb-8 max-w-md">O endereço <strong>/{agencySlug}</strong> não existe.</p>
            <Link to="/agencies" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Ver Lista de Agências
            </Link>
          </div>
      );
  }

  // Fetch trips for this agency
  const allTrips = getAgencyPublicTrips(agency.id);

  // Setup Hero Trips based on Agency Settings
  useEffect(() => {
     if (agency.heroMode === 'TRIPS') {
         const featured = allTrips.filter(t => t.featuredInHero);
         // Fallback: if no featured trips, take the first 5 active trips
         const pool = featured.length > 0 ? featured : allTrips.slice(0, 5);
         setHeroTrips(pool);
     }
  }, [agency.heroMode, allTrips]);

  // Carousel Timer
  useEffect(() => {
     if (agency.heroMode === 'TRIPS' && heroTrips.length > 1) {
         timerRef.current = window.setInterval(() => {
             setCurrentSlide(prev => (prev + 1) % heroTrips.length);
         }, 5000);
     }
     return () => {
         if (timerRef.current) clearInterval(timerRef.current);
     };
  }, [heroTrips, agency.heroMode]);

  const nextSlide = () => {
      if (heroTrips.length > 0) {
          setCurrentSlide((prev) => (prev + 1) % heroTrips.length);
          resetTimer();
      }
  };
  
  const prevSlide = () => {
      if (heroTrips.length > 0) {
          setCurrentSlide((prev) => (prev - 1 + heroTrips.length) % heroTrips.length);
          resetTimer();
      }
  };

  const resetTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setCurrentSlide(prev => (prev + 1) % heroTrips.length);
      }, 5000);
  };
  
  // Filtering Logic
  const filteredTrips = allTrips.filter(t => {
    if (t.agencyId !== agency.id) return false;

    const matchesSearch = 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedInterests.length === 0) return true;

    return selectedInterests.some(interest => {
        const cleanInterest = normalizeText(interest);
        const cleanCategory = normalizeText(t.category);
        if (cleanCategory === cleanInterest) return true;
        if (cleanCategory === cleanInterest.replace(/\s/g, '_')) return true;
        return t.tags.some(tag => normalizeText(tag).includes(cleanInterest));
    });
  });

  const toggleInterest = (label: string) => {
    if (label === 'Todos') {
        setSelectedInterests([]);
    } else {
        setSelectedInterests(prev => 
            prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
        );
    }
 };

  const clearFilters = () => {
      setSearchTerm('');
      setSelectedInterests([]);
  };

  const handleContact = () => {
      if (agency.whatsapp) {
          const num = agency.whatsapp.replace(/\D/g, '');
          window.open(`https://wa.me/${num}?text=Olá, vi seu site na ViajaStore e gostaria de saber mais sobre os pacotes.`, '_blank');
      } else {
          window.location.href = `mailto:${agency.email}`;
      }
  };

  return (
    <div className="space-y-10 animate-[fadeIn_0.3s]">
      
      {/* --- HERO SECTION --- */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative h-[500px] md:h-[550px]">
          
          {/* MODE: TRIPS CAROUSEL */}
          {agency.heroMode === 'TRIPS' && heroTrips.length > 0 && (
              <>
                  {heroTrips.map((trip, idx) => (
                      <div key={trip.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                          <img src={trip.images[0]} className="w-full h-full object-cover" alt={trip.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                          
                          <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 text-white">
                              <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
                                  <div>
                                      <span className="inline-block bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider shadow-sm">
                                          {trip.category}
                                      </span>
                                      <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 drop-shadow-lg">
                                          {trip.title}
                                      </h2>
                                      <div className="flex items-center gap-6 text-gray-200 font-medium">
                                          <span className="flex items-center"><MapPin size={18} className="mr-2"/> {trip.destination}</span>
                                          <span className="flex items-center"><Clock size={18} className="mr-2"/> {trip.durationDays} dias</span>
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-4">
                                      <div className="text-right">
                                          <p className="text-sm opacity-80 font-medium mb-1">A partir de</p>
                                          <p className="text-3xl font-extrabold text-white">R$ {trip.price}</p>
                                      </div>
                                      <Link to={`/${agency.slug}/viagem/${trip.slug || trip.id}`} className="bg-white text-gray-900 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg">
                                          Ver Detalhes
                                      </Link>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}

                  {heroTrips.length > 1 && (
                    <>
                        <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all z-20"><ChevronLeft size={24}/></button>
                        <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all z-20"><ChevronRight size={24}/></button>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                            {heroTrips.map((_, idx) => (
                                <button key={idx} onClick={() => { setCurrentSlide(idx); resetTimer(); }} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/50'}`} />
                            ))}
                        </div>
                    </>
                  )}
              </>
          )}

          {/* MODE: STATIC BANNER or EMPTY CAROUSEL FALLBACK */}
          {(agency.heroMode === 'STATIC' || (agency.heroMode === 'TRIPS' && heroTrips.length === 0)) && (
              <div className="absolute inset-0">
                  {agency.heroBannerUrl ? (
                      <img src={agency.heroBannerUrl} className="w-full h-full object-cover" alt="Banner" />
                  ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
                  )}
                  <div className="absolute inset-0 bg-black/50"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-8">
                      <img 
                        src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                        className="w-24 h-24 rounded-full border-4 border-white mb-6 shadow-2xl bg-white object-cover" 
                        alt="Logo"
                      />
                      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg max-w-4xl leading-tight">
                          {agency.heroTitle || agency.name}
                      </h1>
                      <p className="text-xl text-gray-200 max-w-2xl font-medium drop-shadow-md">
                          {agency.heroSubtitle || agency.description}
                      </p>
                      <div className="mt-8 flex gap-4">
                          <button onClick={handleContact} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 transition-all">
                              {agency.whatsapp ? <Smartphone size={20}/> : <Mail size={20}/>}
                              Fale Conosco
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Search & Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
                {searchTerm || selectedInterests.length > 0 ? 'Resultados da Busca' : 'Pacotes Disponíveis'} 
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filteredTrips.length}</span>
            </h2>
            
            <div className="relative w-full md:w-80 group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar destino ou pacote..." 
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-8">
            {INTEREST_CHIPS.map(({label, icon: Icon}) => {
                const isSelected = label === 'Todos' ? selectedInterests.length === 0 : selectedInterests.includes(label);
                return (
                    <button 
                        key={label}
                        onClick={() => toggleInterest(label)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${isSelected ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        {Icon && <Icon size={14} />} {label}
                    </button>
                );
            })}
            {selectedInterests.length > 0 && (
                <button onClick={() => setSelectedInterests([])} className="text-red-500 text-sm font-bold hover:underline px-2">Limpar</button>
            )}
        </div>

        {filteredTrips.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredTrips.map(trip => (
               <TripCard key={trip.id} trip={trip} />
             ))}
           </div>
        ) : (
           <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300" size={32} />
             </div>
             <p className="text-gray-900 font-bold text-lg mb-1">Nenhum pacote encontrado.</p>
             <p className="text-gray-500 mb-4">A agência ainda não cadastrou viagens com estes critérios.</p>
             {(searchTerm || selectedInterests.length > 0) && (
                 <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline">
                    Limpar filtros
                 </button>
             )}
           </div>
        )}
      </div>

      <div className="text-center pt-12 pb-4 border-t border-gray-200">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold transition-colors text-xs uppercase tracking-widest">
              <Globe size={12} className="mr-2" /> Voltar para ViajaStore
          </Link>
      </div>
    </div>
  );
};

export default AgencyLandingPage;
