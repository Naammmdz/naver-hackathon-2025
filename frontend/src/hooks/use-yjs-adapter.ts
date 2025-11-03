import { useYjs } from "@/contexts/YjsContext";
import { registerYjsAdapter } from "@/lib/yjs-helper";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as Y from "yjs";
import type { StoreApi, UseBoundStore } from "zustand";

/**
 * Shared Yjs ↔ Zustand adapter.
 *
 * Usage:
 * ```tsx
 * useYjsAdapter("tasks", useTaskStore, {
 *   decode: (raw) => normalizeTask(raw as Task),
 * });
 * ```
 *
 * The adapter hydrates the store once, observes Yjs updates atomically,
 * and exposes `syncToYjs`/`removeFromYjs` helpers via `yjsHelper`.
 */
type CollectionKind = "array" | "map";

type UseYjsAdapterOptions<Item, StoreValue> = {
  /**
   * Force the underlying Yjs type. Falls back to auto detection.
   */
  collection?: CollectionKind;
  /**
   * Delay before running hydration to wait for backend state (ms).
   */
  hydrateDelayMs?: number;
  /**
   * Override debug label in console logs.
   */
  debugLabel?: string;
  /**
   * Extract identifier from incoming/outgoing records. Defaults to `item.id`.
   */
  getId?: (item: Item) => string | undefined;
  /**
   * Transform raw value coming from Yjs before storing.
   */
  decode?: (value: unknown) => Item;
  /**
   * Transform store item before sending to Yjs.
   */
  encode?: (item: Item) => unknown;
  /**
   * Compose items into final store value (defaults to plain array).
   */
  compose?: (items: Item[]) => StoreValue;
  /**
   * Break store value into items when pushing to Yjs (defaults to identity for arrays).
   */
  decompose?: (value: StoreValue) => Item[];
  /**
   * Custom merge strategy for map collections.
   */
  merge?: (previous: Item | undefined, next: Item) => Item;
};

type SharedTypeRef =
  | { kind: "array"; type: Y.Array<unknown> }
  | { kind: "map"; type: Y.Map<unknown> };

const ensureArray = <T,>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);
const scheduleMicrotask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (callback: () => void) => Promise.resolve().then(callback);

const defaultGetId = (value: unknown): string | undefined => {
  if (value && typeof value === "object" && "id" in value) {
    const candidate = (value as { id?: unknown }).id;
    return typeof candidate === "string" ? candidate : undefined;
  }
  return undefined;
};

const toPlainValue = (value: unknown): unknown => {
  if (value instanceof Y.Map || value instanceof Y.Array) {
    return value.toJSON();
  }
  return value;
};

const dedupeById = <T,>(items: T[], getId: (item: T) => string | undefined) => {
  const result = new Map<string, T>();
  items.forEach((item) => {
    const id = getId(item);
    if (id) {
      result.set(id, item);
    }
  });
  // Keep items without identifier as-is (e.g. root documents)
  const withoutId = items.filter((item) => !getId(item));
  return [...result.values(), ...withoutId];
};

type SyncAdapterApi<Item> = {
  syncToYjs: (item: Item) => void;
  removeFromYjs: (id: string) => void;
};

type PendingOp<Item> =
  | { type: "upsert"; value: Item }
  | { type: "remove"; id: string };

export function useYjsAdapter<
  StoreState extends Record<string, unknown>,
  Key extends keyof StoreState,
  StoreValue extends StoreState[Key],
  Item = StoreValue extends (infer U)[] ? U : StoreValue
>(
  key: Key,
  store: UseBoundStore<StoreApi<StoreState>>,
  options?: UseYjsAdapterOptions<Item, StoreValue>
): SyncAdapterApi<Item> {
  const { ydoc, isConnected } = useYjs();

  const label = useMemo(
    () => options?.debugLabel ?? String(key),
    [key, options?.debugLabel]
  );
  // Increased from 400ms to 1000ms for better network reliability
  const hydrateDelay = options?.hydrateDelayMs ?? 1000;
  const decode = useMemo(
    () =>
      (options?.decode as ((value: unknown) => Item) | undefined) ??
      ((value: unknown) => value as Item),
    [options?.decode]
  );
  const encode = useMemo(
    () =>
      (options?.encode as ((item: Item) => unknown) | undefined) ??
      ((item: Item) => item as unknown),
    [options?.encode]
  );
  const getId = useMemo(
    () =>
      (options?.getId as ((item: Item) => string | undefined) | undefined) ??
      ((item: Item) => defaultGetId(item)),
    [options?.getId]
  );
  const compose = useMemo(
    () =>
      (options?.compose as ((items: Item[]) => StoreValue) | undefined) ??
      ((items: Item[]) => items as unknown as StoreValue),
    [options?.compose]
  );
  const decompose = useMemo(
    () =>
      (options?.decompose as ((value: StoreValue) => Item[]) | undefined) ??
      ((value: StoreValue) => {
        if (value === undefined || value === null) {
          return [];
        }
        return Array.isArray(value)
          ? (value as Item[])
          : ensureArray<Item>(value as unknown as Item);
      }),
    [options?.decompose]
  );
  const mergeItems = useMemo(
    () => (options?.merge as ((previous: Item | undefined, next: Item) => Item) | undefined) ??
      ((previous: Item | undefined, next: Item) => next),
    [options?.merge]
  );

  const sharedRef = useRef<SharedTypeRef | null>(null);
  const hydrationTimerRef = useRef<number>();
  const initializedRef = useRef(false);
  const hydratingRef = useRef(false);
  const syncingRef = useRef(false);
  const pendingOpsRef = useRef<PendingOp<Item>[]>([]);

  const logGroup = useCallback(
    (title: string, payload?: Record<string, unknown>) => {
      console.groupCollapsed(`[YjsAdapter:${label}] ${title}`);
      if (payload) {
        Object.entries(payload).forEach(([k, v]) => console.log(k, v));
      }
      console.groupEnd();
    },
    [label]
  );

  const resolveSharedType = useCallback((): SharedTypeRef | null => {
    if (!ydoc) return null;
    const stringKey = String(key);
    const share = ydoc.share.get(stringKey);
    if (share instanceof Y.Array) {
      return { kind: "array", type: share };
    }
    if (share instanceof Y.Map) {
      return { kind: "map", type: share };
    }

    const hint =
      options?.collection ??
      (Array.isArray(store.getState()[key]) || String(key).endsWith("s") ? "array" : "map");

    if (hint === "map") {
      return { kind: "map", type: ydoc.getMap(stringKey) };
    }
    return { kind: "array", type: ydoc.getArray(stringKey) };
  }, [key, options?.collection, store, ydoc]);

  const readItemsFromShared = useCallback((): Item[] => {
    const shared = sharedRef.current;
    if (!shared) return [];

    if (shared.kind === "array") {
      const raw = shared.type.toArray().map((entry) => toPlainValue(entry));
      return dedupeById(
        raw.map((item) => decode(item)),
        getId
      );
    }

    const values: unknown[] = [];
    shared.type.forEach((value) => values.push(toPlainValue(value)));
    return dedupeById(
      values.map((item) => decode(item)),
      getId
    );
  }, [decode, getId]);

  const pushItemsToShared = useCallback(
    (items: Item[]) => {
      const shared = sharedRef.current;
      if (!shared || !ydoc) return;

      syncingRef.current = true;
      ydoc.transact(() => {
        if (shared.kind === "array") {
          const yArray = shared.type;
          yArray.delete(0, yArray.length);
          yArray.insert(0, items.map((item) => encode(item)));
        } else {
          const yMap = shared.type;
          const existingKeys = Array.from(yMap.keys());
          existingKeys.forEach((keyToDelete) => yMap.delete(keyToDelete));
          items.forEach((item) => {
            const id = getId(item);
            if (id) {
              yMap.set(id, encode(item));
            }
          });
        }
      });
      scheduleMicrotask(() => {
        syncingRef.current = false;
      });
    },
    [encode, getId, ydoc]
  );

  const applyUpsert = useCallback(
    (item: Item) => {
      const shared = sharedRef.current;
      if (!shared || !ydoc || item === undefined || item === null) {
        return;
      }
      const itemId = getId(item);

      syncingRef.current = true;
      ydoc.transact(() => {
        if (shared.kind === "array") {
          const yArray = shared.type;
          const current = yArray.toArray();
          const normalized = current.map((entry) => decode(toPlainValue(entry)));
          const idx =
            itemId !== undefined
              ? normalized.findIndex((existing) => getId(existing) === itemId)
              : -1;
          const encodedItem = encode(item);
          if (idx >= 0) {
            yArray.delete(idx, 1);
            yArray.insert(idx, [encodedItem]);
          } else {
            yArray.push([encodedItem]);
          }
        } else if (itemId) {
          const existing = shared.type.get(itemId);
          const decodedExisting =
            existing === undefined ? undefined : decode(toPlainValue(existing));
          const mergedItem = mergeItems(decodedExisting as Item | undefined, item);
          shared.type.set(itemId, encode(mergedItem));
        }
      });
      scheduleMicrotask(() => {
        syncingRef.current = false;
      });
    },
    [decode, encode, getId, mergeItems, ydoc]
  );

  const applyRemove = useCallback(
    (id: string) => {
      const shared = sharedRef.current;
      if (!shared || !ydoc) return;
      syncingRef.current = true;
      ydoc.transact(() => {
        if (shared.kind === "array") {
          const yArray = shared.type;
          const current = yArray.toArray();
          const normalized = current.map((entry) => decode(toPlainValue(entry)));
          const index = normalized.findIndex((item) => getId(item) === id);
          if (index >= 0) {
            yArray.delete(index, 1);
          }
        } else {
          shared.type.delete(id);
        }
      });
      scheduleMicrotask(() => {
        syncingRef.current = false;
      });
    },
    [decode, getId, ydoc]
  );

  const flushPendingOps = useCallback(() => {
    const shared = sharedRef.current;
    if (!shared || !ydoc) return;
    const queue = pendingOpsRef.current;
    if (queue.length === 0) return;

    logGroup("Flushing pending sync ops", { count: queue.length });
    pendingOpsRef.current = [];
    queue.forEach((op) => {
      if (op.type === "upsert") {
        applyUpsert(op.value);
      } else {
        applyRemove(op.id);
      }
    });
  }, [applyRemove, applyUpsert, logGroup, ydoc]);

  const syncToYjs = useCallback(
    (item: Item) => {
      if (!sharedRef.current || !ydoc) {
        pendingOpsRef.current.push({ type: "upsert", value: item });
        logGroup("Queue upsert (doc not ready)", { pending: pendingOpsRef.current.length });
        return;
      }
      applyUpsert(item);
    },
    [applyUpsert, logGroup, ydoc]
  );

  const removeFromYjs = useCallback(
    (id: string) => {
      if (!sharedRef.current || !ydoc) {
        pendingOpsRef.current.push({ type: "remove", id });
        logGroup("Queue remove (doc not ready)", { pending: pendingOpsRef.current.length });
        return;
      }
      applyRemove(id);
    },
    [applyRemove, logGroup, ydoc]
  );

  useEffect(() => {
    if (!ydoc || !isConnected) {
      logGroup("Waiting for Yjs connection", { connected: isConnected });
      return undefined;
    }

    const shared = resolveSharedType();
    if (!shared) {
      logGroup("Failed to resolve shared type");
      return undefined;
    }

    sharedRef.current = shared;
    
    // Flush pending ops on reconnection
    logGroup("Connection established - flushing pending ops");
    flushPendingOps();

    const observer = () => {
      try {
        if (!initializedRef.current) {
          logGroup("Skip observer – adapter not initialized yet");
          return;
        }
        if (hydratingRef.current) {
          logGroup("Skip observer – hydration in progress");
          return;
        }
        if (syncingRef.current) {
          logGroup("Skip observer – local sync");
          return;
        }

        const items = readItemsFromShared();
        logGroup("Yjs → Store update", { count: items.length });

        const runUpdate = () => {
          store.setState(
            { [key]: compose(items) } as Partial<StoreState>,
            false
          );
        };

        // Atomic: unsubscribe → apply state → resubscribe to avoid cascade loops.
        if (shared.kind === "array") {
          shared.type.unobserve(observer);
          runUpdate();
          shared.type.observe(observer);
        } else {
          shared.type.unobserve(observer);
          runUpdate();
          shared.type.observe(observer);
        }
      } catch (error) {
        console.error("[YjsAdapter] Observer error:", error);
        logGroup("Observer error - continuing sync", { error: String(error) });
      }
    };

    shared.type.observe(observer);

    hydratingRef.current = true;
    // Increased from 400ms to 1000ms for slower networks
    hydrationTimerRef.current = window.setTimeout(() => {
      try {
        const items = readItemsFromShared();
        const storeValue = store.getState()[key] as StoreValue;
        const localItems = decompose(storeValue);
        
        logGroup("Hydration step", {
          yjsCount: items.length,
          storeCount: Array.isArray(storeValue) ? storeValue.length : undefined,
          localCount: localItems.length,
        });

        if (items.length > 0) {
          // Backend has data - hydrate from Yjs
          // But if store already has data, merge instead of overwriting
          if (localItems.length > 0) {
            logGroup("Merge hydration: both Yjs and store have data");
            // Let Yjs win but don't lose local-only items
            const yjsIds = items.map(item => getId(item)).filter(Boolean);
            const localOnlyItems = localItems.filter(item => {
              const itemId = getId(item);
              return itemId && !yjsIds.includes(itemId);
            });
            
            if (localOnlyItems.length > 0) {
              logGroup("Pushing local-only items to Yjs", { count: localOnlyItems.length });
              // Push local-only items to Yjs
              localOnlyItems.forEach(item => {
                syncingRef.current = true;
                if (shared.kind === "array") {
                  shared.type.push([encode(item)]);
                } else {
                  const itemId = getId(item);
                  if (itemId) {
                    shared.type.set(itemId, encode(item));
                  }
                }
              });
              scheduleMicrotask(() => {
                syncingRef.current = false;
              });
            }
            
            // Update store with merged Yjs data
            store.setState(
              { [key]: compose(items) } as Partial<StoreState>,
              false
            );
          } else {
            // Store is empty - safe to hydrate directly
            logGroup("Hydrate store from Yjs (store was empty)");
            store.setState(
              { [key]: compose(items) } as Partial<StoreState>,
              false
            );
          }
        } else {
          // Yjs is empty - populate from store if it has data
          if (localItems.length > 0) {
            logGroup("Populate Yjs from store");
            pushItemsToShared(localItems);
          } else {
            logGroup("Nothing to hydrate – both sides empty");
          }
        }

        initializedRef.current = true;
        hydratingRef.current = false;
      } catch (error) {
        console.error("[YjsAdapter] Hydration error:", error);
        logGroup("Hydration error - marking initialized anyway", { error: String(error) });
        initializedRef.current = true;
        hydratingRef.current = false;
      }
    }, hydrateDelay);

    return () => {
      if (hydrationTimerRef.current) {
        clearTimeout(hydrationTimerRef.current);
      }
      shared.type.unobserve(observer);
      sharedRef.current = null;
      initializedRef.current = false;
      hydratingRef.current = false;
      // CRITICAL: Clear pending operations on cleanup to prevent cross-workspace data leaks
      pendingOpsRef.current = [];
      logGroup("Cleaned up adapter");
    };
  }, [
    compose,
    decompose,
    hydrateDelay,
    isConnected,
    logGroup,
    pushItemsToShared,
    readItemsFromShared,
    resolveSharedType,
    store,
    key,
    flushPendingOps,
    ydoc,
  ]);

  useEffect(() => {
    const unregister = registerYjsAdapter(String(key), {
      syncToYjs,
      removeFromYjs,
    });
    return unregister;
  }, [key, syncToYjs, removeFromYjs]);

  return useMemo(
    () => ({
      syncToYjs,
      removeFromYjs,
    }),
    [removeFromYjs, syncToYjs]
  );
}

export type { UseYjsAdapterOptions };
