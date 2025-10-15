/**
 * Vercel Serverless Function - Health Check
 */

export default async function handler(req, res) {
  return res.status(200).json({
    status: 'ok',
    service: 'SDR Agent',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
}
