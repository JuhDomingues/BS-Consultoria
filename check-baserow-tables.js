import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try .env.local first, fallback to .env
const envPath = join(__dirname, '.env.local');
dotenv.config({ path: envPath });

const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

async function checkTables() {
  try {
    console.log('🔍 Verificando databases e tabelas no Baserow...\n');

    // List all workspaces/databases
    const response = await fetch(`${BASEROW_API_URL}/api/applications/`, {
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('❌ Erro:', response.status);
      const errorText = await response.text();
      console.error('Detalhes:', errorText);
      return;
    }

    const data = await response.json();

    console.log('📊 Databases encontrados:\n');
    for (const app of data) {
      console.log(`Database: ${app.name} (ID: ${app.id})`);

      if (app.tables && app.tables.length > 0) {
        console.log('  Tabelas:');
        for (const table of app.tables) {
          console.log(`    - ${table.name} (ID: ${table.id})`);
        }
      }
      console.log('');
    }

    // Check if there's a "Leads" table
    const leadsTable = data
      .flatMap(db => db.tables || [])
      .find(table => table.name.toLowerCase().includes('lead'));

    if (leadsTable) {
      console.log(`✅ Tabela de Leads encontrada: "${leadsTable.name}" (ID: ${leadsTable.id})`);
      console.log(`\n📝 Adicione isso no .env:`);
      console.log(`BASEROW_LEADS_TABLE_ID=${leadsTable.id}`);
    } else {
      console.log('⚠️  Nenhuma tabela de Leads encontrada');
      console.log('\n📝 Para criar, você precisa:');
      console.log('1. Escolher um DATABASE_ID acima');
      console.log('2. Adicionar no .env: BASEROW_DATABASE_ID=XXXXX');
      console.log('3. Executar: node create-baserow-leads-table.js');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkTables();
