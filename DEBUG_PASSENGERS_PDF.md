# 🐛 Debug: Passageiros não aparecem no PDF

## 📋 Problema Reportado
O PDF gerado no dashboard do cliente mostra apenas o passageiro principal (comprador), mas não mostra os acompanhantes.

## ✅ Correções Implementadas

### 1. **Logs Detalhados Adicionados**
- Logs na busca do banco de dados
- Logs na formatação dos passageiros
- Logs no gerador de PDF
- Logs mostrando cada passageiro individualmente

### 2. **Busca Sempre do Banco**
- A função `generatePDF` agora SEMPRE busca passageiros diretamente do banco
- Não depende apenas do estado `bookingPassengers`

### 3. **Formatação Corrigida**
- Todos os passageiros são incluídos, mesmo sem documento
- Suporte a múltiplos campos de nome (`name`, `full_name`, `nome`)
- Formatação de CPF correta

## 🔍 Como Debuggar

### Passo 1: Abrir Console do Navegador
1. Pressione `F12` para abrir DevTools
2. Vá para a aba "Console"

### Passo 2: Gerar PDF e Verificar Logs
1. Clique em "Abrir Voucher" no dashboard
2. Clique em "Baixar PDF"
3. Procure pelos seguintes logs no console:

```
🔍 Fetching passengers for booking [ID]...
✅ Found X passengers in database for booking [ID]
Raw database records: [...]
DB Record 1: {...}
DB Record 2: {...}
...
=== PASSENGER DATA ANALYSIS ===
=== FINAL PASSENGERS ARRAY TO PDF ===
  [1] Name: "..." | Document: "..." | Type: "..."
  [2] Name: "..." | Document: "..." | Type: "..."
...
=== PDF GENERATOR: Processing X passenger(s) ===
PDF Table Row 1: "..." | "..." | "..."
PDF Table Row 2: "..." | "..." | "..."
```

### Passo 3: Verificar o Problema

#### Se `Found 0 passengers in database`:
- **Problema**: Os passageiros não foram salvos no banco
- **Solução**: Verificar se `addBooking` está salvando corretamente
- **Verificar**: Logs de `[DataContext] Passenger details saved successfully`

#### Se `Found X passengers` mas `Passengers formatted: 0`:
- **Problema**: Erro na formatação dos dados
- **Solução**: Verificar os logs de "Raw database records"

#### Se `Passengers formatted: X` mas PDF mostra menos:
- **Problema**: Erro no gerador de PDF
- **Solução**: Verificar logs de "PDF Table Row"

## 🔧 Verificações no Banco de Dados

Execute esta query no Supabase para verificar os passageiros:

```sql
SELECT 
  id,
  booking_id,
  full_name,
  document,
  cpf,
  birth_date,
  is_primary,
  created_at
FROM booking_passengers
WHERE booking_id = '[BOOKING_ID_AQUI]'
ORDER BY created_at ASC;
```

Substitua `[BOOKING_ID_AQUI]` pelo ID da reserva que está com problema.

## 📝 Checklist de Verificação

- [ ] Verificar se os passageiros foram salvos no banco (query SQL acima)
- [ ] Verificar logs do console ao gerar PDF
- [ ] Verificar se `passengersData.length > 0` nos logs
- [ ] Verificar se `passengers.length > 0` após formatação
- [ ] Verificar se todos os passageiros aparecem em "PDF Table Row"

## 🎯 Próximos Passos

1. **Execute o teste** e copie todos os logs do console
2. **Execute a query SQL** e verifique quantos passageiros existem no banco
3. **Compare** o número de passageiros no banco com o número que aparece nos logs
4. **Reporte** os resultados para identificar onde está o problema

---

**Última atualização**: Logs detalhados adicionados para rastrear o problema
