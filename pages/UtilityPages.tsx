import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Lock, Search, Ticket, ArrowRight, Download, QrCode } from 'lucide-react';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabase';

// ... (NotFound, Unauthorized, CheckoutSuccess, ForgotPassword components remain the same)

export const NotFound: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div className="bg-gray-100 p-6 rounded-full mb-6">
      <Search size={48} className="text-gray-400" />
    </div>
    <h1 className="text-4xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
    <p className="text-gray-500 mb-8 max-w-md">O conteúdo que você procura não existe ou foi movido.</p>
    <Link to="/" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
      Voltar para o Início
    </Link>
  </div>
);

export const Unauthorized: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
    <div className="bg-red-50 p-6 rounded-full mb-6">
      <AlertTriangle size={48} className="text-red-500" />
    </div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
    <p className="text-gray-500 mb-8 max-w-md">Você não tem permissão para acessar esta página.</p>
    <Link to="/" className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
      Ir para Home
    </Link>
  </div>
);

export const CheckoutSuccess: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const linkDashboard = agencySlug ? `/${agencySlug}/client/BOOKINGS` : '/client/dashboard/BOOKINGS';
  const linkTrips = agencySlug ? `/${agencySlug}/trips` : '/trips';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-gray-50 animate-[fadeIn_0.5s]">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-green-600 p-8 text-white relative">
              <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/20 p-3 rounded-full mb-4 animate-[scaleIn_0.5s]">
                      <CheckCircle size={48} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold mb-1">Reserva Confirmada!</h1>
                  <p className="text-green-100 text-sm">Sua aventura está garantida.</p>
              </div>
          </div>
          <div className="p-8 bg-white relative">
              <div className="space-y-3 pt-2">
                  <Link to={linkDashboard} className="block w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2 group">
                      Ver Minhas Viagens <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                  </Link>
                  <Link to={linkTrips} className="block w-full text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">
                      Continuar Explorando
                  </Link>
              </div>
          </div>
      </div>
      <p className="text-gray-400 text-xs mt-8 max-w-xs mx-auto leading-relaxed">
          Enviamos um e-mail com todos os detalhes do seu pedido. Em caso de dúvidas, entre em contato com a agência.
      </p>
    </div>
  );
};

export const ForgotPassword: React.FC = () => {
  // ...
  return <></>;
};


// NEW VOUCHER PUBLIC PAGE
export const VoucherPage: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            if (!bookingId) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*, trips(*), profiles!bookings_client_id_fkey(full_name)')
                    .eq('id', bookingId)
                    .single();
                
                if (error) throw error;
                setBooking(data);
            } catch (err) {
                console.error("Error fetching voucher:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    if (loading) return <div>Carregando voucher...</div>;
    if (!booking) return <div>Voucher não encontrado.</div>;

    return (
        <div className="max-w-2xl mx-auto my-12 bg-white p-8 rounded-xl shadow-lg border">
            <h1 className="text-2xl font-bold text-center mb-6">Detalhes da Reserva</h1>
            <p><strong>Voucher:</strong> {booking.voucher_code}</p>
            <p><strong>Cliente:</strong> {booking.profiles.full_name}</p>
            <p><strong>Viagem:</strong> {booking.trips.title}</p>
            <p><strong>Data da Compra:</strong> {new Date(booking.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span className="font-bold text-green-600">{booking.status}</span></p>
        </div>
    );
};
