/**
 * Image Upload API - Vercel Serverless Function
 * Handles image uploads for property listings
 */

import { put } from '@vercel/blob';
import multiparty from 'multiparty';

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Parse multipart form data
 */
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);

    if (!files.file || !files.file[0]) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = files.file[0];
    const propertyId = fields.propertyId ? fields.propertyId[0] : 'temp';
    const fileName = fields.fileName ? fields.fileName[0] : file.originalFilename;

    // Check if in production (Vercel) or development (local)
    const isProduction = process.env.VERCEL === '1';

    if (isProduction) {
      // Production: Use Vercel Blob Storage
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN not configured');
        return res.status(500).json({
          error: 'Storage não configurado. Configure BLOB_READ_WRITE_TOKEN nas variáveis de ambiente.'
        });
      }

      // Read file buffer
      const fs = await import('fs');
      const fileBuffer = await fs.promises.readFile(file.path);

      // Upload to Vercel Blob
      const blob = await put(`imoveis/${propertyId}/${fileName}`, fileBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Clean up temporary file
      await fs.promises.unlink(file.path);

      return res.status(200).json({
        success: true,
        url: blob.url,
        message: 'Imagem enviada com sucesso!'
      });
    } else {
      // Development: Use local filesystem
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      const finalDir = path.join(__dirname, '..', 'public', 'imoveis', propertyId);
      const finalFilePath = path.join(finalDir, fileName);

      // Create directory if it doesn't exist
      if (!fs.existsSync(finalDir)) {
        await fs.promises.mkdir(finalDir, { recursive: true });
      }

      // Move file from temp to final destination
      await fs.promises.rename(file.path, finalFilePath);

      const url = `/imoveis/${propertyId}/${fileName}`;

      return res.status(200).json({
        success: true,
        url: url,
        message: 'Imagem enviada com sucesso!'
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Erro ao fazer upload da imagem',
      details: error.message
    });
  }
}
