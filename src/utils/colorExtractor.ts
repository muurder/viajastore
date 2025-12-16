/**
 * Color Extraction Utility
 * Extracts dominant and secondary colors from an image
 * Uses Canvas API for color analysis
 */

export interface ExtractedColors {
  dominant: string; // Hex color
  secondary: string; // Hex color
}

export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
}

export type PaletteVariant = 'vibrant' | 'soft' | 'professional';

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

      // Improved color sampling: sample every 8th pixel for better accuracy
      // Also use a more sophisticated quantization (16 levels instead of 8)
      for (let i = 0; i < data.length; i += 32) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent or very transparent pixels
        if (a < 200) continue;

        // Improved quantization: 16 levels (more precise)
        const qr = Math.floor(r / 16) * 16;
        const qg = Math.floor(g / 16) * 16;
        const qb = Math.floor(b / 16) * 16;
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
 * Convert hex to RGB
 */
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
};

/**
 * Lighten a color by mixing with white
 */
const lightenColor = (rgb: [number, number, number], amount: number): [number, number, number] => {
  const [r, g, b] = rgb;
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount)
  ];
};

/**
 * Darken a color by mixing with black
 */
const darkenColor = (rgb: [number, number, number], amount: number): [number, number, number] => {
  const [r, g, b] = rgb;
  return [
    Math.round(r * (1 - amount)),
    Math.round(g * (1 - amount)),
    Math.round(b * (1 - amount))
  ];
};

/**
 * Desaturate a color (convert to grayscale mix)
 */
const desaturateColor = (rgb: [number, number, number], amount: number): [number, number, number] => {
  const [r, g, b] = rgb;
  const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  return [
    Math.round(r + (gray - r) * amount),
    Math.round(g + (gray - g) * amount),
    Math.round(b + (gray - b) * amount)
  ];
};

/**
 * Generate 6 intelligent color palettes from a base color
 */
export const generateColorPalettes = (baseColor: string): ColorPalette[] => {
  const baseRgb = hexToRgb(baseColor);
  
  // 1. Vibrant (Default) - Base color + complementary
  const complementary = getComplementaryColor(baseRgb);
  const vibrant: ColorPalette = {
    name: 'Vibrante',
    primary: baseColor,
    secondary: rgbToHex(complementary[0], complementary[1], complementary[2])
  };
  
  // 2. Soft (Pastel/Monochromatic) - Lightened base + neutral gray
  const lightened = lightenColor(baseRgb, 0.4);
  const soft: ColorPalette = {
    name: 'Suave',
    primary: rgbToHex(lightened[0], lightened[1], lightened[2]),
    secondary: '#6B7280'
  };
  
  // 3. Professional (Dark) - Darkened base + dark gray/black
  const darkened = darkenColor(baseRgb, 0.3);
  const professional: ColorPalette = {
    name: 'Profissional',
    primary: rgbToHex(darkened[0], darkened[1], darkened[2]),
    secondary: '#111827'
  };
  
  // 4. Elegant (Monochromatic) - Base + lighter/darker variations
  const lighter = lightenColor(baseRgb, 0.2);
  const darker = darkenColor(baseRgb, 0.15);
  const elegant: ColorPalette = {
    name: 'Elegante',
    primary: baseColor,
    secondary: rgbToHex(darker[0], darker[1], darker[2])
  };
  
  // 5. Modern (Analogous) - Base + adjacent color on color wheel
  const analogous = getAnalogousColor(baseRgb);
  const modern: ColorPalette = {
    name: 'Moderno',
    primary: baseColor,
    secondary: rgbToHex(analogous[0], analogous[1], analogous[2])
  };
  
  // 6. Bold (Triadic) - Base + triadic colors
  const triadic = getTriadicColor(baseRgb);
  const bold: ColorPalette = {
    name: 'Ousado',
    primary: baseColor,
    secondary: rgbToHex(triadic[0], triadic[1], triadic[2])
  };
  
  return [vibrant, soft, professional, elegant, modern, bold];
};

/**
 * Get analogous color (adjacent on color wheel)
 */
const getAnalogousColor = (rgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb;
  // Shift hue by 30 degrees (analogous)
  // Simple approximation: increase green component
  return [
    Math.min(255, Math.max(0, r + 20)),
    Math.min(255, Math.max(0, g + 30)),
    Math.min(255, Math.max(0, b - 10))
  ];
};

/**
 * Get triadic color (120 degrees on color wheel)
 */
const getTriadicColor = (rgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb;
  // Triadic: rotate colors
  return [g, b, r];
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

