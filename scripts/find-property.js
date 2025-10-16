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

async function findProperty() {
  const response = await fetch(
    `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
    {
      headers: { 'Authorization': `Token ${BASEROW_TOKEN}` }
    }
  );

  const data = await response.json();
  const properties = data.results || [];

  const belaVista = properties.filter(p => {
    const title = (p.Title || p['Título'] || '').toLowerCase();
    return title.includes('bela vista') || title.includes('scaffidi');
  });

  console.log('Properties matching "Bela Vista" or "Scaffidi":');
  belaVista.forEach(p => {
    console.log(`ID: ${p.id}, Title: ${p.Title || p['Título']}`);
  });
}

findProperty().catch(console.error);
