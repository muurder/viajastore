-- =====================================================
-- MIGRAÇÃO: Adicionar coluna birth_date na tabela profiles
-- =====================================================
-- Data: 2024
-- Descrição: Adiciona suporte para data de nascimento dos clientes
-- =====================================================

-- Adicionar coluna birth_date na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date date;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.profiles.birth_date IS 'Data de nascimento do cliente';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

