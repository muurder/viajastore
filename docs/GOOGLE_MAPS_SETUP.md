# Como Configurar a API Key do Google Maps

## 📍 Onde Obter a API Key

1. **Acesse o Google Cloud Console:**
   - Vá para: https://console.cloud.google.com/

2. **Crie um Projeto (ou selecione um existente):**
   - Clique em "Selecionar um projeto" no topo
   - Clique em "Novo Projeto"
   - Dê um nome ao projeto (ex: "ViajaStore Maps")
   - Clique em "Criar"

3. **Ative a API do Maps Embed:**
   - No menu lateral, vá em "APIs e Serviços" > "Biblioteca"
   - Procure por "Maps Embed API"
   - Clique em "Ativar"

4. **Crie uma Credencial (API Key):**
   - Vá em "APIs e Serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "Chave de API"
   - Uma chave será gerada automaticamente

5. **Configure Restrições (Recomendado para Produção):**
   - Clique na chave criada para editá-la
   - Em "Restrições de aplicativo", selecione "Sites HTTP"
   - Adicione os domínios permitidos:
     - `localhost` (para desenvolvimento)
     - Seu domínio de produção (ex: `viajastore.com.br`)
   - Em "Restrições de API", selecione "Restringir chave"
   - Selecione apenas "Maps Embed API"
   - Clique em "Salvar"

## 🔧 Onde Inserir a API Key

1. **Crie o arquivo `.env` na raiz do projeto:**
   ```bash
   # Na raiz do projeto (mesmo nível que package.json)
   touch .env
   ```

2. **Adicione a chave no arquivo `.env`:**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
   ```

   **Exemplo:**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyBFw0Qbyq9zTFTd-tUY6d-s6U4c37ZJMTI
   ```

3. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C) e inicie novamente
   npm run dev
   ```

## ⚠️ Importante

- **Nunca commite o arquivo `.env` no Git** (já está no `.gitignore`)
- A chave atual no código é apenas um fallback e pode não funcionar
- Para produção, configure restrições de domínio na API Key
- O Google Maps tem limites de uso gratuitos (até $200/mês)

## 🆓 Limites Gratuitos

O Google Maps oferece $200 de crédito gratuito por mês, o que cobre aproximadamente:
- 28.000 carregamentos de mapas estáticos
- 28.000 carregamentos de mapas embed

## 🔍 Verificar se Está Funcionando

Após configurar, os mapas devem aparecer em:
- **CreateTripWizard:** Ao buscar uma localização
- **TripDetails:** Na página de detalhes da viagem (se tiver coordenadas)

Se ainda aparecer erro, verifique:
1. Se a API "Maps Embed API" está ativada
2. Se a chave está correta no arquivo `.env`
3. Se o servidor foi reiniciado após adicionar a variável
4. Se as restrições de domínio permitem o acesso

