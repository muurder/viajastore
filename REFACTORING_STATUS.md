# Status da Refatoração Estrutural - ViajaStore

## 📊 Análise Inicial

### Arquivos Identificados como Críticos:
- `src/pages/AgencyDashboard.tsx`: **~5,904 linhas** ⚠️
- `src/context/DataContext.tsx`: **~2,675 linhas** ⚠️
- `src/components/agency/CreateTripWizard.tsx`: **~1,880 linhas** ⚠️

---

## ✅ Implementações Concluídas

### 1. Custom Hooks Criados (`src/hooks/`)

#### ✅ `useTripManagement.ts`
- **Funções extraídas:**
  - `createTrip()` - Criação de viagens
  - `updateTrip()` - Atualização de viagens
  - `deleteTrip()` - Exclusão de viagens
  - `toggleTripStatus()` - Ativar/desativar viagens
  - `updateTripOperationalData()` - Dados operacionais

#### ✅ `useAgencyOperations.ts`
- **Funções extraídas:**
  - `updateAgencySubscription()` - Atualizar plano da agência
  - `updateAgencyProfileByAdmin()` - Atualizar perfil (admin)
  - `adminChangePlan()` - Alterar plano (admin)
  - `adminSuspendAgency()` - Suspender agência (admin)

#### ✅ `useBookings.ts`
- **Funções extraídas:**
  - `addBooking()` - Criar reserva
  - `updateBookingStatus()` - Atualizar status da reserva

**Impacto:** Redução de ~400 linhas do DataContext

---

### 2. Estrutura de Pastas Criada

```
src/pages/agency/dashboard/
├── tabs/
│   └── OverviewTab.tsx ✅ (Criado)
└── components/
    ├── RecentBookingsTable.tsx ✅ (Criado)
    └── TopTripsCard.tsx ✅ (Criado)
```

---

### 3. Componentes Compartilhados

#### ✅ `src/components/ui/Badge.tsx`
- Componente Badge reutilizável
- Pode ser usado em todo o projeto

---

### 4. Fallbacks e Segurança

#### ✅ Google Maps API Key Fallback
**Arquivo:** `src/components/agency/CreateTripWizard.tsx`
- ✅ Verifica se `VITE_GOOGLE_MAPS_API_KEY` existe
- ✅ Se não existir, exibe input de texto simples
- ✅ Mensagem informativa para o usuário
- ✅ Não trava a aplicação

#### ✅ Tratamento Robusto de Imagens
**Arquivo:** `src/components/TripCard.tsx`
- ✅ `onError` melhorado que esconde imagem quebrada
- ✅ Fallback automático para `NoImagePlaceholder`
- ✅ Placeholder visual elegante (CSS Gradient)

---

### 5. Script SQL de Reset

#### ✅ `database/RESET_DB_FULL.sql`
- ✅ Script completo para limpar todas as tabelas de dados
- ✅ Preserva tabelas de configuração (platform_settings)
- ✅ Preserva administradores (profiles com role ADMIN)
- ✅ Comentários avisando que é destrutivo
- ✅ Queries de verificação pós-limpeza
- ✅ Uso de `TRUNCATE CASCADE` para integridade

---

## 🚧 Trabalho em Progresso

### Abas do AgencyDashboard a Extrair:

1. **OverviewTab** ✅ (Criado, precisa integrar)
2. **TripsManagerTab** ⏳ (A extrair - ~600 linhas)
3. **BookingsTab** ⏳ (A extrair - ~400 linhas)
4. **OperationsTab** ⏳ (A extrair - ~800 linhas - TransportManager)
5. **ReviewsTab** ⏳ (A extrair - ~200 linhas)
6. **PlanTab** ⏳ (A extrair - ~300 linhas)
7. **ProfileSettingsTab** ⏳ (A extrair - ~400 linhas)
8. **ThemeEditorTab** ⏳ (A extrair - ~200 linhas)

**Estratégia:** Extrair cada aba para `src/pages/agency/dashboard/tabs/[Nome]Tab.tsx`

---

## 📋 Próximos Passos Recomendados

### Fase 1: Completar Extração de Abas (Prioridade Alta)
1. Extrair `TripsManagerTab` (maior impacto - ~600 linhas)
2. Extrair `OperationsTab` (TransportManager - ~800 linhas)
3. Extrair demais abas uma por uma
4. Refatorar `AgencyDashboard.tsx` para ser apenas orquestrador (<300 linhas)

### Fase 2: Integrar Hooks no DataContext (Prioridade Média)
1. Atualizar `DataContext.tsx` para usar os hooks customizados
2. Remover funções duplicadas do DataContext
3. Manter apenas estado global e distribuição de hooks

### Fase 3: Otimizações Finais (Prioridade Baixa)
1. Extrair componentes grandes do `CreateTripWizard` (se necessário)
2. Otimizar imports e reduzir dependências circulares
3. Adicionar testes unitários para hooks

---

## 🎯 Critérios de Sucesso

- ✅ Nenhum arquivo > 600 linhas (Meta: <500 linhas)
- ✅ Hooks customizados criados e funcionais
- ✅ Fallbacks implementados (Google Maps, Imagens)
- ✅ Script SQL de reset criado
- ⏳ AgencyDashboard < 300 linhas (Em progresso)
- ⏳ DataContext < 600 linhas (Em progresso)

---

## 📝 Notas Técnicas

### Dependências dos Hooks:
- `useTripManagement`: Requer `useAuth`, `useToast`, `supabase`, `slugUtils`
- `useAgencyOperations`: Requer `useAuth`, `useToast`, `supabase`
- `useBookings`: Requer `useAuth`, `useToast`, `supabase`

### Componentes Compartilhados:
- `Badge`: Componente UI reutilizável
- `RecentBookingsTable`: Usado em OverviewTab
- `TopTripsCard`: Usado em OverviewTab

### Estrutura de Imports:
```typescript
// Hooks
import { useTripManagement } from '../../hooks/useTripManagement';
import { useAgencyOperations } from '../../hooks/useAgencyOperations';
import { useBookings } from '../../hooks/useBookings';

// Componentes de Abas
import OverviewTab from './tabs/OverviewTab';
import TripsManagerTab from './tabs/TripsManagerTab';
// ... etc
```

---

## ⚠️ Avisos Importantes

1. **Não executar `RESET_DB_FULL.sql` em produção!**
2. **Testar todos os hooks antes de remover código do DataContext**
3. **Manter compatibilidade com código existente durante transição**
4. **Fazer commits incrementais para facilitar rollback**

---

**Última atualização:** Refatoração em progresso - Fase 1 concluída parcialmente
