#!/bin/bash
# ========================================
# Script de Deploy Completo - BS Consultoria VPS
# ========================================
#
# Este script deve ser executado NA VPS via SSH
#
# Como usar:
# 1. Conecte na VPS: ssh seu-usuario@seu-servidor
# 2. Navegue até o diretório: cd /var/www/bs-consultoria-net-style-main
# 3. Execute este script: bash deploy-completo-vps.sh
#
# ========================================

set -e  # Para na primeira falha

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo -e "${BLUE}🚀 DEPLOY BS CONSULTORIA - VPS${NC}"
echo "=========================================="
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 1. Pull das mudanças do GitHub
echo -e "${YELLOW}📥 1/7 - Baixando atualizações do GitHub...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer pull do GitHub${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Código atualizado!${NC}"
echo ""

# 2. Instalar/atualizar dependências
echo -e "${YELLOW}📦 2/7 - Instalando dependências...${NC}"
npm install --production
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependências instaladas!${NC}"
echo ""

# 3. Build do frontend
echo -e "${YELLOW}🏗️  3/7 - Fazendo build do frontend...${NC}"
echo "   Este processo pode levar alguns minutos..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer build do frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend buildado com sucesso!${NC}"
echo ""

# 4. Verificar variáveis de ambiente
echo -e "${YELLOW}🔍 4/7 - Verificando arquivo .env...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}⚠️  ATENÇÃO: Arquivo .env não encontrado!${NC}"
    echo "   Criando .env a partir de .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  IMPORTANTE: Configure as variáveis no arquivo .env!${NC}"
    echo "   Execute: nano .env"
    exit 1
else
    echo -e "${GREEN}✅ Arquivo .env encontrado!${NC}"
fi
echo ""

# 5. Verificar/ajustar permissões
echo -e "${YELLOW}🔐 5/7 - Verificando permissões...${NC}"
# Criar diretório de logs se não existir
mkdir -p logs
# Criar diretório de imóveis se não existir
mkdir -p public/imoveis
# Ajustar permissões
chmod 755 dist 2>/dev/null || true
chmod 755 public/imoveis
echo -e "${GREEN}✅ Permissões ajustadas!${NC}"
echo ""

# 6. Restart PM2
echo -e "${YELLOW}🔄 6/7 - Reiniciando servidores PM2...${NC}"
pm2 restart all
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Processos não estavam rodando, iniciando...${NC}"
    pm2 start ecosystem.config.cjs
fi
# Salvar configuração
pm2 save
echo -e "${GREEN}✅ Servidores reiniciados!${NC}"
echo ""

# 7. Aguardar e verificar status
echo -e "${YELLOW}⏳ 7/7 - Aguardando servidores iniciarem...${NC}"
sleep 5
echo ""

echo -e "${YELLOW}📊 Status dos servidores:${NC}"
pm2 status
echo ""

# 8. Testar health checks
echo -e "${YELLOW}🏥 Testando health checks...${NC}"
echo ""

# Testar backend principal (porta 3003)
echo -n "   Backend (porta 3003): "
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FALHOU (HTTP $BACKEND_STATUS)${NC}"
fi

# Testar SDR Agent (porta 3002)
echo -n "   SDR Agent (porta 3002): "
SDR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health 2>/dev/null || echo "000")
if [ "$SDR_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FALHOU (HTTP $SDR_STATUS)${NC}"
fi

echo ""

# 9. Verificar Nginx
echo -e "${YELLOW}🌐 Verificando Nginx...${NC}"
sudo nginx -t 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuração do Nginx OK${NC}"
    echo -e "${YELLOW}   Reiniciando Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx recarregado!${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx precisa de ajustes${NC}"
fi
echo ""

# Resultado final
echo "=========================================="
echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📋 Informações importantes:${NC}"
echo ""
echo -e "   ${GREEN}Frontend:${NC} https://bsconsultoriadeimoveis.com.br"
echo -e "   ${GREEN}Painel Admin:${NC} https://bsconsultoriadeimoveis.com.br/admin"
echo -e "   ${GREEN}Backend:${NC} Porta 3003"
echo -e "   ${GREEN}SDR Agent:${NC} Porta 3002"
echo ""
echo -e "${BLUE}📊 Comandos úteis:${NC}"
echo ""
echo "   Ver logs em tempo real:"
echo "      pm2 logs"
echo ""
echo "   Ver logs do SDR:"
echo "      pm2 logs sdr-agent --lines 50"
echo ""
echo "   Ver status dos servidores:"
echo "      pm2 status"
echo ""
echo "   Monitorar recursos:"
echo "      pm2 monit"
echo ""
echo "   Reiniciar tudo:"
echo "      pm2 restart all"
echo ""
echo -e "${BLUE}🔧 Troubleshooting:${NC}"
echo ""
echo "   Se houver erro 502 Bad Gateway:"
echo "      - Verifique se PM2 está rodando: pm2 status"
echo "      - Verifique logs: pm2 logs"
echo "      - Reinicie: pm2 restart all"
echo ""
echo "   Se o agente não responder:"
echo "      - Verifique variáveis no .env"
echo "      - Teste o webhook: curl https://bsconsultoriadeimoveis.com.br/webhook/whatsapp"
echo "      - Veja logs: pm2 logs sdr-agent"
echo ""
echo "=========================================="
echo ""
