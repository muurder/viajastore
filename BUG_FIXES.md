# 🐛 Correções de Bugs

**Data:** 2025-01-10  
**Status:** ✅ **CORRIGIDOS**

---

## Bug 1: Shuffle Aleatório em Cada Renderização

### Problema
O algoritmo de shuffle estava sendo aplicado toda vez que o componente `TripList` renderizava ou os filtros mudavam no caso de ordenação padrão/RELEVANCE. Isso causava que a mesma busca retornasse viagens em ordem aleatória diferente a cada carregamento de página, criando uma experiência ruim para o usuário.

### Causa
A função `generateSeed` estava sendo chamada dentro do `useMemo`, e mesmo que os filtros fossem os mesmos, o seed poderia variar sutilmente, causando shuffle diferente a cada renderização.

### Solução
- **Simplificada a lógica de seed**: Removida a função `generateSeed` complexa e substituída por `getDayBasedSeed()` que gera um seed estável baseado apenas no dia atual.
- **Seed estável durante o mesmo dia**: Quando não há filtros aplicados, o seed é baseado apenas na data (ano, mês, dia), garantindo que a mesma ordem seja mantida durante todo o dia.
- **Shuffle apenas quando realmente necessário**: O shuffle só é aplicado quando não há nenhum filtro ativo (incluindo novos filtros como data, hóspedes, etc.).

### Arquivo Modificado
- `src/pages/TripList.tsx`

### Código Antes
```typescript
const seed = generateSeed({ q, categoryParam, selectedTags, selectedTravelerTypes, durationParam, priceParam });
result = seededShuffle(result, seed);
```

### Código Depois
```typescript
const today = new Date();
const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
const stableSeed = Math.abs(daySeed);
result = seededShuffle(result, stableSeed);
```

---

## Bug 2: Fechamento Duplicado de Modais

### Problema
As funções `confirmDeleteVehicle()` estava fechando o modal manualmente chamando `setVehicleToDelete(null)`, mas o componente `ConfirmDialog` também chama `onClose()` que fecha o mesmo modal. Isso causava atualizações duplicadas de estado para o mesmo pedaço de estado.

### Causa
Responsabilidade duplicada: tanto a função de callback quanto o componente `ConfirmDialog` estavam tentando fechar o modal.

### Solução
- **Removido fechamento manual**: Removido `setVehicleToDelete(null)` de dentro de `confirmDeleteVehicle()`.
- **Responsabilidade única**: O fechamento do modal agora é responsabilidade exclusiva do `ConfirmDialog` via `onClose()`.
- **Comentário adicionado**: Adicionado comentário explicando que o modal fecha via `onClose()` do `ConfirmDialog`.

### Arquivo Modificado
- `src/pages/AgencyDashboard.tsx`

### Funções Verificadas
- ✅ `confirmClearSeats()` - Não fecha modal manualmente (correto)
- ✅ `confirmDeleteVehicle()` - **CORRIGIDO**: Removido `setVehicleToDelete(null)`
- ✅ `confirmDeleteRoom()` - Não fecha modal manualmente (correto)
- ✅ `confirmRemoveGuest()` - Não fecha modal manualmente (correto)
- ✅ `confirmDeleteHotel()` - Não fecha modal manualmente (correto)

### Código Antes
```typescript
const confirmDeleteVehicle = () => {
    // ... lógica ...
    showToast('Veículo removido com sucesso', 'success');
    setVehicleToDelete(null); // ❌ Duplicado - ConfirmDialog já fecha
};
```

### Código Depois
```typescript
const confirmDeleteVehicle = () => {
    // ... lógica ...
    showToast('Veículo removido com sucesso', 'success');
    // Don't close modal here - ConfirmDialog will handle it via onClose()
};
```

---

## ✅ Resultado

### Bug 1
- ✅ Shuffle agora é estável durante o mesmo dia
- ✅ Mesma busca retorna a mesma ordem (dentro do mesmo dia)
- ✅ Experiência do usuário melhorada
- ✅ Performance mantida

### Bug 2
- ✅ Modais fecham corretamente sem duplicação
- ✅ Responsabilidade única e clara
- ✅ Código mais limpo e manutenível

---

## 🧪 Testes Recomendados

### Bug 1
1. Acessar `/trips` sem filtros
2. Verificar ordem das viagens
3. Recarregar a página
4. **Esperado**: Mesma ordem (dentro do mesmo dia)

### Bug 2
1. Abrir modal de confirmação de exclusão de veículo
2. Clicar em "Remover"
3. **Esperado**: Modal fecha uma única vez, sem erros no console

---

**Última Atualização:** 2025-01-10

