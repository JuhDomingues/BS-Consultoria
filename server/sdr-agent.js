/**
 * SDR Agent - AI-powered Sales Development Representative
 * Handles initial customer engagement via WhatsApp
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Store conversation context (in production, use Redis or database)
const conversationContext = new Map();

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
function getSystemPrompt(properties) {
  const propertiesText = JSON.stringify(properties, null, 2);

  return `Você é a Susi, uma consultora de imóveis SDR (Sales Development Representative) especializada em imóveis da BS Consultoria de Imóveis.

SEU NOME E IDENTIDADE:
- Você é a Susi, consultora de imóveis
- Sempre se apresente como "Susi" na primeira interação
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
8. Cliente pedindo foto/detalhes específicos = pode enviar (o sistema fará isso automaticamente)

ESTRATÉGIA DE ATENDIMENTO:
🎯 FASE 1 - QUALIFICAÇÃO (sempre comece aqui para perguntas genéricas):
- Entenda o perfil do cliente ANTES de recomendar imóveis
- Faça perguntas naturais e conversacionais
- NÃO ofereça imóveis específicos até ter pelo menos 3 informações do cliente

🏠 FASE 2 - RECOMENDAÇÃO (só após qualificar):
- Baseado nas respostas, recomende o melhor imóvel
- Seja específico sobre POR QUÊ esse imóvel é ideal para o cliente
- Pergunte se quer ver fotos/detalhes

📸 FASE 3 - ENVIO DE DETALHES (apenas se cliente pedir):
- Aguarde o cliente pedir explicitamente para ver fotos/detalhes
- Quando pedir, o sistema enviará automaticamente

PROCESSO DE QUALIFICAÇÃO - Descubra sutilmente (UMA PERGUNTA POR VEZ):
1. Tipo de imóvel preferido (apartamento ou sobrado)
2. Composição familiar (quantas pessoas morarão)
3. Localização de trabalho/escola (para avaliar proximidade)
4. Número de quartos desejado
5. Faixa de preço pretendida
6. Forma de pagamento (financiamento ou à vista)
7. Urgência da compra (imediata, em breve, pesquisando)

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

EXEMPLO DE CONVERSA BOA (Natural, Qualificação antes de oferecer):
Cliente: "Olá, quero ver apartamentos"
Você: "Oi! Sou a Susi 😊 Tá procurando pra morar ou investir?"

Cliente: "Pra morar"
Você: "Legal! Vai morar quantas pessoas?"

Cliente: "Eu, minha esposa e 2 filhos"
Você: "Ah, família de 4! Precisa de quantos quartos?"

Cliente: "2 ou 3 quartos"
Você: "Massa! Vocês trabalham/estudam por qual região?"

Cliente: "Eu trabalho em Suzano"
Você: "Perfeito! Tenho um apartamento ideal pra vocês em Itaquá, super perto de Suzano. Quer ver?"

Cliente: "Quero sim"
Você: "Me manda foto dele" [AQUI o cliente pede explicitamente - sistema envia fotos]

EXEMPLO DE CONVERSA RUIM (Oferecendo imóvel antes de qualificar - NÃO FAÇA):
Cliente: "Oi, quero ver apartamentos"
Você: "Legal! Temos o Residencial Bela Vista com 2 quartos..." [ERRADO - não qualificou primeiro]

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
async function getAIResponse(userMessage, conversationHistory, properties) {
  try {
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt(properties)
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
        max_tokens: 150
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
      media: imageUrl,
      caption: caption
    };

    console.log('Sending image to Evolution API:', {
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
    'disponibilidade'
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
    'me envia',
    'envia',
    'manda',
    'me manda',
    'quero ver foto',
    'me mostra foto',
    'mostra foto',
    'ver foto',
    'ver imagem',
    'fotos do',
    'fotos da',
    'imagens do',
    'imagens da',
    'detalhes do',
    'detalhes da',
    'informações do',
    'informações da',
    'informacao do',
    'informacao da',
    'mais sobre o',
    'mais sobre a',
    'mais sobre esse',
    'mais sobre este',
    'quero saber mais sobre',
    'me fala sobre o',
    'me fala sobre a'
  ];

  const lowerMessage = message.toLowerCase();
  return explicitKeywords.some(keyword => lowerMessage.includes(keyword));
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
    if (imagesField && Array.isArray(imagesField) && imagesField.length > 0) {
      // Send up to 3 images
      const imagesToSend = imagesField.slice(0, 3);

      for (let i = 0; i < imagesToSend.length; i++) {
        const image = imagesToSend[i];
        const imageUrl = image.url || image;

        // Add a small delay between images to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await sendWhatsAppImage(phoneNumber, imageUrl, i === 0 ? title : '');
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
    // Get or create conversation context
    if (!conversationContext.has(phoneNumber)) {
      conversationContext.set(phoneNumber, {
        history: [],
        propertyId: propertyId,
        customerInfo: {},
        createdAt: new Date()
      });
    }

    const context = conversationContext.get(phoneNumber);

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

    // Get AI response
    const aiResponse = await getAIResponse(message, context.history, formattedProperties);

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

    // Check if customer is EXPLICITLY asking for property information
    const isRequestingInfo = detectPropertyInfoRequest(message);
    const cameFromPropertyPage = isFromSpecificPropertyPage(context, propertyId);
    let shouldSendPropertyDetails = false;
    let propertyToSend = null;

    console.log(`Is requesting info: ${isRequestingInfo} | From property page: ${cameFromPropertyPage} | Message: "${message}"`);

    // Get only ACTIVE properties
    const activeProperties = allProperties.filter(p => p['Active'] !== false && p['Ativo'] !== false && p.active !== false);
    console.log(`Active properties count: ${activeProperties.length}`);

    // ONLY send property details when:
    // 1. Customer EXPLICITLY requests info (e.g., "me manda foto", "mostra o apartamento")
    // 2. Customer came from a specific property page on the website
    const shouldSendDetails = (isRequestingInfo || cameFromPropertyPage) && activeProperties.length > 0;

    if (shouldSendDetails) {
      // Priority 1: If we have a propertyId in context from previous interaction
      if (context.propertyId) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(context.propertyId));
      }

      // Priority 2: If came from property page with specific ID
      if (!propertyToSend && cameFromPropertyPage && propertyId) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(propertyId));
        if (propertyToSend) {
          context.propertyId = propertyId;
          console.log(`Customer came from property page: ${propertyToSend['Title'] || propertyToSend['Título']} (ID: ${propertyId})`);
        }
      }

      // Priority 3: Try to match property name from message (only if explicitly requesting)
      if (!propertyToSend && isRequestingInfo) {
        const lowerMessage = message.toLowerCase();
        propertyToSend = activeProperties.find(p => {
          const title = (p['Title'] || p['Título'] || p.title || '').toLowerCase();
          const neighborhood = (p['neighborhood'] || p['Bairro'] || p.bairro || '').toLowerCase();
          // Check if message contains property title or neighborhood
          return title.split(' ').some(word => word.length > 3 && lowerMessage.includes(word)) ||
                 neighborhood.split(' ').some(word => word.length > 3 && lowerMessage.includes(word));
        });
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
    if (detectSchedulingIntent(aiResponse) || detectSchedulingIntent(message)) {
      // In the future, integrate with Calendly API here
      // For now, just include a note
      finalResponse += '\n\n📅 *Agendamento disponível em breve!*';
    }

    return {
      response: finalResponse,
      context: context,
      shouldSendPropertyDetails,
      propertyToSend
    };
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}

/**
 * Clean up old conversations (call this periodically)
 */
function cleanupOldConversations() {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const now = new Date();

  for (const [phoneNumber, context] of conversationContext.entries()) {
    if (now - context.createdAt > maxAge) {
      conversationContext.delete(phoneNumber);
    }
  }
}

// Clean up every hour
setInterval(cleanupOldConversations, 60 * 60 * 1000);

/**
 * Get all active conversations
 */
function getAllConversations() {
  const conversations = [];
  for (const [phoneNumber, context] of conversationContext.entries()) {
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
 * Get specific conversation
 */
function getConversation(phoneNumber) {
  return conversationContext.get(phoneNumber) || null;
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
