import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Phone, CreditCard, ArrowRight, Baby } from 'lucide-react';
import { PassengerDetail, PassengerConfig } from '../types';
import { updatePassengerType, calculatePassengerType, getDefaultPassengerConfig } from '../utils/passengerUtils';

interface PassengerDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (passengers: PassengerDetail[]) => void;
  passengerCount: number;
  adultsCount?: number;
  childrenCount?: number;
  mainPassengerName: string;
  mainPassengerCpf?: string;
  mainPassengerPhone?: string;
  mainPassengerBirthDate?: string;
  passengerConfig?: PassengerConfig; // Configurações da viagem
}

export const PassengerDataModal: React.FC<PassengerDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  passengerCount,
  adultsCount = 1,
  childrenCount = 0,
  mainPassengerName,
  mainPassengerCpf,
  mainPassengerPhone,
  mainPassengerBirthDate,
  passengerConfig
}) => {
  const config = passengerConfig || getDefaultPassengerConfig();
  const [passengers, setPassengers] = useState<PassengerDetail[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize with main passenger data (always first, always adult)
      const initialPassengers: PassengerDetail[] = [
        {
          name: mainPassengerName,
          document: mainPassengerCpf || '',
          phone: mainPassengerPhone || '',
          birthDate: mainPassengerBirthDate || '',
          type: 'adult'
        },
        // Add adults (excluding main passenger)
        ...Array.from({ length: adultsCount - 1 }, () => ({
          name: '',
          document: '',
          phone: '',
          birthDate: '',
          type: 'adult' as const
        })),
        // Add children
        ...Array.from({ length: childrenCount }, () => ({
          name: '',
          document: '',
          phone: '',
          birthDate: '',
          type: 'child' as const
        }))
      ];
      setPassengers(initialPassengers);
      setErrors({});
    }
  }, [isOpen, passengerCount, adultsCount, childrenCount, mainPassengerName, mainPassengerCpf, mainPassengerPhone, mainPassengerBirthDate]);

  const handleInputChange = (index: number, field: keyof PassengerDetail, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    
    // If birthDate changed, recalculate type and age using trip's age limit
    if (field === 'birthDate' && value) {
      updated[index] = updatePassengerType(updated[index], config.childAgeLimit);
    }
    
    setPassengers(updated);
    
    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<number, string> = {};
    
    passengers.forEach((passenger, index) => {
      if (!passenger.name.trim()) {
        newErrors[index] = 'Nome completo é obrigatório';
        return;
      }
      if (index === 0 && !passenger.document?.trim()) {
        newErrors[index] = 'CPF do passageiro principal é obrigatório';
        return;
      }
      if (index > 0 && passenger.document && passenger.document.length < 11) {
        newErrors[index] = 'CPF inválido';
        return;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Ensure all passengers have their type calculated before submitting
      const passengersWithTypes = passengers.map(p => {
        if (p.birthDate && !p.type) {
          return updatePassengerType(p, config.childAgeLimit);
        }
        return p;
      });
      onConfirm(passengersWithTypes);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s]">
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl animate-[scaleIn_0.3s] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Dados dos Passageiros</h2>
            <p className="text-primary-100 text-sm mt-1">
              Preencha os dados de todos os passageiros ({adultsCount} {adultsCount === 1 ? 'adulto' : 'adultos'}
              {childrenCount > 0 && ` + ${childrenCount} ${childrenCount === 1 ? 'criança' : 'crianças'}`})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {passengers.map((passenger, index) => {
              const passengerType = calculatePassengerType(passenger, config.childAgeLimit);
              const isChild = passengerType === 'child';
              const isMain = index === 0;
              
              return (
              <div key={index} className={`rounded-xl p-6 border-2 ${
                isChild 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    isChild 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-primary-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">
                        {isMain ? 'Passageiro Principal' : `Acompanhante ${index}`}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isChild
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isChild ? (
                          <>
                            <Baby size={12} />
                            Criança
                          </>
                        ) : (
                          <>
                            <User size={12} />
                            Adulto
                          </>
                        )}
                      </span>
                      {passenger.age !== undefined && (
                        <span className="text-xs text-gray-500">
                          ({passenger.age} {passenger.age === 1 ? 'ano' : 'anos'})
                        </span>
                      )}
                    </div>
                    {isMain && (
                      <p className="text-xs text-gray-500 mt-0.5">Você (cliente logado)</p>
                    )}
                    {!isMain && passenger.type && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isChild ? 'Menor de 12 anos' : '12 anos ou mais'}
                      </p>
                    )}
                  </div>
                </div>

                {errors[index] && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {errors[index]}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={passenger.name}
                        onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="Nome completo do passageiro"
                        required
                        disabled={index === 0}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      CPF {index === 0 ? '*' : ''}
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={passenger.document || ''}
                        onChange={(e) => {
                          const formatted = formatCPF(e.target.value);
                          handleInputChange(index, 'document', formatted);
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        required={index === 0}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Data de Nascimento
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="date"
                        value={passenger.birthDate || ''}
                        onChange={(e) => handleInputChange(index, 'birthDate', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      />
                    </div>
                    {passenger.birthDate && passenger.age !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        {passenger.age < 12 
                          ? `✓ Classificado como criança (${passenger.age} ${passenger.age === 1 ? 'ano' : 'anos'})`
                          : `✓ Classificado como adulto (${passenger.age} ${passenger.age === 1 ? 'ano' : 'anos'})`
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={passenger.phone || ''}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          handleInputChange(index, 'phone', formatted);
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              Confirmar e Reservar
              <ArrowRight size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

