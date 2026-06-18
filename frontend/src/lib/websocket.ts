// WebSocket hook — connects to ws://localhost:8000/ws/cases/{caseId}/
// All events are dispatched to the Zustand store via handleWSEvent.

import { useEffect, useRef, useCallback } from 'react';
import { useVulnBridgeStore } from '../store/vulnbridge';

const WS_URL = (caseId: string) =>
  `ws://${window.location.hostname}:8000/ws/cases/${caseId}/`;

export function useWebSocket(caseId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { handleWSEvent, setWsConnected } = useVulnBridgeStore();

  const connect = useCallback(() => {
    if (!caseId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL(caseId));
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log(`[VulnBridge WS] Connected → case ${caseId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWSEvent(data);
      } catch (e) {
        console.error('[VulnBridge WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log('[VulnBridge WS] Disconnected — reconnecting in 3s');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('[VulnBridge WS] Error:', err);
      ws.close();
    };
  }, [caseId, handleWSEvent, setWsConnected]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
