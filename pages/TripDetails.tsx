import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Star, Check, Clock, ShieldCheck, MessageCircle, Send } from 'lucide-react';

const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getTripById, addBooking, agencies, getReviewsByTripId, addReview, hasUserPurchasedTrip } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [passengers, setPassengers] = useState(1);
  
  // Review State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const trip = getTripById(id || '');
  
  if (!trip) return <div className="text-center py-20">Viagem não encontrada.</div>;

  const agency = agencies.find(a => a.id === trip.agencyId);
  const totalPrice = trip.price * passengers;
  const reviews = getReviewsByTripId(trip.id);
  
  const canReview = user?.role === 'CLIENT' && hasUserPurchasedTrip(user.id, trip.id);

  const handleBooking = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'CLIENT') {
      alert('Apenas clientes podem comprar viagens.');
      return;
    }
    
    addBooking({
      id: `b${Date.now()}`,
      tripId: trip.id,
      clientId: user.id,
      date: new Date().toISOString(),
      status: 'CONFIRMED',
      totalPrice,
      passengers
    });

    setIsBookingModalOpen(false);
    navigate('/checkout/success');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    addReview({
      id: `r${Date.now()}`,
      tripId: trip.id,
      clientId: user.id,
      clientName: user.name,
      rating,
      comment,
      date: new Date().toISOString()
    });
    setComment('');
    alert('Avaliação enviada!');
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-2xl overflow-hidden mb-8 h-[400px]">
        <img src={trip.images[0]} alt="Main" className="w-full h-full object-cover" />
        <div className="grid grid-cols-2 gap-2 h-full">
          {trip.images.slice(1).concat([trip.images[0], trip.images[0]]).slice(0, 4).map((img, idx) => (
            <img key={idx} src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-primary-600 font-semibold mb-2">
              <span className="bg-primary-50 px-2 py-1 rounded text-xs uppercase">{trip.category}</span>
              <span className="flex items-center text-xs"><MapPin size={14} className="mr-1"/> {trip.destination}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{trip.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center"><Star size={16} className="text-amber-400 fill-current mr-1" /> {trip.rating.toFixed(1)} ({trip.totalReviews} avaliações)</span>
              <span className="flex items-center"><Clock size={16} className="mr-1" /> {trip.durationDays} Dias</span>
            </div>
          </div>

          <div className="prose max-w-none text-gray-600">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sobre a viagem</h3>
            <p>{trip.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">O que está incluído</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trip.included.map((item, idx) => (
                <li key={idx} className="flex items-center text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Check size={18} className="text-green-500 mr-2" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
           {/* Agency Info */}
          {agency && (
             <div className="bg-white border border-gray-200 p-6 rounded-xl flex items-center gap-4">
                <img src={agency.logo} alt={agency.name} className="w-16 h-16 rounded-full object-cover border" />
                <div>
                   <p className="text-xs text-gray-500 uppercase font-bold">Organizado por</p>
                   <h4 className="text-lg font-bold">{agency.name}</h4>
                   <p className="text-sm text-gray-600 line-clamp-1 mb-2">{agency.description}</p>
                   <button onClick={() => navigate(`/agency/${agency.id}`)} className="text-primary-600 text-sm font-medium hover:underline">
                     Ver todas as viagens dessa agência
                   </button>
                </div>
             </div>
          )}

          {/* Reviews Section */}
          <div className="pt-8 border-t border-gray-100">
             <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
               <MessageCircle className="mr-2" /> Avaliações
             </h3>
             
             {/* Review Form */}
             {canReview && (
               <form onSubmit={handleSubmitReview} className="bg-gray-50 p-4 rounded-xl mb-8">
                 <h4 className="font-bold text-sm mb-2">Deixe sua avaliação</h4>
                 <div className="flex items-center gap-2 mb-3">
                   {[1,2,3,4,5].map(star => (
                     <button type="button" key={star} onClick={() => setRating(star)}>
                       <Star size={20} className={`${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                     </button>
                   ))}
                 </div>
                 <div className="flex gap-2">
                   <input 
                     className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" 
                     placeholder="Conte como foi sua experiência..."
                     value={comment}
                     onChange={e => setComment(e.target.value)}
                     required
                   />
                   <button type="submit" className="bg-primary-600 text-white px-4 rounded-lg hover:bg-primary-700">
                     <Send size={18} />
                   </button>
                 </div>
               </form>
             )}

             <div className="space-y-4">
               {reviews.length > 0 ? reviews.map(review => (
                 <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                       <span className="font-bold text-gray-900">{review.clientName}</span>
                       <span className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex text-amber-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? "fill-current" : "text-gray-200"} />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm">{review.comment}</p>
                 </div>
               )) : (
                 <p className="text-gray-500 text-sm italic">Ainda não há avaliações para esta viagem.</p>
               )}
             </div>
          </div>
        </div>

        {/* Sticky Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Preço por pessoa</p>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-primary-700">R$ {trip.price}</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Data</div>
                <div className="flex items-center font-medium">
                  <Calendar size={16} className="mr-2 text-gray-400" />
                  {new Date(trip.startDate).toLocaleDateString('pt-BR')} - {new Date(trip.endDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Passageiros</div>
                <select 
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full bg-transparent outline-none font-medium"
                >
                  {[1,2,3,4,5,6].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Pessoa' : 'Pessoas'}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 text-sm">
              <span className="text-gray-600">Total ({passengers}x)</span>
              <span className="font-bold text-lg">R$ {totalPrice}</span>
            </div>

            <button 
              onClick={() => setIsBookingModalOpen(true)}
              className="w-full bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-4 rounded-xl transition-colors shadow-md"
            >
              Reservar Agora
            </button>
            
            <div className="mt-4 flex items-center justify-center text-xs text-gray-500 gap-1">
               <ShieldCheck size={14} /> Pagamento 100% Seguro
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h2 className="text-xl font-bold mb-4">Confirmar Reserva</h2>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Viagem:</span>
                <span className="font-medium text-right">{trip.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-medium">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passageiros:</span>
                <span className="font-medium">{passengers}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold text-primary-700">
                <span>Total:</span>
                <span>R$ {totalPrice}</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</p>
              <div className="grid grid-cols-3 gap-2">
                <button className="border border-primary-500 bg-primary-50 text-primary-700 py-2 rounded font-medium text-sm">PIX</button>
                <button className="border border-gray-200 text-gray-600 py-2 rounded font-medium text-sm hover:bg-gray-50">Cartão</button>
                <button className="border border-gray-200 text-gray-600 py-2 rounded font-medium text-sm hover:bg-gray-50">Boleto</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsBookingModalOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBooking}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md"
              >
                Pagar e Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;