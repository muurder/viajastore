# Migração de Console.logs para Logger

## Status
- ✅ Logger utility criado (`src/utils/logger.ts`)
- ✅ Debounce implementado nas subscriptions
- ⚠️ Substituição em massa pendente (195 ocorrências em DataContext)

## Como Substituir

### Opção 1: Substituição Manual (Recomendado para revisão)
1. Abra o arquivo
2. Substitua:
   - `console.log(...)` → `logger.log(...)`
   - `console.warn(...)` → `logger.warn(...)`
   - `console.error(...)` → `logger.error(...)` (mantém em produção)
   - `console.info(...)` → `logger.info(...)`
   - `console.debug(...)` → `logger.debug(...)`

### Opção 2: Substituição Automática (VS Code)
1. Abra "Find and Replace" (Ctrl+H)
2. Ative "Use Regular Expression"
3. Substitua:
   - `console\.log\(` → `logger.log(`
   - `console\.warn\(` → `logger.warn(`
   - `console\.info\(` → `logger.info(`
   - `console\.debug\(` → `logger.debug(`
   - **NÃO substitua** `console.error` (mantém em produção)

### Arquivos Prioritários
1. `src/context/DataContext.tsx` (195 ocorrências)
2. `src/context/AuthContext.tsx` (106 ocorrências)
3. `src/pages/AgencyDashboard.tsx` (26 ocorrências)
4. `src/components/agency/CreateTripWizard.tsx` (12 ocorrências)

### Import Necessário
Adicione no topo de cada arquivo:
```typescript
import { logger } from '../utils/logger';
// ou
import { logger } from '../../utils/logger';
```

