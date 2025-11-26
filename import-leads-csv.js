/**
 * Script to import leads from CSV file to CRM
 */
import fs from 'fs';
import fetch from 'node-fetch';

const CSV_FILE = './exemplo-importacao-leads.csv';
const SDR_API_URL = 'http://localhost:3002/api/crm/leads';

function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // First line is headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const leads = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    const lead = {};

    headers.forEach((header, index) => {
      const value = values[index] || '';

      switch(header) {
        case 'nome':
        case 'name':
          lead.name = value;
          break;
        case 'telefone':
        case 'phone':
        case 'phonenumber':
          lead.phoneNumber = value.replace(/\D/g, '');
          break;
        case 'email':
        case 'e-mail':
          lead.email = value || null;
          break;
        case 'transacao':
        case 'tipotransacao':
        case 'tipo_transacao':
          lead.tipoTransacao = value;
          break;
        case 'tipoimovel':
        case 'tipo_imovel':
        case 'imovel':
          lead.tipoImovel = value;
          break;
        case 'budgetcompra':
        case 'budget_compra':
        case 'orcamentocompra':
          lead.budgetCompra = value;
          break;
        case 'budgetlocacao':
        case 'budget_locacao':
        case 'orcamentolocacao':
          lead.budgetLocacao = value;
          break;
        case 'localizacao':
        case 'localização':
        case 'cidade':
          lead.localizacao = value;
          break;
        case 'prazo':
          lead.prazo = value;
          break;
        case 'financiamento':
          lead.financiamento = value;
          break;
        case 'observacoes':
        case 'observações':
        case 'notes':
        case 'notas':
          lead.notes = value;
          break;
      }
    });

    if (lead.name && lead.phoneNumber) {
      leads.push(lead);
    }
  }

  return leads;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;

  // Remove everything except numbers
  let cleaned = phone.toString().replace(/\D/g, '');

  // Add Brazil country code if not present
  if (cleaned.length === 11 || cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

async function importLead(lead) {
  const formattedPhone = cleanPhoneNumber(lead.phoneNumber);

  const payload = {
    name: lead.name,
    phoneNumber: formattedPhone,
    email: lead.email || null,
    source: 'import',
    typebotData: {
      tipoTransacao: lead.tipoTransacao || null,
      tipoImovel: lead.tipoImovel || null,
      budgetCompra: lead.budgetCompra || null,
      budgetLocacao: lead.budgetLocacao || null,
      localizacao: lead.localizacao || null,
      prazo: lead.prazo || null,
      financiamento: lead.financiamento || null,
    },
    notes: lead.notes || null,
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
      console.log(`✅ Lead importado: ${lead.name} (${formattedPhone})`);
      return { success: true, lead: lead.name };
    } else {
      console.log(`❌ Erro ao importar ${lead.name}: ${data.error || 'Unknown error'}`);
      return { success: false, lead: lead.name, error: data.error };
    }
  } catch (error) {
    console.log(`❌ Erro ao importar ${lead.name}: ${error.message}`);
    return { success: false, lead: lead.name, error: error.message };
  }
}

async function main() {
  console.log('📋 Importando leads do CSV...\n');

  // Read CSV file
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

  // Parse CSV
  const leads = parseCSV(csvContent);

  console.log(`📊 Encontrados ${leads.length} leads no arquivo\n`);

  // Import leads one by one
  let successCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    const result = await importLead(lead);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Wait 500ms between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Importação concluída!`);
  console.log(`   - ${successCount} leads importados com sucesso`);
  console.log(`   - ${errorCount} erros`);
  console.log('='.repeat(50));
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
