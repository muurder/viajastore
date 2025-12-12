# 📋 Log: Como Funciona o Botão "Baixar Voucher PDF"

## 🎯 Objetivo
Documentar como o botão "Baixar Voucher PDF" funciona no CheckoutSuccess para replicar a mesma funcionalidade no ClientDashboard.

---

## 📍 Localização do Botão

### CheckoutSuccess (`src/pages/UtilityPages.tsx`)
- **Linha 162-174**: Botão "Baixar Voucher PDF"
- **Componente**: `CheckoutSuccess`
- **Função chamada**: `generateTicketPDF()`

---

## 🔧 Como Funciona

### 1. **Estrutura do Botão**
```tsx
<button 
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    generateTicketPDF();
  }} 
  disabled={isGeneratingPdf} 
  className="text-xs font-bold text-primary-600 flex items-center hover:underline disabled:opacity-50 cursor-pointer"
  type="button"
>
  {isGeneratingPdf ? <Loader size={12} className="animate-spin mr-1"/> : <Download size={12} className="mr-1"/>}
  Baixar Voucher PDF
</button>
```

### 2. **Função `generateTicketPDF()` (Linha 96-116)**
```typescript
const generateTicketPDF = async () => {
  setIsGeneratingPdf(true);  // Mostra loading
  try {
    if (!booking._trip) {
      throw new Error('Dados da viagem não encontrados');
    }

    await generateTripVoucherPDF({
      booking,
      trip: booking._trip,
      agency: booking._agency || null,
      passengers,  // ← Vem do state: statePassengers || booking?.passengerDetails || []
      voucherCode
    });
  } catch (error: any) {
    logger.error("PDF Generation Error:", error);
    alert(`Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}. Tente novamente.`);
  } finally {
    setIsGeneratingPdf(false);  // Remove loading
  }
};
```

### 3. **Dados dos Passageiros**
- **Fonte**: `passengers` (linha 69)
- **Ordem de prioridade**:
  1. `statePassengers` (vem do `state` da navegação)
  2. `booking?.passengerDetails` (fallback)
  3. `[]` (array vazio se não houver)

### 4. **Função Unificada `generateTripVoucherPDF()`**
- **Localização**: `src/utils/pdfGenerator.ts`
- **Parâmetros**:
  - `booking`: Booking
  - `trip`: Trip
  - `agency`: Agency | null
  - `passengers`: PassengerDetail[]
  - `voucherCode`: string
  - `client?`: Client | null (opcional)

---

## 🔄 Aplicação no ClientDashboard

### ✅ O que já está implementado:
1. ✅ Função `generatePDF()` existe (linha 707)
2. ✅ Busca passageiros do banco (`booking_passengers`)
3. ✅ Usa a mesma função `generateTripVoucherPDF()`
4. ✅ Formata dados no mesmo formato do CheckoutSuccess

### ⚠️ Diferenças que precisam ser corrigidas:
1. **Busca de passageiros**: ClientDashboard busca do banco, CheckoutSuccess usa `state`
2. **Estrutura de dados**: Garantir que seja idêntica

---

## 📝 Passos para Garantir Consistência

### 1. **No ClientDashboard (`src/pages/ClientDashboard.tsx`)**
```typescript
const generatePDF = async () => {
  // 1. Buscar passageiros do banco (já implementado)
  const { data: passengersData } = await supabase
    .from('booking_passengers')
    .select('*')
    .eq('booking_id', selectedBooking.id);

  // 2. Converter para formato PassengerDetail (igual CheckoutSuccess)
  const passengers = passengersData.map(p => ({
    name: p.full_name || p.name || '---',
    document: p.document || p.cpf || '---',
    birthDate: p.birth_date || undefined,
    type: calculateType(p) // Criança/Adulto
  }));

  // 3. Chamar função unificada (MESMA do CheckoutSuccess)
  await generateTripVoucherPDF({
    booking: selectedBooking,
    trip: selectedBooking._trip,
    agency: selectedBooking._agency || null,
    passengers,  // ← Formato idêntico ao CheckoutSuccess
    voucherCode: selectedBooking.voucherCode,
    client: currentClient || null
  });
};
```

### 2. **Garantir que os dados sejam idênticos**
- ✅ Mesma função: `generateTripVoucherPDF()`
- ✅ Mesmo formato de `passengers`: `PassengerDetail[]`
- ✅ Mesmos parâmetros passados

---

## 🎨 Melhorias no PDF (Solicitadas)

### Adicionar:
1. ✅ **Logo da Agência** (topo esquerdo, 30x30px)
2. ✅ **Detalhes da Viagem** (minimalista e clean):
   - Título da viagem
   - Data
   - Destino
   - Duração (se disponível)
   - Código da reserva destacado

### Design:
- Fundo branco (clean)
- Logo da agência no topo
- Informações organizadas de forma minimalista
- Código da reserva em destaque

---

## ✅ Resultado Final

Ambos os PDFs (CheckoutSuccess e ClientDashboard) agora:
1. ✅ Usam a mesma função `generateTripVoucherPDF()`
2. ✅ Têm o mesmo formato de dados
3. ✅ Incluem logo da agência
4. ✅ Mostram detalhes da viagem de forma minimalista
5. ✅ Listam todos os passageiros corretamente

---

## 🔍 Debug

Para verificar se está funcionando:
1. Abra o console do navegador (F12)
2. Procure por logs:
   - `"PDF Generator: Processing X passenger(s)"`
   - `"Generating PDF with X passenger(s)"`
3. Verifique se todos os passageiros aparecem nos logs

---

**Última atualização**: Agora com logo da agência e detalhes da viagem no PDF
