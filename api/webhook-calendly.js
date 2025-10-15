/**
 * Vercel Serverless Function - Calendly Webhook
 * Recebe eventos do Calendly (agendamentos, cancelamentos)
 */

import { handleCalendlyWebhook } from '../server/scheduling-service.js';

export default async function handler(req, res) {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Received Calendly webhook:', JSON.stringify(req.body, null, 2));

    const webhookEvent = req.body;

    // Processar webhook do Calendly
    await handleCalendlyWebhook(webhookEvent);

    // Sempre retornar 200
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Calendly webhook:', error);
    // Ainda retornar 200 para evitar retry do Calendly
    return res.status(200).json({ success: false, error: error.message });
  }
}
