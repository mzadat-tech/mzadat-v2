"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

/* ─────────────────────────────────────────────
   TimePicker — 24h or 12h time selection
   ───────────────────────────────────────────── */

interface TimePickerProps {
  /** Time value as "HH:mm" (24h format) */
  value?: string
  /** Called with "HH:mm" string */
  onChange: (time: string) => void
  /** Placeholder */
  placeholder?: string
  /** Extra className for the trigger button */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** 12-hour format with AM/PM selector */
  use12Hour?: boolean
  /** Minute step granularity (default: 5) */
  minuteStep?: number
}

function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
  disabled,
  use12Hour = false,
  minuteStep = 5,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const hours = value ? parseInt(value.split(":")[0], 10) : undefined
  const minutes = value ? parseInt(value.split(":")[1], 10) : undefined

  const displayTime = React.useMemo(() => {
    if (hours === undefined || minutes === undefined) return null
    if (use12Hour) {
      const period = hours >= 12 ? "PM" : "AM"
      const h12 = hours % 12 || 12
      return `${h12}:${String(minutes).padStart(2, "0")} ${period}`
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }, [hours, minutes, use12Hour])

  const hourOptions = use12Hour
    ? Array.from({ length: 12 }, (_, i) => i + 1)
    : Array.from({ length: 24 }, (_, i) => i)

  const minuteOptions = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep
  )

  const handleHourChange = (h: string) => {
    let newHour = parseInt(h, 10)
    if (use12Hour && hours !== undefined) {
      const wasPM = hours >= 12
      if (wasPM) {
        newHour = newHour === 12 ? 12 : newHour + 12
      } else {
        newHour = newHour === 12 ? 0 : newHour
      }
    }
    const m = minutes ?? 0
    onChange(`${String(newHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }

  const handleMinuteChange = (m: string) => {
    const h = hours ?? 0
    onChange(`${String(h).padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  const handlePeriodChange = (period: string) => {
    if (hours === undefined) return
    let newHour = hours
    if (period === "AM" && hours >= 12) newHour -= 12
    if (period === "PM" && hours < 12) newHour += 12
    const m = minutes ?? 0
    onChange(
      `${String(newHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    )
  }

  const currentPeriod = (hours ?? 0) >= 12 ? "PM" : "AM"
  const display12Hour =
    hours !== undefined
      ? use12Hour
        ? (hours % 12 || 12).toString()
        : hours.toString()
      : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-start font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <ClockIcon className="me-2 size-4" />
          {displayTime ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Hour</Label>
            <Select
              value={display12Hour}
              onValueChange={handleHourChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={h.toString()}>
                    {String(h).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="pb-2 text-lg font-medium text-muted-foreground">:</span>

          <div className="grid gap-1.5">
            <Label className="text-xs">Minute</Label>
            <Select
              value={minutes !== undefined ? String(minutes) : undefined}
              onValueChange={handleMinuteChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder="--" />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {String(m).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {use12Hour && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Period</Label>
              <Select value={currentPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ─────────────────────────────────────────────
   TimeInput — simple native time input styled
   like shadcn Input (no popover)
   ───────────────────────────────────────────── */

interface TimeInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  /** Time value as "HH:mm" */
  value?: string
  /** Called with "HH:mm" string */
  onChange: (time: string) => void
}

function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
  return (
    <Input
      type="time"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn("w-auto", className)}
      {...props}
    />
  )
}

export { TimePicker, TimeInput, type TimePickerProps, type TimeInputProps }
