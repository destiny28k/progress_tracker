// All dates are local calendar days stored as "YYYY-MM-DD" strings.
const pad = (n: number) => String(n).padStart(2, "0")

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(value: string, days: number) {
  const date = parseISODate(value)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

/** Whole days from b to a (a - b). */
export function diffDays(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number)
  const [by, bm, bd] = b.split("-").map(Number)
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000)
}

/** Monday of the week containing the date. */
export function startOfWeek(value: string) {
  const offset = (parseISODate(value).getDay() + 6) % 7
  return addDays(value, -offset)
}

export function dateRange(from: string, to: string) {
  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export function monthKey(value: string) {
  return value.slice(0, 7)
}

export function shiftMonth(key: string, months: number) {
  const [y, m] = key.split("-").map(Number)
  const date = new Date(y, m - 1 + months, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function daysInMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return parseISODate(value).toLocaleDateString("en-US", options)
}

export function formatMonth(key: string, options: Intl.DateTimeFormatOptions = { month: "short" }) {
  return parseISODate(`${key}-01`).toLocaleDateString("en-US", options)
}

export function relativeDay(value: string, today: string) {
  const diff = diffDays(today, value)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff > 1 && diff < 7) return formatDate(value, { weekday: "long" })
  return formatDate(value, { weekday: "long", month: "short", day: "numeric" })
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 5) return "Good evening"
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}
