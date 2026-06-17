import type { IconSvgElement } from "@hugeicons/react";
import {
  ComputerIcon,
  TestTube01Icon,
  Target02Icon,
  SparklesIcon,
  LockIcon,
  Notification01Icon,
  PaintBrush01Icon,
  Edit01Icon,
  UserAdd01Icon,
  Tag01Icon,
  Database01Icon,
  FilterIcon,
  Cancel01Icon,
  BriefcaseIcon,
  MortarboardIcon,
  CertificateIcon,
  CodeIcon,
  FolderLibraryIcon,
  EyeIcon,
  FireIcon,
  Award01Icon,
  CreditCardIcon,
  WalletIcon,
  Message01Icon,
  Shield01Icon,
  StarIcon,
  SpeakerIcon,
  GridIcon,
  Book01Icon,
  Logout01Icon,
  Link01Icon,
  SmartPhone01Icon,
  School01Icon,
} from "@hugeicons/core-free-icons";

export type SettingsTabId =
  // ── Account ──────────────────────────────────────────────────────────────
  | "general"
  | "account-security"
  | "notifications"
  | "job-search"
  | "appearance"
  | "posting"
  | "invite-friends"
  // ── Feed settings ────────────────────────────────────────────────────────
  | "feed-general"
  | "feed-tags"
  | "feed-sources"
  | "feed-preferences"
  | "ai-providers"
  | "blocked-content"
  // ── Career ───────────────────────────────────────────────────────────────
  | "work-experience"
  | "education"
  | "certifications"
  | "open-source"
  | "projects"
  // ── Gamification ─────────────────────────────────────────────────────────
  | "feature-visibility"
  | "streaks"
  | "achievements"
  | "hot-takes"
  | "devcard"
  // ── Developers ───────────────────────────────────────────────────────────
  | "api-access"
  | "integrations"
  // ── Billing ──────────────────────────────────────────────────────────────
  | "subscriptions"
  | "core-wallet"
  // ── Help center ──────────────────────────────────────────────────────────
  | "feedback"
  | "privacy"
  | "reputation"
  | "advertise"
  | "apps"
  | "docs"
  // ── Branded ──────────────────────────────────────────────────────────────
  | "reinit-api"
  | "reinit-pro";

export interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: IconSvgElement;
  brand?: boolean;
  external?: boolean;
}

export interface SettingsSection {
  label?: string;
  tabs: SettingsTab[];
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  {
    tabs: [
      { id: "general", label: "General", icon: ComputerIcon },
      { id: "account-security", label: "Account & Security", icon: LockIcon },
      { id: "notifications", label: "Notifications", icon: Notification01Icon },
      { id: "job-search", label: "Job preferences", icon: Target02Icon },
      { id: "appearance", label: "Appearance", icon: PaintBrush01Icon },
      { id: "posting", label: "Posting", icon: Edit01Icon },
      { id: "invite-friends", label: "Invite Friends", icon: UserAdd01Icon },
      { id: "reinit-api", label: "Reinit API", icon: ComputerIcon, brand: true },
      { id: "reinit-pro", label: "Reinit Pro", icon: ComputerIcon, brand: true },
    ],
  },
  {
    label: "Feed settings",
    tabs: [
      { id: "feed-general", label: "General", icon: TestTube01Icon },
      { id: "feed-tags", label: "Tags", icon: Tag01Icon },
      { id: "feed-sources", label: "Content sources", icon: Database01Icon },
      { id: "feed-preferences", label: "Content preferences", icon: FilterIcon },
      { id: "ai-providers", label: "AI superpowers", icon: SparklesIcon },
      { id: "blocked-content", label: "Blocked content", icon: Cancel01Icon },
    ],
  },
  {
    label: "Career",
    tabs: [
      { id: "work-experience", label: "Work Experience", icon: BriefcaseIcon },
      { id: "education", label: "Education", icon: School01Icon },
      { id: "certifications", label: "Certifications", icon: CertificateIcon },
      { id: "open-source", label: "Open Source", icon: CodeIcon },
      { id: "projects", label: "Projects & Publications", icon: FolderLibraryIcon },
    ],
  },
  {
    label: "Gamification",
    tabs: [
      { id: "feature-visibility", label: "Feature visibility", icon: EyeIcon },
      { id: "streaks", label: "Streaks", icon: FireIcon },
      { id: "achievements", label: "Achievements", icon: Award01Icon, external: true },
      { id: "hot-takes", label: "Hot Takes", icon: MortarboardIcon, external: true },
      { id: "devcard", label: "DevCard", icon: SmartPhone01Icon },
    ],
  },
  {
    label: "Developers",
    tabs: [
      { id: "api-access", label: "API Access", icon: CodeIcon },
      { id: "integrations", label: "Integrations", icon: Link01Icon },
    ],
  },
  {
    label: "Billing and Monetization",
    tabs: [
      { id: "subscriptions", label: "Subscriptions", icon: CreditCardIcon },
      { id: "core-wallet", label: "Core Wallet", icon: WalletIcon, external: true },
    ],
  },
  {
    label: "Help center",
    tabs: [
      { id: "feedback", label: "Your Feedback", icon: Message01Icon },
      { id: "privacy", label: "Privacy", icon: Shield01Icon },
      { id: "reputation", label: "Reputation", icon: StarIcon, external: true },
      { id: "advertise", label: "Advertise", icon: SpeakerIcon, external: true },
      { id: "apps", label: "Apps", icon: GridIcon, external: true },
      { id: "docs", label: "Docs", icon: Book01Icon, external: true },
    ],
  },
];

/** Flat list for lookups by id. */
export const SETTINGS_TABS: readonly SettingsTab[] = SETTINGS_SECTIONS.flatMap((s) => s.tabs);

export const LOGOUT_TAB = { id: "logout" as const, label: "Log out", icon: Logout01Icon };
