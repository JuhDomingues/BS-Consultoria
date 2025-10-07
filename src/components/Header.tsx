import { Link } from "react-router-dom";
import logoBS from "@/assets/Logo-1.png";

interface HeaderProps {
  children?: React.ReactNode;
}

const Header = ({ children }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src={logoBS}
              alt="BS Consultoria de Imóveis"
              className="h-32 w-32 object-contain drop-shadow-lg"
            />
          </Link>

          {/* Children (Filter) */}
          {children && (
            <div className="flex-1">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;