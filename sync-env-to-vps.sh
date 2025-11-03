#!/bin/bash
# Script para copiar variáveis de ambiente para a VPS de forma segura
# Execute este script localmente (não commitar no git)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔐 Sincronizando variáveis de ambiente para VPS...${NC}"
echo ""

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Arquivo .env.local não encontrado!${NC}"
    exit 1
fi

# Solicitar credenciais da VPS
read -p "Digite o usuário SSH da VPS (padrão: root): " VPS_USER
VPS_USER=${VPS_USER:-root}

read -p "Digite o endereço da VPS: " VPS_HOST

if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}❌ Endereço da VPS é obrigatório${NC}"
    exit 1
fi

VPS_PATH="/var/www/BS-Consultoria"

echo ""
echo -e "${YELLOW}📋 Configuração:${NC}"
echo "   Usuário: $VPS_USER"
echo "   Host: $VPS_HOST"
echo "   Caminho: $VPS_PATH"
echo ""

read -p "Confirma a sincronização? (s/N): " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo -e "${YELLOW}⚠️  Operação cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📤 Copiando arquivo .env para VPS...${NC}"

# Copiar .env.local para VPS como .env
scp .env.local $VPS_USER@$VPS_HOST:$VPS_PATH/.env

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Arquivo .env copiado com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}🔄 Reiniciando agente SDR...${NC}"

    # Reiniciar o agente via SSH
    ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 restart sdr-agent"

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Agente reiniciado com sucesso!${NC}"
        echo ""
        echo -e "${YELLOW}📊 Verificando logs...${NC}"
        ssh $VPS_USER@$VPS_HOST "pm2 logs sdr-agent --lines 20 --nostream"
    else
        echo -e "${RED}❌ Erro ao reiniciar agente${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Erro ao copiar arquivo${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Sincronização concluída!${NC}"
echo ""
echo -e "${YELLOW}💡 Dica:${NC} Teste o agente enviando uma mensagem no WhatsApp"
