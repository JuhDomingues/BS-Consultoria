# 🔗 Configuração do Webhook Calendly

## ✅ Configuração Completa!

Suas credenciais do Calendly já estão configuradas no `.env.local`:

```
✓ CALENDLY_API_KEY: Configurado
✓ CALENDLY_USER_URI: https://api.calendly.com/users/021158e0-c9d8-4008-91ac-698c0b489812
✓ CALENDLY_EVENT_TYPE_URI: https://api.calendly.com/event_types/f1255aa4-06fa-43b8-af71-98c8b94dd50c
✓ CALENDLY_PUBLIC_URL: https://calendly.com/negociosimobiliariosbs/30min
✓ REALTOR_PHONE: 5511981598027
```

## 📝 Próximo Passo: Configurar Webhook

Para receber notificações automáticas quando clientes agendarem visitas, você precisa configurar o webhook no Calendly.

### Opção 1: Configuração Manual (Recomendado)

1. **Acesse o Painel de Webhooks do Calendly:**
   https://calendly.com/integrations/api_webhooks

2. **Clique em "Create Webhook"**

3. **Configure o Webhook:**
   - **URL:** `https://bs-consultoria.vercel.app/webhook/calendly`
   - **Subscription Scope:** Organization
   - **Events to subscribe:**
     - ✅ `invitee.created` (quando cliente agenda)
     - ✅ `invitee.canceled` (quando cliente cancela)

4. **Clique em "Save"**

### Opção 2: Configuração Automática (via Script)

Execute o comando abaixo para criar o webhook automaticamente:

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $(grep CALENDLY_API_KEY .env.local | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://bs-consultoria.vercel.app/webhook/calendly",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/1a10cc01-8cca-4035-9626-1271b704f8cb",
    "scope": "organization"
  }'
```

## 🧪 Testar a Integração

### 1. Iniciar Servidor SDR

```bash
# Opção 1: Modo direto (para desenvolvimento)
node server/sdr-server.js

# Opção 2: Com PM2 (para produção)
pm2 start server/sdr-server.js --name sdr-server
pm2 save
```

### 2. Verificar Status

```bash
# Executar script de teste
./test-calendly-integration.sh

# Ou manualmente
curl http://localhost:3002/health
curl http://localhost:3002/api/reminders
```

### 3. Testar Agendamento

**Via API:**
```bash
curl -X POST http://localhost:3002/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "João Teste",
    "customerEmail": "joao@teste.com",
    "propertyId": "125"
  }'
```

**Via WhatsApp:**
```
1. Envie: "Olá"
2. Envie: "Quero apartamento de 2 quartos"
3. Envie: "Quero ver o primeiro"
4. Envie: "Quero agendar uma visita"
5. Clique no link do Calendly
6. Agende uma visita
7. Verifique as mensagens de confirmação
```

## 📊 Monitorar Funcionamento

### Ver Logs

```bash
# Logs em tempo real
tail -f logs/sdr-server.log

# Com PM2
pm2 logs sdr-server
```

### APIs de Monitoramento

```bash
# Health check
curl http://localhost:3002/health

# Lembretes agendados
curl http://localhost:3002/api/reminders

# Conversas ativas
curl http://localhost:3002/api/conversations
```

### Verificar Webhooks Configurados

```bash
curl https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $(grep CALENDLY_API_KEY .env.local | cut -d'=' -f2)" \
  -H "Content-Type: application/json"
```

## 🔄 Fluxo de Funcionamento

1. **Cliente pede agendamento via WhatsApp**
   ```
   Cliente: "Quero agendar uma visita ao Residencial Bela Vista"
   ```

2. **Bot envia link do Calendly**
   ```
   Bot: "Ótimo! Para agendar sua visita ao Residencial Bela Vista,
         acesse: https://calendly.com/negociosimobiliariosbs/30min?..."
   ```

3. **Cliente agenda no Calendly**
   - Escolhe data e horário
   - Confirma agendamento

4. **Calendly envia webhook para seu servidor**
   ```
   POST https://bs-consultoria.vercel.app/webhook/calendly
   Event: invitee.created
   ```

5. **Servidor processa e envia confirmações**

   **Para o Cliente:**
   ```
   ✅ VISITA CONFIRMADA!

   Olá João! Sua visita foi agendada com sucesso! 🎉

   📍 Imóvel: Residencial Bela Vista
   📌 Endereço: Av. Principal, 100 - Centro
   📅 Data: Sábado, 20 de outubro de 2025
   ⏰ Horário: 14:00

   O que levar:
   • Documento com foto (RG ou CNH)
   • Comprovante de renda

   Você receberá um lembrete 1 hora antes da visita.
   ```

   **Para o Corretor:**
   ```
   🔔 NOVA VISITA AGENDADA

   Cliente: João Silva
   Telefone: 5511999999999

   📍 Imóvel: Residencial Bela Vista
   📌 Endereço: Av. Principal, 100 - Centro
   🔗 Link: https://bs-consultoria.vercel.app/imovel/125

   📅 Data: Sábado, 20 de outubro de 2025
   ⏰ Horário: 14:00
   ```

6. **Sistema agenda lembrete (1h antes)**
   - Salvo no Redis
   - setTimeout programa envio

7. **Lembretes enviados (13:00)**

   **Para o Cliente:**
   ```
   ⏰ LEMBRETE DE VISITA

   Olá João! Sua visita está chegando!

   📍 Imóvel: Residencial Bela Vista
   📌 Endereço: Av. Principal, 100 - Centro
   ⏰ Horário: 14:00 (daqui a 1 hora)

   Não se esqueça de levar:
   • Documento com foto
   • Comprovante de renda
   ```

   **Para o Corretor:**
   ```
   ⏰ LEMBRETE - VISITA EM 1 HORA

   Cliente: João Silva
   Telefone: 5511999999999

   📍 Imóvel: Residencial Bela Vista
   📌 Endereço: Av. Principal, 100 - Centro
   ⏰ Horário: 14:00
   ```

## ⚠️ Importante: Deploy em Produção

Atualmente o webhook está configurado para:
```
https://bs-consultoria.vercel.app/webhook/calendly
```

**Certifique-se de que:**

1. O servidor SDR está rodando em produção (Vercel/Railway/outro)
2. A rota `/webhook/calendly` está acessível publicamente
3. O servidor responde com status 200 para os webhooks

**Se estiver usando Vercel:**
- Deploy o código do servidor SDR
- Configure as variáveis de ambiente no painel da Vercel
- Teste o endpoint: `curl https://bs-consultoria.vercel.app/health`

**Se estiver usando outro servidor:**
- Atualize `WEBHOOK_BASE_URL` no `.env.local`
- Reconfigure o webhook no Calendly com a nova URL

## 🐛 Troubleshooting

### Webhook não está recebendo eventos

1. **Verificar se webhook está configurado:**
```bash
curl https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $(grep CALENDLY_API_KEY .env.local | cut -d'=' -f2)"
```

2. **Testar endpoint manualmente:**
```bash
curl -X POST https://bs-consultoria.vercel.app/webhook/calendly \
  -H "Content-Type: application/json" \
  -d '{"event": "invitee.created", "payload": {"test": true}}'
```

3. **Ver logs no Calendly:**
   - Acesse https://calendly.com/integrations/api_webhooks
   - Clique no seu webhook
   - Veja "Recent Deliveries"

### Confirmações não são enviadas

1. **Verificar Evolution API (WhatsApp):**
```bash
curl http://localhost:3002/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "5511999999999", "message": "Teste"}'
```

2. **Ver logs do servidor:**
```bash
pm2 logs sdr-server | grep "Confirmation sent"
```

### Lembretes não funcionam

1. **Verificar Redis:**
```bash
curl http://localhost:3002/api/reminders
```

2. **Agendar visita de teste (2h no futuro):**
   - Agendar para daqui a 2 horas
   - Aguardar 1 hora
   - Verificar se lembrete foi enviado

## 📞 Suporte

- **Documentação Completa:** `CALENDLY_SETUP.md`
- **Início Rápido:** `CALENDLY_QUICK_START.md`
- **Resumo Técnico:** `CALENDLY_IMPLEMENTATION_SUMMARY.md`

---

**Tudo configurado e pronto para uso!** 🎉

Execute `./test-calendly-integration.sh` para verificar o status da integração.
