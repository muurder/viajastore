import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Agency } from '../types';
import { User, Building, AlertCircle, ArrowRight, Lock, Mail, Eye, EyeOff, X, Phone, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
  initialView: 'login' | 'signup';
  onClose: () => void;
  agencyContext?: Agency;
}

const AuthModal: React.FC<AuthModalProps> = ({ initialView, onClose, agencyContext }) => {
  const [view, setView] = useState(initialView);
  
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-[scaleIn_0.3s]"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 p-2 rounded-full transition-colors"
          aria-label="Fechar modal"
        >
          <X size={20} />
        </button>

        {view === 'login' 
          ? <LoginView setView={setView} onClose={onClose} agencyContext={agencyContext} /> 
          : <SignupView setView={setView} onClose={onClose} agencyContext={agencyContext} />}
      </div>
    </div>
  );
};

// --- LOGIN VIEW ---
const LoginView: React.FC<any> = ({ setView, onClose, agencyContext }) => {
    const { login, loginWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                onClose();
            } else {
                setError(result.error || 'Falha no login.');
            }
        } catch (err) {
            console.error("Login submission error:", err);
            setError("Um erro inesperado ocorreu. Tente novamente.");
        } finally { // FIX: Ensure loading state is reset in both success and error paths
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-8 md:p-10">
            {agencyContext && (
                <div className="text-center mb-4">
                    <img src={agencyContext.logo} className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-gray-100" alt={`${agencyContext.name} logo`} />
                    <p className="text-xs text-gray-500">Acessando <span className="font-bold text-gray-700">{agencyContext.name}</span></p>
                </div>
            )}
            <h2 className="text-2xl font-bold text-center text-gray-900">Bem-vindo de volta!</h2>
            <p className="text-center text-sm text-gray-500 mt-2 mb-6">Faça login para continuar.</p>
            
            {/* Login View: Generic Google Login (checks existing account) */}
            <GoogleButton label="Entrar com Google" onClick={() => loginWithGoogle()} />

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">ou com email</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none" required />
                    </div>
                </div>
                <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none" required />
                        {/* Fix: Use EyeOff icon when password is shown */}
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}>{showPassword ? <Eye size={18}/> : <EyeOff size={18}/>}</button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}
                <button type="submit" disabled={isLoading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors">
                    {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
            <p className="text-center text-sm mt-6">
                Não tem uma conta? <button onClick={() => setView('signup')} className="font-bold text-primary-600 hover:underline">Cadastre-se</button>
            </p>
        </div>
    );
};

// --- SIGNUP VIEW ---
const SignupView: React.FC<any> = ({ setView, onClose, agencyContext }) => {
    const { register, loginWithGoogle } = useAuth();
    const { refreshData } = useData();
    const { showToast } = useToast();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'CLIENT' | 'AGENCY'>('CLIENT');
    const [partnerType, setPartnerType] = useState<'AGENCY' | 'GUIDE'>('AGENCY'); // Tipo de parceiro: Agência ou Guia
    const [formData, setFormData] = useState({ name: '', email: '', password: '', cnpj: '', phone: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    // Mask functions for CNPJ/Cadastur
    const applyCnpjMask = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 14) {
            return numbers
                .replace(/(\d{2})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        return value;
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = applyCnpjMask(e.target.value);
        setFormData({ ...formData, cnpj: masked });
        setError('');
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate terms acceptance
        if (!acceptedTerms) {
            setError('Você precisa aceitar os Termos de Uso e Política de Privacidade.');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        
        setIsLoading(true);
        const role = activeTab === 'CLIENT' ? UserRole.CLIENT : UserRole.AGENCY;

        try {
            // Prepare registration data
            const registrationData = {
                ...formData,
                // For partners, include partner type in customSettings if needed
                ...(activeTab === 'AGENCY' && partnerType === 'GUIDE' ? { partnerType: 'GUIDE' } : {})
            };
            
            const result = await register(registrationData, role);
            
            if (result.success) {
                // Show toast based on message
                if (result.message) {
                    // If userId is present, it means the user is also signed in.
                    // Otherwise, it's just an info message (e.g., email verification).
                    showToast(result.message, result.userId ? 'success' : 'info'); 
                } else {
                    showToast('Conta criada com sucesso!', 'success');
                }

                // FIX: Refresh DataContext to load the newly created agency
                if (result.userId && result.role === UserRole.AGENCY) {
                    // Wait a bit for database propagation, then refresh
                    setTimeout(async () => {
                        try {
                            await refreshData();
                            console.log("[AuthModal] DataContext refreshed after agency registration");
                        } catch (error) {
                            console.error("[AuthModal] Error refreshing DataContext:", error);
                        }
                    }, 1500);
                }

                // Close modal first
                setIsLoading(false);
                onClose();

                // Then navigate after a small delay to ensure modal closes and data is refreshed
                setTimeout(() => {
                    if (result.userId && result.role) { // Only navigate if user is signed in AND role is determined
                        if (result.role === UserRole.AGENCY) {
                            // FIX: Redirect new agencies to Plans tab for onboarding
                            navigate('/agency/dashboard?tab=PLAN&new=true');
                        } else if (result.role === UserRole.CLIENT) {
                            navigate('/client/dashboard/PROFILE');
                        }
                    } else {
                        // If not immediately signed in (e.g., email verification needed), navigate to home
                        navigate('/');
                    }
                }, 2000); // Increased delay to allow DataContext refresh
            } else {
                setError(result.error || 'Erro ao criar conta.');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Signup submission error:", err);
            setError(err.message || "Um erro inesperado ocorreu. Tente novamente.");
            setIsLoading(false);
        }
    };
    
    // Handler for Google Signup: Passes the specific role based on the active tab
    const handleGoogleSignup = () => {
        const role = activeTab === 'CLIENT' ? UserRole.CLIENT : UserRole.AGENCY;
        loginWithGoogle(role);
    };
    
    return (
        <div className="p-8 md:p-10 max-h-[90vh] overflow-y-auto scrollbar-thin">
            {agencyContext && (
                <div className="text-center mb-4">
                    <img src={agencyContext.logo} className="w-14 h-14 rounded-full mx-auto mb-2 border-2 border-gray-100" alt={`${agencyContext.name} logo`} />
                    <p className="text-xs text-gray-500">Acessando <span className="font-bold text-gray-700">{agencyContext.name}</span></p>
                </div>
            )}
            <h2 className="text-2xl font-bold text-center text-gray-900">Crie sua conta</h2>
            <p className="text-center text-sm text-gray-500 mt-2 mb-6">É rápido e fácil.</p>
            
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => setActiveTab('CLIENT')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === 'CLIENT' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><User size={16}/> Quero Viajar</button>
              <button onClick={() => setActiveTab('AGENCY')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === 'AGENCY' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><Building size={16}/> Sou Parceiro</button>
            </div>

            {/* Partner Type Selection (only for AGENCY tab) */}
            {activeTab === 'AGENCY' && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qual seu tipo de negócio?</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setPartnerType('AGENCY')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                partnerType === 'AGENCY'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            Agência de Viagens
                        </button>
                        <button
                            type="button"
                            onClick={() => setPartnerType('GUIDE')}
                            className={`p-3 rounded-lg border-2 transition-all ${
                                partnerType === 'GUIDE'
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            Guia de Turismo
                        </button>
                    </div>
                </div>
            )}

            {/* Pass the handler that knows the active tab */}
            <GoogleButton 
                label={activeTab === 'CLIENT' ? 'Cadastrar Viajante com Google' : 'Cadastrar Agência com Google'} 
                onClick={handleGoogleSignup} 
            />

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">ou com email</span></div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    name="name" 
                    type="text" 
                    placeholder={activeTab === 'CLIENT' ? 'Nome Completo' : (partnerType === 'GUIDE' ? 'Nome do Guia' : 'Nome da Agência')} 
                    required 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"
                />
                <input 
                    name="email" 
                    type="email" 
                    placeholder="Email" 
                    required 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"
                />
                
                {/* Phone field added for both roles */}
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        name="phone" 
                        type="text" 
                        placeholder="Telefone / WhatsApp" 
                        value={formData.phone} 
                        onChange={handleInputChange} 
                        className="w-full border p-3 pl-10 rounded-lg outline-none focus:border-primary-500"
                    />
                </div>

                {/* Partner Identification Field (CNPJ or Cadastur) */}
                {activeTab === 'AGENCY' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {partnerType === 'GUIDE' ? 'Cadastur' : 'CNPJ'}
                        </label>
                        <input 
                            name="cnpj" 
                            type="text" 
                            placeholder={partnerType === 'GUIDE' ? 'Número do Cadastur' : '00.000.000/0000-00'} 
                            required 
                            value={formData.cnpj} 
                            onChange={handleCnpjChange} 
                            maxLength={18}
                            className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"
                        />
                    </div>
                )}
                
                {/* Password field with show/hide toggle */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            name="password" 
                            type={showPassword ? 'text' : 'password'} 
                            placeholder="Mínimo 6 caracteres" 
                            required 
                            value={formData.password} 
                            onChange={handleInputChange} 
                            className="w-full border p-3 pl-10 pr-10 rounded-lg outline-none focus:border-primary-500"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" 
                            aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                        >
                            {showPassword ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                    </div>
                </div>
                
                {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}

                {/* Terms and Privacy Checkbox */}
                <div className="flex items-start gap-2 pt-2">
                    <input
                        type="checkbox"
                        id="accept-terms"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        required
                    />
                    <label htmlFor="accept-terms" className="text-sm text-gray-600 cursor-pointer">
                        Li e concordo com os <a href="/terms" target="_blank" className="text-primary-600 hover:underline font-medium">Termos de Uso</a> e <a href="/privacy" target="_blank" className="text-primary-600 hover:underline font-medium">Política de Privacidade</a>.
                    </label>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading || !acceptedTerms} 
                    className={`w-full py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                        acceptedTerms && !isLoading
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                    }`}
                >
                    {isLoading ? 'Criando...' : 'Criar Conta'} <ArrowRight size={16}/>
                </button>
            </form>
            <p className="text-center text-sm mt-6">
                Já tem uma conta? <button onClick={() => setView('login')} className="font-bold text-primary-600 hover:underline">Faça login</button>
            </p>
        </div>
    );
};


const GoogleButton: React.FC<{label: string; onClick: () => void}> = ({ label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
        {label}
    </button>
);

export default AuthModal;