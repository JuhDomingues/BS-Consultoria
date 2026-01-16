/**
 * Script para verificar e adicionar tags aos leads do Typebot
 *
 * Este script:
 * 1. Verifica se o campo Tags existe no Baserow
 * 2. Lista todos os leads que vieram do Typebot
 * 3. Adiciona a tag "Typebot" a esses leads
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '.env.local') });

const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_LEADS_TABLE_ID = process.env.BASEROW_LEADS_TABLE_ID;
const BASEROW_DATABASE_ID = process.env.BASEROW_DATABASE_ID;

console.log('='.repeat(60));
console.log('🔍 VERIFICAÇÃO E ADIÇÃO DE TAGS AOS LEADS DO TYPEBOT');
console.log('='.repeat(60));

if (!BASEROW_TOKEN) {
  console.error('❌ BASEROW_TOKEN não configurado');
  process.exit(1);
}

if (!BASEROW_LEADS_TABLE_ID) {
  console.error('❌ BASEROW_LEADS_TABLE_ID não configurado');
  process.exit(1);
}

async function baserowRequest(endpoint, options = {}) {
  const url = `${BASEROW_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Baserow API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function getTableFields() {
  try {
    const data = await baserowRequest(`/api/database/fields/table/${BASEROW_LEADS_TABLE_ID}/`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar campos da tabela:', error.message);
    return [];
  }
}

async function addTagsField() {
  try {
    console.log('\n📝 Tentando adicionar campo Tags à tabela...');

    const data = await baserowRequest(
      `/api/database/fields/table/${BASEROW_LEADS_TABLE_ID}/`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tags',
          type: 'text',
        }),
      }
    );

    console.log('✅ Campo Tags adicionado com sucesso!');
    return data;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Campo Tags já existe na tabela');
      return null;
    }
    console.error('❌ Erro ao adicionar campo Tags:', error.message);
    return null;
  }
}

async function getAllLeads() {
  try {
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true&size=200`
    );
    return data.results || [];
  } catch (error) {
    console.error('Erro ao buscar leads:', error.message);
    return [];
  }
}

async function updateLeadTags(leadId, tags) {
  try {
    await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${leadId}/?user_field_names=true`,
      {
        method: 'PATCH',
        body: JSON.stringify({ Tags: tags }),
      }
    );
    return true;
  } catch (error) {
    console.error(`Erro ao atualizar lead ${leadId}:`, error.message);
    return false;
  }
}

async function main() {
  // 1. Verificar campos da tabela
  console.log('\n📋 PASSO 1: Verificando campos da tabela Leads...');
  const fields = await getTableFields();

  console.log('\nCampos existentes:');
  fields.forEach(field => {
    console.log(`  - ${field.name} (${field.type})`);
  });

  const tagsField = fields.find(f => f.name === 'Tags');

  if (!tagsField) {
    console.log('\n⚠️  Campo "Tags" NÃO encontrado na tabela!');
    console.log('🔧 Você precisa adicionar o campo Tags manualmente no Baserow:');
    console.log('   1. Acesse o Baserow');
    console.log('   2. Abra a tabela "Leads"');
    console.log('   3. Clique em "+" para adicionar um novo campo');
    console.log('   4. Nomeie como "Tags" e escolha o tipo "Text"');
    console.log('   5. Salve e execute este script novamente');

    // Tentar adicionar automaticamente
    const added = await addTagsField();
    if (!added) {
      console.log('\n❌ Não foi possível adicionar o campo automaticamente.');
      console.log('   Por favor, adicione manualmente no Baserow.');
    }
  } else {
    console.log('\n✅ Campo "Tags" encontrado na tabela!');
  }

  // 2. Buscar todos os leads
  console.log('\n📋 PASSO 2: Buscando leads do sistema...');
  const leads = await getAllLeads();
  console.log(`Total de leads encontrados: ${leads.length}`);

  // 3. Identificar leads do Typebot
  console.log('\n📋 PASSO 3: Identificando leads do Typebot...');

  const typebotLeads = leads.filter(lead => {
    // Verifica se a fonte é typebot
    const fonteIsTypebot = lead.Fonte &&
      (lead.Fonte.value === 'typebot' || lead.Fonte === 'typebot');

    // Verifica se tem dados do Typebot
    const hasTypebotData = lead.TipoTransacao || lead.TipoImovel ||
      lead.BudgetCompra || lead.BudgetLocacao ||
      lead.Localizacao || lead.Prazo || lead.Financiamento;

    return fonteIsTypebot || hasTypebotData;
  });

  console.log(`\nLeads identificados como vindos do Typebot: ${typebotLeads.length}`);

  if (typebotLeads.length === 0) {
    console.log('ℹ️  Nenhum lead do Typebot encontrado.');
    return;
  }

  // Mostrar leads do Typebot
  console.log('\n📊 LEADS DO TYPEBOT:');
  console.log('-'.repeat(60));

  typebotLeads.forEach((lead, index) => {
    console.log(`\n${index + 1}. ${lead.Nome || 'Sem nome'}`);
    console.log(`   📞 Telefone: ${lead.Telefone}`);
    console.log(`   📧 Email: ${lead.Email || 'N/A'}`);
    console.log(`   🔥 Score: ${lead.Score || 0}`);
    console.log(`   📅 Cadastro: ${lead.DataCadastro || 'N/A'}`);
    console.log(`   🏷️  Tags atuais: ${lead.Tags || 'Nenhuma'}`);

    if (lead.TipoTransacao) console.log(`   🏠 Tipo Transação: ${lead.TipoTransacao}`);
    if (lead.TipoImovel) console.log(`   🏘️  Tipo Imóvel: ${lead.TipoImovel}`);
    if (lead.BudgetCompra) console.log(`   💰 Budget Compra: ${lead.BudgetCompra}`);
    if (lead.BudgetLocacao) console.log(`   💵 Budget Locação: ${lead.BudgetLocacao}`);
    if (lead.Localizacao) console.log(`   📍 Localização: ${lead.Localizacao}`);
  });

  // 4. Adicionar tag "Typebot" aos leads
  console.log('\n📋 PASSO 4: Adicionando tag "Typebot" aos leads...');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of typebotLeads) {
    // Verificar se já tem a tag Typebot
    const currentTags = lead.Tags || '';
    const tagsArray = currentTags.split(',').map(t => t.trim()).filter(t => t);

    if (tagsArray.includes('Typebot')) {
      console.log(`  ⏭️  ${lead.Nome || lead.Telefone}: já possui tag "Typebot"`);
      skipped++;
      continue;
    }

    // Adicionar a tag Typebot
    tagsArray.push('Typebot');
    const newTags = tagsArray.join(', ');

    const success = await updateLeadTags(lead.id, newTags);

    if (success) {
      console.log(`  ✅ ${lead.Nome || lead.Telefone}: tag "Typebot" adicionada`);
      updated++;
    } else {
      console.log(`  ❌ ${lead.Nome || lead.Telefone}: erro ao adicionar tag`);
      errors++;
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO:');
  console.log('='.repeat(60));
  console.log(`Total de leads do Typebot: ${typebotLeads.length}`);
  console.log(`✅ Tags adicionadas: ${updated}`);
  console.log(`⏭️  Já possuíam a tag: ${skipped}`);
  console.log(`❌ Erros: ${errors}`);
  console.log('='.repeat(60));

  // Verificar status do sistema de tags
  console.log('\n📋 VERIFICAÇÃO DO SISTEMA DE TAGS:');
  console.log('-'.repeat(60));

  if (!tagsField) {
    console.log('❌ PROBLEMA: Campo Tags não existe na tabela do Baserow');
    console.log('   SOLUÇÃO: Adicione o campo Tags manualmente no Baserow');
  } else {
    console.log('✅ Campo Tags existe na tabela');
    console.log('✅ Sistema de tags está configurado corretamente');
    console.log('\nPara usar tags no CRM:');
    console.log('1. Abra um lead clicando nele');
    console.log('2. Clique no botão "Editar"');
    console.log('3. Na seção "Tags", você pode adicionar ou remover tags');
    console.log('4. Clique em "Salvar" para aplicar as alterações');
  }
}

main().catch(console.error);
