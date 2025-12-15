import React from 'react';
import { User, Calendar, ShieldCheck } from 'lucide-react';
import { Trip } from '../types';

interface BookingWidgetProps {
    trip: Trip;
    adults: number;
    setAdults: (val: number) => void;
    childrenCount: number; // Renamed to avoid reserved word conflict if any
    setChildren: (val: number) => void;
    totalPassengers: number;
    handleBooking: () => void;
    isProcessing: boolean;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({
    trip,
    adults,
    setAdults,
    childrenCount,
    setChildren,
    totalPassengers,
    handleBooking,
    isProcessing
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 h-full">
            <div className="mb-6">
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900">Por:</span>
                    <span className="text-xs font-semibold text-gray-500 self-start mt-2">R$</span>
                    <span className="text-4xl font-extrabold text-gray-900">{trip.price.toLocaleString('pt-BR')}</span>
                    <span className="text-sm text-gray-500 font-normal">/ pessoa</span>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-3 mb-3">
                        <Calendar className="text-primary-600" size={20} />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Data da Viagem</p>
                            <p className="font-bold text-gray-900 text-sm">
                                {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase">Passageiros</p>

                        {/* Adultos */}
                        <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2">
                                <User className="text-primary-600" size={18} />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Adultos</p>
                                    <p className="text-xs text-gray-500">12 anos ou mais</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAdults(Math.max(1, adults - 1))}
                                    className="w-7 h-7 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-gray-200 text-sm font-bold transition-colors"
                                >
                                    -
                                </button>
                                <span className="font-bold text-gray-900 w-6 text-center">{adults}</span>
                                <button
                                    onClick={() => setAdults(adults + 1)}
                                    className="w-7 h-7 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-gray-200 text-sm font-bold transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Crianças - Only show if trip allows children */}
                        {(() => {
                            const passengerConfig = trip.passengerConfig || {
                                allowChildren: trip.allowChildren !== false,
                                allowSeniors: true,
                                childAgeLimit: 12,
                                allowLapChild: false,
                                childPriceMultiplier: 0.7
                            };

                            if (passengerConfig.allowChildren === false) return null;

                            return (
                                <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3 border border-amber-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                            <User className="text-amber-600" size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Crianças</p>
                                            <p className="text-xs text-gray-500">
                                                Menores de {passengerConfig.childAgeLimit || 12} anos
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setChildren(Math.max(0, childrenCount - 1))}
                                            className="w-7 h-7 rounded-full bg-white border border-amber-300 flex items-center justify-center hover:bg-amber-100 text-sm font-bold transition-colors"
                                        >
                                            -
                                        </button>
                                        <span className="font-bold text-gray-900 w-6 text-center">{childrenCount}</span>
                                        <button
                                            onClick={() => setChildren(childrenCount + 1)}
                                            className="w-7 h-7 rounded-full bg-white border border-amber-300 flex items-center justify-center hover:bg-amber-100 text-sm font-bold transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Resumo */}
                        {totalPassengers > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Total de passageiros:</span>
                                    <span className="font-bold text-gray-900">{totalPassengers}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-200">
                    {(() => {
                        // Get passenger config with defaults
                        const passengerConfig = trip.passengerConfig || {
                            allowChildren: trip.allowChildren !== false,
                            allowSeniors: true,
                            childAgeLimit: 12,
                            allowLapChild: false,
                            childPriceMultiplier: 0.7
                        };
                        // Calculate child price: use fixed price if configured, otherwise use multiplier
                        const childPriceValue = passengerConfig.childPriceType === 'fixed' && passengerConfig.childPriceFixed !== undefined
                            ? passengerConfig.childPriceFixed
                            : (trip.price * (passengerConfig.childPriceMultiplier || 0.7));
                        const adultPrice = trip.price * adults;
                        const childPrice = childPriceValue * childrenCount;
                        const totalPrice = adultPrice + childPrice;

                        return (
                            <>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Adultos ({adults}x)</span>
                                    <span className="font-bold text-gray-900">R$ {adultPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {childrenCount > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Crianças ({childrenCount}x)</span>
                                        <span className="font-bold text-amber-600">R$ {childPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                    <span className="text-gray-900 font-bold">Total</span>
                                    <span className="font-bold text-lg text-primary-600">
                                        R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>

            <button
                onClick={handleBooking}
                disabled={isProcessing}
                className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isProcessing ? 'Processando...' : 'Reservar Agora'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                <ShieldCheck size={12} /> Pagamento 100% Seguro
            </p>
        </div>
    );
};
