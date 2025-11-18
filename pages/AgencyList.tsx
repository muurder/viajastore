import React from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Building, Star } from 'lucide-react';

const AgencyList: React.FC = () => {
  const { agencies, getAgencyPublicTrips } = useData();
  
  // Only show agencies that have an active subscription (optional, but better UX)
  // OR show all but indicate status. For a marketplace, we usually show active ones.
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE');

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Agências Parceiras</h1>
        <p className="text-gray-500 mt-2">Conheça as empresas verificadas que anunciam na ViajaStore.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeAgencies.map(agency => {
          const activeTripsCount = getAgencyPublicTrips(agency.id).length;
          
          return (
            <Link to={`/agency/${agency.id}`} key={agency.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all flex flex-col items-center text-center group">
               <img 
                 src={agency.logo} 
                 alt={agency.name} 
                 className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 mb-4 group-hover:scale-105 transition-transform"
               />
               <h3 className="text-xl font-bold text-gray-900 mb-1">{agency.name}</h3>
               <p className="text-sm text-gray-500 line-clamp-2 mb-4">{agency.description}</p>
               
               <div className="w-full flex justify-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4 mt-auto">
                  <div className="flex flex-col">
                    <span className="font-bold text-primary-600 text-lg">{activeTripsCount}</span>
                    <span className="text-xs">Viagens Ativas</span>
                  </div>
                  <div className="w-px bg-gray-200"></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-amber-500 text-lg flex items-center justify-center">
                       5.0 <Star size={12} className="ml-1 fill-current" />
                    </span>
                    <span className="text-xs">Avaliação</span>
                  </div>
               </div>
               
               <button className="mt-6 w-full py-2 rounded-lg border border-primary-100 text-primary-600 font-medium bg-primary-50 hover:bg-primary-100 transition-colors">
                 Ver Perfil
               </button>
            </Link>
          );
        })}
      </div>

      {activeAgencies.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          Nenhuma agência parceira encontrada no momento.
        </div>
      )}
    </div>
  );
};

export default AgencyList;