import { useEffect, useState } from "react";
import { api } from "@/lib/ipc";
import type { SuggestKind } from "@compass/ipc-contract";

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

/** Debounced autocomplete against the main-process suggest provider. */
export function useSuggest(kind: SuggestKind, q: string) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_CHARS) {
      setItems([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await api.suggest.query(kind, term);
      if (!active) return;
      setItems(res.ok ? res.data : []);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [kind, q]);

  return { items, loading };
}
