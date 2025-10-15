# 🔧 Troubleshooting - Agente SDR

## ✅ Status Atual

**Verificação feita agora:**
- ✅ Servidor SDR está rodando (porta 3002)
- ✅ Agente IA está respondendo corretamente
- ✅ Detecção de agendamento funcionando
- ✅ Redis conectado ao Upstash
- ✅ Integração Calendly configurada

**Teste realizado:**
```json
{
  "message": "Quero agendar uma visita",
  "response": "Que ótimo! Posso agendar uma visita para você..."
}
```

## ❌ Possíveis Problemas

### 1. Webhook do WhatsApp Não Configurado

**Sintoma:** Cliente envia mensagem no WhatsApp mas o bot não responde

**Causa:** Evolution API não está enviando mensagens para o servidor SDR

**Solução:**

#### Passo 1: Verificar se servidor está acessível

```bash
# Local (deve funcionar)
curl http://localhost:3002/health

# Externo (deve funcionar se estiver em produção)
curl https://bs-consultoria.vercel.app/health
```

#### Passo 2: Configurar webhook na Evolution API

**Acesse:** https://chat.layermarketing.com.br

1. Faça login
2. Vá em **Instância:** BS_Consultoria
3. Clique em **Settings** > **Webhook**
4. Configure:
   - **URL:** `https://bs-consultoria.vercel.app/webhook/whatsapp`
   - **Events:** `messages.upsert`
   - **Enabled:** ✅ Sim

5. Clique em **Save**

#### Passo 3: Testar webhook

```bash
# Enviar mensagem de teste
curl -X POST https://chat.layermarketing.com.br/message/sendText/BS_Consultoria \
  -H "Content-Type: application/json" \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32" \
  -d '{
    "number": "5511999999999",
    "text": "Teste do webhook"
  }'
```

### 2. Servidor Rodando Apenas Localmente

**Sintoma:** Testes na API funcionam, mas WhatsApp não responde

**Causa:** Servidor está rodando em `localhost`, não acessível pela internet

**Solução:**

#### Opção A: Deploy em Produção (Recomendado)

**Vercel:**
```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Deploy
cd /Users/admin/Desktop/Projetos\ código/bs-consultoria-net-style-main
vercel --prod

# 3. Configurar variáveis de ambiente
vercel env add OPENAI_API_KEY
vercel env add EVOLUTION_API_URL
# ... adicionar todas as variáveis do .env.local
```

**Railway:**
```bash
# 1. Criar conta em railway.app
# 2. Conectar repositório
# 3. Configurar variáveis de ambiente
# 4. Deploy automático
```

#### Opção B: Usar ngrok (Desenvolvimento)

```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Iniciar tunnel
ngrok http 3002

# 3. Copiar URL (ex: https://abc123.ngrok.io)

# 4. Configurar webhook na Evolution API
# URL: https://abc123.ngrok.io/webhook/whatsapp
```

### 3. Variáveis de Ambiente Faltando

**Sintoma:** Erro ao processar mensagens

**Verificar `.env.local`:**

```bash
# Verificar se todas as variáveis estão configuradas
cat .env.local | grep -E "(OPENAI_API_KEY|EVOLUTION_API_URL|EVOLUTION_API_KEY|CALENDLY_API_KEY|REDIS)"
```

**Variáveis obrigatórias:**
```bash
OPENAI_API_KEY=sk-proj-...
EVOLUTION_API_URL=https://chat.layermarketing.com.br
EVOLUTION_API_KEY=821A7182F9D1-4D51-BFE4-BCDA23DA3A32
EVOLUTION_INSTANCE=BS_Consultoria
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
CALENDLY_API_KEY=eyJ...
```

### 4. Evolution API Offline

**Sintoma:** Mensagens não chegam

**Verificar status:**

```bash
curl https://chat.layermarketing.com.br/instance/connectionState/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"
```

**Resposta esperada:**
```json
{
  "state": "open"
}
```

**Se offline:**
1. Acesse https://chat.layermarketing.com.br
2. Vá na instância BS_Consultoria
3. Clique em **Connect**
4. Escaneie o QR Code com o WhatsApp Business

### 5. OpenAI API Limit/Erro

**Sintoma:** Bot não responde ou responde com erro

**Verificar créditos OpenAI:**
https://platform.openai.com/usage

**Testar API:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(grep OPENAI_API_KEY .env.local | cut -d'=' -f2)"
```

## 🔍 Comandos de Diagnóstico

### 1. Verificar se servidor está rodando

```bash
curl http://localhost:3002/health
```

**Esperado:** `{"status":"ok","service":"SDR Agent"}`

### 2. Testar IA localmente

```bash
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"5511999999999","message":"Olá"}'
```

### 3. Ver conversas ativas

```bash
curl http://localhost:3002/api/conversations
```

### 4. Ver lembretes agendados

```bash
curl http://localhost:3002/api/reminders
```

### 5. Testar agendamento

```bash
curl -X POST http://localhost:3002/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "João Teste",
    "propertyId": "125"
  }'
```

### 6. Ver logs do servidor

```bash
# Se rodando com node direto
# Veja o terminal onde iniciou

# Se rodando com PM2
pm2 logs sdr-server

# Se rodando em background
ps aux | grep sdr-server
```

## 📋 Checklist de Verificação

- [ ] Servidor SDR rodando (`curl http://localhost:3002/health`)
- [ ] Todas as variáveis em `.env.local` configuradas
- [ ] Evolution API conectada e online
- [ ] Webhook configurado na Evolution API
- [ ] URL do webhook acessível externamente
- [ ] OpenAI API com créditos
- [ ] Redis conectado
- [ ] Calendly configurado

## 🚀 Reiniciar Servidor

Se fez mudanças no código ou variáveis:

```bash
# Parar servidor
pkill -f sdr-server

# Iniciar novamente
node server/sdr-server.js

# Ou com PM2
pm2 restart sdr-server
```

## 📞 Teste Completo End-to-End

1. **Enviar mensagem no WhatsApp:**
   ```
   Olá
   ```

2. **Bot deve responder:**
   ```
   Oi! Sou a Susi 😊 Me conta: quantos quartos você precisa?...
   ```

3. **Continuar conversa:**
   ```
   Quero 2 quartos
   ```

4. **Bot deve recomendar imóveis:**
   ```
   Perfeito! Achei 2 ótimas opções...
   ```

5. **Pedir fotos:**
   ```
   Quero ver o primeiro
   ```

6. **Bot deve enviar fotos + detalhes**

7. **Agendar visita:**
   ```
   Quero agendar uma visita
   ```

8. **Bot deve enviar link Calendly**

## 🔧 Reset Completo

Se nada funcionar, fazer reset:

```bash
# 1. Parar tudo
pkill -f sdr-server
pm2 delete all

# 2. Limpar Redis (opcional)
# Acesse: https://console.upstash.com
# Limpe o banco de dados

# 3. Reconfigurar .env.local
cp .env.calendly.example .env.local
# Edite com suas credenciais

# 4. Reinstalar dependências
npm install

# 5. Iniciar servidor
node server/sdr-server.js
```

## 📧 Logs Importantes

Ao pedir ajuda, inclua:

1. **Status do servidor:**
```bash
curl http://localhost:3002/health
```

2. **Última conversa:**
```bash
curl http://localhost:3002/api/conversations
```

3. **Logs do terminal** (últimas 50 linhas)

4. **Resposta da Evolution API:**
```bash
curl https://chat.layermarketing.com.br/instance/connectionState/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"
```

---

**Problema resolvido?** Atualize a documentação! 📝
