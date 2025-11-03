import type { Board } from "@/types/board";
import type { Document } from "@/types/document";
import type { Task } from "@/types/task";

type AdapterApi<T> = {
  syncToYjs: (item: T) => void;
  removeFromYjs: (id: string) => void;
};

const registry = new Map<string, AdapterApi<unknown>>();

export const registerYjsAdapter = <T>(key: string, api: AdapterApi<T>) => {
  registry.set(key, api as AdapterApi<unknown>);
  return () => {
    const current = registry.get(key);
    if (current === api) {
      registry.delete(key);
    }
  };
};

const invoke = <T, K extends keyof AdapterApi<T>>(
  key: string,
  method: K,
  payload: Parameters<AdapterApi<T>[K]>[0]
) => {
  const adapter = registry.get(key) as AdapterApi<T> | undefined;
  if (!adapter) {
    console.warn(`[YjsHelper] Adapter for "${key}" not registered yet.`);
    return;
  }
  adapter[method](payload as never);
};

export const yjsHelper = {
  syncTaskToYjs: (task: Task) => invoke<Task, "syncToYjs">("tasks", "syncToYjs", task),
  removeTaskFromYjs: (id: string) => invoke<Task, "removeFromYjs">("tasks", "removeFromYjs", id),

  syncDocumentToYjs: (document: Document) =>
    invoke<Document, "syncToYjs">("documents", "syncToYjs", document),
  removeDocumentFromYjs: (id: string) =>
    invoke<Document, "removeFromYjs">("documents", "removeFromYjs", id),

  syncBoardToYjs: (board: Board) => invoke<Board, "syncToYjs">("boards", "syncToYjs", board),
  removeBoardFromYjs: (id: string) =>
    invoke<Board, "removeFromYjs">("boards", "removeFromYjs", id),
};
