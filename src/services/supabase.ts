
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Access environment variables safely
const env = (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (!supabaseUrl || supabaseUrl === 'https://seu-projeto-id.supabase.co' || supabaseUrl === 'https://placeholder.supabase.co' || !supabaseKey || supabaseKey === 'placeholder') {
  logger.warn('[Supabase] AVISO: As credenciais do Supabase parecem inválidas ou padrão.');
  logger.warn('Verifique se você criou o arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY reais do seu painel. O app usará dados de exemplo.');
} else {
  logger.info(`[Supabase] Conectado a: ${supabaseUrl.substring(0, 20)}...`);
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
}

export const supabase = supabaseInstance;
