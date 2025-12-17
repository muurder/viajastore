-- =====================================================
-- FIX: Políticas RLS para Sistema de Broadcast
-- =====================================================
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Remover políticas antigas (caso existam)
DROP POLICY IF EXISTS "Admins can view all broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Admins can create broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Users can view relevant broadcasts" ON broadcast_messages;
DROP POLICY IF EXISTS "Users can view their own interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON broadcast_interactions;
DROP POLICY IF EXISTS "Users can manage their own interactions" ON broadcast_interactions;

-- 2. Criar novas políticas para broadcast_messages

-- Admins podem fazer TUDO (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins full access to broadcasts"
    ON broadcast_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Clientes podem ver comunicados direcionados a eles
CREATE POLICY "Clients can view their broadcasts"
    ON broadcast_messages FOR SELECT
    USING (
        target_role = 'ALL' OR
        (target_role = 'CLIENT' AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'CLIENT'
        ))
    );

-- Agências podem ver comunicados direcionados a elas
CREATE POLICY "Agencies can view their broadcasts"
    ON broadcast_messages FOR SELECT
    USING (
        target_role = 'ALL' OR
        (target_role = 'AGENCY' AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'AGENCY'
        ))
    );

-- Guias podem ver comunicados direcionados a eles
CREATE POLICY "Guides can view their broadcasts"
    ON broadcast_messages FOR SELECT
    USING (
        target_role = 'ALL' OR
        (target_role = 'GUIDE' AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN agencies a ON a.user_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'AGENCY'
            AND a.is_guide = TRUE
        )) OR
        (target_role = 'AGENCY' AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN agencies a ON a.user_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'AGENCY'
            AND a.is_guide = TRUE
        ))
    );

-- 3. Criar novas políticas para broadcast_interactions

-- Usuários podem gerenciar suas próprias interações
CREATE POLICY "Users manage own interactions"
    ON broadcast_interactions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins podem ver todas as interações
CREATE POLICY "Admins view all interactions"
    ON broadcast_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- =====================================================
-- Verificação
-- =====================================================
-- Após executar, verifique as políticas com:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('broadcast_messages', 'broadcast_interactions');
