import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getFeaturedProperty, saveFeaturedProperty, resetFeaturedProperty, FeaturedPropertyConfig } from "@/utils/featuredProperty";
import { Save, RotateCcw, Home } from "lucide-react";

export const FeaturedPropertyManager = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<FeaturedPropertyConfig>(getFeaturedProperty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(getFeaturedProperty());
  }, []);

  const handleSave = () => {
    try {
      setSaving(true);
      saveFeaturedProperty(config);
      toast({
        title: "Configuração salva!",
        description: "As alterações do imóvel em destaque foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultConfig = resetFeaturedProperty();
    setConfig(defaultConfig);
    toast({
      title: "Configuração resetada",
      description: "Os valores padrão foram restaurados.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Imóvel em Destaque na Hero Section
              </CardTitle>
              <CardDescription>
                Configure o imóvel que aparece em destaque na página inicial
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Empreendimento</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Residencial Bela Vista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização Completa</Label>
              <Input
                id="location"
                value={config.location}
                onChange={(e) => setConfig({ ...config, location: e.target.value })}
                placeholder="Parque Residencial Scaffidi, Itaquaquecetuba"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={config.neighborhood}
                onChange={(e) => setConfig({ ...config, neighborhood: e.target.value })}
                placeholder="Parque Residencial Scaffidi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyCode">Código do Imóvel</Label>
              <Input
                id="propertyCode"
                value={config.propertyCode}
                onChange={(e) => setConfig({ ...config, propertyCode: e.target.value })}
                placeholder="125"
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Características do Imóvel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Dormitórios</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={config.bedrooms}
                  onChange={(e) => setConfig({ ...config, bedrooms: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={config.bathrooms}
                  onChange={(e) => setConfig({ ...config, bathrooms: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parkingSpaces">Vagas</Label>
                <Input
                  id="parkingSpaces"
                  type="number"
                  value={config.parkingSpaces}
                  onChange={(e) => setConfig({ ...config, parkingSpaces: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Área (m²)</Label>
                <Input
                  id="area"
                  type="number"
                  value={config.area}
                  onChange={(e) => setConfig({ ...config, area: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Price and Status */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Preço e Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  value={config.price}
                  onChange={(e) => setConfig({ ...config, price: parseInt(e.target.value) || 0 })}
                  placeholder="228000"
                />
                <p className="text-sm text-muted-foreground">
                  Valor formatado: {formatCurrency(config.price)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableUnits">Unidades Disponíveis</Label>
                <Input
                  id="availableUnits"
                  type="number"
                  value={config.availableUnits}
                  onChange={(e) => setConfig({ ...config, availableUnits: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constructionStatus">Status da Obra</Label>
                <Input
                  id="constructionStatus"
                  value={config.constructionStatus}
                  onChange={(e) => setConfig({ ...config, constructionStatus: e.target.value })}
                  placeholder="OBRAS INICIADAS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={config.category}
                  onValueChange={(value) => setConfig({ ...config, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Venda">Venda</SelectItem>
                    <SelectItem value="Locação">Locação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mcmv"
                    checked={config.mcmv}
                    onCheckedChange={(checked) => setConfig({ ...config, mcmv: checked })}
                  />
                  <Label htmlFor="mcmv">Minha Casa Minha Vida</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tourUrl">URL do Tour Virtual</Label>
                <Input
                  id="tourUrl"
                  value={config.tourUrl}
                  onChange={(e) => setConfig({ ...config, tourUrl: e.target.value })}
                  placeholder="https://orbix360.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyDetailId">ID da Página de Detalhes</Label>
                <Input
                  id="propertyDetailId"
                  value={config.propertyDetailId}
                  onChange={(e) => setConfig({ ...config, propertyDetailId: e.target.value })}
                  placeholder="125"
                />
                <p className="text-sm text-muted-foreground">
                  Link: /imovel/{config.propertyDetailId}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
