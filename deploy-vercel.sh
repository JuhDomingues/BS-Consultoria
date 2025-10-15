#!/bin/bash

# Script de Deploy Automatizado na Vercel
# Execute: chmod +x deploy-vercel.sh && ./deploy-vercel.sh

echo "🚀 Deploy BS Consultoria na Vercel"
echo "==================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠ Vercel CLI não encontrado${NC}"
    echo ""
    read -p "Deseja instalar? (s/N): " install
    if [ "$install" = "s" ] || [ "$install" = "S" ]; then
        echo "Instalando Vercel CLI..."
        npm install -g vercel
    else
        echo "Instalação cancelada. Instale manualmente: npm install -g vercel"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Vercel CLI encontrado"
echo ""

# Verificar login
echo "Verificando autenticação..."
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ Não autenticado${NC}"
    echo ""
    echo "Faça login na Vercel:"
    vercel login
else
    echo -e "${GREEN}✓${NC} Autenticado na Vercel"
fi

echo ""
echo "📦 Preparando projeto para deploy..."
echo ""

# Verificar arquivos necessários
files_ok=true

echo -n "Verificando vercel.json... "
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    files_ok=false
fi

echo -n "Verificando API routes... "
if [ -d "api" ] && [ -f "api/health.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    files_ok=false
fi

echo -n "Verificando .env.local... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC} Variáveis de ambiente precisarão ser configuradas"
fi

if [ "$files_ok" = false ]; then
    echo ""
    echo -e "${RED}✗ Arquivos necessários não encontrados${NC}"
    echo "Execute novamente o setup da integração Calendly"
    exit 1
fi

echo ""
echo "🎯 Opções de Deploy:"
echo "1) Deploy de Produção (recomendado)"
echo "2) Deploy de Preview"
echo "3) Apenas configurar variáveis"
echo "4) Cancelar"
echo ""

read -p "Escolha uma opção (1-4): " option

case $option in
    1)
        echo ""
        echo -e "${BLUE}Fazendo deploy de produção...${NC}"
        echo ""
        vercel --prod
        ;;
    2)
        echo ""
        echo -e "${BLUE}Fazendo deploy de preview...${NC}"
        echo ""
        vercel
        ;;
    3)
        echo ""
        echo -e "${BLUE}Configurando variáveis de ambiente...${NC}"
        echo ""
        echo "Copie e cole os valores do .env.local quando solicitado"
        echo ""

        # Lista de variáveis
        vars=(
            "OPENAI_API_KEY"
            "VITE_OPENAI_API_KEY"
            "EVOLUTION_API_URL"
            "EVOLUTION_API_KEY"
            "EVOLUTION_INSTANCE"
            "CALENDLY_API_KEY"
            "CALENDLY_USER_URI"
            "CALENDLY_EVENT_TYPE_URI"
            "CALENDLY_PUBLIC_URL"
            "REALTOR_PHONE"
            "UPSTASH_REDIS_REST_URL"
            "UPSTASH_REDIS_REST_TOKEN"
            "VITE_BASEROW_API_URL"
            "VITE_BASEROW_TOKEN"
            "VITE_BASEROW_TABLE_ID"
            "SITE_BASE_URL"
            "WEBHOOK_BASE_URL"
        )

        for var in "${vars[@]}"; do
            echo ""
            echo "Configurando $var..."

            # Pegar valor do .env.local se existir
            if [ -f ".env.local" ]; then
                value=$(grep "^$var=" .env.local | cut -d'=' -f2)
                if [ -n "$value" ]; then
                    echo "Valor encontrado em .env.local"
                    echo "$value" | vercel env add "$var" production
                else
                    vercel env add "$var" production
                fi
            else
                vercel env add "$var" production
            fi
        done

        echo ""
        echo -e "${GREEN}✓${NC} Variáveis configuradas!"
        echo "Execute novamente o script e escolha opção 1 para fazer deploy"
        ;;
    4)
        echo "Deploy cancelado"
        exit 0
        ;;
    *)
        echo "Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "=================================="
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""

# Pegar URL do deployment
if [ "$option" = "1" ] || [ "$option" = "2" ]; then
    echo "🌐 Aguardando URL do deployment..."
    sleep 3

    echo ""
    echo "📋 Próximos passos:"
    echo ""
    echo "1. Configurar webhook do WhatsApp (Evolution API):"
    echo "   URL: https://bs-consultoria.vercel.app/webhook/whatsapp"
    echo ""
    echo "2. Configurar webhook do Calendly:"
    echo "   URL: https://bs-consultoria.vercel.app/webhook/calendly"
    echo ""
    echo "3. Testar health check:"
    echo "   curl https://bs-consultoria.vercel.app/api/health"
    echo ""
    echo "4. Testar via WhatsApp"
    echo ""
    echo "📖 Guia completo: VERCEL_DEPLOY.md"
fi
