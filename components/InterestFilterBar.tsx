import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Compass, LucideIcon } from 'lucide-react';

export interface InterestOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface InterestFilterBarProps {
  interests: InterestOption[];
  selectedInterests: string[];
  onToggle: (label: string) => void;
  title?: string;
  subtitle?: string;
}

const InterestFilterBar: React.FC<InterestFilterBarProps> = ({ 
  interests, 
  selectedInterests, 
  onToggle,
  title = "Explorar por Interesse",
  subtitle = "Encontre o estilo de viagem perfeito para você"
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Tolerance of 2px for calculation errors
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [interests]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="w-full animate-[fadeIn_0.5s]">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-2 px-1 gap-2">
        <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Compass className="text-primary-600" size={20} />
                {title}
            </h2>
            {subtitle && <p className="text-xs text-gray-500 mt-1 ml-7">{subtitle}</p>}
        </div>
        
        {selectedInterests.length > 0 && (
             <div className="text-xs text-primary-600 font-bold bg-primary-50 px-3 py-1 rounded-full self-start md:self-auto border border-primary-100 animate-[fadeIn_0.3s]">
                 {selectedInterests.length} selecionado(s)
             </div>
        )}
      </div>

      {/* Scroll Container Wrapper */}
      {/* -mx-4 px-4 trick creates edge-to-edge swipe on mobile while keeping content aligned */}
      <div className="relative group/scroll -mx-4 px-4 md:mx-0 md:px-0">
        
        {/* Left Shadow/Arrow - Gradient matches bg-gray-50 */}
        <div className={`absolute left-0 top-0 bottom-0 z-20 flex items-center transition-all duration-300 ${canScrollLeft ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
            {/* Gradient Mask */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent w-20 md:w-24"></div>
            
            {/* Button */}
            <button 
                onClick={() => scroll('left')} 
                className="relative ml-2 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-gray-700 hover:text-primary-600 hover:scale-110 hover:shadow-md transition-all active:scale-95 z-30"
                aria-label="Rolar para esquerda"
            >
                <ChevronLeft size={18} />
            </button>
        </div>

        {/* Right Shadow/Arrow */}
        <div className={`absolute right-0 top-0 bottom-0 z-20 flex items-center justify-end transition-all duration-300 ${canScrollRight ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
             {/* Gradient Mask */}
             <div className="absolute inset-0 bg-gradient-to-l from-gray-50 via-gray-50/90 to-transparent w-20 md:w-24"></div>
             
             {/* Button */}
             <button 
                onClick={() => scroll('right')} 
                className="relative mr-2 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 text-gray-700 hover:text-primary-600 hover:scale-110 hover:shadow-md transition-all active:scale-95 z-30"
                aria-label="Rolar para direita"
            >
                <ChevronRight size={18} />
            </button>
        </div>

        {/* List */}
        {/* py-4 added to ensure shadows/scaling are not clipped by overflow */}
        <div 
            ref={scrollRef} 
            onScroll={checkScroll} 
            className="flex gap-3 overflow-x-auto py-4 px-1 scrollbar-hide snap-x snap-mandatory scroll-smooth items-center"
        >
            {interests.map(({ label, icon: Icon, id }) => {
                const isAll = label === 'Todos';
                const isActive = isAll ? selectedInterests.length === 0 : selectedInterests.includes(label);

                return (
                    <button
                        key={id}
                        onClick={() => onToggle(label)}
                        className={`
                            snap-start flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 select-none border whitespace-nowrap outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500
                            ${isActive 
                                ? 'bg-gray-900 text-white border-gray-900 shadow-[0_4px_12px_rgba(0,0,0,0.15)] transform scale-105' 
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
                            }
                        `}
                    >
                        {Icon && <Icon size={16} className={isActive ? 'text-primary-400' : 'text-gray-400'} />}
                        {label}
                    </button>
                );
            })}
            
            {/* Spacer element to ensure last item isn't covered by right gradient/arrow */}
            <div className="w-12 flex-shrink-0 h-1"></div>
        </div>
      </div>
    </div>
  );
};

export default InterestFilterBar;