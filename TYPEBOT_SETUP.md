# 🤖 Integração Typebot + Agente SDR

## 📋 Visão Geral

A integração permite que leads capturados pelo Typebot sejam automaticamente reconhecidos pelo Agente SDR Mia, que usa as informações já coletadas para personalizar o atendimento sem fazer perguntas redundantes.

## 🎯 Fluxo de Funcionamento

```
┌─────────────┐
│   Cliente   │
│  no Site    │
└──────┬──────┘
       │
       │ Preenche formulário
       ▼
┌─────────────┐
│   Typebot   │ ◄─── Coleta: nome, email, telefone, interesse, orçamento, etc.
└──────┬──────┘
       │
       │ Webhook
       ▼
┌────────────────┐
│ webhook-typebot│ ◄─── Recebe dados e salva no Redis
│   (Vercel)     │
└──────┬─────────┘
       │
       │ Salva no Redis
       ▼
┌─────────────────┐
│  Redis/Upstash  │ ◄─── Armazena informações do lead
└──────┬──────────┘
       │
       │ Cliente envia mensagem no WhatsApp
       ▼
┌─────────────────┐
│  Evolution API  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   Agente Mia    │ ◄─── Reconhece lead do Typebot
│  (sdr-agent.js) │      Usa informações já coletadas
└─────────────────┘      Não faz perguntas redundantes
```

## 🚀 Configuração Passo a Passo

### 1️⃣ Configurar Typebot

#### A. Criar Conta no Typebot
1. Acesse https://typebot.io
2. Crie uma conta gratuita ou use self-hosted
3. Crie um novo bot

#### B. Criar Fluxo de Qualificação

Crie um fluxo com estas perguntas (exemplo):

```
1. Boas-vindas
   "Olá! 👋 Sou a Mia, assistente virtual da BS Consultoria de Imóveis."

2. Nome
   "Qual é o seu nome?"
   → Salvar em variável: {{name}}

3. WhatsApp
   "Qual seu número de WhatsApp?" (com validação)
   → Salvar em variável: {{phone}}

4. Email (opcional)
   "Qual seu email?"
   → Salvar em variável: {{email}}

5. Tipo de Imóvel
   "Que tipo de imóvel você procura?"
   Opções: [Apartamento] [Sobrado] [Casa] [Terreno]
   → Salvar em variável: {{interest}}

6. Orçamento
   "Qual sua faixa de preço?"
   Opções: [Até 200k] [200k-300k] [300k-500k] [Acima 500k]
   → Salvar em variável: {{budget}}

7. Localização
   "Em qual cidade/bairro você prefere?"
   → Salvar em variável: {{location}}

8. Mensagem Final
   "Perfeito! Em breve a Mia entrará em contato pelo WhatsApp para te mostrar os melhores imóveis! 🏠"
```

#### C. Configurar Webhook do Typebot

1. No Typebot, adicione um bloco "Webhook"
2. Configure:
   - **URL**: `https://seu-site.vercel.app/api/webhook-typebot`
   - **Método**: POST
   - **Headers**: Content-Type: application/json

3. **Payload** (exemplo):
```json
{
  "phone": "{{phone}}",
  "name": "{{name}}",
  "email": "{{email}}",
  "interest": "{{interest}}",
  "budget": "{{budget}}",
  "location": "{{location}}",
  "answers": [
    {
      "blockId": "nome",
      "value": "{{name}}"
    },
    {
      "blockId": "telefone",
      "value": "{{phone}}"
    },
    {
      "blockId": "email",
      "value": "{{email}}"
    },
    {
      "blockId": "interesse",
      "value": "{{interest}}"
    },
    {
      "blockId": "orcamento",
      "value": "{{budget}}"
    },
    {
      "blockId": "localizacao",
      "value": "{{location}}"
    }
  ]
}
```

### 2️⃣ Configurar Variáveis de Ambiente

No seu `.env.local`, adicione:

```bash
# Upstash Redis (necessário para armazenar leads do Typebot)
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_redis_token_here"
```

**Como obter credenciais do Upstash:**
1. Acesse https://upstash.com
2. Crie uma conta gratuita
3. Crie um novo database Redis
4. Copie as credenciais REST API

### 3️⃣ Deploy do Webhook

O webhook já está configurado em `/api/webhook-typebot.js` e será automaticamente deployado no Vercel.

**URL do webhook após deploy:**
```
https://seu-site.vercel.app/api/webhook-typebot
```

### 4️⃣ Testar a Integração

#### A. Teste Manual do Webhook

```bash
curl -X POST https://seu-site.vercel.app/api/webhook-typebot \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "name": "João Silva",
    "email": "joao@email.com",
    "interest": "Apartamento",
    "budget": "Até 200k",
    "location": "Itaquaquecetuba",
    "answers": [
      {"blockId": "nome", "value": "João Silva"},
      {"blockId": "telefone", "value": "5511999999999"},
      {"blockId": "interesse", "value": "Apartamento"}
    ]
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Lead received and stored",
  "phoneNumber": "5511999999999"
}
```

#### B. Verificar no Redis

```bash
# Acesse o dashboard do Upstash
# Procure pela chave: typebot:lead:5511999999999
```

#### C. Teste Completo do Fluxo

1. Preencha o formulário Typebot
2. Use o número de WhatsApp que você preencheu
3. Envie uma mensagem para o número da Mia
4. Mia deve reconhecer que você é um lead do Typebot

**Resposta esperada da Mia:**
```
Oi! Vi que você tá buscando Apartamento em Itaquaquecetuba.
Tenho 2 opções perfeitas pra você!

🏠 Residencial Bela Vista - R$ 215.000
   2 quartos, Parque Scaffidi - Itaquaquecetuba
   ✅ Dentro do seu orçamento!

Quer ver fotos?
```

## 📊 Como o Agente Reconhece Leads do Typebot

### 1. Detecção Automática

Quando uma mensagem chega no WhatsApp, o agente:

```javascript
// 1. Verifica se o número está no Redis como lead do Typebot
const isFromTypebot = await isTypebotLead(phoneNumber);

// 2. Se sim, busca as informações
const typebotLeadInfo = await getTypebotLead(phoneNumber);
```

### 2. Contexto Personalizado

O agente cria um contexto especial:

```javascript
const typebotContext = formatTypebotLeadForAI(typebotLeadInfo);

// Exemplo de contexto gerado:
`
CONTEXTO DO CLIENTE - LEAD DO TYPEBOT:
- Este cliente preencheu um formulário detalhado antes
- Você JÁ TEM as informações dele, NÃO pergunte novamente
- Nome: João Silva
- Interesse: Apartamento
- Orçamento: Até 200k
- Localização: Itaquaquecetuba

IMPORTANTE:
- NÃO se apresente formalmente
- NÃO faça perguntas que ele já respondeu
- Vá DIRETO para recomendar imóveis
`
```

### 3. Marcação como Processado

Após a primeira interação bem-sucedida:

```javascript
await markTypebotLeadAsProcessed(phoneNumber);
// Lead fica armazenado por 90 dias após ser processado
```

## 🔧 Customização

### Adicionar Novos Campos

Edite `/api/webhook-typebot.js`:

```javascript
function extractLeadInfo(typebotData) {
  // ... código existente ...

  // Adicione novos campos
  leadInfo.bedrooms = extractField(typebotData, ['bedrooms', 'quartos']);
  leadInfo.urgency = extractField(typebotData, ['urgency', 'urgencia']);

  return leadInfo;
}
```

### Modificar Formatação para AI

Edite `/server/typebot-service.js`:

```javascript
export function formatTypebotLeadForAI(leadInfo) {
  const parts = [];

  parts.push('INFORMAÇÕES DO LEAD (via Typebot):');

  // Adicione novos campos
  if (leadInfo.bedrooms) {
    parts.push(`- Quartos desejados: ${leadInfo.bedrooms}`);
  }

  return parts.join('\n');
}
```

## 📈 Monitoramento

### Ver Leads Não Processados

```bash
# Em desenvolvimento
curl http://localhost:3002/api/typebot/leads/unprocessed

# Em produção (adicione este endpoint se necessário)
```

### Logs Importantes

```javascript
// No console do servidor
console.log('📋 Typebot lead detected:', phoneNumber);
console.log('✅ Marked Typebot lead as processed:', phoneNumber);
```

## 🐛 Troubleshooting

### Problema: Webhook não está sendo chamado

**Verificar:**
1. URL do webhook está correta no Typebot?
2. Typebot está publicado (não só em preview)?
3. Firewall/CORS bloqueando requisições?

**Teste manual:**
```bash
# Envie POST direto para o webhook
curl -X POST https://seu-site.vercel.app/api/webhook-typebot \
  -H "Content-Type: application/json" \
  -d '{"phone": "5511999999999", "name": "Teste"}'
```

### Problema: Lead não está sendo reconhecido

**Verificar:**
1. Redis está configurado corretamente?
2. Lead foi salvo no Redis? (verificar no dashboard Upstash)
3. Formato do telefone está correto? (deve ser: 5511999999999)

**Debug:**
```javascript
// Adicione logs em sdr-agent.js
console.log(`Is Typebot lead: ${isFromTypebot}`);
console.log('Lead info:', typebotLeadInfo);
```

### Problema: Telefone não está sendo extraído

O webhook tenta extrair de várias formas. **Formatos aceitos:**

```javascript
// Direto
{ "phone": "11999999999" }

// Em answers
{ "answers": [{ "blockId": "telefone", "value": "11999999999" }] }

// Em variables
{ "variables": [{ "name": "phone", "value": "11999999999" }] }
```

## ✅ Checklist de Configuração

- [ ] Typebot criado e publicado
- [ ] Webhook configurado no Typebot apontando para `/api/webhook-typebot`
- [ ] Upstash Redis configurado
- [ ] Variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` no `.env.local`
- [ ] Deploy feito no Vercel
- [ ] Teste manual do webhook funcionando
- [ ] Lead sendo salvo no Redis
- [ ] Agente reconhecendo lead do Typebot
- [ ] Contexto personalizado funcionando

## 📚 Referências

- [Typebot Documentation](https://docs.typebot.io)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

## 💡 Dicas

1. **Use validação de telefone no Typebot** para garantir formato correto
2. **Teste com números diferentes** para validar a lógica
3. **Monitore o Redis** para ver quando leads expiram
4. **Personalize as perguntas** do Typebot de acordo com seu negócio
5. **Adicione campos opcionais** para não tornar o formulário muito longo

---

Precisa de ajuda? Entre em contato: negociosimobiliariosbs@gmail.com
