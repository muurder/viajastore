# Comandos SQL para Supabase - ViajaStore

Este arquivo contém comandos SQL úteis para gerenciar o banco de dados Supabase.

## 📋 Índice

1. [Índices para Slugs](#índices-para-slugs)
2. [Validações e Constraints](#validações-e-constraints)
3. [Migrações de Dados](#migrações-de-dados)
4. [Consultas Úteis](#consultas-úteis)
5. [Manutenção](#manutenção)

---

## 🔑 Índices para Slugs

### Criar índices únicos para slugs (RECOMENDADO)

```sql
-- Índice único para slugs de agências (permite NULL, mas garante unicidade quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_slug_unique 
ON public.agencies(slug) 
WHERE slug IS NOT NULL;

-- Índice único para slugs de viagens (permite NULL, mas garante unicidade quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_slug_unique 
ON public.trips(slug) 
WHERE slug IS NOT NULL;
```

**Por que usar `WHERE slug IS NOT NULL`?**
- Permite múltiplos registros com slug NULL (útil durante migração)
- Garante unicidade apenas para slugs não nulos
- Evita conflitos durante criação de registros

---

## ✅ Validações e Constraints

### Adicionar constraint para garantir formato de slug

```sql
-- Validação de formato de slug para agências
ALTER TABLE public.agencies 
ADD CONSTRAINT check_agencies_slug_format 
CHECK (
  slug IS NULL OR 
  (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) >= 3 AND length(slug) <= 100)
);

-- Validação de formato de slug para viagens
ALTER TABLE public.trips 
ADD CONSTRAINT check_trips_slug_format 
CHECK (
  slug IS NULL OR 
  (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND length(slug) >= 3 AND length(slug) <= 100)
);
```

### Tornar slug obrigatório (após migração completa)

```sql
-- Apenas execute após garantir que todos os registros têm slug
ALTER TABLE public.agencies 
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.trips 
ALTER COLUMN slug SET NOT NULL;
```

---

## 🔄 Migrações de Dados

### Corrigir slugs de agências com números aleatórios

```sql
-- Atualizar slugs de agências removendo números aleatórios no final
-- Exemplo: "minha-agencia-123" -> "minha-agencia"
UPDATE public.agencies
SET slug = regexp_replace(slug, '-\d{3,}$', '', 'g')
WHERE slug ~ '-\d{3,}$';

-- Verificar quantos foram atualizados
SELECT COUNT(*) as updated_count
FROM public.agencies
WHERE slug ~ '-\d{3,}$';
```

### Gerar slugs para registros sem slug

```sql
-- Função auxiliar para gerar slug do nome
CREATE OR REPLACE FUNCTION generate_slug_from_name(name_text text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          unaccent(name_text),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Gerar slugs para agências sem slug
UPDATE public.agencies
SET slug = generate_slug_from_name(name)
WHERE slug IS NULL OR slug = '';

-- Gerar slugs para viagens sem slug
UPDATE public.trips
SET slug = generate_slug_from_name(title)
WHERE slug IS NULL OR slug = '';
```

### Resolver slugs duplicados

```sql
-- Encontrar slugs duplicados de agências
SELECT slug, COUNT(*) as count
FROM public.agencies
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Adicionar sufixo numérico para slugs duplicados
WITH duplicates AS (
  SELECT id, slug, 
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.agencies
  WHERE slug IN (
    SELECT slug FROM public.agencies
    WHERE slug IS NOT NULL
    GROUP BY slug HAVING COUNT(*) > 1
  )
)
UPDATE public.agencies a
SET slug = a.slug || '-' || d.rn
FROM duplicates d
WHERE a.id = d.id AND d.rn > 1;
```

---

## 🔍 Consultas Úteis

### Verificar slugs problemáticos

```sql
-- Agências sem slug
SELECT id, name, email, created_at
FROM public.agencies
WHERE slug IS NULL OR slug = ''
ORDER BY created_at DESC;

-- Viagens sem slug
SELECT id, title, agency_id, created_at
FROM public.trips
WHERE slug IS NULL OR slug = ''
ORDER BY created_at DESC;

-- Slugs duplicados de agências
SELECT slug, COUNT(*) as count, array_agg(name) as names
FROM public.agencies
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Slugs duplicados de viagens
SELECT slug, COUNT(*) as count, array_agg(title) as titles
FROM public.trips
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Slugs inválidos (com caracteres especiais)
SELECT id, name, slug
FROM public.agencies
WHERE slug IS NOT NULL 
  AND slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';

SELECT id, title, slug
FROM public.trips
WHERE slug IS NOT NULL 
  AND slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';
```

### Estatísticas de slugs

```sql
-- Estatísticas gerais
SELECT 
  'agencies' as table_name,
  COUNT(*) as total,
  COUNT(slug) as with_slug,
  COUNT(*) - COUNT(slug) as without_slug,
  COUNT(DISTINCT slug) as unique_slugs
FROM public.agencies
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'trips' as table_name,
  COUNT(*) as total,
  COUNT(slug) as with_slug,
  COUNT(*) - COUNT(slug) as without_slug,
  COUNT(DISTINCT slug) as unique_slugs
FROM public.trips
WHERE deleted_at IS NULL;
```

---

## 🛠️ Manutenção

### Limpar slugs inválidos

```sql
-- Remover caracteres inválidos de slugs existentes
UPDATE public.agencies
SET slug = regexp_replace(
  regexp_replace(slug, '[^a-z0-9-]', '', 'g'),
  '-+', '-', 'g'
)
WHERE slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';

UPDATE public.trips
SET slug = regexp_replace(
  regexp_replace(slug, '[^a-z0-9-]', '', 'g'),
  '-+', '-', 'g'
)
WHERE slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';
```

### Reindexar tabelas (após grandes mudanças)

```sql
REINDEX TABLE public.agencies;
REINDEX TABLE public.trips;
REINDEX INDEX idx_agencies_slug_unique;
REINDEX INDEX idx_trips_slug_unique;
```

### Verificar integridade de índices

```sql
-- Verificar se há violações de unicidade
SELECT slug, COUNT(*) as count
FROM public.agencies
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;

SELECT slug, COUNT(*) as count
FROM public.trips
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1;
```

---

## 📝 Notas Importantes

1. **Sempre faça backup** antes de executar comandos de UPDATE ou ALTER TABLE
2. **Teste em ambiente de desenvolvimento** primeiro
3. **Execute migrações em horários de baixo tráfego**
4. **Monitore performance** após criar índices grandes

---

## 🆘 Comandos de Emergência

### Remover índices (se causarem problemas)

```sql
DROP INDEX IF EXISTS idx_agencies_slug_unique;
DROP INDEX IF EXISTS idx_trips_slug_unique;
```

### Remover constraints (se necessário)

```sql
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS check_agencies_slug_format;
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS check_trips_slug_format;
```

---

**Última atualização:** $(date)

