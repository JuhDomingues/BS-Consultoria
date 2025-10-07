import { Property } from '@/utils/parsePropertyData';
import { fetchProperties } from '@/services/baserow';

// Properties will be loaded from Baserow
let cachedProperties: Property[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds cache (reduced for testing)

/**
 * Clear the cache manually
 */
export function clearPropertiesCache() {
  cachedProperties = [];
  lastFetchTime = 0;
  console.log('Properties cache cleared');
}

/**
 * Get all properties from Baserow with caching
 */
export async function getAllProperties(): Promise<Property[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedProperties.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    console.log('Returning cached properties:', cachedProperties.length);
    return cachedProperties;
  }

  try {
    console.log('Fetching fresh properties from Baserow...');
    // Fetch fresh data from Baserow
    const properties = await fetchProperties();
    console.log('Fetched properties:', properties.length, properties);

    // Transform to match Property type
    cachedProperties = properties.map((prop: any) => ({
      id: prop.id,
      title: prop.title,
      location: prop.location,
      price: prop.price,
      images: prop.images,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      area: prop.area,
      type: prop.type,
      category: prop.category,
      isExclusive: prop.isExclusive,
      isFeatured: prop.isFeatured,
      active: prop.active,
      description: prop.description,
      address: prop.address,
      city: prop.city,
      neighborhood: prop.neighborhood || prop.location.split(',')[0]?.trim(),
      parkingSpaces: prop.parkingSpaces,
    }));

    lastFetchTime = now;
    console.log('Cached properties updated:', cachedProperties.length);
    return cachedProperties;
  } catch (error) {
    console.error('Error loading properties from Baserow:', error);
    // Return cached data if available, even if expired
    return cachedProperties;
  }
}

// Legacy export for backwards compatibility (will be empty initially)
export const allProperties: Property[] = [];

// Filter properties by category
export async function getPropertiesByCategory(category: string): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.filter(property =>
    property.category.toLowerCase() === category.toLowerCase()
  );
}

// Filter properties by type
export async function getPropertiesByType(type: string): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.filter(property =>
    property.type.toLowerCase() === type.toLowerCase()
  );
}

// Get exclusive properties (Residencial Bela Vista)
export async function getExclusiveProperties(): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.filter(property => property.isExclusive);
}

// Get properties for sale
export async function getPropertiesForSale(): Promise<Property[]> {
  return getPropertiesByCategory('Venda');
}

// Get properties for rent
export async function getPropertiesForRent(): Promise<Property[]> {
  return getPropertiesByCategory('Locação');
}

// Get commercial properties
export async function getCommercialProperties(): Promise<Property[]> {
  return getPropertiesByType('Comercial');
}

// Get apartments
export async function getApartments(): Promise<Property[]> {
  return getPropertiesByType('Apartamento');
}

// Get properties by city
export async function getPropertiesByCity(city: string): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.filter(property =>
    property.city?.toLowerCase().includes(city.toLowerCase())
  );
}

// Get featured properties (marked as featured or exclusive)
export async function getFeaturedProperties(): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.filter(property => property.isFeatured || property.isExclusive);
}

// Get recent properties (first 8)
export async function getRecentProperties(): Promise<Property[]> {
  const properties = await getAllProperties();
  return properties.slice(0, 8);
}