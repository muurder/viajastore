import React, { useState } from 'react';
import { X, Copy, CheckCircle2, MessageCircle, QrCode } from 'lucide-react';
import { Plan, Agency } from '../types';
import { useToast } from '../context/ToastContext';

interface SubscriptionModalProps {
  plan: Plan;
  agency: Agency;
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ plan, agency, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  
  // PIX Configuration
  const PIX_KEY = '401.334.708-30';
  const PIX_BENEFICIARY = 'Juan Galindo';
  const WHATSAPP_NUMBER = '5511987697684';
  
  // Generate QR Code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_KEY)}`;
  
  const formatPrice = (price: number) => {
    if (price === 0) return 'Grátis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };
  
  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      showToast('Chave PIX copiada!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Erro ao copiar. Tente novamente.', 'error');
    }
  };
  
  const handleOpenWhatsApp = () => {
    const planName = plan.name;
    const message = encodeURIComponent(
      `Olá, sou a agência ${agency.name}. Fiz o PIX para o plano ${planName}. Segue o comprovante.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors z-10"
        >
          <X size={20}/>
        </button>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white rounded-t-2xl">
          <h2 className="text-2xl font-bold mb-1">Upgrade para {plan.name}</h2>
          <p className="text-primary-50 text-lg font-semibold">
            {formatPrice(plan.price)}
            {plan.price > 0 && <span className="text-sm font-normal">/mês</span>}
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Coluna 1: QR Code */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode size={20} className="text-primary-600"/>
                <h3 className="text-lg font-bold text-gray-900">QR Code PIX</h3>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200 flex items-center justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="w-48 h-48 rounded-lg"
                />
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                Escaneie o QR Code com o app do seu banco para pagar
              </p>
            </div>
            
            {/* Coluna 2: Dados PIX */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dados para Pagamento</h3>
              
              {/* Chave PIX */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Chave PIX (CPF)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-mono font-bold text-gray-900 flex-1 break-all">
                      {PIX_KEY}
                    </p>
                    <button
                      onClick={handleCopyPixKey}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                        copied 
                          ? 'bg-green-600 text-white' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 size={16} className="text-white"/>
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={16}/>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Beneficiário */}
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Beneficiário</p>
                  <p className="text-sm font-bold text-gray-900">{PIX_BENEFICIARY}</p>
                </div>
                
                {/* Valor */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-600">Valor do Plano</span>
                    <span className="text-2xl font-extrabold text-green-600">
                      {formatPrice(plan.price)}
                      {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer: CTA Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleOpenWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 flex items-center justify-center gap-3 text-lg"
            >
              <MessageCircle size={24} className="text-white"/>
              Enviar Comprovante e Ativar
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-3">
              Após o pagamento, envie o comprovante via WhatsApp para ativar seu plano
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;

