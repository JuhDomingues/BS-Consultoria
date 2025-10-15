# 🤖 Agente SDR - IA para Atendimento Imobiliário

## 📋 Visão Geral

O Agente SDR (Sales Development Representative) é um sistema de inteligência artificial que atende clientes via WhatsApp, qualifica leads e agenda visitas automaticamente. Ele atua como o primeiro ponto de contato, pré-selecionando clientes qualificados para que corretores humanos possam focar em fechar vendas.

## ✨ Funcionalidades

### 🎯 Qualificação Inteligente de Leads
- Entende a necessidade do cliente através de conversação natural
- Coleta informações essenciais:
  - Composição familiar
  - Localização de trabalho/escola
  - Faixa de preço pretendida
  - Forma de pagamento (financiamento/à vista)
  - Urgência da compra
  - Preferências específicas

### 🏡 Recomendação Contextual
- Acessa base de imóveis em tempo real do Baserow
- Recomenda imóveis baseado no perfil do cliente
- **NUNCA** inventa imóveis - apenas utiliza dados reais
- Fornece informações precisas sobre disponibilidade

### 📅 Agendamento Automático com Calendly
- ✅ Integração completa com Calendly
- ✅ Detecta intenção de agendamento automaticamente
- ✅ Gera links personalizados com dados do imóvel
- ✅ Envia confirmação ao cliente após agendamento
- ✅ Notifica corretor com dados do cliente
- ✅ Lembretes automáticos 1 hora antes da visita
- ✅ Gerencia cancelamentos automaticamente

### 💬 Comunicação Natural
- Powered by GPT-4o-mini (OpenAI)
- Conversação amigável e profissional
- Mantém contexto da conversa
- Respostas rápidas e objetivas para WhatsApp

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Cliente       │
│   (WhatsApp)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Evolution API  │ ◄─── Gerencia conexão WhatsApp
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SDR Server     │ ◄─── Webhook endpoint
│  (sdr-server.js)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SDR Agent     │ ◄─── Lógica de IA e qualificação
│  (sdr-agent.js) │
└─────┬─────┬─────┘
      │     │
      │     └──────► Calendly Service ──► 📅 Calendly API
      │
      └─────────────► OpenAI API (GPT-4o-mini)
                          │
                          ▼
                    Baserow API (Imóveis)
```

## 🚀 Configuração

### 1. Pré-requisitos

- Node.js 18+
- Conta OpenAI com créditos
- Evolution API configurado
- Calendly (opcional, mas recomendado)
- Baserow já configurado

### 2. Instalação

```bash
# 1. Copiar arquivo de exemplo
cp .env.sdr.example .env

# 2. Editar .env com suas credenciais
nano .env

# 3. Instalar dependências (se ainda não instalou)
npm install
```

### 3. Configurar Evolution API

**Opção A: Deploy próprio**
```bash
# Clone Evolution API
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configure e inicie
docker-compose up -d
```

**Opção B: Usar serviço hospedado**
- Use um provider como: https://evolution-api.com/

**Configurar Webhook:**
1. Acesse painel da Evolution API
2. Vá em Settings > Webhooks
3. Adicione webhook URL: `http://seu-dominio:3002/webhook/whatsapp`
4. Ative eventos: `messages.upsert`

### 4. Configurar OpenAI

1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Adicione ao `.env`:
```
OPENAI_API_KEY=sk-proj-...
```

### 5. Configurar Calendly

**📚 [GUIA COMPLETO DE CONFIGURAÇÃO](./CALENDLY_SETUP.md)**

A integração com Calendly permite agendamento automático de visitas com confirmações e lembretes.

**Configuração Rápida (Conta Básica):**
1. Crie conta em https://calendly.com
2. Configure um tipo de evento "Visita a Imóvel"
3. Adicione ao `.env.local`:
```bash
CALENDLY_PUBLIC_URL=https://calendly.com/seu-usuario/visita-imovel
REALTOR_PHONE=5511981598027
```

**Configuração Completa (Conta Pro - Recomendado):**
1. Siga o [Guia Completo de Configuração do Calendly](./CALENDLY_SETUP.md)
2. Configure webhooks para notificações automáticas
3. Obtenha credenciais API
4. Configure perguntas personalizadas

**Recursos da Integração:**
- ✅ Links de agendamento personalizados por imóvel
- ✅ Confirmação automática via WhatsApp (cliente + corretor)
- ✅ Lembretes 1 hora antes da visita
- ✅ Gerenciamento de cancelamentos
- ✅ Armazenamento persistente no Redis

## 🎮 Uso

### Iniciar Servidor SDR

```bash
# Desenvolvimento
node server/sdr-server.js

# Produção (com PM2)
pm2 start server/sdr-server.js --name sdr-agent
pm2 save
```

### Testar IA (sem enviar WhatsApp)

```bash
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "message": "Olá, quero um apartamento de 2 quartos",
    "propertyId": "125"
  }'
```

### Enviar Mensagem Manual

```bash
curl -X POST http://localhost:3002/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "message": "Teste de mensagem"
  }'
```

## 📊 Fluxo de Conversação

### Exemplo 1: Cliente Interessado em Imóvel Específico

```
Cliente: Olá! Vi o Residencial Bela Vista no site
AI: Olá! Que bom ter você aqui! 😊 O Residencial Bela Vista é
    um lançamento exclusivo incrível! Para te ajudar melhor,
    me conta: você está procurando para morar ou investir?

Cliente: Para morar com minha família
AI: Perfeito! Quantas pessoas vão morar no apartamento?

Cliente: Somos 4 pessoas, eu, minha esposa e 2 filhos
AI: Entendi! O apartamento de 2 dormitórios do Residencial
    Bela Vista é ideal para vocês. Vocês trabalham/estudam
    próximo a Itaquaquecetuba?

Cliente: Sim, trabalho em Suzano
AI: Ótimo! A localização é perfeita então. O valor do
    apartamento é R$ 215.000. Você pretende financiar ou
    pagar à vista?

Cliente: Financiamento
AI: Perfeito! Temos parceria com o programa Minha Casa Minha
    Vida. Quando você gostaria de conhecer o apartamento
    pessoalmente?

Cliente: Posso ir sábado
AI: Que ótimo! Posso agendar uma visita para você. Qual seu nome completo?

Cliente: João Silva
AI: Ótimo, João! 🎉

Para agendar sua visita ao *Residencial Bela Vista*, acesse:
🗓️ https://calendly.com/bs-consultoria/visita?...

Você receberá uma confirmação por e-mail!

[Cliente agenda no Calendly]

[Sistema envia confirmação automática:]
✅ VISITA CONFIRMADA!

Olá João! Sua visita foi agendada com sucesso! 🎉

📍 Imóvel: Residencial Bela Vista
📌 Endereço: Av. Principal, 100 - Centro
📅 Data: Sábado, 20 de outubro
⏰ Horário: 14:00

Você receberá um lembrete 1 hora antes da visita.

[Corretor também recebe notificação no WhatsApp]
```

### Exemplo 2: Cliente Explorando Opções

```
Cliente: Tem apartamento de 3 quartos?
AI: Olá! No momento temos apartamentos de 2 dormitórios no
    Residencial Bela Vista, que é nosso lançamento exclusivo.
    São apartamentos de 47m² com ótimo acabamento e localização.
    Gostaria de conhecer? Posso te dar mais detalhes!

Cliente: Quanto custa?
AI: O valor é R$ 215.000, com opção de financiamento pelo
    Minha Casa Minha Vida. Conta com 2 dormitórios, 1 banheiro,
    1 vaga de garagem. Para quem você está procurando?
```

## 🎯 Sistema de Qualificação

O agente coleta automaticamente:

### 📋 Informações Coletadas
- ✅ Nome do cliente
- ✅ Imóvel de interesse
- ✅ Composição familiar
- ✅ Localização trabalho/escola
- ✅ Faixa de preço
- ✅ Forma de pagamento
- ✅ Urgência da compra
- ✅ Preferências específicas

### 🎖️ Classificação de Leads

**Lead Quente 🔥**
- Já sabe qual imóvel quer
- Tem urgência definida
- Forma de pagamento clara
- Solicitou visita

**Lead Morno 🌡️**
- Explorando opções
- Sem urgência imediata
- Ainda avaliando financeiramente

**Lead Frio ❄️**
- Apenas pesquisando
- Sem definição de preferências
- Futuro distante

## 🔧 Personalização

### Modificar Personalidade do Agente

Edite `server/sdr-agent.js` na função `getSystemPrompt()`:

```javascript
function getSystemPrompt(properties) {
  return `Você é um agente SDR...

  ESTILO DE COMUNICAÇÃO:
  - [Personalize aqui]
  - Mais formal / informal
  - Mais direto / consultivo
  - etc.
  `;
}
```

### Adicionar Novas Perguntas de Qualificação

No prompt do sistema, adicione na seção `PROCESSO DE QUALIFICAÇÃO`:

```javascript
PROCESSO DE QUALIFICAÇÃO - Descubra sutilmente:
1. ...
2. ...
8. Tem animais de estimação? (nova pergunta)
```

### Integrar com CRM

Adicione código em `server/sdr-agent.js`:

```javascript
async function processMessage(phoneNumber, message, propertyId) {
  // ... código existente ...

  // Salvar no CRM
  await saveToCRM({
    phoneNumber,
    context: context.customerInfo,
    lastMessage: message
  });
}
```

## 📈 Monitoramento

### Logs

```bash
# Ver logs em tempo real
tail -f sdr-agent.log

# Com PM2
pm2 logs sdr-agent
```

### Métricas Importantes

- Taxa de resposta (% de mensagens respondidas)
- Tempo médio de resposta
- Taxa de agendamento (% que agendam visita)
- Leads qualificados por dia
- Conversões (visitas > vendas)

## 🔒 Segurança

### Boas Práticas

1. **Nunca commite .env no git**
```bash
# Verifique .gitignore
cat .gitignore | grep .env
```

2. **Use HTTPS em produção**
```bash
# Configure certificado SSL
# Use nginx como proxy reverso
```

3. **Rate Limiting**
```javascript
// Adicione rate limiting no webhook
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30 // 30 requests por minuto
});

app.use('/webhook/whatsapp', limiter);
```

4. **Validação de Webhook**
```javascript
// Valide que requisições vêm da Evolution API
const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

app.post('/webhook/whatsapp', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  if (signature !== EVOLUTION_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // ... processar webhook
});
```

## 🐛 Troubleshooting

### Problema: IA não responde

**Verificar:**
```bash
# 1. Servidor está rodando?
curl http://localhost:3002/health

# 2. OpenAI API key válida?
node -e "console.log(process.env.OPENAI_API_KEY)"

# 3. Logs de erro
tail -f sdr-agent.log
```

### Problema: Webhook não recebe mensagens

**Verificar:**
```bash
# 1. Evolution API está ativa?
curl https://sua-evolution-api.com/health

# 2. Webhook configurado?
# Acesse painel Evolution API > Settings > Webhooks

# 3. URL acessível externamente?
# Use ngrok para teste local:
ngrok http 3002
# Configure webhook para: https://abc123.ngrok.io/webhook/whatsapp
```

### Problema: Imóveis não aparecem nas respostas

**Verificar:**
```bash
# Testar busca de imóveis
curl http://localhost:3001/api/properties

# Ver logs de busca
grep "fetching properties" sdr-agent.log
```

## 💰 Custos Estimados

### OpenAI (GPT-4o-mini)
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- **Estimativa**: ~500 conversas/mês = $3-5/mês

### Evolution API
- Self-hosted: Grátis (custos de servidor)
- Managed: $10-30/mês

### Calendly
- Basic: Grátis (link público)
- Pro: $10/mês (API + features avançadas)

**Total estimado: $13-45/mês**

## 🚀 Próximos Passos

### Melhorias Futuras

1. **Dashboard de Analytics**
   - Visualizar conversas
   - Métricas de conversão
   - Relatórios de leads

2. **Integração com CRM**
   - Salvar leads automaticamente
   - Sincronizar com Pipedrive/RD Station

3. **Múltiplos Idiomas**
   - Detectar idioma do cliente
   - Responder em inglês/espanhol

4. **Voice Messages**
   - Transcrever áudios do WhatsApp
   - Responder a mensagens de voz

5. **Envio de Mídia**
   - Enviar fotos dos imóveis
   - PDFs com plantas e documentos
   - Vídeos de tour virtual

## 📞 Suporte

Para dúvidas ou problemas:
- Email: negociosimobiliariosbs@gmail.com
- WhatsApp: (11) 97336-0980

## 📄 Licença

Propriedade de BS Consultoria de Imóveis - CRECI 30.756-J
