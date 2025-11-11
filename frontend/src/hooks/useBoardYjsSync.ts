import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { Board, BoardSnapshot } from '@/types/board';
import { useBoardStore } from '@/store/boardStore';
import { boardApi } from '@/lib/api/boardApi';

interface UseBoardYjsSyncOptions {
  boardsMap: Y.Map<any> | null;
  boardContentMap: Y.Map<any> | null;
  enabled?: boolean;
}

const NULL_SNAPSHOT_TOKEN = '__BOARD_SNAPSHOT_NULL__';

const toIsoString = (value: Date | string | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
};

type BoardMeta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  workspaceId: string | null;
};

const buildBoardMeta = (board: Board): BoardMeta => ({
  id: board.id,
  title: board.title,
  createdAt: toIsoString(board.createdAt),
  updatedAt: toIsoString(board.updatedAt),
  userId: board.userId ?? '',
  workspaceId: board.workspaceId ?? null,
});

const serializeMeta = (metaList: BoardMeta[]): string => {
  return JSON.stringify(
    [...metaList].sort((a, b) => a.id.localeCompare(b.id)),
  );
};

const snapshotToToken = (snapshot: BoardSnapshot | null | undefined): string => {
  if (!snapshot) {
    return NULL_SNAPSHOT_TOKEN;
  }
  return JSON.stringify(snapshot);
};

const isBoardMetaEqual = (existing: any, meta: BoardMeta): boolean => {
  if (!existing) return false;
  return (
    existing.title === meta.title &&
    existing.createdAt === meta.createdAt &&
    existing.updatedAt === meta.updatedAt &&
    (existing.userId ?? '') === meta.userId &&
    (existing.workspaceId ?? null) === meta.workspaceId
  );
};

export function useBoardYjsSync({
  boardsMap,
  boardContentMap,
  enabled = true,
}: UseBoardYjsSyncOptions) {
  // Debug status
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[BoardYjsSync] init', {
      enabled,
      hasBoardsMap: !!boardsMap,
      hasBoardContentMap: !!boardContentMap,
    });
  }, [enabled, boardsMap, boardContentMap]);

  const boards = useBoardStore((state) => state.boards);
  const mergeBoardsLocal = useBoardStore((state) => state.mergeBoardsLocal);
  const setBoardContentLocal = useBoardStore((state) => state.setBoardContentLocal);

  const isSyncingRef = useRef(false);
  const debounceTimer = useRef<number | null>(null);
  const lastBoardMetaRef = useRef<string>('');
  const lastSnapshotsRef = useRef<Record<string, string>>({});
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const lastPersistedTokenRef = useRef<Record<string, string>>({});

  const schedulePersist = (id: string, snapshot: BoardSnapshot | null) => {
    const token = snapshotToToken(snapshot);
    // Skip if already persisted with same token
    if (lastPersistedTokenRef.current[id] === token) {
      return;
    }
    // Clear previous timer
    const existing = saveTimersRef.current.get(id);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = window.setTimeout(async () => {
      saveTimersRef.current.delete(id);
      try {
        await boardApi.updateSnapshot(id, snapshot);
        lastPersistedTokenRef.current[id] = token;
        // eslint-disable-next-line no-console
        console.log('[BoardYjsSync] persisted snapshot to backend', { id, bytes: token === NULL_SNAPSHOT_TOKEN ? 0 : token.length });
      } catch (e) {
        console.warn('[BoardYjsSync] failed to persist snapshot', e);
      }
    }, 600); // debounce persist
    saveTimersRef.current.set(id, timer);
  };

  // Keep global flag so UI components can skip API persistence when realtime is active
  useEffect(() => {
    if (!enabled) {
      delete (window as any).__WORKSPACE_YJS_ACTIVE;
      return;
    }

    (window as any).__WORKSPACE_YJS_ACTIVE = true;
    return () => {
      delete (window as any).__WORKSPACE_YJS_ACTIVE;
    };
  }, [enabled]);

  // Push local boards/zustand changes into Yjs
  useEffect(() => {
    if (!enabled || !boardsMap || !boardContentMap || isSyncingRef.current) {
      return;
    }

    const pushToYjs = () => {
      if (!boardsMap || !boardContentMap) {
        return;
      }

      const metaEntries: BoardMeta[] = boards.map((board) => buildBoardMeta(board));
      const metaJson = serializeMeta(metaEntries);

      const boardIds = new Set(boards.map((board) => board.id));

      const snapshotUpdates = boards.map(({ id, snapshot }) => ({
        id,
        snapshot: snapshot ?? null,
        token: snapshotToToken(snapshot),
      }));

      const snapshotChanged = snapshotUpdates.some(({ id, token }) => lastSnapshotsRef.current[id] !== token);

      let hasDeletion = false;
      boardsMap.forEach((_value, key) => {
        if (!boardIds.has(key)) {
          hasDeletion = true;
        }
      });
      boardContentMap.forEach((_value, key) => {
        if (!boardIds.has(key)) {
          hasDeletion = true;
        }
      });

      const metaChanged = metaJson !== lastBoardMetaRef.current;

      if (!metaChanged && !snapshotChanged && !hasDeletion) {
        // Ensure snapshot cache is hydrated for newly seen boards even if nothing changed
        snapshotUpdates.forEach(({ id, token }) => {
          if (!(id in lastSnapshotsRef.current)) {
            lastSnapshotsRef.current[id] = token;
          }
        });
        return;
      }

      isSyncingRef.current = true;
      try {
        // Sync board metadata
        metaEntries.forEach((meta) => {
          const existing = boardsMap.get(meta.id);
          if (!isBoardMetaEqual(existing, meta)) {
            boardsMap.set(meta.id, meta);
          }
        });

        // Remove boards that no longer exist locally
        if (hasDeletion) {
          boardsMap.forEach((_value, key) => {
            if (!boardIds.has(key)) {
              boardsMap.delete(key);
            }
          });
        }

        lastBoardMetaRef.current = metaJson;

        // Sync snapshots/content
        snapshotUpdates.forEach(({ id, snapshot, token }) => {
          const lastToken = lastSnapshotsRef.current[id];
          if (token !== lastToken) {
            if (snapshot) {
              boardContentMap.set(id, snapshot);
            } else {
              boardContentMap.delete(id);
            }
          }
          lastSnapshotsRef.current[id] = token;
        });

        if (hasDeletion) {
          boardContentMap.forEach((_value, key) => {
            if (!boardIds.has(key)) {
              boardContentMap.delete(key);
              delete lastSnapshotsRef.current[key];
            }
          });
        }
      } catch (error) {
        console.error('Failed to sync boards to Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(pushToYjs, 120);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [boards, boardsMap, boardContentMap, enabled]);

  // Apply remote board metadata changes from Yjs into Zustand
  useEffect(() => {
    if (!enabled || !boardsMap) {
      return;
    }

    const applyBoardsFromYjs = () => {
      if (!boardsMap) return;

      const metaList: BoardMeta[] = [];
      boardsMap.forEach((value, key) => {
        if (!value) {
          return;
        }
        metaList.push({
          id: key,
          title: typeof value.title === 'string' ? value.title : 'Untitled',
          createdAt: toIsoString(value.createdAt),
          updatedAt: toIsoString(value.updatedAt),
          userId: typeof value.userId === 'string' ? value.userId : value.userId ?? '',
          workspaceId: value.workspaceId ?? null,
        });
      });

      const serialized = serializeMeta(metaList);
      if (serialized === lastBoardMetaRef.current) {
        return;
      }

      const normalizedBoards = metaList.map((meta) => ({
        id: meta.id,
        title: meta.title,
        createdAt: new Date(meta.createdAt),
        updatedAt: new Date(meta.updatedAt),
        userId: meta.userId,
        workspaceId: meta.workspaceId ?? undefined,
      })) as Array<Pick<Board, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'userId' | 'workspaceId'>>;

      isSyncingRef.current = true;
      try {
        mergeBoardsLocal(normalizedBoards);
        lastBoardMetaRef.current = serialized;
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Initial sync to hydrate store from Yjs state (if any)
    applyBoardsFromYjs();

    const handleBoardsUpdate = (_event: Y.YMapEvent<any>) => {
      if (isSyncingRef.current) return;
      try {
        applyBoardsFromYjs();
      } catch (error) {
        console.error('Failed to sync boards from Yjs:', error);
      }
    };

    boardsMap.observe(handleBoardsUpdate);
    return () => {
      boardsMap.unobserve(handleBoardsUpdate);
    };
  }, [boardsMap, enabled, mergeBoardsLocal]);

  // Apply remote board content/snapshot changes from Yjs into Zustand
  useEffect(() => {
    if (!enabled || !boardContentMap) {
      return;
    }

    const applySnapshotsFromYjs = (keys?: Iterable<string>) => {
      if (!boardContentMap) return;
      const targetKeys = keys ? Array.from(keys) : Array.from(boardContentMap.keys());
      if (targetKeys.length === 0) {
        return;
      }

      isSyncingRef.current = true;
      try {
        targetKeys.forEach((key) => {
          const value = (boardContentMap.get(key) ?? null) as BoardSnapshot | null;
          const token = snapshotToToken(value);
          if (lastSnapshotsRef.current[key] !== token) {
            // Update local store without triggering API to avoid loop
            setBoardContentLocal(key, value);
            // Persist to backend so reload has latest snapshot
            schedulePersist(key, value);
          }
          lastSnapshotsRef.current[key] = token;
        });
      } catch (error) {
        console.error('Failed to sync board snapshot from Yjs:', error);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Hydrate existing snapshots on mount
    applySnapshotsFromYjs();

    const handleSnapshotUpdate = (event: Y.YMapEvent<any>) => {
      if (isSyncingRef.current) return;
      applySnapshotsFromYjs(event.keysChanged);
    };

    boardContentMap.observe(handleSnapshotUpdate);
    return () => {
      boardContentMap.unobserve(handleSnapshotUpdate);
    };
  }, [boardContentMap, enabled, setBoardContentLocal]);

  // Handle scene changes emitted from Excalidraw Canvas component
  useEffect(() => {
    if (!enabled || !boardsMap || !boardContentMap) {
      return;
    }

    const onSceneChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; snapshot: BoardSnapshot } | undefined;
      if (!detail || !detail.id) return;

      // eslint-disable-next-line no-console
      console.log('[BoardYjsSync] scene-changed event', { id: detail.id, snapshotBytes: JSON.stringify(detail.snapshot).length });

      const { id, snapshot } = detail;
      try {
        const prevToken = lastSnapshotsRef.current[id];
        const nextToken = snapshotToToken(snapshot);
        if (prevToken !== nextToken) {
          boardContentMap.set(id, snapshot);
          lastSnapshotsRef.current[id] = nextToken;
        }

        const boardData = boardsMap.get(id);
        if (boardData) {
          const updatedMeta: BoardMeta = {
            ...boardData,
            updatedAt: new Date().toISOString(),
          };
          boardsMap.set(id, updatedMeta);
        }
        // Also persist to backend from the originating client
        schedulePersist(id, snapshot);
      } catch (err) {
        console.warn('Failed to propagate board scene change to Yjs:', err);
      }
    };

    window.addEventListener('board-scene-changed', onSceneChanged as EventListener);
    return () => {
      window.removeEventListener('board-scene-changed', onSceneChanged as EventListener);
    };
  }, [boardsMap, boardContentMap, enabled]);
}

