import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';
import { User, Building, Lock, Mail, Phone, CreditCard } from 'lucide-react';

const Signup: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'AGENCY'>('CLIENT');
  
  // Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: '',
    cnpj: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'CLIENT') {
      register({
        id: `c${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: UserRole.CLIENT,
        phone: formData.phone,
        cpf: formData.cpf,
        favorites: [],
        avatar: 'https://i.pravatar.cc/150?u=' + Date.now()
      });
      navigate('/client/dashboard');
    } else {
      register({
        id: `a${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: UserRole.AGENCY,
        cnpj: formData.cnpj,
        description: formData.description || 'Nova agência na ViajaStore',
        logo: 'https://picsum.photos/200/200?random=' + Date.now(),
        subscriptionStatus: 'INACTIVE', // Starts inactive
        subscriptionPlan: 'BASIC',
        subscriptionExpiresAt: new Date().toISOString() // Expired
      });
      navigate('/agency/dashboard');
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Crie sua conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Junte-se à comunidade ViajaStore
          </p>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === 'CLIENT' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('CLIENT')}
          >
            <div className="flex items-center justify-center gap-2">
              <User size={16} />
              Sou Viajante
            </div>
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === 'AGENCY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('AGENCY')}
          >
            <div className="flex items-center justify-center gap-2">
              <Building size={16} />
              Sou Agência
            </div>
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-3">
            <div>
              <label className="sr-only">Nome Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder={activeTab === 'CLIENT' ? "Nome Completo" : "Nome da Agência"}
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="sr-only">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="sr-only">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Senha"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="sr-only">Telefone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="phone"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Telefone / WhatsApp"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {activeTab === 'CLIENT' ? (
              <div>
                <label className="sr-only">CPF</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    name="cpf"
                    type="text"
                    required
                    className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="CPF"
                    value={formData.cpf}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="sr-only">CNPJ</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      name="cnpj"
                      type="text"
                      required
                      className="appearance-none rounded-lg relative block w-full px-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="CNPJ"
                      value={formData.cnpj}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Descreva sua agência em poucas palavras..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-md"
          >
            Criar Conta
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">Já tem conta? </span>
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Fazer Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;