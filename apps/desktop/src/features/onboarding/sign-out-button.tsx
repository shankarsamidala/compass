import { useLogout } from "@/features/auth/api";

export function SignOutButton() {
  const logout = useLogout();
  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
