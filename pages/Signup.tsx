
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { User, Building, AlertCircle } from 'lucide-react';

const Signup: React.FC = () => {
  const { register } = useAuth();
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

  const validateCPF = (cpf: string) => /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cpf);
  const validateCNPJ = (cnpj: string) => /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(cnpj);

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
        setError('CPF inválido. Formato: 000.000.000-00');
        setLoading(false);
        return;
    }
    if (activeTab === 'AGENCY' && !validateCNPJ(formData.cnpj)) {
        setError('CNPJ inválido. Formato: 00.000.000/0000-00');
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
             <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-center text-red-700 text-sm">
                 <AlertCircle size={18} className="mr-2" /> {error}
             </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{activeTab === 'CLIENT' ? 'Nome Completo' : 'Nome da Agência'}</label>
             <input name="name" type="text" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Ex: João Silva" value={formData.name} onChange={handleInputChange} />
          </div>
          
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
             <input name="email" type="email" required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="exemplo@email.com" value={formData.email} onChange={handleInputChange} />
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

          <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all disabled:opacity-50">
             {loading ? 'Criando conta...' : 'Criar Conta'}
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
