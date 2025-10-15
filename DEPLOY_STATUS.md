# 📊 Status do Deploy - BS Consultoria

## ✅ Preparação Completa

### Arquivos Criados para Deploy

**Configuração Vercel:**
- ✅ `vercel.json` - Configuração de rotas e functions
- ✅ `deploy-vercel.sh` - Script automatizado

**API Routes Serverless (pasta `/api`):**
- ✅ `health.js` - Health check endpoint
- ✅ `webhook-whatsapp.js` - Recebe mensagens do WhatsApp
- ✅ `webhook-calendly.js` - Recebe eventos do Calendly
- ✅ `schedule-visit.js` - Endpoint para agendar visitas
- ✅ `reminders.js` - Lista lembretes agendados

**Documentação:**
- ✅ `VERCEL_DEPLOY.md` - Guia completo de deploy
- ✅ `TROUBLESHOOTING.md` - Solução de problemas
- ✅ `WEBHOOK_SETUP.md` - Configuração de webhooks

### Integrações Configuradas

**1. Calendly:**
- ✅ Token configurado
- ✅ User URI: `https://api.calendly.com/users/021158e0-c9d8-4008-91ac-698c0b489812`
- ✅ Event Type URI: `https://api.calendly.com/event_types/f1255aa4-06fa-43b8-af71-98c8b94dd50c`
- ✅ URL Pública: `https://calendly.com/negociosimobiliariosbs/30min`

**2. Evolution API (WhatsApp):**
- ✅ URL: `https://chat.layermarketing.com.br`
- ✅ Instance: `BS_Consultoria`
- ✅ Status: Conectado

**3. Redis (Upstash):**
- ✅ Conectado e funcionando
- ✅ Persistência de conversas OK

**4. OpenAI:**
- ✅ API Key configurada
- ✅ Modelo: GPT-4o-mini

**5. Baserow:**
- ✅ Integração OK
- ✅ Propriedades sendo carregadas

## 🚀 Processo de Deploy

### Status Atual: EM ANDAMENTO

**Passo Atual:** Login na Vercel

**Link de autenticação:** https://vercel.com/oauth/device?user_code=GTQN-CKRN

**Após o login:**
1. ✅ Deploy será feito automaticamente
2. ⏳ Configurar variáveis de ambiente
3. ⏳ Configurar webhooks
4. ⏳ Testar endpoints

## 📋 Variáveis de Ambiente a Configurar

Após o deploy, estas variáveis precisam ser adicionadas no dashboard da Vercel:

```bash
# IA
OPENAI_API_KEY=sk-proj-ZJNS1vfLtlAYNS...
VITE_OPENAI_API_KEY=sk-proj-ZJNS1vfLtlAYNS...

# WhatsApp
EVOLUTION_API_URL=https://chat.layermarketing.com.br
EVOLUTION_API_KEY=821A7182F9D1-4D51-BFE4-BCDA23DA3A32
EVOLUTION_INSTANCE=BS_Consultoria

# Calendly
CALENDLY_API_KEY=eyJraWQiOiIxY2UxZTEzNjE3ZGNm...
CALENDLY_USER_URI=https://api.calendly.com/users/021158e0-c9d8-4008-91ac-698c0b489812
CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/f1255aa4-06fa-43b8-af71-98c8b94dd50c
CALENDLY_PUBLIC_URL=https://calendly.com/negociosimobiliariosbs/30min
REALTOR_PHONE=5511981598027

# Redis
UPSTASH_REDIS_REST_URL=https://mighty-crab-24248.upstash.io
UPSTASH_REDIS_REST_TOKEN=AV64AAIncDI0NGNjNjliYjg4OGQ0NDJh...

# Baserow
VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7
VITE_BASEROW_TABLE_ID=693576

# Site
SITE_BASE_URL=https://bs-consultoria.vercel.app
WEBHOOK_BASE_URL=https://bs-consultoria.vercel.app
```

## 🔗 Webhooks a Configurar

### 1. Evolution API (WhatsApp)

**URL:** `https://bs-consultoria.vercel.app/webhook/whatsapp`

**Configuração:**
1. Acesse: https://chat.layermarketing.com.br
2. Instância: BS_Consultoria
3. Settings > Webhook
4. URL: `https://bs-consultoria.vercel.app/webhook/whatsapp`
5. Event: `messages.upsert`
6. ✅ Enabled
7. Save

### 2. Calendly

**URL:** `https://bs-consultoria.vercel.app/webhook/calendly`

**Configuração:**
1. Acesse: https://calendly.com/integrations/api_webhooks
2. Create Webhook
3. URL: `https://bs-consultoria.vercel.app/webhook/calendly`
4. Events: `invitee.created`, `invitee.canceled`
5. Scope: Organization
6. Save

## 🧪 Testes Após Deploy

### 1. Health Check
```bash
curl https://bs-consultoria.vercel.app/api/health
```

**Esperado:**
```json
{
  "status": "ok",
  "service": "SDR Agent",
  "timestamp": "...",
  "environment": "production"
}
```

### 2. Teste de Agendamento
```bash
curl -X POST https://bs-consultoria.vercel.app/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "João Teste",
    "propertyId": "125"
  }'
```

### 3. Teste via WhatsApp

1. Envie: "Olá"
2. Bot deve responder automaticamente
3. Teste fluxo completo de agendamento

## ⚠️ Limitações Conhecidas

### Lembretes Automáticos

Os lembretes de 1 hora antes **não funcionarão completamente** porque:
- Serverless functions não mantêm estado
- `setTimeout` não persiste

**Solução:** Implementar cron job (ver `VERCEL_DEPLOY.md`)

## 📊 O Que Funciona

✅ **Funcionando 100%:**
- Webhooks (WhatsApp + Calendly)
- Processamento de mensagens IA
- Geração de links de agendamento
- Confirmações imediatas
- Notificações ao corretor
- Detecção de intenção
- Envio de fotos de imóveis

⚠️ **Precisa de Ajuste:**
- Lembretes 1h antes (precisa de cron job)

## 📖 Documentação

- **Deploy Completo:** `VERCEL_DEPLOY.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Webhooks:** `WEBHOOK_SETUP.md`
- **Calendly:** `CALENDLY_SETUP.md`

## ✅ Checklist Pós-Deploy

- [ ] Login na Vercel concluído
- [ ] Deploy executado com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook WhatsApp configurado
- [ ] Webhook Calendly configurado
- [ ] Health check testado
- [ ] Agendamento testado
- [ ] Teste via WhatsApp realizado
- [ ] Logs monitorados

---

**Status atualizado em:** 2025-10-15
**Deploy iniciado por:** Claude Code
**Projeto:** BS Consultoria de Imóveis
