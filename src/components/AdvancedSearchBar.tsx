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

interface AdvancedSearchBarProps {
  onSearch?: (params: {
    destination: string;
    dateRange: DateRange;
    guests: Guests;
  }) => void;
  initialDestination?: string;
  initialDateRange?: DateRange;
  initialGuests?: Guests;
}

const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
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

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('pt-BR', options);
  };

  // Get date range display text
  const getDateRangeText = (): string => {
    if (!dateRange.start && !dateRange.end) return 'Datas';
    if (dateRange.start && !dateRange.end) return `${formatDate(dateRange.start)} — Escolher data`;
    if (dateRange.start && dateRange.end) {
      return `${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}`;
    }
    return 'Datas';
  };

  // Get guests display text
  const getGuestsText = (): string => {
    const total = guests.adults + guests.children;
    if (total === 0) return 'Hóspedes';
    const parts: string[] = [];
    if (guests.adults > 0) parts.push(`${guests.adults} ${guests.adults === 1 ? 'adulto' : 'adultos'}`);
    if (guests.children > 0) parts.push(`${guests.children} ${guests.children === 1 ? 'criança' : 'crianças'}`);
    return parts.join(' · ') || 'Hóspedes';
  };

  // Generate calendar days
  const generateCalendarDays = (year: number, month: number): (Date | null)[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  // Check if date is in range
  const isDateInRange = (date: Date): boolean => {
    if (!dateRange.start || !dateRange.end) return false;
    return date >= dateRange.start && date <= dateRange.end;
  };

  // Check if date is selected
  const isDateSelected = (date: Date): boolean => {
    if (dateRange.start && dateRange.end) {
      return date.getTime() === dateRange.start.getTime() || date.getTime() === dateRange.end.getTime();
    }
    if (dateRange.start) {
      return date.getTime() === dateRange.start.getTime();
    }
    return false;
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return; // Can't select past dates

    if (!dateRange.start || (dateRange.start && dateRange.end)) {
      // Start new selection
      setDateRange({ start: date, end: null });
    } else if (dateRange.start && !dateRange.end) {
      // Complete selection
      if (date >= dateRange.start) {
        setDateRange({ start: dateRange.start, end: date });
        setShowDatePicker(false);
      } else {
        // If clicked date is before start, make it the new start
        setDateRange({ start: date, end: null });
      }
    }
  };

  // Handle search
  const handleSearch = () => {
    if (onSearch) {
      onSearch({ destination, dateRange, guests });
    } else {
      // Default: navigate to trips page with query params
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2 flex flex-col md:flex-row gap-2">
      {/* Destination Input */}
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <MapPin size={18} />
        </div>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Para onde você quer ir?"
          className="w-full pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 font-medium outline-none bg-transparent rounded-xl border border-transparent hover:border-gray-200 focus:border-primary-500 transition-colors"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {/* Date Range Picker */}
      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => {
            setShowDatePicker(!showDatePicker);
            setShowGuestsPicker(false);
          }}
          className="flex items-center gap-2 px-4 py-3 text-gray-700 font-medium rounded-xl border border-transparent hover:border-gray-200 focus:border-primary-500 transition-colors min-w-[200px]"
        >
          <Calendar size={18} className="text-gray-400" />
          <span className="text-sm">{getDateRangeText()}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
        </button>

        {showDatePicker && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronDown size={16} className="rotate-90 text-gray-600" />
              </button>
              <h3 className="font-bold text-gray-900">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronDown size={16} className="-rotate-90 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-xs font-bold text-gray-500 text-center py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return <div key={idx} className="aspect-square" />;
                }
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = date < today;
                const isSelected = isDateSelected(date);
                const isInRange = isDateInRange(date);
                const isHovered = hoveredDate && date.getTime() === hoveredDate.getTime();
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDateClick(date)}
                    onMouseEnter={() => setHoveredDate(date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    disabled={isPast}
                    className={`
                      aspect-square text-sm font-medium rounded-lg transition-colors
                      ${isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}
                      ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : ''}
                      ${isInRange && !isSelected ? 'bg-primary-50 text-primary-700' : ''}
                      ${isHovered && dateRange.start && !dateRange.end && date > dateRange.start ? 'bg-primary-100' : ''}
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

      {/* Guests Picker */}
      <div className="relative" ref={guestsPickerRef}>
        <button
          type="button"
          onClick={() => {
            setShowGuestsPicker(!showGuestsPicker);
            setShowDatePicker(false);
          }}
          className="flex items-center gap-2 px-4 py-3 text-gray-700 font-medium rounded-xl border border-transparent hover:border-gray-200 focus:border-primary-500 transition-colors min-w-[180px]"
        >
          <Users size={18} className="text-gray-400" />
          <span className="text-sm">{getGuestsText()}</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showGuestsPicker ? 'rotate-180' : ''}`} />
        </button>

        {showGuestsPicker && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[240px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">Adultos</div>
                  <div className="text-xs text-gray-500">13 anos ou mais</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuests(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors"
                  >
                    <Minus size={14} className="text-gray-600" />
                  </button>
                  <span className="font-bold text-gray-900 w-8 text-center">{guests.adults}</span>
                  <button
                    type="button"
                    onClick={() => setGuests(prev => ({ ...prev, adults: prev.adults + 1 }))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors"
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
                      onClick={() => setGuests(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors"
                    >
                      <Minus size={14} className="text-gray-600" />
                    </button>
                    <span className="font-bold text-gray-900 w-8 text-center">{guests.children}</span>
                    <button
                      type="button"
                      onClick={() => setGuests(prev => ({ ...prev, children: prev.children + 1 }))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary-500 transition-colors"
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
        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl transition-colors shadow-lg shadow-primary-500/30 font-bold flex items-center justify-center gap-2"
      >
        <Search size={20} />
        <span className="hidden md:inline">Pesquisar</span>
      </button>
    </div>
  );
};

export default AdvancedSearchBar;

