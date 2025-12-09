-- =====================================================
-- MIGRAÇÃO COMPLETA DE SLUGS - VIAJASTORE
-- =====================================================
-- Este script gera slugs para TODAS as agências e viagens
-- Execute em ordem: 1. Agências, 2. Viagens
-- =====================================================

-- =====================================================
-- PARTE 1: FUNÇÕES AUXILIARES
-- =====================================================

-- Função para gerar slug do texto (remove acentos, espaços, etc)
CREATE OR REPLACE FUNCTION generate_slug_from_text(text_input text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  IF text_input IS NULL OR text_input = '' THEN
    RETURN '';
  END IF;
  
  -- Remove acentos e caracteres especiais
  result := lower(text_input);
  result := regexp_replace(result, 'á|à|ã|â|ä', 'a', 'gi');
  result := regexp_replace(result, 'é|è|ê|ë', 'e', 'gi');
  result := regexp_replace(result, 'í|ì|î|ï', 'i', 'gi');
  result := regexp_replace(result, 'ó|ò|õ|ô|ö', 'o', 'gi');
  result := regexp_replace(result, 'ú|ù|û|ü', 'u', 'gi');
  result := regexp_replace(result, 'ç', 'c', 'gi');
  result := regexp_replace(result, 'ñ', 'n', 'gi');
  
  -- Remove caracteres especiais, mantém apenas letras, números, espaços e hífens
  result := regexp_replace(result, '[^a-zA-Z0-9\s-]', '', 'g');
  
  -- Substitui espaços por hífens
  result := regexp_replace(result, '\s+', '-', 'g');
  
  -- Remove hífens duplicados
  result := regexp_replace(result, '-+', '-', 'g');
  
  -- Remove hífens do início e fim
  result := regexp_replace(result, '^-+', '', 'g');
  result := regexp_replace(result, '-+$', '', 'g');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar slug único de agência
CREATE OR REPLACE FUNCTION generate_unique_agency_slug(base_slug text, p_agency_id uuid)
RETURNS text AS $$
DECLARE
  final_slug text;
  counter integer := 1;
  exists_check boolean;
BEGIN
  final_slug := base_slug;
  
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM agencies a
      WHERE a.slug = final_slug 
        AND a.id != p_agency_id
        AND a.deleted_at IS NULL
    ) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN final_slug;
    END IF;
    
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
    
    IF counter > 100 THEN
      final_slug := base_slug || '-' || extract(epoch from now())::bigint;
      RETURN final_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar slug único de viagem (dentro da mesma agência)
CREATE OR REPLACE FUNCTION generate_unique_trip_slug(base_slug text, p_trip_id uuid, p_agency_id uuid)
RETURNS text AS $$
DECLARE
  final_slug text;
  counter integer := 1;
  exists_check boolean;
BEGIN
  final_slug := base_slug;
  
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM trips t
      WHERE t.slug = final_slug 
        AND t.id != p_trip_id
        AND t.agency_id = p_agency_id
    ) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN final_slug;
    END IF;
    
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
    
    IF counter > 100 THEN
      final_slug := base_slug || '-' || extract(epoch from now())::bigint;
      RETURN final_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: CORRIGIR SLUGS DE AGÊNCIAS
-- =====================================================

-- Passo 2.1: Remover números aleatórios de slugs existentes
UPDATE agencies
SET slug = regexp_replace(slug, '-\d{3,}$', '', 'g')
WHERE slug ~ '-\d{3,}$'
  AND deleted_at IS NULL;

-- Passo 2.2: Gerar slugs para agências sem slug
DO $$
DECLARE
  agency_record RECORD;
  new_slug text;
  base_slug text;
BEGIN
  FOR agency_record IN 
    SELECT id, name
    FROM agencies
    WHERE (slug IS NULL OR slug = '')
      AND deleted_at IS NULL
    ORDER BY created_at
  LOOP
    base_slug := generate_slug_from_text(agency_record.name);
    
    IF base_slug = '' OR length(base_slug) < 3 THEN
      base_slug := 'agencia-' || substring(agency_record.id::text from 1 for 8);
    END IF;
    
    new_slug := generate_unique_agency_slug(base_slug, agency_record.id);
    
    UPDATE agencies
    SET slug = new_slug
    WHERE id = agency_record.id;
    
    RAISE NOTICE 'Agência "%" -> slug: %', agency_record.name, new_slug;
  END LOOP;
END $$;

-- Passo 2.3: Corrigir duplicatas de agências
DO $$
DECLARE
  dup_record RECORD;
  new_slug text;
  counter integer;
  agency_ids uuid[];
BEGIN
  FOR dup_record IN 
    SELECT slug, array_agg(id ORDER BY created_at) as ids
    FROM agencies
    WHERE slug IS NOT NULL 
      AND slug != ''
      AND deleted_at IS NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
  LOOP
    agency_ids := dup_record.ids;
    counter := 2;
    
    FOR i IN 2..array_length(agency_ids, 1) LOOP
      new_slug := dup_record.slug || '-' || counter;
      
      UPDATE agencies
      SET slug = new_slug
      WHERE id = agency_ids[i];
      
      RAISE NOTICE 'Agência duplicada corrigida: % -> %', dup_record.slug, new_slug;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- PARTE 3: CORRIGIR SLUGS DE VIAGENS
-- =====================================================

-- Passo 3.1: Gerar slugs para viagens sem slug
DO $$
DECLARE
  trip_record RECORD;
  new_slug text;
  base_slug text;
BEGIN
  FOR trip_record IN 
    SELECT id, title, agency_id
    FROM trips
    WHERE slug IS NULL OR slug = ''
    ORDER BY created_at
  LOOP
    base_slug := generate_slug_from_text(trip_record.title);
    
    IF base_slug = '' OR length(base_slug) < 3 THEN
      base_slug := 'viagem-' || substring(trip_record.id::text from 1 for 8);
    END IF;
    
    new_slug := generate_unique_trip_slug(base_slug, trip_record.id, trip_record.agency_id);
    
    UPDATE trips
    SET slug = new_slug
    WHERE id = trip_record.id;
    
    RAISE NOTICE 'Viagem "%" -> slug: %', trip_record.title, new_slug;
  END LOOP;
END $$;

-- Passo 3.2: Corrigir duplicatas de viagens (dentro da mesma agência)
DO $$
DECLARE
  dup_record RECORD;
  new_slug text;
  counter integer;
  trip_ids uuid[];
BEGIN
  FOR dup_record IN 
    SELECT agency_id, slug, array_agg(id ORDER BY created_at) as ids
    FROM trips
    WHERE slug IS NOT NULL AND slug != ''
    GROUP BY agency_id, slug
    HAVING COUNT(*) > 1
  LOOP
    trip_ids := dup_record.ids;
    counter := 2;
    
    FOR i IN 2..array_length(trip_ids, 1) LOOP
      new_slug := dup_record.slug || '-' || counter;
      
      UPDATE trips
      SET slug = new_slug
      WHERE id = trip_ids[i];
      
      RAISE NOTICE 'Viagem duplicada corrigida: % -> %', dup_record.slug, new_slug;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- =====================================================

-- Estatísticas de agências
SELECT 
  'Agências' as tipo,
  COUNT(*) as total,
  COUNT(slug) as com_slug,
  COUNT(*) - COUNT(slug) as sem_slug,
  COUNT(DISTINCT slug) as slugs_unicos
FROM agencies
WHERE deleted_at IS NULL;

-- Estatísticas de viagens
SELECT 
  'Viagens' as tipo,
  COUNT(*) as total,
  COUNT(slug) as com_slug,
  COUNT(*) - COUNT(slug) as sem_slug
FROM trips;

-- Verificar duplicatas de agências
SELECT 
  'Duplicatas Agências' as tipo,
  COUNT(*) as total_duplicatas
FROM (
  SELECT slug
  FROM agencies
  WHERE slug IS NOT NULL AND slug != '' AND deleted_at IS NULL
  GROUP BY slug
  HAVING COUNT(*) > 1
) dup;

-- Verificar duplicatas de viagens (por agência)
SELECT 
  'Duplicatas Viagens' as tipo,
  COUNT(*) as total_duplicatas
FROM (
  SELECT agency_id, slug
  FROM trips
  WHERE slug IS NOT NULL AND slug != ''
  GROUP BY agency_id, slug
  HAVING COUNT(*) > 1
) dup;

-- =====================================================
-- PARTE 5: LIMPEZA (OPCIONAL)
-- =====================================================

-- Descomente para remover funções após migração:
-- DROP FUNCTION IF EXISTS generate_slug_from_text(text);
-- DROP FUNCTION IF EXISTS generate_unique_agency_slug(text, uuid);
-- DROP FUNCTION IF EXISTS generate_unique_trip_slug(text, uuid, uuid);

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

