#!/bin/bash
# Script para atualizar variáveis de ambiente na VPS
# Execute este script diretamente na VPS via SSH

echo "🔄 Atualizando variáveis de ambiente..."

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Criando arquivo .env..."
    touch .env
fi

# Atualizar/adicionar as variáveis de ambiente
echo "📝 Atualizando EVOLUTION_API_KEY..."
sed -i 's|EVOLUTION_API_KEY=.*|EVOLUTION_API_KEY=96BB5398816C-4BE6-A758-9D7C8B4E676D|g' .env || echo "EVOLUTION_API_KEY=96BB5398816C-4BE6-A758-9D7C8B4E676D" >> .env

echo "📝 Atualizando SITE_BASE_URL..."
sed -i 's|SITE_BASE_URL=.*|SITE_BASE_URL=https://bsconsultoriadeimoveis.com.br|g' .env || echo "SITE_BASE_URL=https://bsconsultoriadeimoveis.com.br" >> .env

echo "📝 Atualizando WEBHOOK_BASE_URL..."
sed -i 's|WEBHOOK_BASE_URL=.*|WEBHOOK_BASE_URL=https://bsconsultoriadeimoveis.com.br|g' .env || echo "WEBHOOK_BASE_URL=https://bsconsultoriadeimoveis.com.br" >> .env

echo "📝 Atualizando VITE_API_URL..."
sed -i 's|VITE_API_URL=.*|VITE_API_URL=https://bsconsultoriadeimoveis.com.br|g' .env || echo "VITE_API_URL=https://bsconsultoriadeimoveis.com.br" >> .env

echo "📝 Atualizando BASEROW_TOKEN..."
sed -i 's|BASEROW_TOKEN=.*|BASEROW_TOKEN=G56T8RRjZXbm2wrgFr66f9phpJSVKbwt|g' .env || echo "BASEROW_TOKEN=G56T8RRjZXbm2wrgFr66f9phpJSVKbwt" >> .env

echo "📝 Atualizando BASEROW_API_URL..."
sed -i 's|BASEROW_API_URL=.*|BASEROW_API_URL=https://api.baserow.io|g' .env || echo "BASEROW_API_URL=https://api.baserow.io" >> .env

echo "📝 Atualizando BASEROW_TABLE_ID..."
sed -i 's|BASEROW_TABLE_ID=.*|BASEROW_TABLE_ID=693576|g' .env || echo "BASEROW_TABLE_ID=693576" >> .env

echo ""
echo "✅ Variáveis de ambiente atualizadas!"
echo ""
echo "📋 Verificando configuração:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "EVOLUTION_API_KEY" .env | sed 's/=.*/=***hidden***/'
grep "SITE_BASE_URL" .env
grep "WEBHOOK_BASE_URL" .env
grep "VITE_API_URL" .env
grep "BASEROW_TOKEN" .env | sed 's/=.*/=***hidden***/'
grep "BASEROW_API_URL" .env
grep "BASEROW_TABLE_ID" .env
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Próximo passo: Execute o deploy"
echo "   ./deploy-sdr-vps.sh"
