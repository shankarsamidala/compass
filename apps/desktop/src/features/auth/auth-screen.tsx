import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AuthLayout, openExternal } from "./auth-layout";
import { useLogin, useSignup, useVerifyEmail, useResendOtp } from "./api";
import logo from "@/assets/logo.svg";
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
  const [busy, setBusy] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const { control, handleSubmit } = form;

  const onCredentials = async (v: Values) => {
    setBusy(true);
    try {
      const su = await signup.mutateAsync(v);
      if (su.ok) {
        setCreds(v);
        toast.success(su.data.message ?? "Check your email for the 6-digit code.");
        setStep("verify");
        return;
      }
      if (su.code === "EMAIL_ALREADY_EXISTS") {
        const li = await login.mutateAsync(v);
        if (li.ok) return; // session invalidates → AuthGate swaps to the app
        if (li.code === "EMAIL_NOT_VERIFIED") {
          await resend.mutateAsync(v.email).catch(() => undefined);
          setCreds(v);
          toast.success("Verify your email — we sent you a fresh code.");
          setStep("verify");
          return;
        }
        toast.error(li.error);
        return;
      }
      toast.error(su.error);
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const v = await verifyEmail.mutateAsync({ email: creds.email, otp });
      if (!v.ok) {
        toast.error(v.error);
        return;
      }
      const li = await login.mutateAsync(creds);
      if (!li.ok) {
        setStep("credentials");
        toast.error(li.error || "Verified — please sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    await resend.mutateAsync(creds.email).catch(() => undefined);
    toast.success("A new code is on its way.");
  };

  return (
    <AuthLayout maxWidthClass="max-w-sm">
      {step === "credentials" ? (
        <>
          <Form {...form}>
            <form onSubmit={handleSubmit(onCredentials)} className="space-y-5" noValidate>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight">Log in or sign up</h1>
                <FormDescription className="text-center">
                  Find roles that fit, get them evaluated, and track your search.
                </FormDescription>
              </div>

              <FormField
                control={control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoFocus
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="h-10 focus-visible:border-white focus-visible:ring-white/30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/forgot"
                        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="h-10 pr-10 focus-visible:border-white focus-visible:ring-white/30"
                          {...field}
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={busy}
                className="h-10 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Please wait…" : "Continue"}
              </Button>

              <div className="relative my-4 flex items-center justify-center">
                <Separator className="absolute inset-0 top-1/2" />
                <span className="relative bg-[#121212] px-3 text-xs uppercase text-muted-foreground">Or</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Button variant="secondary" type="button" disabled={busy} onClick={() => toast.info(SOON)} className="h-10 border border-border">
                  <img src={googleIcon} alt="" className="size-4 shrink-0" />
                  Continue with Google
                </Button>
                <Button variant="secondary" type="button" disabled={busy} onClick={() => toast.info(SOON)} className="h-10 border border-border">
                  <img src={githubIcon} alt="" className="size-4 shrink-0 dark:invert" />
                  Continue with Github
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="px-6 text-xs text-muted-foreground leading-normal">
              By continuing, you agree to our{" "}
              <button type="button" onClick={() => openExternal("https://reinit.in/terms")} className="underline underline-offset-4 transition-colors hover:text-foreground">
                Terms of Service
              </button>{" "}
              and{" "}
              <button type="button" onClick={() => openExternal("https://reinit.in/privacy")} className="underline underline-offset-4 transition-colors hover:text-foreground">
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={logo} alt="Reinit" className="size-9" />
            <h1 className="text-xl font-bold">Verify your email</h1>
            <p className="text-center text-xs text-muted-foreground">Enter the 6-digit code we sent to {creds.email}</p>
          </div>

          <div className="space-y-2">
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
              className="h-10 text-center font-semibold tracking-[0.5em] focus-visible:border-white focus-visible:ring-white/30"
            />
          </div>

          <Button
            type="button"
            onClick={onVerify}
            disabled={busy}
            className="h-10 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand-hover"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Verifying…" : "Verify & continue"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setOtp("");
              }}
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={onResend}
              disabled={busy}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
