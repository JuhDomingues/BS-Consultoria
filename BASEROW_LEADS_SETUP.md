# Configuração da Tabela de Leads no Baserow

## Opção A: Criação Automática (RECOMENDADO)

### 1. Obter o ID do Database

1. Acesse seu workspace do Baserow
2. Abra o database onde quer criar a tabela de Leads
3. Copie o ID do database da URL: `https://baserow.io/database/XXXXX/table/...`
4. O número `XXXXX` é o `DATABASE_ID`

### 2. Configurar variável de ambiente

Adicione no arquivo `.env.local`:

```bash
BASEROW_DATABASE_ID=XXXXX  # Substitua pelo ID do seu database
```

### 3. Executar script de criação

```bash
node create-baserow-leads-table.js
```

Este script irá:
- ✅ Criar automaticamente a tabela "Leads"
- ✅ Configurar todos os 19 campos com tipos corretos
- ✅ Configurar opções de select (Qualidade, Fonte)
- ✅ Retornar o TABLE_ID para você usar

**Tempo estimado**: ~15-20 segundos

Após executar, o script mostrará o `BASEROW_LEADS_TABLE_ID` que você precisa adicionar no `.env.local`.

---

## Opção B: Criação Manual

### 1. Criar nova tabela no Baserow

Acesse seu workspace do Baserow e crie uma nova tabela chamada **"Leads"** com os seguintes campos:

### Campos da Tabela:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **Nome** | Text | Nome do lead (obrigatório) |
| **Telefone** | Text | Telefone com código do país (obrigatório, único) |
| **Email** | Email | Email do lead |
| **Score** | Number | Pontuação de qualificação (0-100) |
| **Qualidade** | Single Select | Opções: `Quente`, `Morno`, `Frio` |
| **Fonte** | Single Select | Opções: `typebot`, `manual`, `import`, `whatsapp` |
| **TotalMensagens** | Number | Total de mensagens trocadas |
| **ImovelInteresse** | Number | ID do imóvel de interesse |
| **DataCadastro** | Date | Data de criação do lead |
| **UltimaAtualizacao** | Last Modified | Última modificação |
| **TipoTransacao** | Text | Compra, Locação, Investir, etc. |
| **TipoImovel** | Text | Casa, Apartamento, Terreno, etc. |
| **BudgetCompra** | Text | Orçamento para compra |
| **BudgetLocacao** | Text | Orçamento para locação |
| **Localizacao** | Text | Localização desejada |
| **Prazo** | Text | Prazo de compra/locação |
| **Financiamento** | Text | Situação de financiamento |
| **Indicadores** | Long Text | JSON array com indicadores de qualidade |
| **Observacoes** | Long Text | Notas e observações |

### Opções do Select "Qualidade":
- 🔴 Quente (vermelho)
- 🟡 Morno (amarelo)
- 🔵 Frio (azul)

### Opções do Select "Fonte":
- typebot
- manual
- import
- whatsapp

### 2. Obter o ID da Tabela

Após criar a tabela manualmente:
1. Abra a tabela no Baserow
2. Copie o ID da tabela da URL (ex: `https://baserow.io/database/XXXXX/table/YYYYY`)
3. O número `YYYYY` é o `TABLE_ID` que você vai usar

---

## Configuração Final (ambas as opções)

### 1. Adicionar TABLE_ID no .env.local

Adicione no arquivo `.env.local`:

```bash
# Baserow - Tabela de Leads
BASEROW_LEADS_TABLE_ID=YYYYY  # Substitua pelo ID da sua tabela
```

### 2. Reiniciar o servidor de upload

Após adicionar a variável de ambiente, reinicie o servidor de upload para carregar as novas configurações:

```bash
# Pare o servidor atual (Ctrl+C) e execute novamente:
npm run upload-server
```

O servidor irá carregar os novos endpoints do Baserow para leads.

### 3. Executar migração dos leads

Após configurar tudo, execute o script de migração:

```bash
node migrate-leads-to-baserow.js
```

Este script irá:
- ✅ Conectar ao Redis e buscar todos os leads existentes
- ✅ Transformar cada lead para o formato do Baserow
- ✅ Criar cada lead no Baserow via API
- ✅ Exibir progresso em tempo real
- ✅ Gerar relatório de sucesso/erros ao final

**Tempo estimado**: ~30-60 segundos para 157 leads

### 4. Verificar migração

Após a migração:
1. Acesse sua tabela de Leads no Baserow
2. Verifique se todos os leads foram importados corretamente
3. Confira os campos: Nome, Telefone, Score, Qualidade, etc.

### 5. Próximos passos (opcional)

Após verificar que todos os leads estão no Baserow:
- Atualizar o SDR server para usar Baserow como storage principal
- Considerar limpar os leads antigos do Redis (após backup)
