"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

const CALENDAR_CLASSNAMES = {
  root: "w-full",
  months: "relative flex flex-col gap-4",
  month: "flex w-full flex-col gap-4",
  nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2",
  button_previous: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
  button_next: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
  month_caption: "flex h-8 w-full items-center justify-center px-4 text-zik-text font-medium",
  weekday: "text-zik-muted text-[0.9rem] font-medium",
  day: "h-8 w-8 text-[0.9rem] font-medium text-zik-text hover:bg-zik-card-hover rounded-md",
  day_selected: "bg-zik-purple text-white hover:bg-zik-purple/90",
  day_today: "bg-zik-purple/10 text-zik-text border border-zik-purple/30 rounded-md",
};

export function parseDateStr(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateButton({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline"
          className={cn(
            "w-full h-9 justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover gap-2",
            !value && "text-zik-muted"
          )}
        >
          <CalendarDays className="h-4 w-4 text-zik-purple shrink-0" />
          {value ? format(parseDateStr(value), "PPP", { locale: fr }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0 bg-zik-card border-zik-border shadow-lg" align="start" sideOffset={8}>
        <Calendar
          mode="single"
          selected={value ? parseDateStr(value) : undefined}
          onSelect={(selectedDate) => {
            if (selectedDate) {
              const y = selectedDate.getFullYear();
              const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const day = String(selectedDate.getDate()).padStart(2, "0");
              onChange(`${y}-${m}-${day}`);
            }
          }}
          locale={fr}
          initialFocus
          classNames={CALENDAR_CLASSNAMES}
        />
      </PopoverContent>
    </Popover>
  );
}
