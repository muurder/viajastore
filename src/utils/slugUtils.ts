import { slugify } from './slugify';
import { supabase } from '../services/supabase';

/**
 * Valida se um slug está no formato correto
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim() === '') {
    return { valid: false, error: 'Slug não pode estar vazio' };
  }
  
  // Slug deve conter apenas letras minúsculas, números e hífens
  // Não pode começar ou terminar com hífen
  // Não pode ter hífens duplicados
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  if (!slugPattern.test(slug)) {
    return { 
      valid: false, 
      error: 'Slug deve conter apenas letras minúsculas, números e hífens' 
    };
  }
  
  if (slug.length < 3) {
    return { valid: false, error: 'Slug deve ter pelo menos 3 caracteres' };
  }
  
  if (slug.length > 100) {
    return { valid: false, error: 'Slug deve ter no máximo 100 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Gera um slug único baseado no nome/título
 * Verifica se já existe no banco e adiciona sufixo numérico se necessário
 */
export async function generateUniqueSlug(
  baseSlug: string, 
  table: 'agencies' | 'trips', 
  excludeId?: string
): Promise<string> {
  if (!supabase) {
    console.warn('[slugUtils] Supabase não configurado, retornando slug base');
    return baseSlug;
  }

  let slug = baseSlug;
  let counter = 1;
  const maxAttempts = 100; // Prevenir loop infinito
  
  while (counter <= maxAttempts) {
    try {
      // Verificar se slug já existe
      const query = supabase
        .from(table)
        .select('id')
        .eq('slug', slug);
      
      // Se estamos editando, excluir o próprio registro
      if (excludeId) {
        query.neq('id', excludeId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (é o que queremos)
        console.error(`[slugUtils] Erro ao verificar slug único:`, error);
        // Em caso de erro, retornar slug com contador para evitar duplicatas
        return counter > 1 ? `${baseSlug}-${counter}` : baseSlug;
      }
      
      // Se não encontrou nenhum registro, o slug é único
      if (!data) {
        return slug;
      }
      
      // Slug existe, tentar com sufixo numérico
      slug = `${baseSlug}-${counter}`;
      counter++;
    } catch (error) {
      console.error(`[slugUtils] Erro ao gerar slug único:`, error);
      // Em caso de erro, retornar slug com contador
      return counter > 1 ? `${baseSlug}-${counter}` : baseSlug;
    }
  }
  
  // Se chegou aqui, não conseguiu gerar slug único após muitas tentativas
  console.warn(`[slugUtils] Não foi possível gerar slug único após ${maxAttempts} tentativas`);
  return `${baseSlug}-${Date.now()}`;
}

/**
 * Gera slug baseado no nome/título e valida
 */
export function generateSlugFromName(name: string): string {
  if (!name || name.trim() === '') {
    return '';
  }
  return slugify(name);
}

/**
 * Normaliza e valida um slug fornecido pelo usuário
 * Se inválido, gera um novo baseado no nome
 */
export function normalizeSlug(slug: string | undefined, fallbackName: string): string {
  // Se slug fornecido e válido, usar
  if (slug && slug.trim()) {
    const validation = validateSlug(slug.trim());
    if (validation.valid) {
      return slug.trim();
    }
  }
  
  // Caso contrário, gerar do nome
  return generateSlugFromName(fallbackName);
}

