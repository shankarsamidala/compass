import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
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

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

export function CompanyComboboxNova({
  value,
  onChange,
  placeholder = "Search your company…",
  id,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  [key: string]: any;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<string[]>([]);

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: COMPANY_GQL,
            variables: { query: term, limit: 8, type: "company" },
          }),
        });
        const json = await res.json();
        const names: string[] = (json?.data?.autocompleteCompany ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean);
        if (active) setItems([...new Set(names)]);
      } catch {
        if (active) setItems([]);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  // Keep options: fetched results + the current query as a fallback option
  const options = React.useMemo(() => {
    const list = [...items];
    const term = query.trim();
    if (term && !list.includes(term)) {
      list.unshift(term);
    }
    return list;
  }, [items, query]);

  const handleSelect = (item: string) => {
    onChange(item);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal bg-transparent hover:bg-transparent"
          {...props}
        >
          <span className="truncate">{value || placeholder || "Select..."}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search company…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {options.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                Search by typing
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
                      value === item ? "opacity-100" : "opacity-0"
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
