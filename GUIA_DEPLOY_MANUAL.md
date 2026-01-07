# 🚀 Guia de Deploy Manual - Agente SDR no VPS

## 📋 Visão Geral

Este guia te orienta passo a passo para fazer o deploy do Agente SDR no VPS `bsconsultoriadeimoveis.com.br`.

**Tempo estimado:** 15-20 minutos

---

## ✅ Pré-requisitos

Antes de começar, certifique-se de ter:

- [ ] Acesso SSH ao VPS
- [ ] Usuário e senha (ou chave SSH)
- [ ] Arquivo `.env.local` configurado localmente
- [ ] Git configurado no VPS

---

## 🔐 PASSO 1: Conectar ao VPS via SSH

Abra um terminal e conecte-se ao VPS:

```bash
ssh usuario@bsconsultoriadeimoveis.com.br
# OU
ssh usuario@IP_DO_VPS
```

**Exemplo:**
```bash
ssh root@bsconsultoriadeimoveis.com.br
# Digite a senha quando solicitado
```

Se você tem uma chave SSH:
```bash
ssh -i ~/.ssh/sua_chave usuario@bsconsultoriadeimoveis.com.br
```

---

## 📂 PASSO 2: Navegar para o Diretório do Projeto

Após conectar ao VPS, vá para o diretório do projeto:

```bash
# Opção 1: Caminho comum
cd /var/www/bs-consultoria-net-style-main

# Opção 2: Se estiver em outro local
cd /var/www/BS-Consultoria

# Verificar se está no local correto
pwd
ls -la
```

**Você deve ver arquivos como:**
- `package.json`
- `ecosystem.config.cjs`
- `server/sdr-server.js`

---

## 🔄 PASSO 3: Atualizar o Código (Git Pull)

Baixe as últimas atualizações do GitHub:

```bash
# Ver branch atual
git branch

# Verificar status
git status

# Atualizar código
git pull origin main
```

**Se houver conflitos:**
```bash
# Descartar mudanças locais (cuidado!)
git reset --hard origin/main
git pull origin main
```

---

## 🔐 PASSO 4: Configurar Variáveis de Ambiente

### Opção A: Copiar .env da sua máquina local (Recomendado)

**No seu computador local** (abra OUTRO terminal), execute:

```bash
# Navegue até o projeto
cd /Users/admin/Desktop/Projetos\ código/bs-consultoria-net-style-main

# Execute o script de sincronização
bash sync-env-to-vps.sh
```

O script vai te pedir:
- Usuário SSH (ex: `root`)
- Endereço VPS (ex: `bsconsultoriadeimoveis.com.br`)
- Confirmação

### Opção B: Editar .env manualmente no VPS

**No terminal do VPS:**

```bash
# Verificar se .env existe
ls -la .env

# Se não existir, criar a partir do exemplo
cp .env.local .env

# Editar arquivo
nano .env
```

**Variáveis OBRIGATÓRIAS no .env:**

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://chat.layermarketing.com.br
EVOLUTION_API_KEY=821A7182F9D1-4D51-BFE4-BCDA23DA3A32
EVOLUTION_INSTANCE=BS_Consultoria

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Baserow
BASEROW_API_URL=https://api.baserow.io
BASEROW_TOKEN=...
BASEROW_TABLE_ID=693576

# Portas
SDR_PORT=3002
PORT=3003

# Site
SITE_BASE_URL=https://bsconsultoriadeimoveis.com.br
```

**Salvar:** `Ctrl + X` → `Y` → `Enter`

---

## 📦 PASSO 5: Instalar/Atualizar Dependências

```bash
# Instalar dependências
npm install --production

# Se houver erro de permissões
sudo npm install --production
```

---

## 🔍 PASSO 6: Verificar se PM2 está Instalado

```bash
# Verificar PM2
pm2 --version

# Se PM2 não estiver instalado
sudo npm install -g pm2
```

---

## 🚀 PASSO 7: Iniciar o Servidor SDR com PM2

### Parar processos existentes (se houver)

```bash
# Ver processos rodando
pm2 status

# Parar todos
pm2 stop all

# Ou parar apenas o SDR
pm2 stop sdr-agent
```

### Iniciar os servidores usando o ecosystem

```bash
# Iniciar TODOS os servidores (frontend + SDR)
pm2 start ecosystem.config.cjs

# Verificar status
pm2 status
```

**Resultado esperado:**
```
┌─────┬─────────────────┬─────────┬─────────┐
│ id  │ name            │ status  │ restart │
├─────┼─────────────────┼─────────┼─────────┤
│ 0   │ bs-consultoria  │ online  │ 0       │
│ 1   │ sdr-agent       │ online  │ 0       │
└─────┴─────────────────┴─────────┴─────────┘
```

### Salvar configuração PM2

```bash
# Salvar para reiniciar automaticamente após reboot
pm2 save

# Configurar para iniciar com o sistema
pm2 startup
# (Execute o comando que PM2 mostrar)
```

---

## 🔍 PASSO 8: Verificar Logs e Status

```bash
# Ver logs em tempo real
pm2 logs sdr-agent

# Ver apenas erros
pm2 logs sdr-agent --err

# Ver últimas 50 linhas
pm2 logs sdr-agent --lines 50

# Para sair dos logs: Ctrl + C
```

**Busque por estas mensagens de sucesso:**
```
✅ SDR Agent Server running on port 3002
✅ Redis: Connected to Upstash successfully
✅ SDR Agent: Redis initialized successfully
```

**Se houver erros:**
- Verifique as variáveis de ambiente no `.env`
- Confira se as API keys estão corretas
- Veja a seção de Troubleshooting abaixo

---

## 🌐 PASSO 9: Configurar Nginx (Proxy)

O Nginx deve fazer proxy das requisições do webhook para o servidor SDR.

### Verificar configuração do Nginx

```bash
# Ver configuração atual
sudo cat /etc/nginx/sites-available/bs-consultoria
# OU
sudo cat /etc/nginx/sites-enabled/default
```

### Adicionar rota do webhook

```bash
# Editar configuração
sudo nano /etc/nginx/sites-available/bs-consultoria
```

**Adicione esta configuração dentro do bloco `server`:**

```nginx
# Proxy para webhook do WhatsApp (porta 3002)
location /webhook/whatsapp {
    proxy_pass http://localhost:3002/webhook/whatsapp;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts para processamento da IA
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Proxy para webhook do Typebot (porta 3002)
location /webhook/typebot {
    proxy_pass http://localhost:3002/webhook/typebot;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# API de teste (opcional)
location /api/test-ai {
    proxy_pass http://localhost:3002/api/test-ai;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Salvar:** `Ctrl + X` → `Y` → `Enter`

### Testar e reiniciar Nginx

```bash
# Testar configuração
sudo nginx -t

# Se OK, reiniciar
sudo systemctl restart nginx

# Verificar status
sudo systemctl status nginx
```

---

## ✅ PASSO 10: Testar o Servidor

### Teste 1: Health Check Local

```bash
# No VPS, testar se servidor está respondendo
curl http://localhost:3002/health
```

**Resposta esperada:**
```json
{"status":"ok","service":"SDR Agent"}
```

### Teste 2: Health Check Externo

**No seu computador local:**

```bash
curl https://bsconsultoriadeimoveis.com.br/webhook/whatsapp
```

Deve retornar algo (não erro 502 ou 404).

### Teste 3: Testar IA

```bash
# No VPS
curl -X POST http://localhost:3002/api/test-ai \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"5511999999999","message":"Olá"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "response": "Oi! Sou a Mia 😊 ...",
  "context": {...}
}
```

---

## 📱 PASSO 11: Configurar Webhook na Evolution API

### Verificar webhook atual

```bash
curl https://chat.layermarketing.com.br/webhook/find/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"
```

### Configurar webhook (se necessário)

**Opção A: Via painel web**

1. Acesse: https://chat.layermarketing.com.br
2. Faça login
3. Vá em **Instância: BS_Consultoria**
4. Clique em **Settings** → **Webhook**
5. Configure:
   - **URL:** `https://bsconsultoriadeimoveis.com.br/webhook/whatsapp`
   - **Events:** Marque `messages.upsert`
   - **Enabled:** ✅
6. Salve

**Opção B: Via API (no VPS ou local)**

```bash
curl -X POST https://chat.layermarketing.com.br/webhook/set/BS_Consultoria \
  -H "Content-Type: application/json" \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32" \
  -d '{
    "url": "https://bsconsultoriadeimoveis.com.br/webhook/whatsapp",
    "webhook_by_events": false,
    "webhook_base64": false,
    "events": ["messages.upsert"]
  }'
```

---

## 🧪 PASSO 12: Testar End-to-End

### Enviar mensagem de teste via WhatsApp

1. Abra o WhatsApp
2. Envie uma mensagem para o número conectado na Evolution API
3. Aguarde a resposta da Mia

**Esperado:**
- Bot responde em 2-5 segundos
- Mensagem: "Oi! Sou a Mia 😊 ..."

### Monitorar logs em tempo real

```bash
# No VPS
pm2 logs sdr-agent
```

Você deve ver:
- Webhook recebido
- Processamento da mensagem
- Resposta da IA
- Envio da mensagem

---

## 📊 Comandos Úteis

### Gerenciamento PM2

```bash
# Status de todos os processos
pm2 status

# Logs em tempo real
pm2 logs sdr-agent

# Reiniciar apenas o SDR
pm2 restart sdr-agent

# Parar SDR
pm2 stop sdr-agent

# Ver uso de recursos
pm2 monit

# Limpar logs antigos
pm2 flush
```

### Verificar conectividade

```bash
# Verificar se porta 3002 está em uso
lsof -i :3002

# Testar Evolution API
curl https://chat.layermarketing.com.br/instance/connectionState/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"
```

---

## 🐛 Troubleshooting

### Erro: "SDR Agent not starting"

```bash
# Ver logs de erro
pm2 logs sdr-agent --err

# Verificar variáveis de ambiente
cat .env | grep -E "(OPENAI|EVOLUTION|REDIS)"

# Reiniciar
pm2 restart sdr-agent
```

### Erro: "Redis connection failed"

```bash
# Verificar se UPSTASH_REDIS_REST_URL e TOKEN estão no .env
grep UPSTASH .env

# Se estiver vazio, adicione as credenciais
nano .env
```

### Erro: "OpenAI API error 401"

```bash
# Verificar API key
grep OPENAI_API_KEY .env

# Testar API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(grep OPENAI_API_KEY .env | cut -d'=' -f2)"
```

### Erro: "502 Bad Gateway" no Nginx

```bash
# Verificar se servidor está rodando
pm2 status

# Verificar se porta 3002 está em uso
curl http://localhost:3002/health

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Bot não responde no WhatsApp

```bash
# 1. Verificar se Evolution API está conectada
curl https://chat.layermarketing.com.br/instance/connectionState/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"

# 2. Verificar webhook configurado
curl https://chat.layermarketing.com.br/webhook/find/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"

# 3. Enviar mensagem de teste e monitorar logs
pm2 logs sdr-agent
# (Envie mensagem no WhatsApp)
```

---

## ✅ Checklist Final

- [ ] Conectado ao VPS via SSH
- [ ] Código atualizado (git pull)
- [ ] Arquivo .env configurado com todas as variáveis
- [ ] Dependências instaladas (npm install)
- [ ] PM2 iniciou o sdr-agent (status: online)
- [ ] Health check local funcionando
- [ ] Nginx configurado e reiniciado
- [ ] Webhook configurado na Evolution API
- [ ] Teste end-to-end com WhatsApp funcionando

---

## 🎉 Deploy Concluído!

Se todos os passos acima foram concluídos com sucesso, o Agente SDR está rodando em produção!

### Monitoramento Contínuo

```bash
# Ver logs em tempo real
pm2 logs sdr-agent

# Ver métricas de uso
pm2 monit

# Ver status
pm2 status
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `pm2 logs sdr-agent --err`
2. Consulte a documentação em `TROUBLESHOOTING.md`
3. Revise as variáveis de ambiente no `.env`

---

**Última atualização:** 2025-11-12
