/**
 * Script para validar conexão e preparar auditoria RLS
 * 
 * Uso: node scripts/validate-and-prepare-audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validando arquivos de auditoria RLS...\n');

// Verificar se arquivo SQL existe
const sqlFile = path.join(__dirname, '..', 'RLS_SECURITY_AUDIT.sql');
if (!fs.existsSync(sqlFile)) {
  console.error('❌ Arquivo RLS_SECURITY_AUDIT.sql não encontrado!');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
const queries = sqlContent.split(';').filter(q => q.trim().length > 0 && !q.trim().startsWith('--'));

console.log('✅ Arquivo SQL encontrado');
console.log(`📊 Total de queries: ${queries.length}`);
console.log(`📝 Tamanho do arquivo: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

// Verificar seções principais
const sections = [
  'RLS STATUS CHECK',
  'POLICY AUDIT',
  'AGENCIES SECURITY ANALYSIS',
  'TRIPS SECURITY ANALYSIS',
  'BOOKINGS SECURITY ANALYSIS',
  'SECURITY RISKS',
  'SECURITY SUMMARY',
  'FUNCTION SECURITY CHECK'
];

console.log('📋 Seções encontradas:');
sections.forEach(section => {
  if (sqlContent.includes(section)) {
    console.log(`   ✅ ${section}`);
  } else {
    console.log(`   ⚠️  ${section} (não encontrada)`);
  }
});

console.log('\n📋 PRÓXIMOS PASSOS:\n');
console.log('1. Acesse o Supabase Dashboard: https://app.supabase.com');
console.log('2. Selecione seu projeto');
console.log('3. Vá em "SQL Editor" → "New query"');
console.log('4. Copie e cole o conteúdo de RLS_SECURITY_AUDIT.sql');
console.log('5. Execute (Ctrl+Enter ou Cmd+Enter)');
console.log('6. Analise os resultados\n');

console.log('📄 Conteúdo do arquivo está pronto para execução!');
console.log(`   Localização: ${sqlFile}\n`);

// Mostrar preview das primeiras linhas
console.log('📖 Preview (primeiras 30 linhas):');
console.log('─'.repeat(60));
const lines = sqlContent.split('\n').slice(0, 30);
lines.forEach(line => console.log(line));
console.log('─'.repeat(60));
console.log('...\n');

console.log('✅ Validação concluída! Arquivo pronto para execução no Supabase SQL Editor.');

