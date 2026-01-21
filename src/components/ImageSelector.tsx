import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageSelectorProps {
  // For edit mode: existing image URLs
  existingImages?: string[];
  onExistingImagesChange?: (urls: string[]) => void;
  // For create mode: new files to upload
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  propertyId?: string;
}

export function ImageSelector({
  existingImages = [],
  onExistingImagesChange,
  selectedFiles,
  onFilesChange,
  propertyId,
}: ImageSelectorProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create previews for selected files
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('ImageSelector handleFileSelect - files selected:', files.length);
    if (files.length === 0) return;

    // Add new files
    const newFiles = [...selectedFiles, ...files];
    console.log('ImageSelector handleFileSelect - total files after adding:', newFiles.length);
    onFilesChange(newFiles);

    // Create previews for new files
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(previews[index]);

    onFilesChange(newFiles);
    setPreviews(newPreviews);
  };

  const handleRemoveExisting = (index: number) => {
    if (onExistingImagesChange) {
      const newImages = existingImages.filter((_, i) => i !== index);
      onExistingImagesChange(newImages);
    }
  };

  const handleDragStart = (index: number, isExisting: boolean) => {
    setDraggedIndex(isExisting ? index : existingImages.length + index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const totalImages = existingImages.length + selectedFiles.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Imagens do Imóvel</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Selecionar Imagens
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview Grid */}
      {totalImages > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {existingImages.length > 0 && selectedFiles.length > 0
              ? `${existingImages.length} imagem(ns) existente(s) + ${selectedFiles.length} nova(s)`
              : existingImages.length > 0
              ? `${existingImages.length} imagem(ns) existente(s)`
              : `${selectedFiles.length} nova(s) imagem(ns) selecionada(s)`}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Existing images */}
            {existingImages.map((url, index) => (
              <div
                key={`existing-${index}`}
                draggable
                onDragStart={() => handleDragStart(index, true)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative aspect-video rounded-lg border-2 border-dashed border-muted overflow-hidden group cursor-move transition-all",
                  draggedIndex === index && "opacity-50 scale-95",
                  index === 0 && selectedFiles.length === 0 && "ring-2 ring-primary"
                )}
              >
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>

                <img
                  src={url.startsWith('/') ? `https://bsconsultoriadeimoveis.com.br${url}` : url}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Cover indicator */}
                {index === 0 && selectedFiles.length === 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                      Capa
                    </span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveExisting(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Image number */}
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}

            {/* New files (previews) */}
            {previews.map((preview, index) => (
              <div
                key={`new-${index}`}
                draggable
                onDragStart={() => handleDragStart(index, false)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative aspect-video rounded-lg border-2 border-dashed border-muted overflow-hidden group cursor-move transition-all",
                  draggedIndex === existingImages.length + index && "opacity-50 scale-95",
                  index === 0 && existingImages.length === 0 && "ring-2 ring-primary"
                )}
              >
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>

                <img
                  src={preview}
                  alt={`Nova imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* New indicator */}
                <div className="absolute top-2 left-10">
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Nova
                  </span>
                </div>

                {/* Cover indicator */}
                {index === 0 && existingImages.length === 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                      Capa
                    </span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Image number */}
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  #{existingImages.length + index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Nenhuma imagem selecionada
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Imagens
          </Button>
        </div>
      )}

      {propertyId && (
        <p className="text-xs text-muted-foreground">
          As imagens serão salvas em: /imoveis/{propertyId}/
        </p>
      )}
    </div>
  );
}
