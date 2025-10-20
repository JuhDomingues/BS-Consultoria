# 🔒 Guia de Segurança - BS Consultoria

## 🚨 Resumo do Incidente de Segurança (Outubro 2024)

### O que aconteceu?
Uma API key da OpenAI foi **exposta publicamente** devido a uma configuração insegura de variáveis de ambiente.

### Como aconteceu?
O código usava **variáveis com prefixo `VITE_`** para armazenar chaves secretas:
```javascript
// ❌ ERRADO - Expõe a chave publicamente
VITE_OPENAI_API_KEY=sk-proj-...
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

**Problema:** No Vite, **TODAS as variáveis `VITE_*` são incluídas no JavaScript do navegador**, tornando-as visíveis para qualquer pessoa que inspecione o código.

### Impacto
- ✅ OpenAI detectou e **desabilitou a chave automaticamente**
- ⚠️ **Baserow token** também estava exposto (precisa ser trocado)
- ⚠️ Possível uso não autorizado antes da desativação

---

## ✅ Correções Implementadas

### 1. Refatoração da Arquitetura
**Antes (Inseguro):**
```
Frontend → API Externa (com chave exposta)
```

**Depois (Seguro):**
```
Frontend → Backend (Node.js) → API Externa (chave protegida)
```

### 2. Mudanças no Código

#### **Frontend (`src/services/ai.ts`)**
```typescript
// ❌ ANTES (INSEGURO)
const response = await fetch('https://api.openai.com/...', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
  }
});

// ✅ DEPOIS (SEGURO)
const response = await fetch('http://localhost:3001/api/generate-with-ai', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ images, prompt })
});
```

#### **Backend (`server/upload.js`)**
```javascript
// ✅ SEGURO - API key no servidor
const apiKey = process.env.OPENAI_API_KEY;
const response = await fetch('https://api.openai.com/...', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

### 3. Separação de Variáveis de Ambiente

**Variáveis Backend (Privadas):**
```bash
# .env.local (NUNCA commitar)
OPENAI_API_KEY=sk-...
BASEROW_TOKEN=...
EVOLUTION_API_KEY=...
```

**Variáveis Frontend (Públicas - REMOVIDAS):**
```bash
# ❌ REMOVIDAS - Não use mais VITE_ para secrets
# VITE_OPENAI_API_KEY=...
# VITE_BASEROW_TOKEN=...
```

---

## 📋 Checklist de Ações Imediatas

### Para o Desenvolvedor:

- [ ] **1. Gerar NOVA chave OpenAI**
  - Acesse: https://platform.openai.com/api-keys
  - Crie uma nova chave
  - Adicione no `.env.local` como `OPENAI_API_KEY=`

- [ ] **2. Gerar NOVO token Baserow**
  - Acesse: https://baserow.io/user-account
  - Revogue o token antigo: `of4oTI9DpOuTYITZvY59Kgtn2CwpCSo7`
  - Crie um novo token
  - Adicione no `.env.local` como `BASEROW_TOKEN=`

- [ ] **3. Verificar Vercel**
  - Acesse: https://vercel.com/seu-projeto/settings/environment-variables
  - **REMOVA** todas as variáveis `VITE_OPENAI_API_KEY` e `VITE_BASEROW_TOKEN`
  - **ADICIONE** as novas chaves como variáveis de ambiente normais (sem VITE_):
    - `OPENAI_API_KEY`
    - `BASEROW_TOKEN`
    - `BASEROW_TABLE_ID`
    - `BASEROW_API_URL`

- [ ] **4. Re-deploy na Vercel**
  - Após atualizar as variáveis, faça um novo deploy
  - Teste se a aplicação funciona corretamente

- [ ] **5. Monitorar uso das chaves**
  - OpenAI: https://platform.openai.com/usage
  - Verifique se há uso anormal ou não autorizado

---

## 🛡️ Boas Práticas de Segurança

### ✅ O que FAZER:

1. **Use variáveis de ambiente do servidor**
   ```javascript
   // Backend (Node.js/Vercel Functions)
   const secret = process.env.SECRET_KEY;
   ```

2. **Separe variáveis públicas de privadas**
   ```bash
   # Privadas (backend only)
   OPENAI_API_KEY=...
   BASEROW_TOKEN=...

   # Públicas (podem usar VITE_ se necessário)
   # VITE_PUBLIC_API_URL=...  # Se realmente for público
   ```

3. **Proteja o `.env.local`**
   - Verifique se está no `.gitignore`
   - NUNCA commite no Git

4. **Use arquitetura proxy/BFF**
   ```
   Frontend → Seu Backend → Serviços Externos
   ```

5. **Rotacione chaves regularmente**
   - Troque chaves a cada 90 dias ou após suspeita de exposição

### ❌ O que NÃO FAZER:

1. **NUNCA use `VITE_` para secrets**
   ```javascript
   // ❌ ERRADO
   VITE_API_KEY=secret_key
   const key = import.meta.env.VITE_API_KEY;
   ```

2. **NUNCA exponha chaves no frontend**
   ```javascript
   // ❌ ERRADO
   const apiKey = "sk-proj-123...";
   ```

3. **NUNCA commite arquivos `.env.local`**

4. **NUNCA use a mesma chave em dev/prod**

5. **NUNCA ignore emails de segurança**
   - OpenAI, GitHub e outros serviços alertam sobre exposições

---

## 🔍 Como Detectar Exposições

### 1. Verificar JavaScript do Navegador
```javascript
// Abra DevTools → Console
console.log(import.meta.env);
// Se aparecer VITE_SECRET_KEY = algo sensível → PROBLEMA!
```

### 2. Verificar builds de produção
```bash
grep -r "sk-proj-" dist/assets/*.js
grep -r "API_KEY" dist/assets/*.js
```

### 3. Usar ferramentas de scanning
- **GitGuardian**: Monitora repositórios por secrets
- **TruffleHog**: Busca secrets em commits

---

## 📚 Referências

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [OpenAI API Key Safety](https://platform.openai.com/docs/guides/safety-best-practices)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## 📞 Contato para Questões de Segurança

Se você descobrir uma vulnerabilidade de segurança, por favor:
- **NÃO** abra uma issue pública
- Entre em contato diretamente com o desenvolvedor responsável

---

## 📝 Histórico de Incidentes

| Data | Tipo | Status | Ação |
|------|------|--------|------|
| Out 2024 | Exposição de API key OpenAI | ✅ Resolvido | Chave revogada pela OpenAI, arquitetura refatorada |
| Out 2024 | Exposição de token Baserow | ⏳ Pendente | Aguardando troca do token |

---

**Última atualização:** Outubro 2024
**Versão da arquitetura de segurança:** 2.0
