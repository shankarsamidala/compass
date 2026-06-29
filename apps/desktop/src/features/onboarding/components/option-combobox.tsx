import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select-style picker over a fixed value/label list, using standard shadcn Select.
 * We map label ↔ value at the boundary so the form keeps the code (e.g. "c2h")
 * while the user sees the label ("Contract-to-hire").
 */
export function OptionCombobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  id,
}: {
  options: readonly (string | { value: string; label: string })[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-10 w-full justify-between bg-input/30 hover:bg-input/30 data-placeholder:text-muted-foreground">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper">
        {norm.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
