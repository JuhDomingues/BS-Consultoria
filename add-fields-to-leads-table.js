/**
 * Script to add all required fields to existing Leads table
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_LEADS_TABLE_ID = process.env.BASEROW_LEADS_TABLE_ID;

if (!BASEROW_TOKEN || !BASEROW_LEADS_TABLE_ID) {
  console.error('❌ Configuração incompleta no .env.local');
  process.exit(1);
}

/**
 * Create field in Baserow table
 */
async function createField(tableId, fieldConfig) {
  const response = await fetch(`${BASEROW_API_URL}/api/database/fields/table/${tableId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fieldConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Get existing fields
 */
async function getTableFields(tableId) {
  const response = await fetch(`${BASEROW_API_URL}/api/database/fields/table/${tableId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get table fields: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Adicionando campos à tabela de Leads...\n');
  console.log('='.repeat(60));

  try {
    // Load schema
    console.log('\n📖 Carregando schema...');
    const schemaPath = join(__dirname, 'baserow-leads-table-schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Get existing fields
    console.log('\n🔍 Verificando campos existentes...');
    const existingFields = await getTableFields(BASEROW_LEADS_TABLE_ID);
    const existingFieldNames = existingFields.map(f => f.name);
    console.log(`Campos existentes: ${existingFieldNames.join(', ')}`);

    // Filter fields to add (skip "Nome" if "Name" exists)
    const fieldsToAdd = schema.fields.filter(f => {
      if (f.name === 'Nome' && existingFieldNames.includes('Name')) {
        return false; // Skip, já existe como "Name"
      }
      return !existingFieldNames.includes(f.name);
    });

    console.log(`\n📋 ${fieldsToAdd.length} campos para adicionar`);

    if (fieldsToAdd.length === 0) {
      console.log('\n✅ Todos os campos já existem!');
      return;
    }

    // Create fields
    console.log('\n🔧 Adicionando campos...\n');
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < fieldsToAdd.length; i++) {
      const fieldConfig = fieldsToAdd[i];

      try {
        await createField(BASEROW_LEADS_TABLE_ID, fieldConfig);
        successCount++;
        console.log(`  ✅ ${i + 1}/${fieldsToAdd.length} - ${fieldConfig.name} (${fieldConfig.type})`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        errorCount++;
        errors.push({ field: fieldConfig.name, error: error.message });
        console.error(`  ❌ ${i + 1}/${fieldsToAdd.length} - ${fieldConfig.name}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`✅ ${successCount} campos adicionados com sucesso`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} erros`);
    }
    console.log('='.repeat(60));

    if (successCount > 0) {
      console.log('\n📝 Próximo passo:');
      console.log('   Execute: node migrate-leads-to-baserow.js');
    }

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
