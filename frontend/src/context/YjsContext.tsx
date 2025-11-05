import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";

import { encodeToBase64, fromBase64ToUint8Array } from "@/lib/realtime/base64";
import {
  loadIndexeddbPersistence,
  type IndexeddbPersistenceLike,
} from "@/lib/realtime/indexeddbPersistence";

export type YjsConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface YjsContextValue {
  doc: Y.Doc | null;
  status: YjsConnectionStatus;
  workspaceId: string | null;
  lastSyncedAt: number | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const YjsContext = createContext<YjsContextValue | undefined>(undefined);

interface YjsProviderProps {
  /**
   * Absolute or relative websocket endpoint (e.g. ws://localhost:8080/ws/yjs)
   */
  endpoint: string;
  /**
   * Current workspace identifier. When null, the provider tears down the connection.
   */
  workspaceId: string | null;
  /**
   * Optional token appended as query parameter `token` for backend auth checks.
   */
  authToken?: string;
  /**
   * User identifier for workspace membership validation.
   */
  userId?: string;
  /**
   * Enable y-indexeddb snapshot warm start for offline/fast reconnects.
   */
  enableIndexedDB?: boolean;
  children: React.ReactNode;
}

const YJS_PROTOCOL_VERSION = "1";
const RECONNECT_BASE_DELAY_MS = 750;
const RECONNECT_MAX_DELAY_MS = 15_000;

const resolveWebSocketUrl = (endpoint: string): string => {
  if (/^wss?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  if (typeof window === "undefined") {
    return endpoint;
  }

  const base = window.location.origin.replace(/^http/, "ws");
  if (endpoint.startsWith("/")) {
    return `${base}${endpoint}`;
  }

  return `${base}/${endpoint}`;
};

export const YjsProvider = ({
  endpoint,
  workspaceId,
  authToken,
  userId,
  enableIndexedDB = true,
  children,
}: YjsProviderProps) => {
  const [status, setStatus] = useState<YjsConnectionStatus>("idle");
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const persistenceRef = useRef<IndexeddbPersistenceLike | null>(null);

  const destroyPersistence = () => {
    if (persistenceRef.current) {
      persistenceRef.current.destroy();
      persistenceRef.current = null;
    }
  };

  const closeSocket = () => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const cleanupDoc = () => {
    if (doc) {
      doc.destroy();
    }
    setDoc(null);
  };

  const scheduleReconnect = () => {
    clearReconnectTimer();
    if (!workspaceId) {
      return;
    }
    const attempt = reconnectAttemptRef.current;
    const timeout = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptRef.current = attempt + 1;
      connectInternal();
    }, timeout);
  };

  const markConnected = () => {
    reconnectAttemptRef.current = 0;
    setStatus("connected");
  };

  const connectInternal = () => {
    clearReconnectTimer();
    closeSocket();

    if (!workspaceId || !doc) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const encodedVector = encodeToBase64(Y.encodeStateVector(doc));

    const url = new URL(resolveWebSocketUrl(endpoint));
    url.searchParams.set("workspaceId", workspaceId);
    url.searchParams.set("clientId", doc.clientID.toString());
    url.searchParams.set("protocolVersion", YJS_PROTOCOL_VERSION);
    url.searchParams.set("clientVector", encodedVector);
    if (userId) {
      url.searchParams.set("userId", userId);
    }
    if (authToken) {
      url.searchParams.set("token", authToken);
    }

    const ws = new WebSocket(url.toString());
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      markConnected();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === "string") {
          const payload = JSON.parse(event.data);
          if (payload.type === "pong") {
            return;
          }
          if (payload.type === "sync") {
            const update = fromBase64ToUint8Array(payload.update);
            if (update) {
              // Apply with "remote" origin to prevent echoing back
              Y.applyUpdate(doc, update, "remote");
              setLastSyncedAt(Date.now());
            }
            return;
          }
          if (payload.type === "error") {
            setStatus("error");
            console.error("Yjs sync error:", payload.reason);
            return;
          }
          return;
        }

        const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new Uint8Array(0);
        if (data.length > 0) {
          // Apply with "remote" origin to prevent echoing back
          Y.applyUpdate(doc, data, "remote");
          setLastSyncedAt(Date.now());
        }
      } catch (error) {
        console.error("Failed to process Yjs message", error);
      }
    };

    // Listen for local Y.Doc updates and send to server
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // Don't send updates that came from remote (to avoid loops)
      if (origin === "remote") {
        return;
      }
      
      // Send binary update to server
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(update);
      }
    };

    doc.on("update", updateHandler);

    ws.onclose = () => {
      // Clean up Y.Doc update listener
      doc.off("update", updateHandler);
      
      wsRef.current = null;
      setStatus("disconnected");
      scheduleReconnect();
    };

    ws.onerror = (event) => {
      console.error("Yjs websocket error", event);
      setStatus("error");
    };

    wsRef.current = ws;
  };

  const connect = () => {
    reconnectAttemptRef.current = 0;
    connectInternal();
  };

  const disconnect = () => {
    clearReconnectTimer();
    reconnectAttemptRef.current = 0;
    setStatus("disconnected");
    closeSocket();
  };

  const reconnect = () => {
    disconnect();
    connect();
  };

  useEffect(() => {
    if (!workspaceId) {
      disconnect();
      destroyPersistence();
      cleanupDoc();
      return () => undefined;
    }

    const nextDoc = new Y.Doc({ guid: `workspace-${workspaceId}` });
    setDoc(nextDoc);
    setLastSyncedAt(null);

    const shouldEnableIndexedDB =
      enableIndexedDB && typeof indexedDB !== "undefined" && typeof window !== "undefined";
    if (shouldEnableIndexedDB) {
      loadIndexeddbPersistence()
        .then((IndexeddbPersistence) => {
          const persistence = new IndexeddbPersistence(`workspace-${workspaceId}`, nextDoc);
          persistence.once("synced", () => {
            setLastSyncedAt(Date.now());
          });
          persistenceRef.current = persistence;
        })
        .catch((error) => {
          console.warn("Failed to enable IndexedDB persistence", error);
        });
    }

    return () => {
      destroyPersistence();
      nextDoc.destroy();
      setDoc(null);
    };
  }, [workspaceId, enableIndexedDB]);

  useEffect(() => {
    if (!doc || !workspaceId) {
      return;
    }
    connect();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, workspaceId, endpoint, authToken]);

  const value = useMemo<YjsContextValue>(
    () => ({
      doc,
      status,
      workspaceId,
      lastSyncedAt,
      connect,
      disconnect,
      reconnect,
    }),
    [doc, status, workspaceId, lastSyncedAt],
  );

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>;
};

export const useYjsContext = () => {
  const context = useContext(YjsContext);
  if (!context) {
    throw new Error("useYjsContext must be used inside <YjsProvider>");
  }
  return context;
};
