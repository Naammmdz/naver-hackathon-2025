import type * as Y from "yjs";

export interface IndexeddbPersistenceLike {
  destroy(): void;
  once(event: string, handler: (...args: unknown[]) => void): void;
}

export type IndexeddbPersistenceConstructor = new (name: string, doc: Y.Doc) => IndexeddbPersistenceLike;

export async function loadIndexeddbPersistence(): Promise<IndexeddbPersistenceConstructor> {
  try {
    const module = await import("y-indexeddb");
    const ctor = (module.IndexeddbPersistence ?? module.default) as IndexeddbPersistenceConstructor | undefined;
    if (typeof ctor === "function") {
      return ctor;
    }
    if (import.meta.env.DEV) {
      console.warn("y-indexeddb module found but does not export IndexeddbPersistence. Using fallback persistence.");
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("y-indexeddb module not available. Using fallback persistence.", error);
    }
  }
  return FallbackIndexeddbPersistence;
}

class FallbackIndexeddbPersistence implements IndexeddbPersistenceLike {
  private onceListeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(_name: string, _doc: Y.Doc) {
    queueMicrotask(() => {
      this.emit("synced");
    });
  }

  once(event: string, handler: (...args: unknown[]) => void) {
    const listeners = this.onceListeners.get(event) ?? [];
    listeners.push(handler);
    this.onceListeners.set(event, listeners);
  }

  destroy() {
    this.onceListeners.clear();
  }

  private emit(event: string, ...args: unknown[]) {
    const listeners = this.onceListeners.get(event);
    if (!listeners) {
      return;
    }
    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`Error in fallback persistence listener for '${event}'`, error);
        }
      }
    });
    this.onceListeners.delete(event);
  }
}
