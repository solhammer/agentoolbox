import { useEffect, useRef, useState } from 'react';
import { createSSEStream, type RequestLogEntry } from '../lib/api';

export interface LiveFeed {
  entries: RequestLogEntry[];
  connected: boolean;
}

/**
 * Subscribes to the admin SSE request stream, prepending new entries and
 * trimming to `maxEntries`. Automatically reconnects if the stream errors.
 */
export function useLiveFeed(maxEntries = 200): LiveFeed {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = (): void => {
      if (cancelled) return;
      try {
        const cleanup = createSSEStream((entry) => {
          setConnected(true);
          setEntries((prev) => [entry, ...prev].slice(0, maxEntries));
        });
        cleanupRef.current = () => {
          cleanup();
          setConnected(false);
        };
        setConnected(true);
      } catch {
        scheduleReconnect();
      }
    };

    const scheduleReconnect = (): void => {
      setConnected(false);
      cleanupRef.current?.();
      cleanupRef.current = null;
      reconnectTimer = setTimeout(connect, 3_000);
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [maxEntries]);

  return { entries, connected };
}
