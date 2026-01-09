#!/bin/bash
# ========================================
# Script de Deploy Remoto - BS Consultoria
# ========================================
#
# Este script deve ser executado NO SEU COMPUTADOR LOCAL
# Ele se conecta via SSH à VPS e executa o deploy automaticamente
#
# Como usar:
# 1. Configure as variáveis abaixo com os dados da sua VPS
# 2. Execute: bash deploy-from-local.sh
#
# ========================================

# ===== CONFIGURAÇÕES - EDITE AQUI =====
VPS_USER="root"  # Usuário SSH da VPS
VPS_HOST="seu-servidor.com"  # IP ou domínio da VPS
VPS_PATH="/var/www/bs-consultoria-net-style-main"  # Caminho do projeto na VPS
# ======================================

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo -e "${BLUE}🚀 DEPLOY REMOTO - BS CONSULTORIA${NC}"
echo "=========================================="
echo ""

# Verificar se configurações foram alteradas
if [ "$VPS_HOST" = "seu-servidor.com" ]; then
    echo -e "${RED}❌ Erro: Configure as variáveis no início do script!${NC}"
    echo ""
    echo "Edite o arquivo deploy-from-local.sh e altere:"
    echo "   - VPS_USER: usuário SSH"
    echo "   - VPS_HOST: IP ou domínio da VPS"
    echo "   - VPS_PATH: caminho do projeto na VPS"
    echo ""
    exit 1
fi

# Verificar conectividade SSH
echo -e "${YELLOW}🔍 Verificando conexão SSH...${NC}"
ssh -o ConnectTimeout=5 -o BatchMode=yes "$VPS_USER@$VPS_HOST" echo "Conectado" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Não foi possível conectar via SSH${NC}"
    echo ""
    echo "Verifique:"
    echo "   - Se o IP/domínio está correto"
    echo "   - Se as chaves SSH estão configuradas"
    echo "   - Se a VPS está acessível"
    echo ""
    echo "Tente conectar manualmente: ssh $VPS_USER@$VPS_HOST"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Conexão SSH OK${NC}"
echo ""

# 1. Push das mudanças locais para GitHub
echo -e "${YELLOW}📤 1/3 - Verificando mudanças locais...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}   Existem mudanças não commitadas${NC}"
    echo -e "${YELLOW}   Commitando automaticamente...${NC}"
    git add .
    git commit -m "chore: Deploy $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${GREEN}   ✅ Commit criado${NC}"
fi

echo -e "${YELLOW}   Fazendo push para GitHub...${NC}"
git push origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer push para GitHub${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Código enviado para GitHub!${NC}"
echo ""

# 2. Copiar script de deploy para VPS
echo -e "${YELLOW}📋 2/3 - Copiando script de deploy para VPS...${NC}"
scp -q deploy-completo-vps.sh "$VPS_USER@$VPS_HOST:$VPS_PATH/"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao copiar script${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Script copiado!${NC}"
echo ""

# 3. Executar deploy na VPS
echo -e "${YELLOW}🚀 3/3 - Executando deploy na VPS...${NC}"
echo ""
echo "=========================================="
echo -e "${BLUE}Iniciando deploy remoto...${NC}"
echo "=========================================="
echo ""

ssh -t "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && bash deploy-completo-vps.sh"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ DEPLOY CONCLUÍDO COM SUCESSO!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}🌐 Acesse seu site:${NC}"
    echo "   https://bsconsultoriadeimoveis.com.br"
    echo ""
else
    echo ""
    echo "=========================================="
    echo -e "${RED}❌ ERRO NO DEPLOY${NC}"
    echo "=========================================="
    echo ""
    echo "Conecte manualmente para verificar:"
    echo "   ssh $VPS_USER@$VPS_HOST"
    echo "   cd $VPS_PATH"
    echo "   pm2 logs"
    echo ""
    exit 1
fi
