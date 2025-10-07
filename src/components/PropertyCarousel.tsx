import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PropertyCard from "./PropertyCard";
import { useRef } from "react";
import { Property } from "@/utils/parsePropertyData";

interface PropertyCarouselProps {
  title: string;
  properties: Property[];
}

const PropertyCarousel = ({ title, properties }: PropertyCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Width of card + gap
      const newScrollPosition = 
        direction === "left" 
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("left")}
              className="hidden md:flex hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll("right")}
              className="hidden md:flex hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div 
          ref={scrollRef}
          className="carousel-container"
        >
          {properties.map((property) => (
            <PropertyCard key={property.id} {...property} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PropertyCarousel;