import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/utils/api";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  propertyId?: string;
}

export function ImageUpload({ images, onChange, propertyId }: ImageUploadProps) {
  const [previews, setPreviews] = useState<{ url: string; file?: File }[]>(
    images.map((url) => ({ url }))
  );
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Create previews
    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setPreviews([...previews, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);

    // Update parent with only existing URLs (not file objects)
    const urls = newPreviews
      .filter((p) => !p.file)
      .map((p) => p.url);
    onChange(urls);
  };

  const handleUpload = async () => {
    const filesToUpload = previews.filter((p) => p.file).map((p) => p.file!);

    if (filesToUpload.length === 0) {
      // No new files to upload, just use existing URLs
      const existingUrls = previews.filter((p) => !p.file).map((p) => p.url);
      onChange(existingUrls);
      return;
    }

    setUploading(true);

    try {
      // Upload each file
      const uploadedUrls: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `image_${previews.filter((p) => !p.file).length + i + 1}.${fileExtension}`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('propertyId', propertyId || 'temp');
        formData.append('fileName', fileName);

        // Upload to server
        const apiUrl = getApiUrl();
        const uploadUrl = `${apiUrl}/api/upload-image`;

        console.log(`Uploading to: ${uploadUrl}, propertyId: ${propertyId || 'temp'}`);

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Upload failed for ${file.name}:`, errorText);
          throw new Error(`Failed to upload ${file.name}: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Upload response:', data);
        uploadedUrls.push(data.url);
      }

      // Combine existing URLs with newly uploaded ones
      const existingUrls = previews.filter((p) => !p.file).map((p) => p.url);
      const allUrls = [...existingUrls, ...uploadedUrls];

      onChange(allUrls);

      // Update previews to remove file references
      setPreviews(allUrls.map((url) => ({ url })));

      alert(`${filesToUpload.length} imagem(ns) preparada(s) para upload!`);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Erro ao fazer upload das imagens. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newPreviews = [...previews];
    const draggedItem = newPreviews[draggedIndex];

    // Remove from old position
    newPreviews.splice(draggedIndex, 1);
    // Insert at new position
    newPreviews.splice(index, 0, draggedItem);

    setPreviews(newPreviews);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);

    // Update parent with new order
    const urls = previews
      .filter((p) => !p.file)
      .map((p) => p.url);
    onChange(urls);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Imagens do Imóvel</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Selecionar Imagens
          </Button>
          {previews.some((p) => p.file) && (
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Processando...' : 'Processar Upload'}
            </Button>
          )}
        </div>
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
      {previews.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Arraste as imagens para reordenar. A primeira imagem será a capa do imóvel.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "relative aspect-video rounded-lg border-2 border-dashed border-muted overflow-hidden group cursor-move transition-all",
                  draggedIndex === index && "opacity-50 scale-95",
                  index === 0 && "ring-2 ring-primary"
                )}
              >
                {/* Drag handle */}
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>

                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* File indicator */}
                {preview.file && (
                  <div className="absolute top-2 left-10">
                    <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                      Novo
                    </span>
                  </div>
                )}

                {/* Cover indicator */}
                {index === 0 && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                      Capa
                    </span>
                  </div>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
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
          As imagens serão salvas em: /public/imoveis/{propertyId}/
        </p>
      )}
    </div>
  );
}
