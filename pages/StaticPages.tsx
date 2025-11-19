import React from 'react';
import { Mail, Phone, MapPin, ShieldCheck, Users, Heart } from 'lucide-react';

export const About: React.FC = () => (
  <div className="max-w-3xl mx-auto space-y-8 py-8">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Sobre a ViajaStore</h1>
      <p className="text-xl text-gray-500">Conectando viajantes a experiências inesquecíveis.</p>
    </div>
    <div className="prose prose-lg mx-auto text-gray-600">
      <p>
        Fundada em 2024, a ViajaStore nasceu com a missão de democratizar o acesso ao turismo de qualidade no Brasil. 
        Somos um marketplace que une as melhores agências de viagem do país a viajantes que buscam segurança, 
        praticidade e preços justos.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
          <ShieldCheck className="mx-auto text-primary-600 mb-2" size={32}/>
          <h3 className="font-bold">Segurança</h3>
          <p className="text-sm">Agências verificadas e pagamentos seguros.</p>
        </div>
        <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
          <Users className="mx-auto text-primary-600 mb-2" size={32}/>
          <h3 className="font-bold">Comunidade</h3>
          <p className="text-sm">Milhares de avaliações reais de viajantes.</p>
        </div>
        <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
          <Heart className="mx-auto text-primary-600 mb-2" size={32}/>
          <h3 className="font-bold">Paixão</h3>
          <p className="text-sm">Amamos viajar e queremos que você ame também.</p>
        </div>
      </div>
    </div>
  </div>
);

export const Contact: React.FC = () => (
  <div className="max-w-2xl mx-auto py-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Fale Conosco</h1>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="space-y-6 mb-8">
        <div className="flex items-center text-gray-600">
          <Mail className="mr-3 text-primary-600" />
          <span>suporte@viajastore.com</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Phone className="mr-3 text-primary-600" />
          <span>0800 123 4567</span>
        </div>
        <div className="flex items-center text-gray-600">
          <MapPin className="mr-3 text-primary-600" />
          <span>Av. Paulista, 1000 - São Paulo, SP</span>
        </div>
      </div>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="Seu nome" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className="w-full border border-gray-300 rounded-lg p-2" placeholder="seu@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
          <textarea className="w-full border border-gray-300 rounded-lg p-2" rows={4} placeholder="Como podemos ajudar?"></textarea>
        </div>
        <button type="submit" className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700">Enviar Mensagem</button>
      </form>
    </div>
  </div>
);

export const Terms: React.FC = () => (
  <div className="max-w-3xl mx-auto py-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">Termos e Política de Privacidade</h1>
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 prose prose-blue">
      <h3>1. Introdução</h3>
      <p>Bem-vindo à ViajaStore. Ao utilizar nosso site, você concorda com estes termos.</p>
      <h3>2. Uso de Dados</h3>
      <p>Coletamos apenas os dados necessários para processar suas reservas e melhorar sua experiência. Seus dados são protegidos e nunca vendidos a terceiros.</p>
      <h3>3. Cancelamentos</h3>
      <p>Cada agência possui sua política de cancelamento. Verifique os detalhes na página de cada pacote antes de comprar.</p>
      <h3>4. Responsabilidades</h3>
      <p>A ViajaStore atua como intermediária. A execução dos serviços turísticos é de responsabilidade das agências parceiras.</p>
    </div>
  </div>
);

export const Help: React.FC = () => (
  <div className="max-w-4xl mx-auto py-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Central de Ajuda</h1>
    <div className="grid gap-6">
      {[
        { q: 'Como recebo meu voucher?', a: 'Após a confirmação do pagamento, seu voucher estará disponível imediatamente no seu Painel de Cliente e também será enviado por email.' },
        { q: 'É seguro comprar na ViajaStore?', a: 'Sim! Utilizamos criptografia de ponta e processamos pagamentos apenas através de gateways certificados. Além disso, todas as agências são verificadas.' },
        { q: 'Posso cancelar minha viagem?', a: 'Sim, mas depende da política de cada pacote. Você pode solicitar o cancelamento diretamente no detalhe da sua reserva no painel.' },
        { q: 'Como entro em contato com a agência?', a: 'Após a compra, você terá acesso aos dados diretos da agência (telefone e email) no seu voucher.' }
      ].map((item, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg text-gray-900 mb-2">{item.q}</h3>
          <p className="text-gray-600">{item.a}</p>
        </div>
      ))}
    </div>
  </div>
);