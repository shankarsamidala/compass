import { useLogout } from "@/features/auth/api";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const logout = useLogout();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="text-muted-foreground hover:text-foreground h-9 hover:border-brand hover:ring-1 hover:ring-brand"
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
