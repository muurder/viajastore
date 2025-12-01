


import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
// Fix: Use named import for TripCard as it's exported as such.
import { TripCard } from '../components/TripCard';
import { MapPin, Mail, ShieldCheck, ExternalLink, Star, MessageCircle } from 'lucide-react';

const AgencyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { agencies, getAgencyPublicTrips, getReviewsByAgencyId } = useData();

  // FIX: Find agency by its own primary key (agencyId), not the user's ID.
  const agency = agencies.find(a => a.agencyId === id);

  if (!agency) return <div className="text-center py-20">Agência não encontrada.</div>;

  // FIX: Use agency.agencyId (PK) to fetch related data, not agency.id (user ID).
  const trips = getAgencyPublicTrips(agency.agencyId);
  // Correctly fetch Agency Reviews now
  const reviews = getReviewsByAgencyId(agency.agencyId);
  
  const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-12">
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
                 <p className="text-gray-500 mb-2">{agency.description}</p>
                 {avgRating > 0 && (
                     <div className="flex items-center justify-center md:justify-start gap-1 text-amber-500 font-bold text-sm">
                         <Star size={16} className="fill-current"/> {avgRating.toFixed(1)} <span className="text-gray-400 font-normal">({reviews.length} avaliações)</span>
                     </div>
                 )}
              </div>
              <div className="flex gap-3">
                {agency.slug && (
                    <Link 
                        to={`/${agency.slug}`}
                        className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/30 flex items-center transition-all active:scale-95"
                    >
                        <ExternalLink size={18} className="mr-2" /> Ver Site
                    </Link>
                )}
              </div>
           </div>
           
           <div className="flex flex-wrap gap-6 text-sm text-gray-600 justify-center md:justify-start border-t border-gray-100 pt-6">
              <span className="flex items-center"><MapPin size={16} className="mr-2" /> Brasil</span>
              <span className="flex items-center">CNPJ: {agency.cnpj}</span>
              <span className="flex items-center text-green-600 font-semibold">✓ Verificado ViajaStore</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Trips List */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Viagens Disponíveis ({trips.length})</h2>
            {trips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

          {/* Reviews Widget */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><MessageCircle className="mr-2 text-primary-500"/> Avaliações</h3>
                  {reviews.length > 0 ? (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                          {reviews.map(review => (
                              <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="font-bold text-gray-900 text-sm">{review.clientName}</span>
                                      <div className="flex text-amber-400">
                                          {[...Array(5)].map((_, i) => <Star key={i} size={10} className={i < review.rating ? 'fill-current' : 'text-gray-300'}/>)}
                                      </div>
                                  </div>
                                  <p className="text-gray-600 text-xs leading-relaxed">"{review.comment}"</p>
                                  <p className="text-[10px] text-gray-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-gray-500 text-sm text-center py-4">Nenhuma avaliação ainda.</p>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AgencyProfile;