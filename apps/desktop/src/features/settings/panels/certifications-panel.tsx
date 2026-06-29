import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Edit01Icon, Delete01Icon, CertificateIcon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldTitle } from "@/components/ui/field";
import type { CertificationItem, CertificationInput } from "@compass/ipc-contract";
import {
  useCertifications,
  useAddCertification,
  useUpdateCertification,
  useRemoveCertification,
} from "@/features/profile/certifications-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"] as const;
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => String(currentYear + 5 - i));

function fmtIso(iso: string | null): string {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  const mon = m ? MONTHS_SHORT[parseInt(m, 10) - 1] : null;
  return mon ? `${mon} ${y}` : y;
}

function credentialLine(item: CertificationItem): string {
  const issued = fmtIso(item.issueDate);
  const expiry = fmtIso(item.expiryDate);
  const parts: string[] = [];
  if (issued) parts.push(`Issued ${issued}`);
  if (expiry) parts.push(`Expires ${expiry}`);
  else if (issued) parts.push("No expiry");
  return parts.join(" · ");
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  issuer: string;
  issuerImage: string;
  noExpiry: boolean;
  issueMonth: string;
  issueYear: string;
  expiryMonth: string;
  expiryYear: string;
  credentialId: string;
  credentialUrl: string;
  description: string;
}

function blankForm(): FormState {
  return {
    name: "", issuer: "", issuerImage: "", noExpiry: false, issueMonth: "", issueYear: "",
    expiryMonth: "", expiryYear: "", credentialId: "", credentialUrl: "", description: "",
  };
}

function itemToForm(item: CertificationItem): FormState {
  const parts = (iso: string | null) => (iso ? iso.split("-") : ["", ""]);
  const [iy, im] = parts(item.issueDate);
  const [ey, em] = parts(item.expiryDate);
  return {
    name: item.name,
    issuer: item.issuer ?? "",
    issuerImage: item.issuerImage ?? "",
    noExpiry: !item.expiryDate,
    issueMonth: im ? String(parseInt(im, 10)) : "",
    issueYear: iy ?? "",
    expiryMonth: em ? String(parseInt(em, 10)) : "",
    expiryYear: ey ?? "",
    credentialId: item.credentialId ?? "",
    credentialUrl: item.url ?? "",
    description: item.description ?? "",
  };
}

// ── Issuer autocomplete (daily.dev companies) ──────────────────────────────────

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

function IssuerField({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [results, setResults] = useState<{ id: string; name: string; image: string }[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLinked = !!form.issuerImage;

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: COMPANY_GQL, variables: { query: q, limit: 10, type: "company" } }),
        });
        const json = await res.json();
        const items: { id: string; name: string; image: string }[] = json?.data?.autocompleteCompany ?? [];
        setResults(items);
        setOpen(items.length > 0);
      } catch { /* silent */ }
    }, 300);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div className="relative flex items-center">
          {isLinked && (
            <img src={form.issuerImage} alt={form.issuer} className="absolute left-3 h-5 w-5 rounded-full object-contain" />
          )}
          <Input
            className={isLinked ? "pl-10" : ""}
            placeholder="Issuing organization*"
            value={form.issuer}
            autoComplete="off"
            onChange={(e) => {
              setForm((p) => ({ ...p, issuer: e.target.value, issuerImage: "" }));
              search(e.target.value);
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => {
                  setForm((p) => ({ ...p, issuer: r.name, issuerImage: r.image }));
                  setOpen(false);
                }}
              >
                <img src={r.image} alt={r.name} className="h-5 w-5 shrink-0 rounded object-contain" />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isLinked && (
        <Button type="button" variant="outline" size="sm" className="self-start"
          onClick={() => setForm((p) => ({ ...p, issuerImage: "" }))}>
          Unlink organization
        </Button>
      )}
    </div>
  );
}

// ── List item ─────────────────────────────────────────────────────────────────

function CertListItem({
  item,
  onEdit,
  onRemove,
}: {
  item: CertificationItem;
  onEdit: (item: CertificationItem) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const description = item.description ?? "";
  const trimmed = description.length > 200 ? description.slice(0, 200) + "…" : description;

  return (
    <li className="group relative flex gap-3 py-5">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-card">
        {item.issuerImage ? (
          <img src={item.issuerImage} alt={item.issuer ?? item.name} className="h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <HugeiconsIcon icon={CertificateIcon} size={20} className="text-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[13px] font-semibold text-foreground capitalize">{item.name}</span>
            {item.issuer && <p className="text-sm text-muted-foreground capitalize">{item.issuer}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" aria-label="Edit" onClick={() => onEdit(item)}
              className="flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground">
              <HugeiconsIcon icon={Edit01Icon} size={16} />
            </button>
            <button type="button" aria-label="Delete" onClick={() => onRemove(item.id)}
              className="flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-destructive/10 hover:text-destructive">
              <HugeiconsIcon icon={Delete01Icon} size={16} />
            </button>
          </div>
        </div>

        {credentialLine(item) && (
          <p className="mt-1.5 text-sm text-muted-foreground">{credentialLine(item)}</p>
        )}
        {item.credentialId && (
          <p className="mt-0.5 text-sm text-muted-foreground">Credential ID: {item.credentialId}</p>
        )}

        {description && (
          <div className="mt-2">
            <p className="text-sm leading-relaxed text-muted-foreground">{expanded ? description : trimmed}</p>
            {description.length > 200 && (
              <button type="button" className="mt-0.5 text-[13px] font-medium text-blue hover:underline"
                onClick={() => setExpanded((p) => !p)}>
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-blue hover:underline">
            <HugeiconsIcon icon={LinkSquare02Icon} size={14} />
            Show credential
          </a>
        )}
      </div>
    </li>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

function CertFormView({
  editId,
  form,
  setForm,
  saving,
  onSave,
  onClose,
  onDelete,
}: {
  editId: string | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border h-fit">
      <h2 className="sticky top-0 z-10 flex h-14 w-full shrink-0 items-center border-b border-border bg-background px-4 font-semibold text-base text-foreground">
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="mr-2 flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-accent hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>
        {editId ? "Edit Certification" : "Add Certification"}
        <span className="ml-auto">
          <Button size="sm" onClick={onSave} disabled={saving || !form.name || !form.issuer}
            className="bg-white text-black hover:bg-white/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </span>
      </h2>

      <section className="flex flex-col gap-6 overflow-x-hidden p-6 w-full">

        {/* Name */}
        <Field>
          <FieldTitle>Certification Name<span className="text-destructive">*</span></FieldTitle>
          <Input placeholder="Ex: AWS Certified Solutions Architect" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>

        {/* Issuer */}
        <Field>
          <FieldTitle>Issuing organization<span className="text-destructive">*</span></FieldTitle>
          <IssuerField form={form} setForm={setForm} />
        </Field>

        <div className="border-t border-border/50" />

        {/* No expiry */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">This credential does not expire</p>
            <Switch checked={form.noExpiry} onCheckedChange={(v) => set("noExpiry", v)} />
          </div>
          <p className="text-sm text-muted-foreground">Turn on if there's no expiration date</p>
        </div>

        {/* Issue date */}
        <Field>
          <FieldTitle>Issue date</FieldTitle>
          <div className="flex gap-6">
            <Select value={form.issueMonth || ""} onValueChange={(v) => set("issueMonth", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.issueYear || ""} onValueChange={(v) => set("issueYear", v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Field>

        {!form.noExpiry && (
          <Field>
            <FieldTitle>Expiry date</FieldTitle>
            <div className="flex gap-6">
              <Select value={form.expiryMonth || ""} onValueChange={(v) => set("expiryMonth", v)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.expiryYear || ""} onValueChange={(v) => set("expiryYear", v)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Field>
        )}

        <div className="border-t border-border/50" />

        {/* Credential ID */}
        <Field>
          <FieldTitle>Credential ID</FieldTitle>
          <Input placeholder="Ex: Certificate number" value={form.credentialId} onChange={(e) => set("credentialId", e.target.value)} />
        </Field>

        {/* Credential URL */}
        <Field>
          <FieldTitle>Credential URL</FieldTitle>
          <Input placeholder="Link to verification page" value={form.credentialUrl} onChange={(e) => set("credentialUrl", e.target.value)} />
        </Field>

        {/* Description */}
        <Field>
          <FieldTitle>Description</FieldTitle>
          <div className="relative">
            <Textarea
              rows={5}
              maxLength={5000}
              placeholder="Key topics covered, skills validated"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="resize-none pb-6"
            />
            <span className="absolute bottom-2.5 right-3.5 text-[11px] text-foreground">{form.description.length}/5000</span>
          </div>
        </Field>

        {/* Delete */}
        {editId && onDelete && (
          <div className="mt-6">
            <Button type="button" variant="outline" size="sm" onClick={onDelete} className="text-foreground hover:border-destructive hover:text-destructive">
              Delete certification
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function CertificationsPanel() {
  const { data: items = [], isLoading } = useCertifications();
  const addCert = useAddCertification();
  const updateCert = useUpdateCertification();
  const removeCert = useRemoveCertification();

  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  const openAdd = () => { setEditId(null); setForm(blankForm()); setFormOpen(true); };
  const openEdit = (item: CertificationItem) => { setEditId(item.id); setForm(itemToForm(item)); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditId(null); };

  const buildInput = (): CertificationInput => {
    const iso = (year: string, month: string) =>
      year ? `${year}-${(month || "1").padStart(2, "0")}-01` : undefined;
    return {
      name: form.name.trim(),
      issuer: form.issuer.trim() || undefined,
      issuerImage: form.issuerImage.trim() || undefined,
      issueDate: iso(form.issueYear, form.issueMonth),
      expiryDate: form.noExpiry ? undefined : iso(form.expiryYear, form.expiryMonth),
      credentialId: form.credentialId.trim() || undefined,
      url: form.credentialUrl.trim() || undefined,
      description: form.description.trim() || undefined,
    };
  };

  const handleSave = async () => {
    const input = buildInput();
    if (editId) await updateCert.mutateAsync({ id: editId, patch: input });
    else await addCert.mutateAsync(input);
    closeForm();
  };

  const handleDelete = async () => {
    if (!editId) return;
    await removeCert.mutateAsync(editId);
    closeForm();
  };

  const saving = addCert.isPending || updateCert.isPending;

  if (formOpen) {
    return (
      <CertFormView
        editId={editId}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={closeForm}
        onDelete={editId ? handleDelete : undefined}
      />
    );
  }

  return (
    <main className="flex min-w-0 flex-1 self-start flex-col overflow-hidden rounded-xl border border-border">
      <div className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
        <h2 className="flex-1 text-base font-semibold text-foreground">Certifications</h2>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <HugeiconsIcon icon={Add01Icon} size={16} className="mr-1.5" />
          Add
        </Button>
      </div>

      <section className="flex-1 overflow-y-auto px-6">
        {isLoading ? (
          <div className="flex flex-col gap-4 py-6">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-foreground">No certifications added yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <CertListItem key={item.id} item={item} onEdit={openEdit}
                onRemove={async (id) => { await removeCert.mutateAsync(id); }} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
