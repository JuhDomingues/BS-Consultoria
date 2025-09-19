import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, Mail, MapPin, Instagram, Facebook, Linkedin, Send } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg font-bold text-xl">
                BS
              </div>
              <div>
                <div className="font-bold text-lg text-foreground">BS Consultoria</div>
                <div className="text-sm text-muted-foreground">de Imóveis</div>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              Especialistas em consultoria imobiliária personalizada, 
              oferecendo as melhores oportunidades do mercado com 
              transparência e excelência.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground">Links Rápidos</h3>
            <nav className="space-y-2">
              {[
                { name: "Início", path: "/" },
                { name: "Sobre Nós", path: "/sobre" },
                { name: "Imóveis", path: "/imoveis" },
                { name: "Serviços", path: "/servicos" },
                { name: "Contato", path: "/contato" },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground">Serviços</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Compra e Venda</div>
              <div>Locação</div>
              <div>Avaliação de Imóveis</div>
              <div>Consultoria Jurídica</div>
              <div>Financiamento</div>
              <div>Imóveis Comerciais</div>
            </div>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-foreground">Contato</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(11) 99999-9999</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>contato@bsconsultoria.com.br</span>
              </div>
              <div className="flex items-start space-x-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>Av. Paulista, 1000<br />São Paulo - SP</span>
              </div>
            </div>

            {/* Newsletter */}
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Newsletter</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Seu e-mail"
                  className="text-sm"
                />
                <Button size="icon" className="bg-primary hover:bg-primary/90">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <div>
            © 2024 BS Consultoria de Imóveis. Todos os direitos reservados.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacidade" className="hover:text-primary transition-colors">
              Política de Privacidade
            </Link>
            <Link to="/termos" className="hover:text-primary transition-colors">
              Termos de Uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;