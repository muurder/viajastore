// Formatters utility functions

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Data n/a';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Data Inválida';
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data Erro';
  }
};

export const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Data n/a';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Data Inválida';
    return d.toLocaleString('pt-BR');
  } catch (e) {
    return 'Data Erro';
  }
};

export const formatPhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

export const formatCPF = (cpf: string | undefined | null): string => {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
};

