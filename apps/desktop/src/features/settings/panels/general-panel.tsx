import { useState } from "react";
import { PowerServiceIcon, Shield01Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/api";
import { SettingHeader, SettingList, SettingListRow } from "../components/cards";

/** General settings — natively card design. Toggles are dummy until wired. */
export function GeneralPanel() {
  const logout = useLogout();
  const [openOnLogin, setOpenOnLogin] = useState(false);
  const [localOnly, setLocalOnly] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <SettingHeader title="General settings" subtitle="Customize how Compass works for you" />
        <SettingList>
          <SettingListRow
            icon={PowerServiceIcon}
            title="Open Compass when you log in"
            description="Compass will open automatically when you log in to your computer"
            active={openOnLogin}
            action={<Switch checked={openOnLogin} onCheckedChange={setOpenOnLogin} />}
          />
          <SettingListRow
            icon={Shield01Icon}
            title="Local-first mode"
            description="Scraping and AI inference run on your machine. Nothing leaves your device except what you choose to sync."
            active={localOnly}
            action={<Switch checked={localOnly} onCheckedChange={setLocalOnly} />}
          />
          <SettingListRow
            icon={Moon02Icon}
            title="Theme"
            description="Compass currently uses a dark theme."
            action={<span className="text-sm text-muted-foreground">Dark</span>}
          />
        </SettingList>
      </div>

      <div>
        <SettingHeader title="Account" subtitle="Manage your session on this device" />
        <SettingList>
          <SettingListRow
            icon={Shield01Icon}
            title="Log out on this device"
            description="You'll need to sign in again to use Compass."
            action={
              <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
                {logout.isPending ? "Signing out…" : "Log out"}
              </Button>
            }
          />
        </SettingList>
      </div>
    </div>
  );
}
