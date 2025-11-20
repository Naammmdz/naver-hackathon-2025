import { DefaultThreadStoreAuth, YjsThreadStore } from "@blocknote/core/comments";
import type * as Y from "yjs";

/**
 * Create a YjsThreadStore instance for BlockNote comments.
 * This stores comment threads directly in the shared Yjs document,
 * matching BlockNote's default behaviour (no REST layer required).
 */
export function createThreadStore(
  userId: string,
  threadsYMap: Y.Map<Y.Map<unknown>>,
  role: "comment" | "editor" = "comment"
) {
  const auth = new DefaultThreadStoreAuth(userId, role);
  return new YjsThreadStore(userId, threadsYMap, auth);
}

