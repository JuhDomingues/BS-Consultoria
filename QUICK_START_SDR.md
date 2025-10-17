# 🚀 Quick Start - Agente SDR em Produção

## ⚡ Deploy Rápido (5 minutos)

### 1. Conectar ao VPS

```bash
ssh usuario@bsconsultoriadeimoveis.com.br
```

### 2. Navegar para o projeto

```bash
cd /var/www/BS-Consultoria
```

### 3. Baixar atualizações

```bash
git pull origin main
```

### 4. Copiar arquivo .env

```bash
cp .env.local .env
# ou se já tiver .env configurado, pule este passo
```

### 5. Executar script de deploy

```bash
./deploy-sdr-vps.sh
```

O script fará automaticamente:
- ✅ Verificar variáveis de ambiente
- ✅ Instalar dependências
- ✅ Parar processos antigos
- ✅ Iniciar servidor SDR
- ✅ Salvar configuração PM2
- ✅ Testar health check

### 6. Configurar Nginx (apenas uma vez)

```bash
# Copiar configuração
sudo cp nginx-sdr-config.example /etc/nginx/sites-available/bs-consultoria

# Criar link simbólico (se ainda não existir)
sudo ln -sf /etc/nginx/sites-available/bs-consultoria /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 7. Testar

```bash
# No servidor
curl http://localhost:3002/health

# De fora
curl https://bsconsultoriadeimoveis.com.br/webhook/whatsapp
```

## ✅ Verificação

Se tudo funcionou:
- [ ] `pm2 status` mostra "sdr-agent" como "online"
- [ ] `curl http://localhost:3002/health` retorna `{"status":"ok"}`
- [ ] Nginx está rodando sem erros
- [ ] Webhook responde na URL pública

## 🔧 Comandos Úteis

```bash
# Ver logs
pm2 logs sdr-agent

# Ver status
pm2 status

# Reiniciar
pm2 restart sdr-agent

# Parar
pm2 stop sdr-agent

# Monitorar recursos
pm2 monit
```

## 📱 Testar WhatsApp

1. Envie uma mensagem no WhatsApp para o número configurado
2. O bot deve responder automaticamente
3. Verifique os logs: `pm2 logs sdr-agent`

## 🐛 Problemas?

Se não funcionar, veja o guia completo: [DEPLOY_SDR_VPS.md](./DEPLOY_SDR_VPS.md)

## 📋 Checklist de Troubleshooting

```bash
# 1. Servidor está rodando?
pm2 status

# 2. Health check funciona?
curl http://localhost:3002/health

# 3. Variáveis de ambiente estão ok?
pm2 env 0  # substituir 0 pelo ID do processo

# 4. Ver logs de erro
pm2 logs sdr-agent --err

# 5. Nginx está ok?
sudo nginx -t
sudo systemctl status nginx

# 6. Webhook está configurado na Evolution API?
curl https://chat.layermarketing.com.br/webhook/find/BS_Consultoria \
  -H "apikey: 821A7182F9D1-4D51-BFE4-BCDA23DA3A32"
```

## 🔄 Atualizar o Código

```bash
# 1. Conectar ao VPS
ssh usuario@bsconsultoriadeimoveis.com.br

# 2. Ir para o diretório
cd /var/www/BS-Consultoria

# 3. Baixar atualizações
git pull origin main

# 4. Instalar novas dependências (se houver)
npm install

# 5. Reiniciar
pm2 restart sdr-agent

# 6. Verificar
pm2 logs sdr-agent
```

## 🎉 Pronto!

O agente SDR está rodando e respondendo automaticamente no WhatsApp!
