/**
 * Vercel Serverless Function - Get Scheduled Reminders
 */

import { getAllScheduledReminders } from '../server/scheduling-service.js';

export default async function handler(req, res) {
  try {
    const reminders = await getAllScheduledReminders();

    return res.status(200).json({
      success: true,
      count: reminders.length,
      reminders: reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return res.status(500).json({ error: 'Failed to fetch reminders' });
  }
}
