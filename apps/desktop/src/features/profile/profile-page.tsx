import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSkills, useAddSkill, useRemoveSkill, useImportSkillsFromExperiences } from "./skills-api";
import { useHotTakes, useAddProofPoint, useRemoveProofPoint } from "./proof-points-api";
import { useEducation } from "./education-api";
import { useCertifications } from "./certifications-api";
import { useExperiences } from "./experience-api";
import { useProjects } from "./projects-api";
import type { EducationItem, CertificationItem } from "@compass/ipc-contract";
import { useProfilePrefs } from "@/features/settings/profile-api";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Facebook02Icon, NewTwitterIcon, WhatsappIcon, RedditIcon, Linkedin02Icon,
  MapsGlobal02Icon, PhoneArrowDownIcon, GithubIcon, Link01Icon,
  Edit03Icon, SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { api } from "@/lib/ipc";
import { trackAction } from "@/lib/analytics";
import { useCvUploads, useDeleteCvUpload, useInvalidateCvUploads } from "./cv-uploads-api";

type StackTool = { id: string; title: string; faviconUrl: string };

const STACK_SECTIONS = ["Primary", "Hobby", "Learning", "Past"] as const;
type StackSection = typeof STACK_SECTIONS[number];

const STACK_YEARS = Array.from({ length: 37 }, (_, i) => String(2026 - i));
const STACK_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ORG_FALLBACK = "https://media.daily.dev/image/upload/s--yc7EcfBs--/f_auto,q_auto/v1/public/organization_fallback";

// ── Education / Certification display helpers (mirror the settings panels) ──────
function fmtYM(year: number | null, month: number | null): string {
  if (!year) return "";
  const mon = month ? MONTHS_SHORT[month - 1] : null;
  return mon ? `${mon} ${year}` : String(year);
}
function eduDateRange(e: EducationItem): string {
  const start = fmtYM(e.startYear, e.startMonth);
  const end = e.isCurrent ? "Present" : fmtYM(e.endYear, e.endMonth);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
function eduGradeLabel(e: EducationItem): string {
  if (e.cgpa != null) return `CGPA: ${e.cgpa}`;
  if (e.percentage != null) return `${e.percentage}%`;
  if (e.grade) return `Grade: ${e.grade}`;
  return "";
}
function fmtIsoMonth(iso: string | null): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mon = m ? MONTHS_SHORT[parseInt(m, 10) - 1] : null;
  return mon ? `${mon} ${y}` : y;
}
function certCredentialLine(c: CertificationItem): string {
  const issued = fmtIsoMonth(c.issueDate);
  const expiry = fmtIsoMonth(c.expiryDate);
  const parts: string[] = [];
  if (issued) parts.push(`Issued ${issued}`);
  if (expiry) parts.push(`Expires ${expiry}`);
  else if (issued) parts.push("No expiry");
  return parts.join(" · ");
}

const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.091 8.625a.844.844 0 01.115 1.68l-.115.008c-.727 0-1.324.552-1.396 1.26l-.008.143v6.19c0 .728.554 1.327 1.263 1.4l.144.006h6.185c.728 0 1.327-.553 1.399-1.262l.007-.144a.844.844 0 111.687 0 3.094 3.094 0 01-2.905 3.088L12.28 21H6.094a3.094 3.094 0 01-3.088-2.905L3 17.906v-6.19a3.091 3.091 0 013.091-3.091zM17.906 3a3.094 3.094 0 013.088 2.905l.005.189v6.187a3.094 3.094 0 01-2.905 3.088l-.188.006h-6.189A3.094 3.094 0 018.63 12.47l-.005-.189V6.094a3.094 3.094 0 012.905-3.088L11.717 3h6.189zm0 1.688h-6.189c-.728 0-1.327.553-1.399 1.262l-.007.144v6.187c0 .728.554 1.327 1.263 1.4l.143.007h6.189c.728 0 1.327-.554 1.399-1.263l.007-.144V6.094c0-.728-.554-1.327-1.263-1.4l-.143-.006z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M18.361 11.259a.75.75 0 01-.009 1.484l-.102.007h-5.5v5.5a.75.75 0 01-1.491.111l-.009-.11V12.75h-5.5l-.111-.009a.75.75 0 01.009-1.484l.102-.007h5.5v-5.5a.75.75 0 011.491-.111l.009.11v5.501h5.5l.111.009z" fill="currentColor" fillRule="evenodd" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M14.182 4.269a1 1 0 10-1.364 1.462L18.463 11H3a1 1 0 100 2h15.463l-5.645 5.269a1 1 0 001.364 1.462l7.5-7a1 1 0 000-1.462l-7.5-7z" />
  </svg>
);

type Tab = "posts" | "replies" | "upvoted";

export function ProfilePage({ onNavigateToSettings }: { onNavigateToSettings?: (tab: import("@/features/settings/tabs").SettingsTabId) => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const { data: profile } = useProfilePrefs();
  const queryClient = useQueryClient();


  const { data: educationList = [] } = useEducation();
  const { data: certList = [] } = useCertifications();
  const { data: experienceList = [] } = useExperiences();
  const { data: projectList = [] } = useProjects();

  const { data: skills = [] } = useSkills();
  const addSkill = useAddSkill();
  const removeSkill = useRemoveSkill();
  const importSkills = useImportSkillsFromExperiences();

  const { data: hotTakesRaw } = useHotTakes();
  const hotTakes = hotTakesRaw ?? [];

  // ── Resume upload (persisted — must be before completionSections) ───────────
  const { data: cvUploads = [] } = useCvUploads();
  const deleteCvUpload = useDeleteCvUpload();
  const invalidateCvUploads = useInvalidateCvUploads();

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; text: string } | null>(null);
  const [resumePickState, setResumePickState] = useState<"idle" | "reading" | "ready" | "importing" | "done" | "error">("idle");
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);

  const clearPending = () => {
    setPendingFile(null);
    setResumePickState("idle");
    setResumeMsg(null);
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  };

  const handleResumeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setResumePickState("reading");
    setResumeMsg(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const [extractRes, uploadRes] = await Promise.all([
        api.document.extractText(f.name, bytes),
        api.cv.uploadFile(f.name, bytes),
      ]);
      if (!extractRes.ok) { setResumePickState("error"); setResumeMsg(extractRes.error); return; }
      if (uploadRes.ok) {
        invalidateCvUploads();
        trackAction("cv_uploaded", { file_type: f.name.split(".").pop()?.toLowerCase() ?? "unknown", size_bytes: f.size });
      }
      setPendingFile({ name: f.name, text: extractRes.data.text });
      setResumePickState("ready");
    } catch (err) {
      setResumePickState("error");
      setResumeMsg(err instanceof Error ? err.message : "Could not read file");
    }
  };

  const handleResumeImport = async () => {
    if (!pendingFile) return;
    setResumePickState("importing");
    setResumeMsg(null);
    const res = await api.onboarding.importResume(pendingFile.text);
    if (res.ok) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["experiences"] }),
        queryClient.invalidateQueries({ queryKey: ["education"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["certifications"] }),
      ]);
      setResumePickState("done");
      setResumeMsg("Profile updated");
      trackAction("cv_imported", { source: pendingFile.name.split(".").pop()?.toLowerCase() ?? "unknown" });
    } else {
      setResumePickState("error");
      setResumeMsg(res.error);
    }
  };

  // ── Live profile completion ───────────────────────────────────────────────
  const completionSections = [
    { label: "Add a headline & about you", done: Boolean(profile?.headline?.trim() && profile?.bio?.trim()) },
    { label: "Add your contact & location", done: Boolean(profile?.location?.trim()) },
    { label: "Add work experience", done: experienceList.length >= 1 },
    { label: "Add at least 3 education entries", done: educationList.length >= 3 },
    { label: "Add your skills", done: skills.length >= 1 },
    { label: "Add a project", done: projectList.length >= 1 },
    { label: "Add a certification", done: certList.length >= 1 },
    { label: "Add a proof point", done: hotTakes.length >= 1 },
    { label: "Upload your resume", done: cvUploads.length > 0 },
  ];
  const completionDone = completionSections.filter((s) => s.done).length;
  const completionPct = Math.round((completionDone / completionSections.length) * 100);
  const completionNext = completionSections.find((s) => !s.done);
  const COMPLETION_CIRC = 2 * Math.PI * 22; // r=22 ring
  const completionOffset = COMPLETION_CIRC * (1 - completionPct / 100);
  const addProofPoint = useAddProofPoint();
  const removeProofPoint = useRemoveProofPoint();

  const [hotTakeOpen, setHotTakeOpen] = useState(false);
  const [showAllProofPoints, setShowAllProofPoints] = useState(false);
  const [hotTakeText, setHotTakeText] = useState("");
  const [hotTakeUrl, setHotTakeUrl] = useState("");

  const [expOpen, setExpOpen] = useState(false);
  const [expTitle, setExpTitle] = useState("");
  const [expEmploymentType, setExpEmploymentType] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [expDomain, setExpDomain] = useState("");
  const [expCurrent, setExpCurrent] = useState(false);
  const [expStartMonth, setExpStartMonth] = useState("");
  const [expStartYear, setExpStartYear] = useState("");
  const [expEndMonth, setExpEndMonth] = useState("");
  const [expEndYear, setExpEndYear] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expLocationType, setExpLocationType] = useState<"remote" | "hybrid" | "onsite" | "">("");
  const [expDescription, setExpDescription] = useState("");
  const [expSkillInput, setExpSkillInput] = useState("");
  const [expSkills, setExpSkills] = useState<string[]>([]);

  function handleExpSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const raw = expSkillInput.split(",").map(s => s.trim()).filter(Boolean);
      setExpSkills(prev => [...new Set([...prev, ...raw])]);
      setExpSkillInput("");
    }
  }


  const [stackOpen, setStackOpen] = useState(false);
  const [stackQuery, setStackQuery] = useState("");
  const [stackFavicon, setStackFavicon] = useState<string | null>(null);
  const [stackSection, setStackSection] = useState<StackSection>("Primary");
  const [stackYear, setStackYear] = useState("");
  const [stackMonth, setStackMonth] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<StackTool[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!stackQuery.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query AutocompleteTools($query: String!) {
              autocompleteTools(query: $query) { id title faviconUrl }
            }`,
            variables: { query: stackQuery },
          }),
        });
        const json = await res.json();
        setSuggestions(json?.data?.autocompleteTools ?? []);
      } catch (err) {
        console.error("[autocompleteTools]", err);
        setSuggestions([]);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [stackQuery]);

  function closeStack() {
    setStackOpen(false);
    setStackQuery("");
    setStackFavicon(null);
    setStackSection("Primary");
    setStackYear("");
    setStackMonth("");
    setSuggestions([]);
  }

  return (
    <div className="flex h-full overflow-y-auto py-6 px-6 gap-6 items-start justify-center">
      {/* Left column: main profile card */}
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl border border-border overflow-hidden bg-transparent">

          {/* Cover — with avatar overlapping bottom edge */}
          <div className="relative h-44 w-full overflow-visible rounded-t-2xl">
            <img
              className="h-full w-full object-cover rounded-t-2xl"
              alt="Cover"
              src="https://media.daily.dev/image/upload/s--P4t4XyoV--/f_auto/v1722860399/public/Placeholder%2001"
            />
            {/* Avatar — overlaps cover bottom */}
            <img
              className="absolute -bottom-10 left-6 h-[5.5rem] w-[5.5rem] rounded-2xl object-cover ring-2 ring-border"
              alt="Avatar"
              src="https://media.daily.dev/image/upload/s--O0TOmw4y--/f_auto/v1715772965/public/noProfile"
            />
            {/* Edit — top-right of cover */}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit profile"
              onClick={() => onNavigateToSettings?.("profile")}
              className="absolute right-4 top-4 border border-white/20 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              <HugeiconsIcon icon={Edit03Icon} size={18} />
            </Button>
          </div>

          {/* Info row */}
          <div className="flex items-start gap-4 px-6 pt-12 pb-5">
            {/* Left: name + contact info */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <div className="flex flex-col gap-0.5">
                <p className="text-xl font-bold text-white">{profile?.fullName?.trim() || "Your name"}</p>
                {profile?.username?.trim() && (
                  <span className="text-[13px] text-foreground">@{profile.username.trim()}</span>
                )}
              </div>
              <div className="flex items-center gap-1 pt-1">
                {profile?.location?.trim() && (
                  <span title={profile.location.trim()}
                    className="flex size-8 items-center justify-center rounded-lg text-foreground">
                    <HugeiconsIcon icon={MapsGlobal02Icon} size={20} />
                  </span>
                )}
                {profile?.phone?.trim() && (
                  <a href={`tel:${profile.phone.trim()}`} title="Phone"
                    className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-white">
                    <HugeiconsIcon icon={PhoneArrowDownIcon} size={20} />
                  </a>
                )}
                {profile?.linkedin?.trim() && (
                  <a href={profile.linkedin.trim()} target="_blank" rel="noreferrer" title="LinkedIn"
                    className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-white">
                    <HugeiconsIcon icon={Linkedin02Icon} size={20} />
                  </a>
                )}
                {profile?.github?.trim() && (
                  <a href={profile.github.trim()} target="_blank" rel="noreferrer" title="GitHub"
                    className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-white">
                    <HugeiconsIcon icon={GithubIcon} size={20} />
                  </a>
                )}
                {profile?.portfolioUrl?.trim() && (
                  <a href={profile.portfolioUrl.trim()} target="_blank" rel="noreferrer" title="Website"
                    className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-white">
                    <HugeiconsIcon icon={Link01Icon} size={20} />
                  </a>
                )}
              </div>
            </div>

            {/* Right: stats on top, buttons below */}
            <div className="flex shrink-0 flex-col items-end gap-3 pt-1">
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-purple-500">
                      <path fillRule="evenodd" clipRule="evenodd" d="M8 13.605A5.333 5.333 0 108 2.938a5.333 5.333 0 000 10.667zm1.213-8.672a.494.494 0 00-.812-.517L4.944 7.922a.494.494 0 00.35.843H7.82l-1.034 2.844a.494.494 0 00.812.518l3.456-3.507a.494.494 0 00-.348-.842H8.179l1.034-2.845z" fill="currentColor" />
                    </svg>
                    <b className="text-lg font-bold text-white">10</b>
                  </span>
                  <span className="text-xs text-foreground">Reputation</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <b className="text-lg font-bold text-white">0</b>
                  <span className="text-xs text-foreground">Upvotes</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <b className="text-lg font-bold text-white">0</b>
                  <span className="text-xs text-foreground">Followers</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <b className="text-lg font-bold text-white">0</b>
                  <span className="text-xs text-foreground">Following</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-white text-black hover:bg-white/90">Follow me</Button>
                <Button variant="outline" size="sm" className="text-white">Get in touch</Button>
              </div>
            </div>
          </div>

          {/* All sections */}
          <div className="flex flex-col divide-y divide-border p-6">
            {/* Spacer for first divider */}
            <div />

            {/* About — headline + bio */}
            <div className="flex flex-col gap-2 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-white">About</p>
                <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("profile")}>
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              {profile?.headline && (
                <p className="text-sm font-medium text-foreground">{profile.headline}</p>
              )}
              {profile?.bio && (
                <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
              )}
              {!profile?.headline && !profile?.bio && (
                <p className="text-sm text-foreground/60 italic">No headline or bio yet — click the pencil to add one.</p>
              )}
            </div>

            {/* Stack & Tools */}
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-white">Stack &amp; Tools</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={importSkills.isPending}
                    onClick={() => importSkills.mutate()}
                  >
                    {importSkills.isPending ? "Importing…" : "Import"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setStackOpen(true)}>
                    <PlusIcon />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
              {skills.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-6">
                  <p className="text-xs text-foreground">Share your stack &amp; tools with the community</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {STACK_SECTIONS.filter((sec) => skills.some((s) => s.section === sec)).map((sec) => {
                    const sectionSkills = skills.filter((s) => s.section === sec);
                    return (
                      <div key={sec} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{sec}</span>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">
                            {sectionSkills.length}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sectionSkills.map((s) => (
                            <div
                              key={s.id}
                              className="group flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 hover:border-border/80"
                            >
                              {s.faviconUrl ? (
                                <img src={s.faviconUrl} alt="" className="h-4 w-4 shrink-0 rounded object-contain" />
                              ) : (
                                <HugeiconsIcon icon={SourceCodeIcon} size={14} className="shrink-0 text-muted-foreground" />
                              )}
                              <p className="text-xs font-medium text-white">{s.skill}</p>
                              <button
                                type="button"
                                aria-label={`Delete ${s.skill}`}
                                onClick={() => removeSkill.mutate(s.id)}
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Proof Points */}
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-white">Proof Points</p>
                <Button variant="outline" size="sm" onClick={() => setHotTakeOpen(true)}>
                  <PlusIcon />
                  <span>Add</span>
                </Button>
              </div>
              {hotTakes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6">
                  <p className="text-xs text-foreground">Add achievements that back up your profile</p>
                  <Button variant="outline" size="sm" onClick={() => setHotTakeOpen(true)}>
                    <PlusIcon />
                    <span>Add your first proof point</span>
                  </Button>
                </div>
              ) : (
                <>
                  <ul className="flex flex-col">
                    {(showAllProofPoints ? hotTakes : hotTakes.slice(0, 3)).map((pp, i) => (
                      <li
                        key={pp.id}
                        className={`group relative flex items-start gap-3 py-3 ${i !== 0 ? "border-t border-border" : ""}`}
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="text-[13px] font-medium text-white leading-snug">{pp.title}</p>
                          {pp.metrics && (
                            <span className="inline-flex w-fit items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                              {pp.metrics}
                            </span>
                          )}
                          {pp.url && (
                            <a
                              href={pp.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-foreground hover:text-foreground truncate"
                            >
                              {pp.url}
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProofPoint.mutate(pp.id)}
                          className="mt-1 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100 transition-opacity"
                          aria-label="Remove"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {hotTakes.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full justify-center text-foreground gap-2"
                      onClick={() => setShowAllProofPoints(v => !v)}
                    >
                      <span>{showAllProofPoints ? "Show Less" : "Show More"}</span>
                      <ArrowRightIcon />
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Work Experiences */}
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-[15px] font-bold text-white">Work Experiences</h2>
                <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("work-experience")}>
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              {experienceList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6">
                  <p className="text-xs text-foreground">Add your work history</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("work-experience")}>
                    <PlusIcon /><span>Add Experience</span>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {experienceList.map(exp => {
                    const logoSrc = exp.companyImage
                      ? exp.companyImage
                      : exp.domain
                      ? `https://www.google.com/s2/favicons?domain=${exp.domain}&sz=128`
                      : null;
                    const startLabel = fmtIsoMonth(exp.startDate);
                    const endLabel = exp.isCurrent ? "Present" : fmtIsoMonth(exp.endDate);
                    const dateRange = [startLabel, endLabel].filter(Boolean).join(" – ");
                    const visibleSkills = (exp.skills ?? []).slice(0, 3);
                    const extraSkills = (exp.skills ?? []).length - visibleSkills.length;
                    return (
                      <li key={exp.id} className="relative flex flex-row gap-2">
                        <div className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border/60 bg-card flex items-center justify-center">
                          {logoSrc ? (
                            <img className="h-full w-full object-cover" alt={exp.company} src={logoSrc}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <span className="text-xs font-bold text-foreground">{exp.company.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <p className="max-w-full text-[13px] font-bold text-white">{exp.title}</p>
                              {exp.isCurrent && (
                                <span className="self-start font-bold text-[10px] rounded px-1 inline-flex items-center border border-border text-foreground">Current</span>
                              )}
                            </div>
                            <p className="text-xs text-foreground">{exp.company}</p>
                            {(dateRange || exp.location) && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {dateRange && <p className="text-xs text-foreground">{dateRange}</p>}
                                {dateRange && exp.location && <span className="text-foreground">•</span>}
                                {exp.location && <p className="text-xs text-foreground">{exp.location}</p>}
                              </div>
                            )}
                          </div>
                          {exp.description && (
                            <p className="select-text break-words whitespace-pre-wrap text-[13px] text-foreground line-clamp-3">
                              {exp.description}
                            </p>
                          )}
                          {visibleSkills.length > 0 && (
                            <div className="flex flex-row flex-wrap gap-2">
                              {visibleSkills.map(s => (
                                <div key={s} className="self-start text-xs rounded-lg px-2 py-1 border border-border text-foreground">{s}</div>
                              ))}
                              {extraSkills > 0 && (
                                <div className="self-start text-xs rounded-lg px-2 py-1 border border-border text-foreground">+{extraSkills}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Education */}
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-[15px] font-bold text-white">Education</h2>
                <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("education")}>
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              {educationList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6">
                  <p className="text-xs text-foreground">Add your educational background</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("education")}>
                    <PlusIcon /><span>Add Education</span>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {educationList.map(edu => (
                    <li key={edu.id} className="group relative flex gap-3">
                      <div className="mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-card">
                        <img src={ORG_FALLBACK} alt={edu.institution} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white capitalize">{edu.institution}</span>
                          {edu.isCurrent && (
                            <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-[10px] font-medium text-foreground">Current</span>
                          )}
                        </div>
                        {edu.field && <p className="text-xs text-white capitalize">{edu.field}</p>}
                        {(edu.degree || eduGradeLabel(edu)) && (
                          <p className="mt-1 text-xs text-foreground">
                            <span className="capitalize">{edu.degree}</span>
                            {edu.degree && eduGradeLabel(edu) && " · "}
                            {eduGradeLabel(edu)}
                          </p>
                        )}
                        {eduDateRange(edu) && <p className="mt-1 text-xs text-foreground">{eduDateRange(edu)}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Certifications */}
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-[15px] font-bold text-white">Certifications</h2>
                <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("certifications")}>
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              {certList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6">
                  <p className="text-xs text-foreground">Add your licenses and certifications</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("certifications")}>
                    <PlusIcon /><span>Add Certification</span>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {certList.map(cert => (
                    <li key={cert.id} className="group relative flex gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card">
                        {cert.issuerImage ? (
                          <img src={cert.issuerImage} alt={cert.issuer ?? cert.name} className="h-full w-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="text-xs font-bold text-foreground">{cert.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-bold text-white capitalize">{cert.name}</span>
                        {cert.issuer && <p className="text-xs text-white capitalize">{cert.issuer}</p>}
                        {certCredentialLine(cert) && <p className="mt-1 text-xs text-foreground">{certCredentialLine(cert)}</p>}
                        {cert.credentialId && <p className="mt-0.5 text-xs text-foreground">Credential ID: {cert.credentialId}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Projects */}
            <div className="flex flex-col gap-3 py-4">
              <div className="flex flex-row items-center justify-between">
                <h2 className="text-[15px] font-bold text-white">Projects</h2>
                <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("projects")}>
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              {projectList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-6">
                  <p className="text-xs text-foreground">Add your projects and side work</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigateToSettings?.("projects")}>
                    <PlusIcon /><span>Add Project</span>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {projectList.map(proj => {
                    const visibleStack = (proj.techStack ?? []).slice(0, 3);
                    const extraStack = (proj.techStack ?? []).length - visibleStack.length;
                    const dateLabel = fmtIsoMonth(proj.startDate);
                    return (
                      <li key={proj.id} className="relative flex flex-row gap-2">
                        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs text-foreground font-bold">
                          {proj.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <p className="max-w-full text-[13px] font-bold text-white">{proj.title}</p>
                              {proj.isCurrent && (
                                <span className="self-start font-bold text-[10px] rounded px-1 inline-flex items-center border border-border text-foreground">Current</span>
                              )}
                            </div>
                            {dateLabel && <p className="text-xs text-foreground">{dateLabel}</p>}
                          </div>
                          {proj.description && (
                            <p className="select-text break-words whitespace-pre-wrap text-[13px] text-foreground line-clamp-3">
                              {proj.description}
                            </p>
                          )}
                          {visibleStack.length > 0 && (
                            <div className="flex flex-row flex-wrap gap-2">
                              {visibleStack.map(s => (
                                <div key={s} className="self-start text-xs rounded-lg px-2 py-1 border border-border text-foreground">{s}</div>
                              ))}
                              {extraStack > 0 && (
                                <div className="self-start text-xs rounded-lg px-2 py-1 border border-border text-foreground">+{extraStack}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Achievement Showcase */}
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-bold text-white">Achievement Showcase</p>
                <Button variant="outline" size="sm">
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  <span>Edit</span>
                </Button>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  type="button"
                  className="relative flex size-16 shrink-0 items-center justify-center rounded-[14px] overflow-hidden border border-border p-0"
                >
                  <img
                    alt="Curriculum Vitae"
                    className="absolute inset-0 h-full w-full object-cover"
                    src="https://media.daily.dev/image/upload/v1770222886/achievements/Curriculum_Vitae.png"
                  />
                </Button>
              </div>
            </div>

            {/* Activity */}
            <div className="flex flex-col gap-3 overflow-hidden py-4">
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-3">
                  <p className="text-[15px] font-bold text-white">Activity</p>
                  <ul className="relative flex flex-row">
                    {(["Posts", "Replies", "Upvoted"] as const).map((tab) => {
                      const key = tab.toLowerCase() as Tab;
                      return (
                        <Button
                          key={tab}
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setActiveTab(key)}
                          className={activeTab === key ? "bg-muted text-white" : "text-foreground"}
                        >
                          {tab}
                        </Button>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="flex min-h-[27.125rem] flex-col items-center justify-center gap-6 px-4 py-6 text-center">
                <p className="text-sm text-foreground">
                  Hardest part of being a developer? Where do we start – it's everything. Go on, share with us your best rant.
                </p>
                <Button size="lg">
                  New post
                </Button>
              </div>
            </div>


          </div>
        </div>
      </div>
      {/* Right sidebar */}
      <aside className="flex w-80 shrink-0 flex-col gap-3">

        {/* Preview mode */}
        <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-foreground">
              <path d="M12 4.5c3.828 0 6.74 2.287 8.62 6.592l.139.326L21 12l-.241.582C18.885 17.097 15.924 19.5 12 19.5c-3.828 0-6.74-2.287-8.62-6.592l-.139-.326L3 12l.241-.582C5.115 6.903 8.076 4.5 12 4.5zm0 3.25a4.25 4.25 0 110 8.5 4.25 4.25 0 010-8.5z" fill="currentColor" fillRule="evenodd" />
            </svg>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[15px] font-bold text-white">Preview mode</p>
              <p className="text-xs text-foreground">See how your profile looks to others</p>
            </div>
          </div>
          <Switch className="shrink-0 self-center" />
        </div>

        {/* Profile completion */}
        <div className="flex cursor-pointer flex-col rounded-2xl border border-yellow/60 bg-yellow/10 hover:bg-yellow/15">
          <div className="flex w-full items-center gap-6 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-1">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow">
                  <path fillRule="evenodd" clipRule="evenodd" d="M14 8A6 6 0 102 8a6 6 0 0012 0zm-1 0A5 5 0 103 8a5 5 0 0010 0zm-5.667-.667a.667.667 0 011.334 0v3.334a.667.667 0 01-1.334 0V7.333zM8 4.667A.667.667 0 108 6a.667.667 0 000-1.333z" fill="currentColor" />
                </svg>
                <p className="text-sm font-bold text-white">Profile Completion</p>
              </div>
              <div className="flex min-w-0 items-center gap-1">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0 text-yellow">
                  <path d="M14.182 4.269a1 1 0 10-1.364 1.462L18.463 11H3a1 1 0 100 2h15.463l-5.645 5.269a1 1 0 001.364 1.462l7.5-7a1 1 0 000-1.462l-7.5-7z" />
                </svg>
                <p className="text-xs text-foreground">{completionNext ? completionNext.label : "Your profile is complete 🎉"}</p>
              </div>
            </div>
            <div className="relative flex shrink-0 items-center justify-center" style={{ width: 50, height: 50 }}>
              <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="22" className="stroke-border" strokeWidth="5" fill="transparent" />
                <circle cx="25" cy="25" r="22" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={COMPLETION_CIRC} strokeDashoffset={completionOffset}
                  transform="rotate(-90 25 25)" fill="transparent" className="stroke-yellow" />
              </svg>
              <p className="absolute leading-none text-sm font-bold text-yellow">{completionPct}%</p>
            </div>
          </div>
        </div>

        {/* Resume upload & import */}
        <section className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <p className="text-sm font-bold text-white">Resume</p>

          {/* Uploaded list — persists across tab switches */}
          {cvUploads.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {cvUploads.map((u) => (
                <li key={u.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted-foreground">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{u.fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(u.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {u.sizeBytes < 1024 * 1024
                      ? `${Math.round(u.sizeBytes / 1024)} KB`
                      : `${(u.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                  <button type="button" aria-label="Remove"
                    disabled={deleteCvUpload.isPending}
                    onClick={() => deleteCvUpload.mutate(u.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Pending file ready to import */}
          {pendingFile && resumePickState !== "done" && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-muted-foreground">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="min-w-0 flex-1 truncate text-xs text-white">{pendingFile.name}</span>
              <Button size="sm" disabled={resumePickState === "importing"} onClick={handleResumeImport}>
                {resumePickState === "importing" ? "Importing…" : "Import"}
              </Button>
              <button type="button" onClick={clearPending} aria-label="Discard"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Status messages */}
          {resumePickState === "reading" && <p className="text-xs text-muted-foreground">Reading file…</p>}
          {resumePickState === "ready" && <p className="text-xs text-muted-foreground">Click Import to update your profile</p>}
          {resumePickState === "done" && <p className="text-xs text-emerald-500">{resumeMsg}</p>}
          {resumePickState === "error" && <p className="text-xs text-destructive">{resumeMsg}</p>}

          {/* File picker */}
          <Field>
            <FieldLabel htmlFor="resume-upload" className="sr-only">Upload resume</FieldLabel>
            <input
              ref={resumeInputRef}
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeSelect}
              className="h-9 w-full min-w-0 rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
            />
            <FieldDescription>PDF or Word, up to 10 MB</FieldDescription>
          </Field>
        </section>

        {/* Public profile & URL */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <div className="flex w-full items-center gap-1">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm font-bold text-white">Public profile &amp; URL</p>
              <p className="text-[13px] text-foreground max-w-full truncate">https://app.daily.dev/sami2911</p>
            </div>
            <Button variant="ghost" size="icon-xs" aria-label="Copy link">
              <CopyIcon />
            </Button>
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-foreground">Share</p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Share on X">
                <HugeiconsIcon icon={NewTwitterIcon} size={20} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on WhatsApp">
                <HugeiconsIcon icon={WhatsappIcon} size={20} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on Facebook">
                <HugeiconsIcon icon={Facebook02Icon} size={20} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on Reddit">
                <HugeiconsIcon icon={RedditIcon} size={20} />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Share on LinkedIn">
                <HugeiconsIcon icon={Linkedin02Icon} size={20} />
              </Button>
            </div>
          </div>
        </section>

        {/* Profile Activity */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <h2 className="flex items-center gap-1 text-sm font-bold text-white">
            Profile Activity
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
              <path fillRule="evenodd" clipRule="evenodd" d="M14 8A6 6 0 102 8a6 6 0 0012 0zm-1 0A5 5 0 103 8a5 5 0 0010 0zm-5.667-.667a.667.667 0 011.334 0v3.334a.667.667 0 01-1.334 0V7.333zM8 4.667A.667.667 0 108 6a.667.667 0 000-1.333z" fill="currentColor" />
            </svg>
          </h2>
          <div className="my-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl border border-border p-2 text-center">
                <p className="text-[15px] font-bold text-white">0</p>
                <p className="text-xs text-foreground">Views this week</p>
              </div>
              <div className="flex-1 rounded-xl border border-border p-2 text-center">
                <p className="text-[15px] font-bold text-white">0</p>
                <p className="text-xs text-foreground">Views this month</p>
              </div>
            </div>
            <div className="rounded-xl border border-border p-2 text-center">
              <p className="text-[15px] font-bold text-white">0</p>
              <p className="text-xs text-foreground">Total profile views</p>
            </div>
          </div>
        </section>

        {/* Reading Overview */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <h2 className="text-sm font-bold text-white">Reading Overview</h2>
          <a className="text-xs text-blue-500 hover:underline mt-0.5">Learn more</a>
          <div className="my-3 flex gap-2">
            <div className="flex-1 rounded-xl border border-border p-2 text-center">
              <p className="text-[15px] font-bold text-white">0</p>
              <p className="text-xs text-foreground">Longest streak 🏆</p>
            </div>
            <div className="flex-1 rounded-xl border border-border p-2 text-center">
              <p className="text-[15px] font-bold text-white">0</p>
              <p className="text-xs text-foreground">Total reading days</p>
            </div>
          </div>
          <h3 className="my-1 text-[13px] text-foreground">Top tags by reading days</h3>
          <div className="my-3 rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-xs text-foreground">No reading activity yet</p>
          </div>
          <h3 className="mb-3 text-[13px] text-foreground">Posts read in the last months (6)</h3>
          {/* Heatmap */}
          <svg width="100%" viewBox="0 0 278 92">
            <g transform="translate(50, 0)">
              <text x="30" y="10" style={{ fill: "var(--foreground)", fontSize: 13 }}>Feb</text>
              <text x="70" y="10" style={{ fill: "var(--foreground)", fontSize: 13 }}>Mar</text>
              <text x="120" y="10" style={{ fill: "var(--foreground)", fontSize: 13 }}>Apr</text>
              <text x="160" y="10" style={{ fill: "var(--foreground)", fontSize: 13 }}>May</text>
            </g>
            <g transform="translate(0, 24)">
              <text x="0" y="18" style={{ fill: "var(--foreground)", fontSize: 11 }}>Mon</text>
              <text x="0" y="38" style={{ fill: "var(--foreground)", fontSize: 11 }}>Wed</text>
              <text x="0" y="58" style={{ fill: "var(--foreground)", fontSize: 11 }}>Fri</text>
            </g>
            <g transform="translate(50, 24)">
              {Array.from({ length: 22 }, (_, wi) =>
                Array.from({ length: 7 }, (_, di) => {
                  const isActive = wi === 21 && di === 0;
                  return (
                    <g key={`${wi}-${di}`} transform={`translate(${wi * 10}, ${di * 10})`}>
                      <rect width="8" height="8" rx="3"
                        fill={isActive ? "var(--foreground)" : "color-mix(in srgb, var(--border) 80%, transparent)"} />
                      {!isActive && <rect width="6" height="6" x="1" y="1" rx="2" fill="var(--background)" />}
                    </g>
                  );
                })
              )}
            </g>
          </svg>
          <div className="mt-4 flex items-center justify-end text-xs">
            <div className="flex items-center gap-1">
              <span className="mr-1">Less</span>
              <span className="h-2 w-2 rounded border border-border" />
              <span className="h-2 w-2 rounded bg-muted-foreground/30" />
              <span className="h-2 w-2 rounded bg-muted-foreground/60" />
              <span className="h-2 w-2 rounded bg-foreground" />
              <span className="ml-1">More</span>
            </div>
          </div>
        </section>

        {/* Recommended Squads */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <div className="flex min-h-0 flex-1 flex-col">
            <h4 className="text-sm font-bold text-white">Recommended Squads</h4>
            <ul className="mt-4 flex flex-col gap-2">
              {[
                { name: "Node.js developers", handle: "@nodejsdevelopers", members: "40.9K members", img: "https://media.daily.dev/image/upload/s--TZIXRVEW--/f_auto/v1707292248/squads/8ccb5b29-1050-49ed-9fd4-d553890497b5" },
                { name: "NextJS", handle: "@nextjs", members: "33.6K members", img: "https://media.daily.dev/image/upload/s--ai0kromH--/f_auto,q_auto/v1698518496/squads/69088f45-3a20-4730-81c2-32d0d75fb8c6" },
                { name: "AI", handle: "@ai", members: "27.7K members", img: "https://media.daily.dev/image/upload/s--0Nnn3lEU--/f_auto,q_auto/v1/squads/a6581605-a03b-4877-84f2-7d362a8ada28" },
                { name: "WebDev", handle: "@webdev", members: "26.5K members", img: "https://media.daily.dev/image/upload/s--3B1fh4kU--/f_auto,q_auto/v1/squads/94fc7a56-e6d2-403f-acd6-b988b426574f" },
                { name: "Learn Python", handle: "@lpython", members: "26.1K members", img: "https://media.daily.dev/image/upload/s--CBrg8cfW--/f_auto/v1724849342/squads/974527e9-1cc8-470b-a572-91ce0ebc643f" },
              ].map((sq) => (
                <li key={sq.handle} className="flex flex-row items-center gap-2">
                  <figure className="size-8 shrink-0 overflow-hidden rounded-full relative">
                    <img alt={sq.name} className="absolute inset-0 h-full w-full object-cover" src={sq.img} />
                  </figure>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-bold text-white max-w-full truncate">{sq.name}</h5>
                    <p className="text-xs text-foreground truncate">{sq.handle}</p>
                    <p className="text-xs text-foreground">{sq.members}</p>
                  </div>
                  <Button size="sm">
                    Join
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-0">
              <Button variant="outline" size="sm" className="w-full">
                <span>Explore all Squads</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 22" fill="none" className="-rotate-90">
                  <path d="M1.5 14.5L8 21m0 0l6.5-6.5M8 21V1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div>
          </div>
        </section>

        {/* Badges & Awards */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <h2 className="text-sm font-bold text-white">Badges &amp; Awards</h2>
          <a className="text-xs text-blue-500 hover:underline mt-0.5">Learn more</a>
          <div className="my-3 flex gap-3">
            <div className="flex-1 rounded-xl border border-border p-2 text-center">
              <p className="text-[15px] font-bold text-white">x0</p>
              <p className="text-xs text-foreground">Top reader badge</p>
            </div>
            <div className="flex-1 rounded-xl border border-border p-2 text-center">
              <p className="text-[15px] font-bold text-white">x0</p>
              <p className="text-xs text-foreground">Total Awards</p>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="flex flex-col rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1 text-sm font-bold text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M5.5 9.5a6.5 6.5 0 1112.147 3.221l2.082 3.607c.831 1.44-.371 3.2-2.014 2.95l-.36-.054a.283.283 0 00-.306.177l-.132.338c-.605 1.548-2.732 1.709-3.563.27L12 17.662l-1.355 2.347c-.83 1.439-2.958 1.278-3.562-.27l-.133-.338a.283.283 0 00-.306-.177l-.36.055c-1.642.25-2.845-1.512-2.014-2.95l2.083-3.608A6.47 6.47 0 015.5 9.5zm7.46 6.43l1.866 3.23a.283.283 0 00.508-.039l.133-.338a1.982 1.982 0 012.144-1.239l.36.055a.283.283 0 00.287-.421l-1.736-3.008a6.481 6.481 0 01-3.561 1.76zm-5.482-1.76a6.48 6.48 0 003.56 1.76l-1.864 3.23a.283.283 0 01-.509-.039l-.132-.338a1.982 1.982 0 00-2.145-1.239l-.359.055a.283.283 0 01-.288-.421l1.737-3.009z" />
              </svg>
              Achievements
            </h2>
            <span className="text-xs text-blue-500 hover:underline cursor-pointer">7/71</span>
          </div>
          <div className="mt-3 flex gap-2">
            {[
              { alt: "Power user", src: "https://media.daily.dev/image/upload/v1770222920/achievements/Power_user.png", glow: "rgba(255,215,0,0.55)", border: "rgba(255,215,0,0.75)" },
              { alt: "Certifiably certified", src: "https://media.daily.dev/image/upload/v1770222884/achievements/Certifiably_Certified.png", glow: "rgba(190,210,255,0.5)", border: "rgba(190,210,255,0.7)" },
              { alt: "Under new management", src: "https://media.daily.dev/image/upload/v1770222936/achievements/Under_new_management.png", glow: "rgba(235,140,60,0.5)", border: "rgba(235,140,60,0.7)" },
              { alt: "Workaholic", src: "https://media.daily.dev/image/upload/s--EsP6t5nK--/q_auto/v1770765986/achievements/Workaholic.png", glow: null, border: null },
              { alt: "Scholar", src: "https://media.daily.dev/image/upload/s--0O2eh2u4--/q_auto/v1770799625/achievements/Scholar.png", glow: null, border: null },
            ].map((badge) => (
              <div
                key={badge.alt}
                className="relative size-10 rounded-xl overflow-hidden"
                style={badge.border ? {
                  border: `1px solid ${badge.border}`,
                  boxShadow: `0 0 8px 1px ${badge.glow}`,
                } : { border: "1px solid transparent" }}
              >
                <img alt={badge.alt} className="absolute inset-0 h-full w-full object-cover" src={badge.src} loading="lazy" />
              </div>
            ))}
          </div>
        </section>

      </aside>

      {/* Hot Take Sheet */}
      <AnimatePresence>
        {hotTakeOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 bottom-0 top-11 xl:top-14 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setHotTakeOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-11 xl:top-14 z-50 flex h-[calc(100vh-2.75rem)] xl:h-[calc(100vh-3.5rem)] w-96 flex-col bg-background border-l border-border"
            >
              <div className="flex shrink-0 items-start justify-between border-b border-border px-4 py-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-bold text-foreground">Add proof point</h3>
                  <p className="text-sm text-foreground">An achievement that backs up your profile</p>
                </div>
                <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => setHotTakeOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
              </div>
              <div className="flex flex-col gap-5 overflow-y-auto p-4">
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-bold text-white">Achievement</p>
                  <textarea
                    placeholder="e.g. Reduced deployment time by 70% using GitLab CI/CD"
                    value={hotTakeText}
                    onChange={e => setHotTakeText(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-bold text-white">
                    Reference link <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <Input
                    placeholder="https://github.com/you/project"
                    value={hotTakeUrl}
                    onChange={e => setHotTakeUrl(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  disabled={!hotTakeText.trim() || addProofPoint.isPending}
                  className="w-full"
                  onClick={async () => {
                    await addProofPoint.mutateAsync({
                      title: hotTakeText.trim(),
                      url: hotTakeUrl.trim() || undefined,
                    });
                    setHotTakeOpen(false);
                    setHotTakeText("");
                    setHotTakeUrl("");
                  }}
                >
                  {addProofPoint.isPending ? "Adding…" : "Add proof point"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Stack & Tool Sheet */}
      <AnimatePresence>
        {stackOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-x-0 bottom-0 top-11 xl:top-14 z-40 bg-black/50 backdrop-blur-sm"
              onClick={closeStack}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-11 xl:top-14 z-50 flex h-[calc(100vh-2.75rem)] xl:h-[calc(100vh-3.5rem)] w-96 flex-col bg-background border-l border-border"
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between border-b border-border px-4 py-4">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-base font-bold text-foreground">Add stack/tool</h3>
                  <p className="text-sm text-foreground">Share the technologies you work with</p>
                </div>
                <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={closeStack}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 overflow-y-auto p-4">
                {/* Search with autocomplete */}
                <div className="relative flex flex-col gap-1.5">
                  <Input
                    placeholder="Technology, tool, or skill"
                    value={stackQuery}
                    onChange={e => { setStackQuery(e.target.value); setStackFavicon(null); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    className="h-11"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
                      {suggestions.map(tool => (
                        <button
                          key={tool.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted text-left"
                          onMouseDown={() => {
                            setStackQuery(tool.title);
                            setStackFavicon(tool.faviconUrl ?? null);
                            setShowSuggestions(false);
                          }}
                        >
                          {tool.faviconUrl ? (
                            <img src={tool.faviconUrl} alt="" className="h-5 w-5 rounded object-contain" />
                          ) : (
                            <div className="h-5 w-5 rounded bg-muted" />
                          )}
                          <span className="text-foreground">{tool.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Section</p>
                  <div className="flex flex-wrap gap-2">
                    {STACK_SECTIONS.map(s => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={stackSection === s ? "default" : "outline"}
                        onClick={() => setStackSection(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Using since */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">
                    Using since{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <div className="flex gap-3">
                    <Select
                      value={stackYear}
                      onValueChange={v => { setStackYear(v); setStackMonth(""); }}
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {STACK_YEARS.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={stackMonth}
                      onValueChange={setStackMonth}
                      disabled={!stackYear}
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {STACK_MONTHS.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  disabled={!stackQuery.trim() || addSkill.isPending}
                  className="w-full"
                  size="default"
                  onClick={async () => {
                    await addSkill.mutateAsync({
                      skill: stackQuery.trim(),
                      section: stackSection,
                      faviconUrl: stackFavicon ?? suggestions.find(s => s.title === stackQuery.trim())?.faviconUrl ?? null,
                      sinceYear: stackYear ? Number(stackYear) : null,
                      sinceMonth: stackMonth ? STACK_MONTHS.indexOf(stackMonth) + 1 : null,
                    });
                    closeStack();
                  }}
                >
                  {addSkill.isPending ? "Adding…" : "Add to stack"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Work Experience Sheet */}
      <AnimatePresence>
        {expOpen && (
          <>
            <motion.div
              key="exp-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setExpOpen(false)}
            />
            <motion.div
              key="exp-sheet"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-11 xl:top-14 z-50 flex h-[calc(100vh-2.75rem)] xl:h-[calc(100vh-3.5rem)] w-[28rem] flex-col bg-background border-l border-border"
            >
              {/* Header */}
              <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
                <Button variant="ghost" size="icon-sm" className="mr-2 shrink-0" onClick={() => setExpOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Button>
                <p className="flex-1 text-sm font-bold text-white">Add Work Experience</p>
                <Button size="sm" onClick={() => setExpOpen(false)}>Save</Button>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">

                {/* Job Title */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Job Title*</p>
                  <Input
                    placeholder="Ex: Senior Frontend Engineer"
                    value={expTitle}
                    onChange={e => setExpTitle(e.target.value)}
                    className="h-9 rounded-xl"
                  />
                </div>

                {/* Employment Type */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Employment Type</p>
                  <Select value={expEmploymentType} onValueChange={setExpEmploymentType}>
                    <SelectTrigger className="h-9 w-full rounded-xl">
                      <SelectValue placeholder="Please select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Apprenticeship", "Other"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Company or organization*</p>
                  <Input
                    placeholder="Company or organization"
                    value={expCompany}
                    onChange={e => setExpCompany(e.target.value)}
                    className="h-9 rounded-xl"
                  />
                </div>

                {/* Company domain */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Company domain</p>
                  <Input
                    placeholder="Ex: company.com"
                    value={expDomain}
                    onChange={e => setExpDomain(e.target.value)}
                    className="h-9 rounded-xl"
                  />
                </div>

                <div className="border-t border-border" />

                {/* Current position */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">Current position</p>
                    <Switch checked={expCurrent} onCheckedChange={setExpCurrent} />
                  </div>
                  <p className="text-xs text-foreground">Check if this is your current role</p>
                </div>

                {/* Start date */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Start date*</p>
                  <div className="flex gap-3">
                    <Select value={expStartMonth} onValueChange={setExpStartMonth}>
                      <SelectTrigger className="h-9 w-full rounded-xl">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {STACK_MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={expStartYear} onValueChange={setExpStartYear}>
                      <SelectTrigger className="h-9 w-full rounded-xl">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {STACK_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End date */}
                {!expCurrent && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold text-white">End date*</p>
                    <div className="flex gap-3">
                      <Select value={expEndMonth} onValueChange={setExpEndMonth}>
                        <SelectTrigger className="h-9 w-full rounded-xl">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {STACK_MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={expEndYear} onValueChange={setExpEndYear}>
                        <SelectTrigger className="h-9 w-full rounded-xl">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {STACK_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="border-t border-border" />

                {/* Location */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Location</p>
                  <Input
                    placeholder="Ex: Bengaluru, India"
                    value={expLocation}
                    onChange={e => setExpLocation(e.target.value)}
                    className="h-9 rounded-xl"
                  />
                  <div className="flex gap-1">
                    {(["remote", "hybrid", "onsite"] as const).map(type => (
                      <label
                        key={type}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          expLocationType === type
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-muted-foreground hover:border-foreground/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="locationType"
                          value={type}
                          checked={expLocationType === type}
                          onChange={() => setExpLocationType(type)}
                          className="sr-only"
                        />
                        {type.charAt(0).toUpperCase() + type.slice(1).replace("onsite", "On-site")}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Description</p>
                  <div className="flex flex-col rounded-xl border border-input bg-input/30 px-4 pt-3 pb-2">
                    <textarea
                      placeholder="Key technologies, projects, and achievements"
                      value={expDescription}
                      onChange={e => setExpDescription(e.target.value)}
                      maxLength={5000}
                      rows={4}
                      className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <span className="ml-auto text-xs text-foreground">{expDescription.length}/5000</span>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-white">Skills</p>
                  <div className="flex items-center gap-2 rounded-xl border border-input bg-input/30 px-3 h-9">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-muted-foreground">
                      <path d="M10 3a7 7 0 016.068 10.492 2.813 2.813 0 012.076.67l.157.147 1.872 1.871a2.823 2.823 0 01-3.852 4.125l-.14-.132-1.872-1.872a2.817 2.817 0 01-.818-2.234A7 7 0 1110 3zm0 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" fillRule="evenodd" />
                    </svg>
                    <input
                      placeholder="Search skills"
                      value={expSkillInput}
                      onChange={e => setExpSkillInput(e.target.value)}
                      onKeyDown={handleExpSkillKeyDown}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-foreground">Add commas (,) to add multiple skills. Press Enter to submit them.</p>
                  {expSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {expSkills.map(s => (
                        <div key={s} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground">
                          {s}
                          <button
                            type="button"
                            onClick={() => setExpSkills(prev => prev.filter(x => x !== s))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
