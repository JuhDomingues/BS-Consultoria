/**
 * Clear Redis conversation context for a specific phone number
 * Usage: node clear-redis-conversation.js [phoneNumber]
 */

import { initRedis, deleteConversationContext, getConversationContext } from './server/redis-client.js';

const phoneNumber = process.argv[2] || '557981542009';

async function clearConversation() {
  console.log(`🧹 Clearing conversation context for ${phoneNumber}...`);

  try {
    // Initialize Redis
    await initRedis();

    // Check if conversation exists
    const existing = await getConversationContext(phoneNumber);
    if (existing) {
      console.log('📋 Found existing conversation context:');
      console.log('   - Created:', existing.createdAt);
      console.log('   - Stage:', existing.conversationStage);
      if (existing.customerPreferences) {
        console.log('   - Preferences:', JSON.stringify(existing.customerPreferences, null, 2));
      }
      if (existing.recommendedProperties) {
        console.log('   - Recommended properties:', existing.recommendedProperties.length);
      }
    } else {
      console.log('⚠️  No conversation context found for this number');
      return;
    }

    // Delete conversation context
    const deleted = await deleteConversationContext(phoneNumber);

    if (deleted) {
      console.log('✅ Conversation context cleared successfully!');
      console.log('   Next message from this number will start fresh');
    } else {
      console.log('❌ Failed to clear conversation context');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearConversation();
