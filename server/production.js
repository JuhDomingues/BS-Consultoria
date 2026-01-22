import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env or .env.local
// In production (VPS): loads .env
// In development (local): loads .env.local
const envPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', '.env')
  : path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });
console.log(`Loading environment from: ${envPath}`);

const app = express();
const PORT = process.env.PORT || 3003;

// CORS Configuration - Allow both www and non-www domains
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'https://bsconsultoriadeimoveis.com.br',
    'https://www.bsconsultoriadeimoveis.com.br',
    'https://bs-consultoria.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
// Handle preflight OPTIONS requests explicitly (for Nginx compatibility)
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// Additional CORS headers middleware for all requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempPath = path.join(__dirname, '..', 'public', 'imoveis', 'temp');

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }

    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Apenas imagens são permitidas!'), false);
    }
    cb(null, true);
  }
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'production',
    nodeVersion: process.version
  });
});

// SDR Server proxy - forward requests to SDR server on port 3002
const SDR_SERVER_URL = process.env.SDR_SERVER_URL || 'http://localhost:3002';

app.get('/api/conversations', async (req, res) => {
  try {
    const response = await fetch(`${SDR_SERVER_URL}/api/conversations`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to SDR server (conversations):', error.message);
    res.status(503).json({
      error: 'SDR server unavailable',
      message: error.message,
      success: false
    });
  }
});

app.get('/api/conversations/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const response = await fetch(`${SDR_SERVER_URL}/api/conversations/${encodeURIComponent(phoneNumber)}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to SDR server (conversation detail):', error.message);
    res.status(503).json({
      error: 'SDR server unavailable',
      message: error.message,
      success: false
    });
  }
});

app.get('/api/sdr-stats', async (req, res) => {
  try {
    const response = await fetch(`${SDR_SERVER_URL}/api/sdr-stats`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to SDR server (stats):', error.message);
    res.status(503).json({
      error: 'SDR server unavailable',
      message: error.message,
      success: false
    });
  }
});

// Upload endpoint
app.post('/api/upload-image', upload.single('file'), (req, res) => {
  try {
    console.log('Upload request received');

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const propertyId = req.body.propertyId || 'temp';
    const fileName = req.body.fileName || req.file.filename;

    console.log('File details:', {
      originalName: req.file.originalname,
      size: req.file.size,
      propertyId,
      fileName
    });

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

    console.log('Upload successful:', url);

    res.json({
      success: true,
      url: url,
      message: 'Imagem enviada com sucesso!'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload da imagem',
      details: error.message
    });
  }
});

// Delete image endpoint
app.post('/api/delete-image', (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'URL da imagem não fornecida' });
    }

    const filePath = path.join(__dirname, '..', 'public', imageUrl);

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

// Baserow API configuration
const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
const BASEROW_LEADS_TABLE_ID = process.env.BASEROW_LEADS_TABLE_ID;

// Evolution API configuration (for WhatsApp broadcast)
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

// GET all properties from Baserow
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

// GET single property by ID from Baserow
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

// POST create new property in Baserow
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

// PATCH update property in Baserow
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

// DELETE property from Baserow
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

// ==================== LEADS ENDPOINTS ====================

// GET all leads from Baserow
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

// POST create new lead in Baserow
app.post('/api/baserow/leads', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }

    const { name, phoneNumber, email, source, typebotData, notes } = req.body;

    console.log('📝 Creating new lead:', { name, phoneNumber, source });

    // Validate required fields
    if (!name || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Nome e telefone são obrigatórios'
      });
    }

    // Check if lead already exists with this phone number
    const existingLeads = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true&size=200`
    );

    const existingLead = existingLeads.results.find(l => l.Telefone === phoneNumber);

    if (existingLead) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um lead com este número de telefone'
      });
    }

    // Prepare lead data for Baserow
    // Note: Baserow doesn't accept null for text fields, use empty string instead
    const leadData = {
      Nome: name,
      Telefone: phoneNumber,
      Score: 0,
      Qualidade: 'Frio',
      Fonte: source || 'manual',
      TotalMensagens: 0,
      DataCadastro: new Date().toISOString().split('T')[0],
      TipoTransacao: typebotData?.tipoTransacao || '',
      TipoImovel: typebotData?.tipoImovel || '',
      BudgetCompra: typebotData?.budgetCompra || '',
      BudgetLocacao: typebotData?.budgetLocacao || '',
      Localizacao: typebotData?.localizacao || '',
      Prazo: typebotData?.prazo || '',
      Financiamento: typebotData?.financiamento || '',
      Observacoes: notes || '',
      Indicadores: JSON.stringify([]),
      Tags: '',
    };

    // Only add email if provided (Baserow email field validation)
    if (email && email.trim()) {
      leadData.Email = email;
    }

    console.log('📦 Lead data to be sent to Baserow:', JSON.stringify(leadData, null, 2));

    // Create lead in Baserow
    const newLead = await baserowRequest(
      `/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true`,
      {
        method: 'POST',
        body: JSON.stringify(leadData),
      }
    );

    console.log('📥 Response from Baserow:', JSON.stringify(newLead, null, 2));
    console.log('✅ Lead created successfully with ID:', newLead?.id);

    res.json({
      success: true,
      lead: newLead,
      message: 'Lead criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Error creating lead:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PATCH update lead by phone number in Baserow
app.patch('/api/baserow/leads/phone/:phoneNumber', async (req, res) => {
  try {
    if (!BASEROW_LEADS_TABLE_ID) {
      return res.status(500).json({ error: 'BASEROW_LEADS_TABLE_ID not configured' });
    }

    const { phoneNumber } = req.params;
    const { name, email, observations, quality, tags } = req.body;

    console.log(`Updating lead ${phoneNumber}:`, { name, email, observations, quality, tags });

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
    console.error(`Error updating lead ${req.params.phoneNumber}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== WHATSAPP BROADCAST ====================

// Helper function to normalize phone numbers
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

// Helper function to apply message template variables
function applyMessageTemplate(template, variables = {}) {
  if (!template) return '';

  const name = variables.name || variables.nome || '';
  const firstName = variables.firstName || variables.primeiroNome || (name ? name.split(' ')[0] : '');

  return template
    .replace(/{{\s*(nome|name)\s*}}/gi, name || firstName || 'cliente')
    .replace(/{{\s*(primeiroNome|firstName)\s*}}/gi, firstName || name || 'cliente');
}

// Helper function to add delay between messages
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to send WhatsApp text message
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

// WhatsApp bulk messaging endpoint with real-time progress (SSE)
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

    console.log(`📤 WhatsApp Broadcast: Sending to ${recipients.length} recipients`);

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

    // Setup SSE for real-time progress
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Helper to send SSE events
    const sendProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Anti-spam configuration
    const DELAY_BETWEEN_MESSAGES = 3000; // 3 seconds between each message
    const BATCH_SIZE = 20; // Messages per batch
    const DELAY_BETWEEN_BATCHES = 60000; // 1 minute pause between batches
    const MAX_RECIPIENTS_WARNING = 50; // Warn if more than this

    // Warning for large broadcasts
    if (uniqueRecipients.length > MAX_RECIPIENTS_WARNING) {
      console.log(`⚠️  WARNING: Large broadcast with ${uniqueRecipients.length} recipients. Risk of WhatsApp blocking.`);
    }

    console.log(`📤 Broadcast config: ${uniqueRecipients.length} recipients, ${BATCH_SIZE} per batch, ${DELAY_BETWEEN_MESSAGES/1000}s delay`);

    // Send initial progress
    sendProgress({
      type: 'start',
      total: uniqueRecipients.length,
      batchSize: BATCH_SIZE,
      delaySeconds: DELAY_BETWEEN_MESSAGES / 1000,
      warning: uniqueRecipients.length > MAX_RECIPIENTS_WARNING
        ? `Envio grande (${uniqueRecipients.length} destinatários). Risco de bloqueio do WhatsApp.`
        : null,
    });

    const results = [];
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 5;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i];
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const positionInBatch = (i % BATCH_SIZE) + 1;

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
        sent++;
        console.log(`  ✅ [Batch ${batchNumber}] Sent to ${recipient.phoneNumber} (${i + 1}/${uniqueRecipients.length})`);
        consecutiveFailures = 0;

        // Send progress update
        sendProgress({
          type: 'progress',
          current: i + 1,
          total: uniqueRecipients.length,
          sent,
          failed,
          batch: batchNumber,
          lastPhone: recipient.phoneNumber,
          lastStatus: 'sent',
          lastName: recipient.name || recipient.phoneNumber,
        });

      } catch (error) {
        console.error(`  ❌ [Batch ${batchNumber}] Failed to send to ${recipient.phoneNumber}:`, error.message);
        results.push({
          phoneNumber: recipient.phoneNumber,
          status: 'failed',
          error: error.message,
        });
        failed++;
        consecutiveFailures++;

        // Send progress update
        sendProgress({
          type: 'progress',
          current: i + 1,
          total: uniqueRecipients.length,
          sent,
          failed,
          batch: batchNumber,
          lastPhone: recipient.phoneNumber,
          lastStatus: 'failed',
          lastError: error.message,
          lastName: recipient.name || recipient.phoneNumber,
        });

        // Check if we should stop
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(`🛑 STOPPING: ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`);

          // Mark remaining as failed
          const remaining = uniqueRecipients.length - i - 1;
          for (let j = i + 1; j < uniqueRecipients.length; j++) {
            results.push({
              phoneNumber: uniqueRecipients[j].phoneNumber,
              status: 'failed',
              error: 'Broadcast stopped: connection issue detected',
            });
          }
          failed += remaining;

          sendProgress({
            type: 'stopped',
            reason: 'Muitas falhas consecutivas. WhatsApp pode estar desconectado.',
            current: i + 1,
            total: uniqueRecipients.length,
            sent,
            failed,
          });
          break;
        }
      }

      // Delay logic
      if (i < uniqueRecipients.length - 1) {
        if (positionInBatch === BATCH_SIZE) {
          console.log(`  ⏸️  Batch ${batchNumber} complete. Waiting ${DELAY_BETWEEN_BATCHES/1000}s...`);

          sendProgress({
            type: 'batch_pause',
            batch: batchNumber,
            pauseSeconds: DELAY_BETWEEN_BATCHES / 1000,
            sent,
            failed,
            message: `Lote ${batchNumber} completo. Aguardando ${DELAY_BETWEEN_BATCHES/1000}s antes do próximo lote...`,
          });

          await sleep(DELAY_BETWEEN_BATCHES);
        } else {
          await sleep(DELAY_BETWEEN_MESSAGES);
        }
      }
    }

    console.log(`📊 Broadcast complete: ${sent} sent, ${failed} failed out of ${uniqueRecipients.length}`);

    // Send final result
    sendProgress({
      type: 'complete',
      success: true,
      total: uniqueRecipients.length,
      sent,
      failed,
      results,
    });

    res.end();

  } catch (error) {
    console.error('Error sending WhatsApp broadcast:', error);
    // Try to send error via SSE if headers not sent
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

// Import other API routes if they exist
const apiRoutes = [
  'health',
  'reminders',
  'schedule-visit',
  'webhook-calendly',
  'webhook-whatsapp'
];

for (const route of apiRoutes) {
  const routePath = path.join(__dirname, '..', 'api', `${route}.js`);
  if (fs.existsSync(routePath)) {
    try {
      const module = await import(`file://${routePath}`);
      if (module.default) {
        app.use(`/api/${route}`, module.default);
        console.log(`✓ Loaded API route: /api/${route}`);
      }
    } catch (error) {
      console.warn(`⚠ Could not load API route ${route}:`, error.message);
    }
  }
}

// Serve static files from dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Serve imoveis directory from public folder
const imoveisPath = path.join(__dirname, '..', 'public', 'imoveis');
if (!fs.existsSync(imoveisPath)) {
  fs.mkdirSync(imoveisPath, { recursive: true });
}
app.use('/imoveis', express.static(imoveisPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 BS Consultoria Server                                ║
║                                                           ║
║   Server running on: http://0.0.0.0:${PORT}                 ║
║   Environment: production                                 ║
║   Node version: ${process.version}                           ║
║                                                           ║
║   API Endpoints:                                          ║
║   - GET    /api/health                                    ║
║   - POST   /api/upload-image                              ║
║   - POST   /api/delete-image                              ║
║   - POST   /api/move-images                               ║
║   - POST   /api/generate-with-ai                          ║
║   - GET    /api/baserow/properties                        ║
║   - GET    /api/baserow/properties/:id                    ║
║   - POST   /api/baserow/properties                        ║
║   - PATCH  /api/baserow/properties/:id                    ║
║   - DELETE /api/baserow/properties/:id                    ║
║   - GET    /api/baserow/leads                             ║
║   - POST   /api/baserow/leads                             ║
║   - PATCH  /api/baserow/leads/phone/:phoneNumber          ║
║   - POST   /api/whatsapp/broadcast                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
