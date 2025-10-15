# 📅 Guia de Configuração: Integração Calendly

Este guia explica como configurar completamente a integração do Agente SDR com o Calendly para agendamento automático de visitas a imóveis.

## 📋 Índice

1. [Funcionalidades](#funcionalidades)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Calendly](#configuração-do-calendly)
4. [Configuração das Variáveis de Ambiente](#configuração-das-variáveis-de-ambiente)
5. [Configuração do Webhook](#configuração-do-webhook)
6. [Testando a Integração](#testando-a-integração)
7. [Fluxo Completo](#fluxo-completo)
8. [Troubleshooting](#troubleshooting)

## ✨ Funcionalidades

A integração com Calendly oferece:

✅ **Agendamento Automático**
- Cliente pede para agendar visita via WhatsApp
- Sistema gera link personalizado do Calendly
- Link inclui informações do imóvel automaticamente

✅ **Notificações Automáticas**
- Confirmação enviada ao cliente após agendamento
- Notificação enviada ao corretor com dados do cliente
- Mensagens incluem todos os detalhes da visita

✅ **Lembretes Automáticos**
- Cliente recebe lembrete 1 hora antes da visita
- Corretor também recebe lembrete 1 hora antes
- Lembretes incluem endereço e orientações

✅ **Gerenciamento de Cancelamentos**
- Notificação automática quando cliente cancela
- Corretor é avisado imediatamente
- Lembretes são cancelados automaticamente

## 🔧 Pré-requisitos

### 1. Conta Calendly

**Opção A: Conta Básica (Gratuita)**
- ✅ Cria links de agendamento
- ✅ Gerencia disponibilidade
- ❌ Não tem API
- ❌ Não recebe webhooks automáticos

**Opção B: Conta Pro/Premium (Recomendado)**
- ✅ Tudo da conta básica
- ✅ API completa
- ✅ Webhooks automáticos
- ✅ Perguntas personalizadas
- ✅ Integração total

💡 **Recomendação:** Comece com a conta básica para testar. Upgrade para Pro quando precisar de automação completa.

### 2. Servidor Público

Você precisa de um servidor com URL pública para receber webhooks:

**Opções:**
- **Produção:** Vercel, Railway, Heroku, DigitalOcean
- **Desenvolvimento:** ngrok, localtunnel

### 3. Dependências Instaladas

```bash
npm install @upstash/redis node-fetch dotenv express cors
```

## 🎯 Configuração do Calendly

### Passo 1: Criar Tipo de Evento

1. Acesse [calendly.com](https://calendly.com)
2. Vá em **Event Types**
3. Clique em **+ New Event Type**
4. Configure:
   - **Nome:** Visita a Imóvel
   - **Duração:** 30-60 minutos
   - **Localização:** Custom (será preenchido com endereço do imóvel)
   - **Descrição:** Template básica (será personalizada por imóvel)

### Passo 2: Configurar Perguntas Personalizadas

Na página do seu evento, vá em **Add Questions** e adicione:

1. **Telefone para contato**
   - Tipo: Short Text
   - Obrigatório: Sim
   - Posição: 1

2. **Imóvel de Interesse**
   - Tipo: Long Text
   - Obrigatório: Sim
   - Posição: 2

3. **Endereço do Imóvel**
   - Tipo: Long Text
   - Obrigatório: Não
   - Posição: 3

4. **Link do Imóvel**
   - Tipo: URL
   - Obrigatório: Não
   - Posição: 4

### Passo 3: Configurar Notificações

Em **Notifications and Cancellation Policy**:

1. Ative notificações por email para você
2. Configure política de cancelamento (recomendado: até 24h antes)
3. Ative lembretes automáticos do Calendly (além dos nossos)

### Passo 4: Obter URL Pública (Conta Básica)

1. Na página do evento, clique em **Copy Link**
2. Exemplo: `https://calendly.com/bs-consultoria/visita-imovel`
3. Salve este link - você vai usar nas variáveis de ambiente

### Passo 5: Obter Credenciais API (Conta Pro/Premium)

#### 5.1 - Gerar API Key

1. Vá em [calendly.com/integrations/api_webhooks](https://calendly.com/integrations/api_webhooks)
2. Clique em **Get a token**
3. Copie e salve o token (só aparece uma vez!)

#### 5.2 - Obter User URI

```bash
curl https://api.calendly.com/users/me \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Na resposta, copie o valor de `resource.uri`. Exemplo:
```
https://api.calendly.com/users/AAAAAAAAAAAAAAAA
```

#### 5.3 - Obter Event Type URI

```bash
curl "https://api.calendly.com/event_types?user=YOUR_USER_URI" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Na resposta, encontre seu evento "Visita a Imóvel" e copie o `uri`. Exemplo:
```
https://api.calendly.com/event_types/BBBBBBBBBBBBBBBB
```

## ⚙️ Configuração das Variáveis de Ambiente

### 1. Copiar arquivo de exemplo

```bash
cp .env.calendly.example .env.local
```

### 2. Editar .env.local

Abra `.env.local` e adicione:

```bash
# Calendly - Conta Básica (mínimo necessário)
CALENDLY_PUBLIC_URL=https://calendly.com/seu-usuario/visita-imovel

# Calendly - Conta Pro/Premium (adicional)
CALENDLY_API_KEY=seu_token_aqui
CALENDLY_USER_URI=https://api.calendly.com/users/XXXXXXXX
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/XXXXXXXX

# Corretor
REALTOR_PHONE=5511981598027

# Webhook (seu servidor público)
WEBHOOK_BASE_URL=https://seu-dominio.com
SDR_PORT=3002
```

### 3. Verificar outras variáveis obrigatórias

Certifique-se de ter também:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE=...

# Baserow
VITE_BASEROW_API_URL=...
VITE_BASEROW_TOKEN=...
VITE_BASEROW_TABLE_ID=...

# Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Website
SITE_BASE_URL=https://bs-consultoria.vercel.app
```

## 🔗 Configuração do Webhook

### Para Conta Pro/Premium

#### 1. Criar Webhook no Calendly

1. Acesse [calendly.com/integrations/api_webhooks](https://calendly.com/integrations/api_webhooks)
2. Clique em **Create Webhook**
3. Configure:
   - **URL:** `https://seu-dominio.com/webhook/calendly`
   - **Events to subscribe:**
     - ✅ `invitee.created`
     - ✅ `invitee.canceled`
   - **Scope:** Organization
4. Clique em **Save**

#### 2. Testar Webhook

```bash
# Em um terminal, inicie o servidor
node server/sdr-server.js

# Em outro terminal, faça um teste
curl -X POST http://localhost:3002/webhook/calendly \
  -H "Content-Type: application/json" \
  -d '{"event": "invitee.created", "payload": {"event": "test"}}'
```

Você deve ver no log:
```
Received Calendly webhook: {...}
```

### Para Desenvolvimento Local (ngrok)

#### 1. Instalar ngrok

```bash
# macOS
brew install ngrok

# Linux/Windows
# Baixe de: https://ngrok.com/download
```

#### 2. Iniciar ngrok

```bash
ngrok http 3002
```

Você verá algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3002
```

#### 3. Configurar webhook com URL do ngrok

Use `https://abc123.ngrok.io/webhook/calendly` como URL do webhook no Calendly.

⚠️ **IMPORTANTE:** A URL do ngrok muda toda vez que você reinicia. Use um domínio fixo em produção.

## 🧪 Testando a Integração

### Teste 1: Criar Link de Agendamento

```bash
curl -X POST http://localhost:3002/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "João Silva",
    "customerEmail": "joao@example.com",
    "propertyId": "125"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "schedulingLink": "https://calendly.com/...",
  "propertyTitle": "Apartamento Parque Scaffidi",
  "customerName": "João Silva"
}
```

### Teste 2: Simular Agendamento via WhatsApp

```bash
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "message": "Quero agendar uma visita",
    "propertyId": "125"
  }'
```

### Teste 3: Verificar Lembretes Agendados

```bash
curl http://localhost:3002/api/reminders
```

Resposta esperada:
```json
{
  "success": true,
  "count": 2,
  "reminders": [...]
}
```

## 🔄 Fluxo Completo

### 1. Cliente Solicita Agendamento

**WhatsApp:**
```
Cliente: Quero agendar uma visita ao Residencial Bela Vista
```

### 2. Sistema Gera Link

**Agente SDR:**
- Detecta intenção de agendamento
- Identifica o imóvel (Residencial Bela Vista)
- Gera link personalizado do Calendly
- Envia para o cliente

**WhatsApp:**
```
Susi: Ótimo, João! 🎉

Para agendar sua visita ao Residencial Bela Vista,
acesse o link abaixo e escolha o melhor horário:

🗓️ https://calendly.com/bs-consultoria/visita?a1=...

Você receberá uma confirmação por e-mail com todos
os detalhes da visita.
```

### 3. Cliente Agenda no Calendly

- Cliente clica no link
- Escolhe data e horário
- Preenche informações
- Confirma agendamento

### 4. Webhooks são Disparados

**Calendly → Seu Servidor:**
```
POST /webhook/calendly
Event: invitee.created
```

### 5. Sistema Envia Confirmações

**Para o Cliente (WhatsApp):**
```
✅ VISITA CONFIRMADA!

Olá João! Sua visita foi agendada com sucesso! 🎉

📍 Imóvel: Residencial Bela Vista
📌 Endereço: Av. Principal, 100 - Centro
📅 Data: Sábado, 20 de outubro de 2025
⏰ Horário: 14:00

O que levar:
• Documento com foto (RG ou CNH)
• Comprovante de renda (se for solicitar financiamento)

Você receberá um lembrete 1 hora antes da visita.
```

**Para o Corretor (WhatsApp):**
```
🔔 NOVA VISITA AGENDADA

Cliente: João Silva
Telefone: 5511999999999

📍 Imóvel: Residencial Bela Vista
📌 Endereço: Av. Principal, 100 - Centro
🔗 Link: https://bs-consultoria.vercel.app/imovel/125

📅 Data: Sábado, 20 de outubro de 2025
⏰ Horário: 14:00

⚠️ Você receberá um lembrete 1 hora antes da visita.
```

### 6. Lembretes Automáticos (1h antes)

**Para o Cliente:**
```
⏰ LEMBRETE DE VISITA

Olá João! Sua visita está chegando!

📍 Imóvel: Residencial Bela Vista
📌 Endereço: Av. Principal, 100 - Centro
⏰ Horário: 14:00 (daqui a 1 hora)

Não se esqueça de levar:
• Documento com foto (RG ou CNH)
• Comprovante de renda

Nos vemos em breve! 🏡
```

**Para o Corretor:**
```
⏰ LEMBRETE - VISITA EM 1 HORA

Cliente: João Silva
Telefone: 5511999999999

📍 Imóvel: Residencial Bela Vista
📌 Endereço: Av. Principal, 100 - Centro
⏰ Horário: 14:00

Prepare-se para a visita! 🏡
```

### 7. Se Cliente Cancelar

**Webhooks:**
```
POST /webhook/calendly
Event: invitee.canceled
```

**Sistema:**
- Cancela lembrete agendado
- Notifica cliente
- Notifica corretor

## 🐛 Troubleshooting

### Problema: Webhook não recebe eventos

**Verificações:**

1. **Servidor acessível?**
```bash
curl https://seu-dominio.com/health
```

2. **Webhook configurado corretamente no Calendly?**
- Vá em Integrations > Webhooks
- Verifique URL: `https://seu-dominio.com/webhook/calendly`
- Verifique eventos: `invitee.created`, `invitee.canceled`

3. **Logs do servidor:**
```bash
# Ver logs em tempo real
tail -f logs/sdr-agent.log

# Com PM2
pm2 logs sdr-server
```

### Problema: Links não estão sendo gerados

**Verificações:**

1. **Variáveis de ambiente configuradas?**
```bash
node -e "console.log(process.env.CALENDLY_PUBLIC_URL)"
```

2. **Agente detecta intenção de agendamento?**
- Teste com mensagens diretas: "quero agendar", "marcar visita"
- Verifique logs: `Scheduling intent detected`

3. **Imóvel existe?**
```bash
curl http://localhost:3001/api/properties | grep "propertyId"
```

### Problema: Confirmações não são enviadas

**Verificações:**

1. **Evolution API está funcionando?**
```bash
curl http://localhost:3002/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "message": "Teste"
  }'
```

2. **Webhook do Calendly está disparando?**
- Verifique logs após criar um agendamento de teste
- Deve aparecer: `Received Calendly webhook`

3. **Dados estão sendo parseados corretamente?**
- Verifique que as perguntas personalizadas estão configuradas
- Teste agendando manualmente no Calendly

### Problema: Lembretes não são enviados

**Verificações:**

1. **Redis está conectado?**
```bash
curl http://localhost:3002/api/reminders
```

2. **Lembrete foi agendado?**
- Verifique resposta da API de reminders
- Deve mostrar lembretes pendentes

3. **Horário do servidor está correto?**
```bash
date
```

4. **Delay está correto?**
- Lembretes são enviados 1h antes
- Agende um evento para daqui a 2h e monitore

### Problema: Conta básica - recursos limitados

**Soluções:**

1. **Usar links públicos** (já implementado)
   - Funciona sem API key
   - Não recebe webhooks automáticos
   - Requer confirmação manual via email

2. **Upgrade para Pro**
   - Habilita API completa
   - Webhooks automáticos
   - Melhor experiência

3. **Alternativa: Polling**
   - Verificar agendamentos periodicamente
   - Menos eficiente que webhooks
   - Requer implementação adicional

## 📊 Monitoramento

### Dashboard de Lembretes

```bash
curl http://localhost:3002/api/reminders
```

### Conversas Ativas

```bash
curl http://localhost:3002/api/conversations
```

### Estatísticas do Redis

```bash
node -e "
import('./server/redis-client.js').then(async (m) => {
  const stats = await m.getRedisStats();
  console.log(stats);
});
"
```

## 🚀 Deploy em Produção

### 1. Configurar Variáveis no Servidor

```bash
# Vercel
vercel env add CALENDLY_API_KEY
vercel env add CALENDLY_USER_URI
# ... etc

# Ou Railway
railway variables set CALENDLY_API_KEY=...
```

### 2. Atualizar Webhook URL

Após deploy, atualize webhook no Calendly:
```
https://seu-dominio-producao.com/webhook/calendly
```

### 3. Testar em Produção

```bash
curl https://seu-dominio-producao.com/health
curl https://seu-dominio-producao.com/api/reminders
```

## 📚 Recursos Adicionais

- [Calendly API Docs](https://developer.calendly.com/)
- [Webhooks Guide](https://developer.calendly.com/api-docs/webhooks)
- [ngrok Documentation](https://ngrok.com/docs)
- [Upstash Redis Docs](https://docs.upstash.com/)

## 💡 Dicas Finais

1. **Comece simples:** Use conta básica primeiro
2. **Teste localmente:** Use ngrok para desenvolvimento
3. **Monitore logs:** Mantenha logs ativos em produção
4. **Backup de dados:** Redis já persiste, mas faça backups
5. **Rate limiting:** Implemente limites para evitar spam

---

**Documentação criada para BS Consultoria de Imóveis**
*Última atualização: Outubro 2025*
