"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-zik-card text-zik-text", className)}
      
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex w-full flex-col gap-4",
        nav: "flex items-center justify-between w-full px-1",
        button_previous: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover rounded-md order-first", // ✅ Modifié
        button_next: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover rounded-md order-last", // ✅ Modifié
        month_caption: "flex items-center justify-center text-zik-text font-medium",
        weekday: "text-zik-muted text-[0.9rem] font-medium",
        day: "h-8 w-8 text-[0.9rem] font-medium text-zik-text hover:bg-zik-card-hover rounded-md aria-selected:bg-zik-purple aria-selected:text-white",
        day_today: "bg-zik-purple/10 text-zik-text border border-zik-purple/30 rounded-md",
        day_outside: "text-zik-muted/40",
        day_disabled: "text-zik-muted/40 opacity-50",
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4 text-zik-purple" {...props} />
          }
          if (orientation === "right") {
            return <ChevronRightIcon className="h-4 w-4 text-zik-purple" {...props} />
          }
          return <ChevronDownIcon className="h-4 w-4 text-zik-purple" {...props} />
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center text-zik-muted">
                {children}
              </div>
            </td>
          )
        },
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 p-0 text-[0.9rem] font-medium rounded-md",
        "aria-selected:bg-zik-purple aria-selected:text-white",
        "hover:bg-zik-card-hover hover:text-zik-text",
        "focus:ring-2 focus:ring-zik-purple/50 focus:outline-none",
        modifiers.today && "bg-zik-purple/10 border border-zik-purple/30",
        modifiers.disabled && "text-zik-muted/40 opacity-50",
        modifiers.outside && "text-zik-muted/40",
        className
      )}
      {...props}
    >
      {day.date.getDate()}
    </Button>
  )
}

export { Calendar, CalendarDayButton }