import { useState, useEffect } from "react";
import { ChevronsUpDown } from "lucide-react";
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
import { useSuggest } from "../use-suggest";
import type { SuggestKind } from "@compass/ipc-contract";

/**
 * Single-value picker with live, provider-backed autocomplete (roles / locations),
 * using standard shadcn Popover + Command. Server already filters, so built-in
 * filtering is disabled. Free text is allowed.
 */
export function AsyncCombobox({
  value,
  onChange,
  kind,
  placeholder,
  id,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
  kind: SuggestKind;
  placeholder?: string;
  id?: string;
  [key: string]: any;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value ?? "");
  const { items } = useSuggest(kind, query);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

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
            placeholder={placeholder || "Search..."}
            value={query}
            onValueChange={(text) => {
              setQuery(text);
              onChange(text); // allow free text typing
            }}
          />
          <CommandList>
            {items.length === 0 && (
              <CommandEmpty>Search by typing</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setQuery(currentValue);
                    setOpen(false);
                  }}
                >
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
