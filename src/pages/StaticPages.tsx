
import React from 'react';
import { Mail, Phone, MapPin, ShieldCheck, Users, Heart, Globe, Award, TrendingUp } from 'lucide-react';

export const About: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-12 py-12 animate-[fadeIn_0.3s]">
    <div className="text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6">Nossa Missão é Conectar</h1>
      <p className="text-xl text-gray-500 max-w-2xl mx-auto">A ViajaStore nasceu para eliminar barreiras entre quem sonha em viajar e quem realiza sonhos.</p>
    </div>
    
    <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
       <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
             <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600"><Globe size={32}/></div>
             <h3 className="text-xl font-bold mb-2">Abrangência</h3>
             <p className="text-gray-600 text-sm">Presente em todos os estados do Brasil, conectando o turismo local.</p>
          </div>
          <div>
             <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600"><ShieldCheck size={32}/></div>
             <h3 className="text-xl font-bold mb-2">Confiança</h3>
             <p className="text-gray-600 text-sm">Processos rigorosos de verificação para garantir sua segurança.</p>
          </div>
          <div>
             <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600"><Users size={32}/></div>
             <h3 className="text-xl font-bold mb-2">Comunidade</h3>
             <p className="text-gray-600 text-sm">Mais de 50.000 viajantes satisfeitos compartilhando experiências.</p>
          </div>
       </div>
    </div>
  </div>
);

export const Contact: React.FC = () => (
  <div className="max-w-3xl mx-auto py-12">
    <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Fale com a gente</h1>
        <p className="text-gray-500">Estamos prontos para atender você 24h por dia.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
            <h3 className="font-bold text-xl mb-6">Canais de Atendimento</h3>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-full text-primary-600"><Mail size={20}/></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase">Email</p><p className="font-medium">suporte@viajastore.com</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-green-50 p-3 rounded-full text-green-600"><Phone size={20}/></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase">Telefone</p><p className="font-medium">0800 123 4567</p></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-purple-50 p-3 rounded-full text-purple-600"><MapPin size={20}/></div>
                    <div><p className="text-xs font-bold text-gray-400 uppercase">Sede</p><p className="font-medium">Av. Paulista, 1000 - SP</p></div>
                </div>
            </div>
        </div>
        <form className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-xl mb-4">Envie uma mensagem</h3>
            <input className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-primary-200" placeholder="Seu nome" />
            <input className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-primary-200" placeholder="Email" />
            <textarea className="w-full border border-gray-200 p-3 rounded-lg bg-gray-50 focus:bg-white transition-colors outline-none focus:ring-2 focus:ring-primary-200" rows={4} placeholder="Como podemos ajudar?" />
            <button className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors">Enviar</button>
        </form>
    </div>
  </div>
);

export const Terms: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="prose prose-blue max-w-none text-gray-700">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Termos de Uso</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      
      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">1. Aceitação dos Termos</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Ao acessar e usar a plataforma ViajaStore, você aceita e concorda em estar vinculado aos termos e disposições deste acordo. 
        Se você não concorda com algum dos termos aqui estabelecidos, não deve utilizar nossos serviços.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">2. Descrição do Serviço</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        A ViajaStore é uma plataforma intermediária que conecta agências de viagens, guias turísticos e prestadores de serviços 
        turísticos a consumidores finais. Não somos responsáveis pela prestação direta dos serviços de viagem, mas facilitamos 
        a conexão entre as partes.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">3. Cadastro e Conta de Usuário</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Para utilizar nossos serviços, você precisa criar uma conta fornecendo informações precisas e atualizadas. 
        Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades que ocorram em sua conta.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4. Reservas e Pagamentos</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Ao realizar uma reserva através da ViajaStore, você concorda em pagar o valor total indicado. Os pagamentos são processados 
        de forma segura através de gateways certificados. A confirmação da reserva está sujeita à disponibilidade e aprovação do prestador.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">5. Cancelamentos e Reembolsos</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        As políticas de cancelamento e reembolso variam conforme a agência e o pacote contratado. Leia atentamente as condições 
        específicas na página de cada viagem antes de confirmar sua reserva. A ViajaStore atua como intermediária e não se responsabiliza 
        por políticas de cancelamento definidas pelos prestadores.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">6. Responsabilidades</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        A ViajaStore não se responsabiliza por atrasos, cancelamentos, mudanças de itinerário ou qualquer problema relacionado aos 
        serviços prestados pelas agências parceiras. Nossa responsabilidade limita-se à intermediação da transação.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Propriedade Intelectual</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Todo o conteúdo da plataforma, incluindo textos, imagens, logotipos e design, é propriedade da ViajaStore ou de seus 
        licenciadores e está protegido por leis de propriedade intelectual.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Modificações dos Termos</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Reservamos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após 
        sua publicação. O uso continuado da plataforma após as modificações constitui sua aceitação dos novos termos.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">9. Contato</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Para questões relacionadas a estes termos, entre em contato conosco através do email: <strong>legal@viajastore.com</strong>
      </p>
    </div>
  </div>
);

export const Privacy: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="prose prose-blue max-w-none text-gray-700">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      
      <p className="text-gray-700 leading-relaxed mb-6">
        Na ViajaStore, levamos sua privacidade a sério. Esta política descreve como coletamos, usamos, armazenamos e protegemos 
        suas informações pessoais.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">1. Coleta de Dados</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Coletamos apenas os dados necessários para a prestação dos nossos serviços, incluindo:
      </p>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li>Nome completo</li>
        <li>CPF (para emissão de vouchers e documentos fiscais)</li>
        <li>Email (para comunicação e confirmações)</li>
        <li>Telefone/WhatsApp (para contato e suporte)</li>
        <li>Data de nascimento (quando necessário para reservas)</li>
        <li>Endereço (quando necessário para entrega de documentos)</li>
      </ul>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">2. Uso de Informações</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Seus dados são utilizados exclusivamente para:
      </p>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li>Processar e confirmar suas reservas</li>
        <li>Comunicar informações sobre sua viagem</li>
        <li>Melhorar sua experiência na plataforma</li>
        <li>Enviar ofertas e promoções (apenas com seu consentimento)</li>
        <li>Cumprir obrigações legais e regulatórias</li>
      </ul>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">3. Compartilhamento de Dados</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Compartilhamos seus dados apenas com:
      </p>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li>Agências parceiras responsáveis pela prestação dos serviços contratados</li>
        <li>Provedores de serviços de pagamento (para processar transações)</li>
        <li>Autoridades competentes quando exigido por lei</li>
      </ul>
      <p className="text-gray-700 leading-relaxed mb-4">
        Nunca vendemos seus dados pessoais a terceiros.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">4. Segurança</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados pessoais, incluindo:
      </p>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li>Criptografia SSL/TLS para transmissão de dados</li>
        <li>Armazenamento seguro em servidores protegidos</li>
        <li>Controles de acesso restritos</li>
        <li>Monitoramento contínuo de segurança</li>
      </ul>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">5. Seus Direitos (LGPD)</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
      </p>
      <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
        <li>Confirmar a existência de tratamento de dados</li>
        <li>Acessar seus dados pessoais</li>
        <li>Corrigir dados incompletos ou desatualizados</li>
        <li>Solicitar anonimização ou exclusão de dados</li>
        <li>Solicitar portabilidade dos dados</li>
        <li>Revogar consentimento a qualquer momento</li>
      </ul>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">6. Cookies</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Utilizamos cookies para melhorar sua experiência na plataforma, analisar o uso do site e personalizar conteúdo. 
        Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">7. Retenção de Dados</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta política, 
        ou conforme exigido por lei.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">8. Alterações nesta Política</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas através do email 
        cadastrado ou por aviso na plataforma.
      </p>

      <h3 className="text-xl font-bold text-gray-900 mt-6 mb-3">9. Contato</h3>
      <p className="text-gray-700 leading-relaxed mb-4">
        Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco:
      </p>
      <ul className="list-none pl-0 text-gray-700 mb-4 space-y-2">
        <li><strong>Email:</strong> privacidade@viajastore.com</li>
        <li><strong>Telefone:</strong> 0800 123 4567</li>
      </ul>
    </div>
  </div>
);

export const Help: React.FC = () => (
  <div className="max-w-3xl mx-auto py-12">
    <h1 className="text-4xl font-bold text-center mb-10">Central de Ajuda</h1>
    <div className="space-y-4">
        {[
            {q: "Como recebo meu voucher?", a: "Imediatamente após a confirmação do pagamento, disponível no seu Painel."},
            {q: "Quais as formas de pagamento?", a: "Aceitamos Cartão de Crédito, PIX e Boleto Bancário."},
            {q: "Posso parcelar?", a: "Sim, a maioria das agências oferece parcelamento em até 12x."},
            {q: "É seguro comprar aqui?", a: "Sim, utilizamos criptografia SSL e gateways de pagamento certificados."}
        ].map((faq, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
            </div>
        ))}
    </div>
  </div>
);

export const Blog: React.FC = () => (
    <div className="max-w-5xl mx-auto py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Blog de Viagens</h1>
        <p className="text-gray-500 mb-12">Dicas, roteiros e inspiração para sua próxima aventura.</p>
        <div className="grid md:grid-cols-3 gap-8 text-left">
            {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group cursor-pointer">
                    <div className="h-48 bg-gray-200 group-hover:opacity-90 transition-opacity">
                        <img src={`https://source.unsplash.com/random/400x300/?travel&sig=${i}`} className="w-full h-full object-cover" alt="Post"/>
                    </div>
                    <div className="p-6">
                        <span className="text-xs font-bold text-primary-600 uppercase">Dicas</span>
                        <h3 className="font-bold text-xl mt-2 mb-3 group-hover:text-primary-600 transition-colors">10 Destinos imperdíveis para 2024</h3>
                        <p className="text-gray-500 text-sm line-clamp-3">Descubra os lugares que estão em alta e planeje suas férias com antecedência para garantir os melhores preços.</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const Careers: React.FC = () => (
    <div className="max-w-3xl mx-auto py-12 text-center">
        <h1 className="text-4xl font-bold mb-6">Trabalhe Conosco</h1>
        <p className="text-xl text-gray-600 mb-10">Estamos construindo o futuro do turismo no Brasil.</p>
        <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
            <Award size={48} className="text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhuma vaga aberta no momento</h3>
            <p className="text-gray-600">Mas estamos sempre de olho em talentos! Envie seu currículo para <strong>talentos@viajastore.com</strong></p>
        </div>
    </div>
);

export const Press: React.FC = () => (
    <div className="max-w-4xl mx-auto py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">Imprensa & Mídia</h1>
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
                <h3 className="text-2xl font-bold mb-4">Assessoria de Imprensa</h3>
                <p className="text-gray-600 mb-6">Jornalistas e criadores de conteúdo podem entrar em contato direto com nossa equipe de comunicação.</p>
                <button className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800">Baixar Press Kit</button>
            </div>
            <div className="flex-1 bg-gray-100 rounded-xl h-48 w-full flex items-center justify-center text-gray-400 font-bold">
                LOGO / ASSETS
            </div>
        </div>
    </div>
);
