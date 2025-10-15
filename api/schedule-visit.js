/**
 * Vercel Serverless Function - Schedule Property Visit
 * Endpoint para agendar visita manualmente (teste)
 */

import { schedulePropertyVisit } from '../server/scheduling-service.js';
import { getAllProperties } from '../server/sdr-agent.js';

export default async function handler(req, res) {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerPhone, customerName, customerEmail, propertyId } = req.body;

    if (!customerPhone || !customerName || !propertyId) {
      return res.status(400).json({
        error: 'Customer phone, name, and property ID are required'
      });
    }

    // Buscar dados do imóvel
    const properties = await getAllProperties();
    const property = properties.find(p => p.id === parseInt(propertyId));

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Agendar visita
    const result = await schedulePropertyVisit(
      customerPhone,
      customerName,
      customerEmail || '',
      property
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        schedulingLink: result.schedulingLink,
        propertyTitle: result.propertyTitle,
        customerName: result.customerName
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to schedule visit'
      });
    }
  } catch (error) {
    console.error('Error scheduling visit:', error);
    return res.status(500).json({ error: 'Failed to schedule visit' });
  }
}
