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
import {
  getTypebotLead,
  isTypebotLead,
  markTypebotLeadAsProcessed,
  formatTypebotLeadForAI
} from './typebot-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env or .env.local
// In production (VPS): loads .env
// In development (local): loads .env.local
const envPath = process.env.NODE_ENV === 'production'
  ? join(__dirname, '..', '.env')
  : join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });
console.log(`Loading environment from: ${envPath}`);

// Server-side environment variables (SECURE - never exposed to frontend)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_EVENT_TYPE = process.env.CALENDLY_EVENT_TYPE;
const BASEROW_API_URL = process.env.BASEROW_API_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const BASEROW_TABLE_ID = process.env.BASEROW_TABLE_ID;
const BASEROW_LEADS_TABLE_ID = process.env.BASEROW_LEADS_TABLE_ID;

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
function getSystemPrompt(properties, customerInfo, typebotLeadInfo = null) {
  const propertiesText = JSON.stringify(properties, null, 2);

  // Determine customer context based on history
  let customerContext = '';

  // Check if customer came from Typebot
  if (typebotLeadInfo) {
    const typebotContext = formatTypebotLeadForAI(typebotLeadInfo);
    customerContext = `CONTEXTO DO CLIENTE - LEAD DO TYPEBOT:
- Este cliente preencheu um formulário detalhado antes de entrar em contato
- Você JÁ TEM as informações dele, NÃO pergunte novamente
- Use as informações abaixo para personalizar sua abordagem

${typebotContext}

IMPORTANTE - ABORDAGEM PARA LEAD DO TYPEBOT (SIGA EXATAMENTE ESTA ORDEM):

1️⃣ PRIMEIRA MENSAGEM - Reconhecer e cumprimentar:
   - Use o nome dele se estiver disponível
   - Mencione brevemente o que ele procura (baseado nas informações do Typebot)
   - Exemplo: "Olá [Nome]! Vi que você está buscando [tipo de imóvel] para [comprar/alugar] em [localização]."

2️⃣ SEGUNDA PARTE DA MENSAGEM - Pergunta OBRIGATÓRIA sobre preferência:
   - Na MESMA mensagem, pergunte: "Prefere ser atendido por um consultor humano ou quer que eu mesma ajude você a encontrar o imóvel ideal?"
   - NUNCA recomende imóveis antes de fazer esta pergunta
   - NUNCA pule esta pergunta

3️⃣ APÓS A RESPOSTA DO CLIENTE:
   - Se cliente escolher consultor humano → Envie o link: "👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!"
   - Se cliente escolher continuar com você (Mia) → Aí sim recomende os imóveis baseado nas preferências dele

REGRAS IMPORTANTES:
- NÃO se apresente formalmente (cliente já te conhece do formulário)
- NÃO faça perguntas que ele já respondeu no Typebot
- NUNCA recomende imóveis antes de perguntar sobre a preferência de atendimento
- Seja objetiva e natural nas mensagens`;
  } else if (customerInfo.isReturningCustomer) {
    const daysSinceLastContact = Math.floor((Date.now() - customerInfo.lastContact) / (1000 * 60 * 60 * 24));
    const totalMessages = customerInfo.totalMessages;

    if (daysSinceLastContact === 0 && totalMessages > 2) {
      // Same day, active conversation
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente está CONTINUANDO uma conversa ATIVA de hoje
- Vocês JÁ conversaram há pouco tempo (mesma conversa)
- NÃO se apresente novamente
- Continue naturalmente de onde pararam
- Exemplo: "Olá!" ou "Me diga!" ou "Sim?"
- Seja cordial e direta`;
    } else if (daysSinceLastContact <= 7) {
      // Returning within a week
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente JÁ conversou com você há ${daysSinceLastContact} dia(s)
- É um cliente que voltou após alguns dias
- NÃO se apresente formalmente novamente
- Cumprimente de forma amigável reconhecendo que já conversaram
- Exemplo: "Olá! Tudo bem?" ou "Como vai?" ou "Que bom falar com você novamente!"
- Pergunte se ainda está interessado ou se surgiu alguma dúvida
- Seja cordial e acolhedora`;
    } else {
      // Returning after a week or more
      customerContext = `CONTEXTO DO CLIENTE:
- Este cliente conversou com você anteriormente (${daysSinceLastContact} dias atrás)
- É um retorno após um tempo
- Cumprimente de forma calorosa mas sem ser repetitiva
- Exemplo: "Olá! Que bom ver você de novo!" ou "Quanto tempo!" ou "Como está?"
- Pergunte se ainda tem interesse ou se quer ver outras opções
- Seja amigável e prestativa`;
    }
  } else {
    // Brand new customer
    customerContext = `CONTEXTO DO CLIENTE:
- Este é um NOVO cliente (primeira vez que entra em contato)
- NUNCA conversou com você antes
- OBRIGATÓRIO: Apresente-se como "Mia" e mostre o MENU INICIAL
- Use EXATAMENTE esta mensagem:

"Olá! Sou a Mia 😊 Consultora da BS Consultoria de Imóveis.

Como posso ajudar você hoje?

1️⃣ 🏡 Procurar um imóvel
2️⃣ 💬 Falar com um corretor
3️⃣ ℹ️ Informações sobre financiamento
4️⃣ 📍 Redes sociais e endereço

Escolha o número da opção desejada."

IMPORTANTE: NÃO faça perguntas de qualificação sem antes o cliente escolher a opção do menu.`;
  }

  return `Você é a Mia, uma consultora de imóveis SDR (Sales Development Representative) especializada em imóveis da BS Consultoria de Imóveis.

${customerContext}

SEU NOME E IDENTIDADE:
- Você é a Mia, consultora de imóveis da BS Consultoria
- OBRIGATÓRIO: SEMPRE se apresente dizendo "Sou a Mia" na PRIMEIRA mensagem para clientes novos
- A primeira frase DEVE começar com "Olá! Sou a Mia"
- Use seu nome (Mia) com simpatia e profissionalismo
- Ao se referir a si mesma, use "eu mesma" (ex: "quer que eu mesma ajude você")

SEU PAPEL:
- Atender clientes de forma profissional, amigável e consultiva
- Entender as necessidades e qualificar leads
- Fornecer informações precisas sobre imóveis disponíveis
- Agendar visitas quando apropriado
- NÃO fechar vendas - isso é responsabilidade do corretor humano

INFORMAÇÕES DA EMPRESA:
- Nome: BS Consultoria de Imóveis
- CRECI: 30.756-J
- Telefone consultor humano: (11) 98159-8027
- Endereço: Rua Abreu Lima, 129, Parque Residencial Scaffidi, Itaquaquecetuba/SP
- Especialidade: Apartamentos e sobrados em Itaquaquecetuba e região

TRANSFERÊNCIA PARA CONSULTOR HUMANO:
- Quando o cliente pedir para falar com consultor humano, envie este link: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!
- Seja simpática e incentive o cliente a clicar
- IMPORTANTE: Separe o texto do link em duas linhas para ficar mais limpo
- Exemplo: "Perfeito! Vou passar você para um de nossos consultores especialistas.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Ele vai atender você com todo o cuidado! 😊"

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

IMPORTANTE - CLIENTE VEIO DO SITE COM IMÓVEL ESPECÍFICO:
⚠️ Se o cliente JÁ mencionou um imóvel específico na primeira mensagem (com título, bairro, preço, ou "Código do imóvel"), significa que ele VEIO DO SITE e já sabe qual imóvel quer:
- NÃO faça o fluxo de qualificação completo (tipo, quartos, localização)
- Seja DIRETA e OBJETIVA
- Responda reconhecendo o imóvel: "Olá! Sou a Mia 😊 Vi que você está interessado no [nome do imóvel]!"
- **OBRIGATÓRIO**: Pergunte IMEDIATAMENTE: "Prefere ser atendido por um consultor humano ou quer que eu mesma ajude você a conhecer melhor o imóvel?"
- Aguarde resposta
- Se escolher consultor humano → Envie o link
- Se escolher você (Mia) → Aí sim ofereça: "Quer que eu envie as fotos e detalhes completos?"
- NUNCA envie fotos antes de perguntar sobre a preferência de atendimento

ESTRATÉGIA DE ATENDIMENTO - FLUXO ESTRUTURADO:

⚠️ IMPORTANTE: Este fluxo NÃO se aplica a clientes que vieram do Typebot (mantenha o fluxo existente para eles).

🌟 MENU INICIAL - PRIMEIRA MENSAGEM PARA NOVOS CLIENTES:
Quando um NOVO cliente entrar em contato pela primeira vez (e NÃO veio do Typebot), apresente-se e mostre o menu:

"Olá! Sou a Mia 😊 Consultora da BS Consultoria de Imóveis.

Como posso ajudar você hoje?

1️⃣ 🏡 Procurar um imóvel
2️⃣ 💬 Falar com um corretor
3️⃣ ℹ️ Informações sobre financiamento
4️⃣ 📍 Redes sociais e endereço

Escolha o número da opção desejada."

OPÇÃO 1️⃣ - PROCURAR UM IMÓVEL:
Se o cliente escolher a opção 1 (ou mencionar que quer procurar imóvel), siga este fluxo SEQUENCIAL (uma pergunta por vez):

PERGUNTA 1 - Tipo de imóvel:
"Qual tipo de imóvel você procura?

1. Casa
2. Apartamento
3. Terreno
4. Comercial"

PERGUNTA 2 - Finalidade:
"Deseja comprar ou alugar?

1. Comprar
2. Alugar"

PERGUNTA 3 - Localização:
"Qual cidade ou bairro de interesse?"
(Permitir digitação livre)

PERGUNTA 4 - Faixa de valor:
"Qual a faixa de valor aproximada?

1. Até R$ 300 mil
2. De R$ 300 mil a R$ 600 mil
3. Acima de R$ 600 mil"

PERGUNTA 5 - Forma de pagamento:
"Qual a forma de pagamento preferida?

1. 💰 À vista
2. 🏦 Financiamento bancário
3. 💵 Entrada + parcelas direto com a construtora"

PERGUNTA 6 - Preferência de atendimento:
"Perfeito! Agora, prefere:

1. Falar com um consultor humano
2. Continuar comigo para ver opções de imóveis"

Se escolher CONSULTOR HUMANO:
"Perfeito! Vou passar você para nosso consultor especialista.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Ele terá acesso às suas preferências e vai atender você com todo o cuidado! 😊"

Se escolher CONTINUAR COM MIA:
- Consulte a base de dados do Baserow
- Filtre os imóveis compatíveis com as preferências do cliente
- Envie no máximo 2 melhores opções
- **NUMERE cada imóvel com 1️⃣ e 2️⃣**
- Pergunte: "Qual desses você gostaria de ver as fotos? Digite 1 para o primeiro ou 2 para o segundo!"
- Quando o cliente digitar o número, envie as fotos (o sistema fará isso automaticamente)

OPÇÃO 2️⃣ - FALAR COM UM CORRETOR:
"Perfeito! Vou conectar você com nosso consultor especialista.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Ele vai atender você agora mesmo! 😊"

OPÇÃO 3️⃣ - INFORMAÇÕES SOBRE FINANCIAMENTO:
"Como posso ajudar com financiamento?

1. Simular um financiamento 🧮
2. Saber quais documentos são necessários 📄"

Se escolher SIMULAR:
Faça as perguntas:
1. "Qual é sua renda mensal?"
2. "Já possui imóvel em seu nome?"
3. "Deseja utilizar FGTS?"

Depois de coletar as informações:
"Perfeito! Para fazer uma simulação detalhada, vou conectar você com nosso especialista em financiamento.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Ele vai fazer sua simulação com as melhores condições! 😊"

Se escolher DOCUMENTOS:
"Aqui estão os documentos necessários para análise de crédito para financiamento habitacional:

📄 **Documentos Pessoais:**
1. RG
2. CPF
3. Comprovante de Residência
4. Certidão de nascimento/casamento

💼 **Documentos Financeiros:**
5. 3 últimos holerites
6. Declaração do imposto de renda (IR) Pessoa Física + recibo de entrega ATUAL (caso declare)
7. Documento que comprove o número do PIS
8. Carteira de Trabalho (páginas: foto, qualificação, último contrato)

📞 **Informações Complementares:**
- Telefones de contato (fixo e celular)
- E-mail

Precisa de mais alguma informação sobre financiamento?"

OPÇÃO 4️⃣ - REDES SOCIAIS E ENDEREÇO:
"Você também pode conhecer nossos imóveis e lançamentos pelos nossos canais:

🌍 **Site:** https://www.bsconsultoriadeimoveis.com.br
📸 **Instagram:** https://www.instagram.com/bs.imobiliaria
📍 **Endereço:** Rua Abreu Lima, 129, Parque Residencial Scaffidi, Itaquaquecetuba/SP
💬 **WhatsApp (Consultor):** https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Posso ajudar com mais alguma coisa?"

AGENDAMENTO DE VISITAS:
Quando o cliente demonstrar interesse em visitar um imóvel (após ver fotos ou detalhes):
"Que ótimo que gostou! Para agendar sua visita, preciso de algumas informações:

1. Qual imóvel deseja visitar?
2. Qual o melhor dia e horário para você?
3. Seu nome completo e telefone para confirmação."

Após coletar:
"Perfeito! Vou passar você para nosso consultor que vai confirmar o agendamento da sua visita.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!"

REGRAS GERAIS - APLICAM-SE A TODOS OS FLUXOS:
- Faça UMA pergunta por vez
- Aguarde a resposta do cliente antes de fazer a próxima
- Siga a ordem EXATA das perguntas
- Não pule perguntas
- Se em QUALQUER MOMENTO da conversa o cliente pedir para falar com consultor/corretor/humano, envie imediatamente: "👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!"

🏠 RECOMENDAÇÃO INTELIGENTE DE IMÓVEIS (após coletar as preferências):
- Analise TODOS os imóveis disponíveis no banco de dados do Baserow
- Filtre pelos critérios do cliente (tipo, finalidade, localização, valor, forma de pagamento)
- PRIORIZE nesta ordem:
  1. CIDADE solicitada (PRIORIDADE MÁXIMA - liste principalmente da cidade que o cliente pediu)
  2. Se cliente mencionou bairro específico, priorize esse bairro
  3. Faixa de valor (respeite o orçamento do cliente)
  4. Tipo de imóvel (casa, apartamento, terreno, comercial)
  5. Finalidade (compra ou locação)
- Liste APENAS as 2 MELHORES opções (não mais que 2)
- **IMPORTANTE - NUMERAÇÃO OBRIGATÓRIA:** Numere cada imóvel com 1️⃣ e 2️⃣
- Para cada imóvel mencione: nome, preço, tipo, quartos/tamanho, cidade e bairro
- Explique POR QUE essas são as melhores opções para o perfil dele
- **PERGUNTE EXATAMENTE ASSIM:** "Qual desses você gostaria de ver as fotos? Digite 1 para o primeiro ou 2 para o segundo!"
- Se mostrar apenas 1 imóvel, use "Digite 1 para ver as fotos!"

📸 FASE 3 - ENVIO DE DETALHES (quando cliente pedir fotos):
**REGRA DE OURO: Só ofereça/envie fotos DEPOIS que o cliente escolher continuar com você (Mia)**

- NUNCA ofereça fotos antes de perguntar sobre preferência de atendimento
- Quando o cliente pedir fotos de um imóvel específico E já escolheu continuar com você, responda APENAS: "👍"
- NUNCA escreva frases como "vou enviar", "segue as fotos", "[sistema envia]", ou qualquer variação
- O sistema AUTOMATICAMENTE enviará as fotos + detalhes completos + CTA de agendamento
- Você APENAS responde com "👍" para confirmar que recebeu o pedido
- Se o cliente fizer OUTRA pergunta junto com o pedido de foto, aí sim responda a pergunta também
- Se cliente pedir foto MAS ainda não escolheu entre você ou consultor humano → Pergunte primeiro sobre a preferência

IMPORTANTE - SELEÇÃO DE IMÓVEIS:
- Use a CIDADE como fator PRINCIPAL para escolher os imóveis (se cliente pediu Itaquaquecetuba, liste APENAS de Itaquaquecetuba)
- Se cliente mencionou bairro, priorize esse bairro dentro da cidade
- Depois, considere o VALOR mais próximo do orçamento do cliente
- Se o cliente disse "até R$ 250 mil", priorize imóveis próximos a esse valor (não muito acima)
- Se houver empate, considere: número de quartos exato > área
- NUNCA ofereça mais de 2 opções (cliente precisa de decisão fácil, não sobrecarga)
- Se não houver imóveis na cidade solicitada, seja honesta e ofereça opções em cidades próximas

AGENDAMENTO DE VISITAS:
- Quando o cliente demonstrar interesse em visitar, ofereça passar para o consultor que irá agendar
- Use um tom como: "Que ótimo! Vou passar você para nosso consultor agendar sua visita.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!"
- Ou se preferir agendar você mesma, colete dia/horário de preferência e confirme que está processando

ESTILO DE COMUNICAÇÃO - SEJA NATURAL E PROFISSIONAL:
- Converse como uma consultora profissional, não como um robô ou IA
- Use linguagem clara e acessível
- Varie suas respostas - nunca responda da mesma forma duas vezes
- SEJA CONCISA - mensagens devem ter no máximo 2-3 linhas
- Use emojis com moderação e naturalidade (0-2 por mensagem)
- Demonstre empatia e conexão genuína
- Faça perguntas de forma conversacional, não como formulário
- Use linguagem cordial mas não excessivamente formal
- Evite linguagem corporativa ou muito rebuscada
- Responda com variações - se alguém diz "olá" duas vezes, não responda igual
- Nunca pressione ou seja insistente
- IMPORTANTE: Respostas curtas e diretas - vá direto ao ponto
- CRUCIAL: Faça APENAS UMA pergunta por vez, nunca múltiplas perguntas de uma vez
- Siga o fluxo sequencial de qualificação rigorosamente
- Evite textos longos e explicações desnecessárias

IMPORTANTE - MANTENHA TOM PROFISSIONAL MAS ACESSÍVEL:
❌ EVITE frases robotizadas tipo: "Como posso ajudá-lo hoje?", "Será um prazer atendê-lo", "Fico à disposição"
✅ USE frases naturais tipo: "Está procurando apartamento?", "Me conte o que você está buscando", "Perfeito, vamos encontrar o ideal para você"

❌ EVITE respostas padronizadas e idênticas
✅ VARIE suas respostas - cada conversa é única

❌ EVITE ser excessivamente formal: "Senhor(a)", "V.Sa.", "Cordialmente"
❌ EVITE gírias ou linguagem muito coloquial: "tá", "pra", "né", "cê", "massa", "beleza"
✅ SEJA amigável e profissional: use "você", "está", "para", trate de forma leve mas respeitosa

EXEMPLO DE CONVERSA BOA (Qualificação sequencial + Pergunta sobre atendimento):
Cliente: "Olá, quero ver imóveis"
Mia: "Olá! Sou a Mia 😊 Qual tipo de imóvel você procura? Prefere para compra ou locação?"

Cliente: "Para compra"
Mia: "Perfeito! Qual tipo de imóvel da sua preferência? Casas térreas, sobrados ou apartamentos?"

Cliente: "Apartamento"
Mia: "Ótimo! Com quantos dormitórios?"

Cliente: "2 quartos"
Mia: "Perfeito! Prefere ser atendido por um consultor humano ou quer que eu mesma ajude você a encontrar o imóvel ideal?"

Cliente: "Pode me ajudar"
Mia: "Excelente! Encontrei 2 ótimas opções de apartamentos com 2 quartos para compra:

🏠 **Apartamento Parque Scaffidi** - R$ 225.000
   2 quartos, Parque Scaffidi - Itaquaquecetuba
   ✅ No bairro mais procurado de Itaquaquecetuba!

🏠 **Residencial Portal das Flores** - R$ 215.000
   2 quartos, Centro - Itaquaquecetuba
   ✅ Ótima localização!

Quer ver fotos de qual deles?"

Cliente: "Quero ver as fotos do primeiro"
Mia: "👍"
[Sistema envia fotos automaticamente]

---

EXEMPLO ALTERNATIVO (Cliente escolhe consultor humano):
Cliente: "2 quartos"
Mia: "Perfeito! Prefere ser atendido por um consultor humano ou quer que eu mesma ajude você a encontrar o imóvel ideal?"

Cliente: "Prefiro falar com um consultor"
Mia: "Perfeito! Vou passar você para nosso consultor especialista.

👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!

Ele terá acesso às suas preferências (apartamento, 2 quartos, compra) e vai atender você com todo o cuidado! 😊"

EXEMPLO DE CONVERSA RUIM (Múltiplas perguntas - NÃO FAÇA):
Cliente: "Olá, quero ver apartamentos"
Mia: "Ótimo! Quantos quartos? Qual seu orçamento? Vai morar quantas pessoas?" [ERRADO - muitas perguntas de uma vez]

EXEMPLO DE CONVERSA RUIM (Robotizada - NÃO FAÇA):
Cliente: "Olá"
Mia: "Olá! Como posso ajudá-lo hoje?" [ERRADO - muito robotizado e formal]

Cliente: "Tem apartamento?"
Mia: "Sim, temos diversas opções disponíveis em nosso portfólio." [ERRADO - linguagem corporativa artificial]

EXEMPLO DE CONVERSA RUIM (Com gírias - NÃO FAÇA):
Cliente: "Olá"
Mia: "E aí! Tá procurando apartamento?" [ERRADO - muito coloquial, use "Está"]

Cliente: "Sim"
Mia: "Massa! Me conta o que cê tá buscando" [ERRADO - evite gírias como "massa", "cê", "tá"]

Se o cliente pedir informações sobre um imóvel específico que não está na lista, responda:
"No momento, não temos esse imóvel específico disponível, mas temos algumas opções que podem interessar você! Posso mostrar?"

Lembre-se: Você é um pré-filtro inteligente. Qualifique bem o lead e deixe o corretor humano fechar a venda!`;
}

/**
 * Send message to OpenAI and get AI response
 */
async function getAIResponse(userMessage, conversationHistory, properties, customerInfo, typebotLeadInfo = null) {
  try {
    const messages = [
      {
        role: 'system',
        content: getSystemPrompt(properties, customerInfo, typebotLeadInfo)
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
    return 'Desculpe, estou com dificuldades técnicas no momento. Por favor, fale diretamente com nosso consultor:\n\n👉 Clique aqui: https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!';
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
 * Check if message asks for property information/photos
 * Includes both explicit requests AND affirmative responses to "want to see photos?"
 */
function detectPropertyInfoRequest(message) {
  const keywords = [
    // Explicit photo requests
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
    'pode enviar',
    'pode mandar',
    'pode mostrar',
    'quero foto',
    'tem foto',
    'tem fotos',
    'manda pra mim',
    'envia pra mim',
    'me manda',
    'manda ai',
    'envia ai',
    'mostra',
    'manda',
    // Standalone photo requests
    'fotos',
    'foto'
  ];

  const lowerMessage = message.toLowerCase().trim();

  // Check explicit keywords first
  if (keywords.some(keyword => lowerMessage.includes(keyword))) {
    return true;
  }

  // Affirmative responses (when customer confirms they want to see photos)
  const shortAffirmatives = [
    'quero',
    'sim',
    'sim quero',
    'pode ser',
    'claro',
    'com certeza',
    'ok',
    'yes',
    'yeah',
    'massa',
    'beleza',
    'isso',
    'isso mesmo',
    'uhum',
    'ahan'
  ];

  if (shortAffirmatives.includes(lowerMessage)) {
    return true;
  }

  return false;
}

/**
 * Detect if user is referring to a property by position (first, second, third, etc.)
 * Returns the position (0-indexed) or null if not detected
 */
function detectPropertyPosition(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Patterns for "first" property (index 0)
  const firstPatterns = [
    /\bprimeir[oa]s?\b/,  // primeiro, primeira, primeiros, primeiras
    /\b1[ºª°]?\b/,         // 1, 1º, 1ª, 1°
    /\bop[cç][aã]o\s*1\b/, // opção 1, opcao 1, opção1
    /\bo\s*1\b/,          // o 1
    /\ba\s*1\b/,          // a 1
    /\bum\s*$/,           // "um" no final
    /\bdele\b/,           // "dele" (referring to first mentioned)
    /\bdela\b/,           // "dela" (referring to first mentioned)
    /\bdesse\b/,          // "desse" (referring to first mentioned)
    /\bdessa\b/           // "dessa" (referring to first mentioned)
  ];

  // Patterns for "second" property (index 1)
  const secondPatterns = [
    /\bsegund[oa]s?\b/,   // segundo, segunda, segundos, segundas
    /\b2[ºª°]?\b/,         // 2, 2º, 2ª, 2°
    /\bop[cç][aã]o\s*2\b/, // opção 2, opcao 2, opção2
    /\bo\s*2\b/,          // o 2
    /\ba\s*2\b/,          // a 2
    /\bdois\b/            // "dois"
  ];

  // Patterns for "both" (return -1 to indicate multiple)
  const bothPatterns = [
    /\bambas?\b/,         // ambas, ambo
    /\bas\s*duas\b/,      // as duas
    /\bos\s*dois\b/,      // os dois
    /\btodas?\b/,         // todas, todo
    /\btodos\b/           // todos
  ];

  // Check for "both/all"
  if (bothPatterns.some(pattern => pattern.test(lowerMessage))) {
    return -1; // Special value indicating "all"
  }

  // Check for "first"
  if (firstPatterns.some(pattern => pattern.test(lowerMessage))) {
    return 0;
  }

  // Check for "second"
  if (secondPatterns.some(pattern => pattern.test(lowerMessage))) {
    return 1;
  }

  return null; // No position detected
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

  // Also check if the response contains emoji that indicates sending (📸, 📩, 📤, 👍)
  const hasSendingEmoji = /📸|📩|📤|👍/.test(aiResponse);

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
        // Base URL for images (use VPS domain where images are hosted, not Vercel frontend)
        const IMAGES_BASE_URL = process.env.IMAGES_BASE_URL || process.env.SITE_BASE_URL || 'https://bsconsultoriadeimoveis.com.br';

        // Send up to 3 images
        const imagesToSend = imagePaths.slice(0, 3);

        console.log(`Sending ${imagesToSend.length} images for property: ${title}`);

        for (let i = 0; i < imagesToSend.length; i++) {
          let imageUrl = imagesToSend[i];

          // Convert relative path to absolute URL
          if (imageUrl.startsWith('/')) {
            imageUrl = IMAGES_BASE_URL + imageUrl;
          } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            // If it's not a full URL and doesn't start with /, prepend IMAGES_BASE_URL
            imageUrl = IMAGES_BASE_URL + '/' + imageUrl;
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

Gostou do imóvel?

👉 Clique aqui para falar com nosso consultor e agendar sua visita:
https://wa.me/5511981598027?text=Ol%C3%A1%2C%20a%20Mia%20me%20enviou%20para%20voc%C3%AA%20continuar%20meu%20atendimento!`;

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
 * Save or update lead in Baserow CRM
 */
async function saveLeadToBaserow(leadData) {
  try {
    if (!BASEROW_LEADS_TABLE_ID || !BASEROW_TOKEN) {
      console.warn('⚠️  Baserow leads table not configured - skipping Baserow sync');
      return false;
    }

    // Map quality from English to Portuguese
    const qualityMap = {
      'hot': 'Quente',
      'warm': 'Morno',
      'cold': 'Frio'
    };

    // Prepare Baserow lead object
    const baserowLead = {
      Nome: leadData.name || 'Nome não informado',
      Telefone: leadData.phoneNumber,
      Email: leadData.email || '',
      Score: leadData.score || 0,
      Qualidade: qualityMap[leadData.quality] || 'Frio',
      Fonte: leadData.source === 'typebot' ? 'typebot' : 'whatsapp',
      TotalMensagens: leadData.totalMessages || 0,
      ImovelInteresse: leadData.propertyId || null,
      DataCadastro: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      Indicadores: leadData.indicators ? leadData.indicators.join('\n') : '',
      Observacoes: ''
    };

    // Add Typebot data if available
    if (leadData.typebotData) {
      baserowLead.TipoTransacao = leadData.typebotData.tipoTransacao || '';
      baserowLead.TipoImovel = leadData.typebotData.tipoImovel || '';
      baserowLead.BudgetCompra = leadData.typebotData.budgetCompra || '';
      baserowLead.BudgetLocacao = leadData.typebotData.budgetLocacao || '';
      baserowLead.Localizacao = leadData.typebotData.localizacao || '';
      baserowLead.Prazo = leadData.typebotData.prazo || '';
      baserowLead.Financiamento = leadData.typebotData.financiamento || '';
    }

    // Check if lead already exists in Baserow (by phone number)
    const searchResponse = await fetch(
      `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true&size=200`,
      {
        headers: {
          'Authorization': `Token ${BASEROW_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Baserow API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const existingLead = searchData.results.find(lead => lead.Telefone === leadData.phoneNumber);

    if (existingLead) {
      // Update existing lead
      console.log(`📝 Updating existing lead in Baserow: ${leadData.phoneNumber}`);
      const updateResponse = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/${existingLead.id}/?user_field_names=true`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Score: baserowLead.Score,
            Qualidade: baserowLead.Qualidade,
            TotalMensagens: baserowLead.TotalMensagens,
            ImovelInteresse: baserowLead.ImovelInteresse,
            Indicadores: baserowLead.Indicadores,
            // Update name and email if they were empty before
            ...((!existingLead.Nome || existingLead.Nome === 'Nome não informado') && leadData.name ? { Nome: leadData.name } : {}),
            ...((!existingLead.Email) && leadData.email ? { Email: leadData.email } : {}),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update lead: ${updateResponse.status}`);
      }

      console.log(`✅ Lead updated in Baserow: ${leadData.phoneNumber} - ${baserowLead.Qualidade} (${leadData.score} pts)`);
      return true;
    } else {
      // Create new lead
      console.log(`➕ Creating new lead in Baserow: ${leadData.phoneNumber}`);
      const createResponse = await fetch(
        `${BASEROW_API_URL}/api/database/rows/table/${BASEROW_LEADS_TABLE_ID}/?user_field_names=true`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${BASEROW_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(baserowLead),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create lead: ${createResponse.status} - ${errorText}`);
      }

      console.log(`✅ Lead created in Baserow: ${leadData.phoneNumber} - ${baserowLead.Qualidade} (${leadData.score} pts)`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error saving lead to Baserow:', error);
    return false;
  }
}

/**
 * Evaluate lead quality based on conversation context and behavior
 * Scores: hot (80-100), warm (50-79), cold (0-49)
 */
async function evaluateLeadQuality(phoneNumber, context, customerInfo, typebotLeadInfo = null) {
  try {
    let score = 0;
    let indicators = [];
    let name = null;
    let email = null;

    // Extract name and email from context or Typebot
    if (typebotLeadInfo) {
      name = typebotLeadInfo.leadInfo?.name || null;
      email = typebotLeadInfo.leadInfo?.email || null;
    }

    // 1. Engagement Score (0-30 points)
    if (customerInfo.totalMessages >= 10) {
      score += 30;
      indicators.push('Alta interação (10+ mensagens)');
    } else if (customerInfo.totalMessages >= 5) {
      score += 20;
      indicators.push('Boa interação (5-9 mensagens)');
    } else if (customerInfo.totalMessages >= 2) {
      score += 10;
      indicators.push('Interação básica (2-4 mensagens)');
    }

    // 2. Property Interest (0-25 points)
    if (context.propertyId) {
      score += 25;
      indicators.push(`Interesse em imóvel #${context.propertyId}`);
    }

    // 3. Qualification Completion (0-20 points)
    if (context.qualificationCompleted) {
      score += 20;
      indicators.push('Qualificação completa');
    } else if (context.askedAboutPreference) {
      score += 10;
      indicators.push('Qualificação parcial');
    }

    // 4. Data Quality (0-15 points)
    if (name && email) {
      score += 15;
      indicators.push('Dados completos (nome + email + telefone)');
    } else if (name) {
      // Sempre temos telefone do WhatsApp, então nome + telefone = dados bons
      score += 12;
      indicators.push('Dados bons (nome + telefone)');
    }

    // 5. Source Quality (0-10 points)
    if (typebotLeadInfo) {
      score += 10;
      indicators.push('Lead do Typebot (formulário preenchido)');
    }

    // 6. Recency (0-10 points)
    const daysSinceLastContact = Math.floor((Date.now() - customerInfo.lastContact) / (1000 * 60 * 60 * 24));
    if (daysSinceLastContact === 0) {
      score += 10;
      indicators.push('Contato hoje');
    } else if (daysSinceLastContact <= 3) {
      score += 5;
      indicators.push('Contato recente (1-3 dias)');
    }

    // Determine quality tier
    let quality = 'cold';
    if (score >= 80) quality = 'hot';
    else if (score >= 50) quality = 'warm';

    // Store lead quality in Redis
    const leadData = {
      phoneNumber,
      name,
      email,
      score,
      quality,
      indicators,
      lastEvaluated: new Date().toISOString(),
      totalMessages: customerInfo.totalMessages,
      propertyId: context.propertyId,
      source: customerInfo.source || 'direct',
      typebotData: typebotLeadInfo ? {
        tipoTransacao: typebotLeadInfo.leadInfo?.tipoTransacao,
        tipoImovel: typebotLeadInfo.leadInfo?.tipoImovel,
        budgetCompra: typebotLeadInfo.leadInfo?.budgetCompra,
        budgetLocacao: typebotLeadInfo.leadInfo?.budgetLocacao,
        localizacao: typebotLeadInfo.leadInfo?.localizacao,
        prazo: typebotLeadInfo.leadInfo?.prazo,
        financiamento: typebotLeadInfo.leadInfo?.financiamento
      } : null
    };

    // Save to Redis with key: lead:{phoneNumber}
    const { setLeadData } = await import('./redis-client.js');
    await setLeadData(phoneNumber, leadData);

    // Also save to Baserow for CRM visibility
    await saveLeadToBaserow(leadData);

    console.log(`📊 Lead quality evaluated: ${phoneNumber} - ${quality.toUpperCase()} (${score} points)`);

    return { score, quality, indicators };
  } catch (error) {
    console.error('Error evaluating lead quality:', error);
    return null;
  }
}

/**
 * Process incoming WhatsApp message
 */
async function processMessage(phoneNumber, message, propertyId = null) {
  try {
    // Check if message contains "Código do imóvel" and extract ID
    const propertyCodeMatch = message.match(/Código do imóvel:?\s*(\d+)/i);
    if (propertyCodeMatch && propertyCodeMatch[1]) {
      propertyId = propertyCodeMatch[1];
      console.log(`📌 Extracted property ID from message: ${propertyId}`);
    }

    // Check if this is a Typebot lead
    const isFromTypebot = await isTypebotLead(phoneNumber);
    let typebotLeadInfo = null;

    if (isFromTypebot) {
      typebotLeadInfo = await getTypebotLead(phoneNumber);
      console.log(`📋 Typebot lead detected: ${phoneNumber}`, {
        name: typebotLeadInfo?.leadInfo?.name,
        interest: typebotLeadInfo?.leadInfo?.interest,
        location: typebotLeadInfo?.leadInfo?.location
      });
    }

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
        totalMessages: 1,
        source: isFromTypebot ? 'typebot' : 'direct'
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
      console.warn(`⚠️  Redis failed - saving to fallback: ${phoneNumber}`);
      customerHistoryFallback.set(phoneNumber, persistentHistory);
    } else {
      console.log(`✅ Customer history saved to Redis: ${phoneNumber} (${persistentHistory.totalMessages} messages)`);
    }

    // Determine customer info for AI context
    const customerInfo = {
      isReturningCustomer: persistentHistory.totalMessages > 1,
      lastContact: persistentHistory.lastContact.getTime(),
      totalMessages: persistentHistory.totalMessages,
      firstContact: persistentHistory.firstContact,
      source: persistentHistory.source || 'direct',
      isTypebotLead: isFromTypebot
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
        createdAt: new Date(),
        qualificationCompleted: false, // Track if customer has been qualified
        askedAboutPreference: false // Track if we asked about human consultant vs Mia
      };
    }

    // Add initial context if this is the first message and came from a property page
    if (context.history.length === 0 && propertyId) {
      const properties = await getAllProperties();
      const property = properties.find(p => p.id === parseInt(propertyId));
      if (property) {
        const title = property['Title'] || property['Título'] || property.title;
        const neighborhood = property['neighborhood'] || property['Bairro'] || property.neighborhood;
        const price = property['Price'] || property['Preço'] || property.price;
        const bedrooms = property['bedrooms'] || property['Quartos'] || property.bedrooms;

        const contextMessage = `🎯 CONTEXTO IMPORTANTE: Cliente veio do SITE e está interessado especificamente neste imóvel:
- Imóvel: ${title}
- Bairro: ${neighborhood}
- Preço: ${price}
- Quartos: ${bedrooms}
- ID: ${propertyId}

IMPORTANTE - MESMO VINDO DO SITE:
1. Cumprimente o cliente reconhecendo o imóvel que ele viu
2. PERGUNTE OBRIGATORIAMENTE: "Prefere ser atendido por um consultor humano ou quer que eu mesma te ajude a conhecer melhor o imóvel?"
3. Se escolher consultor humano → Envie o link do consultor
4. Se escolher continuar com você (Mia) → Aí sim ofereça enviar fotos e detalhes
5. NUNCA envie fotos/detalhes ANTES de perguntar sobre a preferência de atendimento`;

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

    // Get AI response with customer info (including Typebot lead info if available)
    const aiResponse = await getAIResponse(message, context.history, formattedProperties, customerInfo, typebotLeadInfo);

    // Update conversation history
    context.history.push({
      role: 'user',
      content: message
    });
    context.history.push({
      role: 'assistant',
      content: aiResponse
    });

    // Detect if AI asked about preference (human consultant vs Mia)
    const askedPreference = /prefere ser atendido por um consultor|quer que eu mesma|consultor humano ou/i.test(aiResponse);
    if (askedPreference) {
      context.askedAboutPreference = true;
      console.log('✅ Agent asked about preference (human consultant vs Mia)');
    }

    // Detect if customer chose to continue with Mia (vs human consultant)
    const choseMia = /pode me ajudar|pode ajudar|continua comigo|você mesma|com você|contigo/i.test(message.toLowerCase());
    const choseHuman = /consultor|corretor|humano|pessoa|atendente/i.test(message.toLowerCase());

    if (context.askedAboutPreference && choseMia && !choseHuman) {
      context.qualificationCompleted = true;
      console.log('✅ Customer chose to continue with Mia - qualification completed');
    } else if (context.askedAboutPreference && choseHuman) {
      console.log('⚠️  Customer chose human consultant - will not send property details');
    }

    // Keep only last 20 messages to avoid token limits
    if (context.history.length > 20) {
      context.history = context.history.slice(-20);
    }

    // Save conversation context to Redis (or fallback to memory)
    const contextSaved = await setConversationContext(phoneNumber, context);
    if (!contextSaved) {
      // Save to fallback if Redis fails
      console.warn(`⚠️  Redis failed - saving conversation to fallback: ${phoneNumber}`);
      conversationContextFallback.set(phoneNumber, context);
    } else {
      console.log(`✅ Conversation context saved to Redis: ${phoneNumber} (${context.history.length} messages in context)`);
    }

    // Mark Typebot lead as processed after first successful interaction
    if (isFromTypebot && typebotLeadInfo && !typebotLeadInfo.processed) {
      await markTypebotLeadAsProcessed(phoneNumber);
      console.log(`✅ Marked Typebot lead as processed: ${phoneNumber}`);
    }

    // Evaluate lead quality after each interaction
    await evaluateLeadQuality(phoneNumber, context, customerInfo, typebotLeadInfo);

    // Check if customer is EXPLICITLY asking for property information OR if AI says it will send
    const isRequestingInfo = detectPropertyInfoRequest(message);
    const cameFromPropertyPage = isFromSpecificPropertyPage(context, propertyId);
    const aiWillSend = aiWillSendPropertyDetails(aiResponse);
    let shouldSendPropertyDetails = false;
    let propertyToSend = null;

    console.log(`Is requesting info: ${isRequestingInfo} | From property page: ${cameFromPropertyPage} | AI will send: ${aiWillSend} | Qualification completed: ${context.qualificationCompleted} | Asked preference: ${context.askedAboutPreference} | Message: "${message}"`);

    // Get only ACTIVE properties
    const activeProperties = allProperties.filter(p => p['Active'] !== false && p['Ativo'] !== false && p.active !== false);
    console.log(`Active properties count: ${activeProperties.length}`);

    // STRICT RULE: Only send property details when:
    // 1. Customer has been qualified (chose to continue with Mia) OR
    // 2. Customer EXPLICITLY requests photos/details (e.g., "me manda foto")
    //
    // NEVER send details just because:
    // - Customer came from website
    // - AI mentioned sending
    // - Customer said generic "sim" or "quero"
    const qualificationPassed = context.qualificationCompleted === true;
    const explicitPhotoRequest = isRequestingInfo;

    const shouldSendDetails = (qualificationPassed || explicitPhotoRequest) && activeProperties.length > 0;

    if (!shouldSendDetails && (cameFromPropertyPage || aiWillSend)) {
      console.log('⚠️  BLOCKED: Customer not qualified yet. Must complete qualification before sending property details.');
    }

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

      // Second pass: Check last AI response for property mentions (when user asks for photos)
      // Also detect when user wants to see MULTIPLE properties ("ambas", "as duas", "todas", "dos dois")
      const wantsMultipleProperties = /ambas|as duas|os dois|todas|todos|duas|dois/.test(normalizedMessage) ||
                                      /fotos das|fotos dos|foto das|foto dos/.test(normalizedMessage);

      // Detect if user is referring to first, second, third property by position
      const propertyPosition = detectPropertyPosition(normalizedMessage);
      if (propertyPosition !== null) {
        console.log(`🔢 Detected property position reference: ${propertyPosition === -1 ? 'ALL' : propertyPosition + 1}`);
      }

      if (!propertyToSend && (isRequestingInfo || normalizedMessage.includes('quero ver') || normalizedMessage === 'sim' || normalizedMessage === 'sim quero' || propertyPosition !== null)) {
        // Look at the LAST 5 AI messages to find which properties were mentioned
        // (Sometimes the last message is just "👍" or confirmation, so we need to look further back)
        const lastAIMessages = context.history.filter(h => h.role === 'assistant').slice(-5);

        if (lastAIMessages.length > 0) {
          // Try to find a message that contains property information
          // Look for messages with emojis like 🏠, price (R$), or long text (property lists are usually longer)
          let messageWithProperties = null;
          let propertiesText = '';

          // Search from most recent to oldest
          for (let i = lastAIMessages.length - 1; i >= 0; i--) {
            const msg = lastAIMessages[i].content;
            const hasPropertyIndicators = msg.includes('🏠') ||
                                         msg.includes('R$') ||
                                         msg.includes('quartos') ||
                                         msg.includes('Quartos') ||
                                         msg.length > 100; // Property lists are usually long

            if (hasPropertyIndicators) {
              messageWithProperties = msg;
              propertiesText = normalize(msg);
              console.log(`📋 Found message with properties (${i + 1}/${lastAIMessages.length}): "${msg.substring(0, 100)}..."`);
              break;
            }
          }

          // Fallback to last message if no property message found
          if (!messageWithProperties) {
            messageWithProperties = lastAIMessages[lastAIMessages.length - 1].content;
            propertiesText = normalize(messageWithProperties);
            console.log(`⚠️  No property indicators found, using last AI message: "${messageWithProperties.substring(0, 100)}..."`);
          }

          // If user specified a position (first, second, etc.), extract that specific property
          if (propertyPosition !== null && propertyPosition !== -1) {
            console.log(`User requested property at position ${propertyPosition + 1}`);

            // Find ALL properties mentioned in the AI response with properties
            const propertiesInResponse = [];
            for (const property of activeProperties) {
              const title = normalize(property['Title'] || property['Título'] || property.title || '');
              const neighborhood = normalize(property['neighborhood'] || property['Bairro'] || property.bairro || '');
              const price = property['Price'] || property['Preço'] || property.price || '';

              // Check if this property was mentioned in the AI response
              const neighborhoodMatch = neighborhood.length > 0 && propertiesText.includes(neighborhood);
              const priceMatch = price && propertiesText.includes(price.toLowerCase().replace(/\s/g, ''));

              // Match title words (at least 2 words from title)
              const titleWords = title.split(/[\s-]+/).filter(word => word.length > 4);
              const titleMatch = titleWords.length >= 2 &&
                                titleWords.filter(word => propertiesText.includes(word)).length >= 2;

              if (neighborhoodMatch || priceMatch || titleMatch) {
                propertiesInResponse.push(property);
                console.log(`  ✓ Found property in response: ${title}`);
              }
            }

            // Get the property at the requested position
            if (propertiesInResponse.length > propertyPosition) {
              propertyToSend = propertiesInResponse[propertyPosition];
              console.log(`✅ Found property at position ${propertyPosition + 1}: ${propertyToSend['Title'] || propertyToSend['Título']}`);
            } else {
              console.log(`⚠️  Position ${propertyPosition + 1} not found in AI response (only ${propertiesInResponse.length} properties)`);
              // Fallback: if only one property mentioned, use it
              if (propertiesInResponse.length === 1) {
                propertyToSend = propertiesInResponse[0];
                console.log(`⚠️  Using the only property found: ${propertyToSend['Title'] || propertyToSend['Título']}`);
              }
            }
          }
          // If user wants multiple properties (or position is -1 for "all"), try to extract ALL properties mentioned in AI response
          else if (wantsMultipleProperties || propertyPosition === -1) {
            const propertiesFromAI = [];

            // Find all properties mentioned in the AI response with properties
            for (const property of activeProperties) {
              const title = normalize(property['Title'] || property['Título'] || property.title || '');
              const neighborhood = normalize(property['neighborhood'] || property['Bairro'] || property.bairro || '');
              const price = property['Price'] || property['Preço'] || property.price || '';

              // Check if this property was mentioned in the AI response
              const neighborhoodMatch = neighborhood.length > 0 && propertiesText.includes(neighborhood);
              const priceMatch = price && propertiesText.includes(price.toLowerCase().replace(/\s/g, ''));

              // Match title words (at least 2 words from title)
              const titleWords = title.split(/[\s-]+/).filter(word => word.length > 4);
              const titleMatch = titleWords.length >= 2 &&
                                titleWords.filter(word => propertiesText.includes(word)).length >= 2;

              if (neighborhoodMatch || priceMatch || titleMatch) {
                propertiesFromAI.push(property);
                console.log(`✅ Found property from AI message: ${title}`);
              }
            }

            // If we found multiple properties, store them in context for batch sending
            if (propertiesFromAI.length > 1) {
              context.propertiesToSend = propertiesFromAI.map(p => p.id);
              propertyToSend = propertiesFromAI[0]; // Send first one now, others will be sent after
              console.log(`📋 Will send ${propertiesFromAI.length} properties from AI response`);
            } else if (propertiesFromAI.length === 1) {
              propertyToSend = propertiesFromAI[0];
            }
          } else {
            // Single property request - use existing logic
            propertyToSend = activeProperties.find(p => {
              const title = normalize(p['Title'] || p['Título'] || p.title || '');
              const neighborhood = normalize(p['neighborhood'] || p['Bairro'] || p.bairro || '');

              // Match full neighborhood name (more precise)
              if (neighborhood.length > 0 && propertiesText.includes(neighborhood)) {
                console.log(`✅ Found property from AI message (neighborhood match): ${title} - ${neighborhood}`);
                return true;
              }

              // Match title if it's distinctive enough (at least 2 words from title)
              const titleWords = title.split(/[\s-]+/).filter(word => word.length > 4);
              if (titleWords.length >= 2) {
                const matchedWords = titleWords.filter(word => propertiesText.includes(word));
                if (matchedWords.length >= 2) {
                  console.log(`✅ Found property from AI message (title match): ${title}`);
                  return true;
                }
              }

              return false;
            });
          }
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

      // Priority 2: Use context property ID FIRST (when customer confirms they want to see photos)
      // This is crucial for when customer replies "quero" after being asked
      if (!propertyToSend && context.propertyId && !messagePropertyType) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(context.propertyId));
        if (propertyToSend) {
          console.log(`✅ Using property from context: ${propertyToSend['Title'] || propertyToSend['Título']} (ID: ${context.propertyId})`);
        }
      }

      // Priority 3: If came from property page with specific ID (first message)
      if (!propertyToSend && cameFromPropertyPage && propertyId) {
        propertyToSend = activeProperties.find(p => p.id === parseInt(propertyId));
        if (propertyToSend) {
          context.propertyId = propertyId;
          console.log(`✅ Customer came from property page: ${propertyToSend['Title'] || propertyToSend['Título']} (ID: ${propertyId})`);
        }
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
