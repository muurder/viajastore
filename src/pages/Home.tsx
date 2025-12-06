// This file is created to ensure the Home component exists at the correct path.
import React from 'react';
import { useData } from '../context/DataContext';
import { TripCard, TripCardSkeleton } from '../components/TripCard';

const Home: React.FC = () => {
    const { trips, loading } = useData();

    const featuredTrips = trips.filter(t => t.featured).slice(0, 3);

    return (
        <div className="space-y-12">
            <section className="text-center py-16">
                <h1 className="text-5xl font-extrabold text-gray-900">Encontre sua Próxima Aventura</h1>
                <p className="text-xl text-gray-500 mt-4">As melhores viagens, selecionadas para você.</p>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Destaques do Mês</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading 
                        ? Array.from({ length: 3 }).map((_, i) => <TripCardSkeleton key={i} />)
                        : featuredTrips.map(trip => <TripCard key={trip.id} trip={trip} />)
                    }
                </div>
            </section>
        </div>
    );
};

export default Home;
