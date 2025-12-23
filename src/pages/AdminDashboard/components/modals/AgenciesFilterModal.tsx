import React from 'react';
import {
    X as XIcon,
    Briefcase,
    Edit3,
    CreditCard,
    Trash2,
    ArchiveRestore,
    Trash
} from 'lucide-react';
import { AgenciesFilterModalProps } from '../../types';

export const AgenciesFilterModal: React.FC<AgenciesFilterModalProps> = ({
    isOpen,
    onClose,
    title,
    agencies,
    onAgencyClick,
    onAgencyAction,
    showAgencyTrash
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-[fadeIn_0.2s]"
                onClick={onClose}
            />
            <div
                className="fixed inset-0 z-[101] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-[scaleIn_0.2s]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 px-8 py-6 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <XIcon size={24} />
                        </button>
                        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
                        <p className="text-slate-600 mt-1">{agencies.length} agência(s) encontrada(s)</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {agencies.length > 0 ? (
                            <div className="space-y-3">
                                {agencies.map((agency) => (
                                    <div
                                        key={agency.id}
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all cursor-pointer group"
                                        onClick={() => onAgencyClick(agency)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <img
                                                    src={agency.logo_url || `https://ui-avatars.com/api/?name=${agency.name}`}
                                                    className="w-12 h-12 rounded-full ring-2 ring-gray-200 group-hover:ring-primary-300 transition-all"
                                                    alt=""
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">{agency.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{agency.email || '---'}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${agency.subscriptionStatus === 'ACTIVE'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-red-50 text-red-700'
                                                        }`}>
                                                        {agency.subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                    {agency.subscriptionPlan === 'PREMIUM' && (
                                                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                                            PREMIUM
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {showAgencyTrash ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'restore'); }}
                                                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Restaurar"
                                                        >
                                                            <ArchiveRestore size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'delete'); }}
                                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir Permanentemente"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'edit'); }}
                                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar Detalhes"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'plan'); }}
                                                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                                                            title="Mudar Plano"
                                                        >
                                                            <CreditCard size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onAgencyAction(agency, 'delete'); }}
                                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Briefcase size={48} className="text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-semibold">Nenhuma agência encontrada</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
