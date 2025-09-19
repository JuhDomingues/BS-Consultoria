import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import PropertyCarousel from "@/components/PropertyCarousel";
import Footer from "@/components/Footer";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import residencialBelaVista from "@/assets/residencial-bela-vista-1.jpg";

const Index = () => {
  // Mock data para os imóveis
  const mockProperties = [
    {
      id: "1",
      title: "Residencial Bela Vista",
      location: "Parque Residencial Scaffidi, Itaquaquecetuba",
      price: "R$ 215.000",
      image: residencialBelaVista,
      bedrooms: 2,
      bathrooms: 1,
      area: 47,
      type: "Apartamento",
      category: "Venda",
      isExclusive: true,
      description: "Apartamentos em obras no programa Minha Casa Minha Vida. Varanda grill e 1 vaga."
    },
    {
      id: "2",
      title: "Apartamento Luxo Vila Olímpia",
      location: "Vila Olímpia, São Paulo",
      price: "R$ 1.250.000",
      image: property1,
      bedrooms: 3,
      bathrooms: 2,
      area: 120,
      type: "Apartamento",
      category: "Venda",
      isExclusive: false
    },
    {
      id: "3",
      title: "Edifício Comercial Centro",
      location: "Centro, São Paulo",
      price: "R$ 3.500.000",
      image: property2,
      area: 500,
      type: "Comercial",
      category: "Venda",
      isExclusive: false
    },
    {
      id: "4",
      title: "Cobertura Alto Padrão",
      location: "Jardins, São Paulo",
      price: "R$ 4.800.000",
      image: property3,
      bedrooms: 4,
      bathrooms: 3,
      area: 280,
      type: "Cobertura",
      category: "Alto Padrão",
      isExclusive: true
    },
    {
      id: "5",
      title: "Apartamento Vila Madalena",
      location: "Vila Madalena, São Paulo",
      price: "R$ 890.000",
      image: property1,
      bedrooms: 2,
      bathrooms: 1,
      area: 85,
      type: "Apartamento",
      category: "Locação",
      isExclusive: false
    }
  ];

  const lançamentos = mockProperties.filter(p => p.category === "Venda").slice(0, 3);
  const locacao = mockProperties.filter(p => p.category === "Locação");
  const altoPadrao = mockProperties.filter(p => p.category === "Alto Padrão");
  const comerciais = mockProperties.filter(p => p.type === "Comercial");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        
        <div className="py-24 space-y-8">
          <PropertyCarousel title="Lançamentos" properties={lançamentos} />
          <PropertyCarousel title="Locação" properties={locacao} />
          <PropertyCarousel title="Alto Padrão" properties={altoPadrao} />
          <PropertyCarousel title="Comerciais" properties={comerciais} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
