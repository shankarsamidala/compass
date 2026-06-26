import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChatSpark01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import "xterm/css/xterm.css";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types/pty";

const AGENT_COLORS: Record<string, string> = {
  claude:  "bg-[#D97757]/10 text-[#D97757] border-[#D97757]/30",
  gemini:  "bg-blue-500/10 text-blue-500 border-blue-500/30",
  copilot: "bg-purple-500/10 text-purple-500 border-purple-500/30",
};

const AGENT_CMD: Record<string, string> = {
  claude:  "claude\r",
  gemini:  "gemini\r",
  copilot: "gh copilot suggest\r",
};

export function AgentTerminal({ onClose }: { onClose: () => void }) {
  const termRef   = useRef<HTMLDivElement>(null);
  const xtermRef  = useRef<Terminal | null>(null);
  const fitRef    = useRef<FitAddon | null>(null);
  const offData   = useRef<(() => void) | null>(null);
  const offExit   = useRef<(() => void) | null>(null);

  const [agents, setAgents]     = useState<AgentStatus[]>([]);
  const [selected, setSelected] = useState<string>("claude");
  const [running, setRunning]   = useState(false);
  const [ready, setReady]       = useState(false);   // xterm mounted & fitted

  // ── Detect agents ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.pty) return;
    window.pty.detect().then((list) => {
      setAgents(list);
      const first = list.find((a) => a.available);
      if (first) setSelected(first.id);
    }).catch(() => {/* ignore */});
  }, []);

  // ── Mount xterm ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = termRef.current;
    if (!el || xtermRef.current) return;

    const term = new Terminal({
      fontFamily:   "monospace",
      fontSize:     13,
      lineHeight:   1.4,
      cursorBlink:  true,
      convertEol:   true,
      scrollback:   5000,
      cols:         80,   // safe fallback — FitAddon will override once dimensions are known
      rows:         24,
      theme: {
        background:          "#0d0d0b",
        foreground:          "#e8e6de",
        cursor:              "#D97757",
        selectionBackground: "rgba(217,119,87,0.25)",
        black:   "#1a1a18", brightBlack:   "#6a6a66",
        red:     "#e11d48", brightRed:     "#fb7185",
        green:   "#16a34a", brightGreen:   "#4ade80",
        yellow:  "#d97706", brightYellow:  "#fbbf24",
        blue:    "#2563eb", brightBlue:    "#60a5fa",
        magenta: "#7c3aed", brightMagenta: "#a78bfa",
        cyan:    "#0891b2", brightCyan:    "#22d3ee",
        white:   "#d4d0c8", brightWhite:   "#f5f3ed",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);

    // Forward keypresses to PTY; echo locally so we know xterm captured the key
    term.onData((data) => {
      term.write(data); // local echo — confirms xterm is receiving keys
      if (window.pty) window.pty.write(data);
    });

    xtermRef.current = term;
    fitRef.current   = fit;

    // Write immediately to verify xterm can render text at all
    term.writeln('\x1b[90m▸ Agent Terminal initialising…\x1b[0m');

    // Wait for the container to have real pixel height before fitting.
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      const w = entries[0]?.contentRect.width  ?? 0;
      if (h > 10 && w > 10) {
        ro.disconnect();
        try {
          fit.fit();
          term.writeln(`\x1b[90m▸ fitted ${term.cols}×${term.rows} — spawning shell…\x1b[0m`);
        } catch (e) {
          term.writeln(`\x1b[31m▸ fit error: ${e}\x1b[0m`);
        }
        term.focus(); // grab keyboard focus so typing works immediately
        setReady(true);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
    };
  }, []);

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = termRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      try {
        fitRef.current?.fit();
        const t = xtermRef.current;
        if (t && window.pty) window.pty.resize(t.cols, t.rows);
      } catch { /* ignore */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Spawn shell ────────────────────────────────────────────────────────────
  const spawnShell = useCallback(() => {
    const term = xtermRef.current;
    if (!term || !window.pty) return;

    // Tear down old session
    offData.current?.();
    offExit.current?.();
    window.pty.kill();

    term.writeln('\x1b[90m▸ shell spawning…\x1b[0m');
    offData.current = window.pty.onData((data) => {
      term.writeln(`\x1b[35m[renderer: got ${data.length}b]\x1b[0m`);
      term.write(data);
    });
    offExit.current = window.pty.onExit((code) => {
      term.writeln(`\r\n\x1b[90m[exited ${code}]\x1b[0m`);
      setRunning(false);
    });

    window.pty.spawn(selected, term.cols, term.rows);
    setRunning(true);
  }, [selected]);

  // Auto-spawn shell once xterm is ready
  useEffect(() => {
    if (ready && window.pty) spawnShell();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Launch agent into shell ────────────────────────────────────────────────
  const launchAgent = useCallback(() => {
    if (!window.pty) return;
    window.pty.write(AGENT_CMD[selected] ?? `${selected}\r`);
  }, [selected]);

  const killShell = useCallback(() => {
    if (window.pty) window.pty.kill();
    setRunning(false);
  }, []);

  const availableAgents = agents.filter((a) => a.available);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col" style={{ background: "#0d0d0b" }}>

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={ChatSpark01Icon} size={14} className="text-brand" />
          <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Agent Terminal</span>
        </div>
        <button type="button" onClick={onClose} style={{ color: "rgba(255,255,255,0.35)" }} className="hover:text-white transition-colors">
          <HugeiconsIcon icon={Cancel01Icon} size={13} />
        </button>
      </div>

      {/* Agent selector + actions */}
      <div className="flex shrink-0 items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {availableAgents.length === 0 ? (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>Detecting agents…</span>
        ) : (
          availableAgents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                selected === a.id ? AGENT_COLORS[a.id] : "border-white/10 text-white/40 hover:text-white/60",
              )}
            >
              {a.label}
            </button>
          ))
        )}

        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={launchAgent}
            disabled={!running}
            className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-30"
            style={{ background: "rgba(217,119,87,0.12)", color: "#D97757", border: "1px solid rgba(217,119,87,0.25)" }}
          >
            Launch
          </button>
          <button
            type="button"
            onClick={running ? killShell : spawnShell}
            className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
            style={running
              ? { background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
              : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            {running ? "Kill" : "Restart"}
          </button>
        </div>
      </div>

      {/* xterm viewport */}
      <div
        ref={termRef}
        className="relative min-h-0 flex-1"
        onClick={() => xtermRef.current?.focus()}
      />

      {/* Status bar */}
      <div className="flex shrink-0 items-center px-3 py-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[10px]" style={{ color: running ? "#4ade80" : "rgba(255,255,255,0.25)" }}>
          {running ? `● ${selected} · shell active` : "○ shell stopped"}
        </span>
      </div>
    </div>
  );
}
