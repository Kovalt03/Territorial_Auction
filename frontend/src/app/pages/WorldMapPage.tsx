import { useState } from 'react';

import { GNB } from '../components/GNB';
import { MapCanvas } from '../components/MapCanvas';
import { useApp } from '../context/AppContext';

// Re-export for backward compatibility
export type { ContinentDef } from '../data/continents';
export { CONTINENTS } from '../data/continents';

export function WorldMapPage() {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const { messages, sendMessage } = useApp();

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput.trim());
    setChatInput('');
  };

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2438]">
              <span className="text-[#c0ccdd] font-semibold text-sm">💬 채팅</span>
              <button onClick={() => setShowChat(false)} className="text-muted hover:text-[#c0ccdd]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="text-xs">
                  <span style={{ color: msg.user === '시스템' ? '#ffd700' : '#00f5ff', fontWeight: 600 }}>
                    {msg.user}
                  </span>
                  <span className="text-muted"> {msg.time}</span>
                  <p className="text-[#c0ccdd] mt-0.5">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#1a2438] flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="메시지 입력..."
                className="flex-1 h-8 bg-[#12192c] border border-[#1e2a3d] rounded-lg px-3 text-[#c0ccdd] outline-none focus:border-primary transition-colors text-xs"
              />
              <button
                onClick={handleSendChat}
                className="w-8 h-8 bg-primary rounded-lg text-[#060a14] font-bold flex items-center justify-center"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
