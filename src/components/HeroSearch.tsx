import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Calendar, Users, Search, ChevronDown, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Guests {
  adults: number;
  children: number;
}

interface HeroSearchProps {
  onSearch?: (params: {
    destination: string;
    dateRange: DateRange;
    guests: Guests;
  }) => void;
  initialDestination?: string;
  initialDateRange?: DateRange;
  initialGuests?: Guests;
}

const HeroSearch: React.FC<HeroSearchProps> = ({
  onSearch,
  initialDestination = '',
  initialDateRange = { start: null, end: null },
  initialGuests = { adults: 2, children: 0 }
}) => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(initialDestination);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [guests, setGuests] = useState<Guests>(initialGuests);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestsPicker, setShowGuestsPicker] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const guestsPickerRef = useRef<HTMLDivElement>(null);

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (guestsPickerRef.current && !guestsPickerRef.current.contains(event.target as Node)) {
        setShowGuestsPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display - FIX: Simplified format for better readability
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('pt-BR', options);
  };

  // Get date range display text
  const getDateRangeText = (): string => {
    if (!dateRange.start && !dateRange.end) return 'Check-in — Check-out';
    if (dateRange.start && !dateRange.end) return `${formatDate(dateRange.start)} — Escolher data`;
    if (dateRange.start && dateRange.end) {
      return `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`;
    }
    return 'Check-in — Check-out';
  };

  // Get guests display text
  const getGuestsText = (): string => {
    const total = guests.adults + guests.children;
    if (total === 0) return '2 Adultos, 0 Crianças';
    const parts: string[] = [];
    if (guests.adults > 0) parts.push(`${guests.adults} ${guests.adults === 1 ? 'Adulto' : 'Adultos'}`);
    if (guests.children > 0) parts.push(`${guests.children} ${guests.children === 1 ? 'Criança' : 'Crianças'}`);
    return parts.join(', ') || '2 Adultos, 0 Crianças';
  };

  // Generate calendar days
  const generateCalendarDays = (year: number, month: number): (Date | null)[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Check if date is in range - FIX: Normalize dates for accurate comparison
  const isDateInRange = (date: Date): boolean => {
    if (!dateRange.start || !dateRange.end) return false;
    
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const normalizedStart = new Date(dateRange.start);
    normalizedStart.setHours(0, 0, 0, 0);
    
    const normalizedEnd = new Date(dateRange.end);
    normalizedEnd.setHours(0, 0, 0, 0);
    
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
  };

  // Check if date is selected - FIX: Normalize dates for accurate comparison
  const isDateSelected = (date: Date): boolean => {
    if (!dateRange.start) return false;
    
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const normalizedStart = new Date(dateRange.start);
    normalizedStart.setHours(0, 0, 0, 0);
    
    if (dateRange.end) {
      const normalizedEnd = new Date(dateRange.end);
      normalizedEnd.setHours(0, 0, 0, 0);
      return normalizedDate.getTime() === normalizedStart.getTime() || normalizedDate.getTime() === normalizedEnd.getTime();
    }
    
    return normalizedDate.getTime() === normalizedStart.getTime();
  };

  // Handle date click - FIX: Normalize date comparison to avoid time issues
  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    if (normalizedDate < today) return;

    // Normalize existing dates for comparison
    const normalizedStart = dateRange.start ? new Date(dateRange.start) : null;
    if (normalizedStart) normalizedStart.setHours(0, 0, 0, 0);

    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      // Start new selection
      setDateRange({ start: normalizedDate, end: null });
    } else if (dateRange.start && !dateRange.end) {
      // Complete the range
      if (normalizedDate >= normalizedStart!) {
        setDateRange({ start: dateRange.start, end: normalizedDate });
        setShowDatePicker(false);
      } else {
        // Selected date is before start, so make it the new start
        setDateRange({ start: normalizedDate, end: null });
      }
    }
  };

  // Handle search
  const handleSearch = () => {
    if (onSearch) {
      onSearch({ destination, dateRange, guests });
    } else {
      const params = new URLSearchParams();
      if (destination) params.set('q', destination);
      if (dateRange.start) params.set('startDate', dateRange.start.toISOString().split('T')[0]);
      if (dateRange.end) params.set('endDate', dateRange.end.toISOString().split('T')[0]);
      if (guests.adults > 0) params.set('adults', guests.adults.toString());
      if (guests.children > 0) params.set('children', guests.children.toString());
      
      navigate(`/trips?${params.toString()}`);
    }
  };

  // Get current month/year for calendar
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const calendarDays = generateCalendarDays(currentYear, currentMonth);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  return (
    <div className="w-full relative z-[100]">
      {/* Desktop: Horizontal Bar - FIX: High z-index container */}
      <div className="hidden md:flex bg-white rounded-full shadow-2xl border border-gray-100 p-2 items-center gap-2 relative z-[100]">
        {/* Destination */}
        <div className="flex-1 relative min-w-[200px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
            <MapPin size={20} />
          </div>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Para onde você vai?"
            className="w-full pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 font-medium text-base outline-none bg-transparent rounded-full"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="w-px h-8 bg-gray-200"></div>

        {/* Date Range - FIX: High z-index for dropdown and proper text display */}
        <div className="relative z-[110]" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowDatePicker(!showDatePicker);
              setShowGuestsPicker(false);
            }}
            className="flex items-center gap-3 px-6 py-4 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors min-w-[260px]"
          >
            <Calendar size={20} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm flex-1 min-w-0 text-left truncate">{getDateRangeText()}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${showDatePicker ? 'rotate-180' : ''}`} />
          </button>

          {showDatePicker && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-[110] min-w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronDown size={16} className="rotate-90 text-gray-600" />
                </button>
                <h3 className="font-bold text-gray-900">{monthNames[currentMonth]} {currentYear}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronDown size={16} className="-rotate-90 text-gray-600" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-xs font-bold text-gray-500 text-center py-2">{day}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={idx} className="aspect-square" />;
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const normalizedDate = new Date(date);
                  normalizedDate.setHours(0, 0, 0, 0);
                  const isPast = normalizedDate < today;
                  const isSelected = isDateSelected(date);
                  const isInRange = isDateInRange(date);
                  
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDateClick(date);
                      }}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={isPast}
                      className={`
                        aspect-square text-sm font-medium rounded-lg transition-colors relative z-[120]
                        ${isPast ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-700 hover:bg-gray-100 cursor-pointer'}
                        ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                        ${isInRange && !isSelected ? 'bg-primary-50 text-primary-700' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-gray-200"></div>

        {/* Guests - FIX: High z-index for dropdown and proper text display */}
        <div className="relative z-[110]" ref={guestsPickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowGuestsPicker(!showGuestsPicker);
              setShowDatePicker(false);
            }}
            className="flex items-center gap-3 px-6 py-4 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors min-w-[240px]"
          >
            <Users size={20} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm flex-1 min-w-0 text-left truncate">{getGuestsText()}</span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${showGuestsPicker ? 'rotate-180' : ''}`} />
          </button>

          {showGuestsPicker && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-[110] min-w-[240px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">Adultos</div>
                    <div className="text-xs text-gray-500">13 anos ou mais</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setGuests(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }));
                      }}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors relative z-[120] cursor-pointer"
                    >
                      <Minus size={14} className="text-gray-600" />
                    </button>
                    <span className="font-bold text-gray-900 w-8 text-center">{guests.adults}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setGuests(prev => ({ ...prev, adults: prev.adults + 1 }));
                      }}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors relative z-[120] cursor-pointer"
                    >
                      <Plus size={14} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">Crianças</div>
                      <div className="text-xs text-gray-500">0 a 12 anos</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setGuests(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }));
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors relative z-[120] cursor-pointer"
                      >
                        <Minus size={14} className="text-gray-600" />
                      </button>
                      <span className="font-bold text-gray-900 w-8 text-center">{guests.children}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setGuests(prev => ({ ...prev, children: prev.children + 1 }));
                        }}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors relative z-[120] cursor-pointer"
                      >
                        <Plus size={14} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-full transition-all shadow-lg shadow-primary-500/30 font-bold flex items-center justify-center gap-2 min-w-[140px] hover:scale-105 active:scale-95"
        >
          <Search size={20} />
          Pesquisar
        </button>
      </div>

      {/* Mobile: Vertical Stack - FIX: High z-index */}
      <div className="md:hidden bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 space-y-3 relative z-[100]">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
            <MapPin size={18} />
          </div>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Para onde você vai?"
            className="w-full pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 font-medium outline-none bg-gray-50 rounded-xl border border-gray-200"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="relative z-[110]" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker(!showDatePicker);
                setShowGuestsPicker(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-3 text-gray-700 font-medium rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Calendar size={18} className="text-gray-400" />
              <span className="text-xs flex-1 text-left">{getDateRangeText()}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
            {/* Date picker modal for mobile would go here - simplified for now */}
            {/* If implemented, use z-[9999] for the dropdown */}
          </div>

          <div className="relative z-[110]" ref={guestsPickerRef}>
            <button
              type="button"
              onClick={() => {
                setShowGuestsPicker(!showGuestsPicker);
                setShowDatePicker(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-3 text-gray-700 font-medium rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <Users size={18} className="text-gray-400" />
              <span className="text-xs flex-1 text-left">{getGuestsText()}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showGuestsPicker ? 'rotate-180' : ''}`} />
            </button>
            {/* Guests picker modal for mobile would go here - simplified for now */}
            {/* If implemented, use z-[9999] for the dropdown */}
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl transition-colors shadow-lg font-bold flex items-center justify-center gap-2"
        >
          <Search size={20} />
          Pesquisar
        </button>
      </div>
    </div>
  );
};

export default HeroSearch;

