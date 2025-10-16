# Guia de Deploy para Produção (Vercel)

Este guia explica como fazer o deploy do sistema de upload de imagens em produção na Vercel.

## Configuração do Vercel Blob Storage

### 1. Criar um Blob Store na Vercel

1. Acesse o [Dashboard da Vercel](https://vercel.com/dashboard)
2. Vá para o seu projeto
3. Clique na aba **Storage**
4. Clique em **Create Database** ou **Create Store**
5. Selecione **Blob Storage**
6. Dê um nome ao seu Blob Store (ex: `bs-consultoria-images`)
7. Clique em **Create**

### 2. Obter o Token de Acesso

Após criar o Blob Store:

1. Clique no Blob Store criado
2. Vá para a aba **Settings** ou **Connect**
3. Copie o valor de `BLOB_READ_WRITE_TOKEN`

### 3. Configurar Variáveis de Ambiente

No painel do seu projeto na Vercel:

1. Vá para **Settings** → **Environment Variables**
2. Adicione a seguinte variável:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (cole o token copiado)
   - **Environments**: Selecione `Production`, `Preview` e `Development`
3. Clique em **Save**

## Como Funciona

### Desenvolvimento (Local)

- As imagens são salvas em `/public/imoveis/{propertyId}/`
- Usa o servidor local em `http://localhost:3001`
- Rode com: `npm run dev:full` (frontend + upload server)

### Produção (Vercel)

- As imagens são salvas no Vercel Blob Storage
- URLs das imagens são geradas automaticamente pelo Blob Storage
- A função serverless `/api/upload-image` detecta automaticamente o ambiente

## Estrutura de Arquivos

```
projeto/
├── api/
│   └── upload-image.js          # Função serverless para upload (Vercel)
├── server/
│   └── upload.js                # Servidor de upload local (desenvolvimento)
├── src/
│   └── components/
│       └── ImageUpload.tsx      # Componente de upload (auto-detecta ambiente)
└── vercel.json                  # Configuração Vercel
```

## Deploy na Vercel

### Método 1: Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy
vercel --prod
```

### Método 2: Deploy via GitHub

1. Conecte seu repositório GitHub com a Vercel
2. Cada push para a branch `main` fará deploy automático
3. Configure as variáveis de ambiente no dashboard da Vercel

## Testando o Upload em Produção

1. Acesse seu site em produção
2. Vá para o painel admin
3. Crie ou edite um imóvel
4. Faça upload de imagens
5. As imagens devem ser salvas no Vercel Blob e exibidas corretamente

## Limitações do Vercel Blob

- **Plano Hobby (Grátis)**:
  - 100 GB de armazenamento
  - 100 GB de largura de banda por mês

- **Plano Pro**:
  - 500 GB de armazenamento
  - 500 GB de largura de banda por mês

## Troubleshooting

### Erro: "Storage não configurado"

**Problema**: Token do Blob Storage não está configurado

**Solução**:
1. Verifique se `BLOB_READ_WRITE_TOKEN` está nas variáveis de ambiente
2. Redesploy o projeto após adicionar a variável

### Erro: "Failed to upload"

**Problema**: Erro ao fazer upload

**Solução**:
1. Verifique os logs da função serverless no dashboard da Vercel
2. Confirme que o token está correto
3. Verifique se o arquivo não excede o limite de tamanho (5MB)

### Imagens não aparecem

**Problema**: URLs das imagens antigas apontam para `/imoveis/...`

**Solução**:
- Imagens antigas em `/public/imoveis/` continuarão funcionando
- Novas imagens usarão URLs do Blob Storage (https://...)
- Para migrar imagens antigas, faça re-upload no painel admin

## Comandos Úteis

```bash
# Desenvolvimento com upload server
npm run dev:full

# Build para produção
npm run build

# Preview da build local
npm run preview

# Apenas upload server (desenvolvimento)
npm run upload-server

# Vercel deploy (produção)
vercel --prod
```

## Segurança

- ✅ CORS configurado para aceitar apenas seu domínio
- ✅ Validação de tipo de arquivo (apenas imagens)
- ✅ Limite de tamanho de arquivo (5MB)
- ✅ Token de acesso ao Blob Storage via variável de ambiente
- ✅ Filesystem read-only em produção (Vercel Serverless)

## Próximos Passos

1. Configure o `BLOB_READ_WRITE_TOKEN` nas variáveis de ambiente da Vercel
2. Faça o deploy do projeto
3. Teste o upload de imagens em produção
4. Monitore o uso do Blob Storage no dashboard da Vercel
