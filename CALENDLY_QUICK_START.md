# 🚀 Início Rápido - Integração Calendly

Guia de 5 minutos para começar a usar a integração Calendly.

## ✅ Pré-requisitos

- [ ] Conta no Calendly (básica ou pro)
- [ ] Servidor SDR rodando
- [ ] Redis configurado
- [ ] WhatsApp conectado via Evolution API

## 📝 Configuração Mínima

### 1. Criar Evento no Calendly

1. Acesse [calendly.com](https://calendly.com)
2. Crie evento "Visita a Imóvel" (30-60 min)
3. Copie o link público do evento

### 2. Configurar Variáveis

Adicione ao `.env.local`:

```bash
# Calendly (obrigatório)
CALENDLY_PUBLIC_URL=https://calendly.com/SEU-USUARIO/visita-imovel

# Corretor (obrigatório)
REALTOR_PHONE=5511981598027

# Webhook (opcional para conta básica)
WEBHOOK_BASE_URL=https://seu-dominio.com
```

### 3. Reiniciar Servidor

```bash
# Parar servidor atual
pm2 stop sdr-server

# Ou Ctrl+C se rodando manualmente

# Iniciar novamente
node server/sdr-server.js

# Ou com PM2
pm2 start server/sdr-server.js --name sdr-server
```

## 🧪 Testar Agendamento

### Teste 1: Via API

```bash
curl -X POST http://localhost:3002/api/schedule-visit \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5511999999999",
    "customerName": "Teste Silva",
    "customerEmail": "teste@example.com",
    "propertyId": "125"
  }'
```

**Resultado esperado:**
```json
{
  "success": true,
  "schedulingLink": "https://calendly.com/...",
  "propertyTitle": "Nome do Imóvel",
  "customerName": "Teste Silva"
}
```

### Teste 2: Via WhatsApp

Envie mensagens para o número do WhatsApp Business:

```
Você: Olá
Bot: Oi! Sou a Susi 😊 Me conta...

Você: Quero ver apartamentos de 2 quartos
Bot: [Mostra opções]

Você: Quero ver o primeiro
Bot: [Envia fotos e detalhes]

Você: Quero agendar uma visita
Bot: Ótimo! 🎉 Para agendar... [link Calendly]
```

### Teste 3: Verificar Lembretes

```bash
curl http://localhost:3002/api/reminders
```

## 📋 Checklist de Funcionalidades

Após configurar, teste cada funcionalidade:

- [ ] Cliente solicita agendamento via WhatsApp
- [ ] Sistema gera link do Calendly
- [ ] Cliente acessa link e agenda
- [ ] Cliente recebe confirmação no WhatsApp
- [ ] Corretor recebe notificação no WhatsApp
- [ ] Lembrete é agendado (verificar API /reminders)
- [ ] Lembrete é enviado 1h antes (teste com horário próximo)
- [ ] Cancelamento funciona (testar cancelar no Calendly)

## 🔧 Configuração Avançada (Opcional)

Para habilitar webhooks automáticos do Calendly:

1. Upgrade para conta Pro: https://calendly.com/pricing
2. Siga o [Guia Completo](./CALENDLY_SETUP.md)
3. Configure webhook: `https://seu-dominio.com/webhook/calendly`

## 📊 Monitoramento

### Ver Logs

```bash
# Logs do servidor
tail -f logs/sdr-server.log

# Ou com PM2
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

## ❓ Problemas Comuns

### Links não são gerados

**Solução:**
```bash
# Verificar variável
echo $CALENDLY_PUBLIC_URL

# Deve retornar sua URL do Calendly
# Se vazio, adicionar ao .env.local
```

### Confirmações não são enviadas

**Causa:** Conta básica não tem webhooks

**Soluções:**
1. Upgrade para Pro (recomendado)
2. Ou: Cliente receberá confirmação apenas por email do Calendly

### Lembretes não funcionam

**Verificações:**
```bash
# Redis conectado?
curl http://localhost:3002/api/reminders

# Deve retornar lista (mesmo que vazia)
```

## 🎯 Próximos Passos

1. ✅ Teste com clientes reais
2. ✅ Configure conta Pro para webhooks
3. ✅ Personalize mensagens em `calendly-service.js`
4. ✅ Configure perguntas personalizadas no Calendly
5. ✅ Monitore lembretes e ajuste timing se necessário

## 📚 Documentação Completa

- [Guia Completo de Configuração](./CALENDLY_SETUP.md)
- [README do SDR Agent](./SDR_AGENT_README.md)
- [Documentação do Calendly API](https://developer.calendly.com/)

---

**Dúvidas?** Consulte o [Guia Completo](./CALENDLY_SETUP.md) ou a seção de Troubleshooting.
