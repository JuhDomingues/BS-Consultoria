import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Play } from "lucide-react";
import heroImage from "@/assets/residencial-bela-vista-1.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-48 pb-24">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Imóvel Premium"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <Badge variant="destructive" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm px-4 py-2 animate-pulse">
            ⭐ LANÇAMENTO EXCLUSIVO - OBRAS INICIADAS
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            Residencial
            <span className="text-primary block">Bela Vista</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            Apartamentos com 2 dormitórios no melhor bairro de Itaquaquecetuba
          </p>

          {/* Featured Property Info */}
          <div className="bg-background/10 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto border border-white/20">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-xl font-semibold mb-2">Residencial Bela Vista</h3>
                <div className="flex items-center text-gray-300 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  Parque Residencial Scaffidi, Itaquaquecetuba
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  2 dormitórios • 1 banheiro • 1 vaga • 47m²
                </div>
                <div className="text-2xl font-bold text-primary">R$ 215.000</div>
                <div className="text-sm text-green-400 mt-1">✓ Programa Minha Casa Minha Vida</div>
              </div>
              <Button 
                variant="outline" 
                className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-black"
                onClick={() => window.open('https://orbix360.com/t/g34ssXyqkRZO6BPc4AoqeyoNZ673/4695594750705664/bela-vista', '_blank')}
              >
                <Play className="h-4 w-4 mr-2" />
                Tour Virtual
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-32">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg cta-glow">
              Explorar Imóveis
            </Button>
            <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-black px-8 py-4 text-lg">
              Fale com um Consultor
            </Button>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;