import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Square, Eye } from "lucide-react";
import { Property } from "@/utils/parsePropertyData";
import { useNavigate } from "react-router-dom";

type PropertyCardProps = Property;

const PropertyCard = ({
  id,
  title,
  location,
  price,
  images,
  bedrooms,
  bathrooms,
  area,
  type,
  category,
  isExclusive = false,
  description,
  features,
}: PropertyCardProps) => {
  const navigate = useNavigate();

  // Better image validation and fallback
  const getPrimaryImage = () => {
    if (!images || images.length === 0) {
      return '/property-1.jpg';
    }

    // Filter out empty or invalid URLs
    const validImages = images.filter(img => img && img.trim() !== '');

    if (validImages.length === 0) {
      return '/property-1.jpg';
    }

    return validImages[0];
  };

  const primaryImage = getPrimaryImage();

  const handleCardClick = () => {
    navigate(`/imovel/${id}`);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/imovel/${id}`);
  };
  return (
    <div className="property-card group w-[320px] flex-shrink-0 cursor-pointer" onClick={handleCardClick}>
      {/* Image Container - Square Format */}
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
        <img
          src={primaryImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Only set fallback once to prevent infinite loop
            if (target.src !== window.location.origin + '/property-1.jpg') {
              console.warn(`Failed to load image for property ${id}: ${primaryImage}`);
              target.src = '/property-1.jpg';
            }
          }}
          loading="lazy"
        />
        <div className="absolute inset-0 overlay-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap z-40">
          <Badge variant="destructive" className="bg-primary text-primary-foreground">
            {category}
          </Badge>
          <Badge variant="secondary" className="bg-secondary/90 text-secondary-foreground">
            {type}
          </Badge>
          {isExclusive && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-lg animate-pulse z-40">
              ⭐ Lançamento Exclusivo
            </Badge>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button 
            variant="outline" 
            className="bg-background/90 text-foreground border-primary hover:bg-primary hover:text-primary-foreground"
            onClick={handleViewDetails}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin className="h-3 w-3 mr-1" />
            {location}
          </div>
        </div>

        {/* Property Details */}
        {(bedrooms || bathrooms || area) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {bedrooms}
              </div>
            )}
            {bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-3 w-3" />
                {bathrooms}
              </div>
            )}
            {area && (
              <div className="flex items-center gap-1">
                <Square className="h-3 w-3" />
                {area}m²
              </div>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-primary">{price}</div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={handleViewDetails}
          >
            Saiba mais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;