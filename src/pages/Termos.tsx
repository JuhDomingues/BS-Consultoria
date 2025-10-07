import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Termos = () => {
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
          <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>

          <p className="text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar o site da BS Consultoria de Imóveis, você concorda em cumprir e estar vinculado aos
              seguintes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve usar nosso site
              ou serviços.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">2. Descrição dos Serviços</h2>
            <p>
              A BS Consultoria de Imóveis oferece serviços de intermediação imobiliária, incluindo:
            </p>
            <ul>
              <li>Divulgação de imóveis para venda e locação</li>
              <li>Consultoria imobiliária</li>
              <li>Agendamento de visitas a imóveis</li>
              <li>Assessoria em negociações imobiliárias</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">3. Uso do Site</h2>
            <p>Ao usar nosso site, você concorda em:</p>
            <ul>
              <li>Fornecer informações verdadeiras, precisas e atualizadas</li>
              <li>Não usar o site para fins ilegais ou não autorizados</li>
              <li>Não tentar obter acesso não autorizado a qualquer parte do site</li>
              <li>Não interferir ou interromper o funcionamento do site</li>
              <li>Não copiar, reproduzir ou distribuir conteúdo do site sem autorização</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">4. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo do site, incluindo textos, imagens, logotipos, gráficos e código, é propriedade da
              BS Consultoria de Imóveis ou de seus licenciadores e está protegido por leis de direitos autorais e
              propriedade intelectual. É proibida a reprodução não autorizada.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">5. Informações sobre Imóveis</h2>
            <p>
              As informações sobre imóveis apresentadas no site são fornecidas pelos proprietários ou por terceiros.
              Embora nos esforcemos para garantir a precisão das informações, não garantimos que todas as informações
              estejam completas, atualizadas ou livres de erros. Recomendamos sempre verificar as informações antes
              de tomar qualquer decisão.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">6. Limitação de Responsabilidade</h2>
            <p>
              A BS Consultoria de Imóveis não se responsabiliza por:
            </p>
            <ul>
              <li>Erros ou omissões nas informações dos imóveis</li>
              <li>Indisponibilidade temporária do site</li>
              <li>Decisões tomadas com base nas informações do site</li>
              <li>Danos diretos ou indiretos resultantes do uso do site</li>
              <li>Conteúdo de sites de terceiros vinculados ao nosso site</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">7. Modificações no Serviço</h2>
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte do site ou dos serviços
              a qualquer momento, sem aviso prévio. Não seremos responsáveis por qualquer modificação, suspensão ou
              descontinuação dos serviços.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">8. Links para Sites de Terceiros</h2>
            <p>
              Nosso site pode conter links para sites de terceiros. Não temos controle sobre o conteúdo desses sites
              e não somos responsáveis por sua precisão, legalidade ou conteúdo. O uso de sites de terceiros é por
              sua conta e risco.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">9. Privacidade</h2>
            <p>
              O uso de suas informações pessoais é regido por nossa Política de Privacidade. Ao usar nosso site, você
              concorda com a coleta e uso de informações conforme descrito em nossa Política de Privacidade.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">10. Legislação Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada
              a estes termos será submetida à jurisdição exclusiva dos tribunais brasileiros.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">11. Alterações aos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As alterações entrarão em
              vigor imediatamente após a publicação no site. O uso continuado do site após alterações constitui
              aceitação dos novos termos.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contato</h2>
            <p>
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
            </p>
            <ul>
              <li><strong>E-mail:</strong> negociosimobiliariosbs@gmail.com</li>
              <li><strong>Telefone:</strong> (11) 98159-8027</li>
              <li><strong>Endereço:</strong> Rua Abreu Lima, 129, Parque Residencial Scaffidi, Itaquaquecetuba/SP</li>
              <li><strong>CRECI:</strong> 30.756-J</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Termos;
