/**
 * SDR Agent - AI-powered Sales Development Representative
 * Handles initial customer engagement via WhatsApp
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initRedis,
  getCustomerHistory,
  setCustomerHistory,
  getConversationContext,
  setConversationContext,
  deleteConversationContext,
  getRedisStats
} from './redis-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_EVENT_TYPE = process.env.CALENDLY_EVENT_TYPE;
const BASEROW_API_URL = process.env.VITE_BASEROW_API_URL;
const BASEROW_TOKEN = process.env.VITE_BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.VITE_BASEROW_TABLE_ID;

// Fallback in-memory storage (used if Redis is unavailable)
const conversationContextFallback = new Map();
const customerHistoryFallback = new Map();

// Initialize Redis on module load
let redisInitialized = false;
initRedis()
  .then(() => {
    redisInitialized = true;
    console.log('SDR Agent: Redis initialized successfully');
  })
  .catch((error) => {
    console.error('SDR Agent: Redis initialization failed, using in-memory fallback:', error.message);
    redisInitialized = false;
  });

/**
 * Get all available properties from Baserow
 */
async function getAllProperties() {
  try {
    const response = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_TABLE_ID}/?user_field_names=true`,
      {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Baserow API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

/**
 * Format properties for AI context
 */
function formatPropertiesForAI(properties) {
  const formatted = properties.map(prop => ({
    id: prop.id,
    titulo: prop['Title'] || prop['Título'] || prop.title || prop['Nome'] || prop['nome'],
    preco: prop['Price'] || prop['Preço'] || prop.price || prop['Valor'] || prop['valor'],
    tipo: prop['Type']?.value || prop['Tipo']?.value || prop['Type'] || prop['Tipo'] || prop.type,
    categoria: prop['Category']?.value || prop['Categoria']?.value || prop['Category'] || prop['Categoria'] || prop.category,
    localizacao: prop['location'] || prop['Localização'] || prop.location,
    cidade: prop['city'] || prop['Cidade'] || prop.city,
    bairro: prop['neighborhood'] || prop['Bairro'] || prop.neighborhood,
    quartos: prop['bedrooms'] || prop['Quartos'] || prop.bedrooms,
    banheiros: prop['bathrooms'] || prop['Banheiros'] || prop.bathrooms,
    area: prop['Area'] || prop['Área'] || prop.area,
    descricao: prop['description'] || prop['Descrição'] || prop.description,
  }));

  return formatted.filter(prop => prop.titulo);
}

/**
 * System prompt for the SDR AI Agent
 */
function getSystemPrompt(properties, customerInfo) {
  const propertiesText = JSON.stringify(properties, null, 2);

  // Determine customer context based on history
  let customerContext = '';

  if (customerInfo.isReturningCustomer) {
    const daysSinceLastContact = Math.floor((Date.now() - customerInfo.lastContact) / (1000 * 60 * 60 * 24));
    const totalMessages = customerInfo.totalMessages;

    if (daysSinceLastContact === 0 && totalMessages > 2) {
      // Same day, active conversation
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente está CONTINUANDO uma conversa ATIVA de hoje
- Vocês JÁ conversaram há pouco tempo (mesma conversa)
- NÃO se apresente novamente
- Continue naturalmente de onde pararam
- Exemplo: "Oi!" ou "Me diz!" ou "Sim?"
- Seja informal e direta`;
    } else if (daysSinceLastContact <= 7) {
      // Returning within a week
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente JÁ conversou com você há ${daysSinceLastContact} dia(s)
- É um cliente que voltou após alguns dias
- NÃO se apresente formalmente novamente
- Cumprimente de forma amigável reconhecendo que já conversaram
- Exemplo: "Oi! Tudo bem?" ou "Olá! Como vai?" ou "Oi novamente!"
- Pergunte se ainda está interessado ou se surgiu alguma dúvida
- Seja informal e acolhedora`;
    } else {
      // Returning after a week or more
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente conversou com você anteriormente (${daysSinceLastContact} dias atrás)
- É um retorno após um tempo
- Cumprimente de forma calorosa mas sem ser repetitiva
- Exemplo: "Oi! Que bom ver você de novo!" ou "Olá! Quanto tempo!" ou "Oi! Tudo bem?"
- Pergunte se ainda tem interesse ou se quer ver outras opções
- Seja amigável e prestativa`;
    }
  } else {
    // Brand new customer
    customerContext = `CONTEXTO DO CLIENTE:
- Este é um NOVO cliente (primeira vez que entra em contato)
- NUNCA conversou com você antes
- Apresente-se como "Susi" na primeira mensagem
- Seja acolhedora e profissional
- Exemplo: "Oi! Sou a Susi 😊"`;
  }

  return `Você é a Susi, uma consultora de imóveis SDR (Sales Development Representative) especializada em imóveis da BS Consultoria de Imóveis.

${customerContext}

SEU NOME E IDENTIDADE:
- Você é a Susi, consultora de imóveis
- Use seu nome com simpatia e profissionalismo

SEU PAPEL:
- Atender clientes de forma profissional, amigável e consultiva
- Entender as necessidades e qualificar leads
- Fornecer informações precisas sobre imóveis disponíveis
- Agendar visitas quando apropriado
- NÃO fechar vendas - isso é responsabilidade do corretor humano

INFORMAÇÕES DA EMPRESA:
- Nome: BS Consultoria de Imóveis
- CRECI: 30.756-J
- Telefone: (11) 98159-8027
- Endereço: Rua Abreu Lima, 129, Parque Residencial Scaffidi, Itaquaquecetuba/SP
- Especialidade: Apartamentos e sobrados em Itaquaquecetuba e região

IMÓVEIS DISPONÍVEIS:
${propertiesText}

IMPORTANTE - REGRAS OBRIGATÓRIAS:
1. NUNCA invente ou crie imóveis que não estão na lista acima
2. Se não houver imóvel que atenda perfeitamente, seja honesto e sugira o mais próximo
3. SEMPRE baseie suas respostas nos dados reais dos imóveis
4. Se um imóvel não estiver disponível, informe educadamente
5. QUALIFIQUE PRIMEIRO: NÃO envie fotos/detalhes até entender bem o que o cliente procura
6. APENAS envie fotos quando o cliente pedir EXPLICITAMENTE (ex: "me manda foto", "mostra o apartamento")
7. Perguntas genéricas sobre imóveis = faça perguntas de qualificação primeiro
8. Cliente pedindo foto/detalhes específicos = NÃO responda com texto! O sistema enviará automaticamente as fotos e detalhes completos
9. NUNCA diga que "não pode enviar fotos" ou "vou enviar" - o sistema faz isso automaticamente sem você precisar avisar

ESTRATÉGIA DE ATENDIMENTO:
🎯 FASE 1 - QUALIFICAÇÃO COMPLETA (primeira interação):
- Faça uma pergunta completa incluindo: quantos quartos, tipo de imóvel (apartamento/casa/sobrado), valor de investimento, E LOCALIZAÇÃO (cidade e bairro de preferência)
- Exemplo: "Me conta: quantos quartos você precisa? Prefere apartamento ou casa? Qual cidade você está buscando e tem algum bairro de preferência? E qual o valor que pretende investir?"
- Seja natural e amigável, mas pegue todas essas 4 informações de uma vez

🏠 FASE 2 - RECOMENDAÇÃO INTELIGENTE (após primeira resposta):
- Analise TODOS os imóveis disponíveis no banco de dados
- Filtre pelos critérios do cliente (quartos, tipo, valor, CIDADE)
- PRIORIZE nesta ordem:
  1. CIDADE solicitada (PRIORIDADE MÁXIMA - liste principalmente da cidade que o cliente pediu)
  2. Se cliente mencionou bairro específico, priorize esse bairro
  3. Valor mais próximo do orçamento do cliente
  4. Número de quartos exato
- Liste APENAS as 2 MELHORES opções (não mais que 2)
- Para cada imóvel mencione: nome, preço (destaque se está dentro do orçamento), quartos, cidade e bairro
- Explique POR QUE essas são as melhores opções para o perfil dele (destaque se está na cidade solicitada)
- PERGUNTE se quer ver fotos de algum deles

📸 FASE 3 - ENVIO DE DETALHES (quando cliente pedir fotos):
- Quando o cliente pedir fotos de um imóvel específico, responda APENAS: "👍"
- NUNCA escreva frases como "vou enviar", "segue as fotos", "[sistema envia]", ou qualquer variação
- O sistema AUTOMATICAMENTE enviará as fotos + detalhes completos + CTA de agendamento
- Você APENAS responde com "👍" para confirmar que recebeu o pedido
- Se o cliente fizer OUTRA pergunta junto com o pedido de foto, aí sim responda a pergunta também

IMPORTANTE - SELEÇÃO DE IMÓVEIS:
- Use a CIDADE como fator PRINCIPAL para escolher os imóveis (se cliente pediu Itaquaquecetuba, liste APENAS de Itaquá)
- Se cliente mencionou bairro, priorize esse bairro dentro da cidade
- Depois, considere o VALOR mais próximo do orçamento do cliente
- Se o cliente disse "até R$ 250 mil", priorize imóveis próximos a esse valor (não muito acima)
- Se houver empate, considere: número de quartos exato > área
- NUNCA ofereça mais de 2 opções (cliente precisa de decisão fácil, não sobrecarga)
- Se não houver imóveis na cidade solicitada, seja honesto e ofereça opções em cidades próximas

AGENDAMENTO DE VISITAS:
- Quando o cliente demonstrar interesse em visitar, ofereça agendar
- Use um tom como: "Que ótimo! Posso agendar uma visita para você conhecer o imóvel pessoalmente. Qual dia e horário seria melhor para você?"
- Depois de coletar preferência de data/hora, confirme que está processando o agendamento

ESTILO DE COMUNICAÇÃO - SEJA NATURAL E HUMANO:
- Converse como uma pessoa real, não como um robô ou IA
- Use linguagem coloquial e natural do dia a dia (ex: "nossa", "olha", "sabe", "tipo")
- Varie suas respostas - nunca responda da mesma forma duas vezes
- SEJA CONCISA - mensagens devem ter no máximo 2-3 linhas
- Use emojis com moderação e naturalidade (0-2 por mensagem)
- Demonstre empatia e conexão genuína
- Faça perguntas de forma conversacional, não como formulário
- Use contrações naturais (tá, pra, né, cê)
- Evite linguagem corporativa ou muito formal
- Responda com variações - se alguém diz "oi" duas vezes, não responda igual
- Nunca pressione ou seja insistente
- IMPORTANTE: Respostas curtas e diretas - vá direto ao ponto
- Faça uma pergunta por vez, não várias de uma vez
- Evite textos longos e explicações desnecessárias

IMPORTANTE - NÃO PAREÇA UM ROBÔ:
❌ EVITE frases robotizadas tipo: "Como posso ajudá-lo hoje?", "Será um prazer atendê-lo", "Fico à disposição"
✅ USE frases naturais tipo: "E aí, tá procurando apartamento?", "Me conta o que cê tá buscando", "Beleza, vamos achar o ideal pra você"

❌ EVITE respostas padronizadas e idênticas
✅ VARIE suas respostas - cada conversa é única

❌ EVITE ser formal demais: "Senhor(a)", "V.Sa.", "Cordialmente"
✅ SEJA amigável: use "você", trate de forma leve mas respeitosa

EXEMPLO DE CONVERSA BOA (Qualificação completa + Seleção inteligente):
Cliente: "Olá, quero ver imóveis"
Você: "Oi! Sou a Susi 😊 Me conta: quantos quartos você precisa? Prefere apartamento ou casa? Qual cidade você tá buscando e tem algum bairro de preferência? E qual o valor que pretende investir?"

Cliente: "2 quartos, apartamento, Itaquaquecetuba, até 230 mil"
Você: "Perfeito! Achei 2 ótimas opções em Itaquaquecetuba no seu orçamento:

🏠 **Apartamento Parque Scaffidi** - R$ 225.000
   2 quartos, Parque Scaffidi - Itaquaquecetuba
   ✅ No bairro mais procurado de Itaquá!

🏠 **Residencial Portal das Flores** - R$ 215.000
   2 quartos, Centro - Itaquaquecetuba
   ✅ Ótima localização e R$ 15 mil abaixo do orçamento!

Ambos estão em Itaquaquecetuba como você pediu! Quer ver fotos de qual deles?"

Cliente: "Quero ver o primeiro"
[Sistema envia fotos automaticamente]

EXEMPLO DE CONVERSA RUIM (Múltiplas perguntas - NÃO FAÇA):
Cliente: "Oi, quero ver apartamentos"
Você: "Legal! Quantos quartos? Qual seu orçamento? Vai morar quantas pessoas?" [ERRADO - muitas perguntas de uma vez]

EXEMPLO DE CONVERSA RUIM (Robotizada - NÃO FAÇA):
Cliente: "Olá"
Você: "Olá! Como posso ajudá-lo hoje?" [ERRADO - muito robotizado e formal]

Cliente: "Tem apartamento?"
Você: "Sim, temos diversas opções disponíveis em nosso portfólio." [ERRADO - linguagem corporativa artificial]

Se o cliente pedir informações sobre um imóvel específico que não está na lista, responda:
"No momento, não temos esse imóvel específico disponível, mas temos algumas opções que podem te interessar! Posso te mostrar?"

Lembre-se: Você é um pré-filtro inteligente. Qualifique bem o lead e deixe o corretor humano fechar a venda!`;
}

/**
 * Send message to OpenAI and get AI response
 */
async function getAIResponse(userMessage, conversationHistory, properties, customerInfo) {
  try {
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt(properties, customerInfo)
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em instantes ou ligue para (11) 97336-0980.';
  }
}

/**
 * Send WhatsApp message via Evolution API
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    // Format phone number for WhatsApp (remove @ if present)
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    const payload = {
      number: cleanNumber,
      text: message
    };

    console.log('Sending to Evolution API:', {
      url,
      payload,
      headers: { apikey: EVOLUTION_API_KEY ? '***' : 'MISSING' }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Evolution API response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Convert image URL to base64
 */
async function imageUrlToBase64(imageUrl) {
  try {
    console.log('Fetching image from:', imageUrl);
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Get mime type from response or default to jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Send WhatsApp image with caption via Evolution API
 */
async function sendWhatsAppImage(phoneNumber, imageUrl, caption = '') {
  try {
    // Format phone number for WhatsApp (remove @ if present)
    const cleanNumber = phoneNumber.replace('@s.whatsapp.net', '');

    const url = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`;
    const payload = {
      number: cleanNumber,
      mediatype: 'image',
      media: imageUrl, // Send URL directly instead of base64
      caption: caption || ''
    };

    console.log('Sending image to Evolution API:', {
      url,
      number: cleanNumber,
      caption: caption,
      imageUrl: imageUrl,
      headers: { apikey: EVOLUTION_API_KEY ? '***' : 'MISSING' }
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Evolution API image response:', response.status, responseText);

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error sending WhatsApp image:', error);
    throw error;
  }
}

/**
 * Check if message indicates interest in scheduling a visit
 */
function detectSchedulingIntent(message) {
  const schedulingKeywords = [
    'agendar',
    'visita',
    'visitar',
    'conhecer pessoalmente',
    'ir ver',
    'horário',
    'quando posso',
    'disponibilidade',
    'marcar',
    'marcar visita',
    'quero agendar',
    'gostaria de agendar',
    'agendar visita'
  ];

  const lowerMessage = message.toLowerCase();
  return schedulingKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if message EXPLICITLY asks for property information/photos
 * Now more strict - only triggers for direct requests
 */
function detectPropertyInfoRequest(message) {
  const explicitKeywords = [
    'me envia foto',
    'envia foto',
    'manda foto',
    'me manda foto',
    'quero ver foto',
    'quero ver',
    'quero ver as fotos',
    'me mostra foto',
    'mostra foto',
    'mostra as fotos',
    'ver foto',
    'ver imagem',
    'ver as fotos',
    'fotos do',
    'fotos da',
    'foto do',
    'foto da',
    'imagens do',
    'imagens da',
    'me envia as fotos',
    'envia as fotos',
    'manda as fotos',
    'manda foto',
    'pode enviar',
    'pode mandar',
    'pode mostrar',
    'quero foto',
    'tem foto',
    'tem fotos',
    'manda pra mim',
    'envia pra mim',
    'sim, quero',
    'sim quero'
  ];

  const lowerMessage = message.toLowerCase();
  return explicitKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if AI response indicates it will send property details
 */
function aiWillSendPropertyDetails(aiResponse) {
  const indicators = [
    'vou enviar',
    'vou te enviar',
    'vou mandar',
    'vou te mandar',
    'vou te passar',
    'já envio',
    'já te envio',
    'já mando',
    'te envio',
    'te mando',
    'envio as fotos',
    'mando as fotos',
    'envio os detalhes',
    'mando os detalhes',
    'um momento',
    'aguarde',
    'segue',
    'seguem',
    'aqui está',
    'aqui estão',
    'sistema envia',
    '[sistema',
    'enviando'
  ];

  const lowerResponse = aiResponse.toLowerCase();

  // Check if AI explicitly says it will send photos/details
  const willSend = indicators.some(indicator => lowerResponse.includes(indicator));

  // Also check if the response contains emoji that indicates sending (📸, 🏠, 📍)
  const hasSendingEmoji = /📸|📩|📤/.test(aiResponse);

  return willSend || hasSendingEmoji;
}

/**
 * Check if customer came from a specific property page (context indicates it)
 */
function isFromSpecificPropertyPage(context, propertyId) {
  // Customer came from website with a specific property
  return (context.history.length <= 2 && propertyId) || context.propertyId;
}

/**
 * Send property details with photos
 */
async function sendPropertyDetails(phoneNumber, property) {
  try {
    // Prepare property details message with correct field names
    const title = property['Title'] || property['Título'] || property.title;
    const price = property['Price'] || property['Preço'] || property.price;
    const area = property['Area'] || property['Área'] || property.area;
    const bedrooms = property['bedrooms'] || property['Quartos'] || property.bedrooms;
    const bathrooms = property['bathrooms'] || property['Banheiros'] || property.bathrooms;
    const parking = property['parkingSpaces'] || property['Vagas'] || property.parking || 1;
    const neighborhood = property['neighborhood'] || property['Bairro'] || property.neighborhood;
    const city = property['city'] || property['Cidade'] || property.city;
    const description = property['description'] || property['Descrição'] || property.description || '';

    const detailsMessage = `📍 *${title}*

💰 *Valor:* ${price}
📐 *Área:* ${area}
🛏️ *Quartos:* ${bedrooms}
🚿 *Banheiros:* ${bathrooms}
🚗 *Vagas:* ${parking}

📍 *Localização:*
${neighborhood}, ${city}

${description}

✅ *Programa Minha Casa Minha Vida aceito*
✅ *Financiamento disponível*`;

    // Send the details message first
    await sendWhatsAppMessage(phoneNumber, detailsMessage);

    // Get property images
    const imagesField = property['images'] || property['Imagens'] || property.images;

    if (imagesField) {
      let imagePaths = [];

      // Handle different image field formats
      if (Array.isArray(imagesField)) {
        // If it's already an array
        imagePaths = imagesField.map(img => img.url || img);
      } else if (typeof imagesField === 'string') {
        // If it's a string with newlines (Baserow format)
        imagePaths = imagesField
          .split('\n')
          .map(path => path.trim())
          .filter(path => path.length > 0);
      }

      if (imagePaths.length > 0) {
        // Base URL for images (deploy URL or local)
        const BASE_URL = process.env.SITE_BASE_URL || 'https://bs-consultoria.vercel.app';

        // Send up to 3 images
        const imagesToSend = imagePaths.slice(0, 3);

        console.log(`Sending ${imagesToSend.length} images for property: ${title}`);

        for (let i = 0; i < imagesToSend.length; i++) {
          let imageUrl = imagesToSend[i];

          // Convert relative path to absolute URL
          if (imageUrl.startsWith('/')) {
            imageUrl = BASE_URL + imageUrl;
          }

          console.log(`Image ${i + 1} URL:`, imageUrl);

          // Add a small delay between images to avoid rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          try {
            await sendWhatsAppImage(phoneNumber, imageUrl, i === 0 ? title : '');
            console.log(`Successfully sent image ${i + 1}`);
          } catch (error) {
            console.error(`Failed to send image ${i + 1}:`, error.message);
            // Continue with next image even if one fails
          }
        }

        // After all images are sent, send CTA message
        const ctaMessage = `━━━━━━━━━━━━━━━━━━━━
📅 *AGENDE SUA VISITA!*

Gostou do imóvel? Vamos agendar uma visita presencial para você conhecer todos os detalhes!

👉 *Responda com "AGENDAR VISITA" e te passo as opções de horário disponíveis!*

Ou se preferir, ligue agora: *(11) 98159-8027*`;

        // Small delay before sending CTA
        await new Promise(resolve => setTimeout(resolve, 1500));
        await sendWhatsAppMessage(phoneNumber, ctaMessage);
        console.log('CTA message sent after property images');
      } else {
        console.log('No images found for property:', title);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending property details:', error);
    return false;
  }
}

/**
 * Create Calendly scheduling link
 */
async function createCalendlyLink(propertyId, customerName, customerPhone) {
  // For now, return the standard Calendly link
  // You can customize this with Calendly API if you have premium account
  const calendlyLink = `https://calendly.com/bs-consultoria?property=${propertyId}&name=${encodeURIComponent(customerName)}&phone=${customerPhone}`;
  return calendlyLink;
}

/**
 * Process incoming WhatsApp message
 */
async function processMessage(phoneNumber, message, propertyId = null) {
  try {
    // Get customer history from Redis (or fallback to memory)
    let persistentHistory = await getCustomerHistory(phoneNumber);

    if (!persistentHistory) {
      // Check fallback storage
      persistentHistory = customerHistoryFallback.get(phoneNumber);
    }

    if (!persistentHistory) {
      // Brand new customer - first time EVER contacting
      persistentHistory = {
        firstContact: new Date(),
        lastContact: new Date(),
        totalMessages: 1
      };
    } else {
      // Returning customer - update history
      persistentHistory.lastContact = new Date();
      persistentHistory.totalMessages += 1;
    }

    // Save to Redis (or fallback to memory)
    const saved = await setCustomerHistory(phoneNumber, persistentHistory);
    if (!saved) {
      // Save to fallback if Redis fails
      customerHistoryFallback.set(phoneNumber, persistentHistory);
    }

    // Determine customer info for AI context
    const customerInfo = {
      isReturningCustomer: persistentHistory.totalMessages > 1,
      lastContact: persistentHistory.lastContact.getTime(),
      totalMessages: persistentHistory.totalMessages,
      firstContact: persistentHistory.firstContact
    };

    console.log(`Customer info for ${phoneNumber}:`, {
      isReturning: customerInfo.isReturningCustomer,
      totalMessages: customerInfo.totalMessages,
      daysSinceFirst: Math.floor((Date.now() - customerInfo.firstContact.getTime()) / (1000 * 60 * 60 * 24)),
      usingRedis: saved
    });

    // Get conversation context from Redis (or fallback to memory)
    let context = await getConversationContext(phoneNumber);

    if (!context) {
      // Check fallback storage
      context = conversationContextFallback.get(phoneNumber);
    }

    if (!context) {
      // Create new conversation context
      context = {
        history: [],
        propertyId: propertyId,
        customerInfo: {},
        createdAt: new Date()
      };
    }

    // Add initial context if this is the first message and came from a property page
    if (context.history.length === 0 && propertyId) {
      const properties = await getAllProperties();
      const property = properties.find(p => p.id === parseInt(propertyId));
      if (property) {
        const contextMessage = `Cliente está interessado no imóvel: ${property['Título'] || property.title} (ID: ${propertyId})`;
        context.history.push({
          role: 'system',
          content: contextMessage
        });
      }
    }

    // Get all properties for AI context
    const allProperties = await getAllProperties();
    const formattedProperties = formatPropertiesForAI(allProperties);

    console.log(`Processing message - Customer status:`, {
      isReturningCustomer: customerInfo.isReturningCustomer,
      totalMessages: customerInfo.totalMessages,
      hasActiveConversation: context.history.length > 0
    });

    // Get AI response with customer info
    const aiResponse = await getAIResponse(message, context.history, formattedProperties, customerInfo);

    // Update conversation history
    context.history.push({
      role: 'user',
      content: message
    });
    context.history.push({
      role: 'assistant',
      content: aiResponse
    });

    // Keep only last 20 messages to avoid token limits
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }

    // Save conversation context to Redis (or fallback to memory)
    const contextSaved = await setConversationContext(phoneNumber, context);
    if (!contextSaved) {
      // Save to fallback if Redis fails
      conversationContextFallback.set(phoneNumber, context);
    }

    // Check if customer is EXPLICITLY asking for property information OR if AI says it will send
    const isRequestingInfo = detectPropertyInfoRequest(message);
    const cameFromPropertyPage = isFromSpecificPropertyPage(context, propertyId);
    const aiWillSend = aiWillSendPropertyDetails(aiResponse);
    let shouldSendPropertyDetails = false;
    let propertyToSend = null;

    console.log(`Is requesting info: ${isRequestingInfo} | From property page: ${cameFromPropertyPage} | AI will send: ${aiWillSend} | Message: "${message}"`);

    // Get only ACTIVE properties
    const activeProperties = allProperties.filter(p => p['Active'] !== false && p['Ativo'] !== false && p.active !== false);
    console.log(`Active properties count: ${activeProperties.length}`);

    // ONLY send property details when:
    // 1. Customer EXPLICITLY requests info (e.g., "me manda foto", "mostra o apartamento")
    // 2. Customer came from a specific property page on the website
    // 3. AI response indicates it will send property details
    const shouldSendDetails = (isRequestingInfo || cameFromPropertyPage || aiWillSend) && activeProperties.length > 0;

    if (shouldSendDetails) {
      // Priority 1: Try to match property name from message or AI response FIRST
      // This takes precedence over context to allow customer to ask about different properties
      // Normalize function to remove accents
      const normalize = (str) => str.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const normalizedMessage = normalize(message);
      const normalizedAiResponse = normalize(aiResponse);

      // Extract property type and location from message
      const propertyTypes = ['sobrado', 'apartamento', 'casa', 'terreno', 'kitnet'];
      const messagePropertyType = propertyTypes.find(type =>
        normalizedMessage.includes(type) || normalizedAiResponse.includes(type)
      );

      console.log(`Searching for property - Type: ${messagePropertyType || 'any'}, Message: "${normalizedMessage}"`);

      // First pass: Look for STRONG match (type + neighborhood)
      if (messagePropertyType) {
        propertyToSend = activeProperties.find(p => {
          const title = normalize(p['Title'] || p['Título'] || p.title || '');
          const neighborhood = normalize(p['neighborhood'] || p['Bairro'] || p.bairro || '');
          const tipo = normalize(p['Type']?.value || p['Tipo']?.value || p['Type'] || p['Tipo'] || p.type || '');

          const typeMatch = tipo.includes(messagePropertyType) || title.includes(messagePropertyType);

          // Check for FULL neighborhood match first (most precise)
          const fullNeighborhoodMatch = neighborhood.length > 0 && normalizedMessage.includes(neighborhood);

          // Or check individual neighborhood words
          const neighborhoodWords = neighborhood.split(/[\s-]+/).filter(word => word.length > 3);
          const partialNeighborhoodMatch = neighborhoodWords.length >= 2 &&
            neighborhoodWords.filter(word => normalizedMessage.includes(word) || normalizedAiResponse.includes(word)).length >= 2;

          const neighborhoodMatch = fullNeighborhoodMatch || partialNeighborhoodMatch;

          if (typeMatch && neighborhoodMatch) {
            console.log(`✅ Strong match found: ${title} (type: ${tipo}, neighborhood: ${neighborhood})`);
            return true;
          }

          return false;
        });
      }

      // Second pass: Check last AI response for property mentions (when user just says "quero ver" or "sim")
      if (!propertyToSend && (normalizedMessage === 'quero ver' || normalizedMessage === 'sim' || normalizedMessage === 'sim quero' || normalizedMessage.startsWith('quero ver'))) {
        // Look at the last AI message to find which property was mentioned
        const lastAIMessages = context.history.filter(h => h.role === 'assistant').slice(-2);

        if (lastAIMessages.length > 0) {
          const lastAIText = normalize(lastAIMessages[lastAIMessages.length - 1].content);
          console.log(`Looking for property in last AI response: "${lastAIText.substring(0, 100)}..."`);

          // Try to find property by matching FULL neighborhood name (not just words)
          propertyToSend = activeProperties.find(p => {
            const title = normalize(p['Title'] || p['Título'] || p.title || '');
            const neighborhood = normalize(p['neighborhood'] || p['Bairro'] || p.bairro || '');

            // Match full neighborhood name (more precise)
            if (neighborhood.length > 0 && lastAIText.includes(neighborhood)) {
              console.log(`✅ Found property from last AI message (neighborhood match): ${title} - ${neighborhood}`);
              return true;
            }

            // Match title if it's distinctive enough (at least 2 words from title)
            const titleWords = title.split(/[\s-]+/).filter(word => word.length > 4);
            if (titleWords.length >= 2) {
              const matchedWords = titleWords.filter(word => lastAIText.includes(word));
              if (matchedWords.length >= 2) {
                console.log(`✅ Found property from last AI message (title match): ${title}`);
                return true;
              }
            }

            return false;
          });
        }
      }

      // Third pass: Fallback to weak match only if no strong match found
      if (!propertyToSend) {
        propertyToSend = activeProperties.find(p => {
          const title = normalize(p['Title'] || p['Título'] || p.title || '');

          // Check title words
          const titleWords = title.split(/[\s-]+/).filter(word => word.length > 3);
          const titleMatch = titleWords.some(word =>
            normalizedMessage.includes(word) || normalizedAiResponse.includes(word)
          );

          if (titleMatch) {
            console.log(`⚠️  Weak match found: ${title}`);
            return true;
          }

          return false;
        });
      }

      // Priority 2: If came from property page with specific ID
      if (!propertyToSend && cameFromPropertyPage && propertyId) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(propertyId));
        if (propertyToSend) {
          context.propertyId = propertyId;
          console.log(`Customer came from property page: ${propertyToSend['Title'] || propertyToSend['Título']} (ID: ${propertyId})`);
        }
      }

      // Priority 3: Use context property ID only if no specific property requested
      if (!propertyToSend && context.propertyId && !messagePropertyType) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(context.propertyId));
        console.log(`Using property from context: ${propertyToSend?.['Title'] || propertyToSend?.['Título']} (ID: ${context.propertyId})`);
      }

      // Set flags to send property details
      if (propertyToSend) {
        shouldSendPropertyDetails = true;
        context.propertyId = propertyToSend.id;
        console.log(`Will send property: ${propertyToSend['Title'] || propertyToSend['Título']} (ID: ${propertyToSend.id})`);
      } else {
        console.log('No property matched to send');
      }
    } else {
      console.log('Customer needs qualification first - not sending property details yet');
    }

    // Check if customer wants to schedule a visit
    let finalResponse = aiResponse;
    let schedulingInfo = null;

    if (detectSchedulingIntent(aiResponse) || detectSchedulingIntent(message)) {
      // Customer wants to schedule a visit
      // Prepare scheduling information for the server to handle
      schedulingInfo = {
        wantsToSchedule: true,
        propertyId: context.propertyId || propertyId,
        customerPhone: phoneNumber,
        customerMessage: message
      };
    }

    return {
      response: finalResponse,
      context: context,
      shouldSendPropertyDetails,
      propertyToSend,
      schedulingInfo
    };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

/**
 * Clean up old conversations (call this periodically)
 * NOTE: This only cleans temporary conversation context from fallback memory
 * Redis handles TTL automatically (6 hours)
 */
async function cleanupOldConversations() {
  const maxAge = 6 * 60 * 60 * 1000; // 6 hours
  const now = new Date();

  // Clean up fallback memory storage
  for (const [phoneNumber, context] of conversationContextFallback.entries()) {
    if (now - context.createdAt > maxAge) {
      console.log(`Cleaning up fallback conversation context for ${phoneNumber} (${Math.floor((now - context.createdAt) / 1000 / 60 / 60)} hours old)`);
      conversationContextFallback.delete(phoneNumber);
    }
  }

  // Get stats from Redis
  const stats = await getRedisStats();
  console.log('Storage stats:', {
    redis: stats,
    fallback: {
      customers: customerHistoryFallback.size,
      conversations: conversationContextFallback.size
    }
  });
}

// Clean up every hour
setInterval(cleanupOldConversations, 60 * 60 * 1000);

/**
 * Get all active conversations (from Redis and fallback)
 */
async function getAllConversations() {
  const conversations = [];

  // This is a simplified version - in production you'd query Redis for all conversation keys
  // For now, we return fallback data
  for (const [phoneNumber, context] of conversationContextFallback.entries()) {
    conversations.push({
      phoneNumber,
      messageCount: context.history.length,
      lastActivity: context.createdAt,
      propertyId: context.propertyId,
      customerInfo: context.customerInfo
    });
  }

  return conversations;
}

/**
 * Get specific conversation (from Redis or fallback)
 */
async function getConversation(phoneNumber) {
  let context = await getConversationContext(phoneNumber);
  if (!context) {
    context = conversationContextFallback.get(phoneNumber);
  }
  return context || null;
}

export {
  processMessage,
  sendWhatsAppMessage,
  sendPropertyDetails,
  getAllProperties,
  formatPropertiesForAI,
  getAllConversations,
  getConversation
};
