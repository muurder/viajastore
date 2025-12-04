

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address, AgencyReview, Agency } from '../types';
import { TripCard } from '../components/TripCard';
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
        // Fix: Access trip.startDate directly, remove trip.start_date
        const dateStr = trip.startDate;
        addField('Data da Viagem:', dateStr ? new Date(dateStr).toLocaleDateString() : '---');
        // Fix: Access trip.durationDays directly, remove trip.duration_days
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
    if (!phone) {
        showToast('Número de contato da agência não disponível.', 'error');
        return;
    }

    const digits = phone.replace(/\D/g, '');
    const tripTitle = trip.title || 'minha viagem';
    const msg = `Olá! Tenho uma dúvida sobre minha viagem "${tripTitle}".`;