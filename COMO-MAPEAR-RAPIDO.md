# 🚀 Como Mapear as Imagens - Guia Rápido

## 📊 Status Atual

✅ **3 imóveis já corretos:** 111, 463, 496
⚠️ **12 imóveis para mapear:** 97, 104, 109, 110, 112, 125, 298, 331, 364, 397, 398, 430

## 🎯 Objetivo

Descobrir qual ID novo corresponde a qual pasta antiga, para que as imagens apareçam.

## 📋 Processo (3 passos simples)

### PASSO 1: Ver as fotos das pastas antigas no navegador

Acesse cada pasta pelo navegador e veja a primeira imagem:

```
https://bsconsultoriadeimoveis.com.br/imoveis/1668579/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/2266571/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/2536096/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3040948/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3041930/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3041988/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3092042/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3105758/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3106245/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3119119/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3129547/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3129575/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3144281/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3170378/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3232364/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3340958/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3378275/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3461707/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3461770/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3500447/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3574133/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3629341/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3921473/image_1.png
https://bsconsultoriadeimoveis.com.br/imoveis/3921506/image_1.png
```

### PASSO 2: Comparar com os imóveis

**Lista dos 12 imóveis para mapear:**

| ID | Título | Preço |
|----|--------|-------|
| 97 | Sobrado - Parque Scaffid II | R$ 420.000 |
| 104 | Sobrado - Parque Scaffid II | R$ 500.000 |
| 109 | Sobrado - Parque Scaffid II | R$ 580.000 |
| 110 | Sobrado - Parque Scaffid II | R$ 600.000 |
| 112 | Sobrado - Parque Scaffid II | R$ 680.000 |
| 125 | Apartamento com Varanda Grill | R$ 228.000 |
| 298 | Sobrado com móveis planejados | R$ 480.000 |
| 331 | Casa térrea assobradada | R$ 500.000 |
| 364 | Sobrado com 3 dormitórios | R$ 630.000 |
| 397 | Sobrado no Scaffidi | R$ 500.000 |
| 398 | Sobrado com 2 suítes | R$ 525.000 |
| 430 | Sobrado com piscina | R$ 850.000 |

**Como identificar:**
- Veja a foto da pasta antiga
- Compare com o preço e título dos imóveis
- Anote o mapeamento

**Exemplo:**
- Acessou `/imoveis/1668579/image_1.png`
- Viu que é um sobrado com piscina
- No Baserow, o ID 430 é "Sobrado com piscina - R$ 850.000"
- **Mapeamento:** 430 → 1668579

### PASSO 3: Preencher e executar o script

**Na VPS:**

```bash
cd /var/www/BS-Consultoria

# Baixar o script atualizado
git pull origin main

# Editar o script com seus mapeamentos
nano atualizar-imagens-baserow.js
```

**No arquivo, preencha:**

```javascript
const ID_MAPPING = {
  97: '1668579',   // ← Coloque o ID antigo que você identificou
  104: '2266571',  // ← Coloque o ID antigo que você identificou
  109: '',         // ← E assim por diante...
  // ...
};
```

**Depois de preencher:**

```bash
# Executar o script
node atualizar-imagens-baserow.js

# OU
./atualizar-imagens-baserow.js
```

O script irá:
1. ✅ Buscar cada imóvel no Baserow
2. ✅ Substituir `/imoveis/{id_novo}/` por `/imoveis/{id_antigo}/`
3. ✅ Atualizar automaticamente
4. ✅ Mostrar relatório de sucesso/erros

### PASSO 4: Testar

```bash
# Limpar cache do navegador
# Pressione: Ctrl + Shift + R

# Ou reiniciar backend para limpar cache
pm2 restart api-backend

# Acessar o site
https://bsconsultoriadeimoveis.com.br
```

## 🎯 Dica: Faça por Partes

Não precisa fazer tudo de uma vez! Você pode:

1. **Mapear apenas 3-4 imóveis**
2. **Preencher só esses no script**
3. **Executar o script**
4. **Testar no site**
5. **Repetir para os outros**

## 📝 Template de Anotações

Use este template para anotar conforme vai identificando:

```
ID 97  → ________ (Sobrado R$ 420.000)
ID 104 → ________ (Sobrado R$ 500.000)
ID 109 → ________ (Sobrado R$ 580.000)
ID 110 → ________ (Sobrado R$ 600.000)
ID 112 → ________ (Sobrado R$ 680.000)
ID 125 → ________ (Apartamento R$ 228.000)
ID 298 → ________ (Sobrado móveis planejados R$ 480.000)
ID 331 → ________ (Casa térrea R$ 500.000)
ID 364 → ________ (Sobrado 3 dorms R$ 630.000)
ID 397 → ________ (Sobrado Scaffidi R$ 500.000)
ID 398 → ________ (Sobrado 2 suítes R$ 525.000)
ID 430 → ________ (Sobrado piscina R$ 850.000)
```

## ✅ Quando Terminar

Depois de mapear todos e executar o script:

1. ✅ Limpe cache do navegador
2. ✅ Acesse o site
3. ✅ Verifique se as imagens aparecem
4. ✅ Me avise se tudo funcionou! 🎉

---

**Qualquer dúvida, me chame!** 🚀
