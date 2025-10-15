# 🚀 Deploy na Vercel - Guia Completo

## ✅ O Que Foi Preparado

- ✅ `vercel.json` configurado
- ✅ API Routes serverless criadas em `/api`
- ✅ Webhooks prontos (WhatsApp + Calendly)
- ✅ Todas as funcionalidades adaptadas

## 📋 Passos para Deploy

### 1. Instalar Vercel CLI (se ainda não tiver)

```bash
npm install -g vercel
```

### 2. Fazer Login na Vercel

```bash
vercel login
```

Escolha o método de login (GitHub, GitLab, Bitbucket ou Email).

### 3. Deploy do Projeto

```bash
# Na pasta do projeto
cd /Users/admin/Desktop/Projetos\ código/bs-consultoria-net-style-main

# Deploy em produção
vercel --prod
```

**O que vai acontecer:**
1. Vercel vai detectar que é um projeto Vite
2. Vai fazer build do frontend
3. Vai configurar as API routes serverless
4. Vai gerar uma URL de produção (ex: https://bs-consultoria.vercel.app)

### 4. Configurar Variáveis de Ambiente

Após o deploy, você precisa adicionar todas as variáveis de ambiente:

```bash
# Método 1: Via CLI (mais rápido)
vercel env add OPENAI_API_KEY
# Cole o valor quando solicitado
# Escolha: Production, Preview, Development (selecione todos)

# Repetir para cada variável:
vercel env add VITE_OPENAI_API_KEY
vercel env add EVOLUTION_API_URL
vercel env add EVOLUTION_API_KEY
vercel env add EVOLUTION_INSTANCE
vercel env add CALENDLY_API_KEY
vercel env add CALENDLY_USER_URI
vercel env add CALENDLY_EVENT_TYPE_URI
vercel env add CALENDLY_PUBLIC_URL
vercel env add REALTOR_PHONE
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add VITE_BASEROW_API_URL
vercel env add VITE_BASEROW_TOKEN
vercel env add VITE_BASEROW_TABLE_ID
vercel env add SITE_BASE_URL
vercel env add WEBHOOK_BASE_URL
```

**Método 2: Via Dashboard (mais visual)**

1. Acesse https://vercel.com/dashboard
2. Clique no projeto **bs-consultoria**
3. Vá em **Settings** > **Environment Variables**
4. Adicione cada variável:

| Nome | Valor (do .env.local) |
|------|----------------------|
| `OPENAI_API_KEY` | sk-proj-ZJNS1vfLtlAYNS... |
| `VITE_OPENAI_API_KEY` | sk-proj-ZJNS1vfLtlAYNS... |
| `EVOLUTION_API_URL` | https://chat.layermarketing.com.br |
| `EVOLUTION_API_KEY` | 821A7182F9D1-4D51-BFE4-BCDA23DA3A32 |
| `EVOLUTION_INSTANCE` | BS_Consultoria |
| `CALENDLY_API_KEY` | eyJraWQiOiIxY2UxZTEzNjE3ZGNm... |
| `CALENDLY_USER_URI` | https://api.calendly.com/users/021158e0... |
| `CALENDLY_EVENT_TYPE_URI` | https://api.calendly.com/event_types/f1255aa4... |
| `CALENDLY_PUBLIC_URL` | https://calendly.com/negociosimobiliariosbs/30min |
| `REALTOR_PHONE` | 5511981598027 |
| `UPSTASH_REDIS_REST_URL` | https://mighty-crab-24248.upstash.io |
| `UPSTASH_REDIS_REST_TOKEN` | AV64AAIncDI0NGNjNjliYjg4OGQ0NDJh... |
| `VITE_BASEROW_API_URL` | https://api.baserow.io |
| `VITE_BASEROW_TOKEN` | of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7 |
| `VITE_BASEROW_TABLE_ID` | 693576 |
| `SITE_BASE_URL` | https://bs-consultoria.vercel.app |
| `WEBHOOK_BASE_URL` | https://bs-consultoria.vercel.app |

5. Clique em **Save** para cada variável

### 5. Redeploy com Variáveis

Após adicionar as variáveis, faça um novo deploy:

```bash
vercel --prod
```

Ou no dashboard da Vercel:
- **Deployments** > **...** > **Redeploy**

## 🔗 Configurar Webhooks

### Webhook do WhatsApp (Evolution API)

1. Acesse: https://chat.layermarketing.com.br
2. Instância: **BS_Consultoria**
3. **Settings** > **Webhook**
4. Configure:
   - **URL:** `https://bs-consultoria.vercel.app/webhook/whatsapp`
   - **Events:** `messages.upsert`
   - **Enabled:** ✅
5. **Save**

### Webhook do Calendly

1. Acesse: https://calendly.com/integrations/api_webhooks
2. **Create Webhook**
3. Configure:
   - **URL:** `https://bs-consultoria.vercel.app/webhook/calendly`
   - **Events:** `invitee.created`, `invitee.canceled`
   - **Scope:** Organization
4. **Save**

## 🧪 Testar Deployment

### 1. Health Check

```bash
curl https://bs-consultoria.vercel.app/api/health
```

**Esperado:**
```json
{
  "status": "ok",
  "service": "SDR Agent",
  "timestamp": "2025-10-15T...",
  "environment": "production"
}
```

### 2. Testar Agendamento

```bash
curl -X POST https://bs-consultoria.vercel.app/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "João Teste",
    "propertyId": "125"
  }'
```

### 3. Ver Lembretes

```bash
curl https://bs-consultoria.vercel.app/api/reminders
```

### 4. Teste End-to-End via WhatsApp

1. Envie mensagem para o WhatsApp Business
2. Bot deve responder automaticamente
3. Teste o fluxo completo de agendamento

## 📊 Monitorar Logs

### Via Dashboard Vercel

1. Acesse https://vercel.com/dashboard
2. Clique no projeto
3. Vá em **Deployments**
4. Clique no deployment ativo
5. Vá em **Functions** > **Logs**

### Via CLI

```bash
vercel logs
```

## ⚙️ Limitações do Vercel Serverless

### ⚠️ Importante: Lembretes Automáticos

Os lembretes de 1 hora antes NÃO funcionarão completamente na Vercel porque:
- Serverless functions não mantêm estado entre execuções
- `setTimeout` não persiste após a function terminar

**Soluções:**

#### Opção 1: Usar Vercel Cron Jobs (Recomendado)

Criar um cron job que verifica lembretes a cada 5 minutos:

```json
// vercel.json - adicionar
{
  "crons": [{
    "path": "/api/check-reminders",
    "schedule": "*/5 * * * *"
  }]
}
```

```javascript
// api/check-reminders.js
export default async function handler(req, res) {
  // Buscar lembretes que devem ser enviados agora
  // Enviar e remover do Redis
  return res.json({ success: true });
}
```

#### Opção 2: Usar Serviço Externo

- **Upstash QStash**: Fila de mensagens agendadas
- **Inngest**: Workflow engine para serverless
- **Railway**: Deploy tradicional com servidor sempre rodando

### Recursos Serverless da Vercel

- ✅ **Webhooks**: Funcionam perfeitamente
- ✅ **Confirmações**: Enviadas imediatamente
- ✅ **Processamento de mensagens**: OK
- ⚠️ **Lembretes**: Precisam de cron job ou serviço externo
- ✅ **Redis**: Funciona normalmente (Upstash)

## 🔧 Troubleshooting

### Deploy falhou

```bash
# Ver logs de build
vercel logs --follow

# Forçar rebuild
vercel --prod --force
```

### Variáveis não estão sendo lidas

```bash
# Verificar variáveis configuradas
vercel env ls

# Verificar no código
# As variáveis precisam do prefixo VITE_ para o frontend
# Sem prefixo para as APIs serverless
```

### Webhook não recebe eventos

1. **Verificar URL do webhook:**
```bash
curl -X POST https://bs-consultoria.vercel.app/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

2. **Ver logs da function:**
   - Dashboard Vercel > Functions > Logs

3. **Testar Evolution API:**
```bash
curl -X POST https://chat.layermarketing.com.br/message/sendText/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32" \
  -H "Content-Type: application/json" \
  -d '{"number": "5511999999999", "text": "Teste"}'
```

### Imports não funcionam

Se houver erro com imports ES modules:

1. Verifique `package.json`:
```json
{
  "type": "module"
}
```

2. Use extensões `.js` nos imports:
```javascript
import { function } from './module.js'
```

## 📱 Domains Customizados (Opcional)

### Adicionar Domínio Próprio

1. Dashboard Vercel > **Settings** > **Domains**
2. **Add Domain**: `bsconsultoria.com.br`
3. Configure DNS conforme instruções
4. Aguarde propagação (até 48h)

### Atualizar Webhooks com Novo Domínio

Após configurar domínio customizado, atualize:
- Evolution API webhook
- Calendly webhook
- Variável `WEBHOOK_BASE_URL`

## 🎉 Deploy Completo!

Após seguir todos os passos:

✅ Site rodando em produção
✅ APIs serverless funcionando
✅ Webhooks configurados
✅ Agente SDR respondendo via WhatsApp
✅ Sistema de agendamento ativo

## 📞 Próximos Passos

1. **Testar tudo via WhatsApp**
2. **Monitorar logs primeiros dias**
3. **Ajustar respostas da IA se necessário**
4. **Configurar cron job para lembretes** (ver Opção 1 acima)
5. **Considerar analytics** (Vercel Analytics)

---

**Qualquer problema, consulte:**
- Logs: `vercel logs`
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs

**Documentação criada para BS Consultoria de Imóveis**
