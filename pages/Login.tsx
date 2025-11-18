import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Lock, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, role)) {
      navigate('/');
    } else {
      setError('Usuário não encontrado. Verifique as credenciais de teste.');
    }
  };

  // Helpers for prototype ease of use
  const fillCredentials = (type: 'CLIENT' | 'AGENCY' | 'ADMIN') => {
    if (type === 'CLIENT') {
      setEmail('cliente@viajastore.com');
      setRole(UserRole.CLIENT);
    } else if (type === 'AGENCY') {
      setEmail('agencia@viajastore.com');
      setRole(UserRole.AGENCY);
    } else {
      setEmail('admin@viajastore.com');
      setRole(UserRole.ADMIN);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Entrar na sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou use as opções de teste abaixo
          </p>
        </div>
        
        {/* Quick Actions for Prototype */}
        <div className="flex justify-center gap-2 mb-4 text-xs">
          <button onClick={() => fillCredentials('CLIENT')} className="bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200">Sou Cliente</button>
          <button onClick={() => fillCredentials('AGENCY')} className="bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200">Sou Agência</button>
          <button onClick={() => fillCredentials('ADMIN')} className="bg-gray-100 text-gray-800 px-2 py-1 rounded hover:bg-gray-200">Sou Admin</button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Endereço de e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value={UserRole.CLIENT}>Cliente</option>
                <option value={UserRole.AGENCY}>Agência</option>
                <option value={UserRole.ADMIN}>Administrador</option>
              </select>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-md"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-primary-500 group-hover:text-primary-400" />
              </span>
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;