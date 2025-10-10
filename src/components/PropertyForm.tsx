import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Property } from "@/utils/parsePropertyData";
import { ImageUpload } from "@/components/ImageUpload";
import { Sparkles } from "lucide-react";
import { generatePropertyContent } from "@/services/openai";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Property>) => Promise<void>;
  initialData?: Property | null;
  mode: "create" | "edit";
}

export function PropertyForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
}: PropertyFormProps) {
  const [loading, setLoading] = useState(false);

  // Generate temporary ID for image upload before saving
  const generateTempId = () => {
    return `temp_${Date.now()}`;
  };

  const [formData, setFormData] = useState<Partial<Property>>({
    id: "",
    title: "",
    price: "",
    type: "Apartamento",
    category: "Venda",
    location: "",
    address: "",
    city: "",
    neighborhood: "",
    bedrooms: undefined,
    bathrooms: undefined,
    parkingSpaces: "",
    area: undefined,
    description: "",
    images: [],
    isExclusive: false,
    isFeatured: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form when creating new with temporary ID for uploads
      setFormData({
        id: generateTempId(),
        title: "",
        price: "",
        type: "Apartamento",
        category: "Venda",
        location: "",
        address: "",
        city: "",
        neighborhood: "",
        bedrooms: undefined,
        bathrooms: undefined,
        parkingSpaces: "",
        area: undefined,
        description: "",
        images: [],
        isExclusive: false,
        isFeatured: false,
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Erro ao salvar imóvel. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (images: string[]) => {
    setFormData({ ...formData, images });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Adicionar Novo Imóvel" : "Editar Imóvel"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do imóvel. Campos obrigatórios marcados com *
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ID - Hidden for new properties, shown when editing */}
          {mode === "edit" && (
            <div className="space-y-2">
              <Label htmlFor="id">ID do Imóvel</Label>
              <Input
                id="id"
                value={formData.id}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Apartamento - Parque Scaffidi"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Preço *</Label>
            <Input
              id="price"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Ex: R$ 215.000,00"
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartamento">Apartamento</SelectItem>
                  <SelectItem value="Sobrado">Sobrado</SelectItem>
                  <SelectItem value="Casa">Casa</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Terreno">Terreno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Venda">Venda</SelectItem>
                  <SelectItem value="Locação">Locação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location Field */}
          <div className="space-y-2">
            <Label htmlFor="location">Localização *</Label>
            <Input
              id="location"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Parque Scaffidi, Itaquaquecetuba - SP"
            />
            <p className="text-xs text-muted-foreground">
              Digite o bairro e cidade (ex: Parque Scaffidi, Itaquaquecetuba)
            </p>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Quartos</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                value={formData.bedrooms || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bedrooms: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Banheiros</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                value={formData.bathrooms || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bathrooms: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parkingSpaces">Vagas</Label>
              <Input
                id="parkingSpaces"
                value={formData.parkingSpaces}
                onChange={(e) =>
                  setFormData({ ...formData, parkingSpaces: e.target.value })
                }
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Área (m²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                min="0"
                value={formData.area || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    area: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada do imóvel..."
            />
          </div>

          {/* Images */}
          <ImageUpload
            images={formData.images || []}
            onChange={handleImageChange}
            propertyId={formData.id}
          />

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="isExclusive">Lançamento Exclusivo</Label>
              <Switch
                id="isExclusive"
                checked={formData.isExclusive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isExclusive: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isFeatured">Destaque</Label>
              <Switch
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFeatured: checked })
                }
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : mode === "create" ? "Criar Imóvel" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
