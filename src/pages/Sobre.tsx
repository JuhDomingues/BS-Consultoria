import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, Target, Heart } from "lucide-react";
import consultationImage from "@/assets/consultation.jpg";

const Sobre = () => {
  const valores = [
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Transparência",
      description: "Informações claras e honestas em todas as negociações"
    },
    {
      icon: <Heart className="h-8 w-8 text-primary" />,
      title: "Atendimento Personalizado",
      description: "Cada cliente recebe consultoria dedicada e exclusiva"
    },
    {
      icon: <Award className="h-8 w-8 text-primary" />,
      title: "Excelência",
      description: "Compromisso com a qualidade em todos os serviços"
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Relacionamento",
      description: "Construção de vínculos duradouros com nossos clientes"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-background to-card">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground animate-fade-in">
                Sobre a <span className="text-primary">BS Consultoria</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Mais de uma década transformando sonhos em realidade no mercado imobiliário
              </p>
            </div>
          </div>
        </section>

        {/* Nossa História */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-foreground">Nossa História</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Fundada em 2010, a BS Consultoria de Imóveis nasceu da visão de 
                    revolucionar o mercado imobiliário através de um atendimento 
                    verdadeiramente personalizado e consultivo.
                  </p>
                  <p>
                    Ao longo dos anos, construímos uma reputação sólida baseada na 
                    transparência, conhecimento de mercado e no comprometimento genuíno 
                    com os objetivos de nossos clientes.
                  </p>
                  <p>
                    Hoje, somos reconhecidos como uma das principais consultorias 
                    imobiliárias especializadas em imóveis de alto padrão na região 
                    metropolitana de São Paulo.
                  </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 cta-glow">
                  Fale Conosco
                </Button>
              </div>
              
              <div className="relative">
                <img
                  src={consultationImage}
                  alt="Consultoria BS"
                  className="rounded-lg shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg" />
              </div>
            </div>
          </div>
        </section>

        {/* Nossos Valores */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Nossos Valores</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Os princípios que guiam nossa atuação e garantem a excelência dos nossos serviços
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {valores.map((valor, index) => (
                <Card key={index} className="property-card">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      {valor.icon}
                    </div>
                    <h3 className="font-semibold text-lg text-foreground">{valor.title}</h3>
                    <p className="text-muted-foreground text-sm">{valor.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Nossos Diferenciais</h2>
                <p className="text-muted-foreground">
                  O que nos torna únicos no mercado imobiliário
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Consultoria Especializada</h3>
                      <p className="text-muted-foreground text-sm">
                        Equipe altamente capacitada com profundo conhecimento do mercado imobiliário
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Atendimento Sob Medida</h3>
                      <p className="text-muted-foreground text-sm">
                        Estratégias personalizadas para cada perfil de cliente e objetivo específico
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Rede de Contatos</h3>
                      <p className="text-muted-foreground text-sm">
                        Acesso exclusivo a imóveis únicos através de nossa ampla rede de relacionamentos
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Acompanhamento Completo</h3>
                      <p className="text-muted-foreground text-sm">
                        Suporte em todas as etapas, desde a busca até a finalização da negociação
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-foreground">
                Pronto para encontrar seu imóvel ideal?
              </h2>
              <p className="text-muted-foreground">
                Entre em contato conosco e descubra como nossa consultoria especializada 
                pode ajudar você a realizar seus objetivos imobiliários.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 cta-glow">
                  Agendar Consulta
                </Button>
                <Button variant="outline" size="lg">
                  Ver Imóveis
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Sobre;