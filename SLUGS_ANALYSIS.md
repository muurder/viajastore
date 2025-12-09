# Análise de Slugs - ViajaStore

## 🔍 Problemas Identificados

### 1. **Slugs de Agências com Números Aleatórios** ⚠️
**Localização**: `src/context/AuthContext.tsx` (linhas 431, 463, 222)

**Problema**: 
- Ao registrar uma nova agência, o slug é gerado com um número aleatório: `slugify(data.name + '-' + Math.floor(Math.random() * 1000))`
- Isso cria slugs como `minha-agencia-123` em vez de `minha-agencia`
- Slugs não são amigáveis para SEO e URLs

**Código atual**:
```typescript
const safeSlug = slugify(data.name + '-' + Math.floor(Math.random() * 1000));
```

**Recomendação**: 
- Gerar slug baseado apenas no nome
- Verificar se já existe e adicionar sufixo numérico apenas se necessário
- Permitir que o admin edite o slug depois

---

### 2. **Falta de Validação de Unicidade** ❌
**Localização**: `src/context/DataContext.tsx` (linha 887), `src/components/agency/CreateTripWizard.tsx` (linha 176)

**Problema**:
- Não há verificação se o slug já existe antes de criar uma viagem ou agência
- Pode resultar em slugs duplicados, causando conflitos de roteamento
- `getTripBySlug` aceita tanto slug quanto ID como fallback, mascarando problemas

**Código atual**:
```typescript
// CreateTripWizard.tsx linha 176
slug: tripData.slug || slugify(tripData.title!),

// DataContext.tsx linha 887
slug: trip.slug,
```

**Recomendação**:
- Implementar verificação de unicidade antes de salvar
- Adicionar índice único no banco de dados
- Validar no frontend antes de enviar

---

### 3. **Slugs Podem Ficar Vazios** ⚠️
**Localização**: `src/components/agency/CreateTripWizard.tsx` (linha 176)

**Problema**:
- Se `tripData.slug` for uma string vazia `''`, o fallback não funciona corretamente
- `'' || slugify(...)` retorna `slugify(...)`, mas se `tripData.slug` for explicitamente `''`, pode causar problemas

**Código atual**:
```typescript
slug: tripData.slug || slugify(tripData.title!),
```

**Recomendação**:
```typescript
slug: (tripData.slug && tripData.slug.trim()) ? tripData.slug : slugify(tripData.title!),
```

---

### 4. **Slug de Agência Read-Only Demais** ⚠️
**Localização**: `src/context/AuthContext.tsx` (linha 543)

**Problema**:
- Slugs de agências só podem ser atualizados se estiverem vazios
- Isso impede correção de slugs malformados ou com números aleatórios
- Admin pode editar, mas agência não pode corrigir seu próprio slug

**Código atual**:
```typescript
if ((user as Agency).slug === '' && (userData as Agency).slug) { 
  updates.slug = (userData as Agency).slug;
}
```

**Recomendação**:
- Permitir que admin sempre possa editar
- Permitir que agência edite uma vez (primeira vez)
- Depois disso, requer aprovação do admin

---

### 5. **Busca por Slug Aceita ID como Fallback** ⚠️
**Localização**: `src/context/DataContext.tsx` (linha 418)

**Problema**:
- `getTripBySlug` aceita tanto slug quanto ID
- Isso pode mascarar problemas onde o slug está vazio ou inválido
- URLs podem funcionar com IDs, mas não são SEO-friendly

**Código atual**:
```typescript
const getTripBySlug = useCallback((slugToFind: string) => {
  return trips.find(t => t.slug === slugToFind || t.id === slugToFind);
}, [trips]);
```

**Recomendação**:
- Separar `getTripBySlug` e `getTripById`
- Se slug não for encontrado, retornar `undefined` em vez de tentar ID
- Forçar uso correto de slugs

---

### 6. **Falta de Validação de Formato de Slug** ⚠️
**Localização**: Todo o projeto

**Problema**:
- Não há validação se o slug segue o formato correto antes de salvar
- Usuário pode inserir caracteres inválidos manualmente
- Não há feedback visual se o slug está no formato correto

**Recomendação**:
- Adicionar validação no frontend usando regex
- Mostrar preview do slug gerado
- Validar no backend também

---

## 📋 Checklist de Correções Necessárias

### Crítico (Fazer Imediatamente)
- [ ] Remover números aleatórios da geração de slugs de agências
- [ ] Implementar verificação de unicidade antes de salvar
- [ ] Adicionar validação de formato de slug
- [ ] Corrigir fallback de slug vazio

### Importante (Fazer em Breve)
- [ ] Separar `getTripBySlug` de `getTripById`
- [ ] Permitir edição de slug de agência (com restrições)
- [ ] Adicionar índice único no banco de dados
- [ ] Criar ferramenta de migração para corrigir slugs existentes

### Melhorias (Fazer Quando Possível)
- [ ] Adicionar preview de slug ao criar/editar
- [ ] Implementar sugestão automática de slug alternativo se duplicado
- [ ] Adicionar validação de slug no formulário de criação
- [ ] Criar dashboard de verificação de slugs no AdminDashboard

---

## 🔧 Soluções Propostas

### 1. Função para Gerar Slug Único

```typescript
async function generateUniqueSlug(baseSlug: string, table: 'agencies' | 'trips', excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('slug', slug)
      .neq('id', excludeId || '')
      .maybeSingle();
    
    if (!data) {
      return slug; // Slug é único
    }
    
    // Slug existe, tentar com sufixo numérico
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
```

### 2. Validação de Slug

```typescript
function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim() === '') {
    return { valid: false, error: 'Slug não pode estar vazio' };
  }
  
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, error: 'Slug deve conter apenas letras minúsculas, números e hífens' };
  }
  
  if (slug.length < 3) {
    return { valid: false, error: 'Slug deve ter pelo menos 3 caracteres' };
  }
  
  if (slug.length > 100) {
    return { valid: false, error: 'Slug deve ter no máximo 100 caracteres' };
  }
  
  return { valid: true };
}
```

### 3. Atualizar Criação de Agência

```typescript
// Em AuthContext.tsx, função register
if (role === UserRole.AGENCY) {
  const baseSlug = slugify(data.name);
  const uniqueSlug = await generateUniqueSlug(baseSlug, 'agencies');
  
  const { error: agencyError } = await supabase.rpc('create_agency', {
    p_user_id: userId,
    p_name: data.name,
    p_email: data.email,
    p_phone: data.phone,
    p_whatsapp: data.phone,
    p_slug: uniqueSlug
  });
}
```

---

## 📊 Estatísticas Esperadas

Após análise completa, você pode encontrar:
- **Slugs vazios**: Agências/viagens sem slug
- **Slugs duplicados**: Múltiplas entidades com mesmo slug
- **Slugs inválidos**: Slugs com caracteres não permitidos
- **Slugs com números aleatórios**: Slugs de agências com sufixos numéricos desnecessários

---

## 🚀 Próximos Passos

1. Execute o script de análise (`scripts/check-slugs.ts`) com dados reais do Supabase
2. Revise os problemas encontrados
3. Implemente as correções críticas
4. Execute migração para corrigir slugs existentes
5. Adicione validações preventivas

