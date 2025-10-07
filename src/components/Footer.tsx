import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import logoBS from "@/assets/Logo-1.png";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* Company Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img
              src={logoBS}
              alt="BS Consultoria de Imóveis"
              className="h-20 w-20 object-contain"
            />
            <p className="text-muted-foreground text-sm max-w-xl">
              Especialistas em consultoria imobiliária personalizada,
              oferecendo as melhores oportunidades do mercado com
              transparência e excelência.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="hover:text-primary"
            onClick={() => window.open('https://www.instagram.com/bs.imobiliaria?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==', '_blank')}
          >
            <Instagram className="h-6 w-6" />
          </Button>
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