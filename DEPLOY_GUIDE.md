# 🚀 Guia de Deploy - BS Consultoria

## ⚠️ IMPORTANTE: Configurar Variáveis de Ambiente

O arquivo `.env.local` **NÃO** é enviado para o repositório por segurança. Você precisa configurar as variáveis de ambiente no seu serviço de hospedagem.

## 📋 Variáveis de Ambiente Necessárias

### Para o Site Funcionar (Imóveis):

```
VITE_BASEROW_API_URL=https://api.baserow.io
VITE_BASEROW_TOKEN=of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7
VITE_BASEROW_TABLE_ID=693576
```

### Para o Painel Admin (Opcional):

```
VITE_OPENAI_API_KEY=sua_chave_openai_aqui
```

## 🌐 Como Configurar no Vercel

1. Acesse seu projeto no Vercel Dashboard
2. Vá em **Settings** > **Environment Variables**
3. Adicione cada variável:
   - **Name**: `VITE_BASEROW_API_URL`
   - **Value**: `https://api.baserow.io`
   - Clique em **Add**
4. Repita para todas as variáveis acima
5. Faça um novo **Deploy** (Deployments > ... > Redeploy)

## 🌐 Como Configurar no Netlify

1. Acesse seu site no Netlify Dashboard
2. Vá em **Site Settings** > **Environment Variables**
3. Clique em **Add a variable**
4. Adicione cada variável da lista acima
5. Clique em **Save**
6. Vá em **Deploys** > **Trigger Deploy** > **Clear cache and deploy site**

## 🌐 Como Configurar em Outros Serviços

### Railway
1. Settings > Variables
2. Adicione as variáveis
3. Deploy automático

### Render
1. Environment > Environment Variables
2. Adicione as variáveis
3. Manual Deploy se necessário

## 🔍 Como Verificar se Funcionou

Após configurar as variáveis e fazer redeploy:

1. **Imóveis aparecendo?**
   - ✅ Sim: Variáveis configuradas corretamente
   - ❌ Não: Verifique as variáveis e faça redeploy

2. **Console do navegador:**
   - Abra DevTools (F12)
   - Vá na aba **Console**
   - Procure por erros relacionados a API ou fetch

3. **Network tab:**
   - Verifique se há requisições para `api.baserow.io`
   - Status deve ser **200 OK**

## 🐛 Problemas Comuns

### Imóveis não aparecem

**Causa**: Variáveis de ambiente não configuradas

**Solução**:
1. Verifique se as 3 variáveis do Baserow estão configuradas
2. Certifique-se que os nomes estão EXATAMENTE como mostrado (com `VITE_` no início)
3. Faça um **Redeploy completo** (clear cache)

### Painel Admin não funciona

**Causa**: Falta variável OPENAI ou rota não configurada

**Solução**:
1. Adicione `VITE_OPENAI_API_KEY` se quiser usar IA
2. Verifique se a rota `/admin` está acessível

### Erro 404 em rotas

**Causa**: SPA routing não configurado

**Solução Vercel**: Criar arquivo `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Solução Netlify**: Criar arquivo `public/_redirects`:
```
/*    /index.html   200
```

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Redeploy feito após configurar variáveis
- [ ] Site acessível (URL funcionando)
- [ ] Imóveis carregando na página inicial
- [ ] Página "Sobre" funcionando
- [ ] Detalhes de imóveis abrindo
- [ ] Painel /admin acessível
- [ ] Login funcionando

## 📞 Suporte

Se após seguir todos os passos ainda tiver problemas:

1. Verifique o console do navegador (F12) por erros
2. Teste a API do Baserow diretamente: https://api.baserow.io/api/database/rows/table/693576/
3. Certifique-se que o build passou sem erros

## 🔄 Comandos Úteis

### Build local (testar antes de deploy):
```bash
npm run build
npm run preview
```

### Se der erro de build:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 🎯 URLs do Projeto

- **Site**: URL do seu deploy
- **Painel Admin**: URL/admin
- **Login**: URL/login

**Credenciais Admin**:
- Usuário: `admin`
- Senha: `bs2024admin`
