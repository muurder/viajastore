-- =====================================================
-- SQL Migration: Adicionar coluna deleted_at para Soft Delete
-- =====================================================
-- Este script adiciona a coluna deleted_at nas tabelas necessárias
-- para implementar o sistema de lixeira (soft delete)
-- =====================================================

-- 1. Adicionar deleted_at na tabela profiles (usuários/clientes)
-- Verifica se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN deleted_at TIMESTAMPTZ NULL;
        
        COMMENT ON COLUMN profiles.deleted_at IS 'Data de exclusão (soft delete). NULL = ativo, preenchido = arquivado na lixeira';
    END IF;
END $$;

-- 2. Adicionar deleted_at na tabela agencies (agências)
-- Verifica se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agencies' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE agencies 
        ADD COLUMN deleted_at TIMESTAMPTZ NULL;
        
        COMMENT ON COLUMN agencies.deleted_at IS 'Data de exclusão (soft delete). NULL = ativo, preenchido = arquivado na lixeira';
    END IF;
END $$;

-- 3. Adicionar deleted_at na tabela trips (viagens) - opcional, mas recomendado
-- Verifica se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE trips 
        ADD COLUMN deleted_at TIMESTAMPTZ NULL;
        
        COMMENT ON COLUMN trips.deleted_at IS 'Data de exclusão (soft delete). NULL = ativo, preenchido = arquivado na lixeira';
    END IF;
END $$;

-- 4. Criar índices para melhorar performance das queries de lixeira
-- Índice para profiles.deleted_at
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- Índice para agencies.deleted_at
CREATE INDEX IF NOT EXISTS idx_agencies_deleted_at ON agencies(deleted_at) WHERE deleted_at IS NOT NULL;

-- Índice para trips.deleted_at
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- Verificação: Verificar se as colunas foram criadas
-- =====================================================
-- Execute estas queries para verificar:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name IN ('profiles', 'agencies', 'trips') 
-- AND column_name = 'deleted_at';

-- =====================================================
-- Notas:
-- =====================================================
-- 1. As colunas são NULL por padrão (registros ativos)
-- 2. Quando um registro é "arquivado", deleted_at recebe a data atual
-- 3. Quando um registro é "restaurado", deleted_at volta para NULL
-- 4. Os índices parciais (WHERE deleted_at IS NOT NULL) melhoram a performance
--    das queries que filtram apenas registros arquivados
-- =====================================================
