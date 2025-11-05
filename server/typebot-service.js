/**
 * Typebot Service - Manages leads from Typebot
 * Stores and retrieves Typebot lead information for the SDR agent
 */

import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Fallback storage for when Redis is not available
const typebotLeadsCache = new Map();

// Redis client
let redisClient = null;
let isConnected = false;

// Initialize Redis
try {
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
    isConnected = true;
  }
} catch (error) {
  console.error('Typebot Service: Failed to initialize Redis:', error);
  isConnected = false;
}

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
    if (isConnected && redisClient) {
      const key = `typebot:lead:${phoneNumber}`;

      await redisClient.set(key, JSON.stringify(data));
      // Expire after 30 days if not processed
      await redisClient.expire(key, 30 * 24 * 60 * 60);

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
    if (isConnected && redisClient) {
      const key = `typebot:lead:${phoneNumber}`;

      const data = await redisClient.get(key);
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed;
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
    if (isConnected && redisClient) {
      const key = `typebot:lead:${phoneNumber}`;

      await redisClient.set(key, JSON.stringify(lead));
      // Keep for 90 days after processing
      await redisClient.expire(key, 90 * 24 * 60 * 60);
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
    if (isConnected && redisClient) {
      const keys = await redisClient.keys('typebot:lead:*');

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const lead = typeof data === 'string' ? JSON.parse(data) : data;
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

  // Informações básicas
  if (leadInfo.name) {
    parts.push(`- Nome: ${leadInfo.name}`);
  }

  if (leadInfo.email) {
    parts.push(`- Email: ${leadInfo.email}`);
  }

  if (leadInfo.phone) {
    parts.push(`- Telefone: ${leadInfo.phone}`);
  }

  // Informações de preferência do cliente
  if (leadInfo.tipoTransacao) {
    parts.push(`- Procura imóvel para: ${leadInfo.tipoTransacao}`);
  }

  if (leadInfo.tipoImovel) {
    parts.push(`- Tipo de imóvel: ${leadInfo.tipoImovel}`);
  }

  // Orçamento (diferente para compra ou locação)
  if (leadInfo.budgetCompra) {
    parts.push(`- Faixa de valor para compra: ${leadInfo.budgetCompra}`);
  }

  if (leadInfo.budgetLocacao) {
    parts.push(`- Faixa de valor para locação/aluguel: ${leadInfo.budgetLocacao}`);
  }

  if (leadInfo.localizacao) {
    parts.push(`- Localização/bairro preferido: ${leadInfo.localizacao}`);
  }

  // Informações de urgência e financiamento
  if (leadInfo.prazo) {
    parts.push(`- Prazo para mudança/fechamento: ${leadInfo.prazo}`);
  }

  if (leadInfo.financiamento) {
    parts.push(`- Situação financeira: ${leadInfo.financiamento}`);
  }

  if (leadInfo.message) {
    parts.push(`- Mensagem adicional: ${leadInfo.message}`);
  }

  // Add custom answers (fallback para campos não mapeados)
  if (leadInfo.answers && Object.keys(leadInfo.answers).length > 0) {
    const mappedFields = ['phone', 'telefone', 'email', 'name', 'nome', 'tipotransacao', 'tipoimovel',
                          'budgetcompra', 'budgetlocacao', 'localizacao', 'prazo', 'financiamento'];

    const unmappedAnswers = Object.entries(leadInfo.answers).filter(([key, value]) =>
      value && !mappedFields.some(field => key.toLowerCase().includes(field))
    );

    if (unmappedAnswers.length > 0) {
      parts.push('\nOUTRAS RESPOSTAS:');
      for (const [key, value] of unmappedAnswers) {
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
    if (isConnected && redisClient) {
      const key = `typebot:lead:${phoneNumber}`;
      await redisClient.del(key);
    }

    // Delete from memory
    typebotLeadsCache.delete(phoneNumber);

    console.log(`Deleted Typebot lead: ${phoneNumber}`);
  } catch (error) {
    console.error('Error deleting Typebot lead:', error);
  }
}
