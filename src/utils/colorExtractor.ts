/**
 * Color Extraction Utility
 * Extracts dominant and secondary colors from an image
 * Uses Canvas API for color analysis
 */

export interface ExtractedColors {
  dominant: string; // Hex color
  secondary: string; // Hex color
}

/**
 * Extract colors from an image file
 * @param file - Image file to analyze
 * @returns Promise with extracted colors
 */
export const extractColorsFromImage = async (file: File): Promise<ExtractedColors> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // Set canvas size to image size (limit to 200px for performance)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Color frequency map
      const colorMap = new Map<string, number>();
      const colorSamples: Array<[number, number, number]> = [];

      // Sample colors (every 10th pixel for performance)
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Quantize colors to reduce noise (group similar colors)
        const qr = Math.floor(r / 32) * 32;
        const qg = Math.floor(g / 32) * 32;
        const qb = Math.floor(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;

        colorMap.set(key, (colorMap.get(key) || 0) + 1);
        colorSamples.push([r, g, b]);
      }

      // Find dominant color (most frequent)
      let maxCount = 0;
      let dominantKey = '';
      for (const [key, count] of colorMap.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantKey = key;
        }
      }

      // Convert dominant color
      const [dr, dg, db] = dominantKey.split(',').map(Number);
      const dominant = rgbToHex(dr, dg, db);

      // Find secondary color (most different from dominant)
      let maxDistance = 0;
      let secondaryColor = [dr, dg, db];

      for (const [r, g, b] of colorSamples) {
        const distance = colorDistance([r, g, b], [dr, dg, db]);
        if (distance > maxDistance) {
          maxDistance = distance;
          secondaryColor = [r, g, b];
        }
      }

      // If no good secondary found, use a complementary color
      if (maxDistance < 100) {
        secondaryColor = getComplementaryColor([dr, dg, db]);
      }

      const secondary = rgbToHex(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

      resolve({ dominant, secondary });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Convert RGB to Hex
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Calculate color distance (Euclidean distance in RGB space)
 */
const colorDistance = (color1: [number, number, number], color2: [number, number, number]): number => {
  const [r1, g1, b1] = color1;
  const [r2, g2, b2] = color2;
  return Math.sqrt(
    Math.pow(r2 - r1, 2) + 
    Math.pow(g2 - g1, 2) + 
    Math.pow(b2 - b1, 2)
  );
};

/**
 * Get complementary color (opposite on color wheel)
 */
const getComplementaryColor = (rgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb;
  return [255 - r, 255 - g, 255 - b];
};

/**
 * Extract colors from image URL (for existing logos)
 */
export const extractColorsFromUrl = async (imageUrl: string): Promise<ExtractedColors> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Create a temporary file-like object
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Convert to blob and then to File
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to blob'));
            return;
          }
          
          const file = new File([blob], 'logo.png', { type: 'image/png' });
          extractColorsFromImage(file).then(resolve).catch(reject);
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image from URL'));
    };

    img.src = imageUrl;
  });
};

