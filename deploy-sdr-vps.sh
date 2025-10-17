#!/bin/bash
# Script de Deploy Rápido do Agente SDR no VPS

echo "🚀 Deploy do Agente SDR no VPS"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "ecosystem.config.cjs" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 1. Verificar variáveis de ambiente
echo -e "${YELLOW}📋 Verificando variáveis de ambiente...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo "   Copie o arquivo .env.local para .env e configure as variáveis"
    exit 1
fi

# Verificar variáveis essenciais
REQUIRED_VARS=("OPENAI_API_KEY" "EVOLUTION_API_URL" "EVOLUTION_API_KEY" "EVOLUTION_INSTANCE" "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env || grep -q "^${var}=\"\"$" .env; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Variáveis de ambiente faltando ou vazias:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "   Configure estas variáveis no arquivo .env antes de continuar"
    exit 1
fi

echo -e "${GREEN}✅ Variáveis de ambiente configuradas${NC}"
echo ""

# 2. Instalar/atualizar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

# 3. Verificar se PM2 está instalado
echo -e "${YELLOW}🔍 Verificando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 não encontrado!${NC}"
    echo "   Instale PM2 globalmente: npm install -g pm2"
    exit 1
fi
echo -e "${GREEN}✅ PM2 encontrado${NC}"
echo ""

# 4. Parar processos existentes
echo -e "${YELLOW}⏸️  Parando processos existentes...${NC}"
pm2 stop sdr-agent 2>/dev/null || true
pm2 delete sdr-agent 2>/dev/null || true
echo -e "${GREEN}✅ Processos parados${NC}"
echo ""

# 5. Iniciar servidor SDR
echo -e "${YELLOW}🚀 Iniciando servidor SDR...${NC}"
pm2 start ecosystem.config.cjs
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao iniciar servidor SDR${NC}"
    echo "   Verifique os logs com: pm2 logs sdr-agent"
    exit 1
fi
echo -e "${GREEN}✅ Servidor SDR iniciado${NC}"
echo ""

# 6. Salvar configuração PM2
echo -e "${YELLOW}💾 Salvando configuração PM2...${NC}"
pm2 save
echo -e "${GREEN}✅ Configuração salva${NC}"
echo ""

# 7. Aguardar alguns segundos para o servidor iniciar
echo -e "${YELLOW}⏳ Aguardando servidor iniciar...${NC}"
sleep 5

# 8. Verificar status
echo -e "${YELLOW}🔍 Verificando status...${NC}"
pm2 status
echo ""

# 9. Testar health check
echo -e "${YELLOW}🏥 Testando health check...${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3002/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Health check OK:${NC} $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health check falhou!${NC}"
    echo "   Verifique os logs com: pm2 logs sdr-agent"
    exit 1
fi
echo ""

# 10. Instruções finais
echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo ""
echo "================================"
echo "📋 Próximos Passos:"
echo "================================"
echo ""
echo "1. Configurar Nginx para fazer proxy do webhook:"
echo "   sudo nano /etc/nginx/sites-available/bs-consultoria"
echo ""
echo "2. Adicionar esta configuração no Nginx:"
echo ""
echo "   location /webhook/whatsapp {"
echo "       proxy_pass http://localhost:3002/webhook/whatsapp;"
echo "       proxy_http_version 1.1;"
echo "       proxy_set_header Host \$host;"
echo "       proxy_set_header X-Real-IP \$remote_addr;"
echo "   }"
echo ""
echo "3. Testar e reiniciar Nginx:"
echo "   sudo nginx -t"
echo "   sudo systemctl restart nginx"
echo ""
echo "4. Verificar se o webhook está configurado na Evolution API:"
echo "   URL: https://bsconsultoriadeimoveis.com.br/webhook/whatsapp"
echo ""
echo "================================"
echo "📊 Comandos Úteis:"
echo "================================"
echo ""
echo "Ver logs em tempo real:"
echo "  pm2 logs sdr-agent"
echo ""
echo "Ver status:"
echo "  pm2 status"
echo ""
echo "Reiniciar:"
echo "  pm2 restart sdr-agent"
echo ""
echo "Parar:"
echo "  pm2 stop sdr-agent"
echo ""
echo "Ver uso de recursos:"
echo "  pm2 monit"
echo ""
echo "================================"
