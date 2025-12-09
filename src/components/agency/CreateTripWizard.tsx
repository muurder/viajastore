
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trip, TripCategory, OperationalData, Agency, BoardingPoint } from '../../types';
import { 
  X, ChevronLeft, ChevronRight, Save, Loader, Info,
  Plane, MapPin, Image as ImageIcon,
  Upload, Check, Plus, Calendar, DollarSign, Clock, Tag, Bus, Trash2
} from 'lucide-react';
import { slugify } from '../../utils/slugify';
import { normalizeSlug, generateUniqueSlug, validateSlug } from '../../utils/slugUtils';

// Minimal defaults to satisfy DB constraints without wizard steps
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

const SUGGESTED_TAGS = ['Praia', 'Montanha', 'Cidade', 'História', 'Relax', 'Ecoturismo', 'Luxo', 'Econômico', 'Bate-volta'];

interface CreateTripWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTripData?: Partial<Trip>;
}

const DRAFT_STORAGE_KEY = 'viajastore_trip_draft';

const CreateTripWizard: React.FC<CreateTripWizardProps> = ({ onClose, onSuccess, initialTripData }) => {
  const { user, uploadImage } = useAuth(); 
  const { createTrip, updateTrip, agencies } = useData();
  const { showToast } = useToast();
  
  const currentAgency = useMemo(() => {
    return agencies.find(a => a.id === user?.id) as Agency;
  }, [agencies, user]);

  const isEditing = useMemo(() => !!initialTripData?.id, [initialTripData]);

  // Simplified to 2 steps: 0 (Details) and 1 (Media/Content)
  const [currentStep, setCurrentStep] = useState(0);
  
  // Local state for raw files - strictly used only in handlePublish
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  
  // Initialize tripData with draft restoration
  const [tripData, setTripData] = useState<Partial<Trip>>(() => {
    // If editing, use initialTripData
    if (initialTripData?.id) {
      return {
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
        boardingPoints: [{ id: crypto.randomUUID(), time: '08:00', location: 'A definir' }],
        paymentMethods: ['PIX', 'CREDIT_CARD'],
        is_active: true,
        featured: false,
        featuredInHero: false,
        popularNearSP: false,
        included: [],
        notIncluded: [],
        operationalData: DEFAULT_OPERATIONAL_DATA,
        ...initialTripData
      };
    }
    
    // Check for draft in localStorage
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        // Only restore if draft is recent (less than 7 days old)
        if (parsedDraft.timestamp && (Date.now() - parsedDraft.timestamp) < 7 * 24 * 60 * 60 * 1000) {
          return {
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
            boardingPoints: [{ id: crypto.randomUUID(), time: '08:00', location: 'A definir' }],
            paymentMethods: ['PIX', 'CREDIT_CARD'],
            is_active: true,
            featured: false,
            featuredInHero: false,
            popularNearSP: false,
            included: [],
            notIncluded: [],
            operationalData: DEFAULT_OPERATIONAL_DATA,
            ...parsedDraft.data
          };
        }
      }
    } catch (err) {
      console.error('Error restoring draft:', err);
    }
    
    // Default empty state
    return {
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
      boardingPoints: [{ id: crypto.randomUUID(), time: '08:00', location: 'A definir' }],
      paymentMethods: ['PIX', 'CREDIT_CARD'],
      is_active: true,
      featured: false,
      featuredInHero: false,
      popularNearSP: false,
      included: [],
      notIncluded: [],
      operationalData: DEFAULT_OPERATIONAL_DATA
    };
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDraftRestore, setShowDraftRestore] = useState(false);

  // Auto-calculate duration, but respect user edits
  useEffect(() => {
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = end.getTime() - start.getTime();
      
      if (!isNaN(diffTime)) {
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setTripData(prev => ({ ...prev, durationDays: diffDays >= 0 ? diffDays + 1 : 1 }));
      }
    }
  }, [tripData.startDate, tripData.endDate]);

  // Initialize data for editing
  useEffect(() => {
      if (isEditing && initialTripData) {
          const formattedStartDate = initialTripData.startDate ? new Date(initialTripData.startDate).toISOString().split('T')[0] : '';
          const formattedEndDate = initialTripData.endDate ? new Date(initialTripData.endDate).toISOString().split('T')[0] : '';

          setTripData({
              ...initialTripData,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
              operationalData: initialTripData.operationalData || DEFAULT_OPERATIONAL_DATA,
          });
      }
  }, [isEditing, initialTripData]);

  // Check for draft on mount (only if not editing)
  useEffect(() => {
    if (!isEditing) {
      try {
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
          const parsedDraft = JSON.parse(draft);
          if (parsedDraft.timestamp && (Date.now() - parsedDraft.timestamp) < 7 * 24 * 60 * 60 * 1000) {
            setShowDraftRestore(true);
          }
        }
      } catch (err) {
        console.error('Error checking draft:', err);
      }
    }
  }, [isEditing]);

  // Auto-save to localStorage on every tripData change (debounced)
  useEffect(() => {
    if (isEditing) return; // Don't save drafts when editing existing trip
    
    const timeoutId = setTimeout(() => {
      try {
        const draftData = {
          data: tripData,
          timestamp: Date.now()
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch (err) {
        console.error('Error saving draft:', err);
      }
    }, 1000); // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [tripData, isEditing]);

  // Clear draft when component unmounts (if successfully published)
  useEffect(() => {
    return () => {
      // Only clear if we're not in a loading state (successful publish)
      if (!isLoading) {
        // Draft will be cleared in handlePublish on success
      }
    };
  }, [isLoading]);

  const validateStep = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 0) { // Details
      if (!tripData.title) newErrors.title = "Título é obrigatório.";
      if (!tripData.destination) newErrors.destination = "Destino é obrigatório.";
      if (!tripData.price || tripData.price <= 0) newErrors.price = "Preço inválido.";
      if (!tripData.startDate) newErrors.startDate = "Data de Início obrigatória.";
      if (!tripData.endDate) newErrors.endDate = "Data de Fim obrigatória.";
      if (tripData.startDate && tripData.endDate && new Date(tripData.startDate) > new Date(tripData.endDate)) {
        newErrors.dates = "A data final deve ser depois da inicial.";
      }
    } else if (currentStep === 1) { // Media
      const totalImages = (tripData.images?.length || 0) + filesToUpload.length;
      if (totalImages === 0) newErrors.images = "Adicione pelo menos uma imagem.";
      if (!tripData.description || tripData.description.length < 20) newErrors.description = "Escreva uma descrição (min 20 caracteres).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, tripData, filesToUpload.length]);

  const handleNext = () => {
    if (validateStep()) setCurrentStep(prev => prev + 1);
    else showToast("Verifique os campos obrigatórios.", "error");
  };

  const handleBack = () => setCurrentStep(prev => prev - 1);

  // --- CRITICAL: BULLETPROOF UPLOAD LOGIC ---
  const handlePublish = async () => {
    if (!validateStep()) {
      showToast("Preencha todos os campos obrigatórios.", "error");
      return;
    }

    if (!currentAgency?.agencyId) {
        showToast("Erro de sessão: Agência não identificada.", "error");
        return;
    }

    setIsLoading(true);
    setUploadProgress(null);
    
    try {
      // Wrap entire operation in timeout (15 seconds)
      const publishPromise = (async () => {
        // 1. Upload Loop with Progress Tracking
        const uploadedUrls: string[] = [];
        const failedUploads: string[] = [];
        
        if (filesToUpload.length > 0) {
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            setUploadProgress({ current: i + 1, total: filesToUpload.length, fileName: file.name });
            
            try {
              // Individual upload timeout (30 seconds per file)
              const uploadPromise = uploadImage(file, 'trip-images');
              const timeoutPromise = new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Upload timeout')), 30000)
              );
              
              const url = await Promise.race([uploadPromise, timeoutPromise]);
              if (url) uploadedUrls.push(url);
            } catch (err: any) {
              console.error("Falha no upload de arquivo individual:", err);
              failedUploads.push(file.name);
              showToast(`Falha no upload de ${file.name}`, 'warning');
            }
          }
        }
        
        setUploadProgress(null);

        // 2. Merge Images
        const finalImages = [...(tripData.images || []), ...uploadedUrls];
        
        if (finalImages.length === 0 && !isEditing) {
          throw new Error('É necessário pelo menos uma imagem para publicar.');
        }

        // 3. Generate and validate slug
        const normalizedSlug = normalizeSlug(tripData.slug, tripData.title!);
        const slugValidation = validateSlug(normalizedSlug);
        
        if (!slugValidation.valid) {
          throw new Error(`Slug inválido: ${slugValidation.error}`);
        }
        
        // Ensure slug is unique (only check if editing or if slug was manually provided)
        const finalSlug = isEditing 
          ? await generateUniqueSlug(normalizedSlug, 'trips', tripData.id)
          : await generateUniqueSlug(normalizedSlug, 'trips');

        // 4. Construct Final Object (Sanitizing arrays)
        const finalTrip: Trip = {
          id: tripData.id || crypto.randomUUID(),
          agencyId: currentAgency.agencyId,
          title: tripData.title!,
          slug: finalSlug,
          description: tripData.description!,
          destination: tripData.destination!,
          price: tripData.price!,
          startDate: new Date(tripData.startDate!).toISOString(),
          endDate: new Date(tripData.endDate!).toISOString(),
          durationDays: tripData.durationDays || 1,
          images: finalImages,
          category: tripData.category!,
          tags: tripData.tags || [],
          
          travelerTypes: tripData.travelerTypes || [],
          paymentMethods: tripData.paymentMethods || ['PIX'],
          boardingPoints: Array.isArray(tripData.boardingPoints) ? tripData.boardingPoints : [],
          itinerary: Array.isArray(tripData.itinerary) ? tripData.itinerary : [],
          included: Array.isArray(tripData.included) ? tripData.included : [],
          notIncluded: Array.isArray(tripData.notIncluded) ? tripData.notIncluded : [],
          
          is_active: tripData.is_active!,
          featured: tripData.featured || false,
          featuredInHero: tripData.featuredInHero || false,
          popularNearSP: tripData.popularNearSP || false,
          operationalData: tripData.operationalData || DEFAULT_OPERATIONAL_DATA,
        };

        // 5. Save to DB with timeout
        const savePromise = isEditing 
          ? updateTrip(finalTrip)
          : createTrip(finalTrip);
        
        await savePromise;

        // 6. Clear draft on success
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        
        // 7. Show success message
        if (failedUploads.length > 0) {
          showToast(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso! Algumas fotos falharam: ${failedUploads.join(', ')}`, "warning");
        } else {
          showToast(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, "success");
        }
        
        // 8. Close modal and trigger success callback
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 100);
      })();

      // Race against timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('O servidor demorou muito para responder. Tente novamente.')), 15000)
      );

      await Promise.race([publishPromise, timeoutPromise]);

    } catch (error: any) {
      console.error("CreateTripWizard Error:", error);
      const errorMessage = error.message || 'Erro desconhecido';
      showToast(`Erro ao salvar: ${errorMessage}`, "error");
    } finally {
      // CRITICAL: Always reset loading state
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  // Draft restoration handlers
  const handleRestoreDraft = () => {
    try {
      const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setTripData(prev => ({ ...prev, ...parsedDraft.data }));
        setShowDraftRestore(false);
        showToast('Rascunho restaurado com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Error restoring draft:', err);
      showToast('Erro ao restaurar rascunho', 'error');
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowDraftRestore(false);
    showToast('Rascunho descartado', 'info');
  };

  // --- BOARDING POINTS LOGIC ---
  const addBoardingPoint = () => {
    setTripData(prev => ({
        ...prev,
        boardingPoints: [...(prev.boardingPoints || []), { id: crypto.randomUUID(), time: '08:00', location: '' }]
    }));
  };

  const removeBoardingPoint = (id: string) => {
    setTripData(prev => ({
        ...prev,
        boardingPoints: prev.boardingPoints?.filter(bp => bp.id !== id)
    }));
  };

  const updateBoardingPoint = (id: string, field: keyof BoardingPoint, value: string) => {
    setTripData(prev => ({
        ...prev,
        boardingPoints: prev.boardingPoints?.map(bp => bp.id === id ? { ...bp, [field]: value } : bp)
    }));
  };

  // --- UI RENDERERS ---

  const renderStep1 = () => (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Título da Viagem <span className="text-red-500">*</span></label>
            <input
                type="text"
                value={tripData.title}
                onChange={e => setTripData({ ...tripData, title: e.target.value, slug: slugify(e.target.value) })}
                className={`w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none`}
                placeholder="Ex: Fim de Semana em Capitólio"
                autoFocus
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Destino <span className="text-red-500">*</span></label>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="text"
                    value={tripData.destination}
                    onChange={e => setTripData({ ...tripData, destination: e.target.value })}
                    className={`w-full border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 outline-none`}
                    placeholder="Cidade, UF"
                />
            </div>
            {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa <span className="text-red-500">*</span></label>
            <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="number"
                    value={tripData.price || ''}
                    onChange={e => setTripData({ ...tripData, price: parseFloat(e.target.value) })}
                    className={`w-full border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 outline-none`}
                    placeholder="0.00"
                    min="0"
                />
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Início <span className="text-red-500">*</span></label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="date"
                    value={tripData.startDate}
                    onChange={e => setTripData({ ...tripData, startDate: e.target.value })}
                    className={`w-full border ${errors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 outline-none`}
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Fim <span className="text-red-500">*</span></label>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="date"
                    value={tripData.endDate}
                    onChange={e => setTripData({ ...tripData, endDate: e.target.value })}
                    className={`w-full border ${errors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 outline-none`}
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label>
            <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="number"
                    value={tripData.durationDays}
                    onChange={e => setTripData({ ...tripData, durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 outline-none bg-white"
                    min="1"
                />
            </div>
            <p className="text-xs text-gray-500 mt-1">Calculado automaticamente, mas você pode ajustar.</p>
        </div>

        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
            <select
                value={tripData.category}
                onChange={e => setTripData({ ...tripData, category: e.target.value as TripCategory })}
                className="w-full border border-gray-300 rounded-lg p-3 outline-none bg-white"
            >
                {ALL_TRIP_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
            </select>
        </div>
      </div>
      {errors.dates && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded">{errors.dates}</p>}

      {/* Boarding Points Section - RESTORED */}
      <div className="border-t border-gray-200 pt-6 mt-2">
          <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-gray-700">Locais de Embarque (Saídas)</label>
              <button onClick={addBoardingPoint} className="text-xs font-bold text-primary-600 flex items-center hover:bg-primary-50 px-2 py-1 rounded transition-colors"><Plus size={14} className="mr-1"/> Adicionar Local</button>
          </div>
          
          <div className="space-y-3">
              {tripData.boardingPoints?.map((bp, idx) => (
                  <div key={bp.id} className="flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="relative w-32 flex-shrink-0">
                          <input 
                              type="time" 
                              value={bp.time} 
                              onChange={e => updateBoardingPoint(bp.id, 'time', e.target.value)}
                              className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                          />
                      </div>
                      <div className="relative flex-1">
                          <input 
                              type="text" 
                              value={bp.location} 
                              onChange={e => updateBoardingPoint(bp.id, 'location', e.target.value)}
                              placeholder="Ex: Metrô Tatuapé - Rua A, 123"
                              className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                          />
                      </div>
                      <button onClick={() => removeBoardingPoint(bp.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                  </div>
              ))}
              {(!tripData.boardingPoints || tripData.boardingPoints.length === 0) && (
                  <p className="text-xs text-gray-500 italic">Nenhum local de embarque definido.</p>
              )}
          </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setFilesToUpload(prev => [...prev, ...Array.from(e.target.files!)]);
      }
    };

    const removeExisting = (url: string) => {
        setTripData(prev => ({ ...prev, images: (prev.images || []).filter(u => u !== url) }));
    };

    const removeNew = (index: number) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val && !tripData.tags?.includes(val)) {
                setTripData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                e.currentTarget.value = '';
            }
        }
    };

    const toggleTag = (tag: string) => {
        if (tripData.tags?.includes(tag)) {
            setTripData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
        } else {
            setTripData(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
        }
    };

    return (
      <div className="space-y-6 animate-[fadeIn_0.3s]">
        {/* Image Upload Area */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">Fotos da Viagem <span className="text-red-500">*</span></label>
            
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-primary-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-primary-500 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Clique para selecionar ou arraste aqui</p>
                </div>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>

            {/* Previews */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {tripData.images?.map((url, idx) => (
                    <div key={`old-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={url} className="w-full h-full object-cover" alt="Preview"/>
                        <button onClick={() => removeExisting(url)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                    </div>
                ))}
                {filesToUpload.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-amber-300 group">
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80" alt="Preview"/>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white text-xs font-bold">Novo</div>
                        <button onClick={() => removeNew(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                    </div>
                ))}
            </div>
            {errors.images && <p className="text-red-500 text-xs mt-2">{errors.images}</p>}
        </div>

        {/* Description */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Descrição Completa <span className="text-red-500">*</span></label>
            <textarea
                value={tripData.description}
                onChange={e => setTripData({ ...tripData, description: e.target.value })}
                className={`w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none h-32`}
                placeholder="Descreva o roteiro, o que está incluso e os diferenciais..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Tags */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tags (Pressione Enter)</label>
            
            {/* Tag Pills - RESTORED */}
            <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTED_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                            tripData.tags?.includes(tag) 
                            ? 'bg-primary-600 text-white border-primary-600' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        {tag} {tripData.tags?.includes(tag) && <Check size={12} />}
                    </button>
                ))}
            </div>

            <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                    type="text"
                    onKeyDown={addTag}
                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ou digite uma tag personalizada e aperte Enter..."
                />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                {tripData.tags?.map(tag => (
                    <span key={String(tag)} className="bg-primary-50 text-primary-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                        {String(tag)}
                        <button onClick={() => setTripData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }))} className="hover:text-red-500"><X size={12}/></button>
                    </span>
                ))}
            </div>
        </div>

        {/* Itinerary by Day - Premium Feature */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 p-6 rounded-xl border-2 border-primary-200">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">📅 Roteiro por Dia</label>
                    <p className="text-xs text-gray-600">Organize as atividades de cada dia da viagem</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const currentDays = tripData.itinerary?.length || 0;
                        const newDay = {
                            day: currentDays + 1,
                            title: `Dia ${currentDays + 1}`,
                            description: ''
                        };
                        setTripData(prev => ({
                            ...prev,
                            itinerary: [...(prev.itinerary || []), newDay]
                        }));
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus size={16}/> Adicionar Dia
                </button>
            </div>

            {tripData.itinerary && tripData.itinerary.length > 0 ? (
                <div className="space-y-4">
                    {tripData.itinerary.map((day, index) => (
                        <div key={index} className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                                        {day.day}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={day.title}
                                            onChange={e => {
                                                const updated = [...(tripData.itinerary || [])];
                                                updated[index] = { ...day, title: e.target.value };
                                                setTripData(prev => ({ ...prev, itinerary: updated }));
                                            }}
                                            className="w-full font-bold text-gray-900 border-b-2 border-transparent focus:border-primary-500 outline-none pb-1"
                                            placeholder={`Dia ${day.day}`}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const updated = tripData.itinerary?.filter((_, i) => i !== index) || [];
                                        // Renumber days
                                        const renumbered = updated.map((d, i) => ({ ...d, day: i + 1 }));
                                        setTripData(prev => ({ ...prev, itinerary: renumbered }));
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            <textarea
                                value={day.description}
                                onChange={e => {
                                    const updated = [...(tripData.itinerary || [])];
                                    updated[index] = { ...day, description: e.target.value };
                                    setTripData(prev => ({ ...prev, itinerary: updated }));
                                }}
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                rows={3}
                                placeholder="Descreva as atividades deste dia: horários, passeios, refeições, etc..."
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <Calendar className="mx-auto text-gray-400 mb-2" size={32}/>
                    <p className="text-sm text-gray-500 font-medium">Nenhum dia adicionado ainda</p>
                    <p className="text-xs text-gray-400 mt-1">Clique em "Adicionar Dia" para começar</p>
                </div>
            )}
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input 
                type="checkbox" 
                checked={tripData.is_active} 
                onChange={e => setTripData({ ...tripData, is_active: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
                <span className="block text-sm font-bold text-gray-900">Publicar Imediatamente</span>
                <span className="text-xs text-gray-500">Se desmarcado, ficará salvo como rascunho.</span>
            </div>
        </div>
      </div>
    );
  };

  const steps = [
    { title: "Detalhes Principais", icon: Plane, content: renderStep1() },
    { title: "Mídia & Conteúdo", icon: ImageIcon, content: renderStep2() },
  ];

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors"><X size={20}/></button>
        
        {/* Draft Restore Alert */}
        {showDraftRestore && !isEditing && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20}/>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">Rascunho não salvo encontrado</h3>
              <p className="text-sm text-amber-700 mb-3">Encontramos um rascunho não salvo. Deseja restaurar?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleRestoreDraft}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-colors"
                >
                  Restaurar Rascunho
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader className="text-blue-600 animate-spin" size={20}/>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">
                  Enviando imagem {uploadProgress.current} de {uploadProgress.total}
                </p>
                <p className="text-xs text-blue-700">{uploadProgress.fileName}</p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                {StepIcon && <StepIcon size={24}/>}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Pacote' : 'Criar Novo Pacote'}</h2>
                <p className="text-sm text-gray-500">Passo {currentStep + 1} de {steps.length}: {steps[currentStep].title}</p>
            </div>
        </div>

        <div className="mb-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
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
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto"
            >
              Próximo <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isLoading}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto shadow-lg shadow-green-200"
            >
              {isLoading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} 
              {isEditing ? 'Salvar Alterações' : 'Publicar Pacote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTripWizard;
