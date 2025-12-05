#!/bin/bash
# Script para copiar imagens das pastas antigas para pastas com IDs novos
# Solução para imóveis antigos que não passaram pelo sistema de movimentação

echo "=========================================="
echo "📁 COPIAR IMAGENS - IDs ANTIGOS → NOVOS"
echo "=========================================="
echo ""

# Verificar se está na VPS
IMOVEIS_DIR="/var/www/BS-Consultoria/public/imoveis"

if [ ! -d "$IMOVEIS_DIR" ]; then
    echo "❌ Este script deve ser executado na VPS"
    echo "   Diretório não encontrado: $IMOVEIS_DIR"
    exit 1
fi

cd "$IMOVEIS_DIR"

# ⚠️ PREENCHA O MAPEAMENTO ABAIXO
# Formato: "ID_NOVO:ID_ANTIGO"
#
# Para descobrir o mapeamento:
# 1. Veja as imagens no navegador: https://bsconsultoriadeimoveis.com.br/imoveis/{id_antigo}/image_1.png
# 2. Compare com os dados no Baserow
# 3. Preencha abaixo

declare -a MAPPINGS=(
    # Exemplo: "97:1668579"
    #
    # ⚠️ PREENCHA AQUI (um por linha):
    # "97:XXXXX"     # Sobrado R$ 420.000
    # "104:XXXXX"    # Sobrado R$ 500.000
    # "109:XXXXX"    # Sobrado R$ 580.000
    # "110:XXXXX"    # Sobrado R$ 600.000
    # "112:XXXXX"    # Sobrado R$ 680.000
    # "125:XXXXX"    # Apartamento R$ 228.000
    # "298:XXXXX"    # Sobrado móveis R$ 480.000
    # "331:XXXXX"    # Casa térrea R$ 500.000
    # "364:XXXXX"    # Sobrado 3 dorms R$ 630.000
    # "397:XXXXX"    # Sobrado Scaffidi R$ 500.000
    # "398:XXXXX"    # Sobrado 2 suítes R$ 525.000
    # "430:XXXXX"    # Sobrado piscina R$ 850.000
)

# Verificar se há mapeamentos
if [ ${#MAPPINGS[@]} -eq 0 ]; then
    echo "❌ Nenhum mapeamento definido!"
    echo "   Edite este script e preencha o array MAPPINGS"
    echo ""
    echo "📋 Exemplo:"
    echo "   MAPPINGS=("
    echo "       \"97:1668579\""
    echo "       \"104:2266571\""
    echo "   )"
    echo ""
    exit 1
fi

echo "📋 Mapeamentos a processar: ${#MAPPINGS[@]}"
echo ""

success=0
errors=0
skipped=0

for mapping in "${MAPPINGS[@]}"; do
    # Pular linhas vazias ou comentários
    [[ -z "$mapping" || "$mapping" =~ ^# ]] && continue

    # Extrair IDs
    new_id=$(echo "$mapping" | cut -d':' -f1)
    old_id=$(echo "$mapping" | cut -d':' -f2)

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📂 Processando: $new_id ← $old_id"

    # Validações
    if [ -z "$new_id" ] || [ -z "$old_id" ]; then
        echo "❌ Mapeamento inválido: $mapping"
        ((errors++))
        continue
    fi

    if [ ! -d "$old_id" ]; then
        echo "❌ Pasta antiga não existe: $old_id"
        ((errors++))
        continue
    fi

    # Verificar se já existe a pasta nova
    if [ -d "$new_id" ]; then
        echo "⚠️  Pasta $new_id já existe"
        read -p "   Sobrescrever? (s/n): " answer
        if [[ ! "$answer" =~ ^[Ss]$ ]]; then
            echo "   ⏭️  Pulando..."
            ((skipped++))
            continue
        fi
        rm -rf "$new_id"
    fi

    # Criar nova pasta
    mkdir -p "$new_id"

    # Copiar imagens
    echo "   📋 Copiando imagens..."
    image_count=$(ls "$old_id"/*.{png,jpg,jpeg,gif,webp} 2>/dev/null | wc -l)

    if [ $image_count -eq 0 ]; then
        echo "   ⚠️  Nenhuma imagem encontrada em $old_id"
        ((errors++))
        rm -rf "$new_id"
        continue
    fi

    cp -r "$old_id"/* "$new_id/"

    if [ $? -eq 0 ]; then
        echo "   ✅ $image_count imagens copiadas"

        # Definir permissões corretas
        chown -R www-data:www-data "$new_id"
        chmod -R 755 "$new_id"

        echo "   ✅ Permissões ajustadas"
        ((success++))
    else
        echo "   ❌ Erro ao copiar imagens"
        ((errors++))
    fi
done

echo ""
echo "=========================================="
echo "📊 RESUMO"
echo "=========================================="
echo "✅ Sucesso: $success"
echo "❌ Erros: $errors"
echo "⏭️  Pulados: $skipped"
echo "=========================================="
echo ""

if [ $success -gt 0 ]; then
    echo "🎉 Imagens copiadas com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
    echo "   2. Ou reinicie o cache do backend:"
    echo "      pm2 restart api-backend"
    echo "   3. Acesse: https://bsconsultoriadeimoveis.com.br"
    echo "   4. Verifique se as imagens aparecem"
    echo ""
fi

if [ $errors -gt 0 ]; then
    echo "⚠️  Alguns erros ocorreram. Verifique as mensagens acima."
    echo ""
fi
