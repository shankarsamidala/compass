import * as React from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Multi-value picker with chips + live autocomplete using standard shadcn Popover + Command.
 * Creatable: typed terms are offered as options so users can add custom values.
 */
export function MultiCombobox({
  value,
  onChange,
  fetcher,
  placeholder = "Type to search…",
  id,
  ...props
}: {
  value: string[];
  onChange: (v: string[]) => void;
  fetcher: (query: string) => Promise<string[]>;
  placeholder?: string;
  id?: string;
  [key: string]: any;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<string[]>([]);

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const res = await fetcherRef.current(term).catch(() => []);
      if (active) setItems(res);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  const selected = new Set(value);
  const term = query.trim();

  // Suggested options (fetched results + current search term, minus selected)
  const options = React.useMemo(() => {
    const list = [...items];
    if (term && !selected.has(term) && !list.includes(term)) {
      list.unshift(term);
    }
    return list.filter((item) => !selected.has(item));
  }, [items, term, selected]);

  const handleSelect = (item: string) => {
    if (selected.has(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
    setQuery("");
  };

  const handleRemove = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-10 w-full justify-between font-normal bg-transparent hover:bg-transparent py-1.5 px-3"
          {...props}
        >
          <div className="flex flex-wrap gap-1.5 items-center max-w-[90%] text-left">
            {value.length > 0 ? (
              value.map((val) => (
                <div
                  key={val}
                  className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-normal bg-muted text-foreground border-transparent gap-1 hover:bg-muted/80"
                >
                  {val}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(val, e)}
                    className="rounded-full outline-none hover:bg-foreground/10 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {options.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                {term.length < 2 ? "Search by typing" : "No matches found."}
              </CommandEmpty>
            )}
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.has(item) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
