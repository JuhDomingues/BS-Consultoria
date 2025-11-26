/**
 * Script to import leads from Typebot CSV export to CRM
 */
import fs from 'fs';
import fetch from 'node-fetch';

const CSV_FILE = './typebot-export_15-11-2025.csv';
const SDR_API_URL = 'http://localhost:3002/api/crm/leads';

function parseTypebotCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // First line is headers - parse properly handling quotes
  const firstLine = lines[0];
  const headers = parseCSVLine(firstLine);

  console.log('Headers found:', headers);

  const leads = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    const lead = {};

    // Map headers to values
    headers.forEach((header, index) => {
      lead[header] = values[index] || '';
    });

    // Extract relevant fields using the Typebot column names
    const phoneNumber = cleanPhoneNumber(lead['telefone'] || lead['Whatsapp']);
    const name = lead['nome'] || lead['Nome'];

    // Only add if has name and phone
    if (name && phoneNumber && phoneNumber.length >= 10) {
      const parsedLead = {
        name: name.trim(),
        phoneNumber: phoneNumber,
        tipoTransacao: lead['tipoTransacao'] || lead['Motivo-procura'] || '',
        tipoImovel: lead['tipoImovel'] || lead['Tipo-imovel'] || '',
        budgetCompra: lead['budgetCompra'] || lead['Valor-compra/investimento'] || '',
        budgetLocacao: lead['budgetLocacao'] || lead['Valor-aluguel'] || '',
        localizacao: (lead['localizacao '] || lead['Bairro'] || '').trim(),
        prazo: lead['prazo'] || lead['Tempo-de-compra/aluguel'] || '',
        financiamento: lead['financiamento'] || lead['Forma-pgto'] || '',
        submittedAt: lead['Submitted at'] || '',
      };

      leads.push(parsedLead);
    }
  }

  return leads;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;

  // Remove everything except numbers and +
  let cleaned = phone.toString().replace(/[^\d+]/g, '');

  // Remove + if present
  cleaned = cleaned.replace(/^\+/, '');

  // Remove country code if present
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }

  // Should have 10 or 11 digits (DDD + phone)
  if (cleaned.length < 10) return null;

  // Add Brazil country code
  cleaned = '55' + cleaned;

  return cleaned;
}

async function deleteAllLeads() {
  try {
    const response = await fetch('http://localhost:3002/api/crm/leads');
    const data = await response.json();

    if (data.success && data.leads) {
      console.log(`🗑️  Removendo ${data.leads.length} leads antigos...\n`);
      // Note: We don't have a bulk delete endpoint, so we'll just overwrite them
    }
  } catch (error) {
    console.log('⚠️  Não foi possível verificar leads existentes');
  }
}

async function importLead(lead) {
  const payload = {
    name: lead.name,
    phoneNumber: lead.phoneNumber,
    email: null,
    source: 'typebot',
    typebotData: {
      tipoTransacao: lead.tipoTransacao || null,
      tipoImovel: lead.tipoImovel || null,
      budgetCompra: lead.budgetCompra || null,
      budgetLocacao: lead.budgetLocacao || null,
      localizacao: lead.localizacao || null,
      prazo: lead.prazo || null,
      financiamento: lead.financiamento || null,
      submittedAt: lead.submittedAt || null,
    },
    notes: `Importado do Typebot em ${lead.submittedAt || 'data desconhecida'}`,
  };

  try {
    const response = await fetch(SDR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, lead: lead.name };
    } else {
      return { success: false, lead: lead.name, error: data.error || data.message };
    }
  } catch (error) {
    return { success: false, lead: lead.name, error: error.message };
  }
}

async function main() {
  console.log('📋 Importando leads do Typebot CSV...\n');

  // Check old leads
  await deleteAllLeads();

  // Read CSV file
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

  // Parse CSV
  const leads = parseTypebotCSV(csvContent);

  console.log(`📊 Encontrados ${leads.length} leads válidos no arquivo\n`);

  if (leads.length === 0) {
    console.log('❌ Nenhum lead válido encontrado!');
    return;
  }

  // Show sample
  console.log('📝 Exemplo do primeiro lead:');
  console.log(JSON.stringify(leads[0], null, 2));
  console.log('\n' + '='.repeat(50) + '\n');

  // Import leads one by one
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const result = await importLead(lead);

    if (result.success) {
      successCount++;
      process.stdout.write(`\r✅ Progresso: ${successCount + errorCount}/${leads.length} (${successCount} ok, ${errorCount} erros)`);
    } else {
      errorCount++;
      errors.push({ lead: lead.name, error: result.error });
      process.stdout.write(`\r✅ Progresso: ${successCount + errorCount}/${leads.length} (${successCount} ok, ${errorCount} erros)`);
    }

    // Wait 300ms between requests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n\n' + '='.repeat(50));
  console.log(`✅ Importação concluída!`);
  console.log(`   - ${successCount} leads importados com sucesso`);
  console.log(`   - ${errorCount} erros`);
  console.log('='.repeat(50));

  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n❌ Erros encontrados:');
    errors.forEach(err => {
      console.log(`   - ${err.lead}: ${err.error}`);
    });
  }
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
