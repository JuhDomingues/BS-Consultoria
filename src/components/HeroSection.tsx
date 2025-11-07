import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Play, Home } from "lucide-react";
import heroImage from "@/assets/BG Hero Section site BS-3.png";
import logoBS from "@/assets/Logo-1.png";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getFeaturedProperty, FeaturedPropertyConfig } from "@/utils/featuredProperty";

const HeroSection = () => {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<FeaturedPropertyConfig>(getFeaturedProperty());

  // Listen for changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setFeatured(getFeaturedProperty());
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check for updates periodically (for same-tab updates)
    const interval = setInterval(() => {
      setFeatured(getFeaturedProperty());
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const scrollToProperties = () => {
    const filterSection = document.getElementById('property-filter');
    if (filterSection) {
      filterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace('R$', 'R$');
  };

  const contactWhatsApp = () => {
    // Simple message format to avoid emoji encoding issues
    const propertyDetails = [
      `Olá! Vi o imóvel no site e gostaria de mais informações.`,
      ``,
      `*${featured.title}*`,
      `Bairro: ${featured.neighborhood}`,
      `Preço: ${formatPrice(featured.price)}`,
      `Quartos: ${featured.bedrooms}`,
      ``,
      `Código do imóvel: ${featured.propertyCode}`
    ].join('\n');

    const message = encodeURIComponent(propertyDetails);
    window.open(`https://wa.me/5511964583214?text=${message}`, '_blank');
  };

  const goToPropertyDetail = () => {
    navigate(`/imovel/${featured.propertyDetailId}`);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pb-24">
      {/* Logo */}
      <div className="absolute top-4 left-4 z-20">
        <img
          src={logoBS}
          alt="BS Consultoria de Imóveis"
          className="h-20 w-20 md:h-28 md:w-28 object-contain drop-shadow-lg"
        />
      </div>

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
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pt-40 md:pt-16">

          {/* Urgency Badges - Above Title */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
            <Badge variant="destructive" className="bg-red-600 text-white font-medium text-xs sm:text-sm md:text-base px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 md:py-2.5 animate-pulse shadow-lg whitespace-nowrap">
              🔥 {featured.availableUnits} UNIDADES DISPONÍVEIS
            </Badge>
            <Badge variant="destructive" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium text-xs sm:text-sm md:text-base px-3 py-1.5 sm:px-3.5 sm:py-2 md:px-4 md:py-2.5 whitespace-nowrap">
              ⭐ {featured.constructionStatus}
            </Badge>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            {featured.title.split(' ')[0]}
            <span className="text-primary block">{featured.title.split(' ').slice(1).join(' ')}</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            Apartamentos com {featured.bedrooms} dormitórios no melhor bairro de Itaquaquecetuba
          </p>

          {/* Featured Property Info */}
          <div className="bg-background/10 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto border border-white/20">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-xl font-semibold mb-2">{featured.title}</h3>
                <div className="flex items-center text-gray-300 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {featured.location}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  {featured.bedrooms} dormitórios • {featured.bathrooms} banheiro{featured.bathrooms > 1 ? 's' : ''} • {featured.parkingSpaces} vaga{featured.parkingSpaces > 1 ? 's' : ''} • {featured.area}m²
                </div>
                <div className="text-2xl font-bold text-primary">{formatPrice(featured.price)}</div>
                {featured.mcmv && (
                  <div className="text-sm text-green-400 mt-1">✓ Programa Minha Casa Minha Vida</div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={goToPropertyDetail}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-black"
                  onClick={() => window.open(featured.tourUrl, '_blank')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Tour Virtual
                </Button>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-32">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg cta-glow"
              onClick={scrollToProperties}
            >
              Explorar Imóveis
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/10 text-white border-white/30 hover:bg-white hover:text-black px-8 py-4 text-lg"
              onClick={contactWhatsApp}
            >
              Fale com um Consultor
            </Button>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;