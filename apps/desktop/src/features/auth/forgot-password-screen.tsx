import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { AuthLayout } from "./auth-layout";
import { useForgotPassword, useResetPassword } from "./api";

/**
 * Forgot / reset password (REIN-309/310). Two steps on the shared AuthLayout:
 *   request (email → enumeration-safe send) → reset (code + new password) → sign in.
 */
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const passwordIssue = (pw: string): string | null => {
  if (pw.length < 8) return "At least 8 characters";
  if (!/[A-Z]/.test(pw)) return "One uppercase letter";
  if (!/[0-9]/.test(pw)) return "One number";
  if (!/[^A-Za-z0-9]/.test(pw)) return "One special character";
  return null;
};

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onRequest = async () => {
    if (!isEmail(email)) return setError("Enter a valid email");
    setError(null);
    setBusy(true);
    try {
      const res = await forgot.mutateAsync(email.trim());
      // Always advance (enumeration-safe) — career-ops returns 200 regardless.
      setNotice((res.ok && res.data.message) || "If that email exists, we sent a reset code.");
      setStep("reset");
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code");
    const issue = passwordIssue(password);
    if (issue) return setError(`Password needs: ${issue.toLowerCase()}`);
    if (password !== confirm) return setError("Passwords do not match");
    setError(null);
    setBusy(true);
    try {
      const res = await reset.mutateAsync({ email: email.trim(), otp, password });
      if (!res.ok) return setError(res.error);
      navigate("/auth", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <FieldGroup>
        {step === "request" ? (
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setError(null);
              setNotice(null);
              setOtp("");
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold">
            {step === "request" ? "Reset your password" : "Set a new password"}
          </h1>
          <FieldDescription className="text-center">
            {step === "request"
              ? "We'll email you a 6-digit code"
              : `Enter the code we sent to ${email}`}
          </FieldDescription>
        </div>

        {notice && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            {error}
          </p>
        )}

        {step === "request" ? (
          <>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && onRequest()}
                placeholder="you@example.com"
                className="h-10 focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </Field>
            <Field>
              <Button
                type="button"
                onClick={onRequest}
                disabled={busy}
                className="h-10 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Sending…" : "Send reset code"}
              </Button>
            </Field>
          </>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="otp">6-digit code</FieldLabel>
              <Input
                id="otp"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="h-10 text-center font-semibold tracking-[0.5em] focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new-password">New password</FieldLabel>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="h-10 pr-10 focus-visible:border-brand focus-visible:ring-brand/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && passwordIssue(password) && (
                <p className="text-xs text-muted-foreground">8+ chars · 1 uppercase · 1 number · 1 special</p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
              <Input
                id="confirm"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && onReset()}
                placeholder="Re-enter password"
                className="h-10 focus-visible:border-brand focus-visible:ring-brand/30"
              />
            </Field>

            <Field>
              <Button
                type="button"
                onClick={onReset}
                disabled={busy}
                className="h-10 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Updating…" : "Update password"}
              </Button>
            </Field>
          </>
        )}
      </FieldGroup>
    </AuthLayout>
  );
}
