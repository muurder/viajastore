/**
 * Script para executar auditoria RLS no Supabase
 * 
 * Uso:
 *   npx tsx scripts/run-rls-audit.ts
 * 
 * Ou com Node:
 *   npm run build
 *   node dist/scripts/run-rls-audit.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('');
  console.error('Configure no arquivo .env:');
  console.error('  VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=sua-chave-anon');
  console.error('');
  console.error('Ou use a SERVICE_ROLE_KEY para acesso completo:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key');
  process.exit(1);
}

// Criar cliente Supabase
// Nota: Para queries de auditoria, precisamos usar service_role_key ou fazer via SQL Editor
// O anon_key tem limitações de RLS, então vamos usar service_role se disponível
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Ler arquivo SQL
const sqlFile = path.join(__dirname, '..', 'RLS_SECURITY_AUDIT.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

// Dividir em queries individuais (separadas por ;)
const queries = sqlContent
  .split(';')
  .map(q => q.trim())
  .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));

console.log('🔍 Iniciando Auditoria RLS...\n');
console.log(`📊 Total de queries: ${queries.length}\n`);

// Executar queries
async function runAudit() {
  const results: any[] = [];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    
    // Pular comentários e seções
    if (query.includes('--') || query.length < 10) continue;
    
    try {
      console.log(`\n📋 Executando query ${i + 1}/${queries.length}...`);
      
      // Executar via RPC ou SQL direto
      // Nota: Supabase JS client não suporta SQL arbitrário diretamente
      // Precisamos usar o SQL Editor ou criar uma função RPC
      
      // Para queries SELECT, podemos tentar usar .rpc() se houver função
      // Mas o melhor é executar via SQL Editor do Supabase
      
      console.log('⚠️  Nota: Queries SQL complexas precisam ser executadas via SQL Editor do Supabase.');
      console.log('   Acesse: https://app.supabase.com/project/[seu-projeto]/sql/new');
      console.log('   E cole o conteúdo do arquivo RLS_SECURITY_AUDIT.sql\n');
      
    } catch (error: any) {
      console.error(`❌ Erro na query ${i + 1}:`, error.message);
    }
  }
  
  console.log('\n✅ Auditoria concluída!');
  console.log('\n📝 IMPORTANTE:');
  console.log('   Para executar as queries de auditoria, você precisa:');
  console.log('   1. Acessar o Supabase Dashboard');
  console.log('   2. Ir em SQL Editor → New Query');
  console.log('   3. Copiar e colar o conteúdo de RLS_SECURITY_AUDIT.sql');
  console.log('   4. Executar (Ctrl+Enter ou Run)');
  console.log('\n   Ou use o script alternativo: scripts/run-rls-audit-direct.ts');
}

// Alternativa: Executar queries específicas via Supabase client
async function runDirectQueries() {
  console.log('\n🔍 Executando queries diretas via Supabase Client...\n');
  
  try {
    // Query 1: Verificar RLS Status
    console.log('1️⃣ Verificando status RLS...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('agencies', 'trips', 'bookings')
        ORDER BY tablename;
      `
    });
    
    if (rlsError) {
      console.log('⚠️  Não foi possível executar via RPC. Use o SQL Editor do Supabase.');
      console.log('   Erro:', rlsError.message);
    } else {
      console.log('✅ Resultado:', rlsStatus);
    }
    
  } catch (error: any) {
    console.log('⚠️  Execução direta não disponível. Use o SQL Editor do Supabase.');
    console.log('   Erro:', error.message);
  }
}

// Executar
runAudit().then(() => {
  runDirectQueries();
}).catch(console.error);

