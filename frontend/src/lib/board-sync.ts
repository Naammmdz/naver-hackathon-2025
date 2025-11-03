import type { BoardSnapshot } from "@/types/board";
import type { AppState, ExcalidrawElement } from "@excalidraw/excalidraw/types";

const hasStructuredClone = typeof structuredClone === "function";

const safeClone = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (hasStructuredClone) {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON clone
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

export const BOARD_APP_STATE_WHITELIST: Array<keyof AppState> = [
  "theme",
  "viewBackgroundColor",
  "gridSize",
  "scrollX",
  "scrollY",
  "zoom",
  "isBindingEnabled",
  "isLibraryOpen",
  "showStats",
  "showQuickActions",
  "showHyperlinkPopup",
];

export const sanitizeBoardAppState = (
  appState: Partial<AppState> & Record<string, unknown>
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  BOARD_APP_STATE_WHITELIST.forEach((key) => {
    sanitized[key] = appState[key];
  });

  sanitized.viewModeEnabled = Boolean(appState.viewModeEnabled);
  sanitized.zenModeEnabled = false;

  return safeClone(sanitized);
};

const toElementArray = (snapshot: BoardSnapshot | null): ExcalidrawElement[] => {
  if (!snapshot?.elements || !Array.isArray(snapshot.elements)) {
    return [];
  }
  return safeClone(snapshot.elements) as ExcalidrawElement[];
};

const toAppState = (snapshot: BoardSnapshot | null): Record<string, unknown> => {
  if (!snapshot?.appState || typeof snapshot.appState !== "object") {
    return {};
  }
  return safeClone(snapshot.appState as Record<string, unknown>);
};

const toFiles = (snapshot: BoardSnapshot | null): Record<string, unknown> => {
  if (!snapshot?.files || typeof snapshot.files !== "object") {
    return {};
  }
  return safeClone(snapshot.files as Record<string, unknown>);
};

const shouldReplaceElement = (
  existing: ExcalidrawElement,
  candidate: ExcalidrawElement
): boolean => {
  const candidateVersion = (candidate as { version?: number }).version ?? 0;
  const existingVersion = (existing as { version?: number }).version ?? 0;
  if (candidateVersion > existingVersion) {
    return true;
  }
  if (candidateVersion < existingVersion) {
    return false;
  }
  const candidateNonce = (candidate as { versionNonce?: number }).versionNonce ?? 0;
  const existingNonce = (existing as { versionNonce?: number }).versionNonce ?? 0;
  if (candidateNonce !== existingNonce) {
    return candidateNonce > existingNonce;
  }
  const candidateUpdated = (candidate as { updated?: number }).updated ?? 0;
  const existingUpdated = (existing as { updated?: number }).updated ?? 0;
  return candidateUpdated >= existingUpdated;
};

export const mergeBoardSnapshots = (
  base: BoardSnapshot | null,
  incoming: BoardSnapshot
): BoardSnapshot => {
  const baseElements = toElementArray(base);
  const incomingElements = toElementArray(incoming);

  const elementMap = new Map<string, ExcalidrawElement>();
  baseElements.forEach((element) => {
    elementMap.set(element.id, element);
  });

  incomingElements.forEach((element) => {
    const existing = elementMap.get(element.id);
    if (!existing || shouldReplaceElement(existing, element)) {
      elementMap.set(element.id, element);
    }
  });

  const mergedElements = Array.from(elementMap.values());

  const mergedAppState = sanitizeBoardAppState({
    ...toAppState(base),
    ...toAppState(incoming),
  });

  const mergedFiles = {
    ...toFiles(base),
    ...toFiles(incoming),
  };

  return {
    elements: safeClone(mergedElements),
    appState: mergedAppState,
    files: safeClone(mergedFiles),
  };
};
