# 🚀 Guia de Deploy - BS Consultoria VPS

Este guia explica como fazer deploy do projeto BS Consultoria na VPS.

## 📋 Pré-requisitos

Antes de começar, certifique-se de que você tem:

- ✅ Acesso SSH à VPS configurado
- ✅ Projeto já clonado na VPS em `/var/www/bs-consultoria-net-style-main`
- ✅ Node.js e PM2 instalados na VPS
- ✅ Nginx configurado
- ✅ Arquivo `.env` configurado na VPS com todas as variáveis necessárias

## 🎯 Opções de Deploy

Você tem duas opções para fazer deploy:

### Opção 1: Deploy Remoto (Recomendado) 🌟

Execute o deploy do seu computador local. O script faz tudo automaticamente.

**1. Configure o script:**

Edite o arquivo `deploy-from-local.sh` e altere as seguintes linhas:

```bash
VPS_USER="root"  # Seu usuário SSH
VPS_HOST="seu-servidor.com"  # IP ou domínio da VPS
VPS_PATH="/var/www/bs-consultoria-net-style-main"  # Caminho do projeto
```

**2. Execute o deploy:**

```bash
bash deploy-from-local.sh
```

O script vai:
- ✅ Commitar e fazer push das mudanças locais
- ✅ Copiar o script de deploy para a VPS
- ✅ Conectar via SSH e executar o deploy completo
- ✅ Mostrar o resultado em tempo real

### Opção 2: Deploy Manual na VPS 🔧

Se preferir, conecte na VPS e execute manualmente.

**1. Conecte via SSH:**

```bash
ssh seu-usuario@seu-servidor
```

**2. Navegue até o diretório:**

```bash
cd /var/www/bs-consultoria-net-style-main
```

**3. Execute o script de deploy:**

```bash
bash deploy-completo-vps.sh
```

## 🔍 O que o Deploy Faz?

O script de deploy executa as seguintes etapas:

1. **Pull do GitHub** - Baixa as últimas atualizações
2. **Instalar Dependências** - Executa `npm install`
3. **Build do Frontend** - Compila o React/Vite para produção
4. **Verificar .env** - Garante que as variáveis estão configuradas
5. **Ajustar Permissões** - Configura permissões dos diretórios
6. **Restart PM2** - Reinicia todos os servidores
7. **Health Checks** - Testa se tudo está funcionando
8. **Reload Nginx** - Recarrega a configuração do Nginx

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────┐
│           Nginx (Porta 80/443)          │
│     https://bsconsultoriadeimoveis.com.br│
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
    ┌──────┐  ┌──────┐  ┌──────┐
    │ Dist │  │ API  │  │ SDR  │
    │ /    │  │:3003 │  │:3002 │
    └──────┘  └──────┘  └──────┘
    Frontend  Backend   WhatsApp
```

### Servidores Gerenciados por PM2:

- **bs-consultoria** (Porta 3003)
  - Servidor backend principal
  - Serve arquivos estáticos do frontend (dist/)
  - APIs do Baserow, upload de imagens, IA

- **sdr-agent** (Porta 3002)
  - Agente SDR para WhatsApp
  - Webhook da Evolution API
  - Gestão de conversas e leads

## 📊 Comandos Úteis na VPS

### Ver Status dos Servidores

```bash
pm2 status
```

### Ver Logs em Tempo Real

```bash
# Todos os logs
pm2 logs

# Apenas SDR Agent
pm2 logs sdr-agent

# Apenas Backend
pm2 logs bs-consultoria

# Últimas 50 linhas
pm2 logs --lines 50
```

### Reiniciar Servidores

```bash
# Reiniciar tudo
pm2 restart all

# Reiniciar apenas um
pm2 restart sdr-agent
pm2 restart bs-consultoria
```

### Parar Servidores

```bash
pm2 stop all
```

### Iniciar Servidores

```bash
pm2 start ecosystem.config.cjs
```

### Monitorar Recursos (CPU/Memória)

```bash
pm2 monit
```

### Ver Informações Detalhadas

```bash
pm2 show sdr-agent
pm2 show bs-consultoria
```

## 🔧 Troubleshooting

### Erro 502 Bad Gateway

**Problema:** Nginx não consegue conectar ao backend.

**Solução:**
```bash
# Verificar se PM2 está rodando
pm2 status

# Se não estiver, iniciar
pm2 start ecosystem.config.cjs

# Verificar logs
pm2 logs
```

### Erro 500 Internal Server Error

**Problema:** Erro no código ou variáveis de ambiente.

**Solução:**
```bash
# Ver logs do erro
pm2 logs --lines 100 --err

# Verificar arquivo .env
cat .env

# Reiniciar servidores
pm2 restart all
```

### Frontend Desatualizado

**Problema:** Mudanças não aparecem no site.

**Solução:**
```bash
# Fazer novo build
npm run build

# Limpar cache do Nginx
sudo systemctl reload nginx

# Limpar cache do navegador
# Ctrl+Shift+R ou Cmd+Shift+R
```

### Agente SDR Não Responde

**Problema:** WhatsApp não recebe respostas.

**Solução:**
```bash
# Verificar se SDR está rodando
pm2 status

# Ver logs do SDR
pm2 logs sdr-agent --lines 50

# Verificar variáveis de ambiente
cat .env | grep -E "EVOLUTION|OPENAI|REDIS"

# Reiniciar SDR
pm2 restart sdr-agent

# Testar webhook manualmente
curl -X POST https://bsconsultoriadeimoveis.com.br/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"event":"messages.upsert","data":{"key":{"remoteJid":"5511999999999@s.whatsapp.net","fromMe":false},"message":{"conversation":"teste"}}}'
```

### Banco de Dados Baserow com Erro 401

**Problema:** API retorna erro de autenticação.

**Solução:**
```bash
# Verificar token do Baserow
cat .env | grep BASEROW_TOKEN

# Testar token manualmente
curl -H "Authorization: Token SEU_TOKEN" \
  https://api.baserow.io/api/database/rows/table/SEU_TABLE_ID/
```

### Redis Desconectado

**Problema:** Conversas não são salvas.

**Solução:**
```bash
# Verificar configuração do Redis
cat .env | grep UPSTASH

# Ver logs do SDR
pm2 logs sdr-agent | grep -i redis
```

## 🌐 Configuração do Nginx

O Nginx está configurado para rotear as requisições:

- `/` → Frontend (dist/)
- `/api/baserow/` → Backend (porta 3003)
- `/api/sdr/` → SDR Agent (porta 3002)
- `/webhook/evolution` → SDR Agent (porta 3002)
- `/imoveis/` → Arquivos estáticos de imagens

**Arquivo de configuração:** `/etc/nginx/sites-available/bsconsultoriadeimoveis.com.br`

**Testar configuração:**
```bash
sudo nginx -t
```

**Recarregar Nginx:**
```bash
sudo systemctl reload nginx
```

## 📈 Monitoramento

### Health Checks

Teste se os servidores estão respondendo:

```bash
# Backend
curl http://localhost:3003/api/health

# SDR Agent
curl http://localhost:3002/health
```

### Verificar Uso de Recursos

```bash
# CPU e Memória
pm2 monit

# Espaço em disco
df -h

# Memória do sistema
free -h

# Processos Node.js
ps aux | grep node
```

### Logs do Sistema

```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do PM2
pm2 logs --lines 50

# Logs do sistema
sudo journalctl -u nginx -f
```

## 🔐 Segurança

### Backup do .env

Faça backup regular das variáveis de ambiente:

```bash
cp .env .env.backup.$(date +%Y%m%d)
```

### Atualizar Dependências

Mantenha as dependências atualizadas:

```bash
npm outdated
npm update
```

### SSL/HTTPS

Renovar certificado Let's Encrypt (automático):

```bash
sudo certbot renew --dry-run
```

## 🆘 Suporte

Se precisar de ajuda:

1. Verifique os logs: `pm2 logs`
2. Teste os health checks
3. Verifique o status do PM2: `pm2 status`
4. Verifique o Nginx: `sudo nginx -t`
5. Reinicie tudo: `pm2 restart all && sudo systemctl reload nginx`

## 📝 Notas Importantes

- **Sempre teste** em ambiente de desenvolvimento antes de fazer deploy
- **Faça backup** do arquivo `.env` antes de modificá-lo
- **Monitore os logs** após cada deploy para detectar erros
- **O build demora** alguns minutos - seja paciente
- **Limpe o cache** do navegador após deploy (Ctrl+Shift+R)

---

**Última atualização:** 2026-01-08
**Versão:** 2.0
