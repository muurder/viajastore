
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Access environment variables safely
const env = ((import.meta as any) && (import.meta as any).env) ? (import.meta as any).env : {};

const supabaseUrl = env?.VITE_SUPABASE_URL;
const supabaseKey = env?.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

const isPlaceholder =
  !supabaseUrl ||
  supabaseUrl === 'https://seu-projeto-id.supabase.co' ||
  supabaseUrl === 'https://placeholder.supabase.co' ||
  !supabaseKey ||
  supabaseKey === 'placeholder';

if (isPlaceholder) {
  logger.warn('[Supabase] AVISO: As credenciais do Supabase parecem inválidas ou padrão.');
  logger.warn('Verifique se você criou o arquivo .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY reais do seu painel. O app usará dados de exemplo.');
} else {
  logger.info(`[Supabase] Conectado a: ${supabaseUrl.substring(0, 20)}...`);
  supabaseInstance = createClient(supabaseUrl, supabaseKey);
}

export const supabase = supabaseInstance;

export type SupabaseDiagnostics = {
  configured: boolean;
  url: string | null;
  projectRef: string | null;
  anonKeyPresent: boolean;
  anonKeyLength: number | null;
  anonKeySuffix: string | null;
};

function extractProjectRef(url: string): string | null {
  const m = url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  return m?.[1] ?? null;
}

export function getSupabaseDiagnostics(): SupabaseDiagnostics {
  const url = typeof supabaseUrl === 'string' ? supabaseUrl : null;
  const key = typeof supabaseKey === 'string' ? supabaseKey : null;

  return {
    configured: !isPlaceholder,
    url,
    projectRef: url ? extractProjectRef(url) : null,
    anonKeyPresent: Boolean(key),
    anonKeyLength: key ? key.length : null,
    anonKeySuffix: key ? key.slice(-6) : null,
  };
}

export type SupabaseConnectionCheckResult = {
  configured: boolean;
  url: string | null;
  projectRef: string | null;
  auth: { ok: boolean; ms: number; error: string | null };
  db: { ok: boolean; ms: number; table: string; error: string | null };
};

export async function checkSupabaseConnection(table: string = 'trips'): Promise<SupabaseConnectionCheckResult> {
  const diag = getSupabaseDiagnostics();
  const startAuth = performance.now();

  if (!diag.configured || !supabaseUrl || !supabaseKey) {
    return {
      configured: false,
      url: diag.url,
      projectRef: diag.projectRef,
      auth: { ok: false, ms: Math.round(performance.now() - startAuth), error: 'Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' },
      db: { ok: false, ms: 0, table, error: 'Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' },
    };
  }

  // Se por algum motivo `supabase` estiver null, cria um client temporário para o diagnóstico.
  const client = supabase ?? createClient(supabaseUrl, supabaseKey);

  let authOk = false;
  let authErr: string | null = null;
  try {
    const { error } = await client.auth.getSession();
    authOk = !error;
    authErr = error ? `${error.name}: ${error.message}` : null;
  } catch (e: any) {
    authOk = false;
    authErr = e?.message ? String(e.message) : 'Erro desconhecido no auth.getSession()';
  }
  const authMs = Math.round(performance.now() - startAuth);

  const startDb = performance.now();
  let dbOk = false;
  let dbErr: string | null = null;
  try {
    const { error } = await client.from(table).select('id').limit(1);
    dbOk = !error;
    dbErr = error ? `${error.code ?? 'ERR'}: ${error.message}` : null;
  } catch (e: any) {
    dbOk = false;
    dbErr = e?.message ? String(e.message) : 'Erro desconhecido no select()';
  }
  const dbMs = Math.round(performance.now() - startDb);

  return {
    configured: true,
    url: diag.url,
    projectRef: diag.projectRef,
    auth: { ok: authOk, ms: authMs, error: authErr },
    db: { ok: dbOk, ms: dbMs, table, error: dbErr },
  };
}
