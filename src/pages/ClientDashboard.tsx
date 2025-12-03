

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address, AgencyReview, Agency } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star, MessageCircle, Send, ExternalLink, Edit } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useToast } from '../context/ToastContext';
import { slugify } from '../utils/slugify';

// Helper function to build the WhatsApp URL
const buildWhatsAppUrl = (phone: string | null | undefined, tripTitle: string) => {
  if (!phone) return null;

  // Sanitize phone number to digits only
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const message = `Olá, tenho uma dúvida sobre minha viagem "${tripTitle}".`;
  const encoded = encodeURIComponent(message);

  return `https://wa.me/${digits}?text=${encoded}`;
};


const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword, loading: authLoading } = useAuth();
  // FIX: Removed `tripImages` from useData destructuring. `getTripById` already provides images.
  const { bookings, getTripById, clients, agencies, addAgencyReview, getReviewsByClientId, deleteAgencyReview, updateAgencyReview, refreshData } = useData();
  const { showToast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null); 
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<AgencyReview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for profile saving

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const navigate = useNavigate();

  const { agencySlug, tab } = useParams<{ agencySlug?: string; tab?: string }>();
  const activeTab = tab ? tab.toUpperCase() : 'PROFILE';
  
  const isMicrositeMode = !!agencySlug;

  const dataContextClient = clients.find(c => c.id === user?.id);
  const currentClient = dataContextClient || (user as any);

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: currentClient?.phone || '',
    cpf: currentClient?.cpf || ''
  });

  const [addressForm, setAddressForm] = useState<Address>({
     zipCode: currentClient?.address?.zipCode || '',
     street: currentClient?.address?.street || '',
     number: currentClient?.address?.number || '',
     complement: currentClient?.address?.complement || '',
     district: currentClient?.address?.district || '',
     city: currentClient?.address?.city || '',
     state: currentClient?.address?.state || ''
  });

  const [passForm, setPassForm] = useState({
     newPassword: '',
     confirmPassword: ''
  });

  useEffect(() => {
    if (!authLoading && user?.role === 'AGENCY' && !window.location.hash.includes('dashboard')) {
      const agencyUser = user as Agency;
      const slug = agencyUser.slug || slugify(agencyUser.name);
      navigate(`/${slug}`);
    } else if (!authLoading && user && user.role !== UserRole.CLIENT) {
      navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized', { replace: true });
    }
  }, [user, authLoading, isMicrositeMode, agencySlug, navigate]);
  
  useEffect(() => {
    if(editingReview) {
      setReviewForm({ rating: editingReview.rating, comment: editingReview.comment });
      setShowEditReviewModal(true);
    } else {
      setShowEditReviewModal(false);
    }
  }, [editingReview]);

  // VOUCHER MODAL: Add ESC key listener and overlay click
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBooking(null);
      }
    };
    if (selectedBooking) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [selectedBooking]);

  if (authLoading || !user || user.role !== UserRole.CLIENT) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-primary-600" size={32} /></div>;
  }

  const myBookings = bookings.filter(b => b.clientId === user.id);
  const myReviews = getReviewsByClientId(user.id);
  
  const favoriteIds = dataContextClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => getTripById(id)).filter((t: any) => t !== undefined);

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const url = await uploadImage(e.target.files[0], 'avatars');
      if (url) {
          await updateUser({ avatar: url });
      }
      setUploading(false);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressForm({ ...addressForm, zipCode: value });

    const cleanCep = value.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setAddressForm(prev => ({
            ...prev,
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    const res = await updateUser({ 
        name: editForm.name, 
        email: editForm.email,
        phone: editForm.phone,
        cpf: editForm.cpf,
        address: addressForm
    });
    
    setIsSaving(false);
    if (res.success) showToast('Perfil atualizado com sucesso!', 'success');
    else showToast('Erro ao atualizar: ' + res.error, 'error');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passForm.newPassword !== passForm.confirmPassword) {
          showToast('As senhas não coincidem.', 'error');
          return;
      }
      const res = await updatePassword(passForm.newPassword);
      if (res.success) {
          showToast('Senha alterada com sucesso!', 'success');
          setPassForm({ newPassword: '', confirmPassword: '' });
      } else {
          showToast('Erro: ' + res.error, 'error');
      }
  };

  const handleDeleteAccount = async () => {
      const confirm = window.confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
      if (confirm) {
          const result = await deleteAccount();
          if (result.success) {
              navigate('/');
          } else {
              showToast("Erro ao excluir conta: " + result.error, 'error');
          }
      }
  };

  const handleDeleteReview = async (id: string) => {
      if(window.confirm('Excluir sua avaliação?')) {
          await deleteAgencyReview(id);
      }
  };

  const generatePDF = () => {
      if (!selectedBooking) return;
      
      // Dynamically resolve trip and agency from global state
      const trip = getTripById(selectedBooking.tripId);
      const agency = trip ? agencies.find(a => a.agencyId === trip.agencyId) : undefined;

      if (!trip) {
          showToast('Não foi possível carregar todos os dados para o voucher. Tente novamente.', 'error');
          return;
      }

      try {
        const doc = new jsPDF();
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('VOUCHER DE VIAGEM', 105, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        let y = 60;
        const addField = (label: string, value: string) => { doc.setFont('helvetica', 'bold'); doc.text(label, 20, y); doc.setFont('helvetica', 'normal'); doc.text(value, 70, y); y += 10; };
        addField('Código da Reserva:', selectedBooking.voucherCode);
        addField('Passageiro Principal:', user.name);
        addField('CPF:', currentClient?.cpf || 'Não informado');
        y += 5;
        addField('Pacote:', trip.title || '---');
        addField('Destino:', trip.destination || '---');
        // Trip details are now direct on the trip object
        const dateStr = trip.startDate;
        addField('Data da Viagem:', dateStr ? new Date(dateStr).toLocaleDateString() : '---');
        const duration = trip.durationDays;
        addField('Duração:', `${duration} Dias`);
        y += 5;
        addField('Agência Responsável:', agency?.name || 'ViajaStore Partner');
        if (agency?.phone) addField('Contato Agência:', agency.phone);
        y += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y, 190, y);
        y += 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Instruções', 20, y);
        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('1. Apresente este voucher (digital ou impresso) no momento do check-in.', 20, y);
        y += 6;
        doc.text('2. É obrigatória a apresentação de documento original com foto.', 20, y);
        y += 6;
        doc.text('3. Chegue com pelo menos 30 minutos de antecedência ao ponto de encontro.', 20, y);
        y = 280;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Emitido por ViajaStore - O maior marketplace de viagens do Brasil.', 105, y, { align: 'center' });
        doc.save(`voucher_${selectedBooking.voucherCode}.pdf`);
      } catch (error) {
          console.error('Erro ao gerar PDF:', error);
          showToast('Ocorreu um erro ao gerar o PDF. Tente novamente.', 'error');
      }
  };

  const openWhatsApp = () => {
    if (!selectedBooking) return;
    
    // Dynamically resolve trip and agency from global state
    const trip = getTripById(selectedBooking.tripId);
    const agency = trip ? agencies.find(a => a.agencyId === trip.agencyId) : undefined;
    
    if (!trip || !agency) {
        showToast('Não foi possível carregar os dados da viagem ou agência.', 'error');
        return;
    }

    const phone = agency.phone || agency.whatsapp;
    if (!phone) return;

    const digits = phone.replace(/\D/g, '');
    const tripTitle = trip.title || 'minha viagem';
    const msg = `Olá! Tenho uma dúvida sobre minha viagem "${tripTitle}".`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBooking || isSubmitting) return;
      setIsSubmitting(true);
      try {
          const trip = getTripById(selectedBooking.tripId);
          await addAgencyReview({
              agencyId: trip?.agencyId, 
              clientId: user.id,
              bookingId: selectedBooking.id,
              rating: reviewForm.rating,
              comment: reviewForm.comment,
              trip_id: selectedBooking.tripId // Associate review with the specific trip
          });
          setShowReviewModal(false);
          setSelectedBooking(null);
          setReviewForm({ rating: 5, comment: '' });
          await refreshData();
      } catch (error) {
          console.error(error);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleEditReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || isSubmitting) return;
    setIsSubmitting(true);
    try {
        await updateAgencyReview(editingReview.id, {
            rating: reviewForm.rating,
            comment: reviewForm.comment,
        });
        setEditingReview(null);
        setReviewForm({ rating: 5, comment: '' });
        await refreshData();
    } catch(err) {
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getNavLink = (tab: string) => isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`;

  return (
    <div className="max-w-6xl mx-auto py-6">
      {!isMicrositeMode && <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6 relative group">
             <div className="relative w-24 h-24 mx-auto mb-4">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-24 h-24 rounded-full border-4 border-primary-50 object-cover" />
                 <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md transition-transform hover:scale-110">
                     <Camera size={14} />
                     <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                 </label>
                 {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full"><div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>}
             </div>
             <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
             <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[ { id: 'PROFILE', icon: User, label: 'Meu Perfil' }, { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' }, { id: 'REVIEWS', icon: Star, label: 'Minhas Avaliações' }, { id: 'FAVORITES', icon: Heart, label: 'Favoritos' }, { id: 'SETTINGS', icon: Settings, label: 'Dados & Endereço' }, { id: 'SECURITY', icon: Shield, label: 'Segurança' } ].map((item) => ( <Link key={item.id} to={getNavLink(item.id)} className={getTabClass(item.id)}> <item.icon size={18} className="mr-3" /> {item.label} </Link> ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <button onClick={handleLogout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent transition-colors"> <LogOut size={18} className="mr-3" /> Sair da Conta </button>
          </nav>
        </div>

        <div className="lg:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-bold text-gray-900">Resumo do Perfil</h2> <Link to={getNavLink('SETTINGS')} className="text-primary-600 text-sm font-bold hover:underline">Editar Dados</Link> </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-gray-50 p-4 rounded-xl"> <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label> <p className="text-gray-900 font-medium">{user.name}</p> </div>
                 <div className="bg-gray-50 p-4 rounded-xl"> <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label> <p className="text-gray-900 font-medium">{user.email}</p> </div>
                 <div className="bg-gray-50 p-4 rounded-xl"> <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label> <p className="text-gray-900 font-medium">{currentClient?.cpf || '---'}</p> </div>
                 <div className="bg-gray-50 p-4 rounded-xl"> <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label> <p className="text-gray-900 font-medium">{currentClient?.phone || '---'}</p> </div>
               </div>
               <div className="mt-10 grid grid-cols-3 gap-4">
                    <div className="border border-gray-100 rounded-xl p-4 text-center"> <p className="text-3xl font-bold text-primary-600">{myBookings.length}</p> <p className="text-xs text-gray-500 uppercase font-bold mt-1">Viagens</p> </div>
                    <div className="border border-gray-100 rounded-xl p-4 text-center"> <p className="text-3xl font-bold text-amber-500">{favoriteTrips.length}</p> <p className="text-xs text-gray-500 uppercase font-bold mt-1">Favoritos</p> </div>
               </div>
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-6 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    // Dynamically resolve trip and agency from global state
                    const trip = getTripById(booking.tripId);
                    const agency = trip ? agencies.find(a => a.agencyId === trip.agencyId) : undefined;
                    
                    if (!trip) return null;
                    
                    const imgUrl = trip.images?.[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem';
                    const startDate = trip.startDate;
                    const hasReviewed = myReviews.some(r => r.bookingId === booking.id);
                    const agencySlugForNav = agency?.slug; // Use resolved agency
                    const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, trip.title);

                    return (
                      <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <img src={imgUrl} alt={trip.title} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                           <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{trip.title}</h3>
                           {agency && ( <Link to={`/${agency.slug || ''}`} className="text-sm text-primary-600 hover:underline font-medium mb-3 block"> Organizado por {agency.name} </Link> )}
                           <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                             <div className="flex items-center text-gray-600"><MapPin size={16} className="mr-2" /> {trip.destination}</div>
                             <div className="flex items-center text-gray-600"><Calendar size={16} className="mr-2 text-gray-400" /> {startDate ? new Date(startDate).toLocaleDateString() : '---'}</div>
                           </div>
                           <div className="flex gap-2 flex-wrap">
                               <button onClick={() => setSelectedBooking(booking)} className="bg-primary-600 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm">
                                    <QrCode size={16} /> Abrir Voucher
                               </button>
                               <button 
                                  onClick={() => {
                                    if (agencySlugForNav) {
                                      navigate(`/${agencySlugForNav}?tab=REVIEWS`);
                                    } else {
                                      showToast('Não foi possível encontrar a página da agência.', 'error');
                                    }
                                  }}
                                  disabled={!agencySlugForNav}
                                  className="bg-amber-50 text-amber-600 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-amber-100 transition-colors border border-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Star size={16} /> {hasReviewed ? 'Ver/Editar Avaliação' : 'Avaliar Agência'}
                               </button>
                               {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#25D366] text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-[#128C7E] transition-colors shadow-sm"
                                >
                                  <MessageCircle size={16} /> Falar com a Agência
                                </a>
                               )}
                           </div>
                        </div>
                      </div>
                    );
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> <ShoppingBag size={32} className="text-gray-300 mx-auto mb-4" /> <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3> <p className="text-gray-500 mt-1">Você ainda não reservou nenhuma viagem.</p> </div>
               )}
             </div>
           )}

           {activeTab === 'REVIEWS' && (
               <div className="space-y-6 animate-[fadeIn_0.3s]">
                   <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Avaliações</h2>
                   {myReviews.length > 0 ? (
                       <div className="space-y-4">
                           {myReviews.map(review => (
                               <div key={review.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                   <div className="flex justify-between items-start mb-3">
                                       <div className="flex items-center gap-4">
                                           <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border border-gray-200"> {review.agencyLogo ? <img src={review.agencyLogo} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200"/>} </div>
                                           <div> <h4 className="font-bold text-gray-900">{review.agencyName}</h4> <div className="flex text-amber-400 text-sm"> {[...Array(5)].map((_,i) => <Star key={i} size={12} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />)} </div> </div>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <button onClick={() => setEditingReview(review)} className="text-gray-400 hover:text-primary-500 p-2 rounded-full hover:bg-primary-50 transition-colors" aria-label="Editar avaliação"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteReview(review.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" aria-label="Excluir avaliação"><Trash2 size={16}/></button>
                                       </div>
                                   </div>
                                   <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-xl italic">"{review.comment}"</p>
                                   <div className="mt-4 flex justify-end"> <Link to={`/${review.agencyName ? slugify(review.agencyName) : ''}`} className="text-xs font-bold text-primary-600 hover:underline flex items-center">Ver Página da Agência <ExternalLink size={12} className="ml-1"/></Link> </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> <Star size={32} className="text-gray-300 mx-auto mb-4" /> <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação</h3> <p className="text-gray-500 mt-1">Você ainda não avaliou nenhuma agência.</p> </div>
                   )}
               </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos ({favoriteTrips.length})</h2>
               {favoriteTrips.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {favoriteTrips.map((trip: any) => (trip && <TripCard key={trip.id} trip={trip} />))} </div> ) : ( <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> <Heart size={32} className="text-gray-300 mx-auto mb-4" /> <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3> <p className="text-gray-500 mt-2">Você ainda não favoritou nenhuma viagem.</p> </div> )}
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Pessoais & Endereço</h2>
               <form onSubmit={handleSaveProfile} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2"> <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label> <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Email</label> <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">CPF</label> <input value={editForm.cpf} onChange={(e) => setEditForm({...editForm, cpf: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="000.000.000-00" /> </div>
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label> <input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                  </div>
                  <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1 relative"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label> <input value={addressForm.zipCode} onChange={handleCepChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="00000-000" /> {loadingCep && <div className="absolute right-3 top-8"><Loader size={14} className="animate-spin text-primary-600"/></div>} </div>
                          <div className="md:col-span-3"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label> <input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label> <input value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comp.</label> <input value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-2"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label> <input value={addressForm.district}