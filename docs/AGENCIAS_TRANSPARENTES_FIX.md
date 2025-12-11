# Correção: Agências Transparentes na Lista

## 🔍 Problema Identificado

Algumas agências aparecem transparentes na lista porque:

1. **Filtro incompleto**: A função `searchAgencies` filtra apenas por `is_active`, mas não verifica:
   - Se `is_active` é explicitamente `true` (pode ser `null` ou `undefined`)
   - Se a agência foi soft-deleted (`deleted_at` não é nulo)

2. **Busca no banco**: A busca inicial não exclui agências deletadas

## ✅ Correções Aplicadas

### 1. Filtro melhorado em `searchAgencies`

**Antes:**
```typescript
let result = agenciesRef.current.filter(a => a.is_active);
```

**Depois:**
```typescript
// FIX: Filter out inactive agencies and soft-deleted agencies
let result = agenciesRef.current.filter(a => 
  a.is_active === true && 
  !a.deleted_at // Exclude soft-deleted agencies
);
```

### 2. Busca no banco exclui deletadas

**Antes:**
```typescript
const { data: agenciesData } = await sb.from('agencies').select('*');
```

**Depois:**
```typescript
const { data: agenciesData } = await sb.from('agencies')
  .select('*')
  .is('deleted_at', null); // FIX: Only fetch non-deleted agencies
```

### 3. Garantir `is_active` não seja `null`

**Antes:**
```typescript
is_active: a.is_active,
```

**Depois:**
```typescript
is_active: a.is_active ?? false, // Garante false se null/undefined
```

## 🎯 Resultado Esperado

Agora apenas agências que são:
- ✅ `is_active === true` (explicitamente true)
- ✅ `deleted_at === null` (não foram deletadas)

Aparecerão na lista. Agências inativas ou deletadas não aparecerão mais.

## 📝 Nota

Se você ainda ver agências transparentes, pode ser:
1. Cache do navegador - recarregue a página (Ctrl+F5)
2. Agências com `is_active: null` no banco - execute migração para corrigir
3. Problema de CSS - verifique se há estilos aplicando opacidade

## 🔧 Comando SQL para Verificar

```sql
-- Ver agências inativas ou deletadas
SELECT id, name, is_active, deleted_at 
FROM agencies 
WHERE is_active = false OR deleted_at IS NOT NULL;
```

## 🔧 Comando SQL para Corrigir

```sql
-- Ativar todas as agências que estão null (opcional)
UPDATE agencies 
SET is_active = true 
WHERE is_active IS NULL;
```

