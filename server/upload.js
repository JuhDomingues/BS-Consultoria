import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const app = express();
const PORT = 3001;

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // propertyId might not be available yet in multer, so we use a temp folder
    const tempPath = path.join(__dirname, '..', 'public', 'imoveis', 'temp');

    // Create directory if it doesn't exist
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Apenas imagens são permitidas!'), false);
    }
    cb(null, true);
  }
});

// Enable CORS
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:8080',
    'https://bsconsultoriadeimoveis.com.br',
    'https://www.bsconsultoriadeimoveis.com.br',
    'https://bs-consultoria.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(express.json({ limit: '50mb' }));

// Upload endpoint
app.post('/api/upload-image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const propertyId = req.body.propertyId || 'temp';
    const fileName = req.body.fileName || req.file.filename;

    // Move file from temp to final destination
    const tempFilePath = req.file.path;
    const finalDir = path.join(__dirname, '..', 'public', 'imoveis', propertyId);
    const finalFilePath = path.join(finalDir, fileName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(finalDir)) {
      fs.mkdirSync(finalDir, { recursive: true });
    }

    // Move file
    fs.renameSync(tempFilePath, finalFilePath);

    const url = `/imoveis/${propertyId}/${fileName}`;

    res.json({
      success: true,
      url: url,
      message: 'Imagem enviada com sucesso!'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

// Move images from temp folder to real property folder
app.post('/api/move-images', (req, res) => {
  try {
    const { tempId, realId } = req.body;

    if (!tempId || !realId) {
      return res.status(400).json({ error: 'tempId e realId são obrigatórios' });
    }

    console.log(`Moving images from ${tempId} to ${realId}`);

    const tempDir = path.join(__dirname, '..', 'public', 'imoveis', tempId);
    const realDir = path.join(__dirname, '..', 'public', 'imoveis', realId);

    // Check if temp directory exists
    if (!fs.existsSync(tempDir)) {
      return res.status(404).json({ error: `Pasta temporária ${tempId} não encontrada` });
    }

    // Create real directory if it doesn't exist
    if (!fs.existsSync(realDir)) {
      fs.mkdirSync(realDir, { recursive: true });
    }

    // Get all files in temp directory
    const files = fs.readdirSync(tempDir);
    const movedFiles = [];

    // Move each file
    files.forEach(file => {
      const tempFilePath = path.join(tempDir, file);
      const realFilePath = path.join(realDir, file);

      // Move file
      fs.renameSync(tempFilePath, realFilePath);
      movedFiles.push(file);
      console.log(`  ✓ Moved: ${file}`);
    });

    // Remove temp directory
    try {
      fs.rmdirSync(tempDir);
      console.log(`  ✓ Removed temp directory: ${tempDir}`);
    } catch (error) {
      console.warn(`  ⚠ Could not remove temp directory: ${error.message}`);
    }

    res.json({
      success: true,
      message: `${movedFiles.length} arquivo(s) movido(s) com sucesso!`,
      movedFiles,
      newUrls: movedFiles.map(file => `/imoveis/${realId}/${file}`)
    });
  } catch (error) {
    console.error('Move images error:', error);
    res.status(500).json({ error: 'Erro ao mover imagens', details: error.message });
  }
});

// Delete endpoint
app.post('/api/delete-image', (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL da imagem não fornecida' });
    }

    // Convert URL to file path
    const filePath = path.join(__dirname, '..', 'public', imageUrl);

    // Check if file exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Imagem deletada com sucesso!' });
    } else {
      res.status(404).json({ error: 'Imagem não encontrada' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
});

// AI Generation endpoint
app.post('/api/generate-with-ai', async (req, res) => {
  try {
    const { images, prompt } = req.body;

    if (!images || !prompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get API key from server environment (SECURE)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not found in server environment');
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    console.log('🤖 Calling OpenAI API...');

    // Convert images to OpenAI format
    const imageMessages = images.map(img => ({
      type: 'image_url',
      image_url: {
        url: `data:${img.source.media_type};base64,${img.source.data}`
      }
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              ...imageMessages,
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return res.status(response.status).json({
        error: `OpenAI API error: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('✅ AI response received');

    // Convert OpenAI response format to match Anthropic format
    const formattedData = {
      content: [{
        type: 'text',
        text: data.choices[0].message.content
      }]
    };

    res.json(formattedData);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Error generating with AI', details: error.message });
  }
});

// Baserow proxy endpoints - Keep API token secure on server side
const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
const BASEROW_LEADS_TABLE_ID = process.env.BASEROW_LEADS_TABLE_ID;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

// Helper function to make Baserow requests
async function baserowRequest(endpoint, options = {}) {
  if (!BASEROW_TOKEN) {
    throw new Error('BASEROW_TOKEN not configured on server');
  }

  const url = `${BASEROW_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Token ${BASEROW_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Baserow API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');

  if (!digits) return null;

  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  if (digits.length === 11) {
    return `55${digits}`;
  }

  if (digits.length > 13 && digits.startsWith('55')) {
    return digits.slice(0, 13);
  }

  return digits.length >= 12 ? digits : null;
}

function applyMessageTemplate(template, variables = {}) {
  if (!template) return '';

  const name = variables.name || variables.nome || '';
  const firstName = variables.firstName || variables.primeiroNome || (name ? name.split(' ')[0] : '');

  return template
    .replace(/{{\s*(nome|name)\s*}}/gi, name || firstName || 'cliente')
    .replace(/{{\s*(primeiroNome|firstName)\s*}}/gi, firstName || name || 'cliente');
}

async function sendWhatsAppText(phoneNumber, text) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    throw new Error('Evolution API credentials not configured');
  }

  const payload = {
    number: phoneNumber,
    text,
  };

  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

// GET all properties
app.get('/api/baserow/properties', async (req, res) => {
  try {
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true&size=200`
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single property by ID
app.get('/api/baserow/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/?user_field_names=true`
    );
    res.json(data);
  } catch (error) {
    console.error(`Error fetching property ${req.params.id}:`, error);
    if (error.message.includes('404')) {
      res.status(404).json({ error: 'Property not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST create new property
app.post('/api/baserow/properties', async (req, res) => {
  try {
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        body: JSON.stringify(req.body),
      }
    );
    res.json(data);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH update property
app.patch('/api/baserow/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/?user_field_names=true`,
      {
        method: 'PATCH',
        body: JSON.stringify(req.body),
      }
    );
    res.json(data);
  } catch (error) {
    console.error(`Error updating property ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE property
app.delete('/api/baserow/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await fetch(`${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting property ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LEADS ENDPOINTS =====

// GET all leads
app.get('/api/baserow/leads', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true&size=200`
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single lead by ID
app.get('/api/baserow/leads/:id', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }
    const { id } = req.params;
    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${id}/?user_field_names=true`
    );
    res.json(data);
  } catch (error) {
    console.error(`Error fetching lead ${req.params.id}:`, error);
    if (error.message.includes('404')) {
      res.status(404).json({ error: 'Lead not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST create new lead
app.post('/api/baserow/leads', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }

    // Format data before sending to Baserow
    const formattedData = { ...req.body };

    // Format DataCadastro to YYYY-MM-DD if present
    if (formattedData.DataCadastro) {
      try {
        const date = new Date(formattedData.DataCadastro);
        formattedData.DataCadastro = date.toISOString().split('T')[0];
      } catch (e) {
        // If parsing fails, use today's date
        formattedData.DataCadastro = new Date().toISOString().split('T')[0];
      }
    } else {
      // If not provided, use today's date
      formattedData.DataCadastro = new Date().toISOString().split('T')[0];
    }

    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        body: JSON.stringify(formattedData),
      }
    );
    res.json(data);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH update lead
app.patch('/api/baserow/leads/:id', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }
    const { id } = req.params;

    // Format data before sending to Baserow
    const formattedData = { ...req.body };

    // Format DataCadastro to YYYY-MM-DD if present
    if (formattedData.DataCadastro) {
      try {
        const date = new Date(formattedData.DataCadastro);
        formattedData.DataCadastro = date.toISOString().split('T')[0];
      } catch (e) {
        // If parsing fails, keep original value
        console.warn('Failed to parse DataCadastro:', formattedData.DataCadastro);
      }
    }

    const data = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${id}/?user_field_names=true`,
      {
        method: 'PATCH',
        body: JSON.stringify(formattedData),
      }
    );
    res.json(data);
  } catch (error) {
    console.error(`Error updating lead ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE lead
app.delete('/api/baserow/leads/:id', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }
    const { id } = req.params;
    await fetch(`${BASEROW_API_URL}/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting lead ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH update lead by phone number (special endpoint for CRM edit)
app.patch('/api/baserow/leads/phone/:phoneNumber', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }

    const { phoneNumber } = req.params;
    const { name, email, observations, quality, tags } = req.body;

    console.log(`Updating lead by phone ${phoneNumber}:`, { name, email, observations, quality, tags });

    // First, find the lead by phone number
    const searchData = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true&size=200`
    );

    const lead = searchData.results.find(l => l.Telefone === phoneNumber);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Prepare update data (only update fields that were provided and are valid)
    const updateData = {};

    // Only add fields that have actual values (not null, not empty string)
    if (name !== undefined && name !== null) {
      updateData.Nome = name;
    }
    if (email !== undefined && email !== null) {
      updateData.Email = email;
    }
    if (observations !== undefined && observations !== null) {
      updateData.Observacoes = observations;
    }
    if (quality !== undefined && quality !== null) {
      // Map quality to Portuguese for consistency with lead quality script
      const qualityMap = {
        'hot': 'Quente',
        'warm': 'Morno',
        'cold': 'Frio',
        // Also accept Portuguese values directly
        'quente': 'Quente',
        'morno': 'Morno',
        'frio': 'Frio',
      };
      updateData.Qualidade = qualityMap[quality.toLowerCase()] || quality;
    }
    if (tags !== undefined && tags !== null) {
      // Convert array to comma-separated string for Baserow
      // Allow empty string to clear all tags
      if (Array.isArray(tags)) {
        updateData.Tags = tags.length > 0 ? tags.join(', ') : '';
      } else {
        updateData.Tags = tags || '';
      }
    }

    // Update the lead
    const updatedLead = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${lead.id}/?user_field_names=true`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      }
    );

    console.log(`Lead ${phoneNumber} updated successfully`);
    res.json(updatedLead);
  } catch (error) {
    console.error(`Error updating lead by phone ${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp bulk messaging endpoint
app.post('/api/whatsapp/broadcast', async (req, res) => {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      return res.status(500).json({ error: 'Evolution API credentials not configured' });
    }

    const { message, recipients } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    const uniqueRecipients = [];
    const seenNumbers = new Set();

    for (const recipient of recipients) {
      const normalizedNumber = normalizePhoneNumber(recipient.phoneNumber || recipient.number);
      if (!normalizedNumber || seenNumbers.has(normalizedNumber)) {
        continue;
      }

      seenNumbers.add(normalizedNumber);
      const name = recipient.name || recipient.nome || '';
      const firstName = name ? name.trim().split(' ')[0] : '';

      uniqueRecipients.push({
        phoneNumber: normalizedNumber,
        name,
        firstName,
      });
    }

    if (uniqueRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid phone numbers provided' });
    }

    const results = [];
    for (const recipient of uniqueRecipients) {
      const personalizedMessage = applyMessageTemplate(message, {
        name: recipient.name,
        firstName: recipient.firstName,
      });

      try {
        await sendWhatsAppText(recipient.phoneNumber, personalizedMessage);
        results.push({
          phoneNumber: recipient.phoneNumber,
          status: 'sent',
        });
      } catch (error) {
        console.error(`Failed to send message to ${recipient.phoneNumber}:`, error.message);
        results.push({
          phoneNumber: recipient.phoneNumber,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;

    res.json({
      success: true,
      total: uniqueRecipients.length,
      sent,
      failed: uniqueRecipients.length - sent,
      results,
    });
  } catch (error) {
    console.error('Error sending WhatsApp broadcast:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`📤 Upload server running on http://localhost:${PORT}`);
  console.log(`🔒 API keys secured on server side`);
});
