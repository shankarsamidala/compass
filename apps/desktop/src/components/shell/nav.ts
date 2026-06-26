import type { IconSvgElement } from "@hugeicons/react";
import {
  Analytics01Icon,
  Book04Icon,
  Castle02Icon,
  ComputerIcon,
  FileValidationIcon,
  Fire02Icon,
  GitCompareArrowsIcon,
  HelpCircleIcon,
  Home01Icon,
  LibrariesIcon,
  Monocle01Icon,
  PuzzleIcon,
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
  | "help"
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
    ],
  },
  {
    items: [
      { id: "following", label: "Following", icon: UserGroupIcon, description: "Companies and people you follow." },
      { id: "happening", label: "Trending", icon: Fire02Icon, description: "Live activity and trending roles." },
      { id: "history", label: "History", icon: Monocle01Icon, description: "Everything you've worked on." },
    ],
  },
  {
    title: "Opportunities",
    items: [
      { id: "jobs", label: "My Jobs", icon: Target02Icon, description: "Browse and scan roles that match you." },
      { id: "reports", label: "Reports", icon: FileValidationIcon, description: "Evaluations pushed back from your agent." },
      { id: "compare", label: "Compare", icon: GitCompareArrowsIcon, description: "Weigh offers side by side." },
      { id: "insights", label: "Insights", icon: Analytics01Icon, description: "Trends and analytics on your search." },
    ],
  },
  {
    title: "Toolkit",
    items: [
      { id: "profile", label: "Profile", icon: UserCircleIcon, description: "Your profile and tailored CVs." },
      { id: "story-bank", label: "Stories", icon: Book04Icon, description: "Reusable STAR stories for interviews." },
      { id: "training", label: "Training", icon: Castle02Icon, description: "Courses and certs worth your time." },
      { id: "projects", label: "Projects", icon: PuzzleIcon, description: "Portfolio projects that showcase you." },
    ],
  },
  {
    title: "Resources",
    items: [
      { id: "library", label: "Library", icon: LibrariesIcon, description: "Saved templates and assets." },
      { id: "help", label: "Help", icon: HelpCircleIcon, description: "Guides and support." },
    ],
  },
  {
    title: "Reinit Apps",
    defaultOpen: false,
    items: [
      { id: "mobile", label: "Mobile", icon: SmartPhone02Icon, description: "Reinit on your phone." },
      { id: "desktop", label: "Desktop", icon: ComputerIcon, description: "The Reinit desktop app." },
    ],
  },
];

/** Flat id → entry lookup for rendering the active page. */
export const NAV_BY_ID: Record<ViewId, NavEntry> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((it) => [it.id, it]),
) as Record<ViewId, NavEntry>;
