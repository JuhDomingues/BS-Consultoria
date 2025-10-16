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
    console.log('Upload request received');
    console.log('Environment:', {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      HAS_BLOB_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN
    });

    // Parse form data
    const { fields, files } = await parseForm(req);

    if (!files.file || !files.file[0]) {
      console.error('No file in request');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = files.file[0];
    const propertyId = fields.propertyId ? fields.propertyId[0] : 'temp';
    const fileName = fields.fileName ? fields.fileName[0] : file.originalFilename;

    console.log('File details:', {
      originalName: file.originalFilename,
      size: file.size,
      propertyId,
      fileName
    });

    // Check if in production (Vercel) or development (local)
    const isProduction = process.env.VERCEL === '1';

    if (isProduction) {
      // Production: Use Vercel Blob Storage
      console.log('Running in production mode - using Vercel Blob');

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN not configured');
        return res.status(500).json({
          error: 'Storage não configurado. Configure BLOB_READ_WRITE_TOKEN nas variáveis de ambiente.'
        });
      }

      try {
        // Read file buffer
        console.log('Reading file from temp path:', file.path);
        const fs = await import('fs');
        const fileBuffer = await fs.promises.readFile(file.path);
        console.log('File read successfully, size:', fileBuffer.length);

        // Upload to Vercel Blob
        const blobPath = `imoveis/${propertyId}/${fileName}`;
        console.log('Uploading to Vercel Blob:', blobPath);

        const blob = await put(blobPath, fileBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        console.log('Upload successful:', blob.url);

        // Clean up temporary file
        try {
          await fs.promises.unlink(file.path);
          console.log('Temp file cleaned up');
        } catch (cleanupError) {
          console.warn('Could not clean up temp file:', cleanupError.message);
        }

        return res.status(200).json({
          success: true,
          url: blob.url,
          message: 'Imagem enviada com sucesso!'
        });
      } catch (blobError) {
        console.error('Vercel Blob upload error:', blobError);
        throw blobError;
      }
    } else {
      // Development: This should not run on Vercel, but adding fallback
      console.log('Running in development mode - local upload not supported here');
      return res.status(500).json({
        error: 'Ambiente de desenvolvimento não suportado em produção',
        details: 'Configure BLOB_READ_WRITE_TOKEN para usar Vercel Blob Storage'
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
