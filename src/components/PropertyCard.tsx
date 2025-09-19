import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Bath, Square, Eye } from "lucide-react";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: string;
  image: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  type: string;
  category: string;
  isExclusive?: boolean;
}

const PropertyCard = ({
  title,
  location,
  price,
  image,
  bedrooms,
  bathrooms,
  area,
  type,
  category,
  isExclusive = false,
}: PropertyCardProps) => {
  return (
    <div className="property-card group min-w-[300px] cursor-pointer">
      {/* Image Container */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
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
          <Button variant="outline" className="bg-background/90 text-foreground border-primary hover:bg-primary hover:text-primary-foreground">
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
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            Saiba mais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;