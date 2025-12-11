import { PassengerDetail, PassengerConfig } from '../types';

/**
 * Calcula a idade a partir da data de nascimento
 */
export const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Determina se um passageiro é criança baseado na idade
 * Usa a idade limite definida pela agência (padrão: 12 anos)
 */
export const isChild = (birthDate?: string, age?: number, childAgeLimit: number = 12): boolean => {
  if (!birthDate && age === undefined) return false;
  const calculatedAge = age !== undefined ? age : calculateAge(birthDate!);
  return calculatedAge < childAgeLimit;
};

/**
 * Calcula o tipo do passageiro (adult ou child) baseado na data de nascimento
 * Usa a idade limite definida pela agência
 */
export const calculatePassengerType = (passenger: PassengerDetail, childAgeLimit: number = 12): 'adult' | 'child' => {
  if (passenger.type) return passenger.type; // Se já tiver tipo definido, usa ele
  
  if (!passenger.birthDate) return 'adult'; // Se não tiver data, assume adulto
  
  const age = calculateAge(passenger.birthDate);
  return age < childAgeLimit ? 'child' : 'adult';
};

/**
 * Atualiza o tipo e idade do passageiro baseado na data de nascimento
 * Usa a idade limite definida pela agência
 */
export const updatePassengerType = (passenger: PassengerDetail, childAgeLimit: number = 12): PassengerDetail => {
  if (!passenger.birthDate) {
    return { ...passenger, type: 'adult' };
  }
  
  const age = calculateAge(passenger.birthDate);
  const type = age < childAgeLimit ? 'child' : 'adult';
  
  return { ...passenger, type, age };
};

/**
 * Obtém a configuração de passageiros padrão
 */
export const getDefaultPassengerConfig = (): PassengerConfig => ({
  allowChildren: true,
  allowSeniors: true,
  childAgeLimit: 12,
  allowLapChild: false,
  childPriceMultiplier: 0.7
});

