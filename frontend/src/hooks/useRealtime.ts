import { useEffect, useRef, useState } from "react";
import type { RealtimeEvent } from "../types";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export interface UseRealtimeOptions {
  onEvent?: (event: RealtimeEvent) => void;
  enabled?: boolean;
}

export interface UseRealtimeReturn {
  status: RealtimeStatus;
  reconnect: () => void;
}

const FALLBACK_POLL_INTERVAL_MS = 35000;
const RECONNECT_DELAY_MS = 3000;

/**
 * useRealtime hook for live Server-Sent Events (SSE) synchronization.
 * Connects to /api/v1/realtime/stream and provides auto-reconnection and
 * fallback safety polling when disconnected.
 */
export const useRealtime = ({
  onEvent,
  enabled = true,
}: UseRealtimeOptions = {}): UseRealtimeReturn => {
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled ? "connecting" : "disconnected"
  );
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const fallbackPollTimerRef = useRef<number | null>(null);

  const cleanupConnection = () => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const connect = () => {
    cleanupConnection();

    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const url = `${apiBase}/api/v1/realtime/stream`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
      };

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          if (!event.data) return;
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          onEventRef.current?.(parsed);
        } catch (err) {
          console.warn("[Realtime SSE] Failed to parse event payload:", err);
        }
      };

      es.onerror = () => {
        setStatus("disconnected");
        cleanupConnection();
        // Auto-reconnect after delay
        if (enabled) {
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };
    } catch (err) {
      console.error("[Realtime SSE] Error instantiating EventSource:", err);
      setStatus("disconnected");
      if (enabled) {
        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    connect();

    return () => {
      cleanupConnection();
    };
  }, [enabled]);

  // Fallback safety polling when disconnected
  useEffect(() => {
    if (fallbackPollTimerRef.current !== null) {
      window.clearInterval(fallbackPollTimerRef.current);
      fallbackPollTimerRef.current = null;
    }

    if (status === "disconnected" && enabled) {
      fallbackPollTimerRef.current = window.setInterval(() => {
        onEventRef.current?.({
          event: "job_updated",
          payload: { message: "fallback_poll" },
          timestamp: new Date().toISOString(),
        });
      }, FALLBACK_POLL_INTERVAL_MS);
    }

    return () => {
      if (fallbackPollTimerRef.current !== null) {
        window.clearInterval(fallbackPollTimerRef.current);
        fallbackPollTimerRef.current = null;
      }
    };
  }, [status, enabled]);

  return {
    status,
    reconnect: connect,
  };
};
