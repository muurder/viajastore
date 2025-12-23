import React from 'react';
import {
    X as XIcon,
    Users,
    Edit3,
    Trash2,
    ArchiveRestore,
    Trash,
    Ban,
    UserCheck
} from 'lucide-react';
import { UsersFilterModalProps } from '../../types';

export const UsersFilterModal: React.FC<UsersFilterModalProps> = ({
    isOpen,
    onClose,
    title,
    users,
    onUserClick,
    onUserAction,
    showUserTrash
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
                        <p className="text-slate-600 mt-1">{users.length} usuário(s) encontrado(s)</p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {users.length > 0 ? (
                            <div className="space-y-3">
                                {users.map((client) => (
                                    <div
                                        key={client.id}
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all cursor-pointer group"
                                        onClick={() => onUserClick(client)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <img
                                                    src={client.avatar || `https://ui-avatars.com/api/?name=${client.name}`}
                                                    className="w-12 h-12 rounded-full ring-2 ring-gray-200 group-hover:ring-primary-300 transition-all"
                                                    alt=""
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-primary-600 transition-colors">{client.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{client.email}</p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${client.status === 'ACTIVE'
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {client.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
                                                </span>
                                            </div>
                                            <div className="ml-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {showUserTrash ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUserAction(client, 'restore'); }}
                                                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Restaurar"
                                                        >
                                                            <ArchiveRestore size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUserAction(client, 'delete'); }}
                                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Excluir Permanentemente"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUserAction(client, 'edit'); }}
                                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Editar Detalhes"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUserAction(client, 'toggle'); }}
                                                            className={`p-2 rounded-lg transition-colors ${client.status === 'ACTIVE'
                                                                    ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                                                }`}
                                                            title={client.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
                                                        >
                                                            {client.status === 'ACTIVE' ? <Ban size={18} /> : <UserCheck size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onUserAction(client, 'delete'); }}
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
                                <Users size={48} className="text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-semibold">Nenhum usuário encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
