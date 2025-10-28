import type { Board, BoardSnapshot, CreateBoardInput, UpdateBoardInput } from "@/types/board";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8989";

interface BoardApiResponse {
  id: string;
  title: string;
  snapshot?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BoardApiRequest {
  title: string;
  snapshot?: string | null;
}

const parseDate = (value?: string): Date => {
  if (!value) {
    return new Date();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const parseSnapshot = (value?: string | null): BoardSnapshot | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as BoardSnapshot;
    }
  } catch (error) {
    console.warn("Failed to parse board snapshot", error);
  }

  return null;
};

const serializeSnapshot = (snapshot: BoardSnapshot | null | undefined): string | null => {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.stringify(snapshot);
  } catch (error) {
    console.warn("Failed to serialize board snapshot", error);
    return null;
  }
};

const mapBoardFromApi = (board: BoardApiResponse): Board => ({
  id: board.id,
  title: board.title,
  snapshot: parseSnapshot(board.snapshot),
  createdAt: parseDate(board.createdAt),
  updatedAt: parseDate(board.updatedAt),
});

const serializeBoardPayload = (
  payload: CreateBoardInput | Partial<UpdateBoardInput>,
  includeSnapshot = false,
): BoardApiRequest => {
  const body: BoardApiRequest = {
    title: payload.title ?? "Untitled Board",
  };

  if (includeSnapshot || payload.snapshot !== undefined) {
    body.snapshot = serializeSnapshot(payload.snapshot ?? null);
  }

  return body;
};

const request = async <T>(input: RequestInfo, init?: RequestInit, parseJson = true): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (!parseJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const boardApi = {
  async list(): Promise<Board[]> {
    const data = await request<BoardApiResponse[]>(`${API_BASE_URL}/api/boards`);
    return data.map(mapBoardFromApi);
  },

  async get(id: string): Promise<Board> {
    const data = await request<BoardApiResponse>(`${API_BASE_URL}/api/boards/${id}`);
    return mapBoardFromApi(data);
  },

  async create(payload: CreateBoardInput): Promise<Board> {
    const body = serializeBoardPayload(payload, true);
    const data = await request<BoardApiResponse>(`${API_BASE_URL}/api/boards`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return mapBoardFromApi(data);
  },

  async update(id: string, payload: Partial<UpdateBoardInput>): Promise<Board> {
    const body = serializeBoardPayload(payload);
    const data = await request<BoardApiResponse>(`${API_BASE_URL}/api/boards/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return mapBoardFromApi(data);
  },

  async updateSnapshot(id: string, snapshot: BoardSnapshot | null): Promise<Board> {
    const data = await request<BoardApiResponse>(`${API_BASE_URL}/api/boards/${id}/snapshot`, {
      method: "PATCH",
      body: JSON.stringify({ snapshot: serializeSnapshot(snapshot) }),
    });
    return mapBoardFromApi(data);
  },

  async delete(id: string): Promise<void> {
    await request(`${API_BASE_URL}/api/boards/${id}`, { method: "DELETE" }, false);
  },
};
