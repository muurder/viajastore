
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Trip, TripCategory, OperationalData, Agency, BoardingPoint } from '../../types';
import { 
  X, ChevronLeft, ChevronRight, Save, Loader, Info,
  Plane, MapPin, Image as ImageIcon,
  Upload, Check, Plus, Calendar, DollarSign, Clock, Tag, Bus, Trash2, RefreshCw, Search, AlertTriangle, User, PawPrint, FileText, Shield, Ban, CheckCircle, Users, ArrowUp, ArrowDown, GripVertical
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
  const [draggedImage, setDraggedImage] = useState<{ type: 'existing' | 'new'; index: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ type: 'existing' | 'new'; index: number } | null>(null);
  
  
  // Initialize tripData with draft restoration
  const [tripData, setTripData] = useState<Partial<Trip>>(() => {
    // If editing, use initialTripData
    if (initialTripData?.id) {
      const initialWithDefaults = {
        ...initialTripData,
        categories: initialTripData.categories || (initialTripData.category ? [initialTripData.category] : ['PRAIA']),
        category: initialTripData.category || (initialTripData.categories && initialTripData.categories[0]) || 'PRAIA'
      };
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
        // Preserve images from initialTripData if available
        images: initialTripData?.images || [],
        // categories/category serão definidos abaixo com base em initialTripData
        tags: [],
        travelerTypes: [],
        itinerary: [],
        boardingPoints: [{ id: crypto.randomUUID(), time: '08:00', location: 'A definir' }],
        paymentMethods: ['PIX', 'CREDIT_CARD'],
        is_active: true,
        featured: false,
        featuredInHero: false,
        popularNearSP: false,
        included: initialTripData?.included || [],
        notIncluded: initialTripData?.notIncluded || [],
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
          childPriceMultiplier: 1.0,
          childPriceType: 'percentage',
          childPriceFixed: undefined
        },
        ...initialWithDefaults
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

  // Helper function to normalize and validate date string
  const normalizeDateString = (dateString: string | undefined): string | null => {
    if (!dateString) return null;
    
    // Remove any whitespace
    const trimmed = dateString.trim();
    
    // Check if it's already in YYYY-MM-DD format (standard for input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // Validate the date parts
      const [year, month, day] = trimmed.split('-').map(Number);
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        // Verify it's a valid date
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return trimmed;
        }
      }
    }
    
    // Try to parse if it's in DD/MM/YYYY format (common in Brazil)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/').map(Number);
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    
    // Try to parse as a general date string
    const date = new Date(trimmed);
    if (!isNaN(date.getTime()) && trimmed.length > 0) {
      // Only accept if it's a reasonable date (not epoch 0 or invalid)
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2100) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  };

  // Auto-calculate duration, but respect user edits
  useEffect(() => {
    // Normalize dates before processing
    const normalizedStartDate = normalizeDateString(tripData.startDate);
    const normalizedEndDate = normalizeDateString(tripData.endDate);
    
    if (!normalizedStartDate || !normalizedEndDate) {
      return;
    }
    
    try {
      // Input type="date" returns format YYYY-MM-DD, but normalize to be sure
      const startParts = normalizedStartDate.split('-');
      const endParts = normalizedEndDate.split('-');
      
      if (startParts.length !== 3 || endParts.length !== 3) {
        return;
      }
      
      const startYear = parseInt(startParts[0], 10);
      const startMonth = parseInt(startParts[1], 10);
      const startDay = parseInt(startParts[2], 10);
      const endYear = parseInt(endParts[0], 10);
      const endMonth = parseInt(endParts[1], 10);
      const endDay = parseInt(endParts[2], 10);
      
      // Validate parsed dates
      if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) || 
          isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
        return;
      }
      
      // Validate month and day ranges
      if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 ||
          startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
        return;
      }
      
      // Create dates using local time (same as input date behavior)
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return;
      }
      
      // Verify dates match what was parsed
      if (start.getFullYear() !== startYear || start.getMonth() !== startMonth - 1 || start.getDate() !== startDay ||
          end.getFullYear() !== endYear || end.getMonth() !== endMonth - 1 || end.getDate() !== endDay) {
        return;
      }
      
      const diffTime = end.getTime() - start.getTime();
      
      if (!isNaN(diffTime) && diffTime >= 0) {
        // Calculate days: difference in milliseconds / milliseconds per day
        // Add 1 to include both start and end days (inclusive)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const finalDays = diffDays > 0 ? diffDays : 1;
        
        // Only update if the calculated value is different from current
        setTripData(prev => {
          if (prev.durationDays !== finalDays) {
            return { ...prev, durationDays: finalDays };
          }
          return prev;
        });
      }
    } catch (error) {
      logger.error('Error auto-calculating duration:', error);
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
              // Ensure images are preserved
              images: initialTripData.images || [],
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
    // 0. Validate ALL required fields, not just current step
    if (!tripData.title || !tripData.destination || tripData.price === undefined || tripData.price === null || isNaN(tripData.price) || tripData.price <= 0 || !tripData.startDate || !tripData.endDate) {
       showToast("Verifique os dados da viagem (Título, Destino, Preço, Datas).", "error");
       // Force go to step 0 if validation fails
       if (currentStep !== 0) setCurrentStep(0);
       return;
    }

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
            childPriceMultiplier: tripData.passengerConfig.childPriceMultiplier ?? 1.0,
            childPriceType: tripData.passengerConfig.childPriceType || 'percentage',
            childPriceFixed: tripData.passengerConfig.childPriceFixed
          } : {
            allowChildren: tripData.allowChildren !== false,
            allowSeniors: true,
            childAgeLimit: 12,
            allowLapChild: false,
            childPriceMultiplier: 1.0,
            childPriceType: 'percentage',
            childPriceFixed: undefined
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
          childPriceMultiplier: tripData.passengerConfig.childPriceMultiplier ?? 1.0,
          childPriceType: tripData.passengerConfig.childPriceType || 'percentage',
          childPriceFixed: tripData.passengerConfig.childPriceFixed
        } : {
          allowChildren: tripData.allowChildren !== false,
          allowSeniors: true,
          childAgeLimit: 12,
          allowLapChild: false,
          childPriceMultiplier: 1.0,
          childPriceType: 'percentage',
          childPriceFixed: undefined
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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="text-primary-600" size={20} />
            Preço e Datas
          </h3>
          <button
            type="button"
            onClick={() => {
              setTripData({
                ...tripData,
                price: 0,
                startDate: '',
                endDate: '',
                durationDays: 1
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            title="Limpar preço e datas"
          >
            <RefreshCw size={16} />
            Limpar
          </button>
        </div>
        
        {/* P1: MOBILE - Stack on mobile, side-by-side on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Preço por Pessoa <span className="text-red-500">*</span></label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="number"
                value={tripData.price || ''}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setTripData({ ...tripData, price: isNaN(val) ? 0 : val });
                }}
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
                onBlur={e => {
                  // Normalize date when user finishes typing
                  const normalized = normalizeDateString(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    setTripData({ ...tripData, startDate: normalized });
                  }
                }}
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
                onBlur={e => {
                  // Normalize date when user finishes typing
                  const normalized = normalizeDateString(e.target.value);
                  if (normalized && normalized !== e.target.value) {
                    setTripData({ ...tripData, endDate: normalized });
                  }
                }}
                min={tripData.startDate || new Date().toISOString().split('T')[0]}
                className={`w-full border ${errors.endDate ? 'border-red-500' : 'border-gray-300'} rounded-lg p-3 pl-10 pr-3 text-base bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer`}
              />
            </div>
            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Duração (Dias)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                <input
                  type="number"
                  value={tripData.durationDays}
                  onChange={e => setTripData({ ...tripData, durationDays: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-300 rounded-lg p-3 pl-10 bg-white text-gray-900 outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Normalize dates before processing
                  const normalizedStartDate = normalizeDateString(tripData.startDate);
                  const normalizedEndDate = normalizeDateString(tripData.endDate);
                  
                  if (!normalizedStartDate || !normalizedEndDate) {
                    showToast('Preencha as datas de início e fim primeiro', 'warning');
                    return;
                  }
                  
                  try {
                    // Input type="date" returns format YYYY-MM-DD, but normalize to be sure
                    const startParts = normalizedStartDate.split('-');
                    const endParts = normalizedEndDate.split('-');
                    
                    if (startParts.length !== 3 || endParts.length !== 3) {
                      showToast('Erro ao calcular: formato de data inválido', 'error');
                      return;
                    }
                    
                    const startYear = parseInt(startParts[0], 10);
                    const startMonth = parseInt(startParts[1], 10);
                    const startDay = parseInt(startParts[2], 10);
                    const endYear = parseInt(endParts[0], 10);
                    const endMonth = parseInt(endParts[1], 10);
                    const endDay = parseInt(endParts[2], 10);
                    
                    // Validate parsed dates
                    if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay) || 
                        isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
                      showToast('Erro ao calcular: formato de data inválido', 'error');
                      return;
                    }
                    
                    // Validate month and day ranges
                    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 ||
                        startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
                      showToast('Erro ao calcular: datas inválidas', 'error');
                      return;
                    }
                    
                    // Create dates using local time (same as input date behavior)
                    const start = new Date(startYear, startMonth - 1, startDay);
                    const end = new Date(endYear, endMonth - 1, endDay);
                    
                    // Validate dates
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                      showToast('Erro ao calcular: datas inválidas', 'error');
                      return;
                    }
                    
                    // Verify dates match what was parsed
                    if (start.getFullYear() !== startYear || start.getMonth() !== startMonth - 1 || start.getDate() !== startDay ||
                        end.getFullYear() !== endYear || end.getMonth() !== endMonth - 1 || end.getDate() !== endDay) {
                      showToast('Erro ao calcular: datas inválidas', 'error');
                      return;
                    }
                    
                    const diffTime = end.getTime() - start.getTime();
                    
                    if (diffTime < 0) {
                      showToast('A data de fim deve ser depois da data de início', 'error');
                      return;
                    }
                    
                    // Calculate days: difference in milliseconds / milliseconds per day
                    // Add 1 to include both start and end days (inclusive)
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    const finalDays = diffDays > 0 ? diffDays : 1;
                    
                    logger.log(`[CreateTripWizard] Recalculating duration: ${normalizedStartDate} to ${normalizedEndDate} = ${finalDays} days`);
                    
                    // Use functional update to avoid conflicts with useEffect
                    setTripData(prev => {
                      // Only update if the calculated value is different
                      if (prev.durationDays !== finalDays) {
                        return { ...prev, durationDays: finalDays };
                      }
                      return prev;
                    });
                    
                    showToast(`Duração recalculada: ${finalDays} dia(s)`, 'success');
                  } catch (error) {
                    logger.error('Error recalculating duration:', error);
                    showToast('Erro ao calcular duração. Verifique as datas.', 'error');
                  }
                }}
                className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium whitespace-nowrap"
                title="Recalcular duração baseado nas datas"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Recalcular</span>
              </button>
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

    // Reorder existing images
    const moveExistingImage = (index: number, direction: 'up' | 'down') => {
        const images = [...(tripData.images || [])];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex < 0 || newIndex >= images.length) return;
        
        [images[index], images[newIndex]] = [images[newIndex], images[index]];
        setTripData(prev => ({ ...prev, images }));
    };

    // Reorder new files
    const moveNewImage = (index: number, direction: 'up' | 'down') => {
        const files = [...filesToUpload];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex < 0 || newIndex >= files.length) return;
        
        [files[index], files[newIndex]] = [files[newIndex], files[index]];
        setFilesToUpload(files);
    };

    // Drag and Drop handlers
    const handleDragStart = (type: 'existing' | 'new', index: number) => {
        setDraggedImage({ type, index });
    };

    const handleDragOver = (e: React.DragEvent, type: 'existing' | 'new', index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedImage && (draggedImage.type !== type || draggedImage.index !== index)) {
            setDragOverIndex({ type, index });
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, targetType: 'existing' | 'new', targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedImage) return;

        const { type: sourceType, index: sourceIndex } = draggedImage;

        // Same type reordering
        if (sourceType === targetType) {
            if (sourceType === 'existing') {
                const images = [...(tripData.images || [])];
                const [moved] = images.splice(sourceIndex, 1);
                images.splice(targetIndex, 0, moved);
                setTripData(prev => ({ ...prev, images }));
            } else {
                const files = [...filesToUpload];
                const [moved] = files.splice(sourceIndex, 1);
                files.splice(targetIndex, 0, moved);
                setFilesToUpload(files);
            }
        } else {
            // Cross-type movement (existing <-> new)
            // For now, we'll keep them separate but allow reordering within each group
            // Moving between groups would require converting File to URL or vice versa
            // which is complex, so we'll just reset the drag state
        }

        setDraggedImage(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedImage(null);
        setDragOverIndex(null);
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

            {/* Previews - Premium Drag and Drop */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-6">
                {tripData.images?.map((url, idx) => {
                    const isDragging = draggedImage?.type === 'existing' && draggedImage.index === idx;
                    const isDragOver = dragOverIndex?.type === 'existing' && dragOverIndex.index === idx;
                    
                    return (
                        <div
                            key={`old-${idx}`}
                            draggable
                            onDragStart={() => handleDragStart('existing', idx)}
                            onDragOver={(e) => handleDragOver(e, 'existing', idx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'existing', idx)}
                            onDragEnd={handleDragEnd}
                            className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-300 cursor-move group bg-gray-100 ${
                                isDragging 
                                    ? 'opacity-30 scale-90 rotate-2 shadow-2xl z-50' 
                                    : isDragOver 
                                    ? 'border-4 border-primary-500 ring-4 ring-primary-200/50 scale-110 shadow-2xl z-40 bg-primary-50' 
                                    : 'border-2 border-gray-200 hover:border-primary-400 hover:shadow-xl hover:scale-105'
                            }`}
                        >
                            <div className="absolute inset-0 z-0">
                                <img 
                                    src={url} 
                                    className={`w-full h-full object-cover transition-transform duration-300 pointer-events-none select-none ${
                                        isDragging ? 'blur-sm' : 'group-hover:scale-110'
                                    }`} 
                                    alt="Preview" 
                                    draggable={false}
                                />
                            </div>
                            
                            {/* Overlay Gradient - Only on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                            
                            {/* Drag Handle - Premium */}
                            <div className={`absolute left-2 top-2 w-8 h-8 bg-white/95 backdrop-blur-md rounded-lg flex items-center justify-center shadow-xl transition-all z-20 ${
                                isDragging 
                                    ? 'opacity-100 scale-110' 
                                    : 'opacity-0 group-hover:opacity-100'
                            } cursor-grab active:cursor-grabbing border border-gray-200/50`}>
                                <GripVertical size={18} className="text-gray-700" />
                            </div>
                            
                            {/* Remove Button - Premium */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeExisting(url);
                                }}
                                className={`absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-xl transition-all z-20 hover:bg-red-600 hover:scale-110 ${
                                    isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Remover imagem"
                            >
                                <X size={14}/>
                            </button>
                            
                            {/* Position Indicator - Premium */}
                            <div className={`absolute bottom-2 left-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm transition-all z-20 ${
                                isDragOver ? 'scale-125 bg-primary-500' : ''
                            }`}>
                                #{idx + 1}
                            </div>
                            
                            {/* Drop Zone Indicator */}
                            {isDragOver && (
                                <div className="absolute inset-0 border-4 border-dashed border-primary-400 bg-primary-100/30 flex items-center justify-center z-30">
                                    <div className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xl">
                                        Soltar aqui
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filesToUpload.map((file, idx) => {
                    const positionInAll = (tripData.images?.length || 0) + idx + 1;
                    const isDragging = draggedImage?.type === 'new' && draggedImage.index === idx;
                    const isDragOver = dragOverIndex?.type === 'new' && dragOverIndex.index === idx;
                    
                    return (
                        <div
                            key={`new-${idx}`}
                            draggable
                            onDragStart={() => handleDragStart('new', idx)}
                            onDragOver={(e) => handleDragOver(e, 'new', idx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, 'new', idx)}
                            onDragEnd={handleDragEnd}
                            className={`relative aspect-square rounded-xl overflow-hidden transition-all duration-300 cursor-move group bg-amber-50 ${
                                isDragging 
                                    ? 'opacity-30 scale-90 rotate-2 shadow-2xl z-50' 
                                    : isDragOver 
                                    ? 'border-4 border-amber-500 ring-4 ring-amber-200/50 scale-110 shadow-2xl z-40 bg-amber-50' 
                                    : 'border-2 border-amber-300 hover:border-amber-500 hover:shadow-xl hover:scale-105'
                            }`}
                        >
                            <div className="absolute inset-0 z-0">
                                <img 
                                    src={URL.createObjectURL(file)} 
                                    className={`w-full h-full object-cover transition-transform duration-300 pointer-events-none select-none ${
                                        isDragging ? 'blur-sm opacity-50' : 'opacity-90 group-hover:opacity-100 group-hover:scale-110'
                                    }`} 
                                    alt="Preview" 
                                    draggable={false}
                                />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-600/20 to-amber-700/20 z-10 pointer-events-none">
                                <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm">
                                    Novo
                                </span>
                            </div>
                            
                            {/* Overlay Gradient - Only on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
                            
                            {/* Drag Handle - Premium */}
                            <div className={`absolute left-2 top-2 w-8 h-8 bg-white/95 backdrop-blur-md rounded-lg flex items-center justify-center shadow-xl transition-all z-20 ${
                                isDragging 
                                    ? 'opacity-100 scale-110' 
                                    : 'opacity-0 group-hover:opacity-100'
                            } cursor-grab active:cursor-grabbing border border-gray-200/50`}>
                                <GripVertical size={18} className="text-gray-700" />
                            </div>
                            
                            {/* Remove Button - Premium */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeNew(idx);
                                }}
                                className={`absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-xl transition-all z-20 hover:bg-red-600 hover:scale-110 ${
                                    isDragging ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Remover imagem"
                            >
                                <X size={14}/>
                            </button>
                            
                            {/* Position Indicator - Premium */}
                            <div className={`absolute bottom-2 left-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm transition-all z-20 ${
                                isDragOver ? 'scale-125 bg-amber-500' : ''
                            }`}>
                                #{positionInAll}
                            </div>
                            
                            {/* Drop Zone Indicator */}
                            {isDragOver && (
                                <div className="absolute inset-0 border-4 border-dashed border-amber-400 bg-amber-100/30 flex items-center justify-center z-30">
                                    <div className="bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-xl">
                                        Soltar aqui
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
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

        {/* Included / Not Included */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* O que está incluso */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
                <CheckCircle className="text-white" size={20} />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-900">O que está incluso</label>
                <p className="text-xs text-gray-600 mt-0.5">Itens incluídos no pacote</p>
              </div>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                <Plus className="text-green-600" size={14} />
              </div>
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (value && !tripData.included?.includes(value)) {
                      setTripData(prev => ({
                        ...prev,
                        included: [...(prev.included || []), value]
                      }));
                      e.currentTarget.value = '';
                    }
                  }
                }}
                className="w-full border-2 border-green-200 rounded-xl p-3.5 pl-12 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all shadow-sm hover:shadow-md"
                placeholder="Digite um item e pressione Enter..."
              />
            </div>
            
            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {tripData.included?.map((item, idx) => (
                <div key={idx} className="group flex items-center justify-between bg-white rounded-lg p-3.5 border border-green-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                      <Check size={14} className="text-green-600" strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">{item}</span>
                  </div>
                  <button
                    onClick={() => setTripData(prev => ({
                      ...prev,
                      included: prev.included?.filter((_, i) => i !== idx) || []
                    }))}
                    className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!tripData.included || tripData.included.length === 0) && (
                <div className="text-center py-8 bg-white/50 rounded-lg border-2 border-dashed border-green-200">
                  <CheckCircle className="text-green-300 mx-auto mb-2" size={32} />
                  <p className="text-xs text-gray-500 font-medium">Nenhum item adicionado ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Adicione itens incluídos no pacote</p>
                </div>
              )}
            </div>
          </div>

          {/* O que não está incluso */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div>
                <label className="block text-base font-bold text-gray-900">O que não está incluso</label>
                <p className="text-xs text-gray-600 mt-0.5">Itens não incluídos (Opcional)</p>
              </div>
            </div>
            
            <div className="relative mb-4">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                <Plus className="text-amber-600" size={14} />
              </div>
              <input
                type="text"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (value && !tripData.notIncluded?.includes(value)) {
                      setTripData(prev => ({
                        ...prev,
                        notIncluded: [...(prev.notIncluded || []), value]
                      }));
                      e.currentTarget.value = '';
                    }
                  }
                }}
                className="w-full border-2 border-amber-200 rounded-xl p-3.5 pl-12 bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all shadow-sm hover:shadow-md"
                placeholder="Digite um item e pressione Enter..."
              />
            </div>
            
            <div className="space-y-2.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {tripData.notIncluded?.map((item, idx) => (
                <div key={idx} className="group flex items-center justify-between bg-white rounded-lg p-3.5 border border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                      <span className="text-amber-600 font-bold text-sm">•</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">{item}</span>
                  </div>
                  <button
                    onClick={() => setTripData(prev => ({
                      ...prev,
                      notIncluded: prev.notIncluded?.filter((_, i) => i !== idx) || []
                    }))}
                    className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(!tripData.notIncluded || tripData.notIncluded.length === 0) && (
                <div className="text-center py-8 bg-white/50 rounded-lg border-2 border-dashed border-amber-200">
                  <AlertTriangle className="text-amber-300 mx-auto mb-2" size={32} />
                  <p className="text-xs text-gray-500 font-medium">Nenhum item adicionado ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Adicione itens não incluídos (opcional)</p>
                </div>
              )}
            </div>
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
    <>
      <div className="w-full space-y-8">
        {/* Main Configuration Section - Single Column Premium Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA ESQUERDA: Configurações (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card: Crianças */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                  <Users className="text-pink-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Crianças</h3>
                  <p className="text-sm text-gray-500">Configure permissões para menores de idade</p>
                </div>
              </div>
              
              <div className="space-y-5">
                {/* Toggle: Permitir Crianças */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
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
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                    <div>
                      <p className="text-base font-semibold text-gray-900">Permitir crianças</p>
                      <p className="text-sm text-gray-600">Aceita passageiros menores de idade</p>
                    </div>
                  </div>
                </div>

                {/* Idade Limite - Only show if allowChildren is true */}
                {tripData.passengerConfig?.allowChildren !== false && (
                  <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Idade limite para criança
                    </label>
                    <div className="flex items-center gap-4">
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
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0
                          }
                        })}
                        className="w-24 border-2 border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-900 text-lg font-bold text-center focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                      />
                      <p className="text-sm text-gray-600">anos ou menos são considerados crianças</p>
                    </div>
                  </div>
                )}

                {/* Criança no Colo - Only show if allowChildren is true */}
                {tripData.passengerConfig?.allowChildren !== false && (
                  <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-200 hover:border-pink-300 transition-colors">
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex items-center cursor-pointer">
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
                              childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                      <div>
                        <p className="text-base font-semibold text-gray-900">Permitir criança no colo</p>
                        <p className="text-sm text-gray-600">Crianças pequenas podem viajar sem assento próprio (até 2 anos)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Idosos */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <User className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Idosos</h3>
                  <p className="text-sm text-gray-500">Configure permissões para terceira idade</p>
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
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
                          childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                  <div>
                    <p className="text-base font-semibold text-gray-900">Permitir idosos</p>
                    <p className="text-sm text-gray-600">Aceita passageiros da terceira idade (60+ anos)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Preview (1/3) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                    <Check className="text-white" size={20} />
                  </div>
                  <h5 className="text-lg font-bold text-gray-900">Preview</h5>
                </div>
                <div className="space-y-3">
                  {/* Children Preview */}
                  {tripData.passengerConfig?.allowChildren === false ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                      <Ban className="text-red-500" size={16} />
                      <span className="font-semibold">Crianças não permitidas</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                      <Check className="text-green-600" size={16} />
                      <span className="font-semibold">Crianças permitidas</span>
                      {tripData.passengerConfig?.childAgeLimit && (
                        <span className="text-gray-500 text-xs">
                          (até {tripData.passengerConfig.childAgeLimit} anos)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Seniors Preview */}
                  {tripData.passengerConfig?.allowSeniors === false ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
                      <Ban className="text-red-500" size={16} />
                      <span className="font-semibold">Idosos não permitidos</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                      <Check className="text-green-600" size={16} />
                      <span className="font-semibold">Idosos permitidos</span>
                    </div>
                  )}

                  {/* Lap Child Preview */}
                  {tripData.passengerConfig?.allowLapChild && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 px-4 py-3 rounded-xl border border-blue-200">
                      <Info className="text-blue-600" size={16} />
                      <span className="font-semibold">Criança no colo permitida</span>
                    </div>
                  )}

                  {/* Child Price Preview */}
                  {tripData.passengerConfig?.allowChildren !== false && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 bg-purple-50 px-4 py-3 rounded-xl border border-purple-200">
                      <DollarSign className="text-purple-600" size={16} />
                      <span className="font-semibold">
                        {tripData.passengerConfig?.childPriceType === 'fixed' && tripData.passengerConfig?.childPriceFixed !== undefined
                          ? `R$ ${Math.round((tripData.price || 500) - tripData.passengerConfig.childPriceFixed).toLocaleString('pt-BR')} desconto`
                          : `${Math.round((1 - (tripData.passengerConfig?.childPriceMultiplier || 1.0)) * 100)}% desconto`}
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
        <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-lg p-8 lg:p-10 mt-12">
          <div className="flex items-start gap-5 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <DollarSign className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <label className="block text-2xl font-bold text-gray-900 mb-2">
                Desconto para Crianças
              </label>
              <p className="text-sm text-gray-600 leading-relaxed">
                Configure o desconto aplicado ao preço da viagem para crianças. Escolha entre desconto percentual ou valor fixo em reais.
              </p>
            </div>
          </div>
                  
          <div className="bg-white rounded-xl p-8 lg:p-10 border border-emerald-100 shadow-md mt-6">
                    {/* Toggle between Percentage and Fixed */}
              <div className="flex items-center gap-4 mb-8 bg-gray-50 p-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTripData({
                          ...tripData,
                          passengerConfig: {
                            allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                            allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                            childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                            allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                            childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0,
                            childPriceType: 'percentage',
                            childPriceFixed: tripData.passengerConfig?.childPriceFixed
                          }
                        })}
                  className={`flex-1 px-6 py-3.5 rounded-lg font-bold text-sm transition-all ${
                          (tripData.passengerConfig?.childPriceType ?? 'percentage') === 'percentage'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-[1.02]'
                      : 'bg-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Desconto em %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // Calculate initial fixed price based on current percentage discount or use default
                          const currentPrice = tripData.price || 500;
                          const currentMultiplier = tripData.passengerConfig?.childPriceMultiplier ?? 1.0;
                          const currentDiscountPercent = (1 - currentMultiplier) * 100;
                          const defaultDiscount = Math.round(currentPrice * (currentDiscountPercent / 100));
                          
                          // If childPriceFixed exists, use it; otherwise calculate from current discount
                          const initialFixedPrice = tripData.passengerConfig?.childPriceFixed 
                            ? tripData.passengerConfig.childPriceFixed 
                            : (currentPrice - defaultDiscount);
                          
                          setTripData({
                            ...tripData,
                            passengerConfig: {
                              allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                              allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                              childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                              allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                              childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0,
                              childPriceType: 'fixed',
                              childPriceFixed: Math.max(0, initialFixedPrice)
                            }
                          });
                        }}
                  className={`flex-1 px-6 py-3.5 rounded-lg font-bold text-sm transition-all ${
                          tripData.passengerConfig?.childPriceType === 'fixed'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg transform scale-[1.02]'
                      : 'bg-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Desconto em R$
                      </button>
                    </div>

                    {/* Input Section */}
                    {(tripData.passengerConfig?.childPriceType ?? 'percentage') === 'percentage' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Desconto Percentual</label>
                      <p className="text-xs text-gray-500 mb-4">Digite a porcentagem de desconto sobre o preço da viagem</p>
                    </div>
                    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={Math.round((1 - (tripData.passengerConfig?.childPriceMultiplier ?? 1.0)) * 100)}
                              onChange={e => {
                                const discount = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                const multiplier = 1 - (discount / 100);
                                setTripData({ 
                                  ...tripData, 
                                  passengerConfig: {
                                    allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                                    allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                                    childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                                    allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                                    childPriceMultiplier: multiplier,
                                    childPriceType: 'percentage',
                                    childPriceFixed: tripData.passengerConfig?.childPriceFixed
                                  }
                                });
                              }}
                        className="w-full bg-transparent border-0 pl-8 pr-20 py-4 text-gray-900 text-5xl font-bold text-center focus:ring-0 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 text-4xl font-bold text-emerald-600 pointer-events-none z-10">
                              %
                            </div>
                          </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Desconto de {Math.round((1 - (tripData.passengerConfig?.childPriceMultiplier ?? 1.0)) * 100)}%</p>
                        <p className="text-xs text-gray-600">
                          Crianças terão {Math.round((1 - (tripData.passengerConfig?.childPriceMultiplier ?? 1.0)) * 100)}% de desconto sobre o preço da viagem
                        </p>
                      </div>
                              </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Exemplo de Cálculo</label>
                      <p className="text-xs text-gray-500">Visualização do desconto aplicado</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border-2 border-gray-200 shadow-lg">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b-2 border-gray-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm">
                              <User className="text-gray-700" size={18} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Preço Original</p>
                              <p className="text-sm font-bold text-gray-900">Adulto</p>
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 text-xl">
                            R$ {(tripData.price || 500).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">-{Math.round((1 - (tripData.passengerConfig?.childPriceMultiplier ?? 1.0)) * 100)}%</span>
                              </div>
                              <span className="text-xs font-semibold text-emerald-700">Desconto</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">
                              -R$ {Math.round((tripData.price || 500) * (1 - (tripData.passengerConfig?.childPriceMultiplier ?? 1.0))).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                              <Users className="text-emerald-600" size={18} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Preço Final</p>
                              <p className="text-sm font-bold text-gray-900">Criança</p>
                            </div>
                          </div>
                          <span className="font-bold text-emerald-600 text-xl">
                            R$ {Math.round((tripData.price || 500) * (tripData.passengerConfig?.childPriceMultiplier ?? 1.0)).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                      </div>
                    ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Desconto em Reais</label>
                      <p className="text-xs text-gray-500 mb-4">Digite o valor do desconto em reais sobre o preço da viagem</p>
                    </div>
                    <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-2xl pointer-events-none">
                              R$
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={(() => {
                                const price = tripData.price || 500;
                                if (tripData.passengerConfig?.childPriceFixed !== undefined) {
                                  return Math.round(price - tripData.passengerConfig.childPriceFixed);
                                }
                                // Calculate from current percentage discount if available
                                const multiplier = tripData.passengerConfig?.childPriceMultiplier ?? 1.0;
                                const discountPercent = (1 - multiplier) * 100;
                                return Math.round(price * (discountPercent / 100));
                              })()}
                              onChange={e => {
                                const price = tripData.price || 500;
                                const discount = Math.max(0, Math.min(price, parseFloat(e.target.value) || 0));
                                const finalPrice = price - discount;
                                setTripData({ 
                                  ...tripData, 
                                  passengerConfig: {
                                    allowChildren: tripData.passengerConfig?.allowChildren ?? true,
                                    allowSeniors: tripData.passengerConfig?.allowSeniors ?? true,
                                    childAgeLimit: tripData.passengerConfig?.childAgeLimit ?? 12,
                                    allowLapChild: tripData.passengerConfig?.allowLapChild ?? false,
                                    childPriceMultiplier: tripData.passengerConfig?.childPriceMultiplier ?? 1.0,
                                    childPriceType: 'fixed',
                                    childPriceFixed: finalPrice
                                  }
                                });
                              }}
                        className="w-full bg-transparent border-0 pl-20 pr-6 py-4 text-gray-900 text-5xl font-bold text-center focus:ring-0 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                    <div className="flex items-start gap-3 text-sm text-gray-700 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Desconto de R$ {tripData.passengerConfig?.childPriceFixed ? Math.round((tripData.price || 500) - tripData.passengerConfig.childPriceFixed).toLocaleString('pt-BR') : '0'}</p>
                        <p className="text-xs text-gray-600">
                          Crianças terão este valor descontado do preço da viagem
                        </p>
                      </div>
                              </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-1">Exemplo de Cálculo</label>
                      <p className="text-xs text-gray-500">Visualização do desconto aplicado</p>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border-2 border-gray-200 shadow-lg">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b-2 border-gray-300">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shadow-sm">
                              <User className="text-gray-700" size={18} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Preço Original</p>
                              <p className="text-sm font-bold text-gray-900">Adulto</p>
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 text-xl">
                            R$ {(tripData.price || 500).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">-R$</span>
                              </div>
                              <span className="text-xs font-semibold text-emerald-700">Desconto</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">
                              -R$ {tripData.passengerConfig?.childPriceFixed ? Math.round((tripData.price || 500) - tripData.passengerConfig.childPriceFixed).toLocaleString('pt-BR') : '0'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                              <Users className="text-emerald-600" size={18} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Preço Final</p>
                              <p className="text-sm font-bold text-gray-900">Criança</p>
                            </div>
                          </div>
                          <span className="font-bold text-emerald-600 text-xl">
                            R$ {(tripData.passengerConfig?.childPriceFixed ?? (tripData.price || 500)).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
    </>
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
        <div className="bg-white rounded-2xl max-w-7xl w-full p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
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
