
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole, Booking, Address } from '../types';
import TripCard from '../components/TripCard';
import { User, ShoppingBag, Heart, MapPin, Calendar, Settings, Download, Save, LogOut, X, QrCode, Trash2, AlertTriangle, Camera, Lock, Shield, Loader, Star } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
  const { user, updateUser, logout, deleteAccount, uploadImage, updatePassword } = useAuth();
  const { bookings, getTripById, clients } = useData();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const navigate = useNavigate();

  const { agencySlug, tab } = useParams<{ agencySlug?: string; tab?: string }>();
  const activeTab = tab ? tab.toUpperCase() : 'PROFILE';
  
  const isMicrositeMode = !!agencySlug;

  const dataContextClient = clients.find(c => c.id === user?.id);
  const currentClient = dataContextClient || (user as any);

  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: currentClient?.phone || '',
    cpf: currentClient?.cpf || ''
  });

  const [addressForm, setAddressForm] = useState<Address>({
     zipCode: currentClient?.address?.zipCode || '',
     street: currentClient?.address?.street || '',
     number: currentClient?.address?.number || '',
     complement: currentClient?.address?.complement || '',
     district: currentClient?.address?.district || '',
     city: currentClient?.address?.city || '',
     state: currentClient?.address?.state || ''
  });

  const [passForm, setPassForm] = useState({
     newPassword: '',
     confirmPassword: ''
  });

  if (!user || user.role !== UserRole.CLIENT) {
    navigate(isMicrositeMode ? `/${agencySlug}/unauthorized` : '/unauthorized');
    return null;
  }

  const myBookings = bookings.filter(b => b.clientId === user.id);
  
  const favoriteIds = dataContextClient?.favorites || [];
  const favoriteTrips = favoriteIds.map((id: string) => getTripById(id)).filter((t: any) => t !== undefined);

  const handleLogout = async () => {
    await logout();
    navigate(isMicrositeMode ? `/${agencySlug}` : '/');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      const url = await uploadImage(e.target.files[0], 'avatars');
      if (url) {
          await updateUser({ avatar: url });
      }
      setUploading(false);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressForm({ ...addressForm, zipCode: value });

    const cleanCep = value.replace(/\D/g, '');

    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setAddressForm(prev => ({
            ...prev,
            street: data.logradouro,
            district: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateUser({ 
        name: editForm.name, 
        email: editForm.email,
        phone: editForm.phone,
        cpf: editForm.cpf,
        address: addressForm
    });
    if (res.success) alert('Perfil atualizado com sucesso!');
    else alert('Erro ao atualizar: ' + res.error);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passForm.newPassword !== passForm.confirmPassword) {
          alert('As senhas não coincidem.');
          return;
      }
      const res = await updatePassword(passForm.newPassword);
      if (res.success) {
          alert('Senha alterada com sucesso!');
          setPassForm({ newPassword: '', confirmPassword: '' });
      } else {
          alert('Erro: ' + res.error);
      }
  };

  const handleDeleteAccount = async () => {
      const confirm = window.confirm("Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.");
      if (confirm) {
          const result = await deleteAccount();
          if (result.success) window.location.href = "/";
          else alert("Erro ao excluir conta: " + result.error);
      }
  };
  
  const getNavLink = (tab: string) => isMicrositeMode ? `/${agencySlug}/client/${tab}` : `/client/dashboard/${tab}`;
  const getTabClass = (tab: string) => `w-full flex items-center px-6 py-4 text-left text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'bg-primary-50 text-primary-700 border-primary-600' : 'border-transparent text-gray-600 hover:bg-gray-50'}`;

  return (
    <div className="max-w-6xl mx-auto py-6">
      {!isMicrositeMode && <h1 className="text-3xl font-bold text-gray-900 mb-8">Minha Área</h1>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6 relative group">
             <div className="relative w-24 h-24 mx-auto mb-4">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt={user.name} className="w-24 h-24 rounded-full border-4 border-primary-50 object-cover" />
                 <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 shadow-md transition-transform hover:scale-110">
                     <Camera size={14} />
                     <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                 </label>
                 {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full"><div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>}
             </div>
             <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
             <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>

          <nav className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {[
                { id: 'PROFILE', icon: User, label: 'Meu Perfil' },
                { id: 'BOOKINGS', icon: ShoppingBag, label: 'Minhas Viagens' },
                { id: 'FAVORITES', icon: Heart, label: 'Favoritos' },
                { id: 'SETTINGS', icon: Settings, label: 'Dados & Endereço' },
                { id: 'SECURITY', icon: Shield, label: 'Segurança' }
            ].map((item) => (
                <Link 
                key={item.id}
                to={getNavLink(item.id)}
                className={getTabClass(item.id)}
                >
                <item.icon size={18} className="mr-3" /> {item.label}
                </Link>
            ))}
            <div className="h-px bg-gray-100 my-1"></div>
            <button onClick={handleLogout} className="w-full flex items-center px-6 py-4 text-left text-sm font-medium text-red-600 hover:bg-red-50 border-l-4 border-transparent transition-colors">
                <LogOut size={18} className="mr-3" /> Sair da Conta
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
           
           {activeTab === 'PROFILE' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-gray-900">Resumo do Perfil</h2>
                   <Link to={getNavLink('SETTINGS')} className="text-primary-600 text-sm font-bold hover:underline">Editar Dados</Link>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label>
                   <p className="text-gray-900 font-medium">{user.name}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                   <p className="text-gray-900 font-medium">{user.email}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF</label>
                   <p className="text-gray-900 font-medium">{currentClient?.cpf || '---'}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-xl">
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                   <p className="text-gray-900 font-medium">{currentClient?.phone || '---'}</p>
                 </div>
                 {currentClient?.address?.city && (
                     <div className="bg-gray-50 p-4 rounded-xl md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Endereço Principal</label>
                        <p className="text-gray-900 font-medium">{currentClient.address.street}, {currentClient.address.number} - {currentClient.address.city}/{currentClient.address.state}</p>
                     </div>
                 )}
               </div>

               <div className="mt-10 grid grid-cols-3 gap-4">
                    <div className="border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-primary-600">{myBookings.length}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold mt-1">Viagens</p>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-amber-500">{favoriteTrips.length}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold mt-1">Favoritos</p>
                    </div>
               </div>
             </div>
           )}

           {activeTab === 'BOOKINGS' && (
             <div className="space-y-6 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Minhas Viagens</h2>
               {myBookings.length > 0 ? (
                 myBookings.map(booking => {
                    const trip = getTripById(booking.tripId);
                    if (!trip) return null;
                    const tripLink = isMicrositeMode ? `/${agencySlug}/viagem/${trip.slug}` : `/viagem/${trip.slug}`;
                    
                    return (
                      <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                        <img src={trip.images[0]} alt={trip.title} className="w-full md:w-48 h-32 object-cover rounded-xl" />
                        <div className="flex-1">
                           <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-2">{trip.title}</h3>
                           <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                             <div className="flex items-center text-gray-600"><MapPin size={16} className="mr-2 text-gray-400" /> {trip.destination}</div>
                             <div className="flex items-center text-gray-600"><Calendar size={16} className="mr-2 text-gray-400" /> {new Date(trip.startDate).toLocaleDateString()}</div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => setSelectedBooking(booking)} className="bg-primary-600 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-700 transition-colors shadow-sm">
                                    <QrCode size={16} /> Abrir Voucher
                               </button>
                               <Link to={tripLink} className="bg-amber-50 text-amber-600 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-amber-100 transition-colors border border-amber-100">
                                    <Star size={16} /> Avaliar
                               </Link>
                           </div>
                        </div>
                      </div>
                    );
                 })
               ) : (
                 <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <ShoppingBag size={32} className="text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-900">Nenhuma viagem encontrada</h3>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'FAVORITES' && (
             <div className="animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Meus Favoritos ({favoriteTrips.length})</h2>
               {favoriteTrips.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {favoriteTrips.map((trip: any) => (trip && <TripCard key={trip.id} trip={trip} />))}
                 </div>
               ) : (
                  <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-gray-200">
                   <Heart size={32} className="text-gray-300 mx-auto mb-4" />
                   <h3 className="text-lg font-bold text-gray-900">Lista vazia</h3>
                   <p className="text-gray-500 mt-2">Você ainda não favoritou nenhuma viagem.</p>
                 </div>
               )}
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados Pessoais & Endereço</h2>
               <form onSubmit={handleSaveProfile} className="space-y-8">
                  {/* Dados Pessoais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                        <input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                        <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">CPF</label>
                        <input value={editForm.cpf} onChange={(e) => setEditForm({...editForm, cpf: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="000.000.000-00" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
                        <input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none" />
                      </div>
                  </div>

                  <div className="border-t pt-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Endereço</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-1 relative">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CEP</label>
                             <input 
                               value={addressForm.zipCode} 
                               onChange={handleCepChange} 
                               className="w-full border border-gray-300 rounded-lg p-2" 
                               placeholder="00000-000" 
                             />
                             {loadingCep && <div className="absolute right-3 top-8"><Loader size={14} className="animate-spin text-primary-600"/></div>}
                          </div>
                          <div className="md:col-span-3">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rua</label>
                             <input value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
                          </div>
                          <div className="md:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número</label>
                             <input value={addressForm.number} onChange={e => setAddressForm({...addressForm, number: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
                          </div>
                          <div className="md:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comp.</label>
                             <input value={addressForm.complement} onChange={e => setAddressForm({...addressForm, complement: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bairro</label>
                             <input value={addressForm.district} onChange={e => setAddressForm({...addressForm, district: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
                          </div>
                          <div className="md:col-span-3">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cidade</label>
                             <input value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" />
                          </div>
                          <div className="md:col-span-1">
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado</label>
                             <input value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2" placeholder="UF" />
                          </div>
                      </div>
                  </div>
                  
                  <button type="submit" className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex items-center justify-center gap-2">
                      <Save size={18} /> Salvar Alterações
                  </button>
               </form>
             </div>
           )}

           {activeTab === 'SECURITY' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-[fadeIn_0.3s]">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Segurança</h2>
                  <form onSubmit={handleChangePassword} className="max-w-md space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nova Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="password" value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none" required minLength={6}/>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Nova Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input type="password" value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none" required minLength={6}/>
                        </div>
                      </div>
                      <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black">Alterar Senha</button>
                  </form>

                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center"><AlertTriangle size={20} className="mr-2" /> Zona de Perigo</h3>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                        <p className="text-sm text-red-800 mb-4">Ao excluir sua conta, todos os seus dados serão removidos permanentemente.</p>
                        <button onClick={handleDeleteAccount} className="flex items-center bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 hover:text-white transition-colors">
                            <Trash2 size={16} className="mr-2" /> Excluir minha conta
                        </button>
                    </div>
                  </div>
              </div>
           )}
        </div>
      </div>

      {selectedBooking && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedBooking(null)}>
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="bg-primary-600 p-6 text-white text-center">
                    <h3 className="text-2xl font-bold">Voucher de Viagem</h3>
                    <p className="text-primary-100 text-sm">{selectedBooking.voucherCode}</p>
                </div>
                <div className="p-8 text-center">
                    <QrCode size={120} className="mx-auto mb-4" />
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500 mb-6">{getTripById(selectedBooking.tripId)?.title}</p>
                    <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2"><Download size={18}/> Baixar PDF</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ClientDashboard;
