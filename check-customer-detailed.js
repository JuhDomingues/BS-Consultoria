import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const customerId = '75445496246370@lid';

async function checkCustomerDetailed() {
  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 ANÁLISE DETALHADA DO CLIENTE: ${customerId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Buscar histórico do cliente
    const customerKey = `customer:${customerId}`;
    const customerData = await redis.get(customerKey);

    if (!customerData) {
      console.log(`❌ Cliente NÃO encontrado no Redis.\n`);
      return;
    }

    console.log(`✅ DADOS DO CLIENTE:`);
    console.log(`   - Primeiro contato: ${new Date(customerData.firstContact).toLocaleString('pt-BR')}`);
    console.log(`   - Último contato: ${new Date(customerData.lastContact).toLocaleString('pt-BR')}`);
    console.log(`   - Total de mensagens: ${customerData.totalMessages}`);

    // Buscar contexto da conversa
    const conversationKey = `conversation:${customerId}`;
    const conversationData = await redis.get(conversationKey);

    if (!conversationData) {
      console.log(`\n❌ Nenhuma conversa ativa encontrada.\n`);
      return;
    }

    console.log(`\n✅ CONTEXTO DA CONVERSA:`);
    console.log(`   - Imóvel de interesse: #${conversationData.propertyId || 'N/A'}`);
    console.log(`   - Qualificação completa: ${conversationData.qualificationCompleted ? 'Sim ✅' : 'Não ❌'}`);
    console.log(`   - Perguntou sobre preferência: ${conversationData.askedAboutPreference ? 'Sim ✅' : 'Não ❌'}`);
    console.log(`   - Total de mensagens: ${conversationData.history?.length || 0}`);

    if (conversationData.history && conversationData.history.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 HISTÓRICO COMPLETO DA CONVERSA:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      let clientAskedForPhotos = false;
      let agentSentPhotos = false;
      let photoRequestIndex = -1;
      let photoSentIndex = -1;

      conversationData.history.forEach((msg, index) => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'N/A';
        const role = msg.role === 'user' ? '👤 CLIENTE' : '🤖 AGENTE MIA';
        const messageNumber = index + 1;

        console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
        console.log(`║ MENSAGEM ${messageNumber} - ${role}`);
        console.log(`║ Data/Hora: ${timestamp}`);
        console.log(`╚═══════════════════════════════════════════════════════════╝`);
        console.log(`\n${msg.content}\n`);

        // Detectar solicitação de fotos
        const photoKeywords = [
          'foto', 'fotos', 'imagem', 'imagens',
          'ver', 'mostra', 'envia', 'manda',
          'informações', 'informacao', 'detalhes',
          'gostaria de mais'
        ];

        if (msg.role === 'user') {
          const contentLower = msg.content.toLowerCase();
          const askedPhoto = photoKeywords.some(kw => contentLower.includes(kw));

          if (askedPhoto) {
            clientAskedForPhotos = true;
            photoRequestIndex = messageNumber;
            console.log(`⚠️  ATENÇÃO: Cliente solicitou informações/fotos nesta mensagem!`);
          }
        }

        // Detectar envio de fotos/detalhes pelo agente
        if (msg.role === 'assistant') {
          const contentLower = msg.content.toLowerCase();
          const sentDetails =
            contentLower.includes('imagens') ||
            contentLower.includes('fotos') ||
            contentLower.includes('aqui está') ||
            contentLower.includes('aqui estão') ||
            contentLower.includes('vou enviar') ||
            contentLower.includes('detalhes do imóvel') ||
            msg.content.includes('📸') ||
            msg.content.includes('🏠');

          if (sentDetails && clientAskedForPhotos) {
            agentSentPhotos = true;
            photoSentIndex = messageNumber;
            console.log(`✅ AGENTE enviou informações/fotos do imóvel!`);
          }
        }

        console.log(`${'─'.repeat(60)}`);
      });

      // ANÁLISE FINAL
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 ANÁLISE DO ATENDIMENTO:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      console.log(`1. Cliente solicitou informações/fotos?`);
      console.log(`   ${clientAskedForPhotos ? '✅ SIM' : '❌ NÃO'}`);
      if (photoRequestIndex > 0) {
        console.log(`   📍 Solicitado na mensagem #${photoRequestIndex}`);
      }

      console.log(`\n2. Agente enviou as informações/fotos?`);
      console.log(`   ${agentSentPhotos ? '✅ SIM' : '❌ NÃO'}`);
      if (photoSentIndex > 0) {
        console.log(`   📍 Enviado na mensagem #${photoSentIndex}`);
      }

      console.log(`\n3. Perguntou sobre preferência de atendimento?`);
      console.log(`   ${conversationData.askedAboutPreference ? '✅ SIM' : '❌ NÃO'}`);

      console.log(`\n4. Cliente foi qualificado?`);
      console.log(`   ${conversationData.qualificationCompleted ? '✅ SIM' : '❌ NÃO'}`);

      // VEREDITO
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 VEREDITO:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      if (clientAskedForPhotos && agentSentPhotos) {
        console.log(`✅ ATENDIMENTO ADEQUADO`);
        console.log(`   O agente MIA respondeu à solicitação do cliente corretamente.`);
      } else if (clientAskedForPhotos && !agentSentPhotos) {
        console.log(`⚠️  POSSÍVEL PROBLEMA NO ATENDIMENTO`);
        console.log(`   O cliente solicitou informações mas o agente pode não ter enviado!`);
        console.log(`\n   Possíveis causas:`);
        console.log(`   - Agente esperando resposta sobre preferência de atendimento`);
        console.log(`   - Processo de qualificação ainda não completado`);
        console.log(`   - Falha técnica no envio das imagens via WhatsApp`);
      } else if (!clientAskedForPhotos) {
        console.log(`ℹ️  CONVERSA INICIAL`);
        console.log(`   Cliente ainda não solicitou informações específicas.`);
      }
    }

    // Verificar dados de lead
    const leadKey = `lead:${customerId}`;
    const leadData = await redis.get(leadKey);

    if (leadData) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 DADOS DE LEAD (CRM):`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`   - Nome: ${leadData.nome || 'N/A'}`);
      console.log(`   - Email: ${leadData.email || 'N/A'}`);
      console.log(`   - Telefone: ${leadData.telefone || 'N/A'}`);
      console.log(`   - Preferência: ${leadData.preferencia || 'N/A'}`);
      console.log(`   - Propriedade de interesse: ${leadData.propriedadeInteresse || 'N/A'}`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error(`\n❌ Erro ao consultar cliente:`, error.message);
    console.error(error);
  }
}

checkCustomerDetailed();
