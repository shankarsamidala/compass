import * as React from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  INSTAHYRE_JOB_FUNCTION_GROUPS,
  INSTAHYRE_JOB_FUNCTION_LABELS,
} from "../instahyre-job-functions";

// Labels are unique across the Instahyre catalogue, so we use them as the value
// space inside the combobox and map back to job_function ids at the boundary.
const LABEL_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(INSTAHYRE_JOB_FUNCTION_LABELS).map(([id, label]) => [label, Number(id)]),
);
const ALL_LABELS = INSTAHYRE_JOB_FUNCTION_GROUPS.flatMap((g) => g.functions.map((f) => f.name));

/**
 * Multi-select for Instahyre job functions. Fixed catalogue (non-creatable), chips +
 * in-popup search with Base UI's built-in filtering. Value is the selected job_function
 * ids; the combobox works in label space and converts on the way in/out.
 */
export function JobFunctionMultiSelect({
  value,
  onChange,
  id,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  id?: string;
}) {
  const anchor = useComboboxAnchor();

  // Local mirror so selections show instantly, independent of the save round-trip.
  const [ids, setIds] = React.useState<number[]>(value);
  React.useEffect(() => { setIds(value); }, [value]);

  const selectedLabels = ids
    .map((v) => INSTAHYRE_JOB_FUNCTION_LABELS[v])
    .filter((l): l is string => Boolean(l));
  const selected = new Set(selectedLabels);
  const options = ALL_LABELS.filter((l) => !selected.has(l));

  return (
    <Combobox
      multiple
      autoHighlight
      items={options}
      value={selectedLabels}
      onValueChange={(v) => {
        const next = ((v as string[]) ?? [])
          .map((label) => LABEL_TO_ID[label])
          .filter((n): n is number => Number.isFinite(n));
        setIds(next);
        onChange(next);
      }}
    >
      <ComboboxChips ref={anchor} id={id} className="min-h-10 w-full">
        <ComboboxValue>
          {(values: string[]) =>
            values.length ? (
              values.map((v) => (
                <ComboboxChip key={v} className="h-5 gap-0.5 px-1.5 text-[11px]">
                  {v}
                </ComboboxChip>
              ))
            ) : (
              <span className="px-1 text-sm text-muted-foreground">Select job functions…</span>
            )
          }
        </ComboboxValue>
        <ComboboxTrigger className="ml-auto" />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxInput placeholder="Search job functions…" showTrigger={false} className="h-9" />
        <ComboboxEmpty className="px-3 py-2 text-xs text-muted-foreground/60">
          No matching job functions
        </ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
