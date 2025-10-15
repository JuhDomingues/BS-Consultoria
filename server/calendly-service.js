/**
 * Calendly Integration Service
 * Handles scheduling appointments for property visits
 * Features:
 * - Create scheduling links with property details
 * - Webhook handling for event notifications
 * - Send confirmations to both customer and realtor
 * - Schedule reminders 1 hour before visits
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_API_URL = 'https://api.calendly.com';
const CALENDLY_EVENT_TYPE_UUID = process.env.CALENDLY_EVENT_TYPE_UUID;
const CALENDLY_USER_URI = process.env.CALENDLY_USER_URI;
const REALTOR_PHONE = process.env.REALTOR_PHONE || '5511981598027'; // Corretor responsável

/**
 * Get Calendly scheduling link with property details
 * This creates a single-use scheduling link for a specific property visit
 */
async function createSchedulingLink(customerName, customerEmail, customerPhone, propertyId, propertyTitle, propertyAddress, propertyLink) {
  try {
    // For basic Calendly accounts, we'll use the standard event type link
    // with query parameters to pre-fill information

    const baseLink = process.env.CALENDLY_PUBLIC_URL || `https://calendly.com/bs-consultoria`;

    const params = new URLSearchParams({
      name: customerName,
      email: customerEmail || `${customerPhone.replace(/\D/g, '')}@cliente.temp`,
      a1: customerPhone, // Custom question 1: Phone
      a2: propertyId ? `Imóvel ID: ${propertyId} - ${propertyTitle}` : 'Consulta Geral', // Custom question 2: Property
      a3: propertyAddress || '', // Custom question 3: Address
      a4: propertyLink || '', // Custom question 4: Property URL
    });

    const schedulingLink = `${baseLink}?${params.toString()}`;

    return {
      link: schedulingLink,
      success: true,
      propertyId,
      customerPhone
    };
  } catch (error) {
    console.error('Error creating Calendly link:', error);
    return {
      link: process.env.CALENDLY_PUBLIC_URL || 'https://calendly.com/bs-consultoria',
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a single-use scheduling link with Calendly API (Premium feature)
 * This requires Calendly Premium/Pro account
 */
async function createSingleUseLink(customerName, customerEmail, propertyInfo) {
  if (!CALENDLY_API_KEY || !CALENDLY_EVENT_TYPE_UUID) {
    console.warn('Calendly API key or event type UUID not configured. Using standard link.');
    return createSchedulingLink(customerName, customerEmail, '', propertyInfo.id, propertyInfo.title);
  }

  try {
    const response = await fetch(`${CALENDLY_API_URL}/scheduling_links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CALENDLY_API_KEY}`
      },
      body: JSON.stringify({
        max_event_count: 1,
        owner: CALENDLY_USER_URI,
        owner_type: 'EventType',
        event_type: CALENDLY_EVENT_TYPE_UUID,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Calendly API error:', errorData);
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      link: data.resource.booking_url,
      success: true
    };
  } catch (error) {
    console.error('Error creating single-use Calendly link:', error);
    // Fallback to standard link
    return createSchedulingLink(customerName, customerEmail, '', propertyInfo.id, propertyInfo.title);
  }
}

/**
 * Get upcoming scheduled events (for monitoring)
 */
async function getUpcomingEvents() {
  if (!CALENDLY_API_KEY || !CALENDLY_USER_URI) {
    console.warn('Calendly API not fully configured');
    return [];
  }

  try {
    const response = await fetch(`${CALENDLY_API_URL}/scheduled_events?user=${CALENDLY_USER_URI}&status=active`, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();
    return data.collection || [];
  } catch (error) {
    console.error('Error fetching Calendly events:', error);
    return [];
  }
}

/**
 * Format scheduling message for WhatsApp
 */
function formatSchedulingMessage(customerName, propertyTitle, schedulingLink) {
  return `Ótimo, ${customerName}! 🎉

Para agendar sua visita ao *${propertyTitle}*, por favor acesse o link abaixo e escolha o melhor horário:

🗓️ ${schedulingLink}

Você receberá uma confirmação por e-mail com todos os detalhes da visita.

Caso tenha alguma dúvida, estou aqui para ajudar! 😊`;
}

/**
 * Get event invitee information
 */
async function getEventInvitees(eventUri) {
  if (!CALENDLY_API_KEY) {
    console.warn('Calendly API not configured');
    return [];
  }

  try {
    const response = await fetch(`${eventUri}/invitees`, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();
    return data.collection || [];
  } catch (error) {
    console.error('Error fetching event invitees:', error);
    return [];
  }
}

/**
 * Get event details by URI
 */
async function getEventDetails(eventUri) {
  if (!CALENDLY_API_KEY) {
    console.warn('Calendly API not configured');
    return null;
  }

  try {
    const response = await fetch(eventUri, {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Calendly API error: ${response.status}`);
    }

    const data = await response.json();
    return data.resource;
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
}

/**
 * Parse property information from Calendly event
 */
function parsePropertyInfoFromEvent(eventAnswers) {
  const propertyInfo = {
    id: null,
    title: null,
    address: null,
    link: null,
    phone: null
  };

  // Calendly stores custom question answers in the questions_and_answers array
  if (eventAnswers && Array.isArray(eventAnswers)) {
    eventAnswers.forEach(qa => {
      const answer = qa.answer || '';

      // a1 = Phone
      if (qa.question.includes('Phone') || qa.question.includes('Telefone')) {
        propertyInfo.phone = answer;
      }

      // a2 = Property ID and Title
      if (answer.includes('Imóvel ID:')) {
        const match = answer.match(/Imóvel ID: (\d+) - (.+)/);
        if (match) {
          propertyInfo.id = match[1];
          propertyInfo.title = match[2];
        }
      }

      // a3 = Address
      if (qa.question.includes('Endereço') || qa.question.includes('Address')) {
        propertyInfo.address = answer;
      }

      // a4 = Property Link
      if (answer.startsWith('http')) {
        propertyInfo.link = answer;
      }
    });
  }

  return propertyInfo;
}

/**
 * Format confirmation message for customer
 */
function formatCustomerConfirmation(customerName, propertyTitle, propertyAddress, eventTime) {
  const date = new Date(eventTime);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `✅ *VISITA CONFIRMADA!*

Olá ${customerName}! Sua visita foi agendada com sucesso! 🎉

📍 *Imóvel:* ${propertyTitle}
📌 *Endereço:* ${propertyAddress}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}

*O que levar:*
• Documento com foto (RG ou CNH)
• Comprovante de renda (se for solicitar financiamento)

Você receberá um lembrete 1 hora antes da visita.

Qualquer dúvida, estou à disposição! 😊`;
}

/**
 * Format notification message for realtor
 */
function formatRealtorNotification(customerName, customerPhone, propertyTitle, propertyAddress, propertyLink, eventTime) {
  const date = new Date(eventTime);
  const formattedDate = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `🔔 *NOVA VISITA AGENDADA*

*Cliente:* ${customerName}
*Telefone:* ${customerPhone}

📍 *Imóvel:* ${propertyTitle}
📌 *Endereço:* ${propertyAddress}
${propertyLink ? `🔗 *Link:* ${propertyLink}` : ''}

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}

⚠️ Você receberá um lembrete 1 hora antes da visita.`;
}

/**
 * Format reminder message (sent 1 hour before visit)
 */
function formatReminderMessage(customerName, propertyTitle, propertyAddress, eventTime) {
  const date = new Date(eventTime);
  const formattedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `⏰ *LEMBRETE DE VISITA*

Olá ${customerName}! Sua visita está chegando!

📍 *Imóvel:* ${propertyTitle}
📌 *Endereço:* ${propertyAddress}
⏰ *Horário:* ${formattedTime} (daqui a 1 hora)

Não se esqueça de levar:
• Documento com foto (RG ou CNH)
• Comprovante de renda (se for solicitar financiamento)

Nos vemos em breve! 🏡`;
}

/**
 * Format realtor reminder message
 */
function formatRealtorReminder(customerName, customerPhone, propertyTitle, propertyAddress, eventTime) {
  const date = new Date(eventTime);
  const formattedTime = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `⏰ *LEMBRETE - VISITA EM 1 HORA*

*Cliente:* ${customerName}
*Telefone:* ${customerPhone}

📍 *Imóvel:* ${propertyTitle}
📌 *Endereço:* ${propertyAddress}
⏰ *Horário:* ${formattedTime}

Prepare-se para a visita! 🏡`;
}

export {
  createSchedulingLink,
  createSingleUseLink,
  getUpcomingEvents,
  getEventInvitees,
  getEventDetails,
  parsePropertyInfoFromEvent,
  formatSchedulingMessage,
  formatCustomerConfirmation,
  formatRealtorNotification,
  formatReminderMessage,
  formatRealtorReminder,
  REALTOR_PHONE
};
