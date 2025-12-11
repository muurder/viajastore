-- =====================================================
-- RLS SECURITY AUDIT - VIAJASTORE
-- =====================================================
-- Este script audita as políticas RLS (Row Level Security)
-- para as tabelas críticas: agencies, trips, bookings
-- =====================================================
-- Execute no Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: Verificar se RLS está HABILITADO
-- =====================================================
SELECT 
  'RLS STATUS CHECK' as audit_section,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS ATIVO'
    ELSE '❌ RLS DESATIVADO - CRÍTICO!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'trips', 'bookings')
ORDER BY tablename;

-- =====================================================
-- PART 2: Listar TODAS as políticas RLS para tabelas críticas
-- =====================================================
SELECT 
  'POLICY AUDIT' as audit_section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command_type,
  CASE cmd
    WHEN 'SELECT' THEN '🔍 READ'
    WHEN 'INSERT' THEN '➕ CREATE'
    WHEN 'UPDATE' THEN '✏️ MODIFY'
    WHEN 'DELETE' THEN '🗑️ REMOVE'
    ELSE cmd
  END as command_label,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'trips', 'bookings')
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- PART 3: Análise de Segurança por Tabela
-- =====================================================

-- AGENCIES: Verificar isolamento
SELECT 
  'AGENCIES SECURITY ANALYSIS' as audit_section,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%user_id = (SELECT auth.uid())%' THEN '✅ Isolamento: Agências só veem próprios dados'
    WHEN cmd = 'SELECT' AND qual LIKE '%is_active = true%' THEN '✅ Público: Pode ver agências ativas'
    WHEN cmd = 'SELECT' AND qual LIKE '%is_admin()%' THEN '✅ Admin: Acesso total'
    WHEN cmd IN ('INSERT', 'UPDATE') AND (qual LIKE '%user_id = (SELECT auth.uid())%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Apenas dono ou admin'
    WHEN cmd = 'DELETE' AND qual LIKE '%is_admin()%' THEN '✅ Restritivo: Apenas admin pode deletar'
    ELSE '⚠️ REVISAR: Política pode ser permissiva demais'
  END as security_assessment,
  qual as policy_logic
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'agencies'
ORDER BY cmd;

-- TRIPS: Verificar isolamento
SELECT 
  'TRIPS SECURITY ANALYSIS' as audit_section,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%agency_id IN%' AND qual LIKE '%user_id = (SELECT auth.uid())%' THEN '✅ Isolamento: Agências só veem próprias viagens'
    WHEN cmd = 'SELECT' AND qual LIKE '%is_active = true%' THEN '✅ Público: Pode ver viagens ativas'
    WHEN cmd = 'SELECT' AND qual LIKE '%is_admin()%' THEN '✅ Admin: Acesso total'
    WHEN cmd IN ('INSERT', 'UPDATE') AND (qual LIKE '%agency_id IN%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Apenas agência dona ou admin'
    WHEN cmd = 'DELETE' AND (qual LIKE '%agency_id IN%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Apenas agência dona ou admin'
    ELSE '⚠️ REVISAR: Política pode ser permissiva demais'
  END as security_assessment,
  qual as policy_logic
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trips'
ORDER BY cmd;

-- BOOKINGS: Verificar isolamento
SELECT 
  'BOOKINGS SECURITY ANALYSIS' as audit_section,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%client_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Isolamento: Clientes veem próprias reservas'
    WHEN cmd = 'SELECT' AND qual LIKE '%trip_id IN%' AND qual LIKE '%agency_id IN%' THEN '✅ Isolamento: Agências veem reservas de suas viagens'
    WHEN cmd = 'SELECT' AND qual LIKE '%is_admin()%' THEN '✅ Admin: Acesso total'
    WHEN cmd = 'INSERT' AND (qual LIKE '%client_id%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Apenas cliente ou admin pode criar'
    WHEN cmd = 'UPDATE' AND (qual LIKE '%client_id%' OR qual LIKE '%trip_id IN%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Cliente, agência dona ou admin'
    WHEN cmd = 'DELETE' AND (qual LIKE '%client_id%' OR qual LIKE '%is_admin()%') THEN '✅ Restritivo: Cliente ou admin'
    ELSE '⚠️ REVISAR: Política pode ser permissiva demais'
  END as security_assessment,
  qual as policy_logic
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'bookings'
ORDER BY cmd;

-- =====================================================
-- PART 4: Verificar Políticas Potencialmente Perigosas
-- =====================================================
SELECT 
  'SECURITY RISKS' as audit_section,
  tablename,
  policyname,
  cmd,
  '⚠️ RISCO: Política muito permissiva' as risk_level,
  qual as policy_logic
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'trips', 'bookings')
  AND (
    -- Políticas que permitem acesso sem verificação de propriedade
    (cmd IN ('UPDATE', 'DELETE') AND qual NOT LIKE '%auth.uid()%' AND qual NOT LIKE '%is_admin()%')
    OR
    -- Políticas SELECT sem filtro adequado (exceto públicas)
    (cmd = 'SELECT' AND qual LIKE '%true%' AND qual NOT LIKE '%is_active%' AND qual NOT LIKE '%is_admin()%')
  )
ORDER BY tablename, cmd;

-- =====================================================
-- PART 5: Resumo de Segurança
-- =====================================================
SELECT 
  'SECURITY SUMMARY' as audit_section,
  tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') > 0 
     AND COUNT(*) FILTER (WHERE cmd = 'INSERT') > 0
     AND COUNT(*) FILTER (WHERE cmd = 'UPDATE') > 0
     AND COUNT(*) FILTER (WHERE cmd = 'DELETE') > 0
    THEN '✅ Todas as operações protegidas'
    ELSE '⚠️ Faltam políticas para algumas operações'
  END as coverage_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('agencies', 'trips', 'bookings')
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- PART 6: Verificar função is_admin() existe e é segura
-- =====================================================
SELECT 
  'FUNCTION SECURITY CHECK' as audit_section,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition,
  CASE 
    WHEN p.prosecdef = true THEN '✅ SECURITY DEFINER (correto)'
    ELSE '⚠️ SECURITY INVOKER (pode ser vulnerável)'
  END as security_type,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%' THEN '✅ Função protegida'
    ELSE '❌ Função não usa SECURITY DEFINER'
  END as security_assessment
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_admin';

-- =====================================================
-- FIM DA AUDITORIA
-- =====================================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- 
-- ✅ VERDE: Política segura e adequada
-- ⚠️ AMARELO: Revisar política (pode ser permissiva)
-- ❌ VERMELHO: Problema crítico de segurança
-- 
-- CRITÉRIOS DE APROVAÇÃO:
-- 1. RLS deve estar ATIVO em todas as tabelas críticas
-- 2. SELECT deve ter isolamento (agências só veem próprios dados)
-- 3. INSERT/UPDATE devem ser restritivos (apenas dono ou admin)
-- 4. DELETE deve ser muito restritivo (preferencialmente apenas admin)
-- 5. Função is_admin() deve usar SECURITY DEFINER
-- =====================================================

