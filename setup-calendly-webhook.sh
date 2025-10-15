#!/bin/bash

# Script para configurar webhook do Calendly automaticamente
# Execute: chmod +x setup-calendly-webhook.sh && ./setup-calendly-webhook.sh

echo "🔗 Configuração do Webhook Calendly"
echo "===================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se .env.local existe
if [ ! -f .env.local ]; then
    echo -e "${RED}✗ Arquivo .env.local não encontrado${NC}"
    exit 1
fi

# Ler configurações do .env.local
CALENDLY_TOKEN=$(grep "CALENDLY_API_KEY=" .env.local | cut -d'=' -f2)
WEBHOOK_URL=$(grep "WEBHOOK_BASE_URL=" .env.local | cut -d'=' -f2)

if [ -z "$CALENDLY_TOKEN" ]; then
    echo -e "${RED}✗ CALENDLY_API_KEY não configurado em .env.local${NC}"
    exit 1
fi

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${YELLOW}⚠ WEBHOOK_BASE_URL não configurado, usando padrão${NC}"
    WEBHOOK_URL="https://bs-consultoria.vercel.app"
fi

FULL_WEBHOOK_URL="${WEBHOOK_URL}/webhook/calendly"

echo "📋 Configurações:"
echo "   Token: ${CALENDLY_TOKEN:0:20}..."
echo "   Webhook URL: $FULL_WEBHOOK_URL"
echo ""

# Verificar webhooks existentes
echo "🔍 Verificando webhooks existentes..."

webhooks_response=$(curl -s \
    -H "Authorization: Bearer $CALENDLY_TOKEN" \
    -H "Content-Type: application/json" \
    https://api.calendly.com/webhook_subscriptions)

# Verificar se já existe webhook com essa URL
if echo "$webhooks_response" | grep -q "$FULL_WEBHOOK_URL"; then
    echo -e "${YELLOW}⚠ Webhook já existe para esta URL${NC}"
    echo ""
    echo "Webhooks existentes:"
    echo "$webhooks_response" | grep -o '"uri":"[^"]*"' | cut -d'"' -f4
    echo ""

    read -p "Deseja criar um novo webhook mesmo assim? (s/N): " confirm
    if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
        echo "Operação cancelada."
        exit 0
    fi
fi

echo ""
echo "🚀 Criando webhook..."

# Criar webhook
response=$(curl -s -w "\n%{http_code}" -X POST \
    https://api.calendly.com/webhook_subscriptions \
    -H "Authorization: Bearer $CALENDLY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"$FULL_WEBHOOK_URL\",
        \"events\": [\"invitee.created\", \"invitee.canceled\"],
        \"organization\": \"https://api.calendly.com/organizations/1a10cc01-8cca-4035-9626-1271b704f8cb\",
        \"scope\": \"organization\",
        \"signing_key\": \"\"
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ Webhook criado com sucesso!${NC}"
    echo ""

    # Extrair URI do webhook
    webhook_uri=$(echo "$body" | grep -o '"uri":"[^"]*"' | head -1 | cut -d'"' -f4)
    webhook_state=$(echo "$body" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

    echo "📝 Detalhes do Webhook:"
    echo "   URI: $webhook_uri"
    echo "   Status: $webhook_state"
    echo "   URL: $FULL_WEBHOOK_URL"
    echo "   Eventos: invitee.created, invitee.canceled"
    echo ""

    echo -e "${GREEN}✅ Configuração concluída!${NC}"
    echo ""
    echo "📚 Próximos passos:"
    echo "   1. Inicie o servidor: node server/sdr-server.js"
    echo "   2. Teste o agendamento via WhatsApp"
    echo "   3. Monitore os logs para ver os webhooks chegando"
    echo ""
    echo "🧪 Para testar:"
    echo "   1. Acesse: https://calendly.com/negociosimobiliariosbs/30min"
    echo "   2. Agende uma visita de teste"
    echo "   3. Verifique as confirmações no WhatsApp"

elif [ "$http_code" = "400" ]; then
    echo -e "${RED}✗ Erro 400: Requisição inválida${NC}"
    echo ""
    echo "Resposta da API:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"

elif [ "$http_code" = "401" ]; then
    echo -e "${RED}✗ Erro 401: Token inválido ou expirado${NC}"
    echo ""
    echo "Verifique se o CALENDLY_API_KEY está correto no .env.local"

elif [ "$http_code" = "422" ]; then
    echo -e "${YELLOW}⚠ Erro 422: Webhook já existe ou dados inválidos${NC}"
    echo ""
    echo "Resposta da API:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    echo "💡 Dica: Verifique os webhooks existentes em:"
    echo "   https://calendly.com/integrations/api_webhooks"

else
    echo -e "${RED}✗ Erro HTTP $http_code${NC}"
    echo ""
    echo "Resposta da API:"
    echo "$body"
fi

echo ""
echo "=================================="
echo ""
echo "📖 Documentação: WEBHOOK_SETUP.md"
echo "🔗 Painel Calendly: https://calendly.com/integrations/api_webhooks"
