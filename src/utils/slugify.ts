
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')                   // Separa acentos das letras
    .replace(/[\u0300-\u036f]/g, '')    // Remove os acentos
    .replace(/\s+/g, '-')               // Substitui espaços por hífens
    .replace(/[^\w\-]+/g, '')           // Remove caracteres especiais
    .replace(/\-\-+/g, '-')             // Remove hífens duplicados
    .replace(/^-+/, '')                 // Remove hífens do início
    .replace(/-+$/, '');                // Remove hífens do fim
};
