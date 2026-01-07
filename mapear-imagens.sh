#!/bin/bash
# Script para ajudar a mapear IDs novos do Baserow para IDs antigos das pastas

echo "=========================================="
echo "🗺️  MAPEAMENTO DE IMÓVEIS - IDs"
echo "=========================================="
echo ""

# IDs ativos no Baserow (novos)
NEW_IDS=(97 104 109 110 111 112 125 298 331 364 397 398 430 463 496)

# IDs das pastas antigas disponíveis
echo "📁 Pastas de imagens disponíveis:"
echo ""
ls -1 /var/www/BS-Consultoria/public/imoveis/ | grep -E '^[0-9]+$' | sort -n
echo ""

echo "=========================================="
echo "📋 IMÓVEIS ATIVOS NO BASEROW"
echo "=========================================="
echo ""

# Buscar dados do Baserow
for id in "${NEW_IDS[@]}"; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🆔 ID Baserow: $id"

    # Buscar dados deste imóvel
    data=$(curl -s http://127.0.0.1:3003/api/baserow/properties | jq -r ".results[] | select(.id == $id) | \"Título: \(.Title // .title)\nLocalização: \(.location // \"N/A\")\nPreço: \(.Price // .price)\nTipo: \(.Type.value // .Type // .type)\nImagens: \(.images // .Images)\"")

    if [ ! -z "$data" ]; then
        echo "$data"
    else
        echo "⚠️  Dados não encontrados para ID $id"
    fi
    echo ""
done

echo "=========================================="
echo "📝 PRÓXIMO PASSO: CRIAR MAPEAMENTO"
echo "=========================================="
echo ""
echo "Baseado nas informações acima, identifique qual ID novo"
echo "corresponde a qual ID antigo (pelas fotos, título, localização)"
echo ""
echo "Depois, atualize o campo 'images' no Baserow para cada imóvel"
echo "mudando de '/imoveis/{id_novo}/image_1.png'"
echo "para '/imoveis/{id_antigo}/image_1.png'"
echo ""
echo "Exemplo:"
echo "  Se o imóvel ID 97 corresponder à pasta 1668579:"
echo "  Mude: /imoveis/97/image_1.png"
echo "  Para:  /imoveis/1668579/image_1.png"
echo ""
echo "✅ IDs que já têm pasta correta: 463, 496"
echo "⚠️  IDs que precisam ser mapeados: 97, 104, 109, 110, 111, 112, 125, 298, 331, 364, 397, 398, 430"
echo ""
