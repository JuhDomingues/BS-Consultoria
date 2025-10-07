/**
 * SDR Agent Server - Handles WhatsApp webhook and AI interactions
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processMessage, sendWhatsAppMessage } from './sdr-agent.js';

dotenv.config();

const app = express();
const PORT = process.env.SDR_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SDR Agent' });
});

// Debug endpoint - logs ALL requests
app.all('/webhook/debug', (req, res) => {
  console.log('=== DEBUG WEBHOOK ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('===================');
  res.status(200).json({ success: true, received: req.body });
});

// Debug endpoint with event name
app.all('/webhook/debug/:event', (req, res) => {
  console.log('=== DEBUG WEBHOOK WITH EVENT ===');
  console.log('Event:', req.params.event);
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('================================');
  res.status(200).json({ success: true, event: req.params.event, received: req.body });
});

/**
 * Webhook to receive messages from Evolution API
 * Evolution API will POST to this endpoint when a message is received
 */
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('Received webhook:', JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    // Only process incoming messages (not status updates or sent messages)
    if (event === 'messages.upsert' && data?.key?.fromMe === false) {
      const message = data.message?.conversation ||
                     data.message?.extendedTextMessage?.text ||
                     '';

      const phoneNumber = data.key.remoteJid.replace('@s.whatsapp.net', '');

      if (message) {
        console.log(`Processing message from ${phoneNumber}: ${message}`);

        // Process message with AI
        const result = await processMessage(phoneNumber, message);

        // Send response via WhatsApp
        await sendWhatsAppMessage(phoneNumber, result.response);

        console.log(`Sent response to ${phoneNumber}: ${result.response}`);

        // If should send property details, send them
        if (result.shouldSendPropertyDetails && result.propertyToSend) {
          console.log(`Sending property details for: ${result.propertyToSend['Título'] || result.propertyToSend.title}`);
          const { sendPropertyDetails } = await import('./sdr-agent.js');
          await sendPropertyDetails(phoneNumber, result.propertyToSend);
        }
      }
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to prevent Evolution API from retrying
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * API endpoint to initiate conversation from website
 * Called when user clicks "Falar com Consultor" button
 */
app.post('/api/initiate-conversation', async (req, res) => {
  try {
    const { phoneNumber, propertyId, message } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // This endpoint generates a WhatsApp link for the user to initiate contact
    // The actual conversation will be handled through the webhook

    const initialMessage = message || 'Olá! Gostaria de informações sobre os imóveis.';
    const encodedMessage = encodeURIComponent(initialMessage);

    // Create WhatsApp link with pre-filled message
    const whatsappLink = `https://wa.me/5511973360980?text=${encodedMessage}`;

    // If propertyId is provided, we'll store it in the context when they send the first message
    res.json({
      success: true,
      whatsappLink: whatsappLink,
      message: 'WhatsApp link generated successfully'
    });
  } catch (error) {
    console.error('Error initiating conversation:', error);
    res.status(500).json({ error: 'Failed to initiate conversation' });
  }
});

/**
 * API endpoint to get all active conversations
 */
app.get('/api/conversations', async (req, res) => {
  try {
    const { getAllConversations } = await import('./sdr-agent.js');
    const conversations = getAllConversations();
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * API endpoint to get conversation history (for debugging/monitoring)
 */
app.get('/api/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { getConversation } = await import('./sdr-agent.js');
    const conversation = getConversation(phoneNumber);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      phoneNumber,
      conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * API endpoint to manually send a message (for testing)
 */
app.post('/api/send-message', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    await sendWhatsAppMessage(phoneNumber, message);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * API endpoint to test AI response without sending WhatsApp
 */
app.post('/api/test-ai', async (req, res) => {
  try {
    const { phoneNumber, message, propertyId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await processMessage(phoneNumber, message, propertyId);

    res.json({
      success: true,
      response: result.response,
      context: {
        historyLength: result.context.history.length,
        propertyId: result.context.propertyId
      }
    });
  } catch (error) {
    console.error('Error testing AI:', error);
    res.status(500).json({ error: 'Failed to test AI' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`SDR Agent Server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`Test AI: http://localhost:${PORT}/api/test-ai`);
});

export default app;
