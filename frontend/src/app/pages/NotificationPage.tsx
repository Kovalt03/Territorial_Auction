import { useState, useEffect } from 'react';

import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import {
  fetchNotificationList, markNotificationRead, markAllNotificationsRead,
  type NotificationItem,
} from '../api/notification';

const TYPE_ICON: Record<string, string> = {
  OUTBID: '⚡',
  AUCTION_WIN: '🏆',
  AUCTION_LOSE: '❌',
  SIEGE_ALERT: '⚔️',
  SIEGE_RESULT: '🛡️',
  TAX_CHARGED: '💰',
  INCOME: '💎',
};

const TYPE_COLOR: Record<string, string> = {
  OUTBID: '#ff8c00',
  AUCTION_WIN: '#ffd700',
  AUCTION_LOSE: '#ff3333',
  SIEGE_ALERT: '#ff3333',
  SIEGE_RESULT: '#8b50ff',
  TAX_CHARGED: '#ff8c00',
  INCOME: '#00ff88',
};

const PAGE_SIZE = 20;

export function NotificationPage() {
  const { decrementNotification, resetNotifications } = useApp();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetchNotificationList(0, PAGE_SIZE)
      .then(res => {
        setNotifications(res.notifications);
        setHasMore(res.notifications.length === PAGE_SIZE);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setIsLoadingMore(true);
    try {
      const res = await fetchNotificationList(nextPage, PAGE_SIZE);
      setNotifications(prev => [...prev, ...res.notifications]);
      setHasMore(res.notifications.length === PAGE_SIZE);
      setPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkRead = async (notif: NotificationItem) => {
    if (notif.isRead) return;
    try {
      await markNotificationRead(notif.notificationId);
      setNotifications(prev => prev.map(n => n.notificationId === notif.notificationId ? { ...n, isRead: true } : n));
      decrementNotification();
    } catch {
      // silently ignore — badge count stays consistent
    }
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a]">
      <GNB />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[#e0e8ff] font-bold text-[22px]">알림</h1>
              {unreadCount > 0 && (
                <p className="text-[#7788a5] text-[13px]">읽지 않은 알림 {unreadCount}개</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="px-3 py-1.5 rounded-lg border border-[#354064] text-[#8892b0] hover:border-[#4a5a7a] hover:text-[#e0e8ff] transition-colors text-xs"
              >
                {isMarkingAll ? '처리 중...' : '전체 읽음'}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-[#4a5a7a] py-20 text-sm">불러오는 중...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-[#4a5a7a] py-20 text-sm">알림이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map(n => (
                <div
                  key={n.notificationId}
                  onClick={() => handleMarkRead(n)}
                  className="bg-[#1a1f35] border rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer transition-all"
                  style={{ borderColor: n.isRead ? '#354064' : TYPE_COLOR[n.type] ?? '#354064', opacity: n.isRead ? 0.7 : 1 }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${TYPE_COLOR[n.type] ?? '#354064'}20` }}
                  >
                    {TYPE_ICON[n.type] ?? '🔔'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e0e8ff] text-sm">{n.message}</p>
                    <p className="text-[#4a5a7a] mt-0.5 text-[11px]">
                      {new Date(n.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: TYPE_COLOR[n.type] ?? '#00f5ff' }} />
                  )}
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="w-full py-3 mt-2 rounded-xl border border-[#354064] text-[#7788a5] hover:border-[#4a5a7a] hover:text-[#e0e8ff] disabled:opacity-50 transition-colors text-[13px]"
                >
                  {isLoadingMore ? '불러오는 중...' : '더 보기'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
