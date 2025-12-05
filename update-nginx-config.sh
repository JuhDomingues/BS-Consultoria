#!/bin/bash
# Script para atualizar a configuração do Nginx na VPS
# Execute este script NA VPS como root ou com sudo

set -e

echo "=========================================="
echo "🔧 ATUALIZAÇÃO NGINX - BS CONSULTORIA"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script precisa ser executado como root ou com sudo${NC}"
    exit 1
fi

CONFIG_FILE="/etc/nginx/sites-available/bsconsultoriadeimoveis.com.br"
BACKUP_FILE="${CONFIG_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${YELLOW}📋 Passo 1/6: Fazendo backup da configuração atual...${NC}"
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup salvo em: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo de configuração não existe ainda${NC}"
fi
echo ""

echo -e "${YELLOW}📝 Passo 2/6: Criando nova configuração...${NC}"
cat > "$CONFIG_FILE" << 'NGINX_CONFIG'
# Configuração completa do Nginx para BS Consultoria

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name bsconsultoriadeimoveis.com.br www.bsconsultoriadeimoveis.com.br;
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS principal
server {
    listen 443 ssl;
    http2 on;
    server_name bsconsultoriadeimoveis.com.br www.bsconsultoriadeimoveis.com.br;

    # Aumentar limite de upload
    client_max_body_size 50M;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/bsconsultoriadeimoveis.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bsconsultoriadeimoveis.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Diretório dos arquivos estáticos
    root /var/www/bs-consultoria-net-style-main/dist;
    index index.html;

    # ==================================================================
    # IMPORTANTE: As rotas mais específicas devem vir PRIMEIRO
    # ==================================================================

    # 1. API PRINCIPAL - Backend na porta 3000
    location /api/baserow/ {
        proxy_pass http://127.0.0.1:3000/api/baserow/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # 2. API de Upload - Servidor de Upload na porta 3001
    location /api/upload {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Aumentar timeouts para uploads grandes
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # 3. API de movimentação de imagens
    location /api/move-images {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Rotas do SDR Agent - Agente na porta 3002
    location /api/sdr/ {
        proxy_pass http://127.0.0.1:3002/api/sdr/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 5. Webhook do Evolution API
    location /webhook/evolution {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 6. Servir imagens dos imóveis
    location /imoveis/ {
        alias /var/www/bs-consultoria-net-style-main/public/imoveis/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    # 7. Arquivos estáticos do Vite/React (assets, js, css)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin *;
    }

    # 8. Rota catch-all para SPA React (DEVE SER A ÚLTIMA)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
}
NGINX_CONFIG

echo -e "${GREEN}✅ Nova configuração criada${NC}"
echo ""

echo -e "${YELLOW}🔍 Passo 3/6: Testando configuração do Nginx...${NC}"
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuração válida!${NC}"
else
    echo -e "${RED}❌ Erro na configuração! Restaurando backup...${NC}"
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$CONFIG_FILE"
        echo -e "${YELLOW}⚠️  Backup restaurado${NC}"
    fi
    exit 1
fi
echo ""

echo -e "${YELLOW}🔄 Passo 4/6: Parando Nginx...${NC}"
systemctl stop nginx
echo -e "${GREEN}✅ Nginx parado${NC}"
echo ""

echo -e "${YELLOW}🚀 Passo 5/6: Iniciando Nginx...${NC}"
systemctl start nginx
echo -e "${GREEN}✅ Nginx iniciado${NC}"
echo ""

echo -e "${YELLOW}📊 Passo 6/6: Verificando status...${NC}"
systemctl status nginx --no-pager -l
echo ""

echo "=========================================="
echo -e "${GREEN}✅ CONFIGURAÇÃO APLICADA COM SUCESSO!${NC}"
echo "=========================================="
echo ""
echo "📋 Testes recomendados:"
echo ""
echo "1. Testar API do Baserow:"
echo "   curl -I https://bsconsultoriadeimoveis.com.br/api/baserow/properties"
echo ""
echo "2. Verificar se retorna JSON (não HTML):"
echo "   curl https://bsconsultoriadeimoveis.com.br/api/baserow/properties | head -n 5"
echo ""
echo "3. Acessar o site no navegador:"
echo "   https://bsconsultoriadeimoveis.com.br"
echo ""
echo "4. Verificar console do navegador (F12) - não deve ter erros de JSON"
echo ""
echo -e "${YELLOW}🔧 Se houver problemas:${NC}"
echo "   - Ver logs: sudo tail -f /var/log/nginx/error.log"
echo "   - Restaurar backup: sudo cp $BACKUP_FILE $CONFIG_FILE && sudo systemctl restart nginx"
echo ""
