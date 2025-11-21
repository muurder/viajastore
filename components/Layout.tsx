
import React from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Plane, LogOut, Menu, X, Instagram, Facebook, Twitter, User } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { agencies } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Check if current path matches an agency slug
  // We get the first segment of the path
  const pathSegment = location.pathname.split('/')[1];
  const currentAgency = agencies.find(a => a.slug === pathSegment);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (basePath: string) => {
    if (basePath === '/trips') return location.pathname === '/trips' || location.pathname.startsWith('/trip/');
    if (basePath === '/agencies') return location.pathname === '/agencies' || (location.pathname.startsWith('/agency/') && !location.pathname.includes('dashboard'));
    return location.pathname === basePath;
  };

  const getLinkClasses = (path: string) => {
    const active = isActive(path);
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
      active ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center text-primary-600 hover:text-primary-700 group">
                <Plane className="h-8 w-8 mr-2 group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-xl tracking-tight">ViajaStore</span>
              </Link>

              {/* Agency Co-Branding Logic */}
              {currentAgency && (
                <div className="hidden sm:flex items-center ml-4 pl-4 border-l-2 border-gray-200 animate-[fadeIn_0.5s]">
                    <img src={currentAgency.logo} alt={currentAgency.name} className="w-8 h-8 rounded-full object-cover mr-2"/>
                    <span className="font-bold text-gray-800 text-sm">{currentAgency.name}</span>
                </div>
              )}

              <div className="hidden md:ml-8 md:flex md:space-x-8">
                <Link to="/trips" className={getLinkClasses('/trips')}>Explorar Viagens</Link>
                <Link to="/agencies" className={getLinkClasses('/agencies')}>Agências</Link>
                <Link to="/about" className={getLinkClasses('/about')}>Sobre</Link>
              </div>
            </div>

            <div className="hidden md:flex items-center">
              {user ? (
                <div className="ml-4 flex items-center md:ml-6">
                  {user.role === 'AGENCY' && (
                    <Link to="/agency/dashboard" className="text-gray-500 hover:text-primary-600 mr-4 text-sm font-medium">Painel da Agência</Link>
                  )}
                  {user.role === 'ADMIN' && (
                    <Link to="/admin/dashboard" className="text-gray-500 hover:text-primary-600 mr-4 text-sm font-medium">Admin</Link>
                  )}
                  
                  <div className="relative flex items-center gap-3 bg-gray-50 py-1 px-3 rounded-full border border-gray-100">
                    <Link to={user.role === 'CLIENT' ? '/client/dashboard' : user.role === 'AGENCY' ? '/agency/dashboard' : '/admin/dashboard'} className="flex items-center text-sm font-medium text-gray-700 hover:text-primary-600">
                      <User size={16} className="mr-2" />
                      <span className="max-w-[100px] truncate">{user.name}</span>
                    </Link>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Sair">
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Entrar</Link>
                  <Link to="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30">Criar Conta</Link>
                </div>
              )}
            </div>

            <div className="flex items-center md:hidden">
               {/* Mobile Agency Branding */}
               {currentAgency && (
                <div className="flex items-center mr-4">
                    <img src={currentAgency.logo} alt={currentAgency.name} className="w-6 h-6 rounded-full object-cover"/>
                </div>
               )}
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 absolute w-full z-50 shadow-lg">
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/trips" onClick={() => setIsMenuOpen(false)} className={`block pl-3 pr-4 py-2 border-l-4 font-medium ${isActive('/trips') ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-transparent text-gray-600'}`}>Explorar Viagens</Link>
              <Link to="/agencies" onClick={() => setIsMenuOpen(false)} className={`block pl-3 pr-4 py-2 border-l-4 font-medium ${isActive('/agencies') ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-transparent text-gray-600'}`}>Agências</Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className={`block pl-3 pr-4 py-2 border-l-4 font-medium ${isActive('/about') ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-transparent text-gray-600'}`}>Sobre Nós</Link>
            </div>
            <div className="pt-4 pb-4 border-t border-gray-200">
              {user ? (
                <div className="px-4 space-y-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{user.name}</div>
                      <div className="text-sm font-medium text-gray-500 truncate">{user.email}</div>
                    </div>
                  </div>
                  <Link to={user.role === 'AGENCY' ? "/agency/dashboard" : user.role === 'ADMIN' ? "/admin/dashboard" : "/client/dashboard"} onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-2 bg-primary-50 text-primary-700 rounded-md font-medium">
                    Meu Painel
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-center py-2 border border-gray-300 text-gray-600 rounded-md font-medium">Sair</button>
                </div>
              ) : (
                <div className="px-4 flex flex-col gap-2">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700">Entrar</Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="block w-full text-center px-4 py-2 bg-primary-600 text-white rounded-md font-medium">Cadastrar</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 pt-12 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center mb-4">
                <Plane className="h-6 w-6 text-primary-600 mr-2" />
                <span className="font-bold text-xl text-gray-800">ViajaStore</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                O maior marketplace de turismo do Brasil. Segurança, variedade e os melhores preços para sua próxima aventura.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Empresa</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/about" className="hover:text-primary-600 transition-colors">Quem somos</Link></li>
                <li><Link to="/careers" className="hover:text-primary-600 transition-colors">Carreiras</Link></li>
                <li><Link to="/press" className="hover:text-primary-600 transition-colors">Imprensa</Link></li>
                <li><Link to="/blog" className="hover:text-primary-600 transition-colors">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Suporte</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/help" className="hover:text-primary-600 transition-colors">Central de Ajuda</Link></li>
                <li><Link to="/terms" className="hover:text-primary-600 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-600 transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/contact" className="hover:text-primary-600 transition-colors">Fale Conosco</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Social</h3>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-pink-100 hover:text-pink-600 transition-all"><Instagram size={20} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-all"><Facebook size={20} /></a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-400 transition-all"><Twitter size={20} /></a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} ViajaStore. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link to="/privacy" className="hover:text-gray-600">Privacidade</Link>
              <Link to="/terms" className="hover:text-gray-600">Termos</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
