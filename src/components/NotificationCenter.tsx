import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BroadcastMessage, UserRole } from '../types';
import { Bell, X, ThumbsUp, Trash2, Megaphone, Loader, CheckCheck, Inbox, Clock, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { logger } from '../utils/logger';

interface NotificationCenterProps {
  className?: string;
}

// Helper to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { getUserNotifications, interactWithBroadcast } = useData();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<BroadcastMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read IDs from localStorage
  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`notifications_read_${user.id}`);
      if (stored) {
        try {
          setReadIds(new Set(JSON.parse(stored)));
        } catch {
          setReadIds(new Set());
        }
      }
    }
  }, [user?.id]);

  // Save read IDs to localStorage
  const saveReadIds = useCallback((ids: Set<string>) => {
    if (user?.id) {
      localStorage.setItem(`notifications_read_${user.id}`, JSON.stringify([...ids]));
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && (user.role === UserRole.CLIENT || user.role === UserRole.AGENCY || user.role === UserRole.GUIDE)) {
      loadNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getUserNotifications(user.id, user.role);
      setNotifications(data);
    } catch (error: any) {
      logger.error("[NotificationCenter] Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = useCallback(async (broadcastId: string) => {
    if (processingIds.has(broadcastId)) return;

    // Mark as read locally
    setReadIds(prev => {
      const updated = new Set(prev).add(broadcastId);
      saveReadIds(updated);
      return updated;
    });

    setProcessingIds(prev => new Set(prev).add(broadcastId));
    try {
      await interactWithBroadcast(broadcastId, 'READ');
    } catch (error: any) {
      logger.error("[NotificationCenter] Error marking as read:", error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(broadcastId);
        return next;
      });
    }
  }, [processingIds, interactWithBroadcast, saveReadIds]);

  const handleMarkAllRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !readIds.has(n.id));

    for (const notification of unreadNotifications) {
      setReadIds(prev => {
        const updated = new Set(prev).add(notification.id);
        saveReadIds(updated);
        return updated;
      });

      try {
        await interactWithBroadcast(notification.id, 'READ');
      } catch (error) {
        logger.error("[NotificationCenter] Error marking as read:", error);
      }
    }

    showToast('Todas marcadas como lidas', 'success');
  }, [notifications, readIds, interactWithBroadcast, saveReadIds, showToast]);

  const handleLike = async (broadcastId: string) => {
    if (processingIds.has(broadcastId)) return;

    setProcessingIds(prev => new Set(prev).add(broadcastId));
    try {
      await interactWithBroadcast(broadcastId, 'LIKE');
      showToast('Obrigado pelo feedback! 👍', 'success');

      // Also mark as read
      setReadIds(prev => {
        const updated = new Set(prev).add(broadcastId);
        saveReadIds(updated);
        return updated;
      });
    } catch (error: any) {
      logger.error("[NotificationCenter] Error liking:", error);
      showToast('Erro ao processar ação', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(broadcastId);
        return next;
      });
    }
  };

  const handleDelete = async (broadcastId: string) => {
    if (processingIds.has(broadcastId)) return;

    setProcessingIds(prev => new Set(prev).add(broadcastId));
    try {
      await interactWithBroadcast(broadcastId, 'DELETE');
      setNotifications(prev => prev.filter(n => n.id !== broadcastId));
      showToast('Notificação removida', 'success');
    } catch (error: any) {
      logger.error("[NotificationCenter] Error deleting:", error);
      showToast('Erro ao remover notificação', 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(broadcastId);
        return next;
      });
    }
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  if (!user || (user.role !== UserRole.CLIENT && user.role !== UserRole.AGENCY && user.role !== UserRole.GUIDE)) {
    return null;
  }

  return (
    <>
      {/* Notification Bell Button - Clean Design */}
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 rounded-lg hover:bg-stone-100 transition-all duration-200 group ${className}`}
        title="Notificações"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell size={20} className="text-stone-600 group-hover:text-stone-900 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-white" />
        )}
      </button>

      {/* Sheet Overlay & Panel - Clean Luxury Design */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] animate-[fadeIn_0.15s]"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet Panel - Slides from Right */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[9999] shadow-2xl flex flex-col animate-[slideInRight_0.25s_ease-out]">

            {/* Header - Clean White */}
            <div className="bg-white border-b border-stone-100 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-900 text-lg tracking-tight">Notificações</h3>
                <p className="text-stone-500 text-sm">
                  {notifications.length === 0
                    ? 'Nenhuma notificação'
                    : `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mark All as Read Button */}
            {unreadCount > 0 && (
              <div className="px-6 py-3 border-b border-stone-50 bg-stone-50/50">
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <CheckCheck size={16} />
                  Marcar todas como lidas
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Loader size={28} className="animate-spin text-stone-400 mb-4" />
                  <p className="text-stone-500 text-sm">Carregando...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 px-6">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-5">
                    <Inbox size={28} className="text-stone-400" />
                  </div>
                  <p className="text-stone-700 font-medium mb-1">Tudo limpo!</p>
                  <p className="text-stone-500 text-sm text-center">
                    Você não possui notificações no momento.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {notifications.map((notification) => {
                    const isRead = readIds.has(notification.id);
                    const isExpanded = expandedId === notification.id;

                    return (
                      <div
                        key={notification.id}
                        className={`relative px-6 py-5 transition-colors cursor-pointer ${isRead
                            ? 'bg-white hover:bg-stone-50'
                            : 'bg-primary-50/30 hover:bg-primary-50/50'
                          }`}
                        onClick={() => {
                          setExpandedId(isExpanded ? null : notification.id);
                          if (!isRead) handleRead(notification.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Unread Indicator */}
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isRead ? 'bg-transparent' : 'bg-primary-500'
                            }`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="flex items-center gap-2">
                                <Megaphone size={14} className={`flex-shrink-0 ${isRead ? 'text-stone-400' : 'text-primary-500'}`} />
                                <h4 className={`text-sm font-medium ${isRead ? 'text-stone-600' : 'text-stone-900'
                                  }`}>
                                  {notification.title}
                                </h4>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                                disabled={processingIds.has(notification.id)}
                                className="p-1 text-stone-300 hover:text-red-500 rounded transition-colors disabled:opacity-50 flex-shrink-0 opacity-0 group-hover:opacity-100"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Message */}
                            <p className={`text-sm mb-2 ${isRead ? 'text-stone-500' : 'text-stone-700'
                              } ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {notification.message}
                            </p>

                            {/* Date */}
                            <div className="flex items-center gap-1.5 text-xs text-stone-400">
                              <Clock size={12} />
                              <span>{formatRelativeTime(notification.created_at)}</span>
                            </div>

                            {/* Actions - Show when expanded */}
                            {isExpanded && (
                              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-stone-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(notification.id);
                                  }}
                                  disabled={processingIds.has(notification.id)}
                                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                  {processingIds.has(notification.id) ? (
                                    <Loader size={14} className="animate-spin" />
                                  ) : (
                                    <>
                                      <ThumbsUp size={14} />
                                      Li e Concordo
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(notification.id);
                                  }}
                                  disabled={processingIds.has(notification.id)}
                                  className="px-4 py-2 text-stone-500 hover:text-red-600 text-sm font-medium transition-colors"
                                >
                                  Remover
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default NotificationCenter;
