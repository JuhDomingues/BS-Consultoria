# 🤖 Configuração da Criação de Imóveis com IA

## Visão Geral

O painel admin agora oferece duas formas de criar imóveis:

1. **Criação Manual** - Preencha todos os campos manualmente
2. **Criação com IA** ✨ - A IA analisa as imagens e gera automaticamente título, preço e descrição profissional

## Como Configurar a API da Anthropic (Claude)

### Passo 1: Obter a Chave da API

1. Acesse https://console.anthropic.com/
2. Faça login ou crie uma conta
3. Vá em **Settings** → **API Keys**
4. Clique em **Create Key**
5. Copie a chave (começa com `sk-ant-...`)

### Passo 2: Configurar no Projeto

1. Abra o arquivo `.env.local` na raiz do projeto
2. Cole sua chave na variável `VITE_ANTHROPIC_API_KEY`:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...sua-chave-aqui...
```

3. Salve o arquivo
4. Reinicie o servidor de desenvolvimento:

```bash
npm run dev:full
```

## Como Usar a Criação com IA

### 1. Acesse o Painel Admin

Abra http://localhost:8080/admin

### 2. Clique em "Novo Imóvel"

Você verá duas opções:
- **Criação Manual** - Processo tradicional
- **Criação com IA** ✨ - Processo automatizado

### 3. Selecione "Criação com IA"

### 4. Preencha as Informações Básicas

**Obrigatório:**
- ✅ **Imagens** - Adicione até 5 imagens do imóvel (quanto mais, melhor!)
- ✅ **Tipo** - Apartamento, Sobrado, Casa, etc.
- ✅ **Categoria** - Venda ou Locação
- ✅ **Localização** - Bairro e cidade
- ✅ **Breve Descrição** - Descreva o imóvel em poucas linhas

**Opcional (mas recomendado):**
- Quartos
- Banheiros
- Vagas de garagem
- Área em m²

### 5. Clique em "Gerar e Criar Imóvel"

A IA irá:
1. 🔍 Analisar as imagens enviadas
2. 📝 Ler a descrição fornecida
3. ✨ Gerar automaticamente:
   - **Título atraente** para o anúncio
   - **Preço sugerido** baseado nas características
   - **Descrição profissional completa** (200-400 palavras)
4. 📤 Fazer upload das imagens
5. 💾 Salvar o imóvel no Baserow

### 6. Pronto!

O imóvel será criado automaticamente com todos os campos preenchidos de forma profissional.

## Dicas para Melhores Resultados

### 📸 Imagens
- Use fotos de boa qualidade
- Inclua diferentes ângulos e cômodos
- Primeira imagem deve ser a mais atraente (será a capa)
- Máximo de 5 imagens serão analisadas pela IA

### 📝 Descrição
Quanto mais detalhes você fornecer, melhor será o resultado:

**Bom:**
> "Apartamento novo no Parque Scaffidi, 2 quartos, varanda gourmet"

**Ótimo:**
> "Apartamento novo no Parque Scaffidi com 2 quartos, varanda gourmet com churrasqueira, acabamento de primeira com porcelanato, armários planejados na cozinha, próximo ao supermercado e escola. Condomínio com playground e salão de festas."

### ✅ Informações Complementares
- Preencha quartos, banheiros, vagas e área quando souber
- Isso ajuda a IA a gerar um preço mais preciso
- A localização específica melhora a descrição

## Custo da API

- A API da Anthropic cobra por tokens (palavras) processadas
- Cada criação com IA custa aproximadamente **$0.05 - $0.15 USD**
- Com $10 USD de crédito, você pode criar ~100 imóveis
- Você recebe créditos gratuitos ao criar uma conta

## Limitações

- Máximo de 5 imagens analisadas por vez
- Tempo de processamento: 10-30 segundos
- Requer conexão com internet
- API key é necessária

## Solução de Problemas

### "Erro ao gerar imóvel com IA"

1. Verifique se a chave da API está correta no `.env.local`
2. Confirme que reiniciou o servidor após adicionar a chave
3. Verifique se tem créditos na sua conta Anthropic
4. Confira a conexão com internet

### "Failed to parse JSON from Claude response"

- Tente novamente, pode ser um erro temporário
- Verifique se a descrição está clara e em português

### Preço sugerido muito alto/baixo

- A IA sugere baseado nas informações fornecidas
- Você pode editar manualmente após criar
- Forneça mais contexto na descrição (estado de conservação, diferencias, etc.)

## Privacidade

- As imagens são enviadas para a API da Anthropic (Claude) para análise
- Não são armazenadas nos servidores da Anthropic após o processamento
- Leia a política de privacidade: https://www.anthropic.com/legal/privacy

---

💡 **Dica:** Para criar rapidamente muitos imóveis, use a criação com IA. Para ajustes finos e casos específicos, use a criação manual.
