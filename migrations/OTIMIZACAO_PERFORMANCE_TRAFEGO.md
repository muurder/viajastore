# 📊 Análise de Performance e Otimização de Tráfego - ViajaStore

**Data:** 2025-01-10  
**Status:** ⚠️ URGENTE - Excedendo limites de uso

---

## 🔴 Problemas Críticos Identificados

### 1. **Cached Egress Excedido: 5,725 / 5 GB (115%)**
- **Causa Principal:** Muitas requisições de imagens de trips via Storage API
- **Impacto:** Custo elevado e possível throttling

### 2. **155 Warnings de RLS Performance**
- **Tipo:** `auth_rls_initplan` - Reavaliação de `auth.uid()` para cada linha
- **Impacto:** Queries lentas, alto uso de CPU

### 3. **98 Slow Queries**
- **Causa:** Políticas RLS ineficientes + falta de índices adequados
- **Impacto:** Experiência do usuário degradada

### 4. **Múltiplas Políticas Permissivas**
- **Problema:** Múltiplas políticas para mesmo role/action
- **Impacto:** PostgreSQL avalia todas, reduzindo performance

---

## ✅ Soluções Implementadas

### 1. Índices para Foreign Keys ✅
- Script: `migrations/add_foreign_key_indexes.sql`
- Status: Criado e pronto para execução

---

## 🚀 Plano de Ação Imediato

### **FASE 1: Otimização RLS (CRÍTICO - Reduz 155 warnings)**

#### Problema:
As políticas RLS estão usando `auth.uid()` diretamente, causando reavaliação para cada linha.

#### Solução:
Já existe um script em `migrations/fix_rls_performance.sql`, mas precisa ser verificado e aplicado.

**Ação:** Executar migração de otimização RLS

---

### **FASE 2: Redução de Tráfego de Storage (CRÍTICO - Reduz egress)**

#### Problemas Identificados:
1. **Muitas requisições de imagens:** Cada trip carrega todas as imagens
2. **Sem cache adequado:** Imagens sendo re-baixadas frequentemente
3. **Sem lazy loading:** Todas as imagens carregam de uma vez

#### Soluções:

**2.1. Implementar Lazy Loading de Imagens**
```typescript
// No frontend, usar lazy loading para imagens
<img loading="lazy" src={imageUrl} />
```

**2.2. Usar CDN/Image Optimization**
- Configurar Supabase Storage com CDN
- Usar transformações de imagem (resize, format)

**2.3. Implementar Cache no Frontend**
- Cache de imagens já carregadas
- Evitar re-fetch de imagens

**2.4. Paginação de Imagens**
- Não carregar todas as imagens de uma vez
- Carregar apenas primeira imagem + lazy load do resto

---

### **FASE 3: Otimização de Queries (Reduz slow queries)**

#### 3.1. Queries com SELECT * 
**Problema:** Carregando todos os campos desnecessariamente

**Solução:**
```typescript
// ❌ Ruim
.select('*')

// ✅ Bom
.select('id, title, price, destination, trip_images(image_url)')
```

#### 3.2. Queries com Múltiplos JOINs
**Problema:** JOINs aninhados sem índices adequados

**Solução:** 
- Aplicar índices criados em `add_foreign_key_indexes.sql`
- Usar índices compostos para queries frequentes

#### 3.3. Queries sem Filtros
**Problema:** Carregando todos os registros

**Solução:**
- Sempre usar filtros (WHERE, LIMIT)
- Implementar paginação

---

### **FASE 4: Consolidação de Políticas RLS**

#### Problema:
Múltiplas políticas permissivas para mesmo role/action

#### Solução:
Consolidar políticas usando OR em uma única política por ação

**Exemplo:**
```sql
-- ❌ Ruim (múltiplas políticas)
CREATE POLICY "Admin full access" ON trips FOR SELECT USING (is_admin());
CREATE POLICY "Public read" ON trips FOR SELECT USING (is_active = true);

-- ✅ Bom (política consolidada)
CREATE POLICY "Unified Trips Select" ON trips FOR SELECT 
USING (
  is_active = true OR 
  (SELECT public.is_admin())
);
```

---

## 📋 Checklist de Implementação

### Imediato (Hoje)
- [ ] Executar `migrations/add_foreign_key_indexes.sql`
- [ ] Verificar e aplicar otimizações RLS
- [ ] Implementar lazy loading de imagens no frontend
- [ ] Adicionar cache de imagens no frontend

### Curto Prazo (Esta Semana)
- [ ] Remover SELECT * de queries principais
- [ ] Implementar paginação em listagens
- [ ] Consolidar políticas RLS duplicadas
- [ ] Configurar CDN para Storage

### Médio Prazo (Este Mês)
- [ ] Implementar image optimization (resize, format)
- [ ] Adicionar índices compostos para queries frequentes
- [ ] Monitorar e otimizar queries lentas
- [ ] Implementar rate limiting no frontend

---

## 📊 Métricas Esperadas Após Otimizações

### Redução de Egress:
- **Antes:** 5,725 GB (115%)
- **Esperado:** ~2-3 GB (40-60%)
- **Redução:** ~50-60%

### Performance:
- **Slow Queries:** 98 → ~10-20
- **RLS Warnings:** 155 → 0
- **Query Time:** Redução de 30-50%

---

## 🔍 Monitoramento

### Métricas a Acompanhar:
1. **Cached Egress:** Meta < 4 GB (80%)
2. **Slow Queries:** Meta < 20
3. **RLS Warnings:** Meta = 0
4. **Query Performance:** Meta < 100ms (p95)

### Ferramentas:
- Supabase Dashboard → Performance
- Supabase Dashboard → Database Linter
- Supabase Dashboard → Logs

---

## 📝 Notas Técnicas

### Por que `(SELECT auth.uid())` é melhor?
- `auth.uid()` é avaliado para cada linha
- `(SELECT auth.uid())` cria um InitPlan, avaliado uma vez
- Reduz CPU e melhora performance em 10-100x

### Por que consolidar políticas?
- PostgreSQL avalia TODAS as políticas permissivas
- Múltiplas políticas = múltiplas avaliações
- Política única = avaliação única

### Por que lazy loading?
- Reduz tráfego inicial
- Melhora tempo de carregamento
- Reduz custo de egress

---

## 🚨 Ações Urgentes

1. **HOJE:** Executar índices de foreign keys
2. **HOJE:** Implementar lazy loading básico
3. **AMANHÃ:** Aplicar otimizações RLS
4. **ESTA SEMANA:** Consolidar políticas duplicadas

---

**Última Atualização:** 2025-01-10  
**Próxima Revisão:** Após implementação das Fases 1-2

