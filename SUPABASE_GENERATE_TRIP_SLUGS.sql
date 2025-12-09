-- =====================================================
-- GERAR SLUGS PARA VIAGENS SEM SLUG
-- =====================================================
-- Este script gera slugs para todas as viagens que não possuem slug
-- =====================================================

-- =====================================================
-- 1. VERIFICAR VIAGENS SEM SLUG
-- =====================================================

-- Ver quantas viagens não têm slug
SELECT 
  COUNT(*) as total_sem_slug,
  COUNT(DISTINCT agency_id) as agencias_afetadas
FROM trips
WHERE slug IS NULL OR slug = '';

-- Ver detalhes das viagens sem slug
SELECT 
  id,
  title,
  agency_id,
  slug,
  is_active,
  created_at
FROM trips
WHERE slug IS NULL OR slug = ''
ORDER BY created_at DESC;

-- =====================================================
-- 2. FUNÇÃO AUXILIAR PARA GERAR SLUG
-- =====================================================

-- Criar função para gerar slug do título (similar à função slugify do frontend)
CREATE OR REPLACE FUNCTION generate_slug_from_title(title_text text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          -- Remove acentos (usando unaccent se disponível, senão regex)
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(
                              regexp_replace(title_text, 'á|à|ã|â|ä', 'a', 'gi'),
                              'é|è|ê|ë', 'e', 'gi'),
                            'í|ì|î|ï', 'i', 'gi'),
                          'ó|ò|õ|ô|ö', 'o', 'gi'),
                        'ú|ù|û|ü', 'u', 'gi'),
                      'ç', 'c', 'gi'),
                    'ñ', 'n', 'gi'),
                  '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'),
              '-+', '-', 'g'),
            '^-+', '', 'g'),
          '-+$', '', 'g')
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. GERAR SLUGS ÚNICOS PARA VIAGENS SEM SLUG
-- =====================================================

-- Função para gerar slug único (adiciona sufixo numérico se necessário)
CREATE OR REPLACE FUNCTION generate_unique_trip_slug(base_slug text, trip_id uuid, agency_id uuid)
RETURNS text AS $$
DECLARE
  final_slug text;
  counter integer := 1;
  exists_check boolean;
BEGIN
  final_slug := base_slug;
  
  -- Verificar se slug já existe (excluindo a própria viagem)
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM trips 
      WHERE slug = final_slug 
        AND id != trip_id
        AND agency_id = agency_id  -- Slugs podem ser duplicados entre agências diferentes
    ) INTO exists_check;
    
    -- Se não existe, usar este slug
    IF NOT exists_check THEN
      RETURN final_slug;
    END IF;
    
    -- Se existe, adicionar sufixo numérico
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
    
    -- Prevenir loop infinito
    IF counter > 100 THEN
      -- Usar timestamp como último recurso
      final_slug := base_slug || '-' || extract(epoch from now())::bigint;
      RETURN final_slug;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. ATUALIZAR VIAGENS SEM SLUG
-- =====================================================

-- ATENÇÃO: Execute este comando com cuidado!
-- Ele atualizará todas as viagens sem slug

-- Versão segura: Atualizar uma agência por vez (recomendado)
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
    -- Gerar slug base do título
    base_slug := generate_slug_from_title(trip_record.title);
    
    -- Garantir que não está vazio
    IF base_slug = '' OR length(base_slug) < 3 THEN
      base_slug := 'viagem-' || substring(trip_record.id::text from 1 for 8);
    END IF;
    
    -- Gerar slug único
    new_slug := generate_unique_trip_slug(base_slug, trip_record.id, trip_record.agency_id);
    
    -- Atualizar viagem
    UPDATE trips
    SET slug = new_slug
    WHERE id = trip_record.id;
    
    RAISE NOTICE 'Viagem "%" atualizada com slug: %', trip_record.title, new_slug;
  END LOOP;
END $$;

-- =====================================================
-- 5. VERIFICAR RESULTADO
-- =====================================================

-- Verificar se ainda há viagens sem slug
SELECT 
  COUNT(*) as ainda_sem_slug
FROM trips
WHERE slug IS NULL OR slug = '';

-- Ver algumas viagens atualizadas (amostra)
SELECT 
  id,
  title,
  slug,
  agency_id,
  is_active
FROM trips
WHERE slug IS NOT NULL AND slug != ''
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================
-- 6. VERIFICAR SLUGS DUPLICADOS (POR AGÊNCIA)
-- =====================================================

-- Verificar se há slugs duplicados dentro da mesma agência
SELECT 
  agency_id,
  slug,
  COUNT(*) as count,
  array_agg(title) as titles,
  array_agg(id) as ids
FROM trips
WHERE slug IS NOT NULL AND slug != ''
GROUP BY agency_id, slug
HAVING COUNT(*) > 1;

-- =====================================================
-- 7. CORRIGIR SLUGS DUPLICADOS (SE HOUVER)
-- =====================================================

-- Se houver duplicatas, este comando corrige adicionando sufixo numérico
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
    counter := 2; -- Começar do 2, deixar o primeiro com slug original
    
    -- Atualizar viagens duplicadas (exceto a primeira)
    FOR i IN 2..array_length(trip_ids, 1) LOOP
      new_slug := dup_record.slug || '-' || counter;
      
      UPDATE trips
      SET slug = new_slug
      WHERE id = trip_ids[i];
      
      RAISE NOTICE 'Slug duplicado corrigido: % -> %', dup_record.slug, new_slug;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 8. LIMPEZA (OPCIONAL - REMOVER FUNÇÕES TEMPORÁRIAS)
-- =====================================================

-- Descomente estas linhas se quiser remover as funções após usar:

-- DROP FUNCTION IF EXISTS generate_slug_from_title(text);
-- DROP FUNCTION IF EXISTS generate_unique_trip_slug(text, uuid, uuid);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

