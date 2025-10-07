import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

interface PropertyImageGalleryProps {
  images: string[];
  title: string;
}

const PropertyImageGallery = ({ images, title }: PropertyImageGalleryProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [featuredImageIndex, setFeaturedImageIndex] = useState(0);


  // Reset indices when images change
  useEffect(() => {
    if (currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
    if (featuredImageIndex >= images.length) {
      setFeaturedImageIndex(0);
    }
  }, [images.length, currentImageIndex, featuredImageIndex]);

  const nextImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const openGallery = useCallback((index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setIsGalleryOpen(false);
  }, []);

  const setFeaturedImage = useCallback((index: number) => {
    setFeaturedImageIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isGalleryOpen) return;

      switch (event.key) {
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case 'Escape':
          closeGallery();
          break;
      }
    };

    if (isGalleryOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isGalleryOpen, prevImage, nextImage, closeGallery]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Sem imagens disponíveis</p>
      </div>
    );
  }

  return (
    <>
      
      {/* Main Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main Image */}
        <div className="md:col-span-2 lg:col-span-2 relative group cursor-pointer">
          <img
            src={images[featuredImageIndex]}
            alt={`${title} - Imagem principal`}
            className="w-full h-80 md:h-96 object-cover rounded-lg"
            onClick={() => openGallery(featuredImageIndex)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/property-1.jpg';
            }}
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openGallery(featuredImageIndex);
              }}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Ver galeria
            </Button>
          </div>
        </div>

        {/* Thumbnail Grid */}
        <div className="grid grid-cols-2 gap-4">
          {images.slice(0, 4).map((image, index) => (
            <div 
              key={index} 
              className={`relative group cursor-pointer transition-all duration-200 ${
                index === featuredImageIndex ? 'ring-4 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-primary/50'
              }`}
              onClick={() => setFeaturedImage(index)}
            >
              <img
                src={image}
                alt={`${title} - Imagem ${index + 1}`}
                className={`w-full h-36 md:h-44 object-cover rounded-lg transition-all duration-200 ${
                  index === featuredImageIndex ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/property-1.jpg';
                }}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
              {index === 3 && images.length > 4 && (
                <div 
                  className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center cursor-pointer z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGallery(index);
                  }}
                >
                  <span className="text-white font-semibold text-lg">
                    +{images.length - 4} fotos
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Full Screen Gallery Modal */}
      {isGalleryOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
          onClick={closeGallery}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={closeGallery}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Current Image */}
            <img
              src={images[currentImageIndex]}
              alt={`${title} - Imagem ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center">
              <div className="flex gap-2 max-w-full overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-16 h-12 rounded border-2 transition-all ${
                      index === currentImageIndex
                        ? "border-white"
                        : "border-transparent opacity-60 hover:opacity-80"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PropertyImageGallery;