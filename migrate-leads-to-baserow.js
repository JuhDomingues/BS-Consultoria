/**
 * Migration script: Redis leads → Baserow database
 * Transfers all leads from temporary Redis storage to permanent Baserow database
 */

import { initRedis, getAllLeads } from './server/redis-client.js';
import fetch from 'node-fetch';

const UPLOAD_SERVER_URL = 'http://localhost:3001';

/**
 * Transform Redis lead format to Baserow format
 */
function transformLeadToBaserow(redisLead) {
  // Calculate quality tier based on score
  let quality = 'Frio';
  if (redisLead.score >= 70) {
    quality = 'Quente';
  } else if (redisLead.score >= 40) {
    quality = 'Morno';
  }

  // Format date to YYYY-MM-DD (Baserow requirement)
  let dataCadastro = new Date().toISOString().split('T')[0];
  if (redisLead.createdAt) {
    try {
      const date = new Date(redisLead.createdAt);
      dataCadastro = date.toISOString().split('T')[0];
    } catch (e) {
      // Use default if parse fails
    }
  }

  return {
    'Nome': redisLead.name || '',
    'Telefone': redisLead.phoneNumber || '',
    'Email': redisLead.email || null,
    'Score': redisLead.score || 0,
    // 'Qualidade': quality,  // Desabilitado temporariamente
    // 'Fonte': redisLead.source || 'unknown',  // Desabilitado temporariamente
    'TotalMensagens': redisLead.totalMessages || 0,
    'ImovelInteresse': redisLead.propertyInterest || null,
    'DataCadastro': dataCadastro,
    'TipoTransacao': redisLead.typebotData?.tipoTransacao || null,
    'TipoImovel': redisLead.typebotData?.tipoImovel || null,
    'BudgetCompra': redisLead.typebotData?.budgetCompra || null,
    'BudgetLocacao': redisLead.typebotData?.budgetLocacao || null,
    'Localizacao': redisLead.typebotData?.localizacao || null,
    'Prazo': redisLead.typebotData?.prazo || null,
    'Financiamento': redisLead.typebotData?.financiamento || null,
    'Indicadores': redisLead.qualityIndicators ? JSON.stringify(redisLead.qualityIndicators) : null,
    'Observacoes': redisLead.notes || null,
  };
}

/**
 * Create lead in Baserow via upload server API
 */
async function createLeadInBaserow(leadData) {
  const response = await fetch(`${UPLOAD_SERVER_URL}/api/baserow/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leadData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Baserow API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Main migration function
 */
async function migrateLeads() {
  console.log('🔄 Iniciando migração de leads: Redis → Baserow\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Connect to Redis
    console.log('\n📡 Conectando ao Redis...');
    await initRedis();
    console.log('✅ Redis conectado\n');

    // Step 2: Fetch all leads from Redis
    console.log('📥 Buscando leads do Redis...');
    const redisLeads = await getAllLeads();
    console.log(`✅ Encontrados ${redisLeads.length} leads no Redis\n`);

    if (redisLeads.length === 0) {
      console.log('⚠️  Nenhum lead encontrado no Redis. Migração não necessária.');
      return;
    }

    // Show sample lead
    console.log('📋 Exemplo de lead (primeiro da lista):');
    console.log(JSON.stringify(redisLeads[0], null, 2));
    console.log('\n' + '='.repeat(60) + '\n');

    // Step 3: Migrate each lead to Baserow
    console.log('🚀 Iniciando migração para Baserow...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < redisLeads.length; i++) {
      const redisLead = redisLeads[i];

      try {
        // Transform to Baserow format
        const baserowLead = transformLeadToBaserow(redisLead);

        // Create in Baserow
        await createLeadInBaserow(baserowLead);

        successCount++;
        process.stdout.write(`\r✅ Progresso: ${successCount + errorCount}/${redisLeads.length} (${successCount} ok, ${errorCount} erros)`);

        // Rate limiting: wait 200ms between requests to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        errorCount++;
        errors.push({
          lead: redisLead.name || redisLead.phoneNumber,
          error: error.message
        });
        process.stdout.write(`\r✅ Progresso: ${successCount + errorCount}/${redisLeads.length} (${successCount} ok, ${errorCount} erros)`);
      }
    }

    // Step 4: Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ Migração concluída!');
    console.log(`   - ${successCount} leads migrados com sucesso`);
    console.log(`   - ${errorCount} erros`);
    console.log('='.repeat(60));

    // Show errors if any (max 10)
    if (errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      const errorsToShow = errors.slice(0, 10);
      errorsToShow.forEach(err => {
        console.log(`   - ${err.lead}: ${err.error}`);
      });

      if (errors.length > 10) {
        console.log(`   ... e mais ${errors.length - 10} erros`);
      }
    }

    // Step 5: Next steps
    if (successCount > 0) {
      console.log('\n📝 Próximos passos:');
      console.log('   1. Verificar os leads no Baserow');
      console.log('   2. Atualizar o SDR server para usar Baserow como storage principal');
      console.log('   3. (Opcional) Limpar leads antigos do Redis após verificação');
    }

  } catch (error) {
    console.error('\n❌ Erro fatal durante migração:', error);
    console.error('\nDetalhes:', error.stack);
    process.exit(1);
  }
}

// Run migration
migrateLeads().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
});
