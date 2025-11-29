import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MapPin, Calendar, Check, Clock, ShieldCheck, MessageCircle, X, ChevronDown, ChevronUp, Tag, Share2, CreditCard, Heart, Search, ArrowLeft } from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

const TripDetails: React.FC = () => {
  const { slug, tripSlug, agencySlug } = useParams<{ slug?: string; tripSlug?: string; agencySlug?: string }>();
  
  const activeTripSlug = tripSlug || slug;

  const { getTripBySlug, addBooking, agencies, toggleFavorite, clients, loading, getAgencyBySlug } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>('included');
  
  const trip = activeTripSlug ? getTripBySlug(activeTripSlug) : undefined;
  const contextAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;
  const isConsistent = !agencySlug || (trip && contextAgency && trip.agencyId === contextAgency.agencyId);

  useEffect(() => {
      if (trip) {
          document.title = `${trip.title} | ViajaStore`;
      }
      return () => {
          document.title = 'ViajaStore | O maior marketplace de viagens';
      };
  }, [trip]);
  
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!trip || !isConsistent) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="bg-gray-100 p-6 rounded-full mb-6">
          <Search size={48} className="text-gray-400" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Viagem não encontrada</h1>
        <p className="text-gray-500 mb-8 max-w-md">O pacote que você procura não existe ou não pertence a esta agência.</p>
        <Link to={agencySlug ? `/${agencySlug}` : "/trips"} className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          Voltar
        </Link>
      </div>
  );

  // Corrected: use 'agencyId' (PK) to find agency, not 'id' (user_id)
  const agency = agencies.find(a => a.agencyId === trip.agencyId);
  const totalPrice = trip.price * passengers;
  const whatsappLink = agency?.whatsapp ? buildWhatsAppLink(agency.whatsapp, trip) : null;
  
  const isFavorite = user?.role === 'CLIENT' && (clients.find(c => c.id === user.id)?.favorites.includes(trip.id));

  const handleFavorite = () => {
    if (!user) {
      navigate('/#login');
      return;
    }
    if (user.role !== 'CLIENT') {
      showToast('Apenas viajantes podem favoritar.', 'warning');
      return;
    }
    toggleFavorite(trip.id, user.id);
  };

  const handleShare = async () => {
    const shareData = {
      title: trip.title,
      text: `Confira esta viagem incrível: ${trip.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copiado para a área de transferência!', 'success');
      } catch (err) {
        showToast('Erro ao copiar link.', 'error');
      }
    }
  };

  const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key);

  const handleBooking = () => {
    if (!user) {
      navigate('/#login');
      return;
    }
    if (user.role !== 'CLIENT') {
      alert('Apenas clientes podem realizar compras. Entre com uma conta de Cliente.');
      return;
    }
    
    const voucherCode = `VS-${Date.now().toString(36).toUpperCase()}`;
    // Use UUID explicitly if needed, but addBooking in DataContext now handles randomUUID generation if not provided
    // We can generate here to be sure
    const bookingId = crypto.randomUUID();
    
    addBooking({
      id: bookingId,
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
    
    if (agencySlug) {
        navigate(`/${agencySlug}/checkout/success`);
    } else {
        navigate('/checkout/success');
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=60';
  };

  const renderDescription = (desc: string) => {
      const isHTML = /<[a-z][\s\S]*>/i.test(desc) || desc.includes('<p>') || desc.includes('<ul>') || desc.includes('<strong>');
      if (isHTML) {
          // Basic sanitization to prevent script injection. A proper library like DOMPurify would be better for production.
          const sanitizedDesc = desc.replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '');
          return (
              <div 
                className="prose prose-blue max-w-none text-gray-600 leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-6 [&>h3]:mb-3 [&>p]:mb-4 [&>a]:text-primary-600 [&>a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizedDesc }} 
              />
          );
      }
      return <p className="leading-relaxed whitespace-pre-line">{desc}</p>;
  };

  const mainImage = trip.images && trip.images.length > 0 ? trip.images[0] : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=60';
  const galleryImages = trip.images && trip.images.length > 0 
    ? trip.images.slice(1).concat([trip.images[0], trip.images[0]]).slice(0, 4)
    : [mainImage, mainImage, mainImage, mainImage];

  const homeLink = agencySlug ? `/${agencySlug}` : '/';
  const homeLabel = agencySlug ? (agency?.name || 'Agência') : 'Home';
  const tripsLink = agencySlug ? `/${agencySlug}/trips` : '/trips';
  const tripsLabel = agencySlug ? 'Pacotes' : 'Viagens';

  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      {/* Floating WhatsApp */}
      {whatsappLink && (
        <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-[60] p-4 bg-[#25D366] rounded-full text-white shadow-lg hover:bg-[#128C7E] hover:scale-110 transition-all lg:hidden animate-[scaleIn_0.5s]"
            title="Falar no WhatsApp"
        >
            <MessageCircle size={28} className="fill-current" />
        </a>
      )}

      <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link to={homeLink} className="hover:text-primary-600 flex items-center"><ArrowLeft size={12} className="mr-1"/> {homeLabel}</Link> 
          <span className="mx-2">/</span>
          <Link to={tripsLink} className="hover:text-primary-600">{tripsLabel}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{trip.title}</span>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-3xl overflow-hidden mb-8 h-[400px] md:h-[500px] shadow-lg">
        <div className="md:col-span-2 h-full relative group">
           <img src={mainImage} alt={trip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={handleImageError} />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-2 h-full">
          {galleryImages.map((img, idx) => (
            <div key={idx} className="relative group overflow-hidden">
                <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={handleImageError} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-primary-100">{trip.category.replace('_', ' ')}</span>
              {agency?.subscriptionStatus === 'ACTIVE' && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-green-100 flex items-center"><ShieldCheck size={12} className="mr-1"/> Verificado</span>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">{trip.title}</h1>
                
                <div className="flex items-center gap-3">
                  {whatsappLink && (
                      <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex px-5 py-3 rounded-full border bg-[#25D366] border-green-500 text-white hover:bg-[#128C7E] transition-all shadow-md hover:shadow-lg flex-shrink-0 items-center gap-2 font-bold text-sm"
                      >
                          <MessageCircle size={20} className="fill-white/20" />
                          <span>WhatsApp</span>
                      </a>
                  )}
                  <button onClick={handleShare} className="p-3 rounded-full border bg-white border-gray-200 text-gray-400 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm flex-shrink-0">
                      <Share2 size={24} />
                  </button>
                  <button
                      onClick={handleFavorite}
                      className={`p-3 rounded-full border transition-all shadow-sm flex-shrink-0 ${isFavorite ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'}`}
                  >
                      <Heart size={24} className={isFavorite ? "fill-current animate-[pulse_0.3s]" : ""} />
                  </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mt-4">
               <div className="flex items-center"><MapPin className="text-primary-500 mr-2" size={18}/> {trip.destination}</div>
               <div className="flex items-center"><Clock className="text-primary-500 mr-2" size={18}/> {trip.durationDays} Dias de Duração</div>
            </div>

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
            </div>
          </div>

          <div className="h-px bg-gray-200"></div>

          <div className="text-gray-600">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre a experiência</h3>
            {renderDescription(trip.description)}
          </div>

          {agency && !agencySlug && (
             <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center gap-6 hover:shadow-md transition-shadow">
                <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm" />
                <div className="flex-1">
                   <p className="text-xs text-gray-500 uppercase font-bold mb-1">Organizado por</p>
                   <h4 className="text-xl font-bold text-gray-900 mb-1">{agency.name}</h4>
                   <p className="text-sm text-gray-600 line-clamp-1 mb-3">{agency.description}</p>
                   <Link to={`/${agency.slug || agency.id}`} className="text-primary-600 text-sm font-bold hover:underline">
                     Ver perfil da agência &rarr;
                   </Link>
                </div>
             </div>
          )}

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
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 relative">
          <div className="sticky top-24 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 z-10">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1 font-medium">A partir de</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">R$ {trip.price.toLocaleString('pt-BR')}</span>
                <span className="text-gray-500">/ pessoa</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Datas</div>
                <div className="flex items-center font-bold text-gray-800">
                  <Calendar size={18} className="mr-2 text-primary-500" />
                  {new Date(trip.startDate).toLocaleDateString('pt-BR')} - {new Date(trip.endDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Viajantes</div>
                <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="w-full bg-transparent outline-none font-bold text-gray-800 cursor-pointer">
                  {[1,2,3,4,5,6,7,8,9,10].map(num => <option key={num} value={num}>{num} {num === 1 ? 'Pessoa' : 'Pessoas'}</option>)}
                </select>
              </div>
            </div>

            {trip.paymentMethods && trip.paymentMethods.length > 0 && (
                <div className="mb-6">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CreditCard size={14} className="mr-1.5"/> Formas de Pagamento</div>
                    <div className="flex flex-wrap gap-2">
                        {trip.paymentMethods.map(method => (
                            <span key={method} className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-md border border-gray-200">{method}</span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6 pb-6 border-t border-gray-100 pt-6">
              <span className="text-gray-600 font-medium">Total estimado</span>
              <span className="font-bold text-2xl text-primary-600">R$ {totalPrice.toLocaleString()}</span>
            </div>

            {whatsappLink && (
               <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/30 active:scale-95 flex items-center justify-center gap-2 mb-3">
                 <MessageCircle size={20} /> Falar com a agência
               </a>
            )}

            {user?.role === 'AGENCY' || user?.role === 'ADMIN' ? (
                <button disabled className="w-full bg-gray-200 text-gray-500 font-bold py-4 rounded-xl cursor-not-allowed text-center">
                    Reserva indisponível para {user.role === 'ADMIN' ? 'Admins' : 'Agências'}
                </button>
            ) : (
                <button onClick={() => setIsBookingModalOpen(true)} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30 active:scale-95">
                Reservar Agora
                </button>
            )}
            
            <div className="mt-4 text-center space-y-2">
               <div className="flex items-center justify-center text-xs text-gray-500 font-medium gap-1"><ShieldCheck size={14} className="text-green-500" /> Garantia de Melhor Preço</div>
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

            <button onClick={handleBooking} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition-all text-lg">
              Pagar e Confirmar Reserva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetails;