// This file is created to ensure the Layout component exists at the correct path.
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import AuthModal from './AuthModal';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    // Simplified logic for modal, real app would use location.hash
    const [showModal, setShowModal] = React.useState<'login' | 'signup' | null>(null);

    return (
        <div className="min-h-screen flex flex-col">
            {showModal && <AuthModal initialView={showModal} onClose={() => setShowModal(null)} />}
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
                    <Link to="/" className="font-bold text-xl text-primary-600">ViajaStore</Link>
                    <div className="hidden md:flex items-center space-x-8">
                        <Link to="/trips" className="text-gray-500 hover:text-gray-900">Viagens</Link>
                        <Link to="/agencies" className="text-gray-500 hover:text-gray-900">Agências</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <span>Olá, {user.name}</span>
                                <button onClick={logout} className="text-sm font-medium text-red-600">Sair</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setShowModal('login')} className="text-gray-500 hover:text-gray-900">Entrar</button>
                                <button onClick={() => setShowModal('signup')} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Criar Conta</button>
                            </>
                        )}
                    </div>
                </nav>
            </header>
            <main className="flex-grow container mx-auto px-4 py-8">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
};

export default Layout;
