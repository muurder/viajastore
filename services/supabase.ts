
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Access environment variables safely
const env = (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY;

// Use a let to hold the client, which can be null if config is missing
let supabase: SupabaseClient | null = null;

if (!supabaseUrl || supabaseUrl.includes('seu-projeto-id') || !supabaseKey || supabaseKey.includes('placeholder')) {
  console.warn(
    '%c[Supabase] AVISO: Credenciais não configuradas. A aplicação usará dados de exemplo (mock).',
    'background: #FEF3C7; color: #92400E; padding: 4px; border-radius: 4px; font-weight: bold;'
  );
  console.warn('Para conectar ao Supabase, crie um arquivo .env na raiz com as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
} else {
  console.log(`%c[Supabase] Conectado a: ${supabaseUrl.substring(0, 20)}...`, 'color: #059669');
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Export the potentially null client
export { supabase };
