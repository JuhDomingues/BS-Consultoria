import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, Filter } from "lucide-react";

interface PropertyFilterProps {
  selectedCategory: string;
  selectedType: string;
  selectedCity: string;
  selectedNeighborhood: string;
  availableNeighborhoods: string[];
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  onCityChange: (city: string) => void;
  onNeighborhoodChange: (neighborhood: string) => void;
  onClearFilters: () => void;
}

const PropertyFilter = ({
  selectedCategory,
  selectedType,
  selectedCity,
  selectedNeighborhood,
  availableNeighborhoods,
  onCategoryChange,
  onTypeChange,
  onCityChange,
  onNeighborhoodChange,
  onClearFilters,
}: PropertyFilterProps) => {
  const categories = [
    { value: "all", label: "Todas as Categorias" },
    { value: "Venda", label: "Venda" },
    { value: "Locação", label: "Locação" },
  ];

  const types = [
    { value: "all", label: "Todos os Tipos" },
    { value: "Apartamento", label: "Apartamento" },
    { value: "Casa", label: "Casa" },
    { value: "Sobrado", label: "Sobrado" },
    { value: "Comercial", label: "Comercial" },
    { value: "Terreno", label: "Terreno" },
    { value: "Cobertura", label: "Cobertura" },
  ];

  const cities = [
    { value: "all", label: "Todas as Cidades" },
    { value: "Itaquaquecetuba", label: "Itaquaquecetuba" },
    { value: "Guarulhos", label: "Guarulhos" },
    { value: "Arujá", label: "Arujá" },
  ];

  const hasActiveFilters = selectedCategory !== "all" || selectedType !== "all" || selectedCity !== "all" || selectedNeighborhood !== "all";

  return (
    <div className="bg-background border rounded-lg p-4 mb-8 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">Filtrar Imóveis</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Categoria</label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Tipo</label>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Cidade</label>
          <Select value={selectedCity} onValueChange={onCityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city.value} value={city.value}>
                  {city.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Neighborhood Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Bairro</label>
          <Select
            value={selectedNeighborhood}
            onValueChange={onNeighborhoodChange}
            disabled={selectedCity === "all" || availableNeighborhoods.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedCity === "all" ? "Selecione uma cidade" : "Todos os Bairros"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Bairros</SelectItem>
              {availableNeighborhoods.map((neighborhood) => (
                <SelectItem key={neighborhood} value={neighborhood}>
                  {neighborhood}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onCategoryChange("all")}>
              {categories.find(c => c.value === selectedCategory)?.label} ×
            </Badge>
          )}
          {selectedType !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onTypeChange("all")}>
              {types.find(t => t.value === selectedType)?.label} ×
            </Badge>
          )}
          {selectedCity !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onCityChange("all")}>
              {cities.find(c => c.value === selectedCity)?.label} ×
            </Badge>
          )}
          {selectedNeighborhood !== "all" && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => onNeighborhoodChange("all")}>
              {selectedNeighborhood} ×
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyFilter;