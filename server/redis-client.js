/**
 * Redis Client - Persistent storage for conversation history and customer data
 * Uses Upstash Redis REST API for serverless compatibility
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

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection (Upstash REST API)
 */
async function initRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis credentials not configured');
    }

    redisClient = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });

    // Test connection
    await redisClient.ping();

    console.log('Redis: Connected to Upstash successfully');
    isConnected = true;

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Upstash Redis:', error);
    isConnected = false;
    throw error;
  }
}

/**
 * Get customer history from Redis
 */
async function getCustomerHistory(phoneNumber) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot get customer history');
      return null;
    }

    const key = `customer:${phoneNumber}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    // Upstash REST API already returns parsed objects
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Convert date strings back to Date objects
    return {
      firstContact: new Date(parsed.firstContact),
      lastContact: new Date(parsed.lastContact),
      totalMessages: parsed.totalMessages
    };
  } catch (error) {
    console.error('Error getting customer history from Redis:', error);
    return null;
  }
}

/**
 * Set customer history in Redis
 */
async function setCustomerHistory(phoneNumber, history) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot set customer history');
      return false;
    }

    const key = `customer:${phoneNumber}`;
    await redisClient.set(key, JSON.stringify(history));
    // No expiration - customer history is permanent
    return true;
  } catch (error) {
    console.error('Error setting customer history in Redis:', error);
    return false;
  }
}

/**
 * Get conversation context from Redis
 */
async function getConversationContext(phoneNumber) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot get conversation context');
      return null;
    }

    const key = `conversation:${phoneNumber}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    // Upstash REST API already returns parsed objects
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    // Convert date strings back to Date objects
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt)
    };
  } catch (error) {
    console.error('Error getting conversation context from Redis:', error);
    return null;
  }
}

/**
 * Set conversation context in Redis
 */
async function setConversationContext(phoneNumber, context) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot set conversation context');
      return false;
    }

    const key = `conversation:${phoneNumber}`;
    await redisClient.set(key, JSON.stringify(context));
    // Expire after 6 hours (21600 seconds)
    await redisClient.expire(key, 21600);
    return true;
  } catch (error) {
    console.error('Error setting conversation context in Redis:', error);
    return false;
  }
}

/**
 * Delete conversation context from Redis
 */
async function deleteConversationContext(phoneNumber) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot delete conversation context');
      return false;
    }

    const key = `conversation:${phoneNumber}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting conversation context from Redis:', error);
    return false;
  }
}

/**
 * Get all customer phone numbers
 */
async function getAllCustomers() {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot get all customers');
      return [];
    }

    const keys = await redisClient.keys('customer:*');
    return keys.map(key => key.replace('customer:', ''));
  } catch (error) {
    console.error('Error getting all customers from Redis:', error);
    return [];
  }
}

/**
 * Get Redis statistics
 */
async function getRedisStats() {
  try {
    if (!isConnected) {
      return {
        connected: false,
        customers: 0,
        activeConversations: 0
      };
    }

    const customerKeys = await redisClient.keys('customer:*');
    const conversationKeys = await redisClient.keys('conversation:*');

    return {
      connected: true,
      customers: customerKeys.length,
      activeConversations: conversationKeys.length
    };
  } catch (error) {
    console.error('Error getting Redis stats:', error);
    return {
      connected: false,
      customers: 0,
      activeConversations: 0,
      error: error.message
    };
  }
}

/**
 * Set scheduled reminder in Redis
 */
async function setScheduledReminder(eventUri, reminder) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot set scheduled reminder');
      return false;
    }

    const key = `reminder:${eventUri}`;
    await redisClient.set(key, JSON.stringify(reminder));
    // Expire after 48 hours (in case reminder doesn't fire)
    await redisClient.expire(key, 172800);
    return true;
  } catch (error) {
    console.error('Error setting scheduled reminder in Redis:', error);
    return false;
  }
}

/**
 * Get scheduled reminder from Redis
 */
async function getScheduledReminders(eventUri = null) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot get scheduled reminders');
      return null;
    }

    if (eventUri) {
      // Get specific reminder
      const key = `reminder:${eventUri}`;
      const data = await redisClient.get(key);
      if (!data) return null;

      return typeof data === 'string' ? JSON.parse(data) : data;
    } else {
      // Get all reminders
      const keys = await redisClient.keys('reminder:*');
      const reminders = [];

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          reminders.push({
            eventUri: key.replace('reminder:', ''),
            ...parsed
          });
        }
      }

      return reminders;
    }
  } catch (error) {
    console.error('Error getting scheduled reminders from Redis:', error);
    return null;
  }
}

/**
 * Delete scheduled reminder from Redis
 */
async function deleteScheduledReminder(eventUri) {
  try {
    if (!isConnected) {
      console.warn('Redis not connected, cannot delete scheduled reminder');
      return false;
    }

    const key = `reminder:${eventUri}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting scheduled reminder from Redis:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  // Upstash REST API doesn't need explicit connection closing
  if (isConnected) {
    isConnected = false;
    console.log('Redis: Connection closed');
  }
}

export {
  initRedis,
  getCustomerHistory,
  setCustomerHistory,
  getConversationContext,
  setConversationContext,
  deleteConversationContext,
  setScheduledReminder,
  getScheduledReminders,
  deleteScheduledReminder,
  getAllCustomers,
  getRedisStats,
  closeRedis,
  isConnected
};
