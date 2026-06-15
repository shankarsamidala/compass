import { config } from "./config";
import { credentials } from "./credentials";

/**
 * The single authed HTTP client (AGENTS §2). Attaches the Bearer token and does
 * single-flight 401 refresh + retry. Services use this — never raw fetch.
 */
export interface RawResponse {
  ok: boolean;
  status: number;
  json: any;
}

let refreshInFlight: Promise<boolean> | null = null;

function url(path: string): string {
  return `${config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Unauthenticated POST (login/signup/refresh/etc). Normalizes network errors. */
export async function postJson(path: string, body?: unknown, token?: string): Promise<RawResponse> {
  try {
    const res = await fetch(url(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, json: { error: message, code: "NETWORK" } };
  }
}

/** Rotate the token pair via /auth/refresh. Clears the session on failure. */
function refresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = credentials.getRefreshToken();
    if (!refreshToken) return false;
    const raw = await postJson("/auth/refresh", { refreshToken });
    if (raw.ok && raw.json?.accessToken && raw.json?.refreshToken) {
      if (raw.json.user) {
        credentials.setSession({
          accessToken: raw.json.accessToken,
          refreshToken: raw.json.refreshToken,
          user: raw.json.user,
        });
      } else {
        credentials.setTokens(raw.json.accessToken, raw.json.refreshToken);
      }
      return true;
    }
    credentials.clear();
    return false;
  })();
  refreshInFlight.finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Fetch with the access token attached; on 401, single-flight refresh + retry once. */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
  const doFetch = async (): Promise<Response | null> => {
    const token = credentials.getAccessToken();
    try {
      return await fetch(url(path), {
        ...init,
        headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch {
      return null;
    }
  };

  let res = await doFetch();
  if (res && res.status === 401) {
    if (await refresh()) res = await doFetch();
  }
  return res;
}
