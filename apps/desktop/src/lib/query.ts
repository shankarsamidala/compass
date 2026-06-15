import { QueryClient } from "@tanstack/react-query";

/** Single QueryClient for all IPC/server state (AGENTS §7). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

/** Centralized query keys. */
export const qk = {
  session: ["auth", "session"] as const,
  jobs: ["jobs"] as const,
  job: (id: string) => ["jobs", id] as const,
};
