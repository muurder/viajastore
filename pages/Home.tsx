
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, ArrowRight, Building, Search } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const CATEGORY_IMAGES: Record<string, string> = {
  PRAIA: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
  AVENTURA: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=800&auto=format&fit=crop',
  FAMILIA: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=800&auto=format&fit=crop',
  ROMANTICO: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop',
  URBANO: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=800&auto=format&fit=crop',
  NATUREZA: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop',
  CULTURA: 'https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?q=80&w=800&auto=format&fit=crop',
  GASTRONOMICO: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
  VIDA_NOTURNA: 'https://images.unsplash.com/photo-1514525253440-b393452e233e?q=80&w=800&auto=format&fit=crop',
  VIAGEM_BARATA: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop',
  ARTE: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=800&auto=format&fit=crop',
};

const SEARCH_CHIPS = [
  'Natureza', 'História', 'Gastronomia', 'Vida Noturna', 'Viagem barata', 
  'Cultura', 'Arte', 'Praia', 'Aventura', 'Romântico'
];

const Home: React.FC = () => {
  const { getPublicTrips, agencies } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);

  const allTrips = getPublicTrips();
  const featuredTrips = allTrips.sort((a, b) => b.rating - a.rating).slice(0, 6);
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (selectedChips.length > 0) params.append('tags', selectedChips.join(','));
    navigate(`/trips?${params.toString()}`);
  };

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <div 
        className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[600px] flex items-center"
      >
        <div className="absolute inset-0">
            <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Hero" 
            className="w-full h-full object-cover animate-[kenburns_20s_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 px-8 md:px-16 max-w-4xl w-full">
          <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-sm mb-6 animate-[fadeInUp_0.5s]">
             <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
             Mais de {allTrips.length} pacotes disponíveis
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 drop-shadow-lg animate-[fadeInUp_0.7s]">
            Viaje mais.<br/>Gaste menos.<br/>Viva agora.
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-xl font-light animate-[fadeInUp_0.9s]">
            A plataforma que conecta você diretamente às melhores agências de turismo do Brasil. Sem intermediários, com total segurança.
          </p>

          <div className="animate-[fadeInUp_1.1s]">
            <form onSubmit={handleSearch} className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-xl relative z-20">
              <div className="flex-1 flex items-center px-4 py-4 bg-gray-50 rounded-xl border border-transparent focus-within:border-primary-300 focus-within:bg-white transition-all">
                <MapPin className="text-primary-500 mr-3" />
                <input 
                  type="text" 
                  placeholder="Para onde você quer ir?" 
                  className="bg-transparent w-full outline-none text-gray-800 placeholder-gray-400 font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95">
                Buscar
              </button>
            </form>

            {/* Chips Section */}
            <div className="mt-6 max-w-2xl overflow-x-auto pb-2 scrollbar-hide">
               <div className="flex gap-2">
                  {SEARCH_CHIPS.map((chip) => (
                     <button
                        key={chip}
                        onClick={() => toggleChip(chip)}
                        className={`
                           whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
                           ${selectedChips.includes(chip) 
                             ? 'bg-primary-600 text-white border-primary-600 shadow-md transform scale-105' 
                             : 'bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm'
                           }
                        `}
                     >
                        {chip}
                     </button>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Explore por Estilo</h2>
          <p className="text-gray-500 mt-2 text-lg">Qual tipo de viajante você é hoje?</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4 max-w-7xl mx-auto">
           {Object.keys(CATEGORY_IMAGES).map((cat) => (
             <button 
               key={cat} 
               onClick={() => navigate(`/trips?category=${cat}`)}
               className="group relative h-40 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
             >
               <img 
                  src={CATEGORY_IMAGES[cat]} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                  alt={cat}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                  <span className="text-white font-bold text-sm uppercase tracking-wider text-center">{cat.replace('_', ' ')}</span>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Featured Trips */}
      <div className="bg-gray-50 -mx-4 sm:-mx-8 px-4 sm:px-8 py-20">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Pacotes em Destaque</h2>
                <p className="text-gray-500 mt-2 text-lg">As melhores avaliações e preços imperdíveis.</p>
            </div>
            <Link 
                to="/trips" 
                className="group flex items-center text-primary-600 font-bold hover:text-primary-700 bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all"
            >
                Ver todas as ofertas <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Link>
            </div>
            
            {featuredTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
            ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhuma viagem encontrada no momento.</p>
            </div>
            )}
        </div>
      </div>

      {/* Featured Agencies */}
      <div className="max-w-7xl mx-auto">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Principais Agências</h2>
            <p className="text-gray-500 mt-2">Empresas verificadas que fazem sua viagem acontecer.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeAgencies.map(agency => (
                <Link key={agency.id} to={`/agency/${agency.id}`} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-center group">
                    <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-gray-100 group-hover:border-primary-500 transition-colors"/>
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{agency.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{agency.description}</p>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Verificado</span>
                </Link>
            ))}
            <Link to="/signup" className="bg-gray-900 p-6 rounded-2xl shadow-sm hover:bg-gray-800 transition-all text-center flex flex-col items-center justify-center text-white group">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building size={24} />
                </div>
                <h3 className="font-bold text-lg">Sua agência aqui</h3>
                <p className="text-xs text-gray-400 mt-2">Torne-se um parceiro ViajaStore</p>
            </Link>
         </div>
      </div>
    </div>
  );
};

export default Home;
