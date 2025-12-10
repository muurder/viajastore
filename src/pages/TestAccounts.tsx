import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';
import { CheckCircle, XCircle, Loader, User, Building, Shield, Compass, Lock, AlertTriangle } from 'lucide-react';

interface TestAccount {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  phone: string;
  cpf?: string;
  cnpj?: string;
  isGuide?: boolean;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    role: UserRole.ADMIN,
    name: 'Admin Teste',
    email: 'admin@teste.com',
    password: 'admin123',
    phone: '(11) 99999-0001',
  },
  {
    role: UserRole.CLIENT,
    name: 'Cliente Teste',
    email: 'cliente@teste.com',
    password: 'cliente123',
    phone: '(11) 99999-0002',
    cpf: '123.456.789-00',
  },
  {
    role: UserRole.AGENCY,
    name: 'Agência Teste',
    email: 'agencia@teste.com',
    password: 'agencia123',
    phone: '(11) 99999-0003',
    cnpj: '12.345.678/0001-90',
    isGuide: false,
  },
  {
    role: UserRole.AGENCY,
    name: 'Guia Turístico Teste',
    email: 'guia@teste.com',
    password: 'guia123',
    phone: '(11) 99999-0004',
    cnpj: '12.345.678/0001-91',
    isGuide: true,
  },
];

const TestAccounts: React.FC = () => {
  const { register, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  // Security check: Only allow in development or localhost
  useEffect(() => {
    const checkAccess = () => {
      const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '[::1]' ||
                         window.location.hostname.startsWith('192.168.') ||
                         window.location.hostname.startsWith('10.') ||
                         window.location.hostname.startsWith('172.');
      
      // Also allow if user is admin (extra security layer)
      const isAdmin = user?.role === UserRole.ADMIN;
      
      const allowed = isDev || isLocalhost || isAdmin;
      setIsAllowed(allowed);

      if (!allowed) {
        showToast('error', 'Esta página só está disponível em ambiente de desenvolvimento ou para administradores.');
        setTimeout(() => navigate('/'), 2000);
      }
    };

    checkAccess();
  }, [user, navigate, showToast]);

  // Show loading while checking access
  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} className="animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Show error if not allowed
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Lock size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Esta página é apenas para ambiente de desenvolvimento ou localhost.
            Por questões de segurança, ela não está disponível em produção.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  const handleCreateAccount = async (account: TestAccount) => {
    setCreating(account.email);
    setErrors(prev => ({ ...prev, [account.email]: '' }));

    try {
      const registrationData: any = {
        name: account.name,
        email: account.email,
        password: account.password,
        phone: account.phone,
      };

      if (account.cpf) {
        registrationData.cpf = account.cpf;
      }

      if (account.cnpj) {
        registrationData.cnpj = account.cnpj;
      }

      // For guides, we need to set isGuide flag or add 'GUIA' tag
      if (account.isGuide) {
        registrationData.partnerType = 'GUIDE';
      }

      const result = await register(registrationData, account.role);

      if (result.success) {
        setCreated(prev => new Set([...prev, account.email]));
        showToast('success', `Conta ${account.name} criada com sucesso!`);
      } else {
        // Check if account already exists
        if (result.error?.includes('já está cadastrado') || result.error?.includes('already registered')) {
          setCreated(prev => new Set([...prev, account.email]));
          showToast('info', `Conta ${account.name} já existe. Você pode fazer login.`);
        } else {
          setErrors(prev => ({ ...prev, [account.email]: result.error || 'Erro desconhecido' }));
          showToast('error', `Erro ao criar ${account.name}: ${result.error}`);
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erro desconhecido';
      setErrors(prev => ({ ...prev, [account.email]: errorMsg }));
      showToast('error', `Erro ao criar ${account.name}: ${errorMsg}`);
    } finally {
      setCreating(null);
    }
  };

  const getRoleIcon = (role: UserRole, isGuide?: boolean) => {
    if (isGuide) return Compass;
    switch (role) {
      case UserRole.ADMIN:
        return Shield;
      case UserRole.AGENCY:
        return Building;
      case UserRole.CLIENT:
        return User;
      default:
        return User;
    }
  };

  const getRoleLabel = (role: UserRole, isGuide?: boolean) => {
    if (isGuide) return 'Guia Turístico';
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.AGENCY:
        return 'Agência';
      case UserRole.CLIENT:
        return 'Cliente';
      default:
        return 'Usuário';
    }
  };

  const getRoleColor = (role: UserRole, isGuide?: boolean) => {
    if (isGuide) return 'bg-purple-100 text-purple-700 border-purple-300';
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-700 border-red-300';
      case UserRole.AGENCY:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case UserRole.CLIENT:
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Contas de Teste</h1>
            <p className="text-gray-600">
              Use esta página para criar contas de teste para diferentes tipos de usuários.
              As contas já existentes serão detectadas automaticamente.
            </p>
          </div>

          <div className="space-y-4">
            {TEST_ACCOUNTS.map((account) => {
              const Icon = getRoleIcon(account.role, account.isGuide);
              const isCreating = creating === account.email;
              const isCreated = created.has(account.email);
              const error = errors[account.email];

              return (
                <div
                  key={account.email}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    isCreated
                      ? 'bg-gray-50 border-gray-300'
                      : error
                      ? 'bg-red-50 border-red-300'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`p-3 rounded-lg border-2 ${getRoleColor(account.role, account.isGuide)}`}
                      >
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{account.name}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(
                              account.role,
                              account.isGuide
                            )}`}
                          >
                            {getRoleLabel(account.role, account.isGuide)}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-semibold">Email:</span> {account.email}
                          </p>
                          <p>
                            <span className="font-semibold">Senha:</span> {account.password}
                          </p>
                          <p>
                            <span className="font-semibold">Telefone:</span> {account.phone}
                          </p>
                          {account.cpf && (
                            <p>
                              <span className="font-semibold">CPF:</span> {account.cpf}
                            </p>
                          )}
                          {account.cnpj && (
                            <p>
                              <span className="font-semibold">CNPJ:</span> {account.cnpj}
                            </p>
                          )}
                        </div>
                        {error && (
                          <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isCreated ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={20} />
                          <span className="text-sm font-semibold">Criada</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateAccount(account)}
                          disabled={isCreating}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                            isCreating
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                          }`}
                        >
                          {isCreating ? (
                            <div className="flex items-center gap-2">
                              <Loader size={16} className="animate-spin" />
                              <span>Criando...</span>
                            </div>
                          ) : (
                            'Criar Conta'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-yellow-900 mb-2">⚠️ Ambiente de Desenvolvimento</h3>
                  <p className="text-sm text-yellow-800">
                    Esta página só está disponível em localhost ou ambiente de desenvolvimento.
                    Em produção, esta rota será bloqueada automaticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-2">📝 Notas Importantes:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>As contas são criadas no Supabase e podem ser usadas para login imediatamente.</li>
                <li>Se uma conta já existir, você verá uma mensagem informativa e poderá fazer login normalmente.</li>
                <li>Guias turísticos são criados como agências com a tag <code className="bg-blue-100 px-1 rounded">GUIA</code> no custom_settings.</li>
                <li>Para contas ADMIN, você pode precisar atualizar manualmente o role no banco de dados.</li>
                <li><strong>Nunca use essas senhas em produção!</strong> Elas são apenas para testes locais.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAccounts;

