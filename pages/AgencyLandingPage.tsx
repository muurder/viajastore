
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, Search, Globe, Heart, Umbrella, Mountain, TreePine, Landmark, Utensils, Moon, Drama, Palette, Wallet, Smartphone } from 'lucide-react';
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
  const [featuredTrip, setFeaturedTrip] = useState<Trip | null>(null);

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

  // Explicitly fetch only this agency's trips using ID to avoid leakage
  const trips = getAgencyPublicTrips(agency.id);

  // Select a featured trip for the hero
  useEffect(() => {
     if (trips.length > 0 && !featuredTrip) {
         const featured = trips.find(t => t.featured) || trips[Math.floor(Math.random() * trips.length)];
         setFeaturedTrip(featured);
     }
  }, [trips, featuredTrip]);
  
  // Filtering Logic specific to this agency's trips
  const filteredTrips = trips.filter(t => {
    // STRICT CHECK: Must belong to agency (already guaranteed by getAgencyPublicTrips(id), but safe to keep)
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

  // Contact Logic: WhatsApp Preference
  const handleContact = () => {
      if (agency.whatsapp) {
          const num = agency.whatsapp.replace(/\D/g, '');
          window.open(`https://wa.me/${num}?text=Olá, vi seu site na ViajaStore e gostaria de saber mais sobre os pacotes.`, '_blank');
      } else {
          window.location.href = `mailto:${agency.email}`;
      }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s]">
      {/* Agency Hero Banner */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        <div className="h-56 md:h-72 relative overflow-hidden">
            {/* Background Image - Use featured trip image or generic pattern */}
            {featuredTrip ? (
                 <img src={featuredTrip.images[0]} className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-50" />
            ) : (
                 <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-gray-900"></div>
            )}
            <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        <div className="px-8 pb-8 relative">
           <div className="relative -mt-16 mb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Logo Display */}
              <div className="relative">
                  <img 
                    src={agency.logo || `https://ui-avatars.com/api/?name=${agency.name}`} 
                    alt={agency.name} 
                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover bg-white" 
                  />
                  <div className="absolute bottom-2 right-1 bg-green-500 text-white rounded-full p-1 border-2 border-white shadow-sm" title="Verificado">
                      <ShieldCheck size={16} />
                  </div>
              </div>
              
              <div className="text-center md:text-left flex-1 text-white md:text-gray-900 w-full">
                 <h1 className="text-3xl md:text-4xl font-extrabold mb-2 drop-shadow-md md:drop-shadow-none break-words leading-tight">
                    {agency.name}
                 </h1>
                 <p className="text-gray-100 md:text-gray-600 max-w-2xl drop-shadow md:drop-shadow-none font-medium text-sm md:text-base break-words">
                    {agency.description}
                 </p>
              </div>
              
              <div className="flex gap-3 mt-4 md:mt-0 flex-shrink-0">
                {agency.website && (
                    <a href={`http://${agency.website}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold flex items-center text-sm shadow-sm">
                        <Globe size={16} className="mr-2"/> Site
                    </a>
                )}
                <button onClick={handleContact} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-500/30 flex items-center text-sm">
                   {agency.whatsapp ? <Smartphone size={16} className="mr-2" /> : <Mail size={16} className="mr-2" />}
                   {agency.whatsapp ? 'WhatsApp' : 'Email'}
                </button>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-6 text-sm text-gray-500 justify-center md:justify-start border-t border-gray-100 pt-6">
              <span className="flex items-center"><MapPin size={16} className="mr-2" /> {agency.address?.city || 'Brasil'}</span>
              {agency.whatsapp && <span className="flex items-center text-gray-600 font-medium"><Smartphone size={16} className="mr-2" /> {agency.whatsapp}</span>}
           </div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div>
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
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
            {INTEREST_CHIPS.map(({label, icon: Icon}) => {
                const isSelected = label === 'Todos' ? selectedInterests.length === 0 : selectedInterests.includes(label);
                return (
                    <button 
                        key={label}
                        onClick={() => toggleInterest(label)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${isSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
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
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredTrips.map(trip => (
               <TripCard key={trip.id} trip={trip} />
             ))}
           </div>
        ) : (
           <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300" size={32} />
             </div>
             <p className="text-gray-900 font-bold text-lg mb-1">Nenhum pacote encontrado nesta agência.</p>
             <p className="text-gray-500 mb-4">A agência ainda não cadastrou viagens ou os filtros não retornaram resultados.</p>
             {(searchTerm || selectedInterests.length > 0) && (
                 <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline">
                    Limpar filtros
                 </button>
             )}
           </div>
        )}
      </div>

      <div className="text-center pt-8 border-t border-gray-200">
          <Link to="/" className="inline-flex items-center text-gray-400 hover:text-primary-600 font-bold transition-colors text-sm">
              <Globe size={14} className="mr-2" /> Ir para ViajaStore Global
          </Link>
      </div>
    </div>
  );
};

export default AgencyLandingPage;
