/**
 * Typebot Service - Manages leads from Typebot
 * Stores and retrieves Typebot lead information for the SDR agent
 */

import { getRedisClient, isRedisConnected } from './redis-client.js';

// Fallback storage for when Redis is not available
const typebotLeadsCache = new Map();

/**
 * Save Typebot lead information
 */
export async function saveTypebotLead(phoneNumber, leadInfo) {
  try {
    const data = {
      phoneNumber,
      leadInfo,
      receivedAt: new Date().toISOString(),
      processed: false
    };

    // Try to save to Redis
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const key = `typebot:lead:${phoneNumber}`;

      await redis.set(key, JSON.stringify(data));
      // Expire after 30 days if not processed
      await redis.expire(key, 30 * 24 * 60 * 60);

      console.log(`Typebot lead saved to Redis: ${phoneNumber}`);
    } else {
      // Fallback to memory
      typebotLeadsCache.set(phoneNumber, data);
      console.log(`Typebot lead saved to memory (Redis unavailable): ${phoneNumber}`);
    }

    return { success: true, phoneNumber };
  } catch (error) {
    console.error('Error saving Typebot lead:', error);
    // Try fallback
    typebotLeadsCache.set(phoneNumber, {
      phoneNumber,
      leadInfo,
      receivedAt: new Date().toISOString(),
      processed: false
    });
    throw error;
  }
}

/**
 * Get Typebot lead information
 */
export async function getTypebotLead(phoneNumber) {
  try {
    // Try to get from Redis
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const key = `typebot:lead:${phoneNumber}`;

      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
    }

    // Fallback to memory
    return typebotLeadsCache.get(phoneNumber) || null;
  } catch (error) {
    console.error('Error getting Typebot lead:', error);
    return typebotLeadsCache.get(phoneNumber) || null;
  }
}

/**
 * Check if customer came from Typebot
 */
export async function isTypebotLead(phoneNumber) {
  const lead = await getTypebotLead(phoneNumber);
  return lead !== null && !lead.processed;
}

/**
 * Mark Typebot lead as processed
 */
export async function markTypebotLeadAsProcessed(phoneNumber) {
  try {
    const lead = await getTypebotLead(phoneNumber);
    if (!lead) return;

    lead.processed = true;
    lead.processedAt = new Date().toISOString();

    // Update in Redis
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const key = `typebot:lead:${phoneNumber}`;

      await redis.set(key, JSON.stringify(lead));
      // Keep for 90 days after processing
      await redis.expire(key, 90 * 24 * 60 * 60);
    }

    // Update in memory
    typebotLeadsCache.set(phoneNumber, lead);

    console.log(`Marked Typebot lead as processed: ${phoneNumber}`);
  } catch (error) {
    console.error('Error marking Typebot lead as processed:', error);
  }
}

/**
 * Get all unprocessed Typebot leads
 */
export async function getUnprocessedTypebotLeads() {
  try {
    const leads = [];

    // Try to get from Redis
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const keys = await redis.keys('typebot:lead:*');

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const lead = JSON.parse(data);
          if (!lead.processed) {
            leads.push(lead);
          }
        }
      }
    } else {
      // Get from memory
      for (const lead of typebotLeadsCache.values()) {
        if (!lead.processed) {
          leads.push(lead);
        }
      }
    }

    return leads;
  } catch (error) {
    console.error('Error getting unprocessed Typebot leads:', error);
    // Fallback to memory
    const leads = [];
    for (const lead of typebotLeadsCache.values()) {
      if (!lead.processed) {
        leads.push(lead);
      }
    }
    return leads;
  }
}

/**
 * Format Typebot lead info for AI context
 */
export function formatTypebotLeadForAI(leadInfo) {
  if (!leadInfo) return '';

  const parts = [];

  parts.push('INFORMAÇÕES DO LEAD (via Typebot):');

  if (leadInfo.name) {
    parts.push(`- Nome: ${leadInfo.name}`);
  }

  if (leadInfo.email) {
    parts.push(`- Email: ${leadInfo.email}`);
  }

  if (leadInfo.phone) {
    parts.push(`- Telefone: ${leadInfo.phone}`);
  }

  if (leadInfo.interest) {
    parts.push(`- Interesse: ${leadInfo.interest}`);
  }

  if (leadInfo.budget) {
    parts.push(`- Orçamento: ${leadInfo.budget}`);
  }

  if (leadInfo.location) {
    parts.push(`- Localização preferida: ${leadInfo.location}`);
  }

  if (leadInfo.message) {
    parts.push(`- Mensagem: ${leadInfo.message}`);
  }

  // Add custom answers
  if (leadInfo.answers && Object.keys(leadInfo.answers).length > 0) {
    parts.push('\nRESPOSTAS DO FORMULÁRIO:');
    for (const [key, value] of Object.entries(leadInfo.answers)) {
      if (value && !['phone', 'telefone', 'email', 'name', 'nome'].some(k => key.toLowerCase().includes(k))) {
        parts.push(`- ${key}: ${value}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Delete Typebot lead
 */
export async function deleteTypebotLead(phoneNumber) {
  try {
    // Delete from Redis
    if (isRedisConnected()) {
      const redis = getRedisClient();
      const key = `typebot:lead:${phoneNumber}`;
      await redis.del(key);
    }

    // Delete from memory
    typebotLeadsCache.delete(phoneNumber);

    console.log(`Deleted Typebot lead: ${phoneNumber}`);
  } catch (error) {
    console.error('Error deleting Typebot lead:', error);
  }
}
