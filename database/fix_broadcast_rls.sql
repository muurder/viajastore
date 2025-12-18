-- =====================================================
-- FIX DEFINITIVO: Políticas RLS para Sistema de Broadcast
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Admins full access to broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Clients can view their broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Agencies can view their broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Guides can view their broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Admins can view all broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Admins can create broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Users can view relevant broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Users manage own interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Admins view all interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Users can view their own interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Users can manage their own interactions" ON broadcast_interactions;

-- 2. Verificar se as tabelas existem (criar se não existirem)
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_role VARCHAR(50) NOT NULL DEFAULT 'ALL',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(broadcast_id, user_id)
);

-- 3. Habilitar RLS (se ainda não estiver habilitado)
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_interactions ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICA SIMPLIFICADA para broadcast_messages

-- Qualquer usuário autenticado pode visualizar (SELECT) comunicados
CREATE POLICY "Authenticated users can view broadcasts"
    ON broadcast_messages FOR SELECT
    TO authenticated
    USING (true);

-- Qualquer usuário autenticado pode criar (INSERT) comunicados  
-- A validação de role é feita no código
CREATE POLICY "Authenticated users can insert broadcasts"
    ON broadcast_messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Qualquer usuário autenticado pode atualizar seu próprio comunicado
CREATE POLICY "Users can update own broadcasts"
    ON broadcast_messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

-- Qualquer usuário autenticado pode deletar seu próprio comunicado
CREATE POLICY "Users can delete own broadcasts"
    ON broadcast_messages FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);

-- 5. POLÍTICA SIMPLIFICADA para broadcast_interactions

-- Usuários podem ver todas as interações (para contagem de likes/reads)
CREATE POLICY "Users can view all interactions"
    ON broadcast_interactions FOR SELECT
    TO authenticated
    USING (true);

-- Usuários podem criar suas próprias interações
CREATE POLICY "Users can create own interactions"
    ON broadcast_interactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias interações
CREATE POLICY "Users can update own interactions"
    ON broadcast_interactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias interações
CREATE POLICY "Users can delete own interactions"
    ON broadcast_interactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- Verificação
-- =====================================================
-- Após executar, verifique as políticas com:
SELECT schemaname, tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('broadcast_messages', 'broadcast_interactions')
ORDER BY tablename, policyname;
