/**
 * Vercel Serverless Function - WhatsApp Webhook
 * Recebe mensagens do Evolution API e processa com o Agente SDR
 */

import { processMessage, sendWhatsAppMessage, getAllProperties } from '../server/sdr-agent.js';
import { schedulePropertyVisit } from '../server/scheduling-service.js';
import { formatSchedulingMessage } from '../server/calendly-service.js';

export default async function handler(req, res) {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    // Apenas processar mensagens recebidas (não enviadas pelo bot)
    if (event === 'messages.upsert' && data?.key?.fromMe === false) {
      const message = data.message?.conversation ||
                     data.message?.extendedTextMessage?.text ||
                     '';

      const phoneNumber = data.key.remoteJid.replace('@s.whatsapp.net', '');

      if (message) {
        console.log(`Processing message from ${phoneNumber}: ${message}`);

        // Processar mensagem com IA
        const result = await processMessage(phoneNumber, message);

        // Verificar se cliente quer agendar
        if (result.schedulingInfo && result.schedulingInfo.wantsToSchedule) {
          console.log(`Customer wants to schedule visit for property: ${result.schedulingInfo.propertyId}`);

          // Buscar dados do imóvel
          const properties = await getAllProperties();
          const property = properties.find(p => p.id === parseInt(result.schedulingInfo.propertyId));

          if (property) {
            const customerName = result.context?.customerInfo?.name || phoneNumber;
            const customerEmail = result.context?.customerInfo?.email || '';

            // Criar link de agendamento
            const schedulingResult = await schedulePropertyVisit(
              phoneNumber,
              customerName,
              customerEmail,
              property
            );

            if (schedulingResult.success) {
              const schedulingMessage = formatSchedulingMessage(
                customerName,
                schedulingResult.propertyTitle,
                schedulingResult.schedulingLink
              );

              await sendWhatsAppMessage(phoneNumber, schedulingMessage);
              console.log(`Sent scheduling link to ${phoneNumber}`);
            } else {
              const errorMessage = 'Desculpe, tive um problema ao criar o link de agendamento. Por favor, entre em contato pelo telefone (11) 98159-8027.';
              await sendWhatsAppMessage(phoneNumber, errorMessage);
            }
          } else {
            const notFoundMessage = 'Para agendar uma visita, preciso que você escolha um imóvel específico primeiro. Posso te mostrar algumas opções?';
            await sendWhatsAppMessage(phoneNumber, notFoundMessage);
          }
        }
        // Se deve enviar detalhes do imóvel
        else if (result.shouldSendPropertyDetails && result.propertyToSend) {
          console.log(`Sending property details for: ${result.propertyToSend['Título'] || result.propertyToSend.title}`);
          const { sendPropertyDetails } = await import('../server/sdr-agent.js');
          await sendPropertyDetails(phoneNumber, result.propertyToSend);
        }
        // Apenas resposta da IA
        else {
          await sendWhatsAppMessage(phoneNumber, result.response);
          console.log(`Sent response to ${phoneNumber}: ${result.response}`);
        }
      }
    }

    // Sempre retornar 200
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Ainda retornar 200 para evitar retry do Evolution API
    return res.status(200).json({ success: false, error: error.message });
  }
}
