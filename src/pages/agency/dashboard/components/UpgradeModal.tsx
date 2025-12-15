import React from 'react';
import { Rocket } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan: string;
    maxTrips: number;
    currentActiveTrips: number;
    onUpgrade: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentPlan, maxTrips, currentActiveTrips, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-[scaleIn_0.2s_ease-out]">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Rocket size={32} />
                        <h3 className="text-2xl font-bold">Limite do Plano Atingido</h3>
                    </div>
                    <p className="text-amber-50 text-sm">Faça upgrade para criar mais viagens</p>
                </div>
                <div className="p-6">
                    <p className="text-gray-700 mb-4">
                        Você atingiu o limite do plano <strong>{currentPlan}</strong>.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Viagens ativas:</span>
                            <span className="font-bold text-gray-900">{currentActiveTrips} / {maxTrips === Infinity ? '∞' : maxTrips}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-amber-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (currentActiveTrips / (maxTrips === Infinity ? 1 : maxTrips)) * 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                onUpgrade();
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-colors shadow-lg"
                        >
                            Ver Planos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { UpgradeModal };
