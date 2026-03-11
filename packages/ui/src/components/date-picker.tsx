"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

/* ─────────────────────────────────────────────
   DatePicker — Calendar-only date selection
   ───────────────────────────────────────────── */
interface DatePickerProps {
  /** Currently selected date */
  value?: Date | null
  /** Called when a date is selected */
  onChange: (date: Date | undefined) => void
  /** Placeholder when no date is selected */
  placeholder?: string
  /** date-fns format string for display */
  dateFormat?: string
  /** Extra className for the trigger button */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  dateFormat = "PPP",
  className,
  disabled,
  fromDate,
  toDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-slot="date-picker"
          className={cn(
            // Match Input styling exactly
            "inline-flex h-8 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12px]">
            {value ? format(value, dateFormat) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(d) => {
            onChange(d)
            setOpen(false)
          }}
          disabled={[
            ...(fromDate ? [{ before: fromDate }] : []),
            ...(toDate ? [{ after: toDate }] : []),
          ]}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, type DatePickerProps }
