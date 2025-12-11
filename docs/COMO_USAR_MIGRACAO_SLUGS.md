# Como Usar a Migração de Slugs

## 📋 Arquivos Disponíveis

1. **`SUPABASE_MIGRATE_ALL_SLUGS.sql`** ⭐ **RECOMENDADO**
   - Migração completa (agências + viagens)
   - Execute este se quiser corrigir tudo de uma vez

2. **`SUPABASE_GENERATE_AGENCY_SLUGS.sql`**
   - Apenas para agências
   - Use se quiser fazer por partes

3. **`SUPABASE_GENERATE_TRIP_SLUGS.sql`**
   - Apenas para viagens
   - Use se quiser fazer por partes

## 🚀 Passo a Passo

### Opção 1: Migração Completa (Recomendado)

1. **Abra o SQL Editor no Supabase**
   - Vá para o painel do Supabase
   - Clique em "SQL Editor"
   - Clique em "New query"

2. **Copie e cole o conteúdo de `SUPABASE_MIGRATE_ALL_SLUGS.sql`**

3. **Execute o script**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Aguarde a execução (pode levar alguns minutos se houver muitos registros)

4. **Verifique os resultados**
   - O script mostrará mensagens (NOTICE) para cada registro atualizado
   - Verifique a seção "VERIFICAÇÃO FINAL" no final do script

### Opção 2: Migração por Partes

#### Parte 1: Agências

1. Execute `SUPABASE_GENERATE_AGENCY_SLUGS.sql`
2. Verifique se todas as agências têm slug
3. Se tudo estiver OK, continue para viagens

#### Parte 2: Viagens

1. Execute `SUPABASE_GENERATE_TRIP_SLUGS.sql`
2. Verifique se todas as viagens têm slug
3. Pronto!

## ⚠️ Antes de Executar

### 1. Faça Backup

```sql
-- Backup de agências
CREATE TABLE agencies_backup AS SELECT * FROM agencies;

-- Backup de viagens
CREATE TABLE trips_backup AS SELECT * FROM trips;
```

### 2. Verifique o Estado Atual

```sql
-- Ver quantas agências precisam de slug
SELECT COUNT(*) FROM agencies 
WHERE (slug IS NULL OR slug = '') AND deleted_at IS NULL;

-- Ver quantas viagens precisam de slug
SELECT COUNT(*) FROM trips 
WHERE slug IS NULL OR slug = '';
```

## ✅ Após Executar

### Verificar Resultados

```sql
-- Verificar agências sem slug (deve ser 0)
SELECT COUNT(*) as sem_slug
FROM agencies
WHERE (slug IS NULL OR slug = '') AND deleted_at IS NULL;

-- Verificar viagens sem slug (deve ser 0)
SELECT COUNT(*) as sem_slug
FROM trips
WHERE slug IS NULL OR slug = '';

-- Verificar slugs duplicados de agências (deve ser 0)
SELECT slug, COUNT(*) as count
FROM agencies
WHERE slug IS NOT NULL AND deleted_at IS NULL
GROUP BY slug
HAVING COUNT(*) > 1;

-- Verificar slugs duplicados de viagens (por agência, deve ser 0)
SELECT agency_id, slug, COUNT(*) as count
FROM trips
WHERE slug IS NOT NULL
GROUP BY agency_id, slug
HAVING COUNT(*) > 1;
```

## 🔧 Se Algo Der Errado

### Restaurar Backup

```sql
-- Restaurar agências
TRUNCATE agencies;
INSERT INTO agencies SELECT * FROM agencies_backup;

-- Restaurar viagens
TRUNCATE trips;
INSERT INTO trips SELECT * FROM trips_backup;
```

### Ver Logs de Erro

O Supabase SQL Editor mostra erros em vermelho. Se houver erro:
1. Leia a mensagem de erro
2. Verifique qual linha causou o problema
3. Execute apenas a parte que funciona
4. Corrija manualmente o que deu erro

## 📊 O Que o Script Faz

### Para Agências:
1. ✅ Remove números aleatórios de slugs existentes (`agencia-123` → `agencia`)
2. ✅ Gera slugs para agências sem slug
3. ✅ Garante que slugs sejam únicos
4. ✅ Corrige duplicatas adicionando sufixo numérico

### Para Viagens:
1. ✅ Gera slugs para viagens sem slug
2. ✅ Garante que slugs sejam únicos dentro da mesma agência
3. ✅ Corrige duplicatas adicionando sufixo numérico

## 💡 Dicas

1. **Execute em horário de baixo tráfego** se possível
2. **Monitore o tempo de execução** - pode levar alguns minutos
3. **Verifique os NOTICE messages** - mostram o progresso
4. **Teste em ambiente de desenvolvimento primeiro** se tiver

## 🎯 Resultado Esperado

Após executar:
- ✅ Todas as agências têm slug único
- ✅ Todas as viagens têm slug único (dentro da mesma agência)
- ✅ Slugs sem números aleatórios desnecessários
- ✅ URLs funcionando corretamente

---

**Pronto para executar?** Use `SUPABASE_MIGRATE_ALL_SLUGS.sql` para migração completa! 🚀

