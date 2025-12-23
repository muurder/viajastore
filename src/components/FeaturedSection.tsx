import React from 'react';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeaturedTrip {
    id: string;
    title: string;
    location: string;
    image: string;
    price: number;
    duration: string;
    groupSize: string;
    category: string;
}

const featuredTrips: FeaturedTrip[] = [
    {
        id: '1',
        title: 'Expedição Jalapão',
        location: 'Tocantins, Brasil',
        image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?q=80&w=2070&auto=format&fit=crop',
        price: 3500,
        duration: '7 dias',
        groupSize: 'Até 12 pessoas',
        category: 'Aventura'
    },
    {
        id: '2',
        title: 'Rota dos Vinhos',
        location: 'Serra Gaúcha, Brasil',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop',
        price: 2800,
        duration: '5 dias',
        groupSize: 'Até 8 pessoas',
        category: 'Gastronomia'
    },
    {
        id: '3',
        title: 'Chapada Diamantina',
        location: 'Bahia, Brasil',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
        price: 2200,
        duration: '6 dias',
        groupSize: 'Até 10 pessoas',
        category: 'Natureza'
    },
    {
        id: '4',
        title: 'Amazônia Profunda',
        location: 'Amazonas, Brasil',
        image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2068&auto=format&fit=crop',
        price: 4200,
        duration: '8 dias',
        groupSize: 'Até 6 pessoas',
        category: 'Expedição'
    }
];

export const FeaturedSection: React.FC = () => {
    return (
        <section className="relative -mt-32 z-30 pb-16 pt-8">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 mt-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg mb-3">
                        Experiências Curadas para Você
                    </h2>
                    <p className="text-lg text-white/90 drop-shadow-md max-w-2xl mx-auto">
                        Viagens autênticas selecionadas por especialistas locais
                    </p>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                    {featuredTrips.map((trip, index) => (
                        <Link
                            key={trip.id}
                            to={`/trip/${trip.id}`}
                            className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
                            style={{
                                animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                            }}
                        >
                            {/* Imagem */}
                            <div className="relative h-64 overflow-hidden">
                                <img
                                    src={trip.image}
                                    alt={trip.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 backdrop-blur-sm text-stone-900 px-3 py-1 rounded-full text-xs font-semibold">
                                        {trip.category}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            {/* Conteúdo */}
                            <div className="p-5">
                                <h3 className="text-xl font-bold text-stone-900 mb-2 group-hover:text-primary-500 transition-colors">
                                    {trip.title}
                                </h3>

                                <div className="flex items-center text-stone-600 text-sm mb-4">
                                    <MapPin size={16} className="mr-1" />
                                    {trip.location}
                                </div>

                                <div className="flex items-center justify-between text-sm text-stone-500 mb-4 pb-4 border-b border-stone-200">
                                    <div className="flex items-center">
                                        <Calendar size={14} className="mr-1" />
                                        {trip.duration}
                                    </div>
                                    <div className="flex items-center">
                                        <Users size={14} className="mr-1" />
                                        {trip.groupSize}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-stone-500">A partir de</p>
                                        <p className="text-2xl font-bold text-secondary-500">
                                            R$ {trip.price.toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white group-hover:bg-secondary-500 transition-colors">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Ver Todas */}
                <div className="text-center mt-12">
                    <Link
                        to="/trips"
                        className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        Ver Todas as Experiências
                        <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FeaturedSection;
