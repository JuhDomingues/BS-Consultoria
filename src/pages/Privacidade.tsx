import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
          <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>

          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p>
              A BS Consultoria de Imóveis ("nós", "nosso" ou "BS") está comprometida em proteger a privacidade e segurança
              das informações pessoais dos usuários de nosso site e serviços. Esta Política de Privacidade descreve como
              coletamos, usamos, armazenamos e protegemos suas informações pessoais.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
            <p>Podemos coletar as seguintes informações:</p>
            <ul>
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Número de telefone</li>
              <li>Informações sobre preferências de imóveis</li>
              <li>Dados de navegação e cookies</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
            <p>Utilizamos suas informações pessoais para:</p>
            <ul>
              <li>Fornecer informações sobre imóveis disponíveis</li>
              <li>Responder a suas solicitações e dúvidas</li>
              <li>Agendar visitas a imóveis</li>
              <li>Enviar comunicações sobre novos imóveis e ofertas (com seu consentimento)</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
            <p>
              Não vendemos, alugamos ou comercializamos suas informações pessoais para terceiros. Podemos compartilhar
              suas informações apenas nas seguintes situações:
            </p>
            <ul>
              <li>Com proprietários de imóveis, quando necessário para facilitar transações</li>
              <li>Com prestadores de serviços que nos auxiliam em nossas operações</li>
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger nossos direitos legais</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">5. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua experiência em nosso site, analisar o tráfego
              e personalizar conteúdo. Você pode configurar seu navegador para recusar cookies, mas isso pode limitar
              algumas funcionalidades do site.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">6. Segurança das Informações</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger suas informações
              pessoais contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método de
              transmissão pela Internet é 100% seguro.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">7. Seus Direitos</h2>
            <p>De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul>
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a exclusão de suas informações pessoais</li>
              <li>Revogar seu consentimento a qualquer momento</li>
              <li>Solicitar a portabilidade de seus dados</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">8. Retenção de Dados</h2>
            <p>
              Retemos suas informações pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta
              política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">9. Alterações a Esta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Recomendamos que você revise esta página
              regularmente para se manter informado sobre como protegemos suas informações.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade ou quiser exercer seus direitos, entre em contato
              conosco:
            </p>
            <ul>
              <li><strong>E-mail:</strong> negociosimobiliariosbs@gmail.com</li>
              <li><strong>Telefone:</strong> (11) 98159-8027</li>
              <li><strong>Endereço:</strong> Rua Abreu Lima, 129, Parque Residencial Scaffidi, Itaquaquecetuba/SP</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacidade;
