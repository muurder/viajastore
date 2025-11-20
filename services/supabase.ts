import { createClient } from '@supabase/supabase-js';

// Access environment variables safely with type assertion to avoid TS errors if types are missing
const env = (import.meta as any).env;

const supabaseUrl = env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);