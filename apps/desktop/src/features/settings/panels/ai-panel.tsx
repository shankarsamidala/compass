import { useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/ipc";
import type { LlmProvider } from "@compass/ipc-contract";
import { useSettings, useUpdateSettings } from "../api";

type ProviderMeta = {
  id: LlmProvider | "openai" | "groq" | "gemini" | "claude";
  name: string;
  logo: string;
  desc: string;
  /** Only "ollama" is wired; the rest are dummy Connect rows. */
  local?: boolean;
};

const LOGO = (n: string) => `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${n}.svg`;

const PROVIDERS: ProviderMeta[] = [
  { id: "ollama", name: "Ollama", logo: LOGO("ollama"), desc: "Run open models locally on your machine. Private, free, no API key.", local: true },
  { id: "openai", name: "OpenAI", logo: LOGO("openai"), desc: "Use GPT-4 class models via your OpenAI API key." },
  { id: "groq", name: "Groq", logo: LOGO("groq"), desc: "Ultra-fast hosted inference for low-latency completions." },
  { id: "gemini", name: "Gemini", logo: LOGO("gemini-color"), desc: "Google Gemini models for long-context reasoning." },
  { id: "claude", name: "Claude", logo: LOGO("claude-color"), desc: "Anthropic Claude models via your API key." },
];

export function AiPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-md flex items-center gap-2 font-semibold text-foreground">Model providers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where Compass runs AI features. Prompts always come from Reinit — only inference happens here.
        </p>
        <div className="mt-5 divide-y divide-border">
          {PROVIDERS.map((p) =>
            p.local ? <OllamaRow key={p.id} meta={p} /> : <DummyRow key={p.id} meta={p} />,
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderLogo({ src, alt }: { src: string; alt: string }) {
  // Most brand marks are monochrome black; a light tile keeps them visible on dark.
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-elevated">
      <img src={src} alt={`${alt} logo`} className="size-6 object-contain" draggable={false} />
    </div>
  );
}

function DummyRow({ meta }: { meta: ProviderMeta }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <ProviderLogo src={meta.logo} alt={meta.name} />
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium text-foreground">{meta.name}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{meta.desc}</div>
      </div>
      <Button variant="outline" disabled>
        Connect
      </Button>
    </div>
  );
}

/** The real provider — connected, expandable config with live model list. */
function OllamaRow({ meta }: { meta: ProviderMeta }) {
  const { data } = useSettings();
  const update = useUpdateSettings();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setUrl(data.llm.ollamaUrl);
  }, [data]);

  const refreshModels = async (baseUrl?: string) => {
    setLoadingModels(true);
    const res = await api.settings.listModels("ollama", baseUrl ?? url);
    setModels(res.ok ? res.data.models : []);
    setLoadingModels(false);
  };

  // Pull models when the section is first expanded.
  useEffect(() => {
    if (open && models.length === 0) refreshModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!data) return null;
  const model = data.llm.ollamaModel;
  const connected = models.length > 0;

  const saveUrl = async () => {
    await update.mutateAsync({ llm: { ...data.llm, ollamaUrl: url.trim() } });
    refreshModels(url.trim());
  };
  const pickModel = async (m: string) => {
    await update.mutateAsync({ llm: { ...data.llm, ollamaModel: m } });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-4">
        <ProviderLogo src={meta.logo} alt={meta.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-foreground">{meta.name}</span>
            {open && connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <Check className="size-3" /> Connected
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{meta.desc}</div>
        </div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Configure"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Ollama URL</label>
              <div className="flex gap-2">
                <Input className="h-10" placeholder="http://127.0.0.1:11434" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button size="lg" variant="outline" onClick={saveUrl} disabled={update.isPending}>
                  Save
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Model</label>
                <button
                  type="button"
                  onClick={() => refreshModels()}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RefreshCw className={"size-3 " + (loadingModels ? "animate-spin" : "")} />
                  Refresh
                </button>
              </div>
              {connected ? (
                <Select value={model} onValueChange={pickModel}>
                  <SelectTrigger className="!h-10 w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  {loadingModels
                    ? "Looking for installed models…"
                    : "No models found. Is Ollama running? `ollama pull qwen2.5:7b-instruct`, then Refresh."}
                </p>
              )}
            </div>
          </div>
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
              <Check className="size-3.5" /> Model saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}
