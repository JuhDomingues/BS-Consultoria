# 🗺️ Guia de Mapeamento de Imagens - BS Consultoria

## 🎯 Problema

Os imóveis estão aparecendo no site, mas **as imagens não carregam** porque:

- **Baserow tem IDs novos:** 97, 104, 109, 110, 111, 112, 125, 298, 331, 364, 397, 398, 430, 463, 496
- **Pastas têm IDs antigos:** 1668579, 2266571, 2536096, 3040948, etc.
- **Exceções (já corretos):** 463 e 496 (pastas existem com esses IDs)

Quando o site tenta carregar `/imoveis/97/image_1.png`, a pasta não existe porque o ID correto é um ID antigo.

## ✅ Soluções Disponíveis

### Opção 1: Mapeamento Manual no Baserow (MAIS SIMPLES)

Para cada um dos 13 imóveis que precisam de correção:

1. **Identifique o imóvel** pelo título/localização no Baserow
2. **Descubra qual pasta corresponde** (veja as fotos nas pastas antigas)
3. **Atualize o campo `images` no Baserow**

**Exemplo:**

Se o imóvel com ID 97 no Baserow corresponder à pasta 1668579:

**Antes:**
```
/imoveis/97/image_1.png
/imoveis/97/image_2.png
```

**Depois:**
```
/imoveis/1668579/image_1.png
/imoveis/1668579/image_2.png
```

**Como fazer:**
1. Entre no Baserow
2. Edite o imóvel com ID 97
3. No campo `images`, substitua todos os `97` por `1668579`
4. Salve

Repita para os outros 12 imóveis.

### Opção 2: Script de Ajuda (Mostra dados dos imóveis)

Execute na VPS para ver os dados de todos os imóveis ativos:

```bash
cd /var/www/BS-Consultoria
bash mapear-imagens.sh
```

O script mostrará:
- ✅ Lista de pastas antigas disponíveis
- ✅ Dados de cada imóvel (título, localização, preço, tipo)
- ✅ Quais IDs precisam ser mapeados

### Opção 3: Arquivo de Mapeamento (Para automação futura)

Criamos um arquivo `mapeamento-ids.json` que você pode preencher:

```json
{
  "newId": 97,
  "oldId": "1668579",  ← Preencha aqui
  "status": "pending",
  "notes": ""
}
```

Depois de preencher, podemos criar um script que atualiza o Baserow automaticamente.

## 📋 Checklist de IDs para Mapear

Marque conforme for mapeando:

- [ ] **97** → ID antigo: ______
- [ ] **104** → ID antigo: ______
- [ ] **109** → ID antigo: ______
- [ ] **110** → ID antigo: ______
- [ ] **111** → ID antigo: ______
- [ ] **112** → ID antigo: ______
- [ ] **125** → ID antigo: ______
- [ ] **298** → ID antigo: ______
- [ ] **331** → ID antigo: ______
- [ ] **364** → ID antigo: ______
- [ ] **397** → ID antigo: ______
- [ ] **398** → ID antigo: ______
- [ ] **430** → ID antigo: ______
- [x] **463** → ID antigo: **463** (✅ já correto)
- [x] **496** → ID antigo: **496** (✅ já correto)

## 🔍 Como Descobrir o Mapeamento

### Método 1: Comparar visualmente

1. **Veja uma foto na VPS:**
```bash
ls /var/www/BS-Consultoria/public/imoveis/1668579/
```

2. **Baixe uma imagem para ver:**
```bash
# Use SCP ou veja direto no navegador
https://bsconsultoriadeimoveis.com.br/imoveis/1668579/image_1.png
```

3. **Compare com os imóveis no site** (pelo título/localização)

### Método 2: Ver dados do imóvel

Execute na VPS:
```bash
# Ver dados de todos os imóveis
curl http://127.0.0.1:3003/api/baserow/properties | jq '.results[] | {id, title: .Title, location}'

# Ver dados de um imóvel específico (ex: ID 97)
curl http://127.0.0.1:3003/api/baserow/properties | jq '.results[] | select(.id == 97)'
```

### Método 3: Usar o painel do Baserow

1. Entre no Baserow
2. Veja título, endereço, características do imóvel ID 97
3. Compare com as fotos das pastas antigas
4. Identifique qual pasta corresponde

## 🚀 Processo Recomendado

**Passo a passo sugerido:**

1. **Execute o script de ajuda:**
```bash
cd /var/www/BS-Consultoria
bash mapear-imagens.sh > mapeamento-dados.txt
cat mapeamento-dados.txt
```

2. **Abra o Baserow em uma aba**
3. **Abra as pastas de imagens em outra aba:**
   - https://bsconsultoriadeimoveis.com.br/imoveis/1668579/image_1.png
   - https://bsconsultoriadeimoveis.com.br/imoveis/2266571/image_1.png
   - etc.

4. **Para cada imóvel:**
   - Veja o título no Baserow
   - Compare com as fotos das pastas
   - Atualize o campo `images` com o ID correto

5. **Teste no navegador:**
   - Limpe o cache (Ctrl+Shift+R)
   - Veja se as imagens aparecem

## 📝 IDs Antigos Disponíveis

```
1668579   2266571   2536096   3040948   3041930   3041988
3092042   3105758   3106245   3119119   3129547   3129575
3144281   3170378   3232364   3340958   3378275   3461707
3461770   3500447   3500462   3574133   3629341   3921473
3921506
```

Total: **25 pastas antigas** (mas só 13 precisam ser mapeadas para os IDs novos)

## ⚠️ Importante

- **NÃO renomeie as pastas** - é mais fácil atualizar o Baserow
- **NÃO delete pastas antigas** - pode ter imóveis que voltarão
- **Teste após cada atualização** - limpe cache do navegador

## 🆘 Se precisar de ajuda

Depois de mapear alguns IDs, me envie:
```
ID 97 → 1668579
ID 104 → 2266571
...
```

Posso criar um script que atualiza o Baserow automaticamente! 🤖

---

**Boa sorte com o mapeamento!** 🚀
