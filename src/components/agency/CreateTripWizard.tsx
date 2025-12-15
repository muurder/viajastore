
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trip, TripCategory, OperationalData, Agency, BoardingPoint } from '../../types';
import { 
  X, ChevronLeft, ChevronRight, Save, Loader, Info,
  Plane, MapPin, Image as ImageIcon,
  Upload, Check, Plus, Calendar, DollarSign, Clock, Tag, Bus, Trash2, RefreshCw, Search, AlertTriangle, User, PawPrint, FileText, Shield, Ban
} from 'lucide-react';
import { slugify } from '../../utils/slugify';
import { normalizeSlug, generateUniqueSlug, validateSlug } from '../../utils/slugUtils';
import ConfirmDialog from '../ui/ConfirmDialog';
import imageCompression from 'browser-image-compression';
import { logger } from '../../utils/logger';

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

const DEFAULT_SUGGESTED_TAGS = ['Praia', 'Montanha', 'Cidade', 'História', 'Relax', 'Ecoturismo', 'Luxo', 'Econômico', 'Bate-volta'];
const MAX_IMAGES = 8; // Maximum number of images allowed

/**
 * Compress image before upload to reduce file size while maintaining visual quality
 * @param file - Original image file
 * @returns Compressed image file as Blob
 */
const compressImage = async (file: File): Promise<File> => {
  try {
    const options = {
      maxSizeMB: 0.8, // Target size: 800KB
      maxWidthOrHeight: 1920, // Full HD resolution
      useWebWorker: true, // Non-blocking compression
      fileType: 'image/webp' as const, // Modern format with better compression
      initialQuality: 0.8, // High quality balance
    };

    const compressedFile = await imageCompression(file, options);
    
    // Log compression results for debugging
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    logger.info(`[ImageCompression] ${file.name}: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    logger.error('[ImageCompression] Error compressing image:', error);
    // If compression fails, return original file
    return file;
  }
};

interface CreateTripWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTripData?: Partial<Trip>;
}

const getDraftStorageKey = (tripId?: string) => `trip_draft_${tripId || 'new'}`;

const CreateTripWizard: React.FC<CreateTripWizardProps> = ({ onClose, onSuccess, initialTripData }) => {
  const { user, uploadImage } = useAuth(); 
  const { createTrip, updateTrip, agencies, trips } = useData();
  const { showToast } = useToast();
  const { guardSupabase } = useData();
  
  // State for frequently used boarding points
  const [frequentBoardingPoints, setFrequentBoardingPoints] = useState<Array<{ location: string; time: string; count: number }>>([]);
  
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
        category: 'PRAIA', // Backward compatibility
        categories: ['PRAIA'], // Multiple categories support
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
        latitude: undefined,
        longitude: undefined,
        maxGuests: undefined,
        allowChildren: true,
        passengerConfig: initialTripData?.passengerConfig || {
          allowChildren: initialTripData?.allowChildren ?? true,
          allowSeniors: true,
          childAgeLimit: 12,
          allowLapChild: false,
          childPriceMultiplier: 0.7
        },
        ...initialTripData,
        // Ensure categories array exists, fallback to category if needed
        categories: initialTripData.categories || (initialTripData.category ? [initialTripData.category] : ['PRAIA']),
        // Ensure category exists for backward compatibility
        category: initialTripData.category || (initialTripData.categories && initialTripData.categories[0]) || 'PRAIA'
      };
    }
    
    // Check for draft in localStorage
    try {
      const draftKey = getDraftStorageKey(undefined);
      const draft = localStorage.getItem(draftKey);
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
      logger.error('Error restoring draft:', err);
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
  const [retryMode, setRetryMode] = useState(false); // For "Tentar Novamente" button state
  const [failedImageUploads, setFailedImageUploads] = useState<string[]>([]); // Track failed uploads for user choice
  const [showImageFailureDialog, setShowImageFailureDialog] = useState(false);
  const [pendingFailedUploads, setPendingFailedUploads] = useState<string[]>([]);

  // Auto-calculate duration, but respect user edits
  useEffect(() => {
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate + 'T00:00:00');
      const end = new Date(tripData.endDate + 'T00:00:00');
      const diffTime = end.getTime() - start.getTime();
      
      if (!isNaN(diffTime) && diffTime >= 0) {
          // Calculate days: if start and end are the same, it's 1 day
          // If end is after start, calculate the difference in days
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setTripData(prev => ({ ...prev, durationDays: diffDays > 0 ? diffDays : 1 }));
      }
    }
  }, [tripData.startDate, tripData.endDate]);

  // Fetch frequently used boarding points from agency's recent trips
  useEffect(() => {
    const fetchFrequentBoardingPoints = async () => {
      if (!currentAgency?.agencyId) return;
      
      try {
        const sb = guardSupabase();
        if (!sb) return;
        
        // Get last 20 trips from this agency
        const { data: recentTrips, error: tripsError } = await sb
          .from('trips')
          .select('boarding_points')
          .eq('agency_id', currentAgency.agencyId)
          .not('boarding_points', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (tripsError) {
          logger.warn('Error fetching trips for boarding points:', tripsError);
          return;
        }
        
        if (!recentTrips || recentTrips.length === 0) return;
        
        // Count frequency of each boarding point
        const locationCount = new Map<string, { location: string; time: string; count: number }>();
        
        recentTrips.forEach((trip: any) => {
          // Handle both array format and JSONB format from Supabase
          let boardingPoints: BoardingPoint[] = [];
          
          if (Array.isArray(trip.boarding_points)) {
            boardingPoints = trip.boarding_points;
          } else if (trip.boarding_points) {
            // If it's a JSONB object, it should already be parsed by Supabase
            boardingPoints = [];
          }
          
          // Filter out empty arrays
          if (!boardingPoints || boardingPoints.length === 0) return;
          
          boardingPoints.forEach((bp: BoardingPoint) => {
            if (bp && bp.location && typeof bp.location === 'string' && bp.location.trim()) {
              const key = `${bp.location.toLowerCase().trim()}_${bp.time || ''}`;
              const existing = locationCount.get(key);
              if (existing) {
                existing.count += 1;
              } else {
                locationCount.set(key, {
                  location: bp.location.trim(),
                  time: bp.time || '08:00',
                  count: 1
                });
              }
            }
          });
        });
        
        // Sort by frequency and get top 5
        const frequent = Array.from(locationCount.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setFrequentBoardingPoints(frequent);
      } catch (error) {
        logger.error('Error fetching frequent boarding points:', error);
      }
    };
    
    fetchFrequentBoardingPoints();
  }, [currentAgency?.agencyId, guardSupabase]);

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

  // Check for draft on mount (works for both new and editing)
  useEffect(() => {
    try {
      const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.timestamp && (Date.now() - parsedDraft.timestamp) < 7 * 24 * 60 * 60 * 1000) {
          // Check if draft is newer than initial data
          if (isEditing && initialTripData) {
            const initialTimestamp = initialTripData.updated_at 
              ? new Date(initialTripData.updated_at).getTime() 
              : 0;
            if (parsedDraft.timestamp > initialTimestamp) {
              setShowDraftRestore(true);
            }
          } else if (!isEditing) {
            setShowDraftRestore(true);
          }
        }
      }
    } catch (err) {
      logger.error('Error checking draft:', err);
    }
  }, [isEditing, tripData.id, initialTripData]);

  // Auto-save to localStorage on every tripData change (debounced) - Works for both new and editing
  useEffect(() => {
    if (isLoading) return; // Don't save while publishing
    
    const timeoutId = setTimeout(() => {
      try {
        const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
        const draftData = {
          data: tripData,
          timestamp: Date.now()
        };
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      } catch (err) {
        logger.error('Error saving draft:', err);
      }
    }, 1000); // Debounce: save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [tripData, isEditing, isLoading]);

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
      if (totalImages > MAX_IMAGES) newErrors.images = `Máximo de ${MAX_IMAGES} imagens permitidas. Você tem ${totalImages}.`;
      if (!tripData.description || tripData.description.length < 20) newErrors.description = "Escreva uma descrição (min 20 caracteres).";
    } else if (currentStep === 2) { // Passenger Config (optional, no validation needed)
      // Step 3 is optional, no validation required
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, tripData, filesToUpload.length]);

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
      // Scroll to top when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast("Verifique os campos obrigatórios.", "error");
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Store uploaded URLs for continuation after user decision
  const uploadedUrlsRef = useRef<string[]>([]);
  
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
    setRetryMode(false);
    uploadedUrlsRef.current = [];
    
    try {
      // Wrap entire operation in timeout (20 seconds - increased for slow Supabase connections)
      const publishPromise = (async () => {
        // 1. Upload Loop with Progress Tracking (Resilient)
        const uploadedUrls: string[] = [];
        const failedUploads: string[] = [];
        
        if (filesToUpload.length > 0) {
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            
            try {
              // Step 1: Compress image before upload
              setUploadProgress({ 
                current: i + 1, 
                total: filesToUpload.length, 
                fileName: `Otimizando ${file.name}...` 
              });
              
              const compressedFile = await compressImage(file);
              
              // Step 2: Upload compressed file
              setUploadProgress({ 
                current: i + 1, 
                total: filesToUpload.length, 
                fileName: `Enviando ${file.name}...` 
              });
              
              // Individual upload timeout (90 seconds per file - increased for large images and slow connections)
              const uploadPromise = uploadImage(compressedFile, 'trip-images');
              const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error(`Upload timeout: ${file.name} demorou mais de 90 segundos. Tente uma imagem menor ou verifique sua conexão.`)), 90000)
              );
              
              const url = await Promise.race([uploadPromise, timeoutPromise]);
              if (url) {
                uploadedUrls.push(url);
                logger.info(`[CreateTripWizard] Successfully uploaded: ${file.name}`);
              } else {
                // This shouldn't happen now since uploadImage throws, but keeping as safety
                failedUploads.push(file.name);
              }
            } catch (err: any) {
              logger.error("Falha no upload de arquivo individual:", err);
              failedUploads.push(file.name);
              // Don't show toast for each failed upload - we'll ask user at the end
            }
          }
        }
        
        setUploadProgress(null);
        uploadedUrlsRef.current = uploadedUrls;
        
        // Ask user about failed uploads before proceeding
        if (failedUploads.length > 0) {
          // Store failed uploads and show dialog
          setPendingFailedUploads(failedUploads);
          setShowImageFailureDialog(true);
          setIsLoading(false); // Pause loading while user decides
          return; // Exit early, will continue after user confirms via handleContinueWithFailedImages
        }

        // 2. Merge Images (continue with successful uploads)
        const finalImages = [...(tripData.images || []), ...uploadedUrls];
        
        if (finalImages.length === 0 && !isEditing) {
          throw new Error('É necessário pelo menos uma imagem para publicar.');
        }
        
        // Validate max images limit
        if (finalImages.length > MAX_IMAGES) {
          throw new Error(`Máximo de ${MAX_IMAGES} imagens permitidas. Você tem ${finalImages.length}. Remova algumas imagens antes de publicar.`);
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
          category: tripData.category || (tripData.categories && tripData.categories[0]) || 'PRAIA', // Backward compatibility
          categories: tripData.categories || (tripData.category ? [tripData.category] : ['PRAIA']), // Multiple categories
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
          latitude: tripData.latitude,
          longitude: tripData.longitude,
          allowChildren: tripData.passengerConfig?.allowChildren ?? tripData.allowChildren ?? true, // Backward compatibility
          passengerConfig: tripData.passengerConfig ? {
            allowChildren: tripData.passengerConfig.allowChildren ?? true,
            allowSeniors: tripData.passengerConfig.allowSeniors ?? true,
            childAgeLimit: tripData.passengerConfig.childAgeLimit ?? 12,
            allowLapChild: tripData.passengerConfig.allowLapChild ?? false,
            childPriceMultiplier: tripData.passengerConfig.childPriceMultiplier ?? 0.7
          } : {
            allowChildren: tripData.allowChildren !== false,
            allowSeniors: true,
            childAgeLimit: 12,
            allowLapChild: false,
            childPriceMultiplier: 0.7
          },
        };

        // 5. Save to DB with timeout
        const savePromise = isEditing 
          ? updateTrip(finalTrip)
          : createTrip(finalTrip);
        
        await savePromise;

        // 6. Clear draft on success
        const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
        localStorage.removeItem(draftKey);
        
        // 7. Show success message
        if (pendingFailedUploads.length > 0) {
          showToast(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso! Algumas fotos falharam: ${pendingFailedUploads.join(', ')}`, "warning");
        } else {
          showToast(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso!`, "success");
        }
        
        // 8. Reset retry mode and failed uploads
        setRetryMode(false);
        setFailedImageUploads([]);
        setPendingFailedUploads([]);
        setShowImageFailureDialog(false);
        
        // 9. Close modal and trigger success callback
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 100);
      })();

      // Race against timeout (20 seconds - increased for slow Supabase connections)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 20000)
      );

      await Promise.race([publishPromise, timeoutPromise]);

    } catch (error: any) {
      logger.error("CreateTripWizard Error:", error);
      
      // Check if it's a timeout or network error
      const isTimeout = error.message === 'TIMEOUT' || error.message?.includes('timeout') || error.message?.includes('demorou muito');
      const isNetworkError = error.message?.includes('network') || error.message?.includes('Network') || error.code === 'NETWORK_ERROR';
      
      if (isTimeout || isNetworkError) {
        // Don't clear form data - keep user's work
        setRetryMode(true);
        showToast(
          'A conexão está lenta, mas não feche a página. Os dados foram preservados. Tente clicar em "Tentar Novamente" em alguns segundos.',
          'warning'
        );
      } else {
        // Other errors - show error but don't clear form
        const errorMessage = error.message || 'Erro desconhecido';
        showToast(`Erro ao salvar: ${errorMessage}`, "error");
      }
    } finally {
      // CRITICAL: Always reset loading state (unless waiting for user decision on failed images)
      if (!showImageFailureDialog) {
        setIsLoading(false);
        setUploadProgress(null);
      }
    }
  };

  // Draft restoration handlers
  const handleRestoreDraft = () => {
    try {
      const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setTripData(prev => ({ ...prev, ...parsedDraft.data }));
        setShowDraftRestore(false);
        showToast('Rascunho restaurado com sucesso!', 'success');
      }
    } catch (err) {
      logger.error('Error restoring draft:', err);
      showToast('Erro ao restaurar rascunho', 'error');
    }
  };

  const handleDiscardDraft = () => {
    const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
    localStorage.removeItem(draftKey);
    setShowDraftRestore(false);
    showToast('Rascunho descartado', 'info');
  };
  
  // Handler to continue publishing after user decides about failed images
  const handleContinueWithFailedImages = async () => {
    setShowImageFailureDialog(false);
    setIsLoading(true);
    
    try {
      // Continue from where we left off - merge images and save
      const finalImages = [...(tripData.images || []), ...uploadedUrlsRef.current];
      
      if (finalImages.length === 0 && !isEditing) {
        throw new Error('É necessário pelo menos uma imagem para publicar.');
      }
      
      // Validate max images limit
      if (finalImages.length > MAX_IMAGES) {
        throw new Error(`Máximo de ${MAX_IMAGES} imagens permitidas. Você tem ${finalImages.length}. Remova algumas imagens antes de publicar.`);
      }

      // Generate and validate slug
      const normalizedSlug = normalizeSlug(tripData.slug, tripData.title!);
      const slugValidation = validateSlug(normalizedSlug);
      
      if (!slugValidation.valid) {
        throw new Error(`Slug inválido: ${slugValidation.error}`);
      }
      
      // Ensure slug is unique
      const finalSlug = isEditing 
        ? await generateUniqueSlug(normalizedSlug, 'trips', tripData.id)
        : await generateUniqueSlug(normalizedSlug, 'trips');

      // Construct Final Object
      const finalTrip: Trip = {
        id: tripData.id || crypto.randomUUID(),
        agencyId: currentAgency!.agencyId,
        title: tripData.title!,
        slug: finalSlug,
        description: tripData.description!,
        destination: tripData.destination!,
        price: tripData.price!,
        startDate: new Date(tripData.startDate!).toISOString(),
        endDate: new Date(tripData.endDate!).toISOString(),
        durationDays: tripData.durationDays || 1,
        images: finalImages,
        category: tripData.category || (tripData.categories && tripData.categories[0]) || 'PRAIA', // Backward compatibility
        categories: tripData.categories || (tripData.category ? [tripData.category] : ['PRAIA']), // Multiple categories
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
        latitude: tripData.latitude,
        longitude: tripData.longitude,
        allowChildren: tripData.passengerConfig?.allowChildren ?? tripData.allowChildren ?? true,
        passengerConfig: tripData.passengerConfig ? {
          allowChildren: tripData.passengerConfig.allowChildren ?? true,
          allowSeniors: tripData.passengerConfig.allowSeniors ?? true,
          childAgeLimit: tripData.passengerConfig.childAgeLimit ?? 12,
          allowLapChild: tripData.passengerConfig.allowLapChild ?? false,
          childPriceMultiplier: tripData.passengerConfig.childPriceMultiplier ?? 0.7
        } : {
          allowChildren: tripData.allowChildren !== false,
          allowSeniors: true,
          childAgeLimit: 12,
          allowLapChild: false,
          childPriceMultiplier: 0.7
        },
      };

      // Save to DB with timeout
      const savePromise = isEditing 
        ? updateTrip(finalTrip)
        : createTrip(finalTrip);
      
      // Wrap save in timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 20000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);

      // Clear draft on success
      const draftKey = getDraftStorageKey(isEditing ? tripData.id : undefined);
      localStorage.removeItem(draftKey);
      
      // Show success message
      showToast(`Pacote ${isEditing ? 'atualizado' : 'criado'} com sucesso! Algumas fotos falharam: ${pendingFailedUploads.join(', ')}`, "warning");
      
      // Reset states
      setRetryMode(false);
      setFailedImageUploads([]);
      setPendingFailedUploads([]);
      
      // Close modal and trigger success callback
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 100);
    } catch (error: any) {
      logger.error("Error continuing with failed images:", error);
      const isTimeout = error.message === 'TIMEOUT' || error.message?.includes('timeout');
      if (isTimeout) {
        setRetryMode(true);
        showToast('A conexão está lenta. Tente novamente em alguns segundos.', 'warning');
      } else {
        showToast(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`, "error");
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };
  
  // Handler to cancel and retry uploads
  const handleRetryFailedUploads = () => {
    setShowImageFailureDialog(false);
    setPendingFailedUploads([]);
    setIsLoading(false);
    showToast('Você pode tentar fazer upload das imagens novamente.', 'info');
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

  const renderStep1 = () => {
    return (
    <div className="space-y-6 animate-[fadeIn_0.3s]">
      {/* Main Info Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Plane className="text-primary-600" size={20} />
          Informações Básicas
        </h3>
        
        {/* P1: MOBILE - Stack on mobile, side-by-side on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Título da Viagem <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={tripData.title}
              onChange={e => setTripData({ ...tripData, title: e.target.value, slug: slugify(e.target.value) })}
              className={`w-full border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 text-base bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none`}
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
                className={`w-full border ${errors.destination ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 text-base bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="Cidade, UF"
              />
            </div>
            {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
          </div>
        </div>
      </div>

      {/* Pricing & Dates Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <DollarSign className="text-primary-600" size={20} />
          Preço e Datas
        </h3>
        
        {/* P1: MOBILE - Stack on mobile, side-by-side on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa <span className="text-red-500">*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="number"
                value={tripData.price || ''}
                onChange={e => setTripData({ ...tripData, price: parseFloat(e.target.value) })}
                className={`w-full border ${errors.price ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 text-base bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="0.00"
                min="0"
              />
            </div>
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Data de Início <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18}/>
              <input
                type="date"
                value={tripData.startDate}
                onChange={e => setTripData({ ...tripData, startDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full border ${errors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-3 text-base bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer`}
              />
            </div>
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Data de Fim <span className="text-red-500">*</span></label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={18}/>
              <input
                type="date"
                value={tripData.endDate}
                onChange={e => setTripData({ ...tripData, endDate: e.target.value })}
                min={tripData.startDate || new Date().toISOString().split('T')[0]}
                className={`w-full border ${errors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-3 text-base bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer`}
              />
            </div>
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="number"
                value={tripData.durationDays}
                onChange={e => setTripData({ ...tripData, durationDays: parseInt(e.target.value) || 1 })}
                className="w-full border border-gray-300 rounded-lg p-3 pl-10 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500"
                min="1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
          </div>
        </div>
        {errors.dates && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg mt-4">{errors.dates}</p>}
      </div>

      {/* Category & Additional Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Tag className="text-primary-600" size={20} />
          Categoria e Classificação
        </h3>
        
          <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Categorias <span className="text-xs font-normal text-gray-500">(Selecione uma ou mais)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-4 border border-gray-200 rounded-lg bg-gray-50">
            {ALL_TRIP_CATEGORIES.map(cat => {
              // Get current categories array, fallback to category if exists, or empty array
              const currentCategories = tripData.categories || (tripData.category ? [tripData.category] : []);
              const isSelected = currentCategories.includes(cat);
              
              return (
                <label
                  key={cat}
                  className={`
                    relative flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md scale-[1.02]' 
                      : 'bg-white border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentCategories = tripData.categories || (tripData.category ? [tripData.category] : []);
                      let newCategories: TripCategory[];
                      
                      if (e.target.checked) {
                        // Add category if not already present
                        newCategories = [...currentCategories, cat];
                      } else {
                        // Remove category
                        newCategories = currentCategories.filter(c => c !== cat);
                      }
                      
                      setTripData({ 
                        ...tripData, 
                        categories: newCategories,
                        // Keep category for backward compatibility (use first selected)
                        category: newCategories[0] || 'PRAIA'
                      });
                    }}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  {isSelected && (
                    <Check size={14} className="absolute top-1.5 left-1.5 text-white" strokeWidth={3} />
                  )}
                  <span className={`text-xs font-semibold text-center leading-tight px-1 ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                    {cat.replace(/_/g, ' ')}
                  </span>
                </label>
              );
            })}
          </div>
          {tripData.categories && tripData.categories.length > 0 && (
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
              <Check size={12} className="text-primary-600" />
              <span className="font-medium">{tripData.categories.length} categoria{tripData.categories.length > 1 ? 's' : ''} selecionada{tripData.categories.length > 1 ? 's' : ''}</span>
            </p>
          )}
        </div>
      </div>

      {/* Boarding Points Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bus className="text-primary-600" size={20} />
            Locais de Embarque
          </h3>
          <button 
            onClick={addBoardingPoint} 
            className="text-sm font-bold text-primary-600 flex items-center hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors border border-primary-200"
          >
            <Plus size={16} className="mr-1"/> Adicionar Local
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Defina os pontos de saída e horários de embarque</p>
        
        {/* Frequently Used Boarding Points - Subtle Suggestions */}
        {frequentBoardingPoints.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-1.5">
              <Clock size={12} />
              <span>Locais mais usados nas suas viagens</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {frequentBoardingPoints.map((bp, idx) => {
                // Check if this location is already added
                const isAlreadyAdded = tripData.boardingPoints?.some(
                  existing => existing.location.toLowerCase().trim() === bp.location.toLowerCase().trim()
                );
                
                if (isAlreadyAdded) return null;
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const newId = crypto.randomUUID();
                      setTripData(prev => ({
                        ...prev,
                        boardingPoints: [...(prev.boardingPoints || []), { 
                          id: newId, 
                          time: bp.time, 
                          location: bp.location 
                        }]
                      }));
                    }}
                    className="group flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-primary-50 hover:text-primary-700 border border-gray-200 hover:border-primary-300 rounded-lg transition-all duration-200"
                    title={`Usado ${bp.count} vez${bp.count > 1 ? 'es' : ''} nas últimas viagens`}
                  >
                    <span className="text-gray-400 group-hover:text-primary-500">{bp.time}</span>
                    <span className="truncate max-w-[200px]">{bp.location}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-primary-500">({bp.count}x)</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="space-y-3">
          {tripData.boardingPoints?.map((bp, idx) => (
            <div key={bp.id} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
              <div className="relative w-32 flex-shrink-0">
                <input 
                  type="time" 
                  value={bp.time} 
                  onChange={e => updateBoardingPoint(bp.id, 'time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={bp.location} 
                  onChange={e => updateBoardingPoint(bp.id, 'location', e.target.value)}
                  placeholder="Ex: Metrô Tatuapé - Rua A, 123"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button 
                onClick={() => removeBoardingPoint(bp.id)} 
                className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18}/>
              </button>
            </div>
          ))}
          {(!tripData.boardingPoints || tripData.boardingPoints.length === 0) && (
            <p className="text-xs text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              Nenhum local de embarque definido. Clique em "Adicionar Local" para começar.
            </p>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderStep2 = () => {
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const currentTotal = (tripData.images?.length || 0) + filesToUpload.length;
        const newFiles = Array.from(e.target.files);
        const availableSlots = MAX_IMAGES - currentTotal;
        
        if (availableSlots <= 0) {
          showToast(`Limite de ${MAX_IMAGES} imagens atingido. Remova algumas imagens antes de adicionar novas.`, 'warning');
          e.target.value = ''; // Clear input
          return;
        }
        
        if (newFiles.length > availableSlots) {
          showToast(`Você pode adicionar apenas mais ${availableSlots} imagem(ns). ${newFiles.length - availableSlots} imagem(ns) foram ignoradas.`, 'warning');
          setFilesToUpload(prev => [...prev, ...newFiles.slice(0, availableSlots)]);
        } else {
          setFilesToUpload(prev => [...prev, ...newFiles]);
        }
        
        e.target.value = ''; // Clear input after selection
      }
    };

    const removeExisting = (url: string) => {
        setTripData(prev => ({ ...prev, images: (prev.images || []).filter(u => u !== url) }));
    };

    const removeNew = (index: number) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const addTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val && !tripData.tags?.includes(val)) {
                setTripData(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                e.currentTarget.value = '';
                
                // Save custom tag to agency's custom_settings
                if (currentAgency?.agencyId && supabase) {
                    try {
                        // Get current custom settings
                        const currentTags = currentAgency.customSettings?.tags || [];
                        if (!currentTags.includes(val)) {
                            // Update agency custom settings with new tag
                            const updatedSettings = {
                                ...currentAgency.customSettings,
                                tags: [...currentTags, val]
                            };
                            await supabase.from('agencies')
                                .update({ custom_settings: updatedSettings })
                                .eq('id', currentAgency.agencyId);
                        }
                    } catch (error) {
                        logger.error('Error saving custom tag:', error);
                        // Don't show error to user, tag is still added to trip
                    }
                }
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
            <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-gray-700">Fotos da Viagem <span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-500 font-medium">
                    {(tripData.images?.length || 0) + filesToUpload.length} / {MAX_IMAGES} imagens
                </span>
            </div>
            
            {(tripData.images?.length || 0) + filesToUpload.length >= MAX_IMAGES ? (
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-amber-300 border-dashed rounded-xl bg-amber-50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-amber-500 mb-2" />
                        <p className="text-sm text-amber-700 font-medium">Limite de {MAX_IMAGES} imagens atingido</p>
                        <p className="text-xs text-amber-600 mt-1">Remova algumas imagens para adicionar novas</p>
                    </div>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-primary-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-primary-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-primary-500 mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Clique para selecionar ou arraste aqui</p>
                        <p className="text-xs text-gray-500 mt-1">Máximo de {MAX_IMAGES} imagens</p>
                    </div>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                        className="hidden"
                        disabled={(tripData.images?.length || 0) + filesToUpload.length >= MAX_IMAGES}
                    />
                </label>
            )}

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
                className={`w-full border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 text-base bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none h-32`}
                placeholder="Descreva o roteiro, o que está incluso e os diferenciais..."
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* Tags */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tags (Pressione Enter)</label>
            
            {/* Tag Pills - RESTORED */}
            <div className="flex flex-wrap gap-2 mb-3">
                {[...DEFAULT_SUGGESTED_TAGS, ...(currentAgency?.customSettings?.tags || [])].map(tag => (
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
                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
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
                                            className="w-full font-bold text-gray-900 bg-white border-b-2 border-transparent focus:border-primary-500 outline-none pb-1"
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
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                rows={3}
                                placeholder="Descreva as atividades deste dia: horários, passeios, refeições, etc..."
                            />
                        </div>
                    ))}
                    
                    {/* Add Next Day Button - Below Last Day */}
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
                            // Focus on the new day's title input after a brief delay
                            setTimeout(() => {
                                const lastInput = document.querySelector(`input[placeholder*="Dia ${currentDays + 1}"]`) as HTMLInputElement;
                                if (lastInput) {
                                    lastInput.focus();
                                    lastInput.select();
                                }
                            }, 100);
                        }}
                        className="w-full mt-4 py-3 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-primary-200 hover:border-primary-300"
                    >
                        <Plus size={16}/>
                        Adicionar Dia Seguinte
                    </button>
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

  const renderStep3 = () => {
    return (
    <div className="space-y-8 animate-[fadeIn_0.3s]">
      {/* Main Configuration Section - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration Toggles */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="text-primary-600" size={20} />
              Configurações de Passageiros
            </h3>
            <p className="text-sm text-gray-600 mb-6">Defina as regras para passageiros nesta viagem</p>
            
            <div className="space-y-4">
              {/* Allow Children */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                <div className="flex-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tripData.passengerConfig?.allowChildren !== false}
                      onChange={e => setTripData({ 
                        ...tripData, 
                        passengerConfig: {
                          allowChildren: e.target.checked,
                          allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                          childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                          allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                          childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7
                        }
                      })}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-sm font-bold text-gray-700">Permitir crianças</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-8 mt-1">Aceita passageiros menores de idade</p>
                </div>
              </div>

              {/* Child Age Limit - Only show if allowChildren is true */}
              {tripData.passengerConfig?.allowChildren !== false && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Idade limite para criança
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="18"
                      value={tripData.passengerConfig?.childAgeLimit ?? 12}
                      onChange={e => setTripData({ 
                        ...tripData, 
                        passengerConfig: {
                          allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                          allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                          childAgeLimit: parseInt(e.target.value) || 12,
                          allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                          childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7
                        }
                      })}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-semibold"
                    />
                    <span className="text-sm text-gray-600">anos (menores desta idade são considerados crianças)</span>
                  </div>
                </div>
              )}

              {/* Allow Lap Child - Only show if allowChildren is true */}
              {tripData.passengerConfig?.allowChildren !== false && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tripData.passengerConfig?.allowLapChild ?? false}
                        onChange={e => setTripData({ 
                          ...tripData, 
                          passengerConfig: {
                            allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                            allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                            childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                            allowLapChild: e.target.checked,
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7
                          }
                        })}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm font-bold text-gray-700">Permitir criança no colo</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-8 mt-1">Crianças pequenas podem viajar sem assento próprio (geralmente até 2 anos)</p>
                  </div>
                </div>
              )}

              {/* Allow Seniors */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                <div className="flex-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tripData.passengerConfig?.allowSeniors !== false}
                      onChange={e => setTripData({ 
                        ...tripData, 
                        passengerConfig: {
                          allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                          allowSeniors: e.target.checked,
                          childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                          allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                          childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7
                        }
                      })}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="ml-3 text-sm font-bold text-gray-700">Permitir idosos</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-8 mt-1">Aceita passageiros da terceira idade (60+ anos)</p>
                </div>
              </div>
            </div>

            {/* Right Column - Help Panel & Preview */}
            <div className="space-y-4">
              {/* Help Section */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Info className="text-primary-600" size={20} />
                  Por que definir regras claras?
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <PawPrint className="text-amber-600" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">Animais & Crianças</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Evita surpresas no embarque e garante que o ambiente seja adequado para todos.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="text-blue-600" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">Documentação</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Alerta o viajante sobre a necessidade de RG/CNH para viagens interestaduais.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Shield className="text-green-600" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">Clareza</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Regras bem definidas reduzem cancelamentos e dúvidas no WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Section */}
              <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200">
                <h5 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Check className="text-primary-600" size={16} />
                  Como o viajante vê no site:
                </h5>
                <div className="space-y-2">
                  {/* Children Preview */}
                  {tripData.passengerConfig?.allowChildren === false ? (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-red-50 px-3 py-2.5 rounded-lg border border-red-200">
                      <Ban className="text-red-500" size={14} />
                      <span className="font-medium">Crianças não permitidas</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-green-50 px-3 py-2.5 rounded-lg border border-green-200">
                      <Check className="text-green-600" size={14} />
                      <span className="font-medium">Crianças permitidas</span>
                      {tripData.passengerConfig?.childAgeLimit && (
                        <span className="text-slate-500">
                          (até {tripData.passengerConfig.childAgeLimit} anos)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Seniors Preview */}
                  {tripData.passengerConfig?.allowSeniors === false ? (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-red-50 px-3 py-2.5 rounded-lg border border-red-200">
                      <Ban className="text-red-500" size={14} />
                      <span className="font-medium">Idosos não permitidos</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-green-50 px-3 py-2.5 rounded-lg border border-green-200">
                      <Check className="text-green-600" size={14} />
                      <span className="font-medium">Idosos permitidos</span>
                    </div>
                  )}

                  {/* Lap Child Preview */}
                  {tripData.passengerConfig?.allowLapChild && (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-blue-50 px-3 py-2.5 rounded-lg border border-blue-200">
                      <Info className="text-blue-600" size={14} />
                      <span className="font-medium">Criança no colo permitida</span>
                    </div>
                  )}

                  {/* Child Price Preview */}
              {tripData.passengerConfig?.allowChildren !== false && (
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-purple-50 px-3 py-2.5 rounded-lg border border-purple-200">
                      <DollarSign className="text-purple-600" size={14} />
                      <span className="font-medium">
                        Preço para crianças: {tripData.passengerConfig?.childPriceType === 'fixed' && tripData.passengerConfig?.childPriceFixed !== undefined
                          ? `R$ ${tripData.passengerConfig.childPriceFixed.toLocaleString('pt-BR')} (fixo)`
                          : `${Math.round((tripData.passengerConfig?.childPriceMultiplier || 0.7) * 100)}% do preço adulto`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Child Price Configuration - Full Width Card - Only show if allowChildren is true */}
      {tripData.passengerConfig?.allowChildren !== false && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <DollarSign className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
              <label className="block text-lg font-bold text-gray-900 mb-1.5">
                        Preço para Crianças
                      </label>
              <p className="text-sm text-gray-600">
                        Escolha entre porcentagem do preço adulto ou valor fixo
                      </p>
                    </div>
                  </div>
                  
          <div className="bg-white rounded-lg p-6 lg:p-8 border border-blue-100">
                    {/* Toggle between Percentage and Fixed */}
              <div className="flex items-center gap-3 mb-6">
                      <button
                        type="button"
                        onClick={() => setTripData({
                          ...tripData,
                          passengerConfig: {
                            allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                            allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                            childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                            allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7,
                            childPriceType: 'percentage',
                            childPriceFixed: tripData.passengerConfig?.childPriceFixed
                          }
                        })}
                  className={`flex-1 px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                          (tripData.passengerConfig?.childPriceType ?? 'percentage') === 'percentage'
                            ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        Porcentagem
                      </button>
                      <button
                        type="button"
                        onClick={() => setTripData({
                          ...tripData,
                          passengerConfig: {
                            allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                            allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                            childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                            allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7,
                            childPriceType: 'fixed',
                            childPriceFixed: tripData.passengerConfig?.childPriceFixed ?? Math.round((tripData.price || 500) * 0.7)
                          }
                        })}
                  className={`flex-1 px-5 py-3 rounded-lg font-bold text-sm transition-all ${
                          tripData.passengerConfig?.childPriceType === 'fixed'
                            ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        Valor Fixo
                      </button>
                    </div>

                    {/* Input Section */}
                    {(tripData.passengerConfig?.childPriceType ?? 'percentage') === 'percentage' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Porcentagem</label>
                    <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="5"
                              value={Math.round((tripData.passengerConfig?.childPriceMultiplier ?? 0.7) * 100)}
                              onChange={e => {
                                const percentage = Math.max(0, Math.min(100, parseInt(e.target.value) || 70));
                                setTripData({ 
                                  ...tripData, 
                                  passengerConfig: {
                                    allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                                    allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                                    childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                                    allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                                    childPriceMultiplier: percentage / 100,
                                    childPriceType: 'percentage',
                                    childPriceFixed: tripData.passengerConfig?.childPriceFixed
                                  }
                                });
                              }}
                        className="w-full border-2 border-gray-300 rounded-lg px-8 py-5 bg-white text-gray-900 text-4xl font-bold text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            />
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-3xl font-bold text-gray-500 pointer-events-none">
                              %
                            </div>
                          </div>
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <Info size={14} className="mt-0.5 flex-shrink-0" />
                      <span>
                        {Math.round((tripData.passengerConfig?.childPriceMultiplier ?? 0.7) * 100)}% significa que crianças pagam {Math.round((tripData.passengerConfig?.childPriceMultiplier ?? 0.7) * 100)}% do preço do adulto
                      </span>
                              </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Exemplo de Cálculo</label>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-2 border-gray-200 h-full flex flex-col justify-center">
                      <div className="text-base text-gray-700 space-y-3">
                        <>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                            <span className="text-gray-600 font-medium">Preço adulto:</span>
                            <span className="font-bold text-gray-900 text-lg">
                              R$ {(tripData.price || 500).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">
                              Preço criança ({Math.round(((tripData.passengerConfig?.childPriceMultiplier ?? 0.7)) * 100)}%):
                            </span>
                            <span className="font-bold text-primary-600 text-lg">
                              R$ {Math.round((tripData.price || 500) * (tripData.passengerConfig?.childPriceMultiplier ?? 0.7)).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </>
                      </div>
                            </div>
                        </div>
                      </div>
                    ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Valor Fixo</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xl pointer-events-none">
                              R$
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={tripData.passengerConfig?.childPriceFixed ?? Math.round((tripData.price || 500) * 0.7)}
                              onChange={e => {
                                const value = Math.max(0, parseFloat(e.target.value) || 0);
                                setTripData({ 
                                  ...tripData, 
                                  passengerConfig: {
                                    allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                                    allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                                    childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                                    allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                                    childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 0.7,
                                    childPriceType: 'fixed',
                                    childPriceFixed: value
                                  }
                                });
                              }}
                        className="w-full border-2 border-gray-300 rounded-lg pl-20 pr-6 py-5 bg-white text-gray-900 text-4xl font-bold text-center focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                            />
                          </div>
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <Info size={14} className="mt-0.5 flex-shrink-0" />
                      <span>
                        Crianças sempre pagarão R$ {(tripData.passengerConfig?.childPriceFixed ?? Math.round((tripData.price || 500) * 0.7)).toLocaleString('pt-BR')}, independente do preço adulto
                      </span>
                              </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Exemplo de Cálculo</label>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-2 border-gray-200 h-full flex flex-col justify-center">
                      <div className="text-base text-gray-700 space-y-3">
                        <>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                            <span className="text-gray-600 font-medium">Preço adulto:</span>
                            <span className="font-bold text-gray-900 text-lg">
                              R$ {(tripData.price || 500).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Preço criança (fixo):</span>
                            <span className="font-bold text-primary-600 text-lg">
                              R$ {(tripData.passengerConfig?.childPriceFixed ?? Math.round((tripData.price || 500) * 0.7)).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </>
                      </div>
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
    </div>
  );
  };

  const steps = [
    { title: "Detalhes Principais", icon: Plane, content: renderStep1() },
    { title: "Mídia & Conteúdo", icon: ImageIcon, content: renderStep2() },
    { title: "Regras de Passageiros", icon: User, content: renderStep3() },
  ];

  const StepIcon = steps[currentStep]?.icon || Plane;

  // Safety check: ensure we have an agency
  if (!currentAgency?.agencyId) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors">
            <X size={20}/>
          </button>
          <div className="text-center">
            <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao Carregar</h2>
            <p className="text-gray-600 mb-4">Não foi possível identificar sua agência. Por favor, recarregue a página.</p>
            <button
              onClick={onClose}
              className="bg-primary-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Image Failure Dialog */}
      <ConfirmDialog
        isOpen={showImageFailureDialog}
        onClose={handleRetryFailedUploads}
        onConfirm={handleContinueWithFailedImages}
        title="Algumas Imagens Falharam no Upload"
        message={`${pendingFailedUploads.length} imagem(ns) falharam no upload:\n${pendingFailedUploads.join(', ')}\n\nDeseja salvar o pacote sem essas imagens ou tentar novamente?`}
        variant="warning"
        confirmText="Salvar sem essas imagens"
        cancelText="Tentar Novamente"
      />
      
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
        <div className="bg-white rounded-2xl max-w-5xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
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
              className={`px-8 py-3 rounded-lg font-bold transition-colors flex items-center gap-2 disabled:opacity-50 ml-auto shadow-lg ${
                retryMode 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200' 
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  {retryMode ? 'Tentando novamente...' : 'Salvando...'}
                </>
              ) : (
                <>
                  {retryMode ? <RefreshCw size={18} /> : <Save size={18} />}
                  {retryMode ? 'Tentar Novamente' : (isEditing ? 'Salvar Alterações' : 'Publicar Pacote')}
                </>
              )}
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
};

export default CreateTripWizard;
