/**
 * Script de diagnóstico do sistema de envio em massa do WhatsApp
 * Verifica todas as configurações e conexões necessárias
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '.env.local') });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

console.log('='.repeat(60));
console.log('🔍 DIAGNÓSTICO DO SISTEMA DE ENVIO EM MASSA WHATSAPP');
console.log('='.repeat(60));

async function checkEvolutionAPIConfig() {
  console.log('\n📋 PASSO 1: Verificando configuração das variáveis de ambiente...');

  const checks = [
    { name: 'EVOLUTION_API_URL', value: EVOLUTION_API_URL },
    { name: 'EVOLUTION_API_KEY', value: EVOLUTION_API_KEY },
    { name: 'EVOLUTION_INSTANCE', value: EVOLUTION_INSTANCE },
  ];

  let allConfigured = true;

  for (const check of checks) {
    if (check.value) {
      const displayValue = check.name === 'EVOLUTION_API_KEY'
        ? `${check.value.substring(0, 8)}...${check.value.substring(check.value.length - 4)}`
        : check.value;
      console.log(`  ✅ ${check.name}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${check.name}: NÃO CONFIGURADO`);
      allConfigured = false;
    }
  }

  return allConfigured;
}

async function checkEvolutionAPIConnection() {
  console.log('\n📋 PASSO 2: Testando conexão com a Evolution API...');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log('  ❌ Não é possível testar - variáveis não configuradas');
    return false;
  }

  try {
    // Test basic API connectivity
    const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Conexão com Evolution API estabelecida`);
      console.log(`  📊 Instâncias encontradas: ${Array.isArray(data) ? data.length : 'N/A'}`);
      return { success: true, instances: data };
    } else {
      const errorData = await response.text();
      console.log(`  ❌ Erro na conexão: ${response.status} - ${errorData}`);

      if (response.status === 401) {
        console.log('\n  ⚠️  PROBLEMA: Chave de API inválida ou expirada');
        console.log('  📝 SOLUÇÃO: Verifique a chave de API no painel da Evolution API');
        console.log(`     URL do painel: ${EVOLUTION_API_URL.replace('/api', '')}`);
      }

      return { success: false, error: errorData };
    }
  } catch (error) {
    console.log(`  ❌ Erro de conexão: ${error.message}`);
    console.log('\n  ⚠️  PROBLEMA: Não foi possível conectar à Evolution API');
    console.log('  📝 POSSÍVEIS CAUSAS:');
    console.log('     - URL da API incorreta');
    console.log('     - Servidor da Evolution API offline');
    console.log('     - Problema de rede/firewall');
    return { success: false, error: error.message };
  }
}

async function checkInstanceStatus() {
  console.log('\n📋 PASSO 3: Verificando status da instância WhatsApp...');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.log('  ❌ Não é possível verificar - variáveis não configuradas');
    return false;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Instância encontrada: ${EVOLUTION_INSTANCE}`);

      const state = data.state || data.instance?.state || 'desconhecido';
      const isConnected = state === 'open' || state === 'connected';

      if (isConnected) {
        console.log(`  ✅ Status: CONECTADO (${state})`);
      } else {
        console.log(`  ⚠️  Status: ${state.toUpperCase()}`);
        console.log('\n  📝 AÇÃO NECESSÁRIA:');
        console.log('     1. Acesse o painel da Evolution API');
        console.log('     2. Escaneie o QR Code com o WhatsApp');
        console.log('     3. Aguarde a conexão ser estabelecida');
      }

      return { success: true, state, isConnected };
    } else {
      const errorData = await response.text();
      console.log(`  ❌ Erro ao verificar instância: ${response.status}`);

      if (response.status === 404) {
        console.log('\n  ⚠️  PROBLEMA: Instância não encontrada');
        console.log(`  📝 SOLUÇÃO: Crie a instância "${EVOLUTION_INSTANCE}" no painel da Evolution API`);
      }

      return { success: false, error: errorData };
    }
  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkLocalServer() {
  console.log('\n📋 PASSO 4: Verificando servidor local (upload.js)...');

  try {
    const response = await fetch('http://localhost:3001/api/baserow/leads', {
      method: 'GET',
    });

    if (response.ok) {
      console.log('  ✅ Servidor local rodando na porta 3001');
      return true;
    } else {
      console.log(`  ⚠️  Servidor respondeu com erro: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('  ❌ Servidor local NÃO está rodando');
    console.log('\n  📝 PARA INICIAR O SERVIDOR:');
    console.log('     cd "/Users/admin/Desktop/Projetos código/bs-consultoria-net-style-main"');
    console.log('     node server/upload.js');
    return false;
  }
}

async function testSendMessage() {
  console.log('\n📋 PASSO 5: Teste de envio (simulação)...');

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.log('  ❌ Não é possível testar - variáveis não configuradas');
    return false;
  }

  // We won't actually send a message, just verify the endpoint exists
  console.log('  ℹ️  Endpoint de envio: POST /message/sendText/{instance}');
  console.log('  ℹ️  Para testar o envio real, use a interface do Admin');

  return true;
}

async function main() {
  const configOk = await checkEvolutionAPIConfig();
  const connectionResult = await checkEvolutionAPIConnection();
  const instanceResult = await checkInstanceStatus();
  const serverOk = await checkLocalServer();
  await testSendMessage();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO DIAGNÓSTICO:');
  console.log('='.repeat(60));

  const issues = [];

  if (!configOk) {
    issues.push('Variáveis de ambiente não configuradas');
  }

  if (!connectionResult.success) {
    issues.push('Conexão com Evolution API falhou (chave inválida ou API offline)');
  }

  if (instanceResult && !instanceResult.success) {
    issues.push(`Instância "${EVOLUTION_INSTANCE}" não encontrada`);
  } else if (instanceResult && !instanceResult.isConnected) {
    issues.push('WhatsApp desconectado - precisa escanear QR Code');
  }

  if (!serverOk) {
    issues.push('Servidor local não está rodando');
  }

  if (issues.length === 0) {
    console.log('✅ TUDO OK! O sistema de envio em massa está configurado corretamente.');
    console.log('\n📝 COMO USAR:');
    console.log('   1. Acesse o painel Admin (/admin)');
    console.log('   2. Vá para a aba "Leads"');
    console.log('   3. Clique em "Enviar WhatsApp em Massa"');
    console.log('   4. Selecione os leads e escreva a mensagem');
    console.log('   5. Clique em "Enviar"');
  } else {
    console.log('❌ PROBLEMAS ENCONTRADOS:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });

    console.log('\n📝 AÇÕES NECESSÁRIAS:');

    if (!configOk) {
      console.log('   → Configure as variáveis EVOLUTION_* no arquivo .env.local');
    }

    if (!connectionResult.success) {
      console.log('   → Verifique a chave de API da Evolution no painel');
      console.log(`   → URL do painel: ${EVOLUTION_API_URL || 'não configurada'}`);
    }

    if (instanceResult && !instanceResult.success) {
      console.log(`   → Crie a instância "${EVOLUTION_INSTANCE}" no painel da Evolution`);
    } else if (instanceResult && !instanceResult.isConnected) {
      console.log('   → Escaneie o QR Code no painel da Evolution API');
    }

    if (!serverOk) {
      console.log('   → Inicie o servidor: node server/upload.js');
    }
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
