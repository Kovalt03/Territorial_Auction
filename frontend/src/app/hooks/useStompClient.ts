import { useEffect, useRef, useCallback } from 'react';
import { Client, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let sharedClient: Client | null = null;
let connectPromise: Promise<void> | null = null;

function getOrCreateClient(): Client {
  if (sharedClient) return sharedClient;
  sharedClient = new Client({
    webSocketFactory: () => new SockJS('/ws') as WebSocket,
    reconnectDelay: 3000,
  });
  return sharedClient;
}

function ensureConnected(): Promise<void> {
  const client = getOrCreateClient();
  if (client.connected) return Promise.resolve();
  if (connectPromise) return connectPromise;

  connectPromise = new Promise<void>((resolve) => {
    const token = localStorage.getItem('accessToken');
    client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    client.onConnect = () => { connectPromise = null; resolve(); };
    client.onDisconnect = () => { connectPromise = null; };
    client.onStompError = () => { connectPromise = null; };
    client.onWebSocketError = () => { connectPromise = null; };
    if (!client.active) client.activate();
  });
  return connectPromise;
}

export function useStompSubscribe<T>(
  destination: string | null,
  onMessage: (payload: T) => void,
) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    if (!destination) return;

    let sub: StompSubscription | null = null;
    let mounted = true;

    ensureConnected().then(() => {
      if (!mounted) return;
      const client = getOrCreateClient();
      if (!client.connected) return;
      sub = client.subscribe(destination, (frame) => {
        try {
          cbRef.current(JSON.parse(frame.body) as T);
        } catch {
          // ignore malformed frames
        }
      });
      if (!mounted) { sub.unsubscribe(); sub = null; }
    });

    return () => {
      mounted = false;
      sub?.unsubscribe();
    };
  }, [destination]);
}

export function useStompPublish() {
  return useCallback((destination: string, body: unknown) => {
    ensureConnected()
      .then(() => {
        const client = getOrCreateClient();
        if (client.connected) {
          client.publish({ destination, body: JSON.stringify(body) });
        }
      })
      .catch((err) => console.warn('STOMP publish failed', err));
  }, []);
}

export function disconnectStomp() {
  sharedClient?.deactivate();
  sharedClient = null;
  connectPromise = null;
}
