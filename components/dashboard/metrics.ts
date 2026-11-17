import { addDays, dateRange, diffDays, monthKey, shiftMonth, startOfWeek } from "@/lib/dates"
import type { ActivityItem } from "./data"
import type { ActivityLog, JournalEntry, Profile, Transaction, Workout } from "./store"

// ---------- Challenge ----------

export function challengeInfo(profile: Profile, today: string) {
  const total = Math.max(diffDays(profile.end_date, profile.start_date) + 1, 1)
  const raw = diffDays(today, profile.start_date) + 1
  const phase: "upcoming" | "active" | "finished" = raw < 1 ? "upcoming" : raw > total ? "finished" : "active"
  const day = Math.min(Math.max(raw, 0), total)
  return {
    total,
    day,
    daysLeft: total - day,
    pct: Math.round((day / total) * 100),
    phase,
    startsIn: raw < 1 ? 1 - raw : 0,
    /** First day that counts toward stats (never after today). */
    from: profile.start_date,
    /** Last day that counts toward stats. */
    to: today < profile.end_date ? today : profile.end_date,
  }
}

// ---------- Daily index ----------

export type DayIndex = {
  /** How many practices make up a full communication day. */
  practiceCount: number
  comm: Map<string, AreaDay>
  /** Custom focus areas: how many tasks each has, and per-day progress. */
  areas: Map<string, { count: number; days: Map<string, AreaDay> }>
  fit: Map<string, { minutes: number; count: number; rest: boolean }>
  journal: Set<string>
  tx: Map<string, number>
}

export function journalHasContent(entry: Pick<JournalEntry, "accomplished" | "went_wrong" | "learned" | "improve" | "priorities">) {
  return [entry.accomplished, entry.went_wrong, entry.learned, entry.improve, entry.priorities].some((v) => v.trim().length > 0)
}

export type AreaDay = { completed: number; skipped: number; rest: number; minutes: number }

export function buildIndex(data: { practices: ActivityItem[]; logs: ActivityLog[]; workouts: Workout[]; journal: JournalEntry[]; transactions: Transaction[] }): DayIndex {
  const byKey = new Map(data.practices.map((a) => [a.id, a]))
  const comm: DayIndex["comm"] = new Map()
  const areas: DayIndex["areas"] = new Map()
  for (const p of data.practices) {
    if (!p.areaId) continue
    const area = areas.get(p.areaId) ?? { count: 0, days: new Map() }
    area.count++
    areas.set(p.areaId, area)
  }
  for (const log of data.logs) {
    const practice = byKey.get(log.activity_id)
    // Logs of practices that no longer exist are legacy Communication history.
    const target = practice?.areaId ? areas.get(practice.areaId)?.days : comm
    if (!target) continue
    const entry = target.get(log.log_date) ?? { completed: 0, skipped: 0, rest: 0, minutes: 0 }
    if (log.status === "completed") {
      entry.completed++
      entry.minutes += practice?.minutes ?? 0
    } else if (log.status === "skipped") entry.skipped++
    else entry.rest++
    target.set(log.log_date, entry)
  }
  const fit: DayIndex["fit"] = new Map()
  for (const w of data.workouts) {
    const entry = fit.get(w.workout_date) ?? { minutes: 0, count: 0, rest: false }
    if (w.kind === "rest") entry.rest = true
    else {
      entry.minutes += w.duration_min
      entry.count++
    }
    fit.set(w.workout_date, entry)
  }
  const journal = new Set(data.journal.filter(journalHasContent).map((j) => j.entry_date))
  const tx: DayIndex["tx"] = new Map()
  for (const t of data.transactions) tx.set(t.occurred_on, (tx.get(t.occurred_on) ?? 0) + 1)
  return { practiceCount: Math.max(data.practices.filter((p) => !p.areaId).length, 1), comm, areas, fit, journal, tx }
}

/** Per-day progress for an area; null = Communication. */
export function areaDays(index: DayIndex, areaId: string | null) {
  return areaId ? index.areas.get(areaId)?.days ?? new Map<string, AreaDay>() : index.comm
}

/** A day counts as kept for an area with any completed task or a planned rest day. */
export function areaKept(index: DayIndex, areaId: string | null, date: string) {
  const c = areaDays(index, areaId).get(date)
  return !!c && (c.completed > 0 || c.rest > 0)
}

export function commKept(index: DayIndex, date: string) {
  return areaKept(index, null, date)
}

/** 0–100: share of the day's plan done across communication, movement and journaling. Rest days count as kept. */
export function dailyScore(index: DayIndex, date: string, fitnessTarget: number) {
  const c = index.comm.get(date)
  const f = index.fit.get(date)
  const comm = c ? (c.rest > 0 ? 1 : Math.min(c.completed / index.practiceCount, 1)) : 0
  const fit = f ? (f.rest && f.minutes === 0 ? 1 : Math.min(f.minutes / Math.max(fitnessTarget, 1), 1)) : 0
  const journal = index.journal.has(date) ? 1 : 0
  let sum = comm + fit + journal
  let parts = 3
  for (const area of index.areas.values()) {
    if (area.count === 0) continue
    const d = area.days.get(date)
    sum += d ? (d.rest > 0 ? 1 : Math.min(d.completed / area.count, 1)) : 0
    parts++
  }
  return Math.round((sum / parts) * 100)
}

/** Average daily score over the `days` ending on `end`, ignoring days before the challenge and a not-yet-started today. */
export function consistency(index: DayIndex, profile: Profile, today: string, end = today, days = 7) {
  const from = addDays(end, -(days - 1)) < profile.start_date ? profile.start_date : addDays(end, -(days - 1))
  if (from > end) return null
  const scores = dateRange(from, end)
    .filter((d) => d !== today || dailyScore(index, d, profile.fitness_target_min) > 0)
    .map((d) => dailyScore(index, d, profile.fitness_target_min))
  if (!scores.length) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

/** Consecutive days with any progress, ending today (or yesterday if today has nothing yet). */
export function streak(index: DayIndex, profile: Profile, today: string) {
  let day = dailyScore(index, today, profile.fitness_target_min) > 0 ? today : addDays(today, -1)
  let count = 0
  while (dailyScore(index, day, profile.fitness_target_min) > 0) {
    count++
    day = addDays(day, -1)
  }
  return count
}

/** Streak for one area (null = Communication): days with at least one completed task or a rest day. */
export function practiceStreak(index: DayIndex, today: string, areaId: string | null = null) {
  const kept = (d: string) => areaKept(index, areaId, d)
  let day = kept(today) ? today : addDays(today, -1)
  let count = 0
  while (kept(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

export function weekDates(today: string, offsetWeeks = 0) {
  const monday = addDays(startOfWeek(today), offsetWeeks * 7)
  return dateRange(monday, addDays(monday, 6))
}

export function activityCount(index: DayIndex, date: string) {
  let areaDone = 0
  for (const area of index.areas.values()) areaDone += area.days.get(date)?.completed ?? 0
  return (index.comm.get(date)?.completed ?? 0) + areaDone + (index.fit.get(date)?.count ?? 0) + (index.journal.has(date) ? 1 : 0) + (index.tx.get(date) ?? 0)
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

// ---------- Finance ----------

export function monthTotals(transactions: Transaction[], key: string) {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    if (monthKey(t.occurred_on) !== key) continue
    if (t.kind === "income") income += Number(t.amount)
    else expenses += Number(t.amount)
  }
  return { income, expenses, savings: income - expenses }
}

export function monthlySeries(transactions: Transaction[], today: string, months: number) {
  const current = monthKey(today)
  return Array.from({ length: months }, (_, i) => {
    const key = shiftMonth(current, i - months + 1)
    return { key, ...monthTotals(transactions, key) }
  })
}

export function formatMoney(value: number, currency: string, compact = false) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: compact ? 1 : 0, notation: compact ? "compact" : "standard" }).format(value)
}

// ---------- Generic ----------

export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 200))} min read`
}

export function journalText(entry: JournalEntry) {
  return [entry.accomplished, entry.went_wrong, entry.learned, entry.improve, entry.priorities].join(" ")
}

export function journalPreview(entry: JournalEntry) {
  return [entry.accomplished, entry.learned, entry.went_wrong, entry.improve, entry.priorities].find((v) => v.trim()) ?? ""
}

export function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}
