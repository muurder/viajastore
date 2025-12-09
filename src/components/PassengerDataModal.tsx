import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Phone, CreditCard, ArrowRight } from 'lucide-react';
import { PassengerDetail } from '../types';

interface PassengerDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (passengers: PassengerDetail[]) => void;
  passengerCount: number;
  mainPassengerName: string;
  mainPassengerCpf?: string;
  mainPassengerPhone?: string;
  mainPassengerBirthDate?: string;
}

export const PassengerDataModal: React.FC<PassengerDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  passengerCount,
  mainPassengerName,
  mainPassengerCpf,
  mainPassengerPhone,
  mainPassengerBirthDate
}) => {
  const [passengers, setPassengers] = useState<PassengerDetail[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize with main passenger data
      const initialPassengers: PassengerDetail[] = [
        {
          name: mainPassengerName,
          document: mainPassengerCpf || '',
          phone: mainPassengerPhone || '',
          birthDate: mainPassengerBirthDate || ''
        },
        // Add empty forms for additional passengers
        ...Array.from({ length: passengerCount - 1 }, () => ({
          name: '',
          document: '',
          phone: '',
          birthDate: ''
        }))
      ];
      setPassengers(initialPassengers);
      setErrors({});
    }
  }, [isOpen, passengerCount, mainPassengerName, mainPassengerCpf, mainPassengerPhone, mainPassengerBirthDate]);

  const handleInputChange = (index: number, field: keyof PassengerDetail, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
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
      onConfirm(passengers);
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
              Preencha os dados de todos os passageiros ({passengerCount} {passengerCount === 1 ? 'passageiro' : 'passageiros'})
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
            {passengers.map((passenger, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {index === 0 ? 'Passageiro Principal' : `Acompanhante ${index}`}
                    </h3>
                    {index === 0 && (
                      <p className="text-xs text-gray-500">Você (cliente logado)</p>
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
            ))}
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

