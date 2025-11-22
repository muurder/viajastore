
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, Plane } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Agency } from '../types';

const Login: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const { getAgencyBySlug, loading: dataLoading } = useData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('juannicolas1@gmail.com');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [agency, setAgency] = useState<Agency | undefined>(undefined);

  const fromParam = searchParams.get('from');
  const redirectTo = fromParam || '/';
  
  const agencySlug = React.useMemo(() => {
    if (!fromParam || fromParam === '/') return null;
    const segments = fromParam.split('/').filter(Boolean);
    if (segments.length > 0) {
        const potentialSlug = segments[0];
        const reservedRoutes = ['trips', 'viagem', 'agencies', 'agency', 'about', 'contact', 'login', 'signup', 'admin', 'client'];
        if (!reservedRoutes.includes(potentialSlug)) {
            return potentialSlug;
        }
    }
    return null;
  }, [fromParam]);

  useEffect(() => {
    if (agencySlug && !dataLoading) {
      setAgency(getAgencyBySlug(agencySlug));
    }
  }, [agencySlug, dataLoading, getAgencyBySlug]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
        navigate(redirectTo);
    } else {
        setError(result.error || 'Falha ao fazer login. Verifique suas credenciais.');
        setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
      await loginWithGoogle(redirectTo);
  };

  const MicrositeHeader = () => (
    <div className="absolute top-0 left-0 right-0 p-6">
        <Link to={`/${agencySlug}`} className="inline-flex flex-col items-center group gap-2 text-center">
            <img src={agency!.logo} alt={agency!.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
            <div>
                <span className="text-xs text-gray-500 group-hover:text-primary-600 transition-colors">Voltar para</span>
                <span className="block font-bold text-gray-800 text-lg group-hover:text-primary-600 transition-colors">{agency!.name}</span>
            </div>
        </Link>
    </div>
  );

  const GlobalHeader = () => (
     <div className="absolute top-0 left-0 right-0 p-6">
        <Link to="/" className="flex items-center group gap-2">
            <Plane className="h-8 w-8 text-primary-600 group-hover:rotate-12 transition-transform" />
            <span className="font-bold text-xl tracking-tight text-primary-600">ViajaStore</span>
        </Link>
     </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      
      {agencySlug ? (agency && <MicrositeHeader />) : <GlobalHeader />}
      
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mt-24">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
              {agency ? `Bem-vindo de volta` : 'Acesse sua conta'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
              Faça login para continuar
          </p>
        </div>

        <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                </g>
            </svg>
            Entrar com Google
        </button>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou continue com email</span>
            </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
               <div className="flex items-center">
                 <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                 <div className="text-sm text-red-700">{error}</div>
               </div>
             </div>
          )}

          <div className="flex items-center justify-between">
             <Link to={`/forgot-password${fromParam ? `?from=${fromParam}` : ''}`} className="text-sm font-medium text-primary-600 hover:text-primary-500 hover:underline">Esqueci minha senha</Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Não tem conta? </span>
            <Link to={`/signup${fromParam ? `?from=${fromParam}` : ''}`} className="text-sm font-bold text-primary-600 hover:text-primary-500 hover:underline">
              Cadastre-se gratuitamente
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
