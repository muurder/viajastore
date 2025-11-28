
import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const env = (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://seu-projeto-id.supabase.co' || !supabaseKey) {
  console.warn(
    '%c[Supabase] AVISO: As credenciais do Supabase parecem inválidas ou padrão.',
    'background: #FEF3C7; color: #92400E; padding: 4px; border-radius: 4px; font-weight: bold;'
  );
  console.warn('Verifique se você criou o arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY reais do seu painel.');
} else {
  console.log(`%c[Supabase] Conectado a: ${supabaseUrl.substring(0, 20)}...`, 'color: #059669');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder'
);
