// Featured Property Configuration
export interface FeaturedPropertyConfig {
  title: string;
  location: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  area: number;
  price: number;
  propertyCode: string;
  tourUrl: string;
  propertyDetailId: string;
  availableUnits: number;
  constructionStatus: string;
  category: string;
  mcmv: boolean;
}

const STORAGE_KEY = 'bs-featured-property';

const DEFAULT_CONFIG: FeaturedPropertyConfig = {
  title: 'Residencial Bela Vista',
  location: 'Parque Residencial Scaffidi, Itaquaquecetuba',
  neighborhood: 'Parque Residencial Scaffidi',
  bedrooms: 2,
  bathrooms: 1,
  parkingSpaces: 1,
  area: 47,
  price: 228000,
  propertyCode: '125',
  tourUrl: 'https://orbix360.com/t/g34ssXyqkRZO6BPc4AoqeyoNZ673/4695594750705664/bela-vista',
  propertyDetailId: '125',
  availableUnits: 10,
  constructionStatus: 'OBRAS INICIADAS',
  category: 'Venda',
  mcmv: true,
};

export const getFeaturedProperty = (): FeaturedPropertyConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading featured property:', error);
  }
  return DEFAULT_CONFIG;
};

export const saveFeaturedProperty = (config: FeaturedPropertyConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving featured property:', error);
    throw error;
  }
};

export const resetFeaturedProperty = (): FeaturedPropertyConfig => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting featured property:', error);
  }
  return DEFAULT_CONFIG;
};
