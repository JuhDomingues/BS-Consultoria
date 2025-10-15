/**
 * Scheduling Service
 * Orchestrates the complete scheduling workflow:
 * - Creates Calendly appointments
 * - Sends confirmation messages
 * - Manages reminders
 * - Handles notifications
 */

import {
  createSchedulingLink,
  getEventDetails,
  getEventInvitees,
  parsePropertyInfoFromEvent,
  formatCustomerConfirmation,
  formatRealtorNotification,
  formatReminderMessage,
  formatRealtorReminder,
  REALTOR_PHONE
} from './calendly-service.js';
import { sendWhatsAppMessage } from './sdr-agent.js';
import {
  setConversationContext,
  getConversationContext,
  setScheduledReminder,
  getScheduledReminders,
  deleteScheduledReminder
} from './redis-client.js';

/**
 * In-memory fallback for scheduled reminders if Redis is unavailable
 */
const scheduledReminders = new Map();

/**
 * Schedule a property visit via Calendly
 */
async function schedulePropertyVisit(customerPhone, customerName, customerEmail, property) {
  try {
    // Extract property details
    const propertyTitle = property['Title'] || property['Título'] || property.title || 'Imóvel';
    const propertyId = property.id;
    const propertyAddress = `${property['neighborhood'] || property['Bairro'] || ''}, ${property['city'] || property['Cidade'] || ''}`.trim();

    // Generate property link
    const baseUrl = process.env.SITE_BASE_URL || 'https://bs-consultoria.vercel.app';
    const propertyLink = `${baseUrl}/imovel/${propertyId}`;

    // Create Calendly scheduling link with all property details
    const schedulingResult = await createSchedulingLink(
      customerName,
      customerEmail,
      customerPhone,
      propertyId,
      propertyTitle,
      propertyAddress,
      propertyLink
    );

    if (!schedulingResult.success) {
      throw new Error('Failed to create scheduling link');
    }

    // Store scheduling info in conversation context
    const context = await getConversationContext(customerPhone) || {
      history: [],
      schedulingInProgress: true,
      schedulingData: {
        propertyId,
        propertyTitle,
        propertyAddress,
        propertyLink,
        schedulingLink: schedulingResult.link,
        customerName,
        customerEmail,
        createdAt: new Date()
      }
    };

    context.schedulingInProgress = true;
    context.schedulingData = {
      propertyId,
      propertyTitle,
      propertyAddress,
      propertyLink,
      schedulingLink: schedulingResult.link,
      customerName,
      customerEmail,
      createdAt: new Date()
    };

    await setConversationContext(customerPhone, context);

    return {
      success: true,
      schedulingLink: schedulingResult.link,
      propertyTitle,
      customerName
    };
  } catch (error) {
    console.error('Error scheduling property visit:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process Calendly webhook event
 * Called when a customer books, cancels, or reschedules an appointment
 */
async function handleCalendlyWebhook(webhookEvent) {
  try {
    const { event, payload } = webhookEvent;

    console.log('Processing Calendly webhook:', event);

    switch (event) {
      case 'invitee.created':
        await handleInviteeCreated(payload);
        break;

      case 'invitee.canceled':
        await handleInviteeCanceled(payload);
        break;

      default:
        console.log('Unhandled Calendly event:', event);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling Calendly webhook:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle invitee.created event (customer booked an appointment)
 */
async function handleInviteeCreated(payload) {
  try {
    const eventUri = payload.event;
    const inviteeUri = payload.invitee;

    // Get event details
    const eventDetails = await getEventDetails(eventUri);
    if (!eventDetails) {
      console.error('Failed to fetch event details');
      return;
    }

    // Get invitee details
    const invitees = await getEventInvitees(eventUri);
    if (!invitees || invitees.length === 0) {
      console.error('Failed to fetch invitee details');
      return;
    }

    const invitee = invitees[0];
    const customerName = invitee.name;
    const customerEmail = invitee.email;
    const eventTime = eventDetails.start_time;

    // Parse property info from custom questions
    const propertyInfo = parsePropertyInfoFromEvent(invitee.questions_and_answers);
    const customerPhone = propertyInfo.phone;

    if (!customerPhone) {
      console.error('Customer phone not found in event data');
      return;
    }

    console.log('Visit booked:', {
      customer: customerName,
      phone: customerPhone,
      property: propertyInfo.title,
      time: eventTime
    });

    // Send confirmation to customer
    const customerConfirmation = formatCustomerConfirmation(
      customerName,
      propertyInfo.title || 'Imóvel',
      propertyInfo.address || 'A definir',
      eventTime
    );
    await sendWhatsAppMessage(customerPhone, customerConfirmation);
    console.log('Confirmation sent to customer:', customerPhone);

    // Send notification to realtor
    const realtorNotification = formatRealtorNotification(
      customerName,
      customerPhone,
      propertyInfo.title || 'Imóvel',
      propertyInfo.address || 'A definir',
      propertyInfo.link || '',
      eventTime
    );
    await sendWhatsAppMessage(REALTOR_PHONE, realtorNotification);
    console.log('Notification sent to realtor:', REALTOR_PHONE);

    // Schedule reminder 1 hour before the visit
    await scheduleReminder(eventTime, {
      customerName,
      customerPhone,
      propertyTitle: propertyInfo.title || 'Imóvel',
      propertyAddress: propertyInfo.address || 'A definir',
      eventUri: eventUri,
      inviteeUri: inviteeUri
    });

    // Update conversation context
    const context = await getConversationContext(customerPhone) || { history: [] };
    context.schedulingInProgress = false;
    context.lastScheduledVisit = {
      propertyId: propertyInfo.id,
      propertyTitle: propertyInfo.title,
      eventTime: eventTime,
      eventUri: eventUri,
      confirmedAt: new Date()
    };
    await setConversationContext(customerPhone, context);

  } catch (error) {
    console.error('Error handling invitee created:', error);
  }
}

/**
 * Handle invitee.canceled event (customer canceled appointment)
 */
async function handleInviteeCanceled(payload) {
  try {
    const eventUri = payload.event;
    const inviteeUri = payload.invitee;

    // Get event details to extract customer info
    const eventDetails = await getEventDetails(eventUri);
    if (!eventDetails) {
      console.error('Failed to fetch event details for cancellation');
      return;
    }

    const invitees = await getEventInvitees(eventUri);
    if (!invitees || invitees.length === 0) {
      console.error('Failed to fetch invitee details for cancellation');
      return;
    }

    const invitee = invitees[0];
    const propertyInfo = parsePropertyInfoFromEvent(invitee.questions_and_answers);
    const customerPhone = propertyInfo.phone;

    if (!customerPhone) {
      console.error('Customer phone not found in cancellation event');
      return;
    }

    console.log('Visit canceled:', {
      customer: invitee.name,
      phone: customerPhone,
      property: propertyInfo.title
    });

    // Cancel scheduled reminder
    await cancelReminder(eventUri);

    // Send cancellation confirmation to customer
    const cancellationMessage = `Sua visita ao *${propertyInfo.title || 'imóvel'}* foi cancelada com sucesso.

Se mudou de ideia ou quer remarcar, é só me avisar! Estou aqui para ajudar. 😊`;

    await sendWhatsAppMessage(customerPhone, cancellationMessage);

    // Notify realtor
    const realtorCancellation = `❌ *VISITA CANCELADA*

*Cliente:* ${invitee.name}
*Telefone:* ${customerPhone}
*Imóvel:* ${propertyInfo.title || 'N/A'}

O cliente cancelou a visita agendada.`;

    await sendWhatsAppMessage(REALTOR_PHONE, realtorCancellation);

  } catch (error) {
    console.error('Error handling invitee canceled:', error);
  }
}

/**
 * Schedule a reminder to be sent 1 hour before the visit
 */
async function scheduleReminder(eventTime, reminderData) {
  try {
    const eventDate = new Date(eventTime);
    const reminderTime = new Date(eventDate.getTime() - 60 * 60 * 1000); // 1 hour before
    const now = new Date();

    // Only schedule if reminder time is in the future
    if (reminderTime <= now) {
      console.log('Reminder time is in the past, skipping');
      return;
    }

    const delay = reminderTime.getTime() - now.getTime();

    console.log('Scheduling reminder:', {
      eventTime: eventDate.toISOString(),
      reminderTime: reminderTime.toISOString(),
      delayMinutes: Math.floor(delay / 1000 / 60)
    });

    // Store reminder in Redis
    const reminder = {
      ...reminderData,
      eventTime: eventTime,
      reminderTime: reminderTime.toISOString(),
      scheduledAt: new Date().toISOString()
    };

    const saved = await setScheduledReminder(reminderData.eventUri, reminder);
    if (!saved) {
      // Fallback to in-memory storage
      scheduledReminders.set(reminderData.eventUri, reminder);
    }

    // Schedule the actual reminder to be sent
    setTimeout(async () => {
      await sendReminders(reminderData);
    }, delay);

    console.log(`Reminder scheduled for ${reminderTime.toLocaleString('pt-BR')}`);
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}

/**
 * Send reminder messages 1 hour before the visit
 */
async function sendReminders(reminderData) {
  try {
    const {
      customerName,
      customerPhone,
      propertyTitle,
      propertyAddress,
      eventUri
    } = reminderData;

    console.log('Sending reminders for visit:', {
      customer: customerName,
      property: propertyTitle
    });

    // Get the actual event time from Redis or memory
    let reminder = await getScheduledReminders(eventUri);
    if (!reminder) {
      reminder = scheduledReminders.get(eventUri);
    }

    if (!reminder) {
      console.error('Reminder data not found');
      return;
    }

    const eventTime = reminder.eventTime;

    // Send reminder to customer
    const customerReminder = formatReminderMessage(
      customerName,
      propertyTitle,
      propertyAddress,
      eventTime
    );
    await sendWhatsAppMessage(customerPhone, customerReminder);
    console.log('Reminder sent to customer:', customerPhone);

    // Send reminder to realtor
    const realtorReminder = formatRealtorReminder(
      customerName,
      customerPhone,
      propertyTitle,
      propertyAddress,
      eventTime
    );
    await sendWhatsAppMessage(REALTOR_PHONE, realtorReminder);
    console.log('Reminder sent to realtor:', REALTOR_PHONE);

    // Clean up reminder from storage
    await deleteScheduledReminder(eventUri);
    scheduledReminders.delete(eventUri);

  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

/**
 * Cancel a scheduled reminder
 */
async function cancelReminder(eventUri) {
  try {
    console.log('Canceling reminder for event:', eventUri);

    // Delete from Redis
    await deleteScheduledReminder(eventUri);

    // Delete from in-memory storage
    scheduledReminders.delete(eventUri);

    console.log('Reminder canceled successfully');
  } catch (error) {
    console.error('Error canceling reminder:', error);
  }
}

/**
 * Get all scheduled reminders (for monitoring)
 */
async function getAllScheduledReminders() {
  const reminders = [];

  // Get from Redis
  const redisReminders = await getScheduledReminders();
  if (redisReminders) {
    reminders.push(...redisReminders);
  }

  // Get from in-memory storage
  for (const [eventUri, reminder] of scheduledReminders.entries()) {
    reminders.push({ eventUri, ...reminder });
  }

  return reminders;
}

export {
  schedulePropertyVisit,
  handleCalendlyWebhook,
  scheduleReminder,
  sendReminders,
  cancelReminder,
  getAllScheduledReminders
};
