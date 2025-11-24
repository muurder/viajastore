
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import TripCard from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, ExternalLink } from 'lucide-react';

const AgencyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { agencies, getAgencyPublicTrips } = useData();

  const agency = agencies.find(a => a.id === id);

  if (!agency) return <div className="text-center py-20">Agência não encontrada.</div>;

  const trips = getAgencyPublicTrips(agency.id);

  return (
    <div className="space-y-8">
      {/* Header Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-400"></div>
        <div className="px-8 pb-8">
           <div className="relative -mt-12 mb-6 flex flex-col md:flex-row items-center md:items-end gap-6">
              <img src={agency.logo} alt={agency.name} className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover bg-white" />
              <div className="text-center md:text-left flex-1">
                 <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
                    {agency.name}
                    <ShieldCheck className="text-blue-500" size={24} />
                 </h1>
                 <p className="text-gray-500">{agency.description}</p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm flex items-center">
                   <Mail size={18} className="mr-2" /> Contato
                </button>
                {agency.slug && (
                    <Link 
                        to={`/${agency.slug}`}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm flex items-center"
                    >
                        <ExternalLink size={18} className="mr-2" /> Ver Site
                    </Link>
                )}
              </div>
           </div>
           
           <div className="flex flex-wrap gap-6 text-sm text-gray-600 justify-center md:justify-start">
              <span className="flex items-center"><MapPin size={16} className="mr-2" /> Brasil</span>
              <span className="flex items-center">CNPJ: {agency.cnpj}</span>
              <span className="flex items-center text-green-600 font-semibold">✓ Verificado ViajaStore</span>
           </div>
        </div>
      </div>

      {/* Trips List */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Viagens Disponíveis ({trips.length})</h2>
        {trips.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {trips.map(trip => (
               <TripCard key={trip.id} trip={trip} />
             ))}
           </div>
        ) : (
           <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
             <p className="text-gray-500">Esta agência não possui viagens ativas no momento.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default AgencyProfile;
