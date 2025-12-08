
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Trip, TripCategory, TravelerType, ItineraryDay, BoardingPoint,
  VehicleType, VehicleLayoutConfig, OperationalData, Agency 
} from '../../types';
import { 
  Plus, X, ChevronLeft, ChevronRight, Save, Loader, Info,
  Plane, MapPin, DollarSign, Calendar, Image as ImageIcon,
  BookOpen, Bus, ListChecks, Tags, Check, Settings2, Car, Clock, User, Trash2, ShieldCheck, Square, Globe, Timer, Home,
  Upload // Added Upload icon
} from 'lucide-react';
import { slugify } from '../../utils/slugify';

// Re-declare VEHICLE_TYPES and DEFAULT_OPERATIONAL_DATA for self-containment
const VEHICLE_TYPES: Record<VehicleType, VehicleLayoutConfig> = {
    'CAR_4': { type: 'CAR_4', label: 'Carro de Passeio (4L)', totalSeats: 4, cols: 2, aisleAfterCol: 1 },
    'VAN_15': { type: 'VAN_15', label: 'Van Executiva (15L)', totalSeats: 15, cols: 3, aisleAfterCol: 1 },
    'VAN_20': { type: 'VAN_20', label: 'Van Alongada (20L)', totalSeats: 20, cols: 3, aisleAfterCol: 1 },
    'MICRO_26': { type: 'MICRO_26', label: 'Micro-ônibus (26L)', totalSeats: 26, cols: 4, aisleAfterCol: 2 },
    'BUS_46': { type: 'BUS_46', label: 'Ônibus Executivo (46L)', totalSeats: 46, cols: 4, aisleAfterCol: 2 },
    'BUS_50': { type: 'BUS_50', label: 'Ônibus Leito Turismo (50L)', totalSeats: 50, cols: 4, aisleAfterCol: 2 },
    'DD_60': { type: 'DD_60', label: 'Double Decker (60L)', totalSeats: 60, cols: 4, aisleAfterCol: 2, lowerDeckSeats: 12 },
    'CUSTOM': { type: 'CUSTOM', label: 'Personalizado', totalSeats: 0, cols: 2, aisleAfterCol: 1 }
};

const DEFAULT_OPERATIONAL_DATA: OperationalData = {
    transport: undefined, 
    rooming: [],
    manualPassengers: []
};

const ALL_TRIP_CATEGORIES: TripCategory[] = [
    'PRAIA', 'AVENTURA', 'FAMILIA', 'ROMANTICO', 'URBANO',
    'NATUREZA', 'CULTURA', 'GASTRONOMICO', 'VIDA_NOTURNA',
    'VIAGEM_BARATA', 'ARTE'
];

const ALL_TRAVELER_TYPES: TravelerType[] = [
    'SOZINHO', 'CASAL', 'FAMILIA', 'AMIGOS', 'MOCHILAO', 'MELHOR_IDADE'
];


interface CreateTripWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTripData?: Partial<Trip>;
}

const CreateTripWizard: React.FC<CreateTripWizardProps> = ({ onClose, onSuccess, initialTripData }) => {
  const { user, uploadImage } = useAuth(); // Import uploadImage
  const { createTrip, updateTrip, agencies } = useData();
  const { showToast } = useToast();
  
  const currentAgency = useMemo(() => {
    return agencies.find(a => a.id === user?.id) as Agency;
  }, [agencies, user]);

  const isEditing = useMemo(() => !!initialTripData?.id, [initialTripData]);

  const [currentStep, setCurrentStep] = useState(0);
  const [tripData, setTripData] = useState<Partial<Trip>>(() => ({
    agencyId: currentAgency?.agencyId || '',
    title: '',
    slug: '',
    description: '',
    destination: '',
    price: 0,
    startDate: '',
    endDate: '',
    durationDays: 1,
    images: [],
    category: 'PRAIA',
    tags: [],
    travelerTypes: [],
    itinerary: [],
    boardingPoints: [{ id: crypto.randomUUID(), time: '', location: '' }],
    paymentMethods: [],
    is_active: true,
    featured: false,
    featuredInHero: false,
    popularNearSP: false,
    operationalData: initialTripData?.operationalData || DEFAULT_OPERATIONAL_DATA,
    ...(initialTripData || {})
  }));
  
  // NEW STATE: Files to upload
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate durationDays automatically
  useEffect(() => {
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setTripData(prev => ({ ...prev, durationDays: diffDays + 1 }));
    } else {
        setTripData(prev => ({ ...prev, durationDays: 1 }));
    }
  }, [tripData.startDate, tripData.endDate]);

  // Set initial data if editing
  useEffect(() => {
      if (isEditing && initialTripData) {
          const formattedStartDate = initialTripData.startDate ? new Date(initialTripData.startDate).toISOString().split('T')[0] : '';
          const formattedEndDate = initialTripData.endDate ? new Date(initialTripData.endDate).toISOString().split('T')[0] : '';

          setTripData({
              ...initialTripData,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              boardingPoints: initialTripData.boardingPoints && initialTripData.boardingPoints.length > 0
                ? initialTripData.boardingPoints
                : [{ id: crypto.randomUUID(), time: '', location: '' }],
              itinerary: initialTripData.itinerary && initialTripData.itinerary.length > 0
                ? initialTripData.itinerary
                : [{ day: 1, title: '', description: '' }],
              operationalData: initialTripData.operationalData || DEFAULT_OPERATIONAL_DATA,
          });
      }
  }, [isEditing, initialTripData]);


  // Validation for each step
  const validateStep = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 0) { // Basic Details
      if (!tripData.title) newErrors.title = "Título é obrigatório.";
      if (!tripData.destination) newErrors.destination = "Destino é obrigatório.";
      if (!tripData.price || tripData.price <= 0) newErrors.price = "Preço deve ser maior que zero.";
      if (!tripData.startDate) newErrors.startDate = "Data de Início é obrigatória.";
      if (!tripData.endDate) newErrors.endDate = "Data de Fim é obrigatória.";
      if (tripData.startDate && tripData.endDate && new Date(tripData.startDate) > new Date(tripData.endDate)) {
        newErrors.dates = "Data de início não pode ser maior que a data de fim.";
      }
    } else if (currentStep === 1) { // Media & Description
      // Check both existing images AND pending uploads
      const totalImages = (tripData.images?.length || 0) + filesToUpload.length;
      if (totalImages === 0) newErrors.images = "Adicione ao menos uma imagem.";
      
      if (!tripData.description || tripData.description.length < 50) newErrors.description = "Descrição precisa ter ao menos 50 caracteres.";
    } else if (currentStep === 2) { // Logistics
      if (!tripData.operationalData?.transport?.vehicleConfig) {
        newErrors.vehicleConfig = "Selecione um layout de veículo.";
      }
      if (!tripData.boardingPoints || tripData.boardingPoints.length === 0 || tripData.boardingPoints.some(bp => !bp.time || !bp.location)) {
        newErrors.boardingPoints = "Adicione ao menos um ponto de embarque completo.";
      }
    } else if (currentStep === 3) { // Itinerary
      if (!tripData.itinerary || tripData.itinerary.length === 0 || tripData.itinerary.some(day => !day.title || !day.description)) {
        newErrors.itinerary = "Adicione ao menos um dia de roteiro completo.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, tripData, filesToUpload]);

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    } else {
      showToast("Preencha todos os campos obrigatórios.", "error");
    }
  };

  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handlePublish = async () => {
    if (!validateStep()) {
      showToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (!currentAgency?.agencyId) {
        showToast("Erro: ID da agência não encontrado.", "error");
        return;
    }

    setIsLoading(true);
    try {
      // 1. Upload Pending Files
      const uploadedUrls: string[] = [];
      if (filesToUpload.length > 0) {
          for (const file of filesToUpload) {
              const url = await uploadImage(file, 'trip-images');
              if (url) uploadedUrls.push(url);
          }
      }

      // 2. Combine with existing URLs
      const finalImages = [...(tripData.images || []), ...uploadedUrls];

      const finalTrip: Trip = {
        id: tripData.id || crypto.randomUUID(),
        agencyId: currentAgency.agencyId,
        title: tripData.title!,
        slug: tripData.slug || slugify(tripData.title!),
        description: tripData.description!,
        destination: tripData.destination!,
        price: tripData.price!,
        startDate: new Date(tripData.startDate!).toISOString(),
        endDate: new Date(tripData.endDate!).toISOString(),
        durationDays: tripData.durationDays!,
        images: finalImages, // Use consolidated images
        category: tripData.category!,
        tags: tripData.tags!,
        travelerTypes: tripData.travelerTypes!,
        itinerary: tripData.itinerary,
        boardingPoints: tripData.boardingPoints,
        paymentMethods: tripData.paymentMethods,
        is_active: tripData.is_active!,
        included: tripData.included!,
        notIncluded: tripData.notIncluded,
        featured: tripData.featured!,
        featuredInHero: tripData.featuredInHero!,
        popularNearSP: tripData.popularNearSP!,
        operationalData: tripData.operationalData,
      };

      if (isEditing) {
        await updateTrip(finalTrip);
        showToast("Pacote atualizado com sucesso!", "success");
      } else {
        await createTrip(finalTrip);
        showToast("Novo pacote criado com sucesso!", "success");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(`Erro ao salvar pacote: ${error.message}`, "error");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 1: Basic Details ---
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Título do Pacote <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={tripData.title || ''}
          onChange={e => setTripData({ ...tripData, title: e.target.value, slug: slugify(e.target.value) })}
          className={`w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
          placeholder="Ex: Fim de Semana em Campos do Jordão"
          required
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Destino <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={tripData.destination || ''}
          onChange={e => setTripData({ ...tripData, destination: e.target.value })}
          className={`w-full border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
          placeholder="Cidade, UF"
          required
        />
        {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={tripData.price || ''}
            onChange={e => setTripData({ ...tripData, price: parseFloat(e.target.value) })}
            className={`w-full border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
            required
            min="0"
            step="0.01"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Categoria <span className="text-red-500">*</span></label>
          <select
            value={tripData.category || 'PRAIA'}
            onChange={e => setTripData({ ...tripData, category: e.target.value as TripCategory })}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
          >
            {ALL_TRIP_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={tripData.startDate || ''}
            onChange={e => setTripData({ ...tripData, startDate: e.target.value })}
            className={`w-full border ${errors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
            required
          />
          {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Data de Fim <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={tripData.endDate || ''}
            onChange={e => setTripData({ ...tripData, endDate: e.target.value })}
            className={`w-full border ${errors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
            required
          />
          {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
        </div>
        {errors.dates && <p className="text-red-500 text-xs mt-1 md:col-span-2">{errors.dates}</p>}
      </div>
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-700 flex items-center gap-2">
        <Info size={16} />
        A duração da viagem será calculada automaticamente: {tripData.durationDays} dia(s).
      </div>
    </div>
  );

  // --- Step 2: Mídia & Descrição (Refactored) ---
  const renderStep2 = () => {
    // Handler for File Input
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
      }
    };

    // Remove Existing URL
    const handleRemoveUrl = (urlToRemove: string) => {
        setTripData(prev => ({ 
            ...prev, 
            images: (prev.images || []).filter(url => url !== urlToRemove) 
        }));
    };

    // Remove Pending File
    const handleRemoveFile = (indexToRemove: number) => {
        setFilesToUpload(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    // Tag Logic
    const handleAddTag = (tagText: string) => {
        const cleanedTag = tagText.trim().toLowerCase();
        if (cleanedTag && !tripData.tags?.includes(cleanedTag)) {
            setTripData(prev => ({ ...prev, tags: [...(prev.tags || []), cleanedTag] }));
        }
    };
    const handleRemoveTag = (tagToRemove: string) => {
        setTripData(prev => ({ ...prev, tags: (prev.tags || []).filter(tag => tag !== tagToRemove) }));
    };

    // Include/Exclude Logic
    const handleAddIncluded = (itemText: string) => {
        const cleanedItem = itemText.trim();
        if (cleanedItem && !tripData.included?.includes(cleanedItem)) {
            setTripData(prev => ({ ...prev, included: [...(prev.included || []), cleanedItem] }));
        }
    };
    const handleRemoveIncluded = (itemToRemove: string) => {
        setTripData(prev => ({ ...prev, included: (prev.included || []).filter(item => item !== itemToRemove) }));
    };
    
    const handleAddNotIncluded = (itemText: string) => {
        const cleanedItem = itemText.trim();
        if (cleanedItem && !tripData.notIncluded?.includes(cleanedItem)) {
            setTripData(prev => ({ ...prev, notIncluded: [...(prev.notIncluded || []), cleanedItem] }));
        }
    };
    const handleRemoveNotIncluded = (itemToRemove: string) => {
        setTripData(prev => ({ ...prev, notIncluded: (prev.notIncluded || []).filter(item => item !== itemToRemove) }));
    };

    const handleAddTravelerType = (type: TravelerType) => {
        if (!tripData.travelerTypes?.includes(type)) {
            setTripData(prev => ({ ...prev, travelerTypes: [...(prev.travelerTypes || []), type] }));
        }
    };
    const handleRemoveTravelerType = (typeToRemove: TravelerType) => {
        setTripData(prev => ({ ...prev, travelerTypes: (prev.travelerTypes || []).filter(type => type !== typeToRemove) }));
    };

    return (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Imagens do Pacote <span className="text-red-500">*</span></label>
          
          {/* File Upload Dropzone */}
          <div className="mb-4">
            <label 
              htmlFor="img-upload" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-primary-50 transition-colors"
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-primary-500 mb-2" />
                    <p className="text-sm text-gray-500"><span className="font-bold text-primary-600">Clique para carregar</span> ou arraste fotos aqui</p>
                    <p className="text-xs text-gray-400">PNG, JPG ou WEBP</p>
                </div>
                <input id="img-upload" type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
          
          {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
          
          {/* Hybrid Preview Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
            {/* 1. Existing URLs */}
            {tripData.images?.map((url, index) => (
              <div key={`url-${index}`} className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200 group">
                <img src={url} alt={`Existente ${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveUrl(url)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remover"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 text-center truncate">Salvo</div>
              </div>
            ))}

            {/* 2. Pending Files */}
            {filesToUpload.map((file, index) => (
              <div key={`file-${index}`} className="relative w-full aspect-video rounded-lg overflow-hidden border border-amber-200 ring-1 ring-amber-300 group">
                <img src={URL.createObjectURL(file)} alt={`Novo ${index}`} className="w-full h-full object-cover opacity-90" />
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remover"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-amber-500 text-white text-[9px] px-1 py-0.5 text-center font-bold">Novo Upload</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Completa <span className="text-red-500">*</span></label>
          <textarea
            value={tripData.description || ''}
            onChange={e => setTripData({ ...tripData, description: e.target.value })}
            className={`w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
            rows={5}
            placeholder="Detalhes do roteiro, o que levar, etc."
            required
          />
          {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Tags */}
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags / Palavras-chave</label>
                <input
                    type="text"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                            e.preventDefault();
                            handleAddTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Pressione Enter para adicionar tags"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                    {tripData.tags?.map((tag, index) => (
                        <span key={index} className="flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-medium">
                            {tag}
                            <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 text-gray-500 hover:text-gray-900"><X size={12}/></button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Traveler Types */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Ideal para</label>
                <div className="flex flex-wrap gap-2">
                    {ALL_TRAVELER_TYPES.map(type => (
                        <button
                            type="button"
                            key={type}
                            onClick={() => tripData.travelerTypes?.includes(type) ? handleRemoveTravelerType(type) : handleAddTravelerType(type)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border
                                ${tripData.travelerTypes?.includes(type) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                        >
                            {tripData.travelerTypes?.includes(type) && <Check size={14} />} {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Included */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">O que está incluso</label>
                <input
                    type="text"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                            e.preventDefault();
                            handleAddIncluded(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Pressione Enter para adicionar um item"
                />
                <div className="space-y-1 mt-3">
                    {tripData.included?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-green-50 text-green-800 px-3 py-2 rounded-lg text-sm">
                            <span><Check size={16} className="inline mr-2"/>{item}</span>
                            <button type="button" onClick={() => handleRemoveIncluded(item)} className="ml-2 text-green-600 hover:text-green-900"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Not Included */}
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">O que NÃO está incluso (Opcional)</label>
                <input
                    type="text"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                            e.preventDefault();
                            handleAddNotIncluded(e.currentTarget.value);
                            e.currentTarget.value = '';
                        }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Pressione Enter para adicionar um item"
                />
                <div className="space-y-1 mt-3">
                    {tripData.notIncluded?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-red-50 text-red-800 px-3 py-2 rounded-lg text-sm">
                            <span><X size={16} className="inline mr-2"/>{item}</span>
                            <button type="button" onClick={() => handleRemoveNotIncluded(item)} className="ml-2 text-red-600 hover:text-red-900"><X size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  };

  // --- Step 3: Logística (Operacional) ---
  const renderStep3 = () => {
    const handleVehicleChange = (type: VehicleType) => {
      const newConfig = VEHICLE_TYPES[type];
      setTripData(prev => ({
        ...prev,
        operationalData: {
          ...(prev.operationalData || DEFAULT_OPERATIONAL_DATA),
          transport: {
            vehicleConfig: newConfig,
            seats: [] // Reset seats when layout changes
          }
        }
      }));
    };

    const handleCustomVehicleChange = (field: string, value: any) => {
        setTripData(prev => ({
            ...prev,
            operationalData: {
                ...(prev.operationalData || DEFAULT_OPERATIONAL_DATA),
                transport: {
                    ...(prev.operationalData?.transport || { vehicleConfig: VEHICLE_TYPES.CUSTOM, seats: [] }),
                    vehicleConfig: {
                        ...(prev.operationalData?.transport?.vehicleConfig || VEHICLE_TYPES.CUSTOM),
                        [field]: value,
                        // Update aisleAfterCol if cols changes dynamically
                        ...(field === 'cols' && { aisleAfterCol: Math.floor(value / 2) })
                    } as VehicleLayoutConfig
                }
            }
        }));
    };

    const handleAddBoardingPoint = () => {
      setTripData(prev => ({
        ...prev,
        boardingPoints: [...(prev.boardingPoints || []), { id: crypto.randomUUID(), time: '', location: '' }]
      }));
    };

    const handleUpdateBoardingPoint = (id: string, field: 'time' | 'location', value: string) => {
      setTripData(prev => ({
        ...prev,
        boardingPoints: (prev.boardingPoints || []).map(bp =>
          bp.id === id ? { ...bp, [field]: value } : bp
        )
      }));
    };

    const handleRemoveBoardingPoint = (id: string) => {
      setTripData(prev => ({
        ...prev,
        boardingPoints: (prev.boardingPoints || []).filter(bp => bp.id !== id)
      }));
    };

    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Layout do Veículo <span className="text-red-500">*</span></label>
          <select
            value={tripData.operationalData?.transport?.vehicleConfig?.type || ''}
            onChange={e => handleVehicleChange(e.target.value as VehicleType)}
            className={`w-full border ${errors.vehicleConfig ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer`}
            required
          >
            <option value="">Selecione um layout</option>
            {Object.values(VEHICLE_TYPES).map(v => (
              <option key={v.type} value={v.type}>{v.label}</option>
            ))}
          </select>
          {errors.vehicleConfig && <p className="text-red-500 text-xs mt-1">{errors.vehicleConfig}</p>}
        </div>

        {/* Custom Vehicle Configuration */}
        {tripData.operationalData?.transport?.vehicleConfig?.type === 'CUSTOM' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4 animate-[fadeIn_0.3s]">
                <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2"><Settings2 size={16}/> Configurar Veículo Personalizado</h4>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Veículo</label>
                    <input
                        type="text"
                        value={tripData.operationalData.transport.vehicleConfig.label}
                        onChange={e => handleCustomVehicleChange('label', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Doblo Prata, Carro do Guia, Van Alugada"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total de Lugares</label>
                    <input
                        type="number"
                        value={tripData.operationalData.transport.vehicleConfig.totalSeats}
                        onChange={e => handleCustomVehicleChange('totalSeats', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        min="1" max="100"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colunas no Mapa</label>
                    <select
                        value={tripData.operationalData.transport.vehicleConfig.cols}
                        onChange={e => handleCustomVehicleChange('cols', parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value={2}>2 Colunas (Carro)</option>
                        <option value={3}>3 Colunas (Van)</option>
                        <option value={4}>4 Colunas (Ônibus)</option>
                    </select>
                </div>
            </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Pontos de Embarque <span className="text-red-500">*</span></label>
          {errors.boardingPoints && <p className="text-red-500 text-xs mt-1 mb-2">{errors.boardingPoints}</p>}
          <div className="space-y-4">
            {tripData.boardingPoints?.map((bp, index) => (
              <div key={bp.id} className="flex flex-col md:flex-row gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 animate-[fadeIn_0.3s]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horário</label>
                  <input
                    type="time"
                    value={bp.time}
                    onChange={e => handleUpdateBoardingPoint(bp.id, 'time', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    required
                  />
                </div>
                <div className="flex-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                  <input
                    type="text"
                    value={bp.location}
                    onChange={e => handleUpdateBoardingPoint(bp.id, 'location', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ex: Metrô Tietê, Terminal Rodoviário"
                    required
                  />
                </div>
                {tripData.boardingPoints!.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBoardingPoint(bp.id)}
                    className="md:self-end flex-shrink-0 bg-red-50 text-red-600 p-2.5 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddBoardingPoint}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Plus size={16} /> Adicionar Ponto de Embarque
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Step 4: Roteiro ---
  const renderStep4 = () => {
    const handleAddItineraryDay = () => {
      setTripData(prev => ({
        ...prev,
        itinerary: [...(prev.itinerary || []), { day: (prev.itinerary?.length || 0) + 1, title: '', description: '' }]
      }));
    };

    const handleUpdateItineraryDay = (dayNum: number, field: 'title' | 'description', value: string) => {
      setTripData(prev => ({
        ...prev,
        itinerary: (prev.itinerary || []).map(day =>
          day.day === dayNum ? { ...day, [field]: value } : day
        )
      }));
    };

    const handleRemoveItineraryDay = (dayNum: number) => {
      setTripData(prev => ({
        ...prev,
        itinerary: (prev.itinerary || [])
          .filter(day => day.day !== dayNum)
          .map((day, index) => ({ ...day, day: index + 1 })) // Re-number days
      }));
    };

    // Ensure there's always at least one day
    useEffect(() => {
        if (!tripData.itinerary || tripData.itinerary.length === 0) {
            setTripData(prev => ({
                ...prev,
                itinerary: [{ day: 1, title: '', description: '' }]
            }));
        }
    }, [tripData.itinerary]);


    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Roteiro Dia a Dia <span className="text-red-500">*</span></label>
          {errors.itinerary && <p className="text-red-500 text-xs mt-1 mb-2">{errors.itinerary}</p>}
          <div className="space-y-6">
            {tripData.itinerary?.map((day, index) => (
              <div key={day.day} className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-[fadeIn_0.3s]">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-900 text-lg">Dia {day.day}</h4>
                  {tripData.itinerary!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItineraryDay(day.day)}
                      className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Dia</label>
                    <input
                      type="text"
                      value={day.title}
                      onChange={e => handleUpdateItineraryDay(day.day, 'title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: Chegada em Foz, Passeio de Barco"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição das Atividades</label>
                    <textarea
                      value={day.description}
                      onChange={e => handleUpdateItineraryDay(day.day, 'description', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      rows={4}
                      placeholder="Descreva as atividades deste dia."
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItineraryDay}
              className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Plus size={16} /> Adicionar Dia ao Roteiro
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Step 5: Final Settings ---
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={tripData.is_active || false}
            onChange={e => setTripData({ ...tripData, is_active: e.target.checked })}
            className="h-5 w-5 rounded text-primary-600 border-gray-300 focus:ring-primary-500"
          />
          <span className="text-sm font-bold text-gray-700">Publicar agora</span>
          <Info size={16} className="text-gray-400" />
        </label>
        <p className="text-xs text-gray-500 mt-1 pl-8">Desmarque para salvar como rascunho e publicar depois.</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={tripData.featured || false}
            onChange={e => setTripData({ ...tripData, featured: e.target.checked })}
            className="h-5 w-5 rounded text-amber-600 border-gray-300 focus:ring-amber-500"
          />
          <span className="text-sm font-bold text-gray-700">Destacar na ViajaStore</span>
          <ShieldCheck size={16} className="text-amber-500" />
        </label>
        <p className="text-xs text-gray-500 mt-1 pl-8">Aparecerá na Home do marketplace (sujeito a aprovação do Admin).</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={tripData.featuredInHero || false}
            onChange={e => setTripData({ ...tripData, featuredInHero: e.target.checked })}
            className="h-5 w-5 rounded text-purple-600 border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm font-bold text-gray-700">Destacar no meu Microsite</span>
          <Home size={16} className="text-purple-500" />
        </label>
        <p className="text-xs text-gray-500 mt-1 pl-8">Aparecerá no carrossel principal da sua página de agência.</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={tripData.popularNearSP || false}
            onChange={e => setTripData({ ...tripData, popularNearSP: e.target.checked })}
            className="h-5 w-5 rounded text-green-600 border-gray-300 focus:ring-green-500"
          />
          <span className="text-sm font-bold text-gray-700">Popular perto de SP</span>
          <Globe size={16} className="text-green-500" />
        </label>
        <p className="text-xs text-gray-500 mt-1 pl-8">Aparecerá como sugestão para usuários da região de São Paulo.</p>
      </div>
    </div>
  );

  const steps = [
    { title: "Detalhes Básicos", icon: Plane, content: renderStep1() },
    { title: "Mídia & Descrição", icon: ImageIcon, content: renderStep2() },
    { title: "Logística Operacional", icon: Bus, content: renderStep3() },
    { title: "Roteiro Dia a Dia", icon: BookOpen, content: renderStep4() },
    { title: "Publicação & Destaques", icon: ListChecks, content: renderStep5() },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full" aria-label="Fechar Wizard"><X size={20}/></button>
        
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                <Plane size={24}/>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{isEditing ? `Editar Pacote: ${tripData.title}` : 'Criar Novo Pacote'}</h2>
                <p className="text-sm text-gray-500">Passo {currentStep + 1} de {steps.length}: {steps[currentStep].title}</p>
            </div>
        </div>

        <div className="mb-8 h-2 bg-gray-100 rounded-full">
            <div className="bg-primary-600 h-full rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
        </div>

        {steps[currentStep].content}

        <div className="mt-8 flex justify-between gap-4 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <ChevronLeft size={18} /> Voltar
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} {isEditing ? 'Atualizar Pacote' : 'Publicar Pacote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTripWizard;
