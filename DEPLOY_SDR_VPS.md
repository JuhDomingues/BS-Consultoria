# 🚀 Guia de Deploy do Agente SDR no VPS

## 📋 Resumo da Situação

O webhook do Evolution API está configurado para:
```
https://bsconsultoriadeimoveis.com.br/webhook/whatsapp
```

Mas o servidor SDR não está rodando no VPS. Este guia mostra como configurar.

## 🎯 Arquitetura

```
WhatsApp → Evolution API → Nginx (VPS) → SDR Server (porta 3002) → OpenAI
                                      ↓
                              Frontend Server (porta 3000)
```

## 🔧 Passos de Configuração

### 1. Conectar ao VPS via SSH

```bash
ssh usuario@bsconsultoriadeimoveis.com.br
# Ou pelo IP direto
```

### 2. Navegar para o Diretório do Projeto

```bash
cd /var/www/BS-Consultoria
# ou o caminho onde o projeto está instalado
```

### 3. Configurar Variáveis de Ambiente no VPS

Edite o arquivo `.env` no servidor:

```bash
nano .env
```

Adicione/verifique estas variáveis:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here

# Evolution API Configuration (WhatsApp)
EVOLUTION_API_URL=https://chat.layermarketing.com.br
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_INSTANCE=BS_Consultoria

# SDR Agent Configuration
SDR_PORT=3002
SITE_BASE_URL=https://bsconsultoriadeimoveis.com.br

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Baserow API Configuration
VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=your_baserow_token_here
VITE_BASEROW_TABLE_ID=693576

# Calendly Configuration (Opcional)
CALENDLY_API_KEY=
CALENDLY_EVENT_TYPE_UUID=
CALENDLY_USER_URI=
```

Salve com: `Ctrl + X`, depois `Y`, depois `Enter`

### 4. Atualizar PM2 Ecosystem Config

Edite o arquivo `ecosystem.config.cjs`:

```bash
nano ecosystem.config.cjs
```

Adicione o servidor SDR:

```javascript
module.exports = {
  apps: [
    {
      name: 'bs-consultoria',
      script: './server/production.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'sdr-agent',
      script: './server/sdr-server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        SDR_PORT: 3002
      },
      error_file: './logs/sdr-error.log',
      out_file: './logs/sdr-out.log',
      log_file: './logs/sdr-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### 5. Instalar/Atualizar Dependências

```bash
npm install
```

### 6. Iniciar Servidor SDR com PM2

```bash
# Parar tudo
pm2 stop all

# Iniciar ambos servidores
pm2 start ecosystem.config.cjs

# Verificar status
pm2 status

# Ver logs
pm2 logs sdr-agent
```

### 7. Configurar Nginx para Fazer Proxy do Webhook

Edite a configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/bs-consultoria
```

Adicione a rota do webhook:

```nginx
server {
    listen 80;
    server_name bsconsultoriadeimoveis.com.br www.bsconsultoriadeimoveis.com.br;

    # ... configurações existentes ...

    # Proxy para o servidor principal (porta 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para o webhook do WhatsApp (porta 3002)
    location /webhook/whatsapp {
        proxy_pass http://localhost:3002/webhook/whatsapp;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Aumentar timeout para processamento da IA
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy para API do SDR (opcional, para testes)
    location /api/test-ai {
        proxy_pass http://localhost:3002/api/test-ai;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Testar e reiniciar Nginx:

```bash
# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 8. Abrir Porta no Firewall (se necessário)

```bash
# Permitir tráfego na porta 3002 (interno, não exposto publicamente)
# Não é necessário se o Nginx faz o proxy

# Mas se quiser testar diretamente:
sudo ufw allow 3002/tcp
```

### 9. Verificar se Está Funcionando

```bash
# No servidor VPS:
curl http://localhost:3002/health

# Externamente:
curl https://bsconsultoriadeimoveis.com.br/webhook/whatsapp
```

### 10. Testar o Webhook

```bash
# Do seu computador local:
curl -X POST https://bsconsultoriadeimoveis.com.br/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"fromMe":false,"remoteJid":"5511999999999@s.whatsapp.net"},"message":{"conversation":"Olá"}}}'
```

### 11. Monitorar Logs

```bash
# Ver logs do SDR em tempo real
pm2 logs sdr-agent

# Ver apenas erros
pm2 logs sdr-agent --err

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## ✅ Verificação Final

Checklist:
- [ ] Servidor SDR rodando (pm2 status mostra "online")
- [ ] Health check funcionando: `curl http://localhost:3002/health`
- [ ] Nginx fazendo proxy: `curl https://bsconsultoriadeimoveis.com.br/webhook/whatsapp`
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook do Evolution API apontando para URL correta
- [ ] Teste de mensagem via WhatsApp funciona

## 🐛 Troubleshooting

### SDR Agent não inicia

```bash
# Ver logs de erro
pm2 logs sdr-agent --err

# Verificar se há erro de variáveis
pm2 env 0  # ou o ID do processo

# Reiniciar
pm2 restart sdr-agent
```

### Nginx retorna 502 Bad Gateway

```bash
# Verificar se servidor está rodando
curl http://localhost:3002/health

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Testar configuração
sudo nginx -t
```

### Webhook não recebe mensagens

```bash
# Verificar configuração do webhook na Evolution API
curl https://chat.layermarketing.com.br/webhook/find/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"

# Verificar se URL está correta
# Deve ser: https://bsconsultoriadeimoveis.com.br/webhook/whatsapp

# Enviar mensagem de teste
# Use o WhatsApp para enviar "oi" para o número conectado
```

### IA não responde

```bash
# Testar OpenAI API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(grep OPENAI_API_KEY .env | cut -d'=' -f2)"

# Testar localmente no servidor
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"5511999999999","message":"Olá"}'
```

## 🎉 Pronto!

Após seguir esses passos, o agente SDR estará rodando em produção e responderá automaticamente mensagens do WhatsApp.

## 📞 Comandos Úteis

```bash
# Status dos servidores
pm2 status

# Reiniciar SDR
pm2 restart sdr-agent

# Ver logs
pm2 logs sdr-agent

# Parar tudo
pm2 stop all

# Iniciar tudo
pm2 start ecosystem.config.cjs

# Salvar configuração PM2
pm2 save

# Ver uso de recursos
pm2 monit
```
