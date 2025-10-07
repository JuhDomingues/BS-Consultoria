export interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  images: string[];
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  type: string;
  category: string;
  isExclusive?: boolean;
  isFeatured?: boolean;
  active?: boolean;
  description?: string;
  features?: string[];
  address?: string;
  neighborhood?: string;
  city?: string;
  parkingSpaces?: string;
}

export function parsePropertyFromJSON(rawProperty: unknown): Property {
  const property = rawProperty as any; // Type assertion for JSON data
  const data = property.dados_completos || '';
  
  // Extract price
  const priceMatch = data.match(/R\$\s*([\d.,]+)/);
  const price = priceMatch ? `R$ ${priceMatch[1]}` : 'Preço sob consulta';
  
  // Extract bedrooms
  const bedroomsMatch = data.match(/(\d+)\s*[Dd]orm/);
  const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : undefined;
  
  // Extract bathrooms  
  const bathroomsMatch = data.match(/(\d+)\s*[Bb]anh/);
  const bathrooms = bathroomsMatch ? parseInt(bathroomsMatch[1]) : undefined;
  
  // Extract area
  const areaMatch = data.match(/(\d+(?:,\d+)?)\s*m²/);
  const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : undefined;
  
  // Extract location info
  const locationMatch = data.match(/Apartamento para [Vv]enda,?\s*([^/]+)\s*\/\s*([^\\n]+)/);
  const city = locationMatch ? locationMatch[1].trim() : 'Arujá';
  
  const neighborhoodMatch = data.match(/[Bb]airro\s*([^\\n,]+)/);
  const neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim() : '';
  
  const addressMatch = data.match(/Endereço:\s*([^\\n]+)/);
  const address = addressMatch ? addressMatch[1].trim() : '';
  
  // Determine property type
  let type = 'Apartamento';
  if (data.toLowerCase().includes('casa')) type = 'Casa';
  else if (data.toLowerCase().includes('comercial') || data.toLowerCase().includes('sala')) type = 'Comercial';
  else if (data.toLowerCase().includes('terreno')) type = 'Terreno';
  else if (data.toLowerCase().includes('cobertura')) type = 'Cobertura';
  
  // Determine category
  let category = 'Venda';
  if (data.toLowerCase().includes('locação') || data.toLowerCase().includes('aluguel')) {
    category = 'Locação';
  }
  
  // Check if it's exclusive (Residencial Bela Vista)
  const isExclusive = data.toLowerCase().includes('bela vista') || data.toLowerCase().includes('scaffidi');
  
  // Extract features
  const features: string[] = [];
  if (data.includes('Planejados')) features.push('Móveis Planejados');
  if (data.includes('Garagem') || data.includes('Vaga')) features.push('Vaga de Garagem');
  if (data.includes('Portão Eletrônico')) features.push('Portão Eletrônico');
  if (data.includes('Portaria 24H')) features.push('Portaria 24h');
  if (data.includes('Elevador')) features.push('Elevador');
  if (data.includes('Área Gourmet')) features.push('Área Gourmet');
  if (data.includes('Churrasqueira')) features.push('Churrasqueira');
  if (data.includes('Salão de Festa')) features.push('Salão de Festa');
  if (data.includes('Monitoramento')) features.push('Sistema de Segurança');
  
  // Extract description
  let description = '';
  if (data.includes('Residencial Bela Vista')) {
    description = 'Apartamentos com 2 dormitórios no melhor bairro de Itaquaquecetuba! Obras iniciadas! Conforto e privacidade com varanda grill e 1 vaga! Programa Minha Casa Minha Vida.';
  } else {
    const descMatch = data.match(/Descrição do Imóvel\\n([^\\n]+)/);
    if (descMatch) {
      description = descMatch[1].substring(0, 200) + '...';
    }
  }
  
  // Generate local image paths
  const images = [];
  const imageCount = property.imagens?.length || 0;
  
  // Use actual available images from the downloaded set
  // Try to get at least 3-5 images for gallery
  for (let i = 2; i <= Math.min(8, imageCount); i++) {
    // Try jpg first, then png (most common format in our downloads)
    images.push(`/imoveis/${property.id}/image_${i}.jpg`);
    if (images.length >= 5) break; // Limit to 5 images for performance
  }
  
  // If we don't have enough, try png format
  if (images.length < 3) {
    for (let i = 2; i <= Math.min(6, imageCount); i++) {
      images.push(`/imoveis/${property.id}/image_${i}.png`);
      if (images.length >= 5) break;
    }
  }
  
  // Fallback image if no local images available
  if (images.length === 0) {
    images.push('/property-1.jpg');
  }
  
  return {
    id: property.id,
    title: isExclusive ? 'Residencial Bela Vista' : `${type} em ${neighborhood || city}`,
    location: `${neighborhood}${neighborhood && city ? ', ' : ''}${city}`,
    price,
    images,
    bedrooms,
    bathrooms,
    area,
    type,
    category,
    isExclusive,
    description,
    features,
    address,
    neighborhood,
    city
  };
}