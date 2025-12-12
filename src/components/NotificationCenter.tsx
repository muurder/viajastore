import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BroadcastMessage, UserRole } from '../types';
import { Bell, X, ThumbsUp, Trash2, Megaphone, Loader } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { logger } from '../utils/logger';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { getUserNotifications, interactWithBroadcast } = useData();
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState<BroadcastMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        // Auto-request permission (optional - you might want to make this manual)
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            showToast('Notificações ativadas!', 'success');
          }
        });
      }
    }
  }, []);

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
      const newCount = data.length;
      
      // Show push notification if there are new notifications
      if (newCount > lastNotificationCount && lastNotificationCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const newNotifications = data.slice(0, newCount - lastNotificationCount);
        newNotifications.forEach(notification => {
          new Notification(notification.title, {
            body: notification.message.substring(0, 100) + (notification.message.length > 100 ? '...' : ''),
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notification.id,
            requireInteraction: false
          });
        });
      }
      
      setNotifications(data);
      setLastNotificationCount(newCount);
    } catch (error: any) {
      logger.error("[NotificationCenter] Error loading notifications:", error);
      showToast('Erro ao carregar notificações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (broadcastId: string) => {
    if (processingIds.has(broadcastId)) return;
    
    setProcessingIds(prev => new Set(prev).add(broadcastId));
    try {
      await interactWithBroadcast(broadcastId, 'READ');
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === broadcastId ? { ...n } : n
      ));
    } catch (error: any) {
      logger.error("[NotificationCenter] Error marking as read:", error);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(broadcastId);
        return next;
      });
    }
  };

  const handleLike = async (broadcastId: string) => {
    if (processingIds.has(broadcastId)) return;
    
    setProcessingIds(prev => new Set(prev).add(broadcastId));
    try {
      await interactWithBroadcast(broadcastId, 'LIKE');
      showToast('Obrigado pelo feedback! 👍', 'success');
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === broadcastId ? { ...n } : n
      ));
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
    
    if (!window.confirm('Deseja remover esta notificação?')) return;
    
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

  const unreadCount = notifications.length; // All notifications are considered "new" until read

  if (!user || (user.role !== UserRole.CLIENT && user.role !== UserRole.AGENCY && user.role !== UserRole.GUIDE)) {
    return null;
  }

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => {
            setIsOpen(true);
            // Mark all as read when opening
            notifications.forEach(n => handleRead(n.id));
          }}
          className={`relative p-2 rounded-lg hover:bg-slate-100 transition-colors ${className}`}
          title="Comunicados"
        >
          <Bell size={20} className="text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Notification Permission Status */}
        {notificationPermission === 'default' && (
          <button
            onClick={async () => {
              if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission === 'granted') {
                  showToast('Notificações ativadas!', 'success');
                } else if (permission === 'denied') {
                  showToast('Notificações bloqueadas. Permita no navegador.', 'warning');
                }
              }
            }}
            className="absolute -bottom-8 left-0 whitespace-nowrap text-[10px] text-blue-600 hover:text-blue-700 underline"
            title="Ativar notificações push"
          >
            Ativar notificações
          </button>
        )}
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-16 right-4 md:right-8 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[9999] border border-slate-200 max-h-[80vh] overflow-hidden flex flex-col animate-[slideIn_0.2s]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Megaphone size={20} className="text-slate-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Comunicados</h3>
                  <p className="text-xs text-slate-600">{notifications.length} mensagem{notifications.length !== 1 ? 'ns' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader size={32} className="animate-spin text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600">Carregando...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell size={48} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600 font-semibold">Nenhum comunicado</p>
                  <p className="text-sm text-slate-500 mt-1">Você não possui mensagens no momento</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{notification.title}</h4>
                          <p className="text-xs text-slate-500">
                            {new Date(notification.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(notification.id)}
                          disabled={processingIds.has(notification.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div
                        className={`text-sm text-slate-700 mb-4 ${
                          expandedId === notification.id ? '' : 'line-clamp-3'
                        }`}
                        onClick={() => {
                          setExpandedId(expandedId === notification.id ? null : notification.id);
                          handleRead(notification.id);
                        }}
                      >
                        {notification.message}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleLike(notification.id)}
                          disabled={processingIds.has(notification.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingIds.has(notification.id) ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <>
                              <ThumbsUp size={16} />
                              Li e Concordo
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default NotificationCenter;
