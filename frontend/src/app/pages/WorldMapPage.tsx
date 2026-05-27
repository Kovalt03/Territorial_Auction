import { useState, useEffect } from 'react';

import { useApp } from '../context/AppContext';
import { fetchMyGuild } from '../api/guild';
import { GNB } from '../components/GNB';
import { MapCanvas } from '../components/MapCanvas';
import { ChatPanel } from '../components/ChatPanel';

// Re-export for backward compatibility
export type { ContinentDef } from '../data/continents';
export { CONTINENTS } from '../data/continents';

type ChatTab = 'world' | 'guild';

export function WorldMapPage() {
  const [showChat, setShowChat] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>('world');
  const [myGuildId, setMyGuildId] = useState<number | null>(null);
  const { isLoggedIn } = useApp();

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMyGuild()
      .then(g => setMyGuildId(g.guildId))
      .catch(() => setMyGuildId(null));
  }, [isLoggedIn]);

  const roomId = chatTab === 'world'
    ? 'room_world'
    : myGuildId != null ? `room_guild_${myGuildId}` : null;

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <GNB />

      <div className="flex flex-1 overflow-hidden">
        {/* Map canvas — takes up all remaining space */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #0c1428 0%, #040810 100%)' }}
        >
          <MapCanvas />

          {/* Chat FAB */}
          <button
            onClick={() => setShowChat(v => !v)}
            className="absolute bottom-4 right-4 z-20 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-xl hover:brightness-110 transition-all"
            style={{ boxShadow: '0 0 20px #00f5ff40' }}
          >
            💬
          </button>
        </div>

        {/* Chat slide-in panel */}
        {showChat && (
          <div className="flex-shrink-0 w-[280px] bg-[#080d1a] border-l border-[#1a2438] flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#1a2438]">
              <span className="text-[#c0ccdd] font-semibold text-sm">💬 채팅</span>
              <button onClick={() => setShowChat(false)} className="text-muted hover:text-[#c0ccdd] transition-colors">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-[#1a2438]">
              {([['world', '🌍 전체'], ['guild', '🏰 길드']] as [ChatTab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => { if (tab === 'guild' && myGuildId == null) return; setChatTab(tab); }}
                  disabled={tab === 'guild' && myGuildId == null}
                  className="flex-1 py-2 text-[11px] transition-colors disabled:opacity-40"
                  style={chatTab === tab
                    ? { color: '#00f5ff', borderBottom: '2px solid #00f5ff' }
                    : { color: '#7788a5', borderBottom: '2px solid transparent' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chat content */}
            {roomId != null ? (
              <ChatPanel roomId={roomId} />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-muted text-[11px] text-center">길드에 가입하면<br />길드 채팅을 이용할 수 있습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
