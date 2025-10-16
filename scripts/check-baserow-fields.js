/**
 * Check all fields in Baserow to find ID mapping
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BASEROW_API_URL = process.env.VITE_BASEROW_API_URL;
const BASEROW_TOKEN = process.env.VITE_BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.VITE_BASEROW_TABLE_ID;

async function checkFields() {
  const response = await fetch(
    `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
    {
      headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
    }
  );

  const data = await response.json();
  const properties = data.results || [];

  if (properties.length > 0) {
    console.log('Campos disponíveis na primeira propriedade:');
    console.log('='.repeat(80));
    const firstProperty = properties[0];

    Object.keys(firstProperty).forEach(key => {
      console.log(`${key}: ${firstProperty[key]}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\nProcurando por IDs que correspondam às pastas (ex: 3500447, 1668579)...\n');

    // Check a few known folder IDs
    const folderIds = ['3500447', '1668579', '2266571', '3092042'];

    folderIds.forEach(folderId => {
      const match = properties.find(p => {
        return Object.values(p).some(value =>
          value && value.toString() === folderId
        );
      });

      if (match) {
        console.log(`✅ Encontrado ID ${folderId}:`);
        console.log(`   Baserow ID: ${match.id}`);
        console.log(`   Título: ${match.Title || match['Título']}`);

        // Show which field contains this ID
        Object.keys(match).forEach(key => {
          if (match[key] && match[key].toString() === folderId) {
            console.log(`   Campo: ${key}`);
          }
        });
        console.log('');
      } else {
        console.log(`❌ ID ${folderId} não encontrado no Baserow`);
      }
    });
  }
}

checkFields().catch(console.error);
