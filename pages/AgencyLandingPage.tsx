
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, ArrowLeft, Search, Globe } from 'lucide-react';

const AgencyLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getAgencyBySlug, getAgencyPublicTrips, loading } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  // Wait for data loading
  if (loading) {
      return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const agency = slug ? getAgencyBySlug(slug) : undefined;

  // 404 State within the layout
  if (!agency) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-gray-100 p-6 rounded-full mb-6">
              <Search size={48} className="text-gray-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Agência não encontrada</h1>
            <p className="text-gray-500 mb-8 max-w-md">O endereço <strong>/{slug}</strong> não pertence a nenhuma de nossas agências parceiras.</p>
            <Link to="/agencies" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Ver Lista de Agências
            </Link>
          </div>
      );
  }

  const trips = getAgencyPublicTrips(agency.id);
  
  const filteredTrips = trips.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s]">
      {/* Agency Hero Banner */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="h-40 bg-gray-900 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-gray-900 opacity-90"></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>
        
        <div className="px-8 pb-8">
           <div className="relative -mt-16 mb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
              <img src={agency.logo} alt={agency.name} className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover bg-white" />
              <div className="text-center md:text-left flex-1">
                 <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 flex items-center justify-center md:justify-start gap-2 mb-2">
                    {agency.name}
                    <ShieldCheck className="text-blue-500 fill-blue-50" size={28} />
                 </h1>
                 <p className="text-gray-600 max-w-2xl">{agency.description}</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                {agency.website && (
                    <a href={`http://${agency.website}`} target="_blank" rel="noreferrer" className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold flex items-center text-sm">
                        <Globe size={16} className="mr-2"/> Site Oficial
                    </a>
                )}
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/30 flex items-center text-sm">
                   <Mail size={16} className="mr-2" /> Fale Conosco
                </button>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-6 text-sm text-gray-500 justify-center md:justify-start border-t border-gray-100 pt-6">
              <span className="flex items-center"><MapPin size={16} className="mr-2" /> {agency.address?.city || 'Brasil'}</span>
              <span className="flex items-center">CNPJ: {agency.cnpj}</span>
              <span className="flex items-center text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">✓ Parceiro Verificado ViajaStore</span>
           </div>
        </div>
      </div>

      {/* Trips List */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Pacotes Disponíveis ({trips.length})</h2>
            
            <div className="relative w-full md:w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar pacote..." 
                 className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
        </div>

        {filteredTrips.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredTrips.map(trip => (
               <TripCard key={trip.id} trip={trip} />
             ))}
           </div>
        ) : (
           <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
             <p className="text-gray-500 font-medium mb-2">Nenhum pacote encontrado.</p>
             {searchTerm && <button onClick={() => setSearchTerm('')} className="text-primary-600 text-sm font-bold hover:underline">Limpar busca</button>}
           </div>
        )}
      </div>

      <div className="text-center pt-8 border-t border-gray-200">
          <Link to="/agencies" className="inline-flex items-center text-gray-500 hover:text-primary-600 font-bold transition-colors">
              <ArrowLeft size={16} className="mr-2" /> Ver outras agências no ViajaStore
          </Link>
      </div>
    </div>
  );
};

export default AgencyLandingPage;
