import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function listLidCustomers() {
  try {
    console.log(`\n🔍 Buscando todos os clientes com formato @lid...\n`);

    const allKeys = await redis.keys('customer:*');
    const lidCustomers = allKeys
      .map(key => key.replace('customer:', ''))
      .filter(id => id.includes('@lid'))
      .sort();

    console.log(`✅ Total de clientes @lid encontrados: ${lidCustomers.length}\n`);

    if (lidCustomers.length > 0) {
      console.log(`📋 Lista de clientes @lid:`);
      for (let i = 0; i < lidCustomers.length; i++) {
        const customerId = lidCustomers[i];
        const customerData = await redis.get(`customer:${customerId}`);

        console.log(`\n${i + 1}. ${customerId}`);
        if (customerData) {
          console.log(`   - Último contato: ${new Date(customerData.lastContact).toLocaleString('pt-BR')}`);
          console.log(`   - Total de mensagens: ${customerData.totalMessages}`);

          // Verificar se tem conversa ativa
          const conversationData = await redis.get(`conversation:${customerId}`);
          if (conversationData) {
            console.log(`   - ✅ Conversa ativa (${conversationData.history?.length || 0} mensagens)`);
          } else {
            console.log(`   - ❌ Sem conversa ativa`);
          }
        }
      }
    }

    // Procurar IDs que contenham partes do número procurado
    console.log(`\n\n🔍 Procurando IDs similares a "75445496246370"...\n`);
    const searchTerm = '75445496246370';
    const similarIds = allKeys
      .map(key => key.replace('customer:', ''))
      .filter(id => id.includes(searchTerm.substring(0, 8))); // Primeiros 8 dígitos

    if (similarIds.length > 0) {
      console.log(`✅ IDs similares encontrados:`);
      similarIds.forEach(id => console.log(`  - ${id}`));
    } else {
      console.log(`❌ Nenhum ID similar encontrado.`);
    }

  } catch (error) {
    console.error(`\n❌ Erro:`, error.message);
  }
}

listLidCustomers();
