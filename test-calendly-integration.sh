#!/bin/bash

# Script de teste da integração Calendly
# Execute: chmod +x test-calendly-integration.sh && ./test-calendly-integration.sh

echo "🧪 Teste de Integração Calendly"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}

    echo -n "Testando $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' 2>/dev/null)
    fi

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "000" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALHOU (HTTP $http_code)${NC}"
        return 1
    fi
}

# 1. Verificar variáveis de ambiente
echo "1. Verificando variáveis de ambiente..."
echo "   --------------------------------"

if [ -f .env.local ]; then
    echo -e "   ${GREEN}✓${NC} .env.local encontrado"

    # Verificar CALENDLY_API_KEY
    if grep -q "CALENDLY_API_KEY=eyJ" .env.local; then
        echo -e "   ${GREEN}✓${NC} CALENDLY_API_KEY configurado"
    else
        echo -e "   ${RED}✗${NC} CALENDLY_API_KEY não configurado"
    fi

    # Verificar CALENDLY_USER_URI
    if grep -q "CALENDLY_USER_URI=https://api.calendly.com/users/" .env.local; then
        echo -e "   ${GREEN}✓${NC} CALENDLY_USER_URI configurado"
    else
        echo -e "   ${RED}✗${NC} CALENDLY_USER_URI não configurado"
    fi

    # Verificar CALENDLY_EVENT_TYPE_URI
    if grep -q "CALENDLY_EVENT_TYPE_URI=https://api.calendly.com/event_types/" .env.local; then
        echo -e "   ${GREEN}✓${NC} CALENDLY_EVENT_TYPE_URI configurado"
    else
        echo -e "   ${RED}✗${NC} CALENDLY_EVENT_TYPE_URI não configurado"
    fi

    # Verificar REALTOR_PHONE
    if grep -q "REALTOR_PHONE=55" .env.local; then
        echo -e "   ${GREEN}✓${NC} REALTOR_PHONE configurado"
    else
        echo -e "   ${YELLOW}⚠${NC} REALTOR_PHONE não configurado"
    fi
else
    echo -e "   ${RED}✗${NC} .env.local não encontrado"
fi

echo ""

# 2. Verificar arquivos criados
echo "2. Verificando arquivos da integração..."
echo "   -----------------------------------"

files=(
    "server/calendly-service.js"
    "server/scheduling-service.js"
    "CALENDLY_SETUP.md"
    "CALENDLY_QUICK_START.md"
    ".env.calendly.example"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
    else
        echo -e "   ${RED}✗${NC} $file não encontrado"
    fi
done

echo ""

# 3. Testar API do Calendly
echo "3. Testando conexão com API do Calendly..."
echo "   --------------------------------------"

# Ler token do .env.local
if [ -f .env.local ]; then
    CALENDLY_TOKEN=$(grep "CALENDLY_API_KEY=" .env.local | cut -d '=' -f2)

    if [ -n "$CALENDLY_TOKEN" ]; then
        echo -n "   Testando autenticação... "

        response=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $CALENDLY_TOKEN" \
            -H "Content-Type: application/json" \
            https://api.calendly.com/users/me 2>/dev/null)

        http_code=$(echo "$response" | tail -n1)

        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✓ Autenticado${NC}"

            # Extrair informações
            user_data=$(echo "$response" | head -n -1)
            user_name=$(echo "$user_data" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
            user_email=$(echo "$user_data" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)

            echo "   Usuário: $user_name"
            echo "   Email: $user_email"
        else
            echo -e "${RED}✗ Falhou (HTTP $http_code)${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠${NC} Token não encontrado no .env.local"
    fi
else
    echo -e "   ${RED}✗${NC} .env.local não encontrado"
fi

echo ""

# 4. Verificar se servidor está rodando
echo "4. Verificando servidor SDR..."
echo "   -------------------------"

if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Servidor rodando em http://localhost:3002"

    # Testar endpoints
    echo ""
    echo "   Testando endpoints:"
    test_endpoint "GET /health" "http://localhost:3002/health"
    test_endpoint "GET /api/reminders" "http://localhost:3002/api/reminders"
    test_endpoint "GET /api/conversations" "http://localhost:3002/api/conversations"

else
    echo -e "   ${RED}✗${NC} Servidor não está rodando"
    echo ""
    echo "   Para iniciar o servidor:"
    echo "   $ node server/sdr-server.js"
    echo ""
    echo "   Ou com PM2:"
    echo "   $ pm2 start server/sdr-server.js --name sdr-server"
fi

echo ""

# 5. Resumo
echo "================================"
echo "✅ Teste Concluído"
echo ""
echo "📚 Próximos passos:"
echo "   1. Se servidor não está rodando: node server/sdr-server.js"
echo "   2. Configure webhook no Calendly: https://calendly.com/integrations/api_webhooks"
echo "   3. URL do webhook: https://bs-consultoria.vercel.app/webhook/calendly"
echo "   4. Eventos: invitee.created, invitee.canceled"
echo "   5. Teste via WhatsApp: 'Quero agendar uma visita'"
echo ""
echo "📖 Documentação completa: CALENDLY_SETUP.md"
echo "🚀 Início rápido: CALENDLY_QUICK_START.md"
