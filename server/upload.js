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
    'https://www.bsconsultoriadeimoveis.com.br'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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

app.listen(PORT, () => {
  console.log(`📤 Upload server running on http://localhost:${PORT}`);
  console.log(`🔒 API keys secured on server side`);
});
