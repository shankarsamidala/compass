import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout, openExternal } from "./auth-layout";
import { useLogin, useSignup, useVerifyEmail, useResendOtp } from "./api";
import googleIcon from "@/assets/google-color.svg";
import githubIcon from "@/assets/github.svg";

/**
 * Unified auth (REIN-303/306/307/308). ONE entry — signup-first: a new email is
 * created (→ verify → auto-login); an existing email logs in; unverified routes
 * to verify. Typos are harmless (an unverified mistyped account never gets a code).
 */
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

const SOON = "Social sign-in is coming soon.";

export function AuthScreen() {
  const login = useLogin();
  const signup = useSignup();
  const verifyEmail = useVerifyEmail();
  const resend = useResendOtp();

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [creds, setCreds] = useState<Values>({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onCredentials = async (v: Values) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const su = await signup.mutateAsync(v);
      if (su.ok) {
        setCreds(v);
        setNotice(su.data.message ?? "Check your email for the 6-digit code.");
        setStep("verify");
        return;
      }
      if (su.code === "EMAIL_ALREADY_EXISTS") {
        const li = await login.mutateAsync(v);
        if (li.ok) return; // session invalidates → AuthGate swaps to the app
        if (li.code === "EMAIL_NOT_VERIFIED") {
          await resend.mutateAsync(v.email).catch(() => undefined);
          setCreds(v);
          setNotice("Verify your email — we sent you a fresh code.");
          setStep("verify");
          return;
        }
        setError(li.error);
        return;
      }
      setError(su.error);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const v = await verifyEmail.mutateAsync({ email: creds.email, otp });
      if (!v.ok) {
        setError(v.error);
        return;
      }
      const li = await login.mutateAsync(creds);
      if (!li.ok) {
        setStep("credentials");
        setError(li.error || "Verified — please sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setError(null);
    await resend.mutateAsync(creds.email).catch(() => undefined);
    setNotice("A new code is on its way.");
  };

  return (
    <AuthLayout>
      {step === "verify" && (
        <button
          type="button"
          onClick={() => {
            setStep("credentials");
            setError(null);
            setNotice(null);
            setOtp("");
          }}
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
      )}

      <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          {step === "credentials" ? "Welcome" : "Verify your email"}
        </h1>
        <p className="text-balance text-sm text-muted-foreground">
          {step === "credentials"
            ? "Sign in or create your Reinit account"
            : `Enter the 6-digit code we sent to ${creds.email}`}
        </p>
      </div>

      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
        >
          {error}
        </p>
      )}

      {step === "credentials" ? (
        <form onSubmit={handleSubmit(onCredentials)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" size="lg" variant="outline" disabled={busy} onClick={() => setError(SOON)} className="h-11 inline-flex items-center justify-center gap-2 text-sm">
              <img src={googleIcon} alt="" className="size-4 shrink-0" />
              Google
            </Button>
            <Button type="button" size="lg" variant="outline" disabled={busy} onClick={() => setError(SOON)} className="h-11 inline-flex items-center justify-center gap-2 text-sm">
              <img src={githubIcon} alt="" className="size-4 shrink-0" />
              Github
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">Or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 focus-visible:border-brand focus-visible:ring-brand/30"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot"
                className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 pr-10 focus-visible:border-brand focus-visible:ring-brand/30"
                aria-invalid={!!errors.password}
                {...register("password")}
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
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Please wait…" : "Continue"}
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            By continuing, you agree to our{" "}
            <button type="button" onClick={() => openExternal("https://reinit.in/terms")} className="underline underline-offset-4 transition-colors hover:text-foreground">
              Terms
            </button>{" "}
            and{" "}
            <button type="button" onClick={() => openExternal("https://reinit.in/privacy")} className="underline underline-offset-4 transition-colors hover:text-foreground">
              Privacy Policy
            </button>
            .
          </p>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && !busy && onVerify()}
              placeholder="••••••"
              className="h-11 text-center font-semibold tracking-[0.5em] focus-visible:border-brand focus-visible:ring-brand/30"
            />
          </div>
          <Button
            type="button"
            onClick={onVerify}
            disabled={busy}
            className="h-11 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Verifying…" : "Verify & continue"}
          </Button>
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            Didn&apos;t get it? Resend code
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
