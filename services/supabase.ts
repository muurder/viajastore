
import { createClient } from '@supabase/supabase-js';

// Tenta pegar do .env (variáveis de ambiente), se não existir, usa um placeholder seguro (com https) para não quebrar a tela branca
// Fix: Cast import.meta to any to avoid TypeScript error regarding 'env' property
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
