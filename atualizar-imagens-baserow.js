#!/usr/bin/env node
/**
 * Script para atualizar URLs de imagens no Baserow
 * Substitui IDs novos por IDs antigos nos campos de imagens
 */

const fs = require('fs');
const path = require('path');

// Configuração
const BACKEND_URL = 'http://127.0.0.1:3003';

// Mapeamento ID novo → ID antigo
// PREENCHA ESTE OBJETO COM OS MAPEAMENTOS CORRETOS
const ID_MAPPING = {
  // Exemplo: 97: '1668579',
  //
  // ⚠️ PREENCHA ABAIXO após identificar cada imóvel:
  97: '',   // Sobrado - Parque Scaffid II - R$ 420.000
  104: '',  // Sobrado - Parque Scaffid II - R$ 500.000
  109: '',  // Sobrado - Parque Scaffid II - R$ 580.000
  110: '',  // Sobrado - Parque Scaffid II - R$ 600.000
  112: '',  // Sobrado - Parque Scaffid II - R$ 680.000
  125: '',  // Apartamento com Varanda - R$ 228.000
  298: '',  // Sobrado com móveis planejados - R$ 480.000
  331: '',  // Casa térrea assobradada - R$ 500.000
  364: '',  // Sobrado com 3 dormitórios - R$ 630.000
  397: '',  // Sobrado no Scaffidi - R$ 500.000
  398: '',  // Sobrado com 2 suítes - R$ 525.000
  430: '',  // Sobrado com piscina - R$ 850.000

  // ✅ IDs já corretos (não mudar):
  111: '3500462',  // ✅ Já correto
  463: '463',      // ✅ Já correto
  496: '496',      // ✅ Já correto
};

async function updatePropertyImages(propertyId, oldId) {
  try {
    const url = `${BACKEND_URL}/api/baserow/properties/${propertyId}`;

    // Buscar dados atuais do imóvel
    console.log(`\n📥 Buscando imóvel ID ${propertyId}...`);
    const getResponse = await fetch(url);

    if (!getResponse.ok) {
      throw new Error(`Erro ao buscar imóvel: ${getResponse.status}`);
    }

    const property = await getResponse.json();

    // Verificar se tem campo de imagens
    const imagesField = property.images || property.Images || '';

    if (!imagesField) {
      console.log(`⚠️  Imóvel ${propertyId} não tem campo de imagens`);
      return false;
    }

    // Substituir ID novo pelo ID antigo nas URLs
    const oldImages = imagesField;
    const newImages = oldImages.replace(
      new RegExp(`/imoveis/${propertyId}/`, 'g'),
      `/imoveis/${oldId}/`
    );

    // Se não houve mudança, pular
    if (oldImages === newImages) {
      console.log(`✅ Imóvel ${propertyId} já está usando o ID correto (${oldId})`);
      return true;
    }

    // Atualizar no Baserow
    console.log(`📝 Atualizando imóvel ${propertyId}...`);
    console.log(`   De: /imoveis/${propertyId}/`);
    console.log(`   Para: /imoveis/${oldId}/`);

    const updateResponse = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: newImages,
        Images: newImages, // Tentar ambos os formatos
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Erro ao atualizar: ${updateResponse.status} - ${errorText}`);
    }

    console.log(`✅ Imóvel ${propertyId} atualizado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao processar imóvel ${propertyId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('==========================================');
  console.log('🔄 ATUALIZAÇÃO DE IMAGENS NO BASEROW');
  console.log('==========================================\n');

  // Verificar se o mapeamento está preenchido
  const pendingIds = Object.entries(ID_MAPPING)
    .filter(([newId, oldId]) => !oldId || oldId === '')
    .map(([newId]) => newId);

  if (pendingIds.length > 0) {
    console.log('⚠️  ATENÇÃO: Alguns IDs ainda não foram mapeados:');
    pendingIds.forEach(id => console.log(`   - ID ${id}`));
    console.log('\n📝 Preencha o objeto ID_MAPPING no script antes de continuar.\n');

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      readline.question('Deseja continuar apenas com os IDs preenchidos? (s/n): ', answer => {
        readline.close();
        if (answer.toLowerCase() !== 's') {
          console.log('\n❌ Operação cancelada.');
          resolve();
          return;
        }
        processUpdates().then(resolve);
      });
    });
  }

  await processUpdates();
}

async function processUpdates() {
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Processar cada mapeamento
  for (const [newId, oldId] of Object.entries(ID_MAPPING)) {
    // Pular IDs não preenchidos
    if (!oldId || oldId === '') {
      console.log(`⏭️  Pulando ID ${newId} (não mapeado)`);
      skippedCount++;
      continue;
    }

    const success = await updatePropertyImages(newId, oldId);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Delay entre requisições para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumo
  console.log('\n==========================================');
  console.log('📊 RESUMO DA ATUALIZAÇÃO');
  console.log('==========================================');
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`⏭️  Pulados: ${skippedCount}`);
  console.log('==========================================\n');

  if (successCount > 0) {
    console.log('🎉 Imagens atualizadas com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('   1. Limpe o cache do navegador (Ctrl+Shift+R)');
    console.log('   2. Acesse o site e verifique se as imagens aparecem');
    console.log('   3. Se necessário, reinicie o cache do backend:');
    console.log('      pm2 restart api-backend\n');
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
