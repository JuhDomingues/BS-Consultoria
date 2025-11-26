#!/bin/bash
# Deploy Script para VPS - BS Consultoria
# Execute este script na VPS para aplicar as correções do agente

set -e  # Para na primeira falha

echo "=========================================="
echo "🚀 DEPLOY BS CONSULTORIA - VPS"
echo "=========================================="
echo ""

# 1. Pull das mudanças
echo "📥 1/5 - Baixando atualizações do GitHub..."
cd /var/www/bs-consultoria-net-style-main
git pull origin main
echo "✅ Código atualizado!"
echo ""

# 2. Instalar dependências (se houver novas)
echo "📦 2/5 - Verificando dependências..."
npm install --production
echo "✅ Dependências verificadas!"
echo ""

# 3. Verificar variáveis de ambiente
echo "🔍 3/5 - Verificando arquivo .env..."
if [ ! -f .env ]; then
    echo "⚠️  ATENÇÃO: Arquivo .env não encontrado!"
    echo "Criando .env a partir de .env.example..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Configure as variáveis no arquivo .env!"
else
    echo "✅ Arquivo .env encontrado!"
fi
echo ""

# 4. Restart PM2
echo "🔄 4/5 - Reiniciando servidores PM2..."
pm2 restart all
echo "✅ Servidores reiniciados!"
echo ""

# 5. Verificar status
echo "📊 5/5 - Status dos servidores:"
pm2 status
echo ""

echo "=========================================="
echo "✅ DEPLOY CONCLUÍDO!"
echo "=========================================="
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar logs: pm2 logs sdr-agent --lines 50"
echo "2. Testar WhatsApp: Envie 'Oi' para o número do bot"
echo "3. Monitorar: pm2 monit"
echo ""
echo "🔧 Se houver erros de API (401):"
echo "   - Baserow: Verifique BASEROW_TOKEN no .env"
echo "   - Evolution: Verifique EVOLUTION_API_KEY no .env"
echo "   - Redis: Adicione UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN"
echo ""
