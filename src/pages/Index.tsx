import { useEffect, useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PropertyCarousel from "@/components/PropertyCarousel";
import PropertyFilter from "@/components/PropertyFilter";
import Footer from "@/components/Footer";
import {
  getAllProperties,
  getExclusiveProperties,
  getFeaturedProperties,
  getSobrados
} from "@/data/properties";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { Property } from "@/utils/parsePropertyData";

const Index = () => {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [exclusiveProperties, setExclusiveProperties] = useState<Property[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [sobrados, setSobrados] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Load properties from Baserow on mount
  useEffect(() => {
    async function loadProperties() {
      try {
        setLoading(true);

        const [all, exclusive, featured, houses] = await Promise.all([
          getAllProperties(),
          getExclusiveProperties(),
          getFeaturedProperties(),
          getSobrados(),
        ]);

        setAllProperties(all);
        setExclusiveProperties(exclusive);
        setFeaturedProperties(featured);
        setSobrados(houses);
      } catch (error) {
        console.error('Error loading properties:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProperties();
  }, []);
  
  // Property filtering
  const {
    selectedCategory,
    selectedType,
    selectedCity,
    selectedNeighborhood,
    availableNeighborhoods,
    filteredProperties,
    setSelectedCategory,
    setSelectedType,
    setSelectedCity,
    setSelectedNeighborhood,
    clearFilters,
  } = usePropertyFilters(allProperties);

  // Check if any filter is active
  const hasActiveFilters = selectedCategory !== 'all' || selectedType !== 'all' || selectedCity !== 'all' || selectedNeighborhood !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando imóveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection />

        <div className="py-24 space-y-8">
          {/* Property Filter Section */}
          <div id="property-filter" className="container mx-auto px-4">
            <PropertyFilter
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              selectedCity={selectedCity}
              selectedNeighborhood={selectedNeighborhood}
              availableNeighborhoods={availableNeighborhoods}
              onCategoryChange={setSelectedCategory}
              onTypeChange={setSelectedType}
              onCityChange={setSelectedCity}
              onNeighborhoodChange={setSelectedNeighborhood}
              onClearFilters={clearFilters}
            />
            
            {/* Filtered Results */}
            {hasActiveFilters && filteredProperties.length > 0 && (
              <PropertyCarousel
                title={`Resultados da Busca (${filteredProperties.length} imóveis)`}
                properties={filteredProperties}
              />
            )}

            {/* No results message */}
            {hasActiveFilters && filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Nenhum imóvel encontrado com os filtros selecionados.</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Default Property Sections */}
          {!hasActiveFilters && (
            <>
              {exclusiveProperties.length > 0 && (
                <PropertyCarousel title="Lançamentos Exclusivos" properties={exclusiveProperties} />
              )}
              {featuredProperties.length > 0 && (
                <PropertyCarousel title="Destaques" properties={featuredProperties} />
              )}
              {sobrados.length > 0 && (
                <PropertyCarousel title="Sobrados Disponíveis" properties={sobrados} />
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
