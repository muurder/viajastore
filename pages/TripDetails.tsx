
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { MapPin, Calendar, Star, Check, Clock, ShieldCheck, MessageCircle, Send, X, ChevronDown, ChevronUp, Lock, Tag, Users } from 'lucide-react';

const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getTripById, addBooking, agencies, getReviewsByTripId, addReview, hasUserPurchasedTrip } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('included');
  
  // Review State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const trip = getTripById(id || '');
  
  if (!trip) return <div className="min-h-screen flex items-center justify-center"><div className="text-xl font-bold text-gray-500">Viagem não encontrada.</div></div>;

  const agency = agencies.find(a => a.id === trip.agencyId);
  const totalPrice = trip.price * passengers;
  const reviews = getReviewsByTripId(trip.id);
  
  const canReview = user?.role === 'CLIENT' && hasUserPurchasedTrip(user.id, trip.id);

  const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key);

  const handleBooking = () => {
    if (!user) {
      // Save intention to redirect back? For now simple redirect
      navigate('/login');
      return;
    }
    if (user.role !== 'CLIENT') {
      alert('Apenas clientes podem realizar compras. Entre com uma conta de Cliente.');
      return;
    }
    
    const voucherCode = `VS-${Date.now().toString(36).toUpperCase()}`;
    
    addBooking({
      id: `b${Date.now()}`,
      tripId: trip.id,
      clientId: user.id,
      date: new Date().toISOString(),
      status: 'CONFIRMED',
      totalPrice,
      passengers,
      voucherCode,
      paymentMethod: 'CREDIT_CARD'
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
    alert('Avaliação enviada com sucesso!');
  };

  // Helper for fallback image
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=60';
  };

  // Dynamic Headline Generator based on Trip Data
  const getDynamicHeadline = () => {
    const city = trip.destination.split(',')[0].trim();
    const duration = `${trip.durationDays} Dias`;
    
    switch (trip.category) {
        case 'PRAIA': return `🌞 Sol e Mar: ${duration} relaxando em ${city}`;
        case 'AVENTURA': return `⚡ Aventura Pura: ${duration} explorando ${city}`;
        case 'ROMANTICO': return `❤️ Escapada Romântica: ${duration} inesquecíveis em ${city}`;
        case 'FAMILIA': return `👨‍👩‍👧‍👦 Diversão em Família: ${duration} em ${city}`;
        case 'NATUREZA': return `🍃 Imersão na Natureza: ${duration} em ${city}`;
        case 'GASTRONOMICO': return `🍷 Sabores de ${city}: Roteiro de ${duration}`;
        case 'URBANO': return `🏙️ City Tour: ${duration} descobrindo ${city}`;
        case 'VIDA_NOTURNA': return `🎉 Agito e Diversão: ${duration} em ${city}`;
        default: return `✨ Experiência Exclusiva: ${duration} em ${city}`;
    }
  };

  // Function to render description safely (detecting HTML vs Plain Text)
  const renderDescription = (desc: string) => {
      // Simple heuristic: starts with HTML tag or contains common tags
      const isHTML = /<[a-z][\s\S]*>/i.test(desc) || desc.includes('<p>') || desc.includes('<ul>') || desc.includes('<strong>');
      
      if (isHTML) {
          return (
              <div 
                className="prose prose-blue max-w-none text-gray-600 leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4"
                dangerouslySetInnerHTML={{ __html: desc }} 
              />
          );
      }
      // Fallback for old plain text descriptions
      return <p className="leading-relaxed whitespace-pre-line">{desc}</p>;
  };

  const mainImage = trip.images && trip.images.length > 0 ? trip.images[0] : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=60';
  // Create a safe gallery array even if images are missing
  const galleryImages = trip.images && trip.images.length > 0 
    ? trip.images.slice(1).concat([trip.images[0], trip.images[0]]).slice(0, 4)
    : [mainImage, mainImage, mainImage, mainImage];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-primary-600">Home</Link> 
          <span className="mx-2">/</span>
          <Link to="/trips" className="hover:text-primary-600">Viagens</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{trip.title}</span>
      </div>

      {/* Images Grid - Gallery Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-8 h-[400px] md:h-[500px] shadow-lg">
        <div className="md:col-span-2 h-full relative group">
           <img 
            src={mainImage} 
            alt="Main" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            onError={handleImageError}
           />
           <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-2 h-full">
          {galleryImages.map((img, idx) => (
            <div key={idx} className="relative group overflow-hidden">
                <img 
                    src={img} 
                    alt={`Gallery ${idx}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    onError={handleImageError}
                />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Header Info */}
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-primary-100">{trip.category.replace('_', ' ')}</span>
              {agency?.subscriptionStatus === 'ACTIVE' && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-green-100 flex items-center"><ShieldCheck size={12} className="mr-1"/> Verificado</span>
              )}
            </div>
            
            {/* Dynamic Title Section */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{trip.title}</h1>
            <p className="text-lg md:text-xl font-medium text-primary-600 mb-5">{getDynamicHeadline()}</p>
            
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
               <div className="flex items-center"><MapPin className="text-primary-500 mr-2" size={18}/> {trip.destination}</div>
               <div className="flex items-center"><Clock className="text-primary-500 mr-2" size={18}/> {trip.durationDays} Dias de Duração</div>
               <div className="flex items-center font-medium"><Star className="text-amber-400 fill-current mr-2" size={18}/> {trip.rating.toFixed(1)} <span className="text-gray-400 font-normal ml-1">({trip.totalReviews} avaliações)</span></div>
            </div>

            {/* Tags & Travelers Display */}
            <div className="flex flex-wrap gap-4 mt-6">
                {trip.tags && trip.tags.length > 0 && (
                    <div className="flex items-start">
                         <Tag size={16} className="text-gray-400 mr-2 mt-1" />
                         <div className="flex flex-wrap gap-2">
                             {trip.tags.map((tag, i) => (
                                 <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">{tag}</span>
                             ))}
                         </div>
                    </div>
                )}
                {trip.travelerTypes && trip.travelerTypes.length > 0 && (
                    <div className="flex items-start">
                         <Users size={16} className="text-gray-400 mr-2 mt-1" />
                         <div className="flex flex-wrap gap-2">
                             {trip.travelerTypes.map((type, i) => (
                                 <span key={i} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-medium uppercase">{type.replace('_', ' ')}</span>
                             ))}
                         </div>
                    </div>
                )}
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          {/* Description */}
          <div className="text-gray-600">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>
            {renderDescription(trip.description)}
          </div>

          {/* Agency Card */}
          {agency && (
             <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center gap-6 hover:shadow-md transition-shadow">
                <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm" />
                <div className="flex-1">
                   <p className="text-xs text-gray-500 uppercase font-bold mb-1">Organizado por</p>
                   <h4 className="text-xl font-bold text-gray-900 mb-1">{agency.name}</h4>
                   <p className="text-sm text-gray-600 line-clamp-1 mb-3">{agency.description}</p>
                   <Link to={`/agency/${agency.id}`} className="text-primary-600 text-sm font-bold hover:underline">
                     Ver perfil da agência &rarr;
                   </Link>
                </div>
             </div>
          )}

          {/* Accordions */}
          <div className="space-y-4">
             <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleAccordion('included')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-900">
                    <span>O que está incluído</span>
                    {openAccordion === 'included' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>
                {openAccordion === 'included' && (
                    <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 animate-[fadeIn_0.2s]">
                        {trip.included.map((item, i) => (
                            <div key={i} className="flex items-start"><Check size={18} className="text-green-500 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>
                        ))}
                    </div>
                )}
             </div>
             
             {trip.notIncluded && trip.notIncluded.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => toggleAccordion('notIncluded')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-900">
                        <span>O que NÃO está incluído</span>
                        {openAccordion === 'notIncluded' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                    {openAccordion === 'notIncluded' && (
                        <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 animate-[fadeIn_0.2s]">
                            {trip.notIncluded.map((item, i) => (
                                <div key={i} className="flex items-start"><X size={18} className="text-red-400 mr-2 mt-0.5 shrink-0" /> <span className="text-gray-600 text-sm">{item}</span></div>
                            ))}
                        </div>
                    )}
                </div>
             )}

             <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => toggleAccordion('faq')} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-bold text-gray-900">
                    <span>Perguntas Frequentes</span>
                    {openAccordion === 'faq' ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                </button>
                {openAccordion === 'faq' && (
                    <div className="p-4 bg-white space-y-4 animate-[fadeIn_0.2s]">
                       <div>
                          <p className="font-bold text-sm text-gray-900">Posso cancelar?</p>
                          <p className="text-sm text-gray-600">Cancelamentos gratuitos até 7 dias antes da viagem.</p>
                       </div>
                       <div>
                          <p className="font-bold text-sm text-gray-900">É seguro?</p>
                          <p className="text-sm text-gray-600">Sim, todas as agências são verificadas pela ViajaStore.</p>
                       </div>
                    </div>
                )}
             </div>
          </div>

          {/* Reviews Section */}
          <div className="pt-10 mt-10 border-t border-gray-200">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                   <MessageCircle className="mr-3" /> Avaliações ({reviews.length})
                </h3>
                {trip.rating > 0 && (
                    <div className="flex items-center bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                        <Star className="text-amber-400 fill-current mr-2" size={24} />
                        <span className="text-2xl font-bold text-amber-900">{trip.rating.toFixed(1)}</span>
                        <span className="text-amber-700 text-sm ml-2 font-medium">/ 5.0</span>
                    </div>
                )}
             </div>
             
             {/* Review Form */}
             {canReview && (
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 mb-10">
                 <h4 className="font-bold text-gray-900 mb-3">Como foi sua experiência?</h4>
                 <form onSubmit={handleSubmitReview}>
                    <div className="flex items-center gap-2 mb-4">
                        {[1,2,3,4,5].map(star => (
                            <button type="button" key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 focus:outline-none">
                                <Star size={28} className={`${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input 
                            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500" 
                            placeholder="Conte detalhes da sua viagem..."
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            required
                        />
                        <button type="submit" className="bg-primary-600 text-white px-6 rounded-xl hover:bg-primary-700 font-bold transition-colors flex items-center">
                            Enviar <Send size={16} className="ml-2" />
                        </button>
                    </div>
                 </form>
               </div>
             )}

             <div className="space-y-6">
               {reviews.length > 0 ? reviews.map(review => (
                 <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center">
                           <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 mr-3">
                              {review.clientName.charAt(0)}
                           </div>
                           <div>
                               <p className="font-bold text-gray-900">{review.clientName}</p>
                               <div className="flex text-amber-400 text-xs">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={10} className={i < review.rating ? "fill-current" : "text-gray-200"} />
                                    ))}
                                </div>
                           </div>
                       </div>
                       <span className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-600 text-sm pl-14 leading-relaxed">{review.comment}</p>
                    {review.response && (
                        <div className="ml-14 mt-3 bg-gray-50 p-3 rounded-lg border-l-4 border-primary-300">
                            <p className="text-xs font-bold text-primary-700 mb-1">Resposta da Agência:</p>
                            <p className="text-xs text-gray-600">{review.response}</p>
                        </div>
                    )}
                 </div>
               )) : (
                 <div className="text-center py-10">
                    <p className="text-gray-500 italic">Seja o primeiro a avaliar esta viagem!</p>
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Sidebar / Booking Card */}
        <div className="lg:col-span-1 relative">
          <div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 z-10">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1 font-medium">A partir de</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">R$ {trip.price}</span>
                <span className="text-gray-500">/ pessoa</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Datas</div>
                <div className="flex items-center font-bold text-gray-800">
                  <Calendar size={18} className="mr-2 text-primary-500" />
                  {new Date(trip.startDate).toLocaleDateString('pt-BR')} - {new Date(trip.endDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Viajantes</div>
                <select 
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full bg-transparent outline-none font-bold text-gray-800 cursor-pointer"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Pessoa' : 'Pessoas'}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
              <span className="text-gray-600 font-medium">Total estimado</span>
              <span className="font-bold text-2xl text-primary-600">R$ {totalPrice.toLocaleString()}</span>
            </div>

            {user?.role === 'AGENCY' || user?.role === 'ADMIN' ? (
                <button 
                    disabled
                    className="w-full bg-gray-200 text-gray-500 font-bold py-4 rounded-xl cursor-not-allowed text-center"
                >
                    Reserva indisponível para {user.role === 'ADMIN' ? 'Admins' : 'Agências'}
                </button>
            ) : (
                <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30 active:scale-95"
                >
                Reservar Agora
                </button>
            )}
            
            <div className="mt-4 text-center space-y-2">
               <div className="flex items-center justify-center text-xs text-gray-500 font-medium gap-1">
                  <ShieldCheck size={14} className="text-green-500" /> Garantia de Melhor Preço
               </div>
               <p className="text-gray-400 text-xs">Não cobramos taxas de reserva.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl animate-[scaleIn_0.2s_ease-out] relative">
             <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Confirmar sua Reserva</h2>
            
            <div className="bg-blue-50 p-5 rounded-xl mb-6 border border-blue-100">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 text-sm">Viagem</span>
                <span className="font-bold text-gray-900 text-right text-sm max-w-[200px] truncate">{trip.title}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 text-sm">Data</span>
                <span className="font-medium text-gray-900 text-sm">{new Date(trip.startDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between mb-4 border-b border-blue-200 pb-4">
                <span className="text-gray-600 text-sm">Passageiros</span>
                <span className="font-medium text-gray-900 text-sm">{passengers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-bold">Total a pagar</span>
                <span className="text-xl font-extrabold text-primary-700">R$ {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Método de Pagamento (Simulado)</p>
              <div className="grid grid-cols-1 gap-3">
                 <label className="flex items-center p-4 border border-primary-500 bg-primary-50 rounded-xl cursor-pointer transition-all">
                    <input type="radio" name="payment" defaultChecked className="w-5 h-5 text-primary-600 focus:ring-primary-500" />
                    <span className="ml-3 font-bold text-primary-900">Cartão de Crédito</span>
                    <span className="ml-auto text-xs bg-white text-primary-600 px-2 py-1 rounded font-bold">Recomendado</span>
                 </label>
                 <label className="flex items-center p-4 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-all opacity-60">
                    <input type="radio" name="payment" disabled className="w-5 h-5 text-gray-300" />
                    <span className="ml-3 font-medium text-gray-500">PIX (Indisponível no protótipo)</span>
                 </label>
              </div>
            </div>

            <button 
              onClick={handleBooking}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition-all text-lg"
            >
              Pagar e Confirmar Reserva
            </button>
            
            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center">
               <Lock size={12} className="mr-1"/> Ambiente 100% Seguro
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;
