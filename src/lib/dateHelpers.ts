import { format } from "date-fns";

export function todayLocalDateString(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export function localTzOffsetMinutes(d: Date = new Date()): number {
  return d.getTimezoneOffset();
}
