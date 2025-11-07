import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import PropertyImageGallery from "@/components/PropertyImageGallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Phone,
  MessageCircle,
  Heart,
  Share2
} from "lucide-react";
import { fetchPropertyById } from "@/services/baserow";
import { Property } from "@/utils/parsePropertyData";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Load property from Baserow
  useEffect(() => {
    async function loadProperty() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchPropertyById(id);
        setProperty(data);
      } catch (error) {
        console.error('Error loading property:', error);
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando imóvel...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Imóvel não encontrado</h1>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const shareProperty = () => {
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Confira este imóvel: ${property.title}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const contactWhatsApp = () => {
    // Simple message format to avoid emoji encoding issues
    const propertyDetails = [
      `Olá! Vi o imóvel no site e gostaria de mais informações.`,
      ``,
      `*${property.title}*`,
      `Bairro: ${property.neighborhood}`,
      `Preço: ${property.price}`,
      property.bedrooms ? `Quartos: ${property.bedrooms}` : '',
      ``,
      `Código do imóvel: ${property.id}`
    ].filter(line => line !== '').join('\n');

    const message = encodeURIComponent(propertyDetails);
    window.open(`https://wa.me/5511964583214?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFavorite}
              className={isFavorite ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Favoritado" : "Favoritar"}
            </Button>
            <Button variant="outline" size="sm" onClick={shareProperty}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div id="image-gallery">
              <PropertyImageGallery images={property.images} title={property.title} />
            </div>

            {/* Property Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="destructive" className="bg-primary">
                  {property.category}
                </Badge>
                <Badge variant="secondary">
                  {property.type}
                </Badge>
                {property.isExclusive && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    ⭐ Lançamento Exclusivo
                  </Badge>
                )}
              </div>
              
              <h1
                className={`font-bold text-foreground md:whitespace-nowrap ${
                  property.title.length > 80 ? 'text-base sm:text-lg lg:text-xl' :
                  property.title.length > 60 ? 'text-lg sm:text-xl lg:text-2xl' :
                  'text-xl sm:text-2xl lg:text-3xl'
                }`}
              >
                {property.title}
              </h1>
              
              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                {property.location}
              </div>

              <div className="text-4xl font-bold text-primary">{property.price}</div>
            </div>

            {/* Property Features */}
            <Card>
              <CardHeader>
                <CardTitle>Características do Imóvel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {property.bedrooms && (
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="font-semibold">
                        {property.bedrooms} {property.bedrooms === 1 ? 'Quarto' : 'Quartos'}
                      </div>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="font-semibold">
                        {property.bathrooms} {property.bathrooms === 1 ? 'Banheiro' : 'Banheiros'}
                      </div>
                    </div>
                  )}
                  {property.area && (
                    <div className="flex items-center gap-2">
                      <Square className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="font-semibold">
                        {property.area}m² Área Total
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="font-semibold">
                      1 Vaga
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-muted-foreground leading-relaxed whitespace-pre-line prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: property.description
                        // Destacar textos entre ** como negrito
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                        // Destacar títulos/seções (texto seguido de : no início da linha)
                        .replace(/^([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][^:\n]{2,}:)/gm, '<strong class="text-foreground font-semibold block mt-3 mb-1">$1</strong>')
                        // Destacar itens de lista com -
                        .replace(/^- (.+)$/gm, '<span class="flex items-start gap-2 my-1"><span class="text-primary mt-1">•</span><span>$1</span></span>')
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comodidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {property.address && (
                      <div>
                        <span className="font-semibold">Endereço: </span>
                        <span className="text-muted-foreground">{property.address}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Bairro: </span>
                      <span className="text-muted-foreground">{property.neighborhood}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Cidade: </span>
                      <span className="text-muted-foreground">{property.city}</span>
                    </div>
                  </div>

                  {/* Google Maps */}
                  <div className="w-full h-[300px] rounded-lg overflow-hidden border">
                    <iframe
                      title="Mapa da localização"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(property.location)}`}
                      allowFullScreen
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle>Entre em Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">BS Consultoria de Imóveis</h3>
                  <p className="text-sm text-muted-foreground">CRECI 30.756-J</p>
                  <p className="text-sm text-muted-foreground italic">
                    Especialistas em realizar o seu sonho
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Agende uma visita ou tire suas dúvidas
                  </p>
                  <Button onClick={contactWhatsApp} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Falar no WhatsApp
                  </Button>

                  <Button variant="outline" className="w-full h-12 text-base">
                    <Phone className="h-5 w-5 mr-2" />
                    (11) 96458-3214
                  </Button>
                </div>

                <Separator />

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-center">Horário de Atendimento</p>
                  <p className="text-xs text-center text-muted-foreground">
                    Segunda a Sexta: 9h às 18h
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Sábado: 9h às 13h
                  </p>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p className="font-semibold text-sm">Nosso Escritório</p>
                  <p>Rua Abreu Lima, 129</p>
                  <p>Parque Residencial Scaffidi</p>
                  <p>Itaquaquecetuba - SP</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PropertyDetail;