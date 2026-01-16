import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Inicializar Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const customerId = '75445496246370@lid';

async function checkCustomer() {
  try {
    console.log(`\n🔍 Buscando informações do cliente: ${customerId}\n`);

    // Buscar histórico do cliente
    const customerKey = `customer:${customerId}`;
    const customerData = await redis.get(customerKey);

    if (!customerData) {
      console.log(`❌ Cliente ${customerId} NÃO encontrado no sistema.`);
      console.log(`\n📋 Verificando lista de todos os clientes no Redis...`);

      const allKeys = await redis.keys('customer:*');
      console.log(`\n✅ Total de clientes no Redis: ${allKeys.length}`);

      // Verificar se existe algum ID similar
      const similarIds = allKeys.filter(key => key.includes('75445496246370'));
      if (similarIds.length > 0) {
        console.log(`\n🔍 IDs similares encontrados:`);
        similarIds.forEach(id => console.log(`  - ${id}`));
      }

      return;
    }

    console.log(`✅ Cliente encontrado!`);
    console.log(`\n📊 Dados do cliente:`);
    console.log(`  - Primeiro contato: ${new Date(customerData.firstContact).toLocaleString('pt-BR')}`);
    console.log(`  - Último contato: ${new Date(customerData.lastContact).toLocaleString('pt-BR')}`);
    console.log(`  - Total de mensagens: ${customerData.totalMessages}`);

    // Buscar contexto da conversa
    const conversationKey = `conversation:${customerId}`;
    const conversationData = await redis.get(conversationKey);

    if (conversationData) {
      console.log(`\n💬 Conversa ativa encontrada:`);
      console.log(`  - Imóvel em discussão: ${conversationData.propertyId || 'Nenhum'}`);
      console.log(`  - Qualificação completa: ${conversationData.qualificationCompleted ? 'Sim' : 'Não'}`);
      console.log(`  - Total de mensagens na conversa: ${conversationData.history?.length || 0}`);

      if (conversationData.history && conversationData.history.length > 0) {
        console.log(`\n📝 Histórico da conversa (últimas 10 mensagens):`);
        const recentMessages = conversationData.history.slice(-10);

        let clientAskedForPhotos = false;
        let agentSentPhotos = false;

        recentMessages.forEach((msg, index) => {
          const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'N/A';
          const role = msg.role === 'user' ? '👤 CLIENTE' : '🤖 AGENTE';
          const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;

          console.log(`\n  ${index + 1}. ${role} [${timestamp}]:`);
          console.log(`     ${preview}`);

          // Detectar se cliente pediu fotos
          const photoKeywords = ['foto', 'fotos', 'imagem', 'imagens', 'ver', 'mostra', 'envia', 'manda'];
          if (msg.role === 'user' && photoKeywords.some(kw => msg.content.toLowerCase().includes(kw))) {
            clientAskedForPhotos = true;
            console.log(`     ⚠️  Cliente solicitou fotos nesta mensagem`);
          }

          // Detectar se agente enviou fotos
          if (msg.role === 'assistant' && (msg.content.includes('imagens') || msg.content.includes('fotos') || msg.content.includes('Aqui estão'))) {
            agentSentPhotos = true;
            console.log(`     ✅ Agente enviou informações de fotos`);
          }
        });

        console.log(`\n\n📊 ANÁLISE:`);
        console.log(`  - Cliente solicitou fotos? ${clientAskedForPhotos ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`  - Agente enviou fotos? ${agentSentPhotos ? '✅ SIM' : '❌ NÃO'}`);

        if (clientAskedForPhotos && !agentSentPhotos) {
          console.log(`\n  ⚠️  ATENÇÃO: Cliente solicitou fotos mas o agente pode não ter enviado!`);
        } else if (clientAskedForPhotos && agentSentPhotos) {
          console.log(`\n  ✅ Cliente solicitou fotos e o agente respondeu adequadamente.`);
        }
      }
    } else {
      console.log(`\n❌ Nenhuma conversa ativa encontrada para este cliente.`);
    }

    // Buscar dados de lead
    const leadKey = `lead:${customerId}`;
    const leadData = await redis.get(leadKey);

    if (leadData) {
      console.log(`\n👤 Dados de Lead:`);
      console.log(`  - Nome: ${leadData.nome || 'N/A'}`);
      console.log(`  - Email: ${leadData.email || 'N/A'}`);
      console.log(`  - Telefone: ${leadData.telefone || 'N/A'}`);
      console.log(`  - Preferência: ${leadData.preferencia || 'N/A'}`);
    }

  } catch (error) {
    console.error(`\n❌ Erro ao consultar cliente:`, error.message);
    console.error(error);
  }
}

checkCustomer();
