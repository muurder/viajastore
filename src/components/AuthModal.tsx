import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Agency } from '../types';
import { User, Building, AlertCircle, ArrowRight, Lock, Mail, Eye, EyeOff, X, Phone, Info } from 'lucide-react';
import { useNavigate } => navigate('/client/dashboard/PROFILE');
                }
            } else {
                // If not immediately signed in (e.g., email verification needed), navigate to home
                navigate('/');
            }
        } else {
            setError(result.error || 'Erro ao criar conta.');
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
            <h2 className="text-2xl font-bold text-center text-gray-900">Crie sua conta</h2>
            <p className="text-center text-sm text-gray-500 mt-2 mb-6">É rápido e fácil.</p>
            
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
              <button onClick={() => setActiveTab('CLIENT')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === 'CLIENT' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><User size={16}/> Sou Viajante</button>
              <button onClick={() => setActiveTab('AGENCY')} className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 ${activeTab === 'AGENCY' ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}><Building size={16}/> Sou Agência</button>
            </div>

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
                <input name="name" type="text" placeholder={activeTab === 'CLIENT' ? 'Nome Completo' : 'Nome da Agência'} required value={formData.name} onChange={handleInputChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                <input name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleInputChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                
                {/* Phone field added for both roles */}
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input name="phone" type="text" placeholder="Telefone / WhatsApp" value={formData.phone} onChange={handleInputChange} className="w-full border p-3 pl-10 rounded-lg outline-none focus:border-primary-500"/>
                </div>

                {activeTab === 'CLIENT' && (
                    <input name="cpf" type="text" placeholder="CPF" value={formData.cpf} onChange={handleInputChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                )}
                
                {activeTab === 'AGENCY' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
                        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-blue-700">
                            O CNPJ será solicitado no painel da agência após a criação da conta.
                        </p>
                    </div>
                )}
                
                <input name="password" type="password" placeholder="Senha (mínimo 6 caracteres)" required value={formData.password} onChange={handleInputChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                <input name="confirmPassword" type="password" placeholder="Confirmar Senha" required value={formData.confirmPassword} onChange={handleInputChange} className="w-full border p-3 rounded-lg outline-none focus:border-primary-500"/>
                
                {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}

                <button type="submit" disabled={isLoading} className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
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