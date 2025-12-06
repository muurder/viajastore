// This file is created to ensure the AdminDashboard component exists at the correct path.
// The content will be a complete, functional admin dashboard.
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const AdminDashboard: React.FC = () => {
    const { user } = useAuth();

    if (!user || user.role !== UserRole.ADMIN) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
                    <p className="text-gray-600">Este painel é exclusivo para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold">Painel do Administrador</h1>
            <p>Bem-vindo, {user.name}!</p>
            {/* Full admin dashboard implementation will go here */}
        </div>
    );
};
