#!/bin/bash
# Script para criar links simbólicos dos IDs novos para pastas antigas
# Solução mais rápida que atualizar o Baserow

echo "=========================================="
echo "🔗 CRIAR LINKS SIMBÓLICOS - IMAGENS"
echo "=========================================="
echo ""

# Diretório base
IMOVEIS_DIR="/var/www/BS-Consultoria/public/imoveis"

# Verificar se está rodando na VPS
if [ ! -d "$IMOVEIS_DIR" ]; then
    echo "❌ Diretório $IMOVEIS_DIR não encontrado!"
    echo "   Este script deve ser executado na VPS."
    exit 1
fi

cd "$IMOVEIS_DIR"

echo "📁 Diretório: $IMOVEIS_DIR"
echo ""

# Mapeamento ID novo → ID antigo
# ⚠️ PREENCHA ESTE ARRAY após identificar cada imóvel
declare -A MAPPING=(
    # Exemplo: ["97"]="1668579"
    #
    # ⚠️ PREENCHA ABAIXO:
    ["97"]=""    # Sobrado R$ 420.000
    ["104"]=""   # Sobrado R$ 500.000
    ["109"]=""   # Sobrado R$ 580.000
    ["110"]=""   # Sobrado R$ 600.000
    ["112"]=""   # Sobrado R$ 680.000
    ["125"]=""   # Apartamento R$ 228.000
    ["298"]=""   # Sobrado móveis planejados R$ 480.000
    ["331"]=""   # Casa térrea R$ 500.000
    ["364"]=""   # Sobrado 3 dorms R$ 630.000
    ["397"]=""   # Sobrado Scaffidi R$ 500.000
    ["398"]=""   # Sobrado 2 suítes R$ 525.000
    ["430"]=""   # Sobrado piscina R$ 850.000
)

# Contar quantos mapeamentos estão preenchidos
filled=0
empty=0

for new_id in "${!MAPPING[@]}"; do
    old_id="${MAPPING[$new_id]}"
    if [ -z "$old_id" ]; then
        ((empty++))
    else
        ((filled++))
    fi
done

echo "📊 Status do mapeamento:"
echo "   ✅ Preenchidos: $filled"
echo "   ⚠️  Vazios: $empty"
echo ""

if [ $filled -eq 0 ]; then
    echo "❌ Nenhum mapeamento preenchido!"
    echo "   Edite este script e preencha o array MAPPING."
    echo ""
    exit 1
fi

if [ $empty -gt 0 ]; then
    echo "⚠️  Alguns IDs ainda não foram mapeados."
    read -p "Deseja continuar apenas com os preenchidos? (s/n): " answer
    if [[ ! "$answer" =~ ^[Ss]$ ]]; then
        echo "❌ Operação cancelada."
        exit 0
    fi
    echo ""
fi

# Criar links simbólicos
success=0
errors=0
skipped=0

echo "🔗 Criando links simbólicos..."
echo ""

for new_id in "${!MAPPING[@]}"; do
    old_id="${MAPPING[$new_id]}"

    # Pular se não estiver preenchido
    if [ -z "$old_id" ]; then
        echo "⏭️  Pulando ID $new_id (não mapeado)"
        ((skipped++))
        continue
    fi

    # Verificar se a pasta antiga existe
    if [ ! -d "$old_id" ]; then
        echo "❌ Pasta antiga não encontrada: $old_id (ID novo: $new_id)"
        ((errors++))
        continue
    fi

    # Verificar se já existe (link ou pasta)
    if [ -e "$new_id" ]; then
        if [ -L "$new_id" ]; then
            existing_target=$(readlink "$new_id")
            if [ "$existing_target" = "$old_id" ]; then
                echo "✅ Link já existe: $new_id → $old_id"
                ((success++))
                continue
            else
                echo "⚠️  Link existe mas aponta para: $existing_target"
                read -p "   Sobrescrever? (s/n): " answer
                if [[ ! "$answer" =~ ^[Ss]$ ]]; then
                    ((skipped++))
                    continue
                fi
                rm "$new_id"
            fi
        else
            echo "⚠️  Já existe uma pasta real com ID $new_id"
            read -p "   Sobrescrever com link? (s/n): " answer
            if [[ ! "$answer" =~ ^[Ss]$ ]]; then
                ((skipped++))
                continue
            fi
            rm -rf "$new_id"
        fi
    fi

    # Criar link simbólico
    ln -s "$old_id" "$new_id"

    if [ $? -eq 0 ]; then
        echo "✅ Link criado: $new_id → $old_id"
        ((success++))
    else
        echo "❌ Erro ao criar link: $new_id → $old_id"
        ((errors++))
    fi
done

echo ""
echo "=========================================="
echo "📊 RESUMO"
echo "=========================================="
echo "✅ Links criados: $success"
echo "❌ Erros: $errors"
echo "⏭️  Pulados: $skipped"
echo "=========================================="
echo ""

if [ $success -gt 0 ]; then
    echo "🎉 Links simbólicos criados com sucesso!"
    echo ""
    echo "📋 Teste agora:"
    echo "   1. Limpe o cache do navegador (Ctrl+Shift+R)"
    echo "   2. Acesse: https://bsconsultoriadeimoveis.com.br"
    echo "   3. Verifique se as imagens aparecem"
    echo ""
    echo "🔍 Para verificar os links criados:"
    echo "   ls -la $IMOVEIS_DIR/ | grep '^l'"
    echo ""
fi

if [ $errors -gt 0 ]; then
    echo "⚠️  Alguns links não puderam ser criados."
    echo "   Verifique se as pastas antigas existem."
    echo ""
fi
