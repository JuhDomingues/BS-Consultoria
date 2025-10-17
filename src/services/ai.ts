import { Property } from "@/utils/parsePropertyData";

interface AIPropertyInput {
  images: File[];
  type: string;
  category: string;
  location: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  area: string;
  briefDescription: string;
}

/**
 * Convert image file to base64
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get media type from file
 */
function getMediaType(file: File): string {
  const type = file.type;
  if (type.includes('png')) return 'image/png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'image/jpeg';
  if (type.includes('webp')) return 'image/webp';
  if (type.includes('gif')) return 'image/gif';
  return 'image/jpeg'; // default
}

/**
 * Generate property data using Claude AI
 */
export async function generatePropertyWithAI(
  input: AIPropertyInput
): Promise<Partial<Property>> {
  try {
    console.log('Starting AI generation...', {
      imageCount: input.images.length,
      hasApiKey: !!import.meta.env.VITE_OPENAI_API_KEY
    });

    // Convert images to base64
    console.log('Converting images to base64...');
    const imageContents = await Promise.all(
      input.images.slice(0, 5).map(async (file) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: getMediaType(file),
          data: await imageToBase64(file),
        },
      }))
    );
    console.log('Images converted:', imageContents.length);

    // Build the prompt
    const prompt = `Você é um especialista em marketing imobiliário no Brasil. Analise as imagens fornecidas e a descrição abaixo para criar um anúncio profissional e extremamente atraente de imóvel.

INFORMAÇÕES DO IMÓVEL:
- Tipo: ${input.type}
- Categoria: ${input.category}
- Localização: ${input.location}
${input.price ? `- Preço: ${input.price}` : ''}
${input.bedrooms ? `- Quartos: ${input.bedrooms}` : ''}
${input.bathrooms ? `- Banheiros: ${input.bathrooms}` : ''}
${input.parkingSpaces ? `- Vagas: ${input.parkingSpaces}` : ''}
${input.area ? `- Área: ${input.area}m²` : ''}

DESCRIÇÃO FORNECIDA:
${input.briefDescription}

TAREFA:
Com base nas imagens e nas informações acima, gere:

1. **TÍTULO**: Um título IMPACTANTE e ATRAENTE para o anúncio (60-100 caracteres)
   - Use linguagem persuasiva e emocionante
   - Destaque o PRINCIPAL diferencial do imóvel
   - SEMPRE inclua o nome do bairro/região da localização no título
   - Inclua emojis relevantes (1-2 emojis no máximo)
   - Exemplos de títulos atraentes:
     * "✨ Apartamento Moderno com Varanda Gourmet - Parque Scaffidi"
     * "🏡 Sobrado Espaçoso e Iluminado - Ideal para Famílias!"
     * "🌟 Casa de Alto Padrão com Piscina - Condomínio Fechado"
   - Evite títulos genéricos como "Apartamento para Venda"

2. **PREÇO**: ${input.price ? `Use EXATAMENTE o preço fornecido: ${input.price}` : 'Sugira um preço justo em reais (formato: R$ XXX.XXX,XX)'}
   ${!input.price ? '- Base sua estimativa no tipo, localização, tamanho e acabamentos visíveis\n   - Para Locação, sugira valores mensais típicos\n   - Para Venda, sugira valores de mercado' : ''}

3. **DESCRIÇÃO COMPLETA**: Uma descrição profissional, visualmente atraente e PERSUASIVA (250-450 palavras) que:

   **ESTRUTURA OBRIGATÓRIA (com quebras de linha entre parágrafos):**

   - **Parágrafo 1**: Abertura IMPACTANTE destacando o principal diferencial (use emojis relevantes)

   - **Parágrafo 2**: Descreva os cômodos principais e suas características (sala, quartos, cozinha)

   - **Parágrafo 3**: Detalhe acabamentos, diferenciais e qualidades visíveis nas fotos

   - **Seção de Destaques**: Crie uma seção com título seguido de dois pontos e lista de características importantes
     Exemplo:
     Destaques do Imóvel:
     - 3 dormitórios sendo 1 suíte com closet
     - Cozinha planejada com acabamento premium
     - Varanda gourmet com churrasqueira
     - 2 vagas de garagem cobertas

   - **Parágrafo sobre Localização**: Informações sobre "${input.location}", destacando infraestrutura e conveniências próximas

   - **Parágrafo Final**: Call-to-action convincente e urgente

   **REGRAS DE FORMATAÇÃO VISUAL (MUITO IMPORTANTE):**
   - Use emojis estrategicamente ao longo do texto (5-8 emojis no total)
   - Coloque quebras de linha duplas (\\n\\n) entre CADA parágrafo
   - **DESTAQUE pontos importantes** usando **asteriscos duplos** ao redor de palavras/frases chave (ex: **ampla varanda gourmet**, **localização privilegiada**)
   - Para títulos de seções, use formato "Título:" (primeira letra maiúscula seguida de dois pontos)
   - Para listas, use hífen "-" no início de cada item
   - Destaque entre 8-12 palavras ou frases importantes com ** ao longo da descrição
   - Use linguagem persuasiva e emocionante
   - Destaque benefícios, não apenas características
   - Seja honesto mas entusiasta
   - Crie senso de urgência e exclusividade

   **EXEMPLO DE FORMATAÇÃO:**
   "Este **magnífico apartamento** oferece o equilíbrio perfeito entre conforto e sofisticação! Com **acabamentos de primeira linha** e **layout funcional**, é ideal para famílias que buscam qualidade de vida.

   O imóvel conta com sala ampla integrada à varanda, 3 dormitórios com **armários planejados**, sendo 1 suíte master, cozinha **completa e moderna**, e área de serviço independente.

   Destaques do Imóvel:
   - Varanda gourmet com churrasqueira
   - Piso porcelanato em todos os ambientes
   - 2 vagas de garagem cobertas
   - Condomínio com área de lazer completa

   Localizado em **região privilegiada** próximo a escolas, mercados e transporte público. **Agende sua visita e apaixone-se!**"

FORMATO DE RESPOSTA:
Responda APENAS com um JSON válido no seguinte formato:
{
  "title": "título aqui (DEVE incluir o nome do bairro/região)",
  "price": "R$ XXX.XXX,XX",
  "description": "descrição completa aqui com quebras de linha \\n\\n entre parágrafos (DEVE mencionar a localização ${input.location} no texto)",
  "location": "${input.location}",
  "city": "APENAS o nome da cidade",
  "neighborhood": "APENAS o nome do bairro",
  "address": "endereço completo do imóvel se identificável na localização"
}

INSTRUÇÕES PARA EXTRAIR LOCALIZAÇÃO "${input.location}":
- Analise o texto "${input.location}" e identifique qual parte é o BAIRRO e qual parte é a CIDADE
- O campo "city" deve conter SOMENTE o nome da cidade (ex: "Itaquaquecetuba", "Arujá", "São Paulo")
- O campo "neighborhood" deve conter SOMENTE o nome do bairro/região (ex: "Parque Scaffidi", "Centro", "Vila Maria")
- O campo "address" deve conter um endereço se for possível identificar (ex: "Rua das Flores, 123") ou deixar vazio se não houver
- NÃO coloque vírgulas ou texto adicional nos campos city e neighborhood
- Exemplos:
  * Se localização for "Parque Scaffidi, Itaquaquecetuba":
    - city: "Itaquaquecetuba"
    - neighborhood: "Parque Scaffidi"
    - address: ""
  * Se localização for "Rua das Flores, 123, Centro, Arujá":
    - city: "Arujá"
    - neighborhood: "Centro"
    - address: "Rua das Flores, 123"

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional antes ou depois
- O campo "location" DEVE conter EXATAMENTE: "${input.location}"
- O título DEVE incluir o nome do bairro/região
- A descrição DEVE mencionar a localização fornecida`;

    // Call API through our server - use production URL if available
    console.log('Calling AI endpoint...');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/generate-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: imageContents,
        prompt: prompt,
        apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI generation error:', errorData);
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response data:', data);
    const content = data.content[0].text;

    console.log('Claude response:', content);

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);

    console.log('=== AI Response Parsed ===');
    console.log('Title:', aiResponse.title);
    console.log('Price:', aiResponse.price);
    console.log('Location:', aiResponse.location);
    console.log('City:', aiResponse.city);
    console.log('Neighborhood:', aiResponse.neighborhood);
    console.log('Address:', aiResponse.address);
    console.log('Description length:', aiResponse.description?.length);
    console.log('========================');

    // Upload images to server
    console.log('Uploading images to server...');
    const uploadedImageUrls: string[] = [];
    const tempId = `temp_${Date.now()}`;

    for (let i = 0; i < input.images.length; i++) {
      const file = input.images[i];
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `image_${i + 1}.${fileExtension}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('propertyId', tempId);
      formData.append('fileName', fileName);

      console.log(`Uploading image ${i + 1}/${input.images.length}...`);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const uploadResponse = await fetch(`${apiUrl}/api/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        uploadedImageUrls.push(uploadData.url);
        console.log(`Image ${i + 1} uploaded:`, uploadData.url);
      } else {
        console.error(`Failed to upload image ${i + 1}`);
      }
    }
    console.log('All images uploaded:', uploadedImageUrls.length);

    // Build property data
    const propertyData: Partial<Property> = {
      id: tempId,
      title: aiResponse.title,
      price: aiResponse.price,
      type: input.type,
      category: input.category,
      location: aiResponse.location || input.location,
      city: aiResponse.city || undefined,
      neighborhood: aiResponse.neighborhood || undefined,
      address: aiResponse.address || undefined,
      bedrooms: input.bedrooms ? parseInt(input.bedrooms) : undefined,
      bathrooms: input.bathrooms ? parseInt(input.bathrooms) : undefined,
      parkingSpaces: input.parkingSpaces,
      area: input.area ? parseFloat(input.area) : undefined,
      description: aiResponse.description,
      images: uploadedImageUrls,
      isExclusive: false,
      isFeatured: false,
    };

    return propertyData;
  } catch (error) {
    console.error('Error generating property with AI:', error);
    throw error;
  }
}
