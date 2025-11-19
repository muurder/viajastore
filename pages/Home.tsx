
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, ArrowRight, Building, Search, Filter } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

// CATEGORIES
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

// Interest Chips
const INTEREST_CHIPS = [
  'Todos', 'Natureza', 'História', 'Gastronomia', 'Vida Noturna', 'Viagem barata', 
  'Cultura', 'Arte', 'Praia', 'Aventura', 'Romântico'
];

const Home: React.FC = () => {
  const { getPublicTrips, agencies } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeInterest, setActiveInterest] = useState('Todos');

  const allTrips = getPublicTrips();
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE').slice(0, 4);

  // Filter logic for the Home Grid
  const displayedTrips = activeInterest === 'Todos'
    ? allTrips.sort((a, b) => b.rating - a.rating).slice(0, 9) // Show top 9 by rating
    : allTrips.filter(t => t.tags.includes(activeInterest) || t.category === activeInterest.toUpperCase()).slice(0, 9);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/trips?q=${search}`);
  };

  return (
    <div className="space-y-16 pb-12">
      {/* 1. Compact Hero Section */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[450px] flex flex-col justify-center">
        <div className="absolute inset-0">
            <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Hero" 
            className="w-full h-full object-cover animate-[kenburns_30s_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        </div>
        
        <div className="relative z-10 px-6 md:px-12 max-w-4xl w-full mx-auto md:mx-0">
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
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-primary-500/30 active:scale-95 flex items-center justify-center">
                <Search size={20} className="mr-2 md:hidden" /> Buscar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 2. Trips Grid with Filters (Main Content) */}
      <div className="max-w-7xl mx-auto px-2">
        {/* Interest Chips - Horizontal Scroll */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-4 px-2">
              <Filter size={18} className="text-primary-600" />
              <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Filtrar por interesse</span>
           </div>
           <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade px-2">
              {INTEREST_CHIPS.map((chip) => (
                 <button
                    key={chip}
                    onClick={() => setActiveInterest(chip)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border shadow-sm 
                    ${activeInterest === chip 
                      ? 'bg-gray-900 text-white border-gray-900 transform scale-105' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50'}`}
                 >
                    {chip}
                 </button>
              ))}
           </div>
        </div>

        {/* Grid */}
        <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 px-2 gap-4">
              <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {activeInterest === 'Todos' ? 'Pacotes em Destaque' : `Pacotes: ${activeInterest}`}
                  </h2>
                  <p className="text-gray-500 mt-1">Seleção especial com os melhores preços e avaliações.</p>
              </div>
              <Link 
                  to="/trips" 
                  className="text-primary-600 font-bold hover:text-primary-800 flex items-center text-sm bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors"
              >
                  Ver catálogo completo <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>
            
            {displayedTrips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
                ))}
            </div>
            ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-500 text-lg">Nenhuma viagem encontrada para este interesse.</p>
                <button onClick={() => setActiveInterest('Todos')} className="text-primary-600 font-bold mt-2 hover:underline">Ver todas as viagens</button>
            </div>
            )}
        </div>
        
        {/* View All Button (Mobile Prominent) */}
        <div className="md:hidden px-2">
           <Link to="/trips" className="block w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-center shadow-sm hover:bg-gray-50">
             Ver +100 Opções de Viagem
           </Link>
        </div>
      </div>

      {/* 3. Categories (Secondary Discovery) */}
      <div className="bg-gray-100 -mx-4 sm:-mx-8 px-4 sm:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Explore por Estilo</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             {Object.keys(CATEGORY_IMAGES).map((cat) => (
               <button 
                 key={cat} 
                 onClick={() => navigate(`/trips?category=${cat}`)}
                 className="group relative h-32 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
               >
                 <img 
                    src={CATEGORY_IMAGES[cat]} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 grayscale-[30%] group-hover:grayscale-0" 
                    alt={cat}
                 />
                 <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center p-2">
                    <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wider text-center drop-shadow-md">{cat.replace('_', ' ')}</span>
                 </div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* 4. Featured Agencies */}
      <div className="max-w-7xl mx-auto px-2">
         <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
               <h2 className="text-2xl font-bold text-gray-900">Agências Verificadas</h2>
               <p className="text-gray-500 text-sm mt-1">Empresas que fazem sua viagem acontecer com segurança.</p>
            </div>
            <Link to="/agencies" className="text-sm font-bold text-gray-500 hover:text-primary-600">Ver todas as agências</Link>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {activeAgencies.map(agency => (
                <Link key={agency.id} to={`/agency/${agency.id}`} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200 transition-all text-center group flex flex-col items-center">
                    <img src={agency.logo} alt={agency.name} className="w-14 h-14 rounded-full mb-3 object-cover border border-gray-100 group-hover:border-primary-500 transition-colors"/>
                    <h3 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-primary-600 transition-colors line-clamp-1">{agency.name}</h3>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Verificado</span>
                </Link>
            ))}
            <Link to="/signup" className="bg-gray-50 border border-dashed border-gray-300 p-4 rounded-xl hover:bg-gray-100 transition-all text-center flex flex-col items-center justify-center text-gray-400 group h-full min-h-[140px]">
                <Building size={20} className="mb-2 group-hover:text-gray-600" />
                <h3 className="font-bold text-sm text-gray-500 group-hover:text-gray-800">Sua Agência</h3>
                <p className="text-[10px] mt-1">Cadastre-se</p>
            </Link>
         </div>
      </div>
    </div>
  );
};

export default Home;
