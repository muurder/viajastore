
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address, AgencyReview, Agency, Trip, Client } from '../types';
import { TripCard } from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star, MessageCircle, Send, ExternalLink, Edit, Briefcase, Smile, Plane, Compass, Users } from 'lucide-react';
import { useNavigate, useParams, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { generateTripVoucherPDF } from '../utils/pdfGenerator';
import { slugify } from '../utils/slugify';
import { logger } from '../utils/logger';

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

// Helper function for dynamic greetings
const getRandomGreeting = (userName: string) => {
  const greetings = [
    `Pronto para decolar, ${userName}? 🚀`,
    `O mundo te espera, ${userName}! 🌍`,
    `Que bom ter você de volta, ${userName}! ✨`,
    `Sua próxima aventura começa aqui, ${userName}? 🗺️`,
    `Vamos planejar algo incrível, ${userName}? ✈️`,
    `Novas memórias aguardam, ${userName}! 📸`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
};

// Component to handle booking card with dynamic image loading
interface BookingCardProps {
  booking: Booking;
  trip: Trip;
  agency: Agency | null;
  hasReviewed: boolean;
  onOpenVoucher: (booking: Booking) => void;
  fetchTripImages?: (tripId: string, forceRefresh?: boolean) => Promise<string[]>;
  currentClient?: Client | null;
  user?: any;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, trip, agency, hasReviewed, onOpenVoucher, fetchTripImages, currentClient, user }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tripWithImages, setTripWithImages] = useState<Trip>(trip);
  const [imgError, setImgError] = useState(false);

  // Load images on mount if they don't exist
  useEffect(() => {
    const loadImages = async () => {
      // If trip already has images, use them
      if (trip.images && trip.images.length > 0) {
        setTripWithImages(trip);
        return;
      }
      
      // Otherwise, try to fetch images
      if (fetchTripImages) {
        try {
          const images = await fetchTripImages(trip.id);
          if (images && images.length > 0) {
            setTripWithImages({ ...trip, images });
          } else {
            setTripWithImages(trip);
          }
        } catch (error) {
          // Silently fail - will show placeholder
          setTripWithImages(trip);
        }
      } else {
        setTripWithImages(trip);
      }
    };

    loadImages();
  }, [trip, fetchTripImages]);

  // Update when trip prop changes
  useEffect(() => {
    setTripWithImages(trip);
    setImgError(false);
  }, [trip]);

  const imgUrl = tripWithImages.images?.[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem';
  const startDate = tripWithImages.startDate;
  const agencySlugForNav = agency?.slug;
  const whatsappUrl = buildWhatsAppUrl(agency?.whatsapp || agency?.phone, tripWithImages.title);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
      {!imgError ? (
        <img 
          src={imgUrl} 
          alt={tripWithImages.title} 
          className="w-full md:w-48 h-32 object-cover rounded-xl"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full md:w-48 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
          <span className="text-gray-400 text-sm">Sem Imagem</span>
        </div>
      )}
      <div className="flex-1">
         <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-1">{tripWithImages.title}</h3>
         {agency && ( <Link to={`/${agency.slug || ''}`} className="text-sm text-primary-600 hover:underline font-medium mb-3 block"> Organizado por {agency.name} </Link> )}
         <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
           <div className="flex items-center text-gray-600"><MapPin size={16} className="mr-2" /> {tripWithImages.destination}</div>
           <div className="flex items-center text-gray-600"><Calendar size={16} className="mr-2 text-gray-400" /> {startDate ? new Date(startDate).toLocaleDateString() : '---'}</div>
         </div>
         <div className="flex gap-2 flex-wrap">
            <button 
              onClick={async () => {
                // Generate PDF directly with all passenger data
                try {
                  const { supabase } = await import('../services/supabase');
                  if (!supabase) {
                    showToast('Erro ao conectar com o banco de dados.', 'error');
                    return;
                  }

                  // Fetch all passengers from database
                  const { data: passengersData, error: passengersError } = await supabase
                    .from('booking_passengers')
                    .select('*')
                    .eq('booking_id', booking.id)
                    .order('created_at', { ascending: true });

                  if (passengersError) {
                    logger.error('Error fetching passengers:', passengersError);
                  }

                  // Prepare passengers array
                  let passengers: any[] = [];
                  
                  if (passengersData && passengersData.length > 0) {
                    passengers = passengersData.map(p => {
                      // Format document
                      let formattedDoc = p.document || p.cpf || '---';
                      if (formattedDoc && formattedDoc !== '---') {
                        const digits = formattedDoc.replace(/\D/g, '');
                        if (digits.length === 11) {
                          formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                        }
                      }
                      
                      // Determine type
                      let passengerType: string | undefined;
                      if (p.age !== undefined && p.age !== null) {
                        passengerType = p.age < 12 ? 'child' : 'adult';
                      } else if (p.birth_date) {
                        try {
                          const today = new Date();
                          const birth = new Date(p.birth_date);
                          if (!isNaN(birth.getTime())) {
                            let age = today.getFullYear() - birth.getFullYear();
                            const monthDiff = today.getMonth() - birth.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                              age--;
                            }
                            passengerType = age < 12 ? 'child' : 'adult';
                          }
                        } catch (err) {
                          logger.warn('Error calculating age:', err);
                        }
                      }
                      
                      return {
                        name: p.full_name || p.name || '---',
                        document: formattedDoc,
                        birthDate: p.birth_date || p.birthDate,
                        type: passengerType,
                        age: p.age,
                        full_name: p.full_name
                      };
                    });
                  } else if (booking.passengerDetails && booking.passengerDetails.length > 0) {
                    // Fallback to booking.passengerDetails
                    passengers = booking.passengerDetails.map((p: any) => {
                      let formattedDoc = p.document || p.cpf || '---';
                      if (formattedDoc && formattedDoc !== '---') {
                        const digits = formattedDoc.replace(/\D/g, '');
                        if (digits.length === 11) {
                          formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                        }
                      }
                      return {
                        name: p.name || '---',
                        document: formattedDoc,
                        birthDate: p.birthDate || p.birth_date,
                        type: p.type || (p.age !== undefined ? (p.age < 12 ? 'child' : 'adult') : undefined)
                      };
                    });
                  } else {
                    // Last resort: use client as main passenger
                    let formattedDoc = currentClient?.cpf || '---';
                    if (formattedDoc && formattedDoc !== '---') {
                      const digits = formattedDoc.replace(/\D/g, '');
                      if (digits.length === 11) {
                        formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                      }
                    }
                    passengers = [{
                      name: currentClient?.name || user?.name || 'Cliente',
                      document: formattedDoc,
                      type: 'adult'
                    }];
                  }

                  logger.info(`Generating PDF from BookingCard with ${passengers.length} passenger(s):`, passengers.map(p => ({ name: p.name, document: p.document })));

                  // Generate PDF using unified function
                  await generateTripVoucherPDF({
                    booking,
                    trip,
                    agency: agency || null,
                    passengers,
                    voucherCode: booking.voucherCode,
                    client: currentClient || null
                  });

                  showToast('PDF gerado com sucesso!', 'success');
                } catch (error: any) {
                  logger.error('Error generating PDF from BookingCard:', error);
                  showToast(error?.message || 'Erro ao gerar o PDF. Tente novamente.', 'error');
                }
              }}
              className="bg-primary-600 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm"
            >
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
               <MessageCircle size={16} className="fill-white/20"/> Falar com a Agência
             </a>
            )}
         </div>
      </div>
    </div>
  );
};

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword, loading: authLoading, reloadUser } = useAuth();
  const { bookings, getTripById, clients, addAgencyReview, getReviewsByClientId, deleteAgencyReview, updateAgencyReview, refreshUserData: refreshAllData, getPublicTrips, trips, updateClientProfile, fetchTripImages } = useData();
  const { showToast } = useToast();
  
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [bookingPassengers, setBookingPassengers] = useState<any[]>([]); 
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<AgencyReview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for profile saving

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', tags: [] as string[] });
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const navigate = useNavigate();

  const { agencySlug, tab } = useParams<{ agencySlug?: string; tab?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const impersonateClientId = searchParams.get('impersonate');
  const activeTab = tab ? tab.toUpperCase() : 'PROFILE';
  
  const isMicrositeMode = !!agencySlug;

  // Impersonate logic: if admin is impersonating, use that client's data
  const impersonatedClient = impersonateClientId ? clients.find(c => c.id === impersonateClientId) : null;
  const isImpersonating = !!impersonateClientId && user?.role === 'ADMIN';

  // Ensure impersonate parameter is preserved when navigating
  useEffect(() => {
    if (isImpersonating && impersonateClientId && !searchParams.get('impersonate')) {
      setSearchParams({ impersonate: impersonateClientId }, { replace: true });
    }
  }, [isImpersonating, impersonateClientId, searchParams, setSearchParams]);

  // Ensure user is defined before accessing its id or role
  const dataContextClient = isImpersonating && impersonatedClient 
    ? impersonatedClient 
    : (user ? clients.find(c => c.id === user.id) : undefined);
  const currentClient = dataContextClient || (user as any); // Fallback to basic user if dataContextClient is undefined

  // Fix: Initialize with empty defaults, will be populated by useEffect
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: ''
  });

  // Fix: Initialize with empty defaults, will be populated by useEffect
  const [addressForm, setAddressForm] = useState<Address>(() => ({
     zipCode: '',
     street: '',
     number: '',
     complement: '',
     district: '',
     city: '',
     state: ''
  }));

  const [passForm, setPassForm] = useState({
     newPassword: '',
     confirmPassword: ''
  });

  // State for account deletion password
  const [passwordToDelete, setPasswordToDelete] = useState('');
  
  // State for password change loading
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // State for suggested trips
  const [suggestedTrips, setSuggestedTrips] = useState<Trip[]>([]);

  const [greeting, setGreeting] = useState('');

  // --- Data Reactivity Fix: Refresh data on mount/focus ---
  // Use ref to track if we're currently saving to avoid refresh loops
  const isSavingRef = useRef(false);
  const hasRefreshedRef = useRef(false);
  
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const handleRefresh = useCallback(async () => {
    // Skip refresh if currently saving to avoid loops
    if (isSavingRef.current) return;
    
    // Only refresh if user is a client and not currently loading auth
    if (!authLoading && user?.role === UserRole.CLIENT) {
      await refreshAllData(); // Calls DataContext's refreshUserData
      // FIX: Pass the current user object to reloadUser
      await reloadUser(user); // Reload AuthContext's user to get latest favorites/profile
    }
  }, [authLoading, user?.role, user?.id, refreshAllData, reloadUser]); // Use specific user properties instead of whole user object

  useEffect(() => {
    // Only refresh on mount once, not on every user change
    if (!authLoading && user?.role === UserRole.CLIENT && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      handleRefresh();
    }

    // Add event listener for window focus
    const handleFocus = () => {
      if (!isSavingRef.current && hasRefreshedRef.current) {
        handleRefresh();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authLoading, user?.role, handleRefresh]); // Only depend on authLoading and role, not whole user object
  // --- END Data Reactivity Fix ---

  // Generate greeting on mount - use impersonated client name if impersonating
  useEffect(() => {
    const nameToUse = isImpersonating && impersonatedClient?.name 
      ? impersonatedClient.name 
      : user?.name;
    if (nameToUse) {
      setGreeting(getRandomGreeting(nameToUse.split(' ')[0]));
    }
  }, [user?.name, isImpersonating, impersonatedClient?.name]);

  // Load and shuffle suggested trips
  useEffect(() => {
    const allTrips = getPublicTrips();
    if (allTrips.length > 0) {
      // Fisher-Yates shuffle for better randomness
      const shuffled = [...allTrips].sort(() => Math.random() - 0.5);
      // Select first 3 trips
      setSuggestedTrips(shuffled.slice(0, 3));
    } else {
      setSuggestedTrips([]);
    }
  }, [trips, getPublicTrips]); // Re-shuffle when trips data changes

  // Effect to update forms when currentClient changes
  useEffect(() => {
      if (currentClient) {
          setEditForm({
              name: currentClient.name || '',
              email: currentClient.email || '',
              phone: currentClient.phone || '',
              cpf: currentClient.cpf || '',
              birthDate: currentClient.birthDate || ''
          });
          setAddressForm(currentClient.address || {
              zipCode: '', street: '', number: '', complement: '', district: '', city: '', state: ''
          });
      }
  }, [currentClient]);


  useEffect(() => {
    if (!authLoading && user?.role === 'AGENCY' && !window.location.hash.includes('dashboard')) {
      const agencyUser = user as Agency;
      const slug = agencyUser.slug || slugify(agencyUser.name);
      navigate(`/${slug}`);
    } else if (!authLoading && user && user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN && !isImpersonating) {
      // Allow ADMIN to access client dashboard without impersonation
      navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized', { replace: true });
    }
  }, [user, authLoading, isMicrositeMode, agencySlug, navigate, isImpersonating]);
  
  useEffect(() => {
    if(editingReview) {
      setReviewForm({ rating: editingReview.rating, comment: editingReview.comment, tags: editingReview.tags || [] });
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

  // Fetch passengers when booking is selected
  useEffect(() => {
    const fetchPassengers = async () => {
      if (!selectedBooking) {
        setBookingPassengers([]);
        return;
      }
      
      try {
        const { supabase } = await import('../services/supabase');
        if (supabase) {
          const { data, error } = await supabase
            .from('booking_passengers')
            .select('*')
            .eq('booking_id', selectedBooking.id)
            .order('created_at', { ascending: true });
          
          if (!error && data) {
            logger.info(`Loaded ${data.length} passengers for booking ${selectedBooking.id}:`, data.map(p => ({ name: p.full_name, document: p.document || p.cpf, birth_date: p.birth_date })));
            setBookingPassengers(data);
          } else {
            logger.warn(`No passengers found for booking ${selectedBooking.id}`, error);
            setBookingPassengers([]);
          }
        }
      } catch (err) {
        logger.error('Error fetching passengers:', err);
        setBookingPassengers([]);
      }
    };

    fetchPassengers();
  }, [selectedBooking]);

  // Allow access if user is CLIENT, ADMIN (can access directly), or ADMIN impersonating a client
  if (authLoading || !user || (user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN && !isImpersonating)) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader className="animate-spin text-slate-600" size={32} /></div>;
  }

  // Use up-to-date values from DataContext - use impersonated client ID if impersonating
  const effectiveClientId = isImpersonating && impersonatedClient ? impersonatedClient.id : user.id;
  const myBookings = bookings.filter(b => b.clientId === effectiveClientId);
  const myReviews = getReviewsByClientId(effectiveClientId);
  
  const favoriteIds = currentClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => getTripById(id)).filter((t: Trip | undefined) => t !== undefined) as Trip[]; // Cast to Trip[]

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      try {
        const url = await uploadImage(e.target.files[0], 'avatars');
        if (url) {
            if (isImpersonating && impersonatedClient) {
              // If admin is impersonating, use updateClientProfile to update the impersonated client
              await updateClientProfile(impersonatedClient.id, { avatar: url });
              showToast('Foto de perfil atualizada!', 'success');
              await refreshAllData(); // Refresh to show updated avatar
            } else {
              // Normal user update
              const result = await updateUser({ avatar: url });
              if (result.success) {
                // Reload user data to refresh avatar immediately
                await reloadUser();
                await refreshAllData(); // Also refresh all data context
                showToast('Foto de perfil atualizada!', 'success');
              } else {
                showToast('Erro ao atualizar foto: ' + (result.error || 'Erro desconhecido'), 'error');
              }
            }
            // Reset input to allow selecting the same file again
            e.target.value = '';
        } else {
          showToast('Erro ao fazer upload da foto.', 'error');
        }
      } catch (error: any) {
        showToast('Erro ao fazer upload da foto: ' + (error.message || 'Erro desconhecido'), 'error');
      } finally {
        setUploading(false);
      }
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
            street: data.logradouro || '',
            district: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || ''
          }));
        } else {
            showToast('CEP não encontrado.', 'warning');
        }
      } catch (error) {
        logger.error("Erro ao buscar CEP", error);
        showToast('Erro ao buscar CEP. Verifique a conexão.', 'error');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    isSavingRef.current = true; // Set flag immediately to prevent refresh loops
    
    try {
      if (isImpersonating && impersonatedClient) {
        // If admin is impersonating, use updateClientProfile to update the impersonated client
        await updateClientProfile(impersonatedClient.id, {
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          cpf: editForm.cpf,
          birthDate: editForm.birthDate,
          address: addressForm
        });
        showToast('Perfil atualizado com sucesso!', 'success');
        // Refresh data to show updated values
        setTimeout(async () => {
          await refreshAllData();
          isSavingRef.current = false;
        }, 500);
      } else {
        // Normal user update
        const res = await updateUser({ 
            name: editForm.name, 
            email: editForm.email,
            phone: editForm.phone,
            cpf: editForm.cpf,
            birthDate: editForm.birthDate,
            address: addressForm
        });
        
        if (res.success) {
          showToast('Perfil atualizado com sucesso!', 'success');
          // Reload user data to refresh the form with updated values
          // Use a small delay to let the DB update propagate
          setTimeout(async () => {
            if (user) {
              // Force refresh of DataContext first to get updated client data
              await refreshAllData();
              // Then reload user from AuthContext
              await reloadUser(user);
            }
            // Reset flag after reload completes
            isSavingRef.current = false;
          }, 500);
        } else {
          showToast('Erro ao atualizar: ' + (res.error || 'Erro desconhecido'), 'error');
          isSavingRef.current = false;
        }
      }
    } catch (error: any) {
      logger.error('Error saving profile:', error);
      showToast('Erro ao atualizar perfil. Tente novamente.', 'error');
      isSavingRef.current = false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Prevent multiple submissions
      if (isChangingPassword) return;
      
      // Validations
      if (passForm.newPassword !== passForm.confirmPassword) {
          showToast('As senhas não coincidem.', 'error');
          return;
      }
      if (passForm.newPassword.length < 6) {
          showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
          return;
      }
      
      setIsChangingPassword(true);
      
      try {
          const res = await updatePassword(passForm.newPassword);
          if (res.success) {
              // Success feedback
              showToast('Senha alterada com sucesso!', 'success');
              // Clear form fields
              setPassForm({ newPassword: '', confirmPassword: '' });
          } else {
              // Error feedback
              showToast('Erro: ' + (res.error || 'Não foi possível alterar a senha. Tente novamente.'), 'error');
          }
      } catch (error: any) {
          logger.error('Error changing password:', error);
          showToast('Erro ao alterar senha. Tente novamente.', 'error');
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handleDeleteAccount = async () => {
      // FIX: Require password for account deletion
      if (!passwordToDelete) {
          showToast('Por favor, digite sua senha para confirmar a exclusão.', 'warning');
          return;
      }

      const confirm = window.confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
      if (confirm) {
          const result = await deleteAccount(passwordToDelete); // Pass password
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
          showToast('Avaliação excluída!', 'success');
      }
  };

  const generatePDF = async () => {
      if (!selectedBooking) return;
      const trip = selectedBooking._trip;
      const agency = selectedBooking._agency; 

      if (!trip) {
          showToast('Não foi possível carregar todos os dados para o voucher. Tente novamente.', 'error');
          return;
      }

      try {
        // ALWAYS fetch passengers fresh from database to ensure we have the latest data
        let passengersData: any[] = [];
        
        try {
          const { supabase } = await import('../services/supabase');
          if (supabase) {
            logger.info(`🔍 Fetching passengers for booking ${selectedBooking.id}...`);
            const { data, error } = await supabase
              .from('booking_passengers')
              .select('*')
              .eq('booking_id', selectedBooking.id)
              .order('created_at', { ascending: true });
            
            if (error) {
              logger.error('❌ Error fetching passengers from database:', error);
              logger.error('Error details:', JSON.stringify(error, null, 2));
            } else if (data) {
              passengersData = data;
              logger.info(`✅ Found ${data.length} passengers in database for booking ${selectedBooking.id}`);
              logger.info('Raw database records:', JSON.stringify(data, null, 2));
              data.forEach((p, idx) => {
                logger.info(`  DB Record ${idx + 1}:`, {
                  id: p.id,
                  booking_id: p.booking_id,
                  full_name: p.full_name,
                  document: p.document,
                  cpf: p.cpf,
                  birth_date: p.birth_date,
                  is_primary: p.is_primary,
                  created_at: p.created_at
                });
              });
            } else {
              logger.warn('⚠️ No passengers data returned from query (data is null/undefined)');
            }
          }
        } catch (err) {
          logger.error('Error fetching passengers:', err);
        }
        
        // If database fetch failed, try using state
        if (passengersData.length === 0 && bookingPassengers.length > 0) {
          logger.info('Using passengers from state as fallback');
          passengersData = bookingPassengers;
        }

        // Use EXACTLY the same logic as CheckoutSuccess
        // Priority: database passengers > booking.passengerDetails > empty array (same as CheckoutSuccess)
        let passengers: any[] = [];
        
        logger.info('=== PASSENGER DATA ANALYSIS ===');
        logger.info(`Raw passengersData from DB: ${passengersData.length} records`);
        logger.info('Raw data:', JSON.stringify(passengersData, null, 2));
        logger.info(`Booking passengerDetails: ${selectedBooking.passengerDetails?.length || 0} records`);
        logger.info('Booking passengerDetails data:', JSON.stringify(selectedBooking.passengerDetails, null, 2));
        
        if (passengersData.length > 0) {
          // Convert database format to PassengerDetail format (EXACTLY as CheckoutSuccess receives from state)
          passengers = passengersData.map((p, idx) => {
            // Get document - keep raw digits, pdfGenerator will format
            const rawDoc = p.document || p.cpf || '';
            const docDigits = rawDoc.replace(/\D/g, '');
            
            const passenger = {
              name: p.full_name || p.name || `Passageiro ${idx + 1}`,
              document: docDigits || '---', // Raw digits, same as CheckoutSuccess
              cpf: docDigits || undefined, // Keep for compatibility
              birthDate: p.birth_date || p.birthDate || undefined,
              type: (() => {
                // Calculate type same way as CheckoutSuccess would
                if (p.age !== undefined && p.age !== null) {
                  return p.age < 12 ? 'child' : 'adult';
                }
                if (p.birth_date) {
                  try {
                    const today = new Date();
                    const birth = new Date(p.birth_date);
                    if (!isNaN(birth.getTime())) {
                      let age = today.getFullYear() - birth.getFullYear();
                      const monthDiff = today.getMonth() - birth.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                        age--;
                      }
                      return age < 12 ? 'child' : 'adult';
                    }
                  } catch (err) {
                    // Silent fail, let pdfGenerator determine
                  }
                }
                return undefined; // Let pdfGenerator determine
              })(),
              age: p.age
            };
            
            logger.info(`Passenger ${idx + 1}:`, {
              name: passenger.name,
              document: passenger.document,
              type: passenger.type,
              birthDate: passenger.birthDate,
              rawData: p
            });
            
            return passenger;
          });
          
          logger.info(`✅ Converted ${passengers.length} passengers from database (CheckoutSuccess format)`);
        } else if (selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0) {
          // Use booking.passengerDetails directly (EXACT format as CheckoutSuccess receives)
          passengers = selectedBooking.passengerDetails.map((p: any, idx: number) => {
            const passenger = {
              name: p.name || `Passageiro ${idx + 1}`,
              document: p.document || p.cpf || '---',
              cpf: p.cpf || p.document || undefined,
              birthDate: p.birthDate || p.birth_date || undefined,
              type: p.type || undefined,
              age: p.age
            };
            
            logger.info(`Passenger ${idx + 1} from booking.passengerDetails:`, passenger);
            
            return passenger;
          });
          logger.info(`✅ Using ${passengers.length} passengers from booking.passengerDetails`);
        } else {
          // Empty array (EXACT same as CheckoutSuccess fallback)
          passengers = [];
          logger.warn('⚠️ No passengers found - using empty array');
        }
        
        logger.info(`=== FINAL PASSENGERS ARRAY: ${passengers.length} ===`);
        passengers.forEach((p, idx) => {
          logger.info(`  [${idx + 1}] ${p.name} | Doc: ${p.document} | Type: ${p.type || 'undefined'}`);
        });

        // Final validation and logging
        logger.info('=== FINAL PDF GENERATION DEBUG ===');
        logger.info(`Booking ID: ${selectedBooking.id}`);
        logger.info(`Voucher Code: ${selectedBooking.voucherCode}`);
        logger.info(`Passengers from database: ${passengersData.length}`);
        logger.info(`Passengers formatted: ${passengers.length}`);
        logger.info(`Booking passengerDetails: ${selectedBooking.passengerDetails?.length || 0}`);
        logger.info('=== FINAL PASSENGERS ARRAY TO PDF ===');
        passengers.forEach((p, idx) => {
          logger.info(`  [${idx + 1}] Name: "${p.name}" | Document: "${p.document}" | Type: "${p.type || 'undefined'}" | BirthDate: "${p.birthDate || 'none'}"`);
        });
        
        if (passengers.length === 0) {
          logger.error('❌ CRITICAL: NO PASSENGERS FOUND FOR PDF!');
          logger.error('Raw database data:', JSON.stringify(passengersData, null, 2));
          logger.error('Booking passengerDetails:', JSON.stringify(selectedBooking.passengerDetails, null, 2));
          logger.error('Booking object:', JSON.stringify(selectedBooking, null, 2));
          showToast('Atenção: Nenhum passageiro encontrado. O PDF será gerado apenas com dados básicos.', 'warning');
        } else {
          logger.info(`✅ Generating PDF with ${passengers.length} passenger(s) - ALL SHOULD APPEAR IN PDF`);
        }

        // Call with EXACTLY the same parameters as CheckoutSuccess
        logger.info('=== CALLING generateTripVoucherPDF ===');
        logger.info(`Passengers count: ${passengers.length}`);
        logger.info('Passengers array:', JSON.stringify(passengers, null, 2));
        
        await generateTripVoucherPDF({
          booking: selectedBooking,
          trip,
          agency: agency || null,
          passengers, // Same format as CheckoutSuccess
          voucherCode: selectedBooking.voucherCode,
          client: currentClient || null
        });
        
        logger.info('✅ PDF generation completed');
      } catch (error: any) {
          logger.error('Erro ao gerar PDF:', error);
          showToast(error?.message || 'Ocorreu um erro ao gerar o PDF. Tente novamente.', 'error');
      }
  };

  const openWhatsApp = () => {
    if (!selectedBooking) return;
    const phone = selectedBooking._agency?.phone || selectedBooking._agency?.whatsapp;
    if (!phone) {
        showToast('Nenhum contato de WhatsApp disponível para esta agência.', 'info');
        return;
    }

    const digits = phone.replace(/\D/g, '');
    const tripTitle = selectedBooking._trip?.title || 'minha viagem';
    const msg = `Olá! Tenho uma dúvida sobre minha viagem "${tripTitle}".`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedBooking || isSubmitting) return;
      setIsSubmitting(true);
      try {
          await addAgencyReview({
              agencyId: selectedBooking._trip?.agencyId || selectedBooking._trip?.agency_id, // Ensure agencyId is correctly accessed
              clientId: user.id,
              bookingId: selectedBooking.id,
              rating: reviewForm.rating,
              comment: reviewForm.comment,
              tags: reviewForm.tags
          });
          setShowReviewModal(false);
          setSelectedBooking(null);
          setReviewForm({ rating: 5, comment: '', tags: [] });
          showToast('Avaliação enviada com sucesso!', 'success');
      } catch (error) {
          logger.error(error);
          showToast('Erro ao enviar avaliação.', 'error');
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
            tags: reviewForm.tags
        });
        setEditingReview(null);
        setReviewForm({ rating: 5, comment: '', tags: [] });
        showToast('Avaliação atualizada com sucesso!', 'success');
    } catch(err) {
        logger.error(err);
        showToast('Erro ao atualizar avaliação.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Helper to preserve impersonate parameter in links
  const preserveImpersonate = (url: string) => {
    if (isImpersonating && impersonateClientId) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}impersonate=${impersonateClientId}`;
    }
    return url;
  };

  const getNavLink = (tab: string) => {
    const baseLink = isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
    // Preserve impersonate parameter if in impersonate mode
    return preserveImpersonate(baseLink);
  };
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-slate-50 text-slate-900 border-slate-900' : 'border-transparent text-slate-600 hover:bg-slate-50'}`;

  // Helper for ReviewForm tags
  const toggleReviewTag = (tag: string) => {
    setReviewForm(prev => {
      const newTags = prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const SUGGESTED_REVIEW_TAGS = ['Atendimento', 'Organização', 'Custo-benefício', 'Hospedagem', 'Passeios', 'Pontualidade'];


  return (
    <div className="max-w-[1600px] mx-auto py-6">
      {/* Admin Impersonate Banner */}
      {isImpersonating && (
        <div className="mb-6 bg-amber-50 border-b border-amber-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" size={20} />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Modo Admin - Visualização</p>
              <p className="text-xs text-amber-700">Você está visualizando o painel como: <strong>{currentClient?.name || impersonatedClient?.name}</strong></p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard?tab=USERS')}
            className="px-4 py-2 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-semibold text-sm transition-colors"
          >
            Voltar ao Admin
          </button>
        </div>
      )}

      {!isMicrositeMode && <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center mb-6 relative">
             <div className="relative w-24 h-24 mx-auto mb-4 border-4 border-slate-200 rounded-full bg-slate-100 shadow-sm">
                 <img 
                   key={user?.avatar || currentClient?.avatar || 'avatar'} 
                   src={currentClient?.avatar || user?.avatar || `https://ui-avatars.com/api/?name=${currentClient?.name || user?.name || 'Cliente'}`} 
                   alt={currentClient?.name || user?.name || 'Cliente'} 
                   className="w-full h-full rounded-full object-cover" 
                 />
                 <label className="absolute bottom-0 right-0 bg-white text-slate-700 p-2 rounded-full cursor-pointer hover:bg-slate-100 shadow-md transition-transform hover:scale-110 border border-slate-200">
                     <Camera size={14} />
                     <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                 </label>
                 {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full"><div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div></div>}
             </div>
             <h2 className="text-xl font-semibold text-slate-900 truncate">{currentClient?.name || user?.name || 'Cliente'}</h2>
             <p className="text-sm text-slate-600 font-light truncate">{greeting}</p> {/* Dynamic Greeting */}
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[ { id: 'PROFILE', icon: User, label: 'Meu Perfil' }, { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' }, { id: 'REVIEWS', icon: Star, label: 'Minhas Avaliações' }, { id: 'FAVORITES', icon: Heart, label: 'Favoritos' }, { id: 'SETTINGS', icon: Settings, label: 'Dados & Endereço' }, { id: 'SECURITY', icon: Shield, label: 'Segurança' } ].map((item) => ( <Link key={item.id} to={getNavLink(item.id)} className={getTabClass(item.id)}> <item.icon size={18} className="mr-3" /> {item.label} </Link> ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <button onClick={handleLogout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent transition-colors"> <LogOut size={18} className="mr-3" /> Sair da Conta </button>
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-semibold text-slate-900">Resumo do Perfil</h2> <Link to={getNavLink('SETTINGS')} className="text-slate-600 text-sm font-semibold hover:text-slate-900 hover:underline">Editar Dados</Link> </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Stat Card: Viagens */}
                 <div className="bg-slate-50 p-6 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                    <div className="bg-white p-3 rounded-full shadow-sm text-slate-700"><Plane size={24} strokeWidth={1.5}/></div>
                    <div>
                        <p className="text-3xl font-semibold text-slate-900">{myBookings.length}</p>
                        <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Viagens Reservadas</p>
                    </div>
                 </div>
                 {/* Stat Card: Favoritos */}
                 <div className="bg-slate-50 p-6 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                    <div className="bg-white p-3 rounded-full shadow-sm text-slate-700"><Heart size={24} strokeWidth={1.5}/></div>
                    <div>
                        <p className="text-3xl font-semibold text-slate-900">{favoriteTrips.length}</p>
                        <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Viagens Favoritas</p>
                    </div>
                 </div>
               </div>

               {/* Profile Details */}
               <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nome</label> <p className="text-slate-900 font-medium">{currentClient?.name || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label> <p className="text-slate-900 font-medium">{currentClient?.email || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">CPF</label> <p className="text-slate-900 font-medium">{currentClient?.cpf || '---'}</p> </div>
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Telefone</label> <p className="text-slate-900 font-medium">{currentClient?.phone || '---'}</p> </div>
                 {currentClient?.address?.city && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-2"> <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Endereço</label> <p className="text-slate-900 font-medium">{currentClient.address.street}, {currentClient.address.number} - {currentClient.address.city}/{currentClient.address.state}</p> </div>
                 )}
               </div>

               {/* Suggested Trips Section */}
               {suggestedTrips.length > 0 && (
                 <div className="mt-12 pt-8 border-t border-gray-100">
                   <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                     <Compass size={24} className="text-slate-700" />
                     🌎 Inspire-se para sua próxima aventura
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {suggestedTrips.map((trip) => (
                       <TripCard key={trip.id} trip={trip} />
                     ))}
                   </div>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-6 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    const trip = booking._trip || getTripById(booking.tripId);
                    const agency = booking._agency; 
                    if (!trip) return null;
                    
                      return <BookingCard
                        currentClient={currentClient}
                        user={user}
                      key={booking.id} 
                      booking={booking} 
                      trip={trip} 
                      agency={agency}
                      hasReviewed={myReviews.some(r => r.bookingId === booking.id)}
                      onOpenVoucher={setSelectedBooking}
                      fetchTripImages={fetchTripImages}
                    />;
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                    <Plane size={32} className="text-gray-300 mx-auto mb-4" /> 
                    <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3> 
                    <p className="text-gray-500 mt-1 mb-6">Parece que você ainda não tem nenhuma reserva ativa.</p> 
                    <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                        <Compass size={16}/> Explorar Pacotes
                    </Link>
                 </div>
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
                       <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                          <MessageCircle size={32} className="text-gray-300 mx-auto mb-4" /> 
                          <h3 className="text-lg font-bold text-gray-900">Nenhuma avaliação</h3> 
                          <p className="text-gray-500 mt-1 mb-6">Você ainda não avaliou nenhuma agência. Que tal contar sua experiência?</p> 
                          <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                                <Compass size={16}/> Encontre sua próxima viagem
                          </Link>
                       </div>
                   )}
               </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos ({favoriteTrips.length})</h2>
               {favoriteTrips.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {favoriteTrips.map((trip: any) => (trip && <TripCard key={trip.id} trip={trip} />))} </div> ) : ( 
                <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200"> 
                    <Heart size={32} className="text-gray-300 mx-auto mb-4" /> 
                    <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3> 
                    <p className="text-gray-500 mt-2 mb-6">Você ainda não favoritou nenhuma viagem. Clique no coração para adicionar!</p> 
                    <Link to={isMicrositeMode ? `/${agencySlug}/trips` : '/trips'} className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 w-fit mx-auto hover:bg-primary-700">
                        <Compass size={16}/> Explorar Pacotes
                    </Link>
                </div> 
               )}
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
                      <div> <label className="block text-sm font-bold text-gray-700 mb-2">Data de Nascimento</label> <input type="date" value={editForm.birthDate} onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" /> </div>
                  </div>
                  <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1 relative"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label> <input value={addressForm.zipCode} onChange={handleCepChange} className="w-full border border-gray-300 rounded-lg p-2" placeholder="00000-000" /> {loadingCep && <div className="absolute right-3 top-8"><Loader size={14} className="animate-spin text-primary-600"/></div>} </div>
                          <div className="md:col-span-3"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label> <input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label> <input value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comp.</label> <input value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-2"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label> <input value={addressForm.district} onChange={e => setAddressForm({...addressForm, district: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-3"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label> <input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" /> </div>
                          <div className="md:col-span-1"> <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label> <input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" placeholder="UF" /> </div>
                      </div>
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
                  </button>
               </form>
             </div>
           )}

           {activeTab === 'SECURITY' && (
              <div className="space-y-6 animate-[fadeIn_0.3s]">
                  {/* Password Change Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <Lock className="text-primary-600" size={20} />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900">Alterar Senha</h2>
                      </div>
                      <form onSubmit={handleChangePassword} className="max-w-md space-y-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Nova Senha</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                      type="password" 
                                      value={passForm.newPassword} 
                                      onChange={e => setPassForm({...passForm, newPassword: e.target.value})} 
                                      className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                      required 
                                      minLength={6}
                                      placeholder="Mínimo 6 caracteres"
                                      disabled={isChangingPassword}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Nova Senha</label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                      type="password" 
                                      value={passForm.confirmPassword} 
                                      onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} 
                                      className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" 
                                      required 
                                      minLength={6}
                                      placeholder="Digite a senha novamente"
                                      disabled={isChangingPassword}
                                  />
                              </div>
                          </div>
                          <button 
                              type="submit" 
                              disabled={isChangingPassword}
                              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                              {isChangingPassword ? (
                                  <>
                                      <Loader size={18} className="animate-spin" />
                                      Alterando...
                                  </>
                              ) : (
                                  <>
                                      <Lock size={18} />
                                      Alterar Senha
                                  </>
                              )}
                          </button>
                      </form>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                      <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                          <AlertTriangle size={20} />
                          Zona de Perigo
                      </h3>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-6"> 
                          <p className="text-sm text-red-800 mb-4 leading-relaxed">
                              Ao excluir sua conta, todos os seus dados serão removidos permanentemente. 
                              Esta ação não pode ser desfeita.
                          </p> 
                          <div className="mb-4">
                              <label htmlFor="delete-password" className="block text-sm font-bold text-red-700 mb-2">
                                  Digite sua senha para confirmar
                              </label>
                              <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                                  <input
                                      id="delete-password"
                                      type="password"
                                      value={passwordToDelete}
                                      onChange={(e) => setPasswordToDelete(e.target.value)}
                                      className="w-full border border-red-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white text-gray-900 transition-all"
                                      placeholder="Sua senha atual"
                                  />
                              </div>
                          </div>
                          <button 
                              onClick={handleDeleteAccount} 
                              disabled={!passwordToDelete}
                              className="flex items-center justify-center gap-2 bg-white border-2 border-red-300 text-red-600 px-6 py-3 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-red-600 disabled:hover:border-red-300"
                          >
                              <Trash2 size={16} /> 
                              Excluir minha conta
                          </button> 
                      </div>
                  </div>
              </div>
           )}
        </div>
      </div>

      {selectedBooking && !showReviewModal && !showEditReviewModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => setSelectedBooking(null)}>
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 text-gray-600 hover:bg-white border border-gray-200 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-lg cursor-pointer"
                    aria-label="Fechar voucher"
                >
                    <X size={20} />
                </button>

                {/* TOP BANNER - Trip Image with Overlay (160px height) */}
                <div className="relative h-40 overflow-hidden">
                    {selectedBooking._trip?.images && selectedBooking._trip.images.length > 0 ? (
                        <>
                            <img 
                                src={selectedBooking._trip.images[0]} 
                                alt={selectedBooking._trip.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40"></div>
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-700"></div>
                    )}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                        <h3 className="text-2xl font-bold mb-2 drop-shadow-2xl">{selectedBooking._trip?.title || 'Pacote de Viagem'}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/95 font-medium">
                            <Calendar size={16} />
                            <span>{new Date(selectedBooking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                        {selectedBooking._trip?.destination && (
                            <div className="flex items-center gap-2 text-sm text-white/90 mt-1">
                                <MapPin size={14} />
                                <span>{selectedBooking._trip.destination}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BODY - White Background */}
                <div className="p-6 bg-white">
                    {/* Voucher Code - Large & Monospace */}
                    <div className="text-center mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Código da Reserva</p>
                        <p className="text-3xl font-mono font-bold text-primary-600 tracking-wider">{selectedBooking.voucherCode}</p>
                    </div>

                    {/* Grid: Data, Horário, Status */}
                    <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Data</p>
                            <p className="text-sm font-semibold text-gray-900">{new Date(selectedBooking.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
                            <p className="text-sm font-semibold text-green-600">
                                {selectedBooking.status === 'CONFIRMED' ? 'Confirmada' : 
                                 selectedBooking.status === 'PENDING' ? 'Pendente' : 'Cancelada'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Passageiros</p>
                            <p className="text-sm font-semibold text-gray-900">{selectedBooking.passengers || bookingPassengers.length || 1}</p>
                        </div>
                    </div>

                    {/* Dashed Separator (Picote Effect) */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t-2 border-dashed border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <div className="bg-white px-4">
                                <div className="w-20 h-20 mx-auto bg-white border-4 border-gray-200 rounded-2xl p-3 shadow-sm flex items-center justify-center">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedBooking.voucherCode)}`} 
                                        alt="QR Code" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Passengers List - Visual with Avatars */}
                    {(bookingPassengers.length > 0 || (selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0)) && (
                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                <Users size={16} className="text-gray-400"/>
                                Passageiros ({bookingPassengers.length > 0 ? bookingPassengers.length : selectedBooking.passengerDetails?.length || 0})
                            </p>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {bookingPassengers.length > 0 ? (
                                    bookingPassengers.map((passenger, idx) => {
                                        const doc = passenger.document || passenger.cpf || '---';
                                        const formattedDoc = doc !== '---' && /^\d{11}$/.test(doc.replace(/\D/g, '')) 
                                            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                                            : doc;
                                        const isChild = passenger.birth_date ? (() => {
                                            const age = new Date().getFullYear() - new Date(passenger.birth_date).getFullYear();
                                            return age < 12;
                                        })() : false;
                                        
                                        return (
                                            <div key={passenger.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 truncate">{passenger.full_name || passenger.name || 'Passageiro'}</span>
                                                        {isChild && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Criança</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{formattedDoc}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : selectedBooking.passengerDetails && selectedBooking.passengerDetails.length > 0 ? (
                                    selectedBooking.passengerDetails.map((p: any, idx: number) => {
                                        const doc = p.document || p.cpf || '---';
                                        const formattedDoc = doc !== '---' && /^\d{11}$/.test(doc.replace(/\D/g, '')) 
                                            ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                                            : doc;
                                        const isChild = p.birthDate ? (() => {
                                            const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                                            return age < 12;
                                        })() : false;
                                        
                                        return (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 truncate">{p.name || 'Passageiro'}</span>
                                                        {isChild && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Criança</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{formattedDoc}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : null}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons - Full Width */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={generatePDF} 
                            className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                        >
                            <Download size={20}/> 
                            Baixar PDF Oficial
                        </button>
                        {selectedBooking._agency && (selectedBooking._agency.whatsapp || selectedBooking._agency.phone) && (
                            <button 
                                onClick={openWhatsApp} 
                                className="w-full bg-white text-green-600 border-2 border-green-600 py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-green-50 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                            >
                                <MessageCircle size={20}/> 
                                WhatsApp da Agência
                            </button>
                        )}
                    </div>
                </div>
            </div>
         </div>
      )}

      {(showReviewModal && selectedBooking) || (showEditReviewModal && editingReview) ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]" onClick={() => { setShowReviewModal(false); setShowEditReviewModal(false); setSelectedBooking(null); setEditingReview(null); }}>
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6"> 
                      <h3 className="text-xl font-bold text-gray-900">{showEditReviewModal ? "Editar Avaliação" : "Avaliar Agência"}</h3> 
                      <button onClick={() => { setShowReviewModal(false); setShowEditReviewModal(false); setSelectedBooking(null); setEditingReview(null); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button> 
                  </div>
                  <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                      {(selectedBooking?._agency?.logo || editingReview?.agencyLogo) && ( <img src={selectedBooking?._agency?.logo || editingReview?.agencyLogo} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200"/> )}
                      <div> 
                          <p className="text-xs text-gray-500 uppercase font-bold">Agência</p> 
                          <p className="font-bold text-gray-900">{selectedBooking?._agency?.name || editingReview?.agencyName || 'Parceiro ViajaStore'}</p> 
                      </div>
                  </div>
                  <form onSubmit={showEditReviewModal ? handleEditReviewSubmit : handleReviewSubmit}>
                      <div className="mb-6 text-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sua Experiência</label>
                          <div className="flex justify-center gap-2"> {[1, 2, 3, 4, 5].map((star) => ( <button type="button" key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })} className="focus:outline-none transition-transform hover:scale-110"> <Star size={32} className={star <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} /> </button> ))} </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags (Opcional)</label>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTED_REVIEW_TAGS.map(tag => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => toggleReviewTag(tag)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${reviewForm.tags.includes(tag) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Comentário</label>
                          <textarea className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-primary-500 outline-none h-24 resize-none" placeholder="Conte como foi sua experiência com a agência..." value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} required/>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"> {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Send size={18}/>} {showEditReviewModal ? "Salvar Alterações" : "Enviar Avaliação"}</button>
                  </form>
              </div>
          </div>
      ) : null}
    </div>
  );
};

export default ClientDashboard;
