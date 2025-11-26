# Sistema de Migração de Leads para Baserow

## 📚 Arquivos Criados

### 1. **baserow-leads-table-schema.json**
Schema JSON com a estrutura completa da tabela de Leads:
- 19 campos configurados
- Tipos de dados corretos (text, number, date, select, etc.)
- Opções de select pré-configuradas (Qualidade: Quente/Morno/Frio, Fonte: typebot/manual/import/whatsapp)

### 2. **create-baserow-leads-table.js**
Script Node.js que cria automaticamente a tabela no Baserow via API:
- ✅ Cria a tabela "Leads"
- ✅ Remove campo padrão
- ✅ Cria todos os 19 campos com configurações corretas
- ✅ Retorna o TABLE_ID para você usar

**Como usar:**
```bash
# 1. Adicione no .env.local:
BASEROW_DATABASE_ID=seu_database_id

# 2. Execute:
node create-baserow-leads-table.js
```

### 3. **migrate-leads-to-baserow.js**
Script de migração que transfere todos os leads do Redis para o Baserow:
- ✅ Busca todos os leads do Redis
- ✅ Transforma para formato Baserow
- ✅ Calcula qualidade (Quente/Morno/Frio) baseado no score
- ✅ Cria leads no Baserow via API
- ✅ Exibe progresso em tempo real
- ✅ Gera relatório de sucesso/erros

**Como usar:**
```bash
# 1. Adicione no .env.local:
BASEROW_LEADS_TABLE_ID=seu_table_id

# 2. Reinicie o upload server
npm run upload-server

# 3. Execute a migração
node migrate-leads-to-baserow.js
```

### 4. **BASEROW_LEADS_SETUP.md**
Documentação completa com instruções passo a passo:
- Opção A: Criação automática (recomendado)
- Opção B: Criação manual
- Configuração de variáveis de ambiente
- Execução da migração
- Verificação dos resultados

## 🚀 Fluxo Recomendado (3 passos)

### Passo 1: Criar a tabela no Baserow
```bash
# Adicione no .env.local:
BASEROW_DATABASE_ID=12345  # ID do seu database

# Execute:
node create-baserow-leads-table.js
```

O script mostrará o TABLE_ID no final.

### Passo 2: Configurar e reiniciar
```bash
# Adicione no .env.local o TABLE_ID retornado:
BASEROW_LEADS_TABLE_ID=67890

# Reinicie o upload server:
npm run upload-server
```

### Passo 3: Migrar os leads
```bash
node migrate-leads-to-baserow.js
```

## 📋 Estrutura da Tabela de Leads

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Text | Nome do lead |
| Telefone | Text | Telefone com código do país |
| Email | Email | Email do lead |
| Score | Number | Pontuação 0-100 |
| Qualidade | Select | Quente/Morno/Frio |
| Fonte | Select | typebot/manual/import/whatsapp |
| TotalMensagens | Number | Total de mensagens trocadas |
| ImovelInteresse | Number | ID do imóvel de interesse |
| DataCadastro | Date | Data de criação |
| UltimaAtualizacao | Last Modified | Última modificação |
| TipoTransacao | Text | Compra/Locação/Investir |
| TipoImovel | Text | Casa/Apartamento/Terreno |
| BudgetCompra | Text | Orçamento para compra |
| BudgetLocacao | Text | Orçamento para locação |
| Localizacao | Text | Localização desejada |
| Prazo | Text | Prazo de compra/locação |
| Financiamento | Text | Situação de financiamento |
| Indicadores | Long Text | JSON com indicadores |
| Observacoes | Long Text | Notas e observações |

## 🔧 Variáveis de Ambiente Necessárias

```bash
# .env.local

# Já existentes:
BASEROW_API_URL=https://api.baserow.io
BASEROW_TOKEN=seu_token_aqui
BASEROW_TABLE_ID=table_id_imoveis

# Novas (adicionar):
BASEROW_DATABASE_ID=12345          # ID do database/workspace
BASEROW_LEADS_TABLE_ID=67890       # ID da tabela de Leads
```

## ⏱️ Tempo Estimado

- Criação da tabela: ~15-20 segundos
- Migração de 157 leads: ~30-60 segundos
- **Total: ~1 minuto**

## ✅ Checklist

- [ ] Obter BASEROW_DATABASE_ID da URL do Baserow
- [ ] Adicionar BASEROW_DATABASE_ID no .env.local
- [ ] Executar `node create-baserow-leads-table.js`
- [ ] Copiar o TABLE_ID retornado
- [ ] Adicionar BASEROW_LEADS_TABLE_ID no .env.local
- [ ] Reiniciar upload server (`npm run upload-server`)
- [ ] Executar `node migrate-leads-to-baserow.js`
- [ ] Verificar leads no Baserow
- [ ] Confirmar que tudo está correto

## 🆘 Troubleshooting

**Erro: "BASEROW_TOKEN not configured"**
- Verifique se o .env.local tem a variável BASEROW_TOKEN

**Erro: "BASEROW_DATABASE_ID not found"**
- Adicione o ID do seu database no .env.local

**Erro: "Failed to create table"**
- Verifique se o token tem permissões corretas
- Verifique se o DATABASE_ID está correto

**Erro durante migração**
- Verifique se o upload server está rodando
- Verifique se BASEROW_LEADS_TABLE_ID está configurado
- Verifique se o Redis está conectado
