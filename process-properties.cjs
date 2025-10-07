const fs = require('fs');
const path = require('path');

// Read the raw JSON file
const rawProperties = JSON.parse(fs.readFileSync('./src/imoveis_detalhados.json', 'utf8'));

// Function to extract price from dados_completos
function extractPrice(dados) {
  const priceMatch = dados.match(/R\$\s*([\d.,]+)/);
  return priceMatch ? `R$ ${priceMatch[1]}` : '';
}

// Function to extract basic info from dados_completos
function extractInfo(dados) {
  const info = {
    dormitorios: '',
    banheiros: '',
    vagas: '',
    area: '',
    bairro: '',
    cidade: '',
    endereco: ''
  };

  // Extract dormitórios
  const dormMatch = dados.match(/(\d+)\s+Dormitórios?/i);
  if (dormMatch) info.dormitorios = dormMatch[1];

  // Extract banheiros
  const banhMatch = dados.match(/(\d+)\s+Banheiros?/i);
  if (banhMatch) info.banheiros = banhMatch[1];

  // Extract vagas
  const vagaMatch = dados.match(/(\d+)\s+Vaga/i);
  if (vagaMatch) info.vagas = vagaMatch[1];

  // Extract área
  const areaMatch = dados.match(/Área Total[:\s]+([\d,]+)\s*m/i);
  if (areaMatch) info.area = areaMatch[1];

  // Extract bairro
  const bairroMatch = dados.match(/[Bb]airro:\s*([^\n]+)/);
  if (bairroMatch) info.bairro = bairroMatch[1].trim();

  // Extract cidade (look for city names in the data - check in URL first for accuracy)
  const urlMatch = dados.match(/Apartamento para (?:Venda|Locação), ([^/]+) \/ SP/i) ||
                   dados.match(/Sobrado para (?:Venda|Locação), ([^/]+) \/ SP/i) ||
                   dados.match(/Casa para (?:Venda|Locação), ([^/]+) \/ SP/i);

  if (urlMatch) {
    info.cidade = urlMatch[1].trim();
  } else if (dados.includes('Guarulhos')) {
    info.cidade = 'Guarulhos';
  } else if (dados.includes('Arujá')) {
    info.cidade = 'Arujá';
  } else if (dados.includes('Itaquaquecetuba')) {
    info.cidade = 'Itaquaquecetuba';
  } else if (dados.includes('São Paulo')) {
    info.cidade = 'São Paulo';
  }

  // Extract endereço
  const endMatch = dados.match(/Endereço:\s*([^\n]+)/);
  if (endMatch) info.endereco = endMatch[1].trim();

  return info;
}

// Function to get local images for a property
function getLocalImages(propertyId) {
  const imagesDir = `./public/imoveis/${propertyId}`;

  if (!fs.existsSync(imagesDir)) {
    return [];
  }

  const files = fs.readdirSync(imagesDir)
    .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
    .map(file => {
      const stats = fs.statSync(path.join(imagesDir, file));
      return {
        name: file,
        size: stats.size,
        path: `/imoveis/${propertyId}/${file}`
      };
    })
    // Filter out thumbnails (typically < 50KB)
    .filter(file => file.size > 50000)
    // Sort: prioritize 'destaque.jpg', then by name
    .sort((a, b) => {
      if (a.name === 'destaque.jpg') return -1;
      if (b.name === 'destaque.jpg') return 1;
      return a.name.localeCompare(b.name);
    })
    // Take only first 8 quality images
    .slice(0, 8)
    .map(file => file.path);

  return files;
}

// Function to extract description
function extractDescription(dados) {
  // Try to find description section
  const descMatch = dados.match(/Descrição do Imóvel\n([^]*?)(?=Características|Cômodos|Proximidades|Mapa|$)/i);
  if (descMatch) {
    return descMatch[1]
      .replace(/𝐄𝐍𝐓𝐑𝐄.*?$/gm, '')
      .replace(/𝐅𝐈𝐗𝐎.*?$/gm, '')
      .replace(/𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏.*?$/gm, '')
      .replace(/𝐄-𝐌𝐀𝐈𝐋.*?$/gm, '')
      .replace(/Rua Abreu Lima.*?$/gm, '')
      .replace(/𝐵𝑆 𝐶𝑂𝑁𝑆𝑈𝐿𝑇𝑂𝑅𝐼𝐴.*?$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return '';
}

// Function to determine property type
function determineType(dados) {
  if (dados.toLowerCase().includes('sobrado')) return 'Sobrado';
  if (dados.toLowerCase().includes('apartamento')) return 'Apartamento';
  if (dados.toLowerCase().includes('casa')) return 'Casa';
  if (dados.toLowerCase().includes('comercial')) return 'Comercial';
  if (dados.toLowerCase().includes('terreno')) return 'Terreno';
  return 'Apartamento';
}

// Function to determine category (Venda/Locação)
function determineCategory(dados, city, propertyId) {
  // Only the Arujá sobrado (ID 3461707) is for rent
  if (propertyId === '3461707') {
    return 'Locação';
  }
  return 'Venda';
}

// Process all properties
const processedProperties = rawProperties.map(property => {
  const info = extractInfo(property.dados_completos);
  const localImages = getLocalImages(property.id);
  const description = extractDescription(property.dados_completos);

  return {
    id: property.id,
    title: `${determineType(property.dados_completos)} - ${info.bairro || info.cidade}`,
    price: extractPrice(property.dados_completos),
    type: determineType(property.dados_completos),
    category: determineCategory(property.dados_completos, info.cidade, property.id),
    location: `${info.bairro ? info.bairro + ', ' : ''}${info.cidade}`,
    address: info.endereco,
    city: info.cidade,
    neighborhood: info.bairro,
    bedrooms: info.dormitorios,
    bathrooms: info.banheiros,
    parkingSpaces: info.vagas,
    area: info.area,
    description: description,
    images: localImages.length > 0 ? localImages : property.imagens.slice(1, 6), // Use local or first 5 remote images
    isExclusive: property.id === '3500447', // Residencial Bela Vista
    isFeatured: false,
    url: property.url
  };
});

// Write the processed data
fs.writeFileSync(
  './src/imoveis_processados.json',
  JSON.stringify(processedProperties, null, 2),
  'utf8'
);

console.log(`✅ Processados ${processedProperties.length} imóveis!`);
console.log(`✅ Arquivo salvo em: src/imoveis_processados.json`);
