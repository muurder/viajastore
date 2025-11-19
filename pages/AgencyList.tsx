import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { Building, Star, Search, ArrowRight, CheckCircle, Shield, Users } from 'lucide-react';

const AgencyList: React.FC = () => {
  const { agencies, getAgencyPublicTrips } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Only show agencies that have an active subscription
  const activeAgencies = agencies.filter(a => a.subscriptionStatus === 'ACTIVE');

  // Filter by search term
  const filteredAgencies = activeAgencies.filter(agency => 
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Header & Search */}
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Diretório de Agências</h1>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto text-lg">
            Conecte-se com as melhores agências de turismo do Brasil. 
            Empresas verificadas para garantir a segurança e qualidade da sua próxima viagem.
          </p>
          
          <div className="relative max-w-xl mx-auto shadow-lg rounded-xl">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
             </div>
             <input 
               type="text" 
               placeholder="Busque pelo nome da agência, especialidade..." 
               className="block w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <Building className="absolute -bottom-10 -right-10 text-gray-50 opacity-50 w-64 h-64" />
      </div>

      {/* Info / Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Verificação Rigorosa</h3>
            <p className="text-sm text-gray-500">Todas as agências passam por um processo de validação de documentos e histórico antes de anunciar.</p>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Shield size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Compra Segura</h3>
            <p className="text-sm text-gray-500">Seus pagamentos são protegidos e o serviço é garantido pela ViajaStore e nossos parceiros.</p>
         </div>
         <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <Star size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Avaliações Reais</h3>
            <p className="text-sm text-gray-500">Leia opiniões de quem já viajou com cada agência para tomar a melhor decisão.</p>
         </div>
      </div>

      {/* Results Grid */}
      <div>
        <div className="flex justify-between items-center mb-6 px-2">
           <h2 className="text-xl font-bold text-gray-900">Nossas Agências Parceiras</h2>
           <span className="text-sm text-gray-500">{filteredAgencies.length} encontradas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map(agency => {
            const activeTripsCount = getAgencyPublicTrips(agency.id).length;
            
            return (
              <Link to={`/agency/${agency.id}`} key={agency.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center group relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                 
                 <img 
                   src={agency.logo} 
                   alt={agency.name} 
                   className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm"
                 />
                 
                 <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">{agency.name}</h3>
                 <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10 leading-relaxed">{agency.description}</p>
                 
                 <div className="w-full flex justify-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4 mt-auto bg-gray-50/50 rounded-lg pb-2">
                    <div className="flex flex-col px-4 border-r border-gray-200">
                      <span className="font-bold text-primary-600 text-lg">{activeTripsCount}</span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Viagens</span>
                    </div>
                    <div className="flex flex-col px-4">
                      <span className="font-bold text-amber-500 text-lg flex items-center justify-center">
                         5.0 <Star size={12} className="ml-1 fill-current" />
                      </span>
                      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Nota</span>
                    </div>
                 </div>
                 
                 <button className="mt-6 w-full py-2.5 rounded-lg text-primary-700 font-bold bg-primary-50 group-hover:bg-primary-600 group-hover:text-white transition-colors flex items-center justify-center">
                   Ver Perfil <ArrowRight size={16} className="ml-2 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                 </button>
              </Link>
            );
          })}
        </div>
        
        {filteredAgencies.length === 0 && (
          <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
            <Building size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium">Nenhuma agência encontrada.</p>
            <p className="text-sm">Tente buscar por outro nome.</p>
            {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="mt-4 text-primary-600 hover:underline">Limpar busca</button>
            )}
          </div>
        )}
      </div>

      {/* Become a Partner CTA */}
      <div className="bg-gray-900 rounded-2xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
        <div className="max-w-2xl">
           <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Tem uma agência de turismo?</h2>
           <p className="text-gray-400 text-lg">
             Junte-se ao maior marketplace de viagens do país. Alcance milhares de novos clientes e gerencie suas vendas em um só lugar.
           </p>
           <div className="flex gap-4 mt-6 justify-center md:justify-start text-sm font-medium text-gray-300">
              <span className="flex items-center"><CheckCircle size={16} className="mr-2 text-green-500" /> Cadastro Grátis</span>
              <span className="flex items-center"><CheckCircle size={16} className="mr-2 text-green-500" /> Painel de Gestão</span>
              <span className="flex items-center"><CheckCircle size={16} className="mr-2 text-green-500" /> Suporte Dedicado</span>
           </div>
        </div>
        <Link to="/signup" className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center">
           <Users className="mr-2" size={20} />
           Quero ser Parceiro
        </Link>
      </div>
    </div>
  );
};

export default AgencyList;