import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldTitle } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { SuggestCombobox } from "@/features/onboarding/components/suggest-combobox";
import { useProfilePrefs, useUpdateProfile } from "../profile-api";

const NO_PROFILE = "https://media.daily.dev/image/upload/s--O0TOmw4y--/f_auto/v1715772965/public/noProfile";

const EXPERIENCE_LEVELS = [
  { value: "LESS_THAN_1_YEAR", label: "Aspiring engineer (<1 year)", years: 0 },
  { value: "MORE_THAN_1_YEAR", label: "Junior engineer (1–2 years)", years: 1 },
  { value: "MORE_THAN_2_YEARS", label: "Mid-level engineer (2–4 years)", years: 2 },
  { value: "MORE_THAN_4_YEARS", label: "Senior engineer (4–6 years)", years: 4 },
  { value: "MORE_THAN_6_YEARS", label: "Lead engineer (6–10 years)", years: 6 },
  { value: "MORE_THAN_10_YEARS", label: "Principal engineer (10+ years)", years: 10 },
] as const;

/** Years → the experience-level bucket it falls into. */
function yearsToLevel(years: number | null): string {
  const y = years ?? 0;
  if (y >= 10) return "MORE_THAN_10_YEARS";
  if (y >= 6) return "MORE_THAN_6_YEARS";
  if (y >= 4) return "MORE_THAN_4_YEARS";
  if (y >= 2) return "MORE_THAN_2_YEARS";
  if (y >= 1) return "MORE_THAN_1_YEAR";
  return "LESS_THAN_1_YEAR";
}

/** Experience-level bucket → a representative years value to persist. */
function levelToYears(level: string): number {
  return EXPERIENCE_LEVELS.find((e) => e.value === level)?.years ?? 0;
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
    <path d="M12.833 4a4.83 4.83 0 013.781 1.823l.146.192.069.01a4.834 4.834 0 014.151 4.346l.015.223.005.218v4.046a4.833 4.833 0 01-4.171 4.788c-1.721.238-3.33.357-4.829.357-1.498 0-3.108-.12-4.829-.357a4.833 4.833 0 01-4.166-4.57L3 14.858v-4.046a4.833 4.833 0 013.956-4.753l.283-.044a4.835 4.835 0 013.454-1.992l.248-.018.226-.005h1.666zm0 1.5h-1.666a3.331 3.331 0 00-3.015 1.91c-.255.03-.514.064-.775.1a3.333 3.333 0 00-2.872 3.118l-.005.184v4.046a3.333 3.333 0 002.877 3.302 33.88 33.88 0 004.623.343 33.88 33.88 0 004.623-.343 3.333 3.333 0 002.872-3.118l.005-.184v-4.046a3.333 3.333 0 00-2.877-3.302c-.261-.036-.52-.07-.774-.099a3.335 3.335 0 00-2.807-1.905l-.209-.006zM12 9.5a3.333 3.333 0 110 6.667A3.333 3.333 0 0112 9.5zm0 1.5a1.833 1.833 0 100 3.667A1.833 1.833 0 0012 11zm5-1.333a.833.833 0 110 1.666.833.833 0 010-1.666z" fillRule="evenodd" />
  </svg>
);

interface FormState {
  fullName: string;
  username: string;
  headline: string;
  experienceLevel: string;
  hideExperience: boolean;
  location: string;
  bio: string;
  linkedin: string;
  github: string;
  portfolioUrl: string;
}

const BLANK: FormState = {
  fullName: "", username: "", headline: "", experienceLevel: "LESS_THAN_1_YEAR",
  hideExperience: false, location: "", bio: "", linkedin: "", github: "", portfolioUrl: "",
};

export function ProfilePanel() {
  const { data: prefs, isLoading } = useProfilePrefs();
  const update = useUpdateProfile();
  const [form, setForm] = useState<FormState>(BLANK);
  const [linkDraft, setLinkDraft] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefs) return;
    setForm((p) => ({
      ...p,
      fullName: prefs.fullName ?? "",
      username: prefs.username ?? "",
      headline: prefs.headline ?? "",
      experienceLevel: yearsToLevel(prefs.totalExperienceYears),
      location: prefs.location ?? "",
      bio: prefs.bio ?? "",
      linkedin: prefs.linkedin ?? "",
      github: prefs.github ?? "",
      portfolioUrl: prefs.portfolioUrl ?? "",
    }));
  }, [prefs]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const writeWithAI = async () => {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await window.compass.llm.generateAbout(form.headline || undefined, form.bio || undefined);
      if (res.ok) setForm((p) => ({ ...p, headline: res.data.headline, bio: res.data.bio }));
      else setAiError(res.error);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  const addLink = () => {
    const url = linkDraft.trim();
    if (!url) return;
    const low = url.toLowerCase();
    if (low.includes("linkedin.com")) set("linkedin", url);
    else if (low.includes("github.com")) set("github", url);
    else set("portfolioUrl", url);
    setLinkDraft("");
  };

  const links = [
    { key: "linkedin" as const, label: "LinkedIn", url: form.linkedin },
    { key: "github" as const, label: "GitHub", url: form.github },
    { key: "portfolioUrl" as const, label: "Website", url: form.portfolioUrl },
  ].filter((l) => l.url.trim());

  const handleSave = () => {
    update.mutate({
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      headline: form.headline.trim(),
      totalExperienceYears: levelToYears(form.experienceLevel),
      location: form.location.trim(),
      bio: form.bio.trim(),
      linkedin: form.linkedin.trim(),
      github: form.github.trim(),
      portfolioUrl: form.portfolioUrl.trim(),
    });
  };

  if (isLoading) {
    return (
      <main className="flex min-w-0 flex-1 self-start flex-col gap-4 rounded-2xl border border-border p-6">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-card" />)}
      </main>
    );
  }

  const floatBtn = "flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/15 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60";

  return (
    <main className="relative flex min-w-0 flex-1 self-start flex-col rounded-2xl border border-border h-fit">
      {/* Sticky header */}
      <h1 className="sticky top-0 z-10 flex h-14 w-full flex-row items-center border-b border-border bg-background px-6 text-base font-semibold text-foreground">
        Profile
        <span className="ml-auto">
          <Button size="sm" onClick={handleSave} disabled={update.isPending}
            className="bg-brand text-brand-foreground hover:bg-brand-hover">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </span>
      </h1>

      <section className="flex w-full flex-col gap-6 overflow-x-hidden p-6">

        {/* Cover + avatar */}
        <div className="relative mb-10">
          <div className="group relative h-24 w-full">
            <div className="h-full w-full overflow-hidden rounded-2xl bg-card" />
            <div className="absolute right-6 top-1/2 flex -translate-y-1/2 gap-2">
              <button type="button" className={floatBtn} onClick={() => coverRef.current?.click()}><CameraIcon /></button>
            </div>
            <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" />
          </div>
          <div className="absolute bottom-0 left-6 translate-y-1/2">
            <div className="group relative size-[120px]">
              <div className="size-full overflow-hidden rounded-[26px]">
                <img src={NO_PROFILE} alt="Profile avatar" className="size-full object-cover" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-[26px]">
                <button type="button" className={floatBtn} onClick={() => avatarRef.current?.click()}><CameraIcon /></button>
              </div>
              <input ref={avatarRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" />
            </div>
          </div>
        </div>

        {/* Name */}
        <Field>
          <FieldTitle>Name</FieldTitle>
          <Input placeholder="Your full name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>

        {/* Username */}
        <Field>
          <FieldTitle>Username</FieldTitle>
          <Input placeholder="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
        </Field>

        {/* Headline */}
        <Field>
          <FieldTitle>Headline</FieldTitle>
          <Input maxLength={100} placeholder="Ex: Platform Engineer · Scaling distributed systems" value={form.headline} onChange={(e) => set("headline", e.target.value)} />
        </Field>

        {/* Experience level */}
        <Field>
          <FieldTitle>Experience level</FieldTitle>
          <Select value={form.experienceLevel} onValueChange={(v) => set("experienceLevel", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        {/* Hide work history */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Hide work history</p>
            <Switch checked={form.hideExperience} onCheckedChange={(v) => set("hideExperience", v)} />
          </div>
          <p className="text-sm text-muted-foreground">Your work experience and education won't be visible on your public profile.</p>
        </div>

        <div className="border-t border-border/50" />

        {/* Location */}
        <Field>
          <FieldTitle>Location</FieldTitle>
          <SuggestCombobox kind="locations" placeholder="Search city…" value={form.location} onChange={(v) => set("location", v)} />
        </Field>

        <div className="border-t border-border/50" />

        {/* About + Write with AI */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldTitle>About</FieldTitle>
            <button
              type="button"
              onClick={writeWithAI}
              disabled={aiLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {aiLoading ? (
                <Spinner className="size-3.5" />
              ) : (
                <HugeiconsIcon icon={SparklesIcon} size={14} />
              )}
              {aiLoading ? "Writing…" : "Write with AI"}
            </button>
          </div>
          <Textarea
            rows={4}
            maxLength={2000}
            placeholder="Share your background, what you build, and what makes you distinct."
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            className="resize-none"
          />
          {aiError && <p className="text-xs text-destructive">{aiError}</p>}
        </Field>

        <div className="border-t border-border/50" />

        {/* Links */}
        <Field>
          <FieldTitle>Links</FieldTitle>
          <p className="-mt-1 text-sm text-muted-foreground">Paste any URL and we'll auto-detect the platform.</p>
          <div className="flex items-center gap-2">
            <Input
              type="url"
              placeholder="Paste a URL (e.g., github.com/username)"
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
            />
            <Button type="button" size="lg" variant="secondary" disabled={!linkDraft.trim()} onClick={addLink} className="shrink-0">Add</Button>
          </div>
          {links.length > 0 && (
            <div className="mt-1 flex flex-col gap-2">
              {links.map((l) => (
                <div key={l.key} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                  <span className="w-16 shrink-0 text-xs font-semibold text-foreground">{l.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{l.url}</span>
                  <button type="button" aria-label={`Remove ${l.label}`} onClick={() => set(l.key, "")}
                    className="shrink-0 text-muted-foreground hover:text-destructive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>
      </section>
    </main>
  );
}
