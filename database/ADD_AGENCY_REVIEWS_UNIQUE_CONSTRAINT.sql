-- =====================================================
-- MIGRAÇÃO: Adicionar constraint UNIQUE em agency_reviews
-- =====================================================
-- Data: 2024
-- Descrição: Adiciona constraint única para permitir que cada cliente avalie uma agência apenas uma vez
--            Isso permite usar upsert com onConflict no código
-- =====================================================

-- Adicionar constraint UNIQUE para (agency_id, client_id)
-- Isso garante que cada cliente só pode ter uma avaliação por agência
ALTER TABLE public.agency_reviews 
ADD CONSTRAINT agency_reviews_agency_client_unique 
UNIQUE (agency_id, client_id);

-- Comentário na constraint para documentação
COMMENT ON CONSTRAINT agency_reviews_agency_client_unique ON public.agency_reviews 
IS 'Garante que cada cliente pode ter apenas uma avaliação por agência';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

