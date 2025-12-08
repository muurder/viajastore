import React, { useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Lock, Search, Ticket, ArrowRight, Download, QrCode, Share2, Users } from 'lucide-react';

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
  const location = useLocation();
  const state = location.state as { booking?: any; passengers?: {name: string, document: string}[] } | null;
  
  const booking = state?.booking;
  const passengers = state?.passengers || [];
  
  const linkDashboard = agencySlug ? `/${agencySlug}/client/dashboard` : '/client/dashboard';
  const linkTrips = agencySlug ? `/${agencySlug}/trips` : '/trips';

  // Use booking data if available, else fallback
  const voucherCode = booking?.voucherCode || `#VS-${Math.floor(Math.random()*10000)}`;
  const tripDate = booking?.date ? new Date(booking.date).toLocaleDateString() : new Date().toLocaleDateString();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Viagem ViajaStore',
          text: `Reservei minha viagem${booking?._trip ? ` para ${booking._trip.title}` : ''}! Voucher: ${voucherCode}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing', error);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`Reservei minha viagem! Voucher: ${voucherCode}`);
      alert('Informações copiadas para a área de transferência!');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-gray-50 animate-[fadeIn_0.5s]">
      
      {/* Ticket Visual */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Top Section (Green) */}
          <div className="bg-green-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/20 p-3 rounded-full mb-4 backdrop-blur-sm">
                      <CheckCircle size={48} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold mb-1">Reserva Confirmada!</h1>
                  <p className="text-green-100 text-sm">Sua aventura está garantida.</p>
              </div>
          </div>

          {/* Ticket Body */}
          <div className="p-8 bg-white relative">
              {/* Perforated Line Effect */}
              <div className="absolute -top-3 left-0 w-full flex justify-between px-2">
                  {[...Array(12)].map((_,i) => <div key={i} className="w-4 h-4 bg-gray-50 rounded-full -mt-2"></div>)}
              </div>

              <div className="space-y-6 mt-4">
                  <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-4">
                      <div className="text-left">
                          <p className="text-xs text-gray-400 uppercase font-bold">Código da Reserva</p>
                          <p className="text-xl font-mono font-bold text-gray-900">{voucherCode}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase font-bold">Data</p>
                          <p className="text-sm font-bold text-gray-900">{tripDate}</p>
                      </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-4">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(voucherCode)}`} 
                        alt="QR Code" 
                        className="w-16 h-16 object-contain mix-blend-multiply opacity-80"
                      />
                      <div className="text-left">
                          <p className="text-xs text-gray-500 leading-tight mb-1">Apresente este código ou acesse seu voucher digital no painel.</p>
                          <p className="text-xs font-bold text-primary-600 flex items-center"><Ticket size={12} className="mr-1"/> Voucher Digital</p>
                      </div>
                  </div>

                  {passengers.length > 0 && (
                    <div className="border-t border-dashed border-gray-200 pt-4">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1">
                            <Users size={12}/> Passageiros ({passengers.length})
                        </p>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar text-left">
                            {passengers.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-700 truncate max-w-[60%]">{p.name}</span>
                                    <span className="text-xs text-gray-400 font-mono">{p.document || '---'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                      <div className="flex gap-3">
                        <Link to={linkDashboard} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2 group text-sm">
                            Minhas Viagens <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                        </Link>
                        <button onClick={handleShare} className="bg-primary-50 text-primary-600 p-3 rounded-xl hover:bg-primary-100 transition-colors shadow-sm border border-primary-100" title="Compartilhar">
                            <Share2 size={20} />
                        </button>
                      </div>
                      <Link to={linkTrips} className="block w-full text-gray-500 py-2 rounded-xl font-bold text-xs hover:text-gray-700 transition-colors">
                          Continuar Explorando
                      </Link>
                  </div>
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
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 mb-4">
             <Lock className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
          <p className="text-sm text-gray-500 mt-2">Digite seu email para receber o link de recuperação.</p>
        </div>

        {!sent ? (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="seu@email.com" />
            </div>
            <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700">
              Enviar Link
            </button>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-gray-600 hover:text-primary-600">Voltar para o Login</Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 text-sm">
              Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada.
            </div>
            <Link to="/login" className="text-primary-600 font-bold hover:underline">Voltar para o Login</Link>
          </div>
        )}
      </div>
    </div>
  );
};