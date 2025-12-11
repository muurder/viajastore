-- =====================================================
-- GERAR SLUGS PARA AGÊNCIAS SEM SLUG
-- =====================================================
-- Este script gera slugs para todas as agências que não possuem slug
-- =====================================================

-- =====================================================
-- 1. VERIFICAR AGÊNCIAS SEM SLUG
-- =====================================================

-- Ver quantas agências não têm slug
SELECT 
  COUNT(*) as total_sem_slug
FROM agencies
WHERE slug IS NULL OR slug = '' OR slug ~ '-\d{3,}$'; -- Inclui slugs com números aleatórios

-- Ver detalhes das agências sem slug ou com números aleatórios
SELECT 
  id,
  name,
  slug,
  is_active,
  deleted_at,
  created_at
FROM agencies
WHERE slug IS NULL OR slug = '' OR slug ~ '-\d{3,}$'
ORDER BY created_at DESC;

-- =====================================================
-- 2. FUNÇÃO AUXILIAR PARA GERAR SLUG
-- =====================================================

-- Criar função para gerar slug do nome (similar à função slugify do frontend)
CREATE OR REPLACE FUNCTION generate_slug_from_name(name_text text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          -- Remove acentos
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
                              regexp_replace(name_text, 'á|à|ã|â|ä', 'a', 'gi'),
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
-- 3. GERAR SLUGS ÚNICOS PARA AGÊNCIAS
-- =====================================================

-- Função para gerar slug único (adiciona sufixo numérico se necessário)
CREATE OR REPLACE FUNCTION generate_unique_agency_slug(base_slug text, agency_id uuid)
RETURNS text AS $$
DECLARE
  final_slug text;
  counter integer := 1;
  exists_check boolean;
BEGIN
  final_slug := base_slug;
  
  -- Verificar se slug já existe (excluindo a própria agência)
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM agencies 
      WHERE slug = final_slug 
        AND id != agency_id
        AND deleted_at IS NULL  -- Não considerar agências deletadas
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
-- 4. REMOVER NÚMEROS ALEATÓRIOS DE SLUGS EXISTENTES
-- =====================================================

-- Primeiro, remover números aleatórios do final dos slugs existentes
-- Exemplo: "minha-agencia-123" -> "minha-agencia"
UPDATE agencies
SET slug = regexp_replace(slug, '-\d{3,}$', '', 'g')
WHERE slug ~ '-\d{3,}$'  -- Slugs que terminam com 3 ou mais dígitos
  AND deleted_at IS NULL;

-- =====================================================
-- 5. ATUALIZAR AGÊNCIAS SEM SLUG
-- =====================================================

-- ATENÇÃO: Execute este comando com cuidado!
-- Ele atualizará todas as agências sem slug

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
      AND deleted_at IS NULL  -- Não atualizar agências deletadas
    ORDER BY created_at
  LOOP
    -- Gerar slug base do nome
    base_slug := generate_slug_from_name(agency_record.name);
    
    -- Garantir que não está vazio
    IF base_slug = '' OR length(base_slug) < 3 THEN
      base_slug := 'agencia-' || substring(agency_record.id::text from 1 for 8);
    END IF;
    
    -- Gerar slug único
    new_slug := generate_unique_agency_slug(base_slug, agency_record.id);
    
    -- Atualizar agência
    UPDATE agencies
    SET slug = new_slug
    WHERE id = agency_record.id;
    
    RAISE NOTICE 'Agência "%" atualizada com slug: %', agency_record.name, new_slug;
  END LOOP;
END $$;

-- =====================================================
-- 6. CORRIGIR SLUGS DUPLICADOS (APÓS REMOVER NÚMEROS)
-- =====================================================

-- Se houver duplicatas após remover números aleatórios, corrigir
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
    counter := 2; -- Começar do 2, deixar o primeiro com slug original
    
    -- Atualizar agências duplicadas (exceto a primeira)
    FOR i IN 2..array_length(agency_ids, 1) LOOP
      new_slug := dup_record.slug || '-' || counter;
      
      UPDATE agencies
      SET slug = new_slug
      WHERE id = agency_ids[i];
      
      RAISE NOTICE 'Slug duplicado corrigido: % -> %', dup_record.slug, new_slug;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 7. VERIFICAR RESULTADO
-- =====================================================

-- Verificar se ainda há agências sem slug
SELECT 
  COUNT(*) as ainda_sem_slug
FROM agencies
WHERE (slug IS NULL OR slug = '')
  AND deleted_at IS NULL;

-- Verificar se ainda há slugs com números aleatórios
SELECT 
  COUNT(*) as com_numeros_aleatorios
FROM agencies
WHERE slug ~ '-\d{3,}$'
  AND deleted_at IS NULL;

-- Ver algumas agências atualizadas (amostra)
SELECT 
  id,
  name,
  slug,
  is_active
FROM agencies
WHERE slug IS NOT NULL 
  AND slug != ''
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 10;

-- =====================================================
-- 8. VERIFICAR SLUGS DUPLICADOS
-- =====================================================

-- Verificar se há slugs duplicados
SELECT 
  slug,
  COUNT(*) as count,
  array_agg(name) as names,
  array_agg(id) as ids
FROM agencies
WHERE slug IS NOT NULL 
  AND slug != ''
  AND deleted_at IS NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- =====================================================
-- 9. LIMPEZA (OPCIONAL - REMOVER FUNÇÕES TEMPORÁRIAS)
-- =====================================================

-- Descomente estas linhas se quiser remover as funções após usar:

-- DROP FUNCTION IF EXISTS generate_slug_from_name(text);
-- DROP FUNCTION IF EXISTS generate_unique_agency_slug(text, uuid);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

