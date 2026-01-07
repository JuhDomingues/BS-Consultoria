# 🔧 Correção do Nginx - BS Consultoria

## 🎯 Problema Identificado

O Nginx estava retornando HTML ao invés de fazer proxy das requisições `/api/` para o backend na porta 3003, causando o erro:

```
SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

## ✅ Solução

A configuração foi reorganizada para garantir que:
1. Rotas `/api/baserow/` sejam proxy para `http://127.0.0.1:3003`
2. Rotas `/api/upload` e `/api/move-images` sejam proxy para `http://127.0.0.1:3001`
3. Rotas `/api/sdr/` sejam proxy para `http://127.0.0.1:3002`
4. Imagens `/imoveis/` sejam servidas do diretório correto
5. Arquivos estáticos do React sejam servidos do `dist/`
6. SPA routing funcione com fallback para `index.html`

## 📦 Arquivos Criados

1. **nginx-config-vps.conf** - Configuração completa do Nginx (para referência)
2. **update-nginx-config.sh** - Script automatizado para aplicar a configuração
3. **CORRECAO-NGINX.md** - Este arquivo de instruções

## 🚀 Como Aplicar na VPS

### Opção 1: Script Automatizado (RECOMENDADO)

Na VPS, execute os seguintes comandos:

```bash
# 1. Entre no diretório do projeto
cd /var/www/bs-consultoria-net-style-main

# 2. Atualize o código do GitHub
git pull origin main

# 3. Execute o script como root
sudo bash update-nginx-config.sh
```

O script irá:
- ✅ Criar backup automático da configuração atual
- ✅ Aplicar a nova configuração
- ✅ Testar a configuração
- ✅ Parar e iniciar o Nginx (não apenas reload)
- ✅ Verificar o status
- ✅ Mostrar comandos para testar

### Opção 2: Manual

Se preferir fazer manualmente:

```bash
# 1. Fazer backup
sudo cp /etc/nginx/sites-available/bsconsultoriadeimoveis.com.br /etc/nginx/sites-available/bsconsultoriadeimoveis.com.br.backup

# 2. Editar o arquivo
sudo nano /etc/nginx/sites-available/bsconsultoriadeimoveis.com.br

# 3. Copiar o conteúdo de nginx-config-vps.conf e colar no editor

# 4. Salvar (Ctrl+O, Enter, Ctrl+X)

# 5. Testar configuração
sudo nginx -t

# 6. Parar Nginx
sudo systemctl stop nginx

# 7. Iniciar Nginx
sudo systemctl start nginx

# 8. Verificar status
sudo systemctl status nginx
```

## 🧪 Testes Após Aplicar

### 1. Testar API do Baserow

```bash
curl -I https://bsconsultoriadeimoveis.com.br/api/baserow/properties
```

**Resultado esperado:**
```
HTTP/2 200
content-type: application/json
```

**❌ Se retornar `content-type: text/html`, a configuração não foi aplicada corretamente**

### 2. Verificar conteúdo da resposta

```bash
curl https://bsconsultoriadeimoveis.com.br/api/baserow/properties | head -n 10
```

**Resultado esperado:**
```json
{"count":15,"next":null,"previous":null,"results":[...]}
```

**❌ Se retornar `<!doctype html>`, a configuração não foi aplicada**

### 3. Testar no navegador

1. Abra o site: https://bsconsultoriadeimoveis.com.br
2. Abra o DevTools (F12)
3. Vá para a aba Console
4. **Não deve haver** o erro: `SyntaxError: Unexpected token '<'`
5. Os imóveis devem aparecer na página

### 4. Verificar imagens

- As imagens dos imóveis devem carregar corretamente
- Se não aparecerem, pode ser problema de mapeamento ID (próximo passo)

## 🔍 Diagnóstico de Problemas

### Se os imóveis não aparecerem:

```bash
# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Ver logs do backend
pm2 logs api-backend --lines 50

# Verificar se backend está rodando
pm2 status

# Testar backend diretamente
curl http://127.0.0.1:3003/api/baserow/properties
```

### Se a configuração não for aplicada:

```bash
# Verificar configuração ativa
sudo nginx -T | grep -A 100 "server_name bsconsultoriadeimoveis"

# Verificar se há arquivos conflitantes
ls -la /etc/nginx/sites-enabled/

# Verificar se há erros de sintaxe
sudo nginx -t -v

# Forçar restart completo
sudo systemctl stop nginx && sleep 2 && sudo systemctl start nginx
```

### Se imagens não aparecerem:

```bash
# Verificar se o diretório existe
ls -la /var/www/bs-consultoria-net-style-main/public/imoveis/

# Verificar permissões
sudo chown -R www-data:www-data /var/www/bs-consultoria-net-style-main/public/imoveis/
sudo chmod -R 755 /var/www/bs-consultoria-net-style-main/public/imoveis/
```

## 📝 Notas Importantes

### Diferenças da Configuração Anterior

1. **Location blocks reordenados**: Rotas mais específicas vêm primeiro
2. **Stop + Start ao invés de reload**: Garante que cache seja limpo
3. **Proxy pass corrigido**: `/api/baserow/` → `http://127.0.0.1:3003/api/baserow/`
4. **Diretório corrigido**: `/var/www/bs-consultoria-net-style-main/dist`
5. **Headers adicionados**: CORS, Cache-Control apropriados

### Por que `stop` + `start` ao invés de `reload`?

O `reload` mantém conexões ativas e pode não aplicar mudanças críticas nos location blocks. O `stop` + `start` força uma reinicialização completa, garantindo que a nova configuração seja 100% aplicada.

## 🎉 Resultado Final Esperado

Após aplicar a correção:

1. ✅ Site carrega normalmente
2. ✅ Imóveis aparecem na página
3. ✅ Sem erros no console do navegador
4. ✅ API retorna JSON (não HTML)
5. ✅ Imagens carregam (se IDs estiverem corretos)

## ⚠️ Próximo Passo (Se necessário)

Se as imagens ainda não aparecerem, o problema pode ser o mapeamento de IDs:
- Os IDs no Baserow são diferentes dos IDs nas pastas de imagens
- Será necessário renomear as pastas ou implementar um sistema de mapeamento

---

**📞 Suporte**: Se houver problemas, envie o output de:
```bash
sudo nginx -T | grep -A 100 "server_name bsconsultoriadeimoveis"
curl -I https://bsconsultoriadeimoveis.com.br/api/baserow/properties
pm2 status
```
