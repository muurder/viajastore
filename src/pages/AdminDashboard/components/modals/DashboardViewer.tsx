import React from 'react';
import { X as XIcon, Shield, AlertTriangle } from 'lucide-react';
import { DashboardViewerProps } from '../../types';
import { Agency } from '../../../../types';
import { logger } from '../../../../utils/logger';

interface DashboardViewerPropsExtended extends DashboardViewerProps {
    agencies?: Agency[]; // Needed for agency URL lookup
}

export const DashboardViewer: React.FC<DashboardViewerPropsExtended> = ({
    isOpen,
    type,
    entityId,
    entityName,
    onClose,
    agencies = []
}) => {
    if (!isOpen || !entityId) return null;

    // Build the correct URL for HashRouter based on type
    const basePath = window.location.pathname.replace(/\/$/, '');
    let dashboardUrl = '';

    if (type === 'client') {
        dashboardUrl = `${window.location.origin}${basePath}/#/client/dashboard/PROFILE?impersonate=${entityId}`;
    } else if (type === 'agency') {
        // Get agency slug from entityId
        const agency = agencies.find(a => a.agencyId === entityId);
        if (agency?.slug) {
            dashboardUrl = `${window.location.origin}${basePath}/#/${agency.slug}/dashboard?impersonate=${entityId}`;
        } else {
            dashboardUrl = `${window.location.origin}${basePath}/#/agency/dashboard?impersonate=${entityId}`;
        }
    } else if (type === 'guide') {
        dashboardUrl = `${window.location.origin}${basePath}/#/guide/dashboard?impersonate=${entityId}`;
    }

    const typeLabels = {
        client: 'Cliente',
        agency: 'Agência',
        guide: 'Guia de Turismo'
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] animate-[fadeIn_0.2s]"
                onClick={onClose}
            />
            <div
                className="fixed inset-0 z-[201] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col animate-[scaleIn_0.2s]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <h2 className="text-xl font-semibold text-slate-900">Painel do {typeLabels[type]}</h2>
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold flex items-center gap-2">
                                <Shield size={14} />
                                Acesso Administrativo
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <XIcon size={24} />
                        </button>
                    </div>

                    {/* Admin Warning Banner */}
                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                            <AlertTriangle size={18} className="text-amber-600" />
                            <span>Você está visualizando o perfil de <strong>{entityName || typeLabels[type]}</strong> como Administrador. Todas as ações serão registradas.</span>
                        </div>
                    </div>

                    {/* Iframe Content */}
                    <div className="flex-1 overflow-hidden">
                        <iframe
                            src={dashboardUrl}
                            className="w-full h-full border-0"
                            title={`${typeLabels[type]} Dashboard`}
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                            onLoad={(e) => {
                                // Ensure impersonate parameter is preserved in iframe navigation
                                const iframe = e.currentTarget;
                                try {
                                    const iframeWindow = iframe.contentWindow;
                                    if (iframeWindow) {
                                        // Intercept navigation to preserve impersonate parameter
                                        const originalPushState = iframeWindow.history.pushState;
                                        iframeWindow.history.pushState = function (...args) {
                                            const url = args[2] as string;
                                            if (url && !url.includes('impersonate=')) {
                                                const separator = url.includes('?') ? '&' : '?';
                                                args[2] = `${url}${separator}impersonate=${entityId}`;
                                            }
                                            return originalPushState.apply(iframeWindow.history, args);
                                        };
                                    }
                                } catch (err) {
                                    // Cross-origin restrictions may prevent access
                                    logger.warn('Could not intercept iframe navigation:', err);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
};
