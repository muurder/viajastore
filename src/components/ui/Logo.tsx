import React from 'react';
import { MapPin, Leaf } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  iconSize?: number;
  variant?: 'default' | 'white';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  iconSize,
  variant = 'default'
}) => {
  // Calculate icon size based on className or use default - Increased sizes
  const getIconSize = () => {
    if (iconSize) return iconSize;
    // Increased default sizes for more prominence
    if (className.includes('h-8') || className.includes('h-6')) return 28;
    if (className.includes('h-10') || className.includes('h-12')) return 36;
    if (className.includes('h-16')) return 48;
    return 32; // Increased default
  };

  const size = getIconSize();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Container with Leaf accent - Larger */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <div className="absolute -top-1 -right-1 z-10">
          <Leaf
            size={size * 0.4}
            className={
              variant === 'white'
                ? 'text-white fill-white/20'
                : 'text-secondary-500 fill-secondary-500/20'
            }
          />
        </div>
        <MapPin
          size={size}
          className={`relative z-0 ${variant === 'white'
            ? 'text-white fill-white/20'
            : 'text-secondary-500 fill-secondary-500/10'
            }`}
          strokeWidth={2.5}
        />
      </div>

      {/* Text - Larger and more prominent - SouNativo (junto) */}
      {showText && (
        <span className="font-bold tracking-tight whitespace-nowrap text-2xl md:text-3xl">
          <span className={variant === 'white' ? 'text-white' : 'text-stone-800'}>Sou</span>
          <span className={variant === 'white' ? 'text-white' : 'text-primary-500'}>Nativo</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
