import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import type { StoreApi, UseBoundStore } from "zustand";

import type { YjsConnectionStatus } from "@/context/YjsContext";
import { useYjsContext } from "@/context/YjsContext";

type CollectionName = "tasks" | "documents" | "boards";
type SharedCollection = Y.Array<unknown> | Y.Map<unknown>;

const ARRAY_COLLECTIONS: CollectionName[] = ["tasks", "documents", "boards"];

const ORIGIN = Symbol("zustand-yjs-adapter");

const isArrayCollection = (collection: CollectionName) => ARRAY_COLLECTIONS.includes(collection);

const cloneForYjs = <T,>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? null));
};

const defaultSerialize = (value: unknown) => JSON.stringify(value ?? null);

const getSharedCollection = (doc: Y.Doc, collection: CollectionName): SharedCollection => {
  if (isArrayCollection(collection)) {
    return doc.getArray(collection);
  }
  return doc.getMap(collection);
};

const applySliceToShared = <TSlice,>(doc: Y.Doc, shared: SharedCollection, slice: TSlice) => {
  doc.transact(() => {
    if (shared instanceof Y.Array) {
      const yArray = shared as Y.Array<unknown>;
      yArray.delete(0, yArray.length);
      if (Array.isArray(slice)) {
        const payload = slice.map((item) =>
          item && typeof item === "object" ? cloneForYjs(item) : item,
        );
        yArray.push(payload);
      }
      return;
    }

    if (shared instanceof Y.Map) {
      const incoming = (slice && typeof slice === "object" && !Array.isArray(slice)) ? slice : {};
      const keysToDelete = new Set(Array.from((shared as Y.Map<unknown>).keys()) as string[]);
      Object.entries(incoming as Record<string, unknown>).forEach(([key, value]) => {
        keysToDelete.delete(key);
        const prepared = value && typeof value === "object" ? cloneForYjs(value) : value;
        (shared as Y.Map<unknown>).set(key, prepared);
      });
      keysToDelete.forEach((key) => {
        (shared as Y.Map<unknown>).delete(key);
      });
    }
  }, ORIGIN);
};

const defaultFromShared = <TSlice,>(shared: SharedCollection): TSlice => {
  if ("toJSON" in shared && typeof shared.toJSON === "function") {
    return shared.toJSON() as TSlice;
  }
  if (shared instanceof Y.Array) {
    return shared.toArray() as TSlice;
  }
  if (shared instanceof Y.Map) {
    return (shared as Y.Map<unknown>).toJSON() as TSlice;
  }
  return [] as TSlice;
};

interface UseYjsAdapterOptions<TState, TSlice> {
  /**
   * Zustand store property that should be rewritten when remote changes arrive.
   */
  storeKey: keyof TState;
  /**
   * Select a slice of the store to mirror into the Y.Doc.
   */
  selector: (state: TState) => TSlice;
  /**
   * Optional equality fn to limit local → remote pushes.
   */
  equalityFn?: (a: TSlice, b: TSlice) => boolean;
  /**
   * Transform the shared Yjs type into store data.
   */
  fromShared?: (shared: SharedCollection) => TSlice;
  /**
   * Derive additional patches merged into the Zustand store alongside the synced slice.
   */
  mergeRemotePatch?: (state: TState, slice: TSlice) => Partial<TState>;
  /**
   * Skip pushing local changes while predicate returns false (e.g. while loading).
   */
  guardLocalUpdate?: (state: TState) => boolean;
  /**
   * Custom serializer to detect local changes.
   */
  serializeLocal?: (slice: TSlice) => string;
}

interface UseYjsAdapterResult {
  isHydrated: boolean;
  status: YjsConnectionStatus;
  lastSyncedAt: number | null;
  shared: SharedCollection | null;
}

export const useYjsAdapter = <TState, TSlice>(
  collection: CollectionName,
  store: UseBoundStore<StoreApi<TState>>,
  {
    storeKey,
    selector,
    equalityFn,
    fromShared = defaultFromShared,
    mergeRemotePatch,
    guardLocalUpdate,
    serializeLocal = defaultSerialize,
  }: UseYjsAdapterOptions<TState, TSlice>,
): UseYjsAdapterResult => {
  const { doc, status, lastSyncedAt } = useYjsContext();
  const sharedRef = useRef<SharedCollection | null>(null);
  const isHydratedRef = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const isApplyingRemoteRef = useRef(false);
  const lastLocalSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!doc) {
      sharedRef.current = null;
      return;
    }

    const shared = getSharedCollection(doc, collection);
    sharedRef.current = shared;

    const applyRemoteToStore = () => {
      const slice = fromShared<TSlice>(shared);
      const serialized = serializeLocal(slice);

      isApplyingRemoteRef.current = true;
      store.setState((state) => {
        const basePatch = { [storeKey]: slice } as Partial<TState>;
        const patch = mergeRemotePatch ? { ...basePatch, ...mergeRemotePatch(state, slice) } : basePatch;
        return patch;
      });
      isApplyingRemoteRef.current = false;

      lastLocalSnapshotRef.current = serialized;
      if (!isHydratedRef.current) {
        isHydratedRef.current = true;
        setIsHydrated(true);
      }
    };

    applyRemoteToStore();

    const observer = () => {
      if (isApplyingRemoteRef.current) {
        return;
      }
      applyRemoteToStore();
    };

    if ("observeDeep" in shared && typeof shared.observeDeep === "function") {
      shared.observeDeep(observer);
      return () => {
        shared.unobserveDeep(observer);
        sharedRef.current = null;
        isHydratedRef.current = false;
        setIsHydrated(false);
      };
    }

    shared.observe(observer as any);
    return () => {
      shared.unobserve(observer as any);
      sharedRef.current = null;
      isHydratedRef.current = false;
      setIsHydrated(false);
    };
  }, [doc, collection, fromShared, mergeRemotePatch, serializeLocal, store, storeKey]);

  useEffect(() => {
    if (!doc) {
      return;
    }

    const unsubscribe = store.subscribe(
      selector,
      (slice, previousSlice) => {
        if (!doc || !sharedRef.current) {
          return;
        }

        if (isApplyingRemoteRef.current) {
          return;
        }

        if (guardLocalUpdate && !guardLocalUpdate(store.getState())) {
          return;
        }

        if (equalityFn && equalityFn(slice, previousSlice)) {
          return;
        }

        const serialized = serializeLocal(slice);
        if (serialized === lastLocalSnapshotRef.current) {
          return;
        }

        applySliceToShared(doc, sharedRef.current, slice);
        lastLocalSnapshotRef.current = serialized;
      },
      { equalityFn },
    );

    return unsubscribe;
  }, [collection, doc, equalityFn, guardLocalUpdate, selector, serializeLocal, store]);

  return useMemo(
    () => ({
      isHydrated,
      status,
      lastSyncedAt,
      shared: sharedRef.current,
    }),
    [isHydrated, status, lastSyncedAt],
  );
};
