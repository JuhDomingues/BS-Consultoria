import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Sparkles, Loader2 } from "lucide-react";
import { Property } from "@/utils/parsePropertyData";
import { generatePropertyWithAI } from "@/services/ai";

interface AIPropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Property>, imageFiles?: File[]) => Promise<void>;
}

export function AIPropertyForm({
  open,
  onOpenChange,
  onSubmit,
}: AIPropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [generatedData, setGeneratedData] = useState<Partial<Property> | null>(null);
  const [showReview, setShowReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: "Apartamento",
    category: "Venda",
    location: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    parkingSpaces: "",
    area: "",
    briefDescription: "",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImages([...images, ...files]);

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleGenerateWithAI = async () => {
    if (images.length === 0) {
      alert("Por favor, adicione pelo menos uma imagem");
      return;
    }

    if (!formData.briefDescription.trim()) {
      alert("Por favor, adicione uma breve descrição");
      return;
    }

    setGenerating(true);

    try {
      // Generate property data using AI
      const aiGeneratedData = await generatePropertyWithAI({
        images,
        type: formData.type,
        category: formData.category,
        location: formData.location,
        price: formData.price,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        parkingSpaces: formData.parkingSpaces,
        area: formData.area,
        briefDescription: formData.briefDescription,
      });

      // Show review screen
      setGeneratedData(aiGeneratedData);
      setShowReview(true);
    } catch (error) {
      console.error("Error generating property with AI:", error);
      alert("Erro ao gerar imóvel com IA. Verifique os dados e tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAndCreate = async () => {
    if (!generatedData) return;

    setLoading(true);
    try {
      // Pass both the generated data and the image files
      await onSubmit(generatedData, images);
      onOpenChange(false);

      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error creating property:", error);
      alert("Erro ao criar imóvel. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAI = () => {
    setShowReview(false);
    setGeneratedData(null);
  };

  const resetForm = () => {
    setImages([]);
    setPreviews([]);
    setGeneratedData(null);
    setShowReview(false);
    setFormData({
      type: "Apartamento",
      category: "Venda",
      location: "",
      price: "",
      bedrooms: "",
      bathrooms: "",
      parkingSpaces: "",
      area: "",
      briefDescription: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {showReview ? "Revisar Conteúdo Gerado" : "Criar Imóvel com IA"}
          </DialogTitle>
          <DialogDescription>
            {showReview
              ? "Revise o conteúdo gerado pela IA antes de criar o imóvel"
              : "Adicione imagens e informações básicas. A IA gerará automaticamente o título e descrição completa"
            }
          </DialogDescription>
        </DialogHeader>

        {showReview && generatedData ? (
          <div className="space-y-6">
            {/* Review Section - Editable */}
            <div className="space-y-4 bg-muted/50 p-6 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Título</Label>
                <Input
                  value={generatedData.title || ''}
                  onChange={(e) => setGeneratedData({ ...generatedData, title: e.target.value })}
                  className="text-lg font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Preço</Label>
                <Input
                  value={generatedData.price || ''}
                  onChange={(e) => setGeneratedData({ ...generatedData, price: e.target.value })}
                  className="text-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Tipo</Label>
                  <Input
                    value={generatedData.type || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, type: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Categoria</Label>
                  <Input
                    value={generatedData.category || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Localização Completa</Label>
                <Input
                  value={generatedData.location || ''}
                  onChange={(e) => setGeneratedData({ ...generatedData, location: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Cidade</Label>
                  <Input
                    value={generatedData.city || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Bairro</Label>
                  <Input
                    value={generatedData.neighborhood || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, neighborhood: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Endereço</Label>
                  <Input
                    value={generatedData.address || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Quartos</Label>
                  <Input
                    type="number"
                    value={generatedData.bedrooms || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, bedrooms: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Banheiros</Label>
                  <Input
                    type="number"
                    value={generatedData.bathrooms || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, bathrooms: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Vagas</Label>
                  <Input
                    value={generatedData.parkingSpaces || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, parkingSpaces: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Área (m²)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={generatedData.area || ''}
                    onChange={(e) => setGeneratedData({ ...generatedData, area: parseFloat(e.target.value) || undefined })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Descrição Completa</Label>
                <Textarea
                  rows={8}
                  value={generatedData.description || ''}
                  onChange={(e) => setGeneratedData({ ...generatedData, description: e.target.value })}
                  className="whitespace-pre-wrap"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Dica: Use **texto** para destacar palavras importantes, "Título:" para criar seções, e "-" para listas
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Imagens ({generatedData.images?.length || 0})</Label>
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((preview, index) => (
                    <div key={index} className="aspect-video rounded overflow-hidden border">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerateAI}
                disabled={loading}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Novamente
              </Button>
              <Button
                type="button"
                onClick={handleApproveAndCreate}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Aprovar e Criar Imóvel"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Imagens do Imóvel *</Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {previews.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-video rounded-lg border-2 border-dashed border-muted overflow-hidden group"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhuma imagem selecionada
                </p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {previews.length > 0 ? "Adicionar Mais Imagens" : "Selecionar Imagens"}
            </Button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
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
              <Label>Categoria *</Label>
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

          <div className="space-y-2">
            <Label>Localização *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Parque Scaffidi, Itaquaquecetuba"
            />
          </div>

          <div className="space-y-2">
            <Label>Preço (opcional)</Label>
            <Input
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Ex: R$ 350.000,00 (deixe vazio para a IA sugerir)"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Quartos</Label>
              <Input
                type="number"
                min="0"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Banheiros</Label>
              <Input
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Vagas</Label>
              <Input
                value={formData.parkingSpaces}
                onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Área (m²)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Breve Descrição *</Label>
            <Textarea
              rows={4}
              value={formData.briefDescription}
              onChange={(e) => setFormData({ ...formData, briefDescription: e.target.value })}
              placeholder="Descreva brevemente o imóvel, seus diferenciais, localização, acabamentos, etc. A IA usará isso para gerar um título atraente e uma descrição completa e profissional."
            />
            <p className="text-xs text-muted-foreground">
              💡 Quanto mais detalhes você fornecer, melhor será o resultado gerado pela IA
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating || loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={generating || loading}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar e Criar Imóvel
                </>
              )}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
