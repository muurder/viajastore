# Correção: "Viagem não encontrada" no Microsite da Agência

## 🔍 Problema Identificado

Quando o usuário está na página dedicada de uma agência (microsite) e clica em uma viagem, aparece "Viagem não encontrada".

### Causa Raiz

1. **Busca não considerava contexto da agência**: `getTripBySlug()` buscava em TODAS as viagens, não apenas nas viagens da agência atual
2. **Slugs duplicados possíveis**: Diferentes agências podem ter viagens com o mesmo slug
3. **Fallbacks de ID**: Links ainda usavam `trip.slug || trip.id`, mas `getTripBySlug` não aceita mais IDs

## ✅ Correções Aplicadas

### 1. **TripDetails agora considera contexto da agência**

**Antes:**
```typescript
const trip = activeSlug ? getTripBySlug(activeSlug) : undefined;
```

**Depois:**
```typescript
// FIX: When in agency microsite context, search trips within that agency first
const currentAgency = agencySlug ? getAgencyBySlug(agencySlug) : undefined;

let trip: Trip | undefined = undefined;

if (activeSlug) {
  if (currentAgency) {
    // In agency microsite: search within agency's trips first
    const agencyTrips = getAgencyPublicTrips(currentAgency.agencyId);
    trip = agencyTrips.find(t => t.slug === activeSlug);
    
    // If not found by slug, try by ID (fallback for old links)
    if (!trip && activeSlug.length === 36) { // UUIDs are 36 chars
      trip = getTripById(activeSlug);
      // Verify it belongs to this agency
      if (trip && trip.agencyId !== currentAgency.agencyId) {
        trip = undefined;
      }
    }
  } else {
    // Global context: search all trips
    trip = getTripBySlug(activeSlug);
    
    // If not found by slug, try by ID (fallback for old links)
    if (!trip && activeSlug.length === 36) {
      trip = getTripById(activeSlug);
    }
  }
}
```

### 2. **Removidos fallbacks de ID dos links**

**Arquivos corrigidos:**
- `src/pages/AgencyLandingPage.tsx` (2 locais)
- `src/components/TripCard.tsx` (1 local)

**Antes:**
```typescript
to={`/${agencySlug}/viagem/${trip.slug || trip.id}`}
```

**Depois:**
```typescript
to={`/${agencySlug}/viagem/${trip.slug}`}
```

### 3. **Mensagens de erro melhoradas**

Agora mostra:
- Mensagem específica se a viagem não pertence à agência
- Link para voltar para a lista de pacotes da agência (se no microsite)
- Informação sobre qual slug foi procurado

## 🎯 Resultado

Agora quando você clica em uma viagem no microsite da agência:

1. ✅ A busca é feita primeiro nas viagens daquela agência específica
2. ✅ Evita conflitos com slugs duplicados de outras agências
3. ✅ Mensagens de erro mais claras e úteis
4. ✅ Links usam apenas slugs (sem fallback de ID)

## 📝 Nota Importante

Se ainda aparecer "Viagem não encontrada", pode ser:

1. **Slug vazio no banco**: A viagem não tem slug definido
   - Solução: Execute migração para gerar slugs para todas as viagens

2. **Slug diferente**: O slug no link não corresponde ao slug no banco
   - Verifique no banco: `SELECT id, title, slug FROM trips WHERE id = '...'`

3. **Viagem inativa**: A viagem pode estar com `is_active = false`
   - Verifique: `SELECT id, title, is_active FROM trips WHERE slug = '...'`

## 🔧 Comando SQL para Verificar

```sql
-- Ver viagens sem slug
SELECT id, title, slug, agency_id, is_active
FROM trips
WHERE slug IS NULL OR slug = '';

-- Ver viagens de uma agência específica
SELECT id, title, slug, is_active
FROM trips
WHERE agency_id = 'ID_DA_AGENCIA'
ORDER BY created_at DESC;
```

---

**Status:** ✅ Corrigido
**Arquivos modificados:** 3
- `src/pages/TripDetails.tsx`
- `src/pages/AgencyLandingPage.tsx`
- `src/components/TripCard.tsx`

