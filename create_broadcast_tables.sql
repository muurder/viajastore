-- =====================================================
-- SQL Migration: Sistema de Broadcast (Comunicados)
-- =====================================================
-- Este script cria as tabelas necessárias para o sistema
-- de comunicados (broadcast) no ViajaStore
-- =====================================================

-- 1. Tabela: broadcast_messages
-- Armazena as mensagens enviadas pelos administradores
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT NOT NULL CHECK (target_role IN ('ALL', 'AGENCY', 'CLIENT', 'GUIDE')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT broadcast_messages_title_length CHECK (char_length(title) > 0 AND char_length(title) <= 200),
    CONSTRAINT broadcast_messages_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 5000)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_by ON broadcast_messages(created_by);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target_role ON broadcast_messages(target_role);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at ON broadcast_messages(created_at DESC);

-- Comentários
COMMENT ON TABLE broadcast_messages IS 'Armazena os comunicados enviados pelos administradores';
COMMENT ON COLUMN broadcast_messages.target_role IS 'Público-alvo: ALL (todos), AGENCY (agências), CLIENT (clientes), GUIDE (guias)';
COMMENT ON COLUMN broadcast_messages.created_by IS 'ID do administrador que criou o comunicado';

-- 2. Tabela: broadcast_interactions
-- Armazena as interações dos usuários com os comunicados
CREATE TABLE IF NOT EXISTS broadcast_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NULL,
    liked_at TIMESTAMPTZ NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Chave composta única: um usuário só pode ter uma interação por comunicado
    CONSTRAINT broadcast_interactions_unique UNIQUE (broadcast_id, user_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_broadcast_interactions_broadcast_id ON broadcast_interactions(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_interactions_user_id ON broadcast_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_interactions_read_at ON broadcast_interactions(read_at) WHERE read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_interactions_liked_at ON broadcast_interactions(liked_at) WHERE liked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_interactions_is_deleted ON broadcast_interactions(is_deleted) WHERE is_deleted = TRUE;

-- Comentários
COMMENT ON TABLE broadcast_interactions IS 'Armazena as interações dos usuários com os comunicados (leitura, like, exclusão)';
COMMENT ON COLUMN broadcast_interactions.read_at IS 'Data/hora em que o usuário leu o comunicado (NULL = não lido)';
COMMENT ON COLUMN broadcast_interactions.liked_at IS 'Data/hora em que o usuário curtiu o comunicado (NULL = não curtido)';
COMMENT ON COLUMN broadcast_interactions.is_deleted IS 'Soft delete: TRUE = usuário removeu a notificação, FALSE = ativa';

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas para broadcast_messages
-- Administradores podem ver todos os comunicados
CREATE POLICY "Admins can view all broadcasts"
    ON broadcast_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Administradores podem criar comunicados
CREATE POLICY "Admins can create broadcasts"
    ON broadcast_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Usuários podem ver comunicados direcionados a eles
CREATE POLICY "Users can view relevant broadcasts"
    ON broadcast_messages FOR SELECT
    USING (
        target_role = 'ALL' OR
        (target_role = 'CLIENT' AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'CLIENT'
        )) OR
        (target_role = 'AGENCY' AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'AGENCY'
        )) OR
        (target_role = 'GUIDE' AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN agencies a ON a.user_id = p.id
            WHERE p.id = auth.uid()
            AND p.role = 'AGENCY'
            AND a.is_guide = TRUE
        ))
    );

-- Políticas para broadcast_interactions
-- Usuários podem ver suas próprias interações
CREATE POLICY "Users can view their own interactions"
    ON broadcast_interactions FOR SELECT
    USING (user_id = auth.uid());

-- Administradores podem ver todas as interações
CREATE POLICY "Admins can view all interactions"
    ON broadcast_interactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'ADMIN'
        )
    );

-- Usuários podem criar/atualizar suas próprias interações
CREATE POLICY "Users can manage their own interactions"
    ON broadcast_interactions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Funções auxiliares (opcional, para facilitar queries)
-- =====================================================

-- Função para contar leituras de um comunicado
CREATE OR REPLACE FUNCTION get_broadcast_read_count(broadcast_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM broadcast_interactions
        WHERE broadcast_id = broadcast_uuid
        AND read_at IS NOT NULL
        AND is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar likes de um comunicado
CREATE OR REPLACE FUNCTION get_broadcast_liked_count(broadcast_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM broadcast_interactions
        WHERE broadcast_id = broadcast_uuid
        AND liked_at IS NOT NULL
        AND is_deleted = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Verificação: Verificar se as tabelas foram criadas
-- =====================================================
-- Execute estas queries para verificar:
-- 
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('broadcast_messages', 'broadcast_interactions')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT tablename, indexname
-- FROM pg_indexes
-- WHERE tablename IN ('broadcast_messages', 'broadcast_interactions');
--
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE tablename IN ('broadcast_messages', 'broadcast_interactions');

-- =====================================================
-- Notas:
-- =====================================================
-- 1. As tabelas usam UUID como chave primária para melhor escalabilidade
-- 2. RLS está habilitado para segurança em nível de linha
-- 3. Soft delete implementado via is_deleted (não apaga fisicamente)
-- 4. Índices criados para otimizar queries frequentes
-- 5. Constraints garantem integridade dos dados
-- 6. Funções auxiliares facilitam contagem de métricas
-- =====================================================
