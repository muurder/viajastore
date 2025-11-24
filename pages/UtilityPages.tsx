import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, QrCode, Ticket, ArrowRight, AlertTriangle, Lock, Mail, ChevronRight } from 'lucide-react';

export const NotFound: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="bg-gray-100 p-6 rounded-full mb-6 text-gray-400">
        <AlertTriangle size={48} />
    </div>
    <h1 className="text-4xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
    <p className="text-gray-500 mb-8">O link que você seguiu pode estar quebrado ou a página foi removida.</p>
    <Link to="/" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors">
      Voltar para Home
    </Link>
  </div>
);

export const Unauthorized: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="bg-red-50 p-6 rounded-full mb-6 text-red-500">
        <Lock size={48} />
    </div>
    <h1 className="text-4xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
    <p className="text-gray-500 mb-8">Você não tem permissão para acessar esta página.</p>
    <Link to="/" className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors">
      Voltar para Home
    </Link>
  </div>
);

export const ForgotPassword: React.FC = () => (
    <div className="max-w-md mx-auto py-12 px-4">
        <div className="text-center mb-8">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                <Mail size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Recuperar Senha</h1>
            <p className="text-gray-500 mt-2">Digite seu email para receber um link de redefinição.</p>
        </div>
        
        <form className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input type="email" placeholder="seu@email.com" className="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" />
            </div>
            <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                Enviar Link <ChevronRight size={16} />
            </button>
        </form>
        
        <div className="text-center mt-6">
            <Link to="/#login" className="text-sm font-bold text-gray-400 hover:text-gray-600">Voltar para Login</Link>
        </div>
    </div>
);

export const CheckoutSuccess: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const linkDashboard = agencySlug ? `/${agencySlug}/client/dashboard` : '/client/dashboard';
  const linkTrips = agencySlug ? `/${agencySlug}/trips` : '/trips';

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-gray-50 animate-[fadeIn_0.5s]">
      
      {/* Ticket Visual Premium */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 group hover:-translate-y-1 transition-transform duration-500">
          {/* Top Section (Gradient) */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-800 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                  <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-md shadow-inner border border-white/30 animate-[scaleIn_0.6s_ease-out]">
                      <CheckCircle size={48} className="text-white drop-shadow-md" />
                  </div>
                  <h1 className="text-3xl font-extrabold mb-1 tracking-tight drop-shadow-sm">Reserva Confirmada!</h1>
                  <p className="text-green-100 text-sm font-medium bg-black/10 px-4 py-1 rounded-full mt-2">Sua aventura está garantida</p>
              </div>
          </div>

          {/* Ticket Body */}
          <div className="p-8 bg-white relative">
              {/* Perforated Line Effect */}
              <div className="absolute -top-3 left-0 w-full flex justify-between px-2 z-20">
                  {[...Array(12)].map((_,i) => <div key={i} className="w-4 h-4 bg-gray-50 rounded-full -mt-2"></div>)}
              </div>

              <div className="space-y-6 mt-2">
                  <div className="flex justify-between items-center border-b border-dashed border-gray-200 pb-6">
                      <div className="text-left">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Código da Reserva</p>
                          <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">#VS-{Math.floor(Math.random()*10000)}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Data da Compra</p>
                          <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div className="bg-gray-50 p-5 rounded-2xl flex items-center gap-5 border border-gray-100">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <QrCode size={56} className="text-gray-900" />
                      </div>
                      <div className="text-left flex-1">
                          <p className="text-xs text-gray-500 leading-snug mb-2">Apresente este código para a agência ou acesse seu painel.</p>
                          <div className="flex items-center text-xs font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded-md w-fit">
                             <Ticket size={12} className="mr-1.5"/> Voucher Digital Gerado
                          </div>
                      </div>
                  </div>

                  <div className="space-y-3 pt-2">
                      <Link to={linkDashboard} className="block w-full bg-gray-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-gray-900/20 hover:bg-black transition-all flex justify-center items-center gap-2 group/btn">
                          Ver Minhas Viagens <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform"/>
                      </Link>
                      <Link to={linkTrips} className="block w-full text-gray-500 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
                          Continuar Explorando
                      </Link>
                  </div>
              </div>
          </div>
      </div>
      
      <p className="text-gray-400 text-xs mt-8 max-w-xs mx-auto leading-relaxed flex items-center justify-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span> Enviamos um e-mail com os detalhes.
      </p>
    </div>
  );
};