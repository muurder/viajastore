import React, { useState } from 'react';
import { Star, Edit, Send, MessageCircle } from 'lucide-react';
import { AgencyReview, Agency } from '../../../../types';
import { useToast } from '../../../../context/ToastContext';
import { useData } from '../../../../context/DataContext';
import { logger } from '../../../../utils/logger';

interface AgencyReviewsProps {
    reviews: AgencyReview[];
    currentAgency: Agency;
}

export const AgencyReviews: React.FC<AgencyReviewsProps> = ({ reviews, currentAgency }) => {
    const { updateAgencyReview } = useData();
    const { showToast } = useToast();
    const [replyText, setReplyText] = useState('');
    const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
    const [isSendingReply, setIsSendingReply] = useState<string | null>(null);

    const handleSendReply = async (reviewId: string) => {
        if (!replyText.trim()) return;
        setIsSendingReply(reviewId);
        try {
            await updateAgencyReview(reviewId, { response: replyText });
            setReplyText('');
            setActiveReplyId(null);
            showToast('Resposta enviada com sucesso!', 'success');
        } catch (error: any) {
            logger.error('Error sending reply:', error);
            showToast(`Erro ao enviar resposta: ${error.message || 'Erro desconhecido'}`, 'error');
        } finally {
            setIsSendingReply(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-[fadeIn_0.3s]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Avaliações da Minha Agência ({reviews.length})</h2>
            {reviews.length > 0 ? (
                <div className="space-y-4">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{review.clientName?.charAt(0)}</div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{review.clientName || 'Cliente ViajaStore'}</p>
                                        <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex text-amber-400">{[...Array(5)].map((_, i) => (<Star key={i} size={14} className={i < review.rating ? 'fill-current' : 'text-gray-300'} />))}</div>
                            </div>
                            <p className="text-gray-700 text-sm italic mb-3">"{review.comment}"</p>
                            {review.tags && review.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {review.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-full border border-blue-100">{tag}</span>
                                    ))}
                                </div>
                            )}
                            {review.tripTitle && (
                                <p className="text-xs text-gray-500 mb-3">Avaliação do pacote: <span className="font-bold">{review.tripTitle}</span></p>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                                    {currentAgency?.name.charAt(0)}
                                </div>
                                <div className="flex-1 w-full relative group/reply">
                                    {(review.reply || review.response) ? (
                                        <div className="bg-gray-50 p-3 rounded-lg mt-3 border-l-4 border-primary-500 relative animate-[fadeIn_0.3s]">
                                            <p className="text-xs font-bold text-gray-900 mb-1">Resposta da Agência:</p>
                                            <p className="text-sm text-gray-700 italic">{review.reply || review.response}</p>
                                            <button onClick={() => { setReplyText(review.reply || review.response || ''); setActiveReplyId(review.id); }} className="absolute top-2 right-2 text-gray-400 hover:text-primary-600 opacity-0 group-hover/reply:opacity-100 transition-opacity"><Edit size={14} /></button>
                                        </div>
                                    ) : (
                                        activeReplyId === review.id ? (
                                            <div className="bg-white p-3 rounded-lg border border-primary-200 shadow-sm w-full">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Escreva sua resposta..."
                                                    className="w-full text-sm p-2 outline-none resize-none h-20 bg-transparent"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={() => setActiveReplyId(null)} className="text-xs text-gray-500 font-bold hover:bg-gray-100 px-3 py-1.5 rounded">Cancelar</button>
                                                    <button onClick={() => handleSendReply(review.id)} className="text-xs bg-primary-600 text-white font-bold px-4 py-1.5 rounded hover:bg-primary-700 flex items-center gap-1"><Send size={12} /> Enviar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setActiveReplyId(review.id); setReplyText(''); }} className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-2 py-1.5">
                                                <MessageCircle size={16} /> Responder
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400 text-sm">
                    <Star size={32} className="mx-auto mb-3" />
                    <p>Nenhuma avaliação ainda. Mantenha a qualidade para receber feedback!</p>
                </div>
            )}
        </div>
    );
};
