
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
  <div className="max-w-3xl mx-auto py-12 prose prose-blue prose-lg">
    <h1>Termos de Uso</h1>
    <p>Última atualização: {new Date().toLocaleDateString()}</p>
    <h3>1. Aceitação dos Termos</h3>
    <p>Ao acessar e usar a ViajaStore, você aceita e concorda em estar vinculado aos termos e disposições deste acordo.</p>
    <h3>2. Descrição do Serviço</h3>
    <p>A ViajaStore é uma plataforma intermediária que conecta agências de viagens a consumidores finais.</p>
    <h3>3. Cancelamentos e Reembolsos</h3>
    <p>As políticas variam por agência e pacote. Leia atentamente as condições na página de cada viagem.</p>
  </div>
);

export const Privacy: React.FC = () => (
  <div className="max-w-3xl mx-auto py-12 prose prose-blue prose-lg">
    <h1>Política de Privacidade</h1>
    <p>Na ViajaStore, levamos sua privacidade a sério.</p>
    <h3>1. Coleta de Dados</h3>
    <p>Coletamos apenas dados necessários para a prestação dos serviços (Nome, CPF, Email, Telefone).</p>
    <h3>2. Uso de Informações</h3>
    <p>Seus dados são usados exclusivamente para processar reservas e melhorar sua experiência no site.</p>
    <h3>3. Segurança</h3>
    <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados pessoais.</p>
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
