/**
 * Script to create Baserow Leads table automatically via API
 * This creates the table with all fields configured
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '.env.local') });

const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_DATABASE_ID = process.env.BASEROW_DATABASE_ID; // ID do seu Database (não da table)

if (!BASEROW_TOKEN) {
  console.error('❌ BASEROW_TOKEN not found in .env.local');
  process.exit(1);
}

if (!BASEROW_DATABASE_ID) {
  console.error('❌ BASEROW_DATABASE_ID not found in .env.local');
  console.error('ℹ️  Você precisa adicionar o ID do seu Database (workspace) no .env.local');
  console.error('ℹ️  Exemplo: BASEROW_DATABASE_ID=12345');
  process.exit(1);
}

/**
 * Create table in Baserow
 */
async function createTable(databaseId, tableName) {
  const response = await fetch(`${BASEROW_API_URL}/api/database/tables/database/${databaseId}/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: tableName,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create table: ${response.status} - ${errorText}`);
  }

  return response.json();
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
    throw new Error(`Failed to create field ${fieldConfig.name}: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Delete the default "Name" field that comes with new tables
 */
async function deleteDefaultField(tableId, fieldId) {
  const response = await fetch(`${BASEROW_API_URL}/api/database/fields/${fieldId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.warn(`⚠️  Could not delete default field: ${response.status} - ${errorText}`);
  }
}

/**
 * Get table fields to find the default one
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
  console.log('🚀 Criando tabela de Leads no Baserow...\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Create table
    console.log('\n📋 Criando tabela "Leads"...');
    const table = await createTable(BASEROW_DATABASE_ID, 'Leads');
    console.log(`✅ Tabela criada! ID: ${table.id}`);

    // Step 2: Get and delete default field
    console.log('\n🗑️  Removendo campo padrão...');
    const fields = await getTableFields(table.id);
    if (fields.length > 0) {
      await deleteDefaultField(table.id, fields[0].id);
      console.log('✅ Campo padrão removido');
    }

    // Step 3: Load schema
    console.log('\n📖 Carregando schema...');
    const schemaPath = join(__dirname, 'baserow-leads-table-schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    console.log(`✅ Schema carregado: ${schema.fields.length} campos`);

    // Step 4: Create fields
    console.log('\n🔧 Criando campos...');
    for (let i = 0; i < schema.fields.length; i++) {
      const fieldConfig = schema.fields[i];

      try {
        await createField(table.id, fieldConfig);
        console.log(`  ✅ ${i + 1}/${schema.fields.length} - ${fieldConfig.name} (${fieldConfig.type})`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`  ❌ Erro ao criar campo ${fieldConfig.name}:`, error.message);
      }
    }

    // Step 5: Success
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tabela de Leads criada com sucesso!');
    console.log(`\n📌 TABLE ID: ${table.id}`);
    console.log('\n📝 Próximos passos:');
    console.log('   1. Adicione esta linha no .env.local:');
    console.log(`      BASEROW_LEADS_TABLE_ID=${table.id}`);
    console.log('   2. Reinicie o upload server (npm run upload-server)');
    console.log('   3. Execute a migração: node migrate-leads-to-baserow.js');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    console.error('\nDetalhes:', error.stack);
    process.exit(1);
  }
}

main();
