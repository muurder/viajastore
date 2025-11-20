
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { User, Building, AlertCircle, ArrowRight } from 'lucide-react';

const Signup: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'AGENCY'>('CLIENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', cpf: '', cnpj: '', description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateCPF = (cpf: string) => {
      // Validação simples de formato para UX
      const cleanCPF = cpf.replace(/[^\d]/g, '');
      return cleanCPF.length === 11;
  };
  
  const validateCNPJ = (cnpj: string) => {
      const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
      return cleanCNPJ.length === 14;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
    }
    if (formData.password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
    }
    if (activeTab === 'CLIENT' && !validateCPF(formData.cpf)) {
        setError('CPF inválido. Digite os 11 números.');
        setLoading(false);
        return;
    }
    if (activeTab === 'AGENCY' && !validateCNPJ(formData.cnpj)) {
        setError('CNPJ inválido. Digite os 14 números.');
        setLoading(false);
        return;
    }

    const result = await register(formData, activeTab === 'CLIENT' ? UserRole.CLIENT : UserRole.AGENCY);

    if (result.success) {
        navigate('/');
    } else {
        setError(result.error || 'Erro ao criar conta. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Crie sua conta</h2>
          <p className="mt-2 text-sm text-gray-600">Junte-se ao maior marketplace de viagens do Brasil</p>
        </div>

        {/* Social Login */}
        <button
            type="button"
            onClick={() => loginWithGoogle()}
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

        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'CLIENT' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('CLIENT')}
          >
            <div className="flex items-center justify-center gap-2"><User size={16} /> Sou Viajante</div>
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'AGENCY' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('AGENCY')}
          >
            <div className="flex items-center justify-center gap-2"><Building size={16} /> Sou Agência</div>
          </button>
        </div>

        {error && (
             <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-center text-red-700 text-sm animate-[fadeIn_0.3s]">
                 <AlertCircle size={18} className="mr-2 flex-shrink-0" /> 
                 <span>{error}</span>
             </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeTab === 'CLIENT' ? 'Nome Completo' : 'Nome da Agência'}</label>
             <input name="name" type="text" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: João Silva" value={formData.name} onChange={handleInputChange} />
          </div>
          
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
             <input name="email" type="email" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="exemplo@gmail.com" value={formData.email} onChange={handleInputChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                <input name="password" type="password" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="******" value={formData.password} onChange={handleInputChange} />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar</label>
                <input name="confirmPassword" type="password" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="******" value={formData.confirmPassword} onChange={handleInputChange} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                <input name="phone" type="text" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="(00) 00000-0000" value={formData.phone} onChange={handleInputChange} />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeTab === 'CLIENT' ? 'CPF' : 'CNPJ'}</label>
                <input name={activeTab === 'CLIENT' ? 'cpf' : 'cnpj'} type="text" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder={activeTab === 'CLIENT' ? "000.000.000-00" : "00.000.000/0000-00"} value={activeTab === 'CLIENT' ? formData.cpf : formData.cnpj} onChange={handleInputChange} />
             </div>
          </div>

          {activeTab === 'AGENCY' && (
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição da Agência</label>
                <textarea name="description" required rows={2} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Breve descrição dos seus serviços..." value={formData.description} onChange={handleInputChange} />
             </div>
          )}

          <button type="submit" disabled={loading} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all disabled:opacity-50">
             {loading ? 'Criando conta...' : 'Criar Conta'} <ArrowRight size={16} className="ml-2" />
          </button>
        </form>

        <div className="text-center">
            <span className="text-sm text-gray-600">Já tem conta? </span>
            <Link to="/login" className="text-sm font-bold text-primary-600 hover:text-primary-500 hover:underline">Fazer Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
