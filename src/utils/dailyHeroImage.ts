import { Trip } from '../types';

// Fallback travel images if no trips available
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80', // Mountains
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', // Beach
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80', // Lake
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80', // Road
    'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1200&q=80', // Adventure
];

const STORAGE_KEY = 'daily_hero_image';
const STORAGE_DATE_KEY = 'daily_hero_image_date';

interface StoredImageData {
    imageUrl: string;
    date: string; // YYYY-MM-DD format
}

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Get a deterministic index based on date
 * This ensures the same image is selected for the entire day
 */
const getDateBasedIndex = (arrayLength: number): number => {
    const today = getTodayDate();
    // Create a simple hash from the date string
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        const char = today.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % arrayLength;
};

/**
 * Get the daily hero image URL
 * This returns the same image for the entire day across all components
 * 
 * @param trips - Available trips with images
 * @returns The image URL to use for the day
 */
export const getDailyHeroImage = (trips: Trip[]): string => {
    const today = getTodayDate();

    // Check if we have a cached image for today
    try {
        const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
        const storedImage = localStorage.getItem(STORAGE_KEY);

        if (storedDate === today && storedImage) {
            return storedImage;
        }
    } catch {
        // Ignore localStorage errors
    }

    // Get all available images from trips
    const tripImages = trips
        .filter(t => t.images && t.images.length > 0)
        .flatMap(t => t.images || [])
        .filter(img => img && img.length > 0);

    // Use trip images if available, otherwise fallback
    const allImages = tripImages.length > 0 ? tripImages : FALLBACK_IMAGES;

    // Get deterministic index based on today's date
    const index = getDateBasedIndex(allImages.length);
    const selectedImage = allImages[index] || FALLBACK_IMAGES[0];

    // Cache for today
    try {
        localStorage.setItem(STORAGE_DATE_KEY, today);
        localStorage.setItem(STORAGE_KEY, selectedImage);
    } catch {
        // Ignore localStorage errors
    }

    return selectedImage;
};

/**
 * Force refresh the daily image (useful for testing or manual refresh)
 */
export const clearDailyHeroImage = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_DATE_KEY);
    } catch {
        // Ignore localStorage errors
    }
};

/**
 * React hook to get the daily hero image
 * Returns the same image URL for all components on the same day
 */
export const useDailyHeroImage = (trips: Trip[]): string => {
    return getDailyHeroImage(trips);
};

export default getDailyHeroImage;
