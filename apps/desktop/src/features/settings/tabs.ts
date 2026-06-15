import type { IconSvgElement } from "@hugeicons/react";
import {
  ComputerIcon,
  TestTube01Icon,
  Target02Icon,
  SparklesIcon,
  Calendar01Icon,
  Mic01Icon,
  KeyboardIcon,
  SmartPhone01Icon,
  HelpCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

export type SettingsTabId =
  | "general"
  | "reinit-api"
  | "reinit-pro"
  | "ai-providers"
  | "job-search"
  | "skills"
  | "calendar"
  | "audio"
  | "keybinds"
  | "phone-mirror"
  | "help"
  | "about";

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: IconSvgElement;
  /** Reinit-branded items render the logo instead of an icon. */
  brand?: boolean;
}

/** Mirrors natively's settings nav (dummy items included; wired one by one). */
export const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: "general", label: "General", icon: ComputerIcon },
  { id: "reinit-api", label: "Reinit API", icon: ComputerIcon, brand: true },
  { id: "reinit-pro", label: "Reinit Pro", icon: ComputerIcon, brand: true },
  { id: "ai-providers", label: "AI Providers", icon: TestTube01Icon },
  { id: "job-search", label: "Job Preferences", icon: Target02Icon },
  { id: "skills", label: "Skills", icon: SparklesIcon },
  { id: "calendar", label: "Calendar", icon: Calendar01Icon },
  { id: "audio", label: "Audio", icon: Mic01Icon },
  { id: "keybinds", label: "Keybinds", icon: KeyboardIcon },
  { id: "phone-mirror", label: "Phone Mirror", icon: SmartPhone01Icon },
  { id: "help", label: "Setup & Help", icon: HelpCircleIcon },
  { id: "about", label: "About", icon: InformationCircleIcon },
] as const;
