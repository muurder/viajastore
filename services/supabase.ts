
import { createClient } from '@supabase/supabase-js';

// ATENÇÃO: Para produção, use variáveis de ambiente: import.meta.env.VITE_SUPABASE_URL
// Coloque aqui suas chaves do painel do Supabase para rodar o script
const supabaseUrl = 'SUA_URL_DO_SUPABASE_AQUI';
const supabaseKey = 'SUA_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseKey);
