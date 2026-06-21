import type { IconSvgElement } from "@hugeicons/react";
import {
  Analytics01Icon,
  BookOpen01Icon,
  ChatSpark01Icon,
  ComputerIcon,
  Delete02Icon,
  Fire02Icon,
  GitCompareIcon,
  HelpCircleIcon,
  Home01Icon,
  LibrariesIcon,
  Monocle01Icon,
  Mortarboard02Icon,
  PuzzleIcon,
  Settings01Icon,
  SmartPhone02Icon,
  Target02Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export type ViewId =
  | "home"
  | "start"
  | "following"
  | "happening"
  | "jobs"
  | "reports"
  | "compare"
  | "insights"
  | "profile"
  | "story-bank"
  | "training"
  | "projects"
  | "history"
  | "library"
  | "settings"
  | "help"
  | "trash"
  | "mobile"
  | "desktop";

export interface NavEntry {
  id: ViewId;
  label: string;
  icon: IconSvgElement;
  /** One-line blurb shown on the (placeholder) page. */
  description: string;
}

export interface NavGroup {
  /** Omit for the top/feed rows that render without a collapsible header. */
  title?: string;
  defaultOpen?: boolean;
  items: NavEntry[];
}

/** Single source of truth — the sidebar groups AND each page are derived from this. */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { id: "home", label: "Home", icon: Home01Icon, description: "Your job search at a glance." },
      { id: "start", label: "New Session", icon: ChatSpark01Icon, description: "Kick off a new tailored application." },
    ],
  },
  {
    items: [
      { id: "following", label: "Following", icon: UserGroupIcon, description: "Companies and people you follow." },
      { id: "happening", label: "Trending", icon: Fire02Icon, description: "Live activity and trending roles." },
    ],
  },
  {
    title: "Opportunities",
    items: [
      { id: "jobs", label: "Job Board", icon: Target02Icon, description: "Browse and scan roles that match you." },
      { id: "reports", label: "Reports", icon: BookOpen01Icon, description: "Evaluations pushed back from your agent." },
      { id: "compare", label: "Offer Compare", icon: GitCompareIcon, description: "Weigh offers side by side." },
      { id: "insights", label: "Job Insights", icon: Analytics01Icon, description: "Trends and analytics on your search." },
    ],
  },
  {
    title: "Toolkit",
    items: [
      { id: "profile", label: "My Profile", icon: UserCircleIcon, description: "Your profile and tailored CVs." },
      { id: "story-bank", label: "Story Bank", icon: BookOpen01Icon, description: "Reusable STAR stories for interviews." },
      { id: "training", label: "Training", icon: Mortarboard02Icon, description: "Courses and certs worth your time." },
      { id: "projects", label: "Projects", icon: PuzzleIcon, description: "Portfolio projects that showcase you." },
    ],
  },
  {
    title: "Workspace",
    items: [
      { id: "history", label: "History", icon: Monocle01Icon, description: "Everything you've worked on." },
      { id: "library", label: "Library", icon: LibrariesIcon, description: "Saved templates and assets." },
      { id: "settings", label: "Settings", icon: Settings01Icon, description: "Preferences, model, and account." },
    ],
  },
  {
    title: "Resources",
    items: [
      { id: "help", label: "Help", icon: HelpCircleIcon, description: "Guides and support." },
      { id: "trash", label: "Trash", icon: Delete02Icon, description: "Recently deleted items." },
    ],
  },
  {
    title: "Reinit Apps",
    defaultOpen: false,
    items: [
      { id: "mobile", label: "Mobile App", icon: SmartPhone02Icon, description: "Reinit on your phone." },
      { id: "desktop", label: "Desktop App", icon: ComputerIcon, description: "The Reinit desktop app." },
    ],
  },
];

/** Flat id → entry lookup for rendering the active page. */
export const NAV_BY_ID: Record<ViewId, NavEntry> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((it) => [it.id, it]),
) as Record<ViewId, NavEntry>;
