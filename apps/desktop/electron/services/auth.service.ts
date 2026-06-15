import { postJson, authedFetch, type RawResponse } from "../core/http";
import { credentials } from "../core/credentials";
import { ok, err, type Result, type AuthUser, type SessionData } from "@compass/ipc-contract";

/**
 * Auth service (REIN-304) — the main-process BFF for career-ops `/auth/*`.
 * Stores the session in `credentials`; returns the Result envelope. career-ops is
 * Bearer-based, so it needs zero changes for the desktop client.
 */

/**
 * Map a failed raw response to a user-safe Result error. Surfaces the API's own
 * message + stable code (e.g. login 401 → "Invalid email or password" /
 * INVALID_CREDENTIALS). Note: a 401 here is NOT "session expired" — that case is
 * handled only in getSession (an authed endpoint), where 401 means a dead token.
 */
function fail(raw: RawResponse, fallback: string): Result<never> {
  const message =
    raw.json?.error ||
    raw.json?.message ||
    (raw.status === 0 ? "Could not reach the server" : fallback);
  return err(message, raw.json?.code);
}

export const authService = {
  async signup(email: string, password: string): Promise<Result<{ userId?: string; message?: string }>> {
    const raw = await postJson("/auth/signup", { email, password });
    return raw.ok
      ? ok({ userId: raw.json?.data?.userId, message: raw.json?.message })
      : fail(raw, "Could not create account");
  },

  async verifyEmail(email: string, otp: string): Promise<Result<{ message?: string }>> {
    const raw = await postJson("/auth/verify-email", { email, otp });
    return raw.ok ? ok({ message: raw.json?.message }) : fail(raw, "Verification failed");
  },

  async resendOtp(email: string): Promise<Result<{ message?: string }>> {
    const raw = await postJson("/auth/resend-otp", { email });
    return raw.ok ? ok({ message: raw.json?.message }) : fail(raw, "Could not resend code");
  },

  async login(email: string, password: string): Promise<Result<AuthUser>> {
    const raw = await postJson("/auth/login", { email, password });
    if (raw.ok && raw.json?.accessToken && raw.json?.refreshToken && raw.json?.user) {
      credentials.setSession({
        accessToken: raw.json.accessToken,
        refreshToken: raw.json.refreshToken,
        user: raw.json.user,
      });
      return ok(raw.json.user as AuthUser);
    }
    return fail(raw, "Login failed");
  },

  async forgotPassword(email: string): Promise<Result<{ message?: string }>> {
    // career-ops is enumeration-safe (always 200) — surface its message either way.
    const raw = await postJson("/auth/forgot-password", { email });
    return raw.ok ? ok({ message: raw.json?.message }) : fail(raw, "Request failed");
  },

  async resetPassword(email: string, otp: string, password: string): Promise<Result<{ message?: string }>> {
    const raw = await postJson("/auth/reset-password", { email, otp, password });
    return raw.ok ? ok({ message: raw.json?.message }) : fail(raw, "Could not reset password");
  },

  async logout(): Promise<Result<{ message?: string }>> {
    const refreshToken = credentials.getRefreshToken();
    if (refreshToken) await postJson("/auth/logout", { refreshToken }); // best-effort revoke
    credentials.clear();
    return ok({});
  },

  async getSession(): Promise<Result<SessionData>> {
    if (!credentials.getAccessToken()) return err("Not authenticated", "NO_SESSION");
    const res = await authedFetch("/me", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.user) return ok({ user: json.user as AuthUser, profile: json.profile });
    if (res.status === 401) {
      credentials.clear();
      return err("Session expired", "INVALID_TOKEN");
    }
    return err(json?.error || "Request failed", json?.code);
  },
};
