import React, { useState } from 'react';
import { Rocket, X, QrCode, Copy, CheckCircle2, MessageCircle, Info } from 'lucide-react';
import { Plan } from '../../../../types';
import { useToast } from '../../../../context/ToastContext';
import { logger } from '../../../../utils/logger';

interface SubscriptionConfirmationModalProps {
    plan: Plan;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
    agencyName?: string;
}

const SubscriptionConfirmationModal: React.FC<SubscriptionConfirmationModalProps> = ({ plan, onClose, onConfirm, isSubmitting, agencyName = '' }) => {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);

    // PIX Configuration
    const PIX_KEY = '401.334.708-30';
    const PIX_BENEFICIARY = 'Juan Nicolas Galindo Primo';
    const WHATSAPP_NUMBER = '5511987697684';

    // Nubank PIX Links by Plan
    const NUBANK_PIX_LINKS: Record<string, string> = {
        'BASIC': 'https://nubank.com.br/cobrar/43zc9/693a4b0c-9628-4b2a-8cc3-a2606154b8ac', // R$ 59,90
        'PREMIUM': 'https://nubank.com.br/cobrar/43zc9/693a4ae6-28e1-4e55-ba8d-e52d3a7ffbd0', // R$ 99,90
    };

    // Get Nubank link for current plan
    const nubankLink = plan ? NUBANK_PIX_LINKS[plan.id] || '' : '';
    const hasNubankLink = !!nubankLink;

    // QR Code: Use Nubank link if available, otherwise generate from PIX key
    const qrCodeUrl = hasNubankLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(nubankLink)}`
        : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(PIX_KEY)}`;

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
            `Olá, fiz o pix para o plano ${planName} da agência ${agencyName || 'minha agência'}. Segue o comprovante.`
        );
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    };

    const formatPrice = (price: number) => {
        if (price === 0) return 'Grátis';
        return `R$ ${price.toFixed(2).replace('.', ',')}`;
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_0.2s]">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition-colors z-10">
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Rocket size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">Ativar Plano {plan.name}</h2>
                    </div>
                    <p className="text-primary-50 text-sm">Siga os passos abaixo para finalizar sua assinatura</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: PIX Payment */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                1
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Faça o Pagamento via PIX</h3>
                        </div>

                        {/* PIX Card */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-3">
                                <QrCode size={20} className="text-green-600" />
                                <span className="text-sm font-bold text-green-700 uppercase tracking-wide">
                                    {hasNubankLink ? 'Pagamento via Nubank' : 'Chave PIX (CPF)'}
                                </span>
                            </div>

                            {/* QR Code Section */}
                            {hasNubankLink && (
                                <div className="bg-white rounded-lg p-4 border border-green-200 flex flex-col items-center gap-3">
                                    <img
                                        src={qrCodeUrl}
                                        alt="QR Code PIX Nubank"
                                        className="w-40 h-40 rounded-lg"
                                    />
                                    <button
                                        onClick={() => window.open(nubankLink, '_blank')}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 text-sm"
                                    >
                                        <QrCode size={16} className="text-white" />
                                        Abrir QR Code
                                    </button>
                                    <p className="text-xs text-gray-500 text-center">
                                        Clique no botão para abrir o QR Code
                                    </p>
                                </div>
                            )}

                            <div className="bg-white rounded-lg p-4 border border-green-200">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                                        <p className="text-lg font-mono font-bold text-gray-900 break-all">{PIX_KEY}</p>
                                    </div>
                                    <button
                                        onClick={handleCopyPixKey}
                                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied
                                                ? 'bg-green-600 text-white'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle2 size={16} className="text-white" />
                                                Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={16} />
                                                Copiar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg p-3 border border-green-200">
                                <p className="text-xs text-gray-500 mb-1">Beneficiário</p>
                                <p className="text-sm font-bold text-gray-900">{PIX_BENEFICIARY}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 border-2 border-green-500">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-600">Valor do Plano</span>
                                    <span className="text-2xl font-extrabold text-green-600">
                                        {formatPrice(plan.price)}<span className="text-sm font-normal text-gray-500">/mês</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Send Receipt */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Envie o Comprovante</h3>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                Após realizar a transferência, envie o comprovante no nosso WhatsApp para ativarmos sua conta imediatamente.
                            </p>
                        </div>

                        <button
                            onClick={handleOpenWhatsApp}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-3"
                        >
                            <MessageCircle size={20} />
                            <span>Enviar Comprovante no WhatsApp</span>
                        </button>
                    </div>

                    {/* Footer Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <strong>Atenção:</strong> A liberação do plano ocorre em instantes após a conferência do pagamento.
                        </p>
                    </div>

                    {/* Cancel Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionConfirmationModal;
