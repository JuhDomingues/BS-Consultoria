/**
 * Vercel Serverless Function - Typebot Webhook
 * Recebe leads do Typebot e armazena informações para o Agente SDR usar
 */

import { saveTypebotLead } from '../server/typebot-service.js';

export default async function handler(req, res) {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== Received Typebot Webhook ===');
    console.log(JSON.stringify(req.body, null, 2));

    const typebotData = req.body;

    // Extrair informações do Typebot
    // O formato pode variar dependendo de como você configurou o Typebot
    // Ajuste conforme necessário
    const phoneNumber = extractPhoneNumber(typebotData);

    if (!phoneNumber) {
      console.error('Phone number not found in Typebot data');
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Extrair todas as respostas do lead
    const leadInfo = extractLeadInfo(typebotData);

    console.log(`Processing Typebot lead: ${phoneNumber}`);
    console.log('Lead info:', leadInfo);

    // Salvar informações do lead para o agente SDR usar
    await saveTypebotLead(phoneNumber, leadInfo);

    console.log(`Typebot lead saved successfully: ${phoneNumber}`);

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      message: 'Lead received and stored',
      phoneNumber: phoneNumber
    });
  } catch (error) {
    console.error('Error processing Typebot webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Extract phone number from Typebot data
 * Ajuste esta função conforme o formato dos seus dados
 */
function extractPhoneNumber(typebotData) {
  // Procurar em diferentes possíveis localizações

  // Opção 1: Campo direto
  if (typebotData.phone || typebotData.phoneNumber || typebotData.telefone) {
    return cleanPhoneNumber(typebotData.phone || typebotData.phoneNumber || typebotData.telefone);
  }

  // Opção 2: Dentro de answers/variables
  if (typebotData.answers) {
    for (const answer of typebotData.answers) {
      if (answer.blockId?.includes('phone') ||
          answer.blockId?.includes('telefone') ||
          answer.variableId?.includes('phone') ||
          answer.variableId?.includes('telefone')) {
        return cleanPhoneNumber(answer.value);
      }
    }
  }

  // Opção 3: Dentro de variables
  if (typebotData.variables) {
    const phoneVar = typebotData.variables.find(v =>
      v.name?.toLowerCase().includes('phone') ||
      v.name?.toLowerCase().includes('telefone')
    );
    if (phoneVar) {
      return cleanPhoneNumber(phoneVar.value);
    }
  }

  return null;
}

/**
 * Extract all lead information from Typebot data
 */
function extractLeadInfo(typebotData) {
  const leadInfo = {
    source: 'typebot',
    timestamp: new Date().toISOString(),
    rawData: typebotData,
    answers: {},
    variables: {}
  };

  // Extrair respostas do lead
  if (typebotData.answers) {
    typebotData.answers.forEach(answer => {
      const key = answer.blockId || answer.variableId || `answer_${typebotData.answers.indexOf(answer)}`;
      leadInfo.answers[key] = answer.value;
    });
  }

  // Extrair variáveis
  if (typebotData.variables) {
    typebotData.variables.forEach(variable => {
      leadInfo.variables[variable.name] = variable.value;
    });
  }

  // Extrair campos básicos
  leadInfo.name = extractField(typebotData, ['name', 'nome', 'customerName']);
  leadInfo.email = extractField(typebotData, ['email', 'emailAddress']);
  leadInfo.phone = extractField(typebotData, ['phone', 'phoneNumber', 'telefone']);

  // Extrair campos específicos do formulário BS Consultoria
  leadInfo.tipoTransacao = extractField(typebotData, ['tipoTransacao', 'tipo_transacao', 'transacao', 'procurando', 'objetivo']);
  leadInfo.tipoImovel = extractField(typebotData, ['tipoImovel', 'tipo_imovel', 'tipo', 'propertyType', 'imovel']);
  leadInfo.budgetCompra = extractField(typebotData, ['budgetCompra', 'budget_compra', 'valorCompra', 'faixaValorCompra', 'orcamentoCompra']);
  leadInfo.budgetLocacao = extractField(typebotData, ['budgetLocacao', 'budget_locacao', 'valorLocacao', 'faixaValorLocacao', 'orcamentoLocacao', 'aluguel']);
  leadInfo.localizacao = extractField(typebotData, ['localizacao', 'location', 'bairro', 'regiao', 'cidade']);
  leadInfo.prazo = extractField(typebotData, ['prazo', 'prazoMudanca', 'prazo_mudanca', 'quando', 'urgencia']);
  leadInfo.financiamento = extractField(typebotData, ['financiamento', 'situacaoFinanceira', 'situacao_financeira', 'pagamento']);

  // Campos opcionais
  leadInfo.message = extractField(typebotData, ['message', 'mensagem', 'observacoes', 'comentario']);

  return leadInfo;
}

/**
 * Extract field from Typebot data by checking multiple possible field names
 */
function extractField(typebotData, possibleNames) {
  // Check direct fields
  for (const name of possibleNames) {
    if (typebotData[name]) {
      return typebotData[name];
    }
  }

  // Check in answers
  if (typebotData.answers) {
    for (const answer of typebotData.answers) {
      const blockId = (answer.blockId || '').toLowerCase();
      const variableId = (answer.variableId || '').toLowerCase();

      for (const name of possibleNames) {
        if (blockId.includes(name.toLowerCase()) || variableId.includes(name.toLowerCase())) {
          return answer.value;
        }
      }
    }
  }

  // Check in variables
  if (typebotData.variables) {
    for (const variable of typebotData.variables) {
      const varName = (variable.name || '').toLowerCase();

      for (const name of possibleNames) {
        if (varName.includes(name.toLowerCase())) {
          return variable.value;
        }
      }
    }
  }

  return null;
}

/**
 * Clean and format phone number
 */
function cleanPhoneNumber(phone) {
  if (!phone) return null;

  // Remove tudo exceto números
  let cleaned = phone.toString().replace(/\D/g, '');

  // Se não tem código do país, adicionar +55 (Brasil)
  if (cleaned.length === 11 || cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }

  // Remover o + se existir
  cleaned = cleaned.replace(/^\+/, '');

  return cleaned;
}
