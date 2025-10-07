# 🚀 Setup Rápido - Webhook para Evolution API

## ✅ API Key OpenAI Configurada!

A API key da OpenAI já foi adicionada ao arquivo `.env.local`.

## 🌐 Próximo Passo: Obter URL para Webhook

Para que a Evolution API possa enviar mensagens do WhatsApp para o seu agente SDR, você precisa de uma **URL pública** acessível pela internet.

### Opção 1: ngrok (Recomendado para Testes) 🧪

**ngrok** cria um túnel seguro que expõe seu servidor local para a internet.

#### 1. Instalar ngrok

**macOS:**
```bash
brew install ngrok
```

**Windows/Linux:**
- Baixe em: https://ngrok.com/download
- Ou use: `npm install -g ngrok`

#### 2. Criar conta ngrok (grátis)
```bash
# Acesse: https://dashboard.ngrok.com/signup
# Após criar conta, pegue seu authtoken
ngrok config add-authtoken SEU_TOKEN_AQUI
```

#### 3. Iniciar o servidor SDR
```bash
# Em um terminal
node server/sdr-server.js
```

Você verá:
```
SDR Agent Server running on port 3002
Webhook URL: http://localhost:3002/webhook/whatsapp
```

#### 4. Expor servidor com ngrok
```bash
# Em OUTRO terminal
ngrok http 3002
```

Você verá algo assim:
```
ngrok

Session Status                online
Account                       seu@email.com
Version                       3.x.x
Region                        South America (sa)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3002

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**🎯 Sua URL do Webhook é:**
```
https://abc123.ngrok-free.app/webhook/whatsapp
```

⚠️ **Importante**: A URL do ngrok muda cada vez que você reinicia! Para URL fixa, use plano pago ou veja Opção 2.

#### 5. Testar o webhook
```bash
curl -X POST https://abc123.ngrok-free.app/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": {
        "fromMe": false,
        "remoteJid": "5511999999999@s.whatsapp.net"
      },
      "message": {
        "conversation": "Olá, teste!"
      }
    }
  }'
```

### Opção 2: Deploy em Servidor (Produção) 🚀

Para ambiente de produção, faça deploy do servidor:

#### Railway.app (Fácil e Grátis)

1. **Criar conta**: https://railway.app
2. **Criar novo projeto**: New Project > Deploy from GitHub repo
3. **Configurar variáveis**:
   - Vá em Variables
   - Adicione todas do `.env.local`
4. **Deploy automático**: Railway faz deploy automaticamente
5. **Pegar URL**: Vá em Settings > Generate Domain

Sua URL será: `https://seu-projeto.up.railway.app/webhook/whatsapp`

#### Outras Opções

- **Render**: https://render.com (fácil, grátis com limitações)
- **Heroku**: https://heroku.com (pago)
- **DigitalOcean**: https://digitalocean.com (VPS)
- **Vercel**: Não suporta webhooks longos (não recomendado)

## 📱 Configurar Evolution API com a URL

Agora que você tem a URL do webhook, configure na Evolution API:

### Se você usa Evolution API hospedada:

1. **Acesse o painel** da sua Evolution API
2. **Vá em**: Instances > Sua Instância > Webhooks
3. **Adicione webhook**:
   - URL: `https://abc123.ngrok-free.app/webhook/whatsapp`
   - Eventos: Marque `messages.upsert`
   - Método: POST
4. **Salvar**

### Se você ainda não tem Evolution API:

#### Opção A: Usar Serviço Hospedado (Mais Fácil)

Existem vários providers que hospedam Evolution API:

1. **Evolution API Cloud**: https://evolution-api.com
2. **Outras opções**: Pesquise "Evolution API hosting"

**Custo**: ~$10-30/mês

#### Opção B: Self-Hosted (Mais Controle)

**Requisitos:**
- VPS (DigitalOcean, Contabo, AWS, etc.)
- Docker instalado

**Setup rápido:**
```bash
# 1. Conectar no seu VPS
ssh root@seu-servidor.com

# 2. Clonar Evolution API
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 3. Configurar
cp .env.example .env
nano .env  # Configure suas variáveis

# 4. Iniciar com Docker
docker-compose up -d

# 5. Acessar
# Painel: http://seu-servidor.com:8080
```

## 🧪 Testar Tudo Funcionando

### 1. Verificar Servidor SDR está rodando
```bash
curl http://localhost:3002/health
# Deve retornar: {"status":"ok","service":"SDR Agent"}
```

### 2. Testar IA sem enviar WhatsApp
```bash
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "message": "Olá! Quero um apartamento de 2 quartos"
  }'
```

Você deve receber uma resposta da IA!

### 3. Conectar seu WhatsApp na Evolution API

1. Acesse painel Evolution API
2. Vá em Instances > Conectar
3. Escaneie o QR Code com seu WhatsApp Business

### 4. Enviar mensagem de teste

Envie uma mensagem para o número conectado na Evolution API:
```
Olá! Quero saber sobre imóveis
```

O agente SDR deve responder automaticamente! 🎉

## 📊 Monitorar Conversas

### Ver logs em tempo real:
```bash
# Terminal onde o servidor está rodando
node server/sdr-server.js

# Ou com PM2:
pm2 logs sdr-agent
```

### Dashboard ngrok:
```
http://localhost:4040
```

Aqui você vê todas as requisições HTTP chegando no webhook!

## 🔧 Troubleshooting

### ❌ Webhook não recebe mensagens

**1. Verificar URL está correta:**
```bash
# Testar manualmente
curl -X POST https://sua-url.ngrok-free.app/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"fromMe":false,"remoteJid":"test@s.whatsapp.net"},"message":{"conversation":"teste"}}}'
```

**2. Verificar Evolution API está enviando:**
- Acesse painel Evolution API
- Vá em Logs/Webhooks
- Veja se há erros

**3. Verificar firewall:**
```bash
# Se usar VPS, libere porta 3002
sudo ufw allow 3002
```

### ❌ IA não responde

**1. Verificar API key OpenAI:**
```bash
# Ver se está configurada
cat .env.local | grep OPENAI_API_KEY
```

**2. Testar API OpenAI:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY_HERE"
```

**3. Ver logs de erro:**
```bash
# Procurar por erros
grep "error" sdr-agent.log
```

## 📞 Precisa de Ajuda?

- **Email**: negociosimobiliariosbs@gmail.com
- **WhatsApp**: (11) 97336-0980

---

## ✅ Checklist de Setup

- [ ] API Key OpenAI configurada (.env.local)
- [ ] ngrok instalado e configurado
- [ ] Servidor SDR rodando (node server/sdr-server.js)
- [ ] ngrok expondo servidor (ngrok http 3002)
- [ ] URL do webhook copiada
- [ ] Evolution API configurada com webhook
- [ ] WhatsApp conectado na Evolution API
- [ ] Teste enviado e IA respondeu

**Quando tudo estiver ✅, seu agente SDR está LIVE! 🚀**
