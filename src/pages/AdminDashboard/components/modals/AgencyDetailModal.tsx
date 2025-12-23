import React from 'react';
import { X as XIcon, Star, ShoppingBag } from 'lucide-react';
import { AgencyDetailModalProps } from '../../types';

export const AgencyDetailModal: React.FC<AgencyDetailModalProps> = ({
    isOpen,
    agency,
    onClose,
    onEdit,
    bookings,
    reviews,
    trips
}) => {
    if (!isOpen || !agency) return null;

    const agencyBookings = bookings.filter(b => {
        const trip = trips.find(t => t.id === b.tripId);
        return trip && trip.agencyId === agency.agencyId;
    });
    const agencyReviews = reviews.filter(r => r.agencyId === agency.agencyId);
    const totalRevenue = agencyBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const agencyTrips = trips.filter(t => t.agencyId === agency.agencyId);

    return (
        <>
            <div
                className="fixed inset-0 bg-black /60 backdrop - blur - sm z - [100] animate - [fadeIn_0.2s]"
                onClick={onClose}
            />
            <div
                className="fixed inset-0 z-[101] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-6 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <XIcon size={24} />
                        </button>
                        <div className="flex items-center gap-6">
                            <img
                                src={agency.logo_url || `https://ui-avatars.com/api/?name=${agency.name}`}
                                className="w-20 h-20 rounded-full ring-4 ring-slate-200"
                                alt=""
                            />
                            <div className="flex-1">
                                <h2 className="text-3xl font-semibold mb-1 text-slate-900">{agency.name}</h2>
                                <p className="text-slate-600 text-lg">{agency.email || '---'}</p>
                                {agency.phone && (
                                    <p className="text-primary-100 text-sm mt-1">{agency.phone}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${agency.subscriptionStatus === 'ACTIVE'
                                    ? 'bg-green-500/20 text-green-100 border border-green-300/30'
                                    : 'bg-red-500/20 text-red-100 border border-red-300/30'
                                    }`}>
                                    {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                </span>
                                {agency.subscriptionPlan === 'PREMIUM' && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white mt-2 block">
                                        PREMIUM
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Pacotes</p>
                                <p className="text-2xl font-extrabold text-blue-900">{agencyTrips.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Receita Total</p>
                                <p className="text-2xl font-extrabold text-green-900">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Avaliações</p>
                                <p className="text-2xl font-extrabold text-amber-900">{agencyReviews.length}</p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Vendas</p>
                                <p className="text-2xl font-extrabold text-purple-900">{agencyBookings.length}</p>
                            </div>
                        </div>

                        {/* Recent Bookings */}
                        {agencyBookings.length > 0 && (
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                                    <ShoppingBag size={20} className="text-primary-600" />
                                    Vendas Recentes
                                </h3>
                                <div className="space-y-3">
                                    {agencyBookings.slice(0, 3).map(booking => {
                                        const trip = trips.find(t => t.id === booking.tripId);
                                        return (
                                            <div key={booking.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{trip?.title || 'Viagem não encontrada'}</p>
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            {new Date(booking.createdAt).toLocaleDateString('pt-BR')} • R$ {booking.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'CONFIRMED'
                                                        ? 'bg-green-100 text-green-700'
                                                        : booking.status === 'PENDING'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent Reviews */}
                        {agencyReviews.length > 0 && (
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                                    <Star size={20} className="text-amber-500" />
                                    Avaliações Recentes
                                </h3>
                                <div className="space-y-3">
                                    {agencyReviews.slice(0, 2).map(review => (
                                        <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={14}
                                                                className={i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700">{review.clientName}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-gray-200 px-8 py-6 bg-gray-50 flex items-center justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-700 font-semibold rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={() => {
                                onEdit();
                                onClose();
                            }}
                            className="px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Editar Perfil
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
