import { useLogout } from "@/features/auth/api";

export function SignOutButton() {
  const logout = useLogout();
  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
