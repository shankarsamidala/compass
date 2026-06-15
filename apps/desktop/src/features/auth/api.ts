import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/ipc";
import { qk } from "@/lib/query";

/** Current session — drives the AuthGate. */
export function useSession() {
  return useQuery({ queryKey: qk.session, queryFn: () => auth.getSession() });
}

/** Login mutation. Returns the Result envelope (does NOT throw on ok:false). */
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; password: string }) => auth.login(v.email, v.password),
    onSuccess: (res) => {
      // On success the session flips → re-fetch so the gate renders the app.
      if (res.ok) qc.invalidateQueries({ queryKey: qk.session });
    },
  });
}

/** Signup — used signup-first in the unified flow to detect new vs existing email. */
export function useSignup() {
  return useMutation({
    mutationFn: (v: { email: string; password: string }) => auth.signup(v.email, v.password),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (v: { email: string; otp: string }) => auth.verifyEmail(v.email, v.otp),
  });
}

export function useResendOtp() {
  return useMutation({ mutationFn: (email: string) => auth.resendOtp(email) });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => auth.forgotPassword(email) });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (v: { email: string; otp: string; password: string }) =>
      auth.resetPassword(v.email, v.otp, v.password),
  });
}

/** Logout — clears the session, then refetches to drop back to the auth flow. */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.session }),
  });
}
