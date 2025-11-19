
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      if (login(email, password, role)) {
        if (role === UserRole.ADMIN) navigate('/admin/dashboard');
        else if (role === UserRole.AGENCY) navigate('/agency/dashboard');
        else navigate('/client/dashboard');
      } else {
        setError('Credenciais inválidas. Verifique email, senha e o tipo de conta.');
        setIsLoading(false);
      }
    }, 800);
  };

  const fillCredentials = (type: 'CLIENT' | 'AGENCY' | 'ADMIN') => {
    if (type === 'CLIENT') {
      setEmail('cliente@viajastore.com');
      setPassword('123');
      setRole(UserRole.CLIENT);
    } else if (type === 'AGENCY') {
      setEmail('agencia@viajastore.com');
      setPassword('123');
      setRole(UserRole.AGENCY);
    } else {
      setEmail('admin@viajastore.com');
      setPassword('123');
      setRole(UserRole.ADMIN);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Bem-vindo de volta</h2>
          <p className="mt-2 text-sm text-gray-600">Faça login para acessar sua conta</p>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg mb-4 text-xs text-center border border-blue-100">
          <p className="mb-2 font-bold text-blue-800 uppercase tracking-wider">Acesso Rápido (Protótipo)</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => fillCredentials('CLIENT')} className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded shadow-sm transition-all">Cliente</button>
            <button onClick={() => fillCredentials('AGENCY')} className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded shadow-sm transition-all">Agência</button>
            <button onClick={() => fillCredentials('ADMIN')} className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded shadow-sm transition-all">Admin</button>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Conta</label>
              <div className="flex p-1 bg-gray-100 rounded-lg">
                 <button type="button" onClick={() => setRole(UserRole.CLIENT)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === UserRole.CLIENT ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Cliente</button>
                 <button type="button" onClick={() => setRole(UserRole.AGENCY)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === UserRole.AGENCY ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Agência</button>
                 <button type="button" onClick={() => setRole(UserRole.ADMIN)} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === UserRole.ADMIN ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>Admin</button>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none transition-shadow focus:ring-2"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none transition-shadow focus:ring-2"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
             <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-[fadeIn_0.3s]">
               <div className="flex">
                 <div className="ml-3">
                   <p className="text-sm text-red-700">{error}</p>
                 </div>
               </div>
             </div>
          )}

          <div className="flex items-center justify-between">
             <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500 hover:underline">Esqueci minha senha</Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center">
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Entrando...
              </span>
            ) : 'Entrar'}
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Não tem conta? </span>
            <Link to="/signup" className="text-sm font-bold text-primary-600 hover:text-primary-500 hover:underline">
              Cadastre-se gratuitamente
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
