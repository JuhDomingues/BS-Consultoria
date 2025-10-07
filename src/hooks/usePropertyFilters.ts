import { useState, useMemo } from 'react';
import { Property } from '@/utils/parsePropertyData';

export const usePropertyFilters = (properties: Property[]) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');

  // Get available neighborhoods for selected city
  const availableNeighborhoods = useMemo(() => {
    if (selectedCity === 'all') return [];

    const neighborhoods = new Set<string>();
    properties.forEach((property) => {
      const cityMatch = property.city?.toLowerCase() === selectedCity.toLowerCase();
      if (cityMatch && property.neighborhood) {
        neighborhoods.add(property.neighborhood);
      }
    });

    return Array.from(neighborhoods).sort();
  }, [properties, selectedCity]);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const categoryMatch = selectedCategory === 'all' || property.category === selectedCategory;
      const typeMatch = selectedType === 'all' || property.type === selectedType;
      const cityMatch = selectedCity === 'all' ||
        property.city?.toLowerCase().includes(selectedCity.toLowerCase()) ||
        property.location?.toLowerCase().includes(selectedCity.toLowerCase());
      const neighborhoodMatch = selectedNeighborhood === 'all' ||
        property.neighborhood?.toLowerCase() === selectedNeighborhood.toLowerCase();

      return categoryMatch && typeMatch && cityMatch && neighborhoodMatch;
    });
  }, [properties, selectedCategory, selectedType, selectedCity, selectedNeighborhood]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedCity('all');
    setSelectedNeighborhood('all');
  };

  // Reset neighborhood when city changes
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedNeighborhood('all');
  };

  return {
    selectedCategory,
    selectedType,
    selectedCity,
    selectedNeighborhood,
    availableNeighborhoods,
    filteredProperties,
    setSelectedCategory,
    setSelectedType,
    setSelectedCity: handleCityChange,
    setSelectedNeighborhood,
    clearFilters,
  };
};