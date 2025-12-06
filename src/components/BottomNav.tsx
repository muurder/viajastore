// This file is created to ensure the BottomNav component exists at the correct path.
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Building, User } from 'lucide-react';

const BottomNav: React.FC = () => {
    const location = useLocation();
    const getLinkClass = (path: string) => {
        return location.pathname === path ? 'text-primary-600' : 'text-gray-500';
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">
            <div className="flex justify-around py-2">
                <Link to="/" className={`flex flex-col items-center ${getLinkClass('/')}`}>
                    <Home size={24} />
                    <span className="text-xs">Home</span>
                </Link>
                <Link to="/trips" className={`flex flex-col items-center ${getLinkClass('/trips')}`}>
                    <Compass size={24} />
                    <span className="text-xs">Viagens</span>
                </Link>
                <Link to="/agencies" className={`flex flex-col items-center ${getLinkClass('/agencies')}`}>
                    <Building size={24} />
                    <span className="text-xs">Agências</span>
                </Link>
                <Link to="/client/dashboard" className={`flex flex-col items-center ${getLinkClass('/client/dashboard')}`}>
                    <User size={24} />
                    <span className="text-xs">Perfil</span>
                </Link>
            </div>
        </nav>
    );
};

export default BottomNav;
