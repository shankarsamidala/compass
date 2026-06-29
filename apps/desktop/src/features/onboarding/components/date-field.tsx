import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Popover + shadcn Calendar date field. Stores an ISO date string (YYYY-MM-DD);
 * shows month + year (work-history granularity). Year/month dropdowns make picking
 * old dates fast.
 */
export function DateField({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
}: {
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-10 w-full justify-start rounded-4xl bg-transparent hover:bg-transparent px-3.5 font-normal data-[empty=true]:text-muted-foreground"
          data-empty={!value}
        >
          <CalendarIcon className="mr-2 size-4 opacity-70" />
          {date ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          onSelect={(d) => {
            if (d) onChange(d.toISOString().slice(0, 10));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
