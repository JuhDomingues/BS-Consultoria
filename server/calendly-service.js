/**
 * Calendly Integration Service
 * Handles scheduling appointments for property visits
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_API_URL = 'https://api.calendly.com';
const CALENDLY_EVENT_TYPE_UUID = process.env.CALENDLY_EVENT_TYPE_UUID;
const CALENDLY_USER_URI = process.env.CALENDLY_USER_URI;

/**
 * Get Calendly scheduling link
 * This creates a single-use scheduling link for a specific property visit
 */
async function createSchedulingLink(customerName, customerEmail, customerPhone, propertyId, propertyTitle) {
  try {
    // For basic Calendly accounts, we'll use the standard event type link
    // with query parameters to pre-fill information

    const baseLink = `https://calendly.com/bs-consultoria`;

    const params = new URLSearchParams({
      name: customerName,
      email: customerEmail || '',
      a1: customerPhone, // Custom question answer
      a2: propertyId ? `Imóvel ID: ${propertyId} - ${propertyTitle}` : 'Consulta Geral',
    });

    const schedulingLink = `${baseLink}?${params.toString()}`;

    return {
      link: schedulingLink,
      success: true
    };
  } catch (error) {
    console.error('Error creating Calendly link:', error);
    return {
      link: 'https://calendly.com/bs-consultoria',
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

export {
  createSchedulingLink,
  createSingleUseLink,
  getUpcomingEvents,
  formatSchedulingMessage
};
