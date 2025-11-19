import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Lock, Search } from 'lucide-react';

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

export const CheckoutSuccess: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-[fadeIn_0.5s]">
    <div className="bg-green-100 p-6 rounded-full mb-6">
      <CheckCircle size={64} className="text-green-600" />
    </div>
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Compra Realizada com Sucesso!</h1>
    <p className="text-gray-500 mb-8 max-w-lg">
      Sua viagem está confirmada. Enviamos os detalhes para seu e-mail e o voucher já está disponível no seu painel.
    </p>
    <div className="flex gap-4">
      <Link to="/client/dashboard" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors">
        Ver Minhas Viagens
      </Link>
      <Link to="/" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
        Continuar Explorando
      </Link>
    </div>
  </div>
);

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