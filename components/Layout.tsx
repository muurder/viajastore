import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, LogOut, Menu, X, Instagram, Facebook, Twitter } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center text-primary-600 hover:text-primary-700">
                <Plane className="h-8 w-8 mr-2" />
                <span className="font-bold text-xl tracking-tight">ViajaStore</span>
              </Link>
              
              <div className="hidden md:ml-8 md:flex md:space-x-8">
                <Link to="/trips" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === '/trips' ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  Viagens
                </Link>
                <Link to="/agencies" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === '/agencies' ? 'border-primary-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                  Agências
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center">
              {user ? (
                <div className="ml-4 flex items-center md:ml-6">
                  {user.role === 'AGENCY' && (
                    <Link to="/agency/dashboard" className="text-gray-500 hover:text-gray-700 mr-4 text-sm font-medium">
                      Painel da Agência
                    </Link>
                  )}
                  {user.role === 'ADMIN' && (
                    <Link to="/admin/dashboard" className="text-gray-500 hover:text-gray-700 mr-4 text-sm font-medium">
                      Administração
                    </Link>
                  )}
                  
                  <div className="relative flex items-center gap-3">
                    <Link to={user.role === 'CLIENT' ? '/client/dashboard' : '#'} className="text-sm font-medium text-gray-700 hover:text-primary-600">
                      Olá, {user.name}
                    </Link>
                    <button onClick={handleLogout} className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-gray-500 hover:text-gray-900 font-medium">
                    Entrar
                  </Link>
                  <Link to="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
                    Criar Conta
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/trips" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
                Explorar Viagens
              </Link>
              <Link to="/agencies" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
                Agências
              </Link>
              {user && user.role === 'AGENCY' && (
                <Link to="/agency/dashboard" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-primary-600 hover:bg-gray-50">
                  Painel Agência
                </Link>
              )}
              {user && user.role === 'CLIENT' && (
                <Link to="/client/dashboard" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-primary-600 hover:bg-gray-50">
                  Minha Conta
                </Link>
              )}
               {user && user.role === 'ADMIN' && (
                <Link to="/admin/dashboard" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-primary-600 hover:bg-gray-50">
                  Painel Admin
                </Link>
              )}
            </div>
            <div className="pt-4 pb-4 border-t border-gray-200">
              {user ? (
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                      {user.name.charAt(0)}
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
                  <button onClick={handleLogout} className="ml-auto flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500">
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <div className="px-4 flex flex-col gap-2">
                  <Link to="/login" className="block w-full text-center px-4 py-2 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Entrar
                  </Link>
                  <Link to="/signup" className="block w-full text-center px-4 py-2 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                    Cadastrar
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Full Footer */}
      <footer className="bg-white border-t border-gray-200 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-4">
                <Plane className="h-6 w-6 text-primary-600 mr-2" />
                <span className="font-bold text-xl text-gray-800">ViajaStore</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Conectamos você às melhores agências de turismo do Brasil. Viaje com segurança, qualidade e os melhores preços.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Sobre</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="#" className="hover:text-primary-600">Quem somos</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Carreiras</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Imprensa</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="#" className="hover:text-primary-600">Central de Ajuda</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Termos e Condições</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Política de Privacidade</Link></li>
                <li><Link to="#" className="hover:text-primary-600">Contato</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4">Social</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-pink-600 transition-colors"><Instagram size={24} /></a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Facebook size={24} /></a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors"><Twitter size={24} /></a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 mb-4 md:mb-0">
              © 2024 ViajaStore. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <span>Feito com ❤️ no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;