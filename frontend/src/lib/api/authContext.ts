type TokenFetcher = () => Promise<string | null | undefined>;
type UserIdFetcher = () => string | null | undefined;

let tokenFetcher: TokenFetcher | null = null;
let userIdFetcher: UserIdFetcher | null = null;

export const apiAuthContext = {
  setTokenFetcher(fetcher: TokenFetcher | null) {
    tokenFetcher = fetcher;
  },

  setUserIdFetcher(fetcher: UserIdFetcher | null) {
    userIdFetcher = fetcher;
  },

  async getAuthHeaders(additionalHeaders: HeadersInit = {}): Promise<HeadersInit> {
    const headers: Record<string, string> = {};

    if (tokenFetcher) {
      try {
        const token = await tokenFetcher();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn("Failed to resolve auth token for API request", error);
      }
    }

    if (userIdFetcher) {
      try {
        const userId = userIdFetcher();
        if (userId) {
          headers["X-User-Id"] = userId;
        }
      } catch (error) {
        console.warn("Failed to resolve user id for API request", error);
      }
    }

    return {
      ...additionalHeaders,
      ...headers,
    };
  },

  getCurrentUserId(): string | null {
    if (!userIdFetcher) {
      return null;
    }

    try {
      return userIdFetcher() ?? null;
    } catch (error) {
      console.warn("Failed to resolve current user id", error);
      return null;
    }
  },

  appendUserIdQuery(url: string): string {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return url;
    }

    try {
      const [base, queryString] = url.split("?");
      const searchParams = new URLSearchParams(queryString);
      searchParams.set("userId", userId);
      const nextQuery = searchParams.toString();
      return nextQuery ? `${base}?${nextQuery}` : base;
    } catch (error) {
      console.warn("Failed to append user id to request URL", error);
      return url;
    }
  },

  clear() {
    tokenFetcher = null;
    userIdFetcher = null;
  },
};
