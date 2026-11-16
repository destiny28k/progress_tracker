"use client"

import { createContext, useContext, useMemo, useState } from "react"
import Link from "next/link"
import { DayPicker, type DayButtonProps } from "react-day-picker"
import { ArrowRight, AudioLines, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, Heart, RotateCcw, WalletCards } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { dateRange, formatDate, monthKey, parseISODate, toISODate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { activities, workoutKinds, type WorkoutKind } from "./data"
import { buildIndex, challengeInfo, dailyScore, formatMoney, journalHasContent, journalPreview, type DayIndex } from "./metrics"
import { useAppData } from "./store"
import { EmptyState, PageHeading } from "./ui"

const areaColors = { comm: "bg-sky-300", fit: "bg-orange-300", journal: "bg-violet-300", money: "bg-emerald-300" }

function areasFor(index: DayIndex, date: string) {
  const c = index.comm.get(date)
  const f = index.fit.get(date)
  return {
    comm: !!c && (c.completed > 0 || c.rest >= activities.length),
    fit: !!f && (f.count > 0 || f.rest),
    journal: index.journal.has(date),
    money: (index.tx.get(date) ?? 0) > 0,
  }
}

type CellData = { index: DayIndex; today: string; start: string; end: string; target: number }
const CellContext = createContext<CellData | null>(null)

/** Rendered by DayPicker for every day cell. Defined at module level so cells aren't remounted on each render. */
function DayCell({ day, modifiers, className: _className, children, ...buttonProps }: DayButtonProps) {
  const data = useContext(CellContext)!
  const date = toISODate(day.date)
  const s = date > data.today ? 0 : dailyScore(data.index, date, data.target)
  const areas = areasFor(data.index, date)
  const marker = date === data.start ? "Start" : date === data.end ? "End" : null
  return (
    <button
      {...buttonProps}
      aria-label={`${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}${modifiers.disabled ? "" : `, ${s}% of daily plan`}`}
      className={cn(
        "relative flex h-14 w-full flex-col items-center justify-start gap-1 rounded-xl border pt-1.5 text-[11px] transition sm:h-[72px] sm:pt-2",
        modifiers.selected ? "border-lime-200/60 text-white" : modifiers.today ? "border-white/25 text-white" : "border-transparent text-white/70 hover:border-white/15",
        modifiers.outside && "opacity-35",
        modifiers.disabled && "cursor-default text-white/20 hover:border-transparent",
      )}
      style={{ backgroundColor: modifiers.disabled ? "rgba(255,255,255,0.015)" : `rgba(194, 235, 119, ${s ? 0.06 + (s / 100) * 0.34 : 0.025})` }}
    >
      <span className={cn("leading-none", modifiers.today && "font-semibold text-lime-100")}>{children}</span>
      {!modifiers.disabled && (
        <span className="flex gap-0.5" aria-hidden="true">
          {(Object.keys(areas) as (keyof typeof areas)[]).filter((k) => areas[k]).map((k) => <span key={k} className={cn("size-1 rounded-full sm:size-1.5", areaColors[k])} />)}
        </span>
      )}
      {marker && <span className="absolute bottom-1 hidden text-[7px] uppercase tracking-wider text-lime-200/70 sm:block">{marker}</span>}
    </button>
  )
}

function CalendarChevron({ orientation }: { orientation?: "left" | "right" | "up" | "down" }) {
  return orientation === "left" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />
}

function Legend() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4 text-[10px] text-white/45">
      {([["comm", "Communication"], ["fit", "Movement"], ["journal", "Journal"], ["money", "Finance"]] as const).map(([k, label]) => <span key={k} className="flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", areaColors[k])} />{label}</span>)}
      <span className="ml-auto flex items-center gap-1.5">Daily score<span className="flex gap-0.5">{[0.08, 0.2, 0.32, 0.45].map((o) => <span key={o} className="size-2.5 rounded-sm" style={{ backgroundColor: `rgba(194,235,119,${o})` }} />)}</span></span>
    </div>
  )
}

export function CalendarPage() {
  const { profile, today, logs, workouts, journal, transactions, notes } = useAppData()
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(() => parseISODate(today))

  const index = useMemo(() => buildIndex({ logs, workouts, journal, transactions }), [logs, workouts, journal, transactions])
  const challenge = challengeInfo(profile, today)
  const score = (date: string) => (date > today ? 0 : dailyScore(index, date, profile.fitness_target_min))
  const cellData = useMemo(() => ({ index, today, start: profile.start_date, end: profile.end_date, target: profile.fitness_target_min }), [index, today, profile.start_date, profile.end_date, profile.fitness_target_min])
  const monthStats = useMemo(() => {
    const key = monthKey(toISODate(month))
    const days = dateRange(`${key}-01`, toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0))).filter((d) => d <= today && d >= profile.start_date)
    const scores = days.map((d) => dailyScore(index, d, profile.fitness_target_min))
    return {
      active: scores.filter((s) => s > 0).length,
      tracked: days.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      practices: days.reduce((s, d) => s + (index.comm.get(d)?.completed ?? 0), 0),
      workouts: days.reduce((s, d) => s + (index.fit.get(d)?.count ?? 0), 0),
      journals: days.filter((d) => index.journal.has(d)).length,
    }
  }, [month, index, today, profile.start_date, profile.fitness_target_min])

  const day = useMemo(() => {
    const dayLogs = new Map(logs.filter((l) => l.log_date === selected).map((l) => [l.activity_id, l]))
    const dayWorkouts = workouts.filter((w) => w.workout_date === selected)
    const entry = journal.find((j) => j.entry_date === selected && journalHasContent(j))
    const dayTx = transactions.filter((t) => t.occurred_on === selected)
    const income = dayTx.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0)
    const expenses = dayTx.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0)
    const note = notes.find((n) => n.note_date === selected)?.note
    return { dayLogs, dayWorkouts, entry, dayTx, income, expenses, note }
  }, [selected, logs, workouts, journal, transactions, notes])

  const selectedScore = score(selected)
  const isToday = selected === today
  const minutes = day.dayWorkouts.reduce((s, w) => s + w.duration_min, 0)
  const restDay = day.dayWorkouts.some((w) => w.kind === "rest")
  const money = (v: number) => formatMoney(v, profile.currency)

  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow="YOUR JOURNEY, DAY BY DAY" title={<>See every day at a glance<span className="text-lime-200">.</span></>} description="Brighter days mean more of your plan was done. Pick any day to see the details." accent="#d5ef9e" action={!isToday || monthKey(toISODate(month)) !== monthKey(today) ? <button onClick={() => { setSelected(today); setMonth(parseISODate(today)) }} className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-white/55 hover:text-white">Jump to today</button> : undefined} />

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-4 sm:p-6">
          <CardContent className="p-0">
            <CellContext.Provider value={cellData}>
            <DayPicker
              mode="single"
              required
              selected={parseISODate(selected)}
              onSelect={(d) => d && setSelected(toISODate(d))}
              month={month}
              onMonthChange={setMonth}
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              disabled={{ after: parseISODate(today) }}
              endMonth={parseISODate(today)}
              components={{ DayButton: DayCell, Chevron: CalendarChevron }}
              classNames={{
                root: "relative w-full",
                months: "w-full",
                month: "w-full",
                month_caption: "flex h-9 items-center text-[14px] font-semibold text-white/90",
                caption_label: "",
                nav: "absolute right-0 top-0 flex items-center gap-1",
                button_previous: "grid size-9 place-items-center rounded-lg border border-white/[0.07] text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30",
                button_next: "grid size-9 place-items-center rounded-lg border border-white/[0.07] text-white/50 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-30",
                month_grid: "mt-4 w-full border-separate border-spacing-1",
                weekdays: "",
                weekday: "pb-1 text-[10px] font-medium uppercase tracking-[0.1em] text-white/30",
                week: "",
                day: "p-0",
              }}
            />
            </CellContext.Provider>
            <Legend />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-start justify-between p-0">
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-lime-200/70">{isToday ? "Today" : formatDate(selected, { weekday: "long" })}</div><CardTitle className="mt-2 text-[17px] font-semibold tracking-[-0.02em]">{formatDate(selected, { month: "long", day: "numeric", year: "numeric" })}</CardTitle></div>
              <div className="text-right"><div className="text-[22px] font-semibold tracking-[-0.04em]">{selectedScore}<span className="text-[12px] text-white/35">%</span></div><div className="text-[9px] text-white/35">daily score</div></div>
            </CardHeader>
            <CardContent className="mt-5 flex flex-col gap-5 p-0">
              {selected < profile.start_date && <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10px] text-white/40">This day is before your challenge started on {formatDate(profile.start_date)}.</p>}

              <div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-medium text-white/75"><AudioLines size={13} className="text-sky-200" />Communication</span><span className="text-[10px] text-white/40">{[...day.dayLogs.values()].filter((l) => l.status === "completed").length} / {activities.length}</span></div>
                <ul className="mt-2 flex flex-col gap-1">
                  {activities.map((a) => {
                    const log = day.dayLogs.get(a.id)
                    const Icon = log?.status === "completed" ? Check : log?.status === "skipped" ? RotateCcw : log?.status === "rest-day" ? Clock3 : null
                    return (
                      <li key={a.id} className="flex items-center gap-2 text-[10px]">
                        <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", log?.status === "completed" ? "bg-lime-300/15 text-lime-200" : log ? "bg-white/[0.05] text-white/45" : "border border-white/10")}>{Icon && <Icon size={9} />}</span>
                        <span className={cn("flex-1 truncate", log?.status === "completed" ? "text-white/70" : "text-white/40")}>{a.title}</span>
                        {log?.status === "skipped" && <span className="text-amber-100/60">{log.skip_reason ?? "Skipped"}</span>}
                        {log?.status === "rest-day" && <span className="text-sky-100/60">Rest</span>}
                      </li>
                    )
                  })}
                </ul>
                {day.note && <p className="mt-2 rounded-lg bg-white/[0.025] px-2.5 py-2 text-[10px] italic text-white/45">“{day.note}”</p>}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-medium text-white/75"><Dumbbell size={13} className="text-orange-200" />Movement</span><span className="text-[10px] text-white/40">{restDay && minutes === 0 ? "Rest day" : `${minutes} / ${profile.fitness_target_min} min`}</span></div>
                {day.dayWorkouts.filter((w) => w.kind !== "rest").length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1">{day.dayWorkouts.filter((w) => w.kind !== "rest").map((w) => <li key={w.id} className="flex items-center justify-between text-[10px] text-white/55"><span>{workoutKinds[w.kind as WorkoutKind]?.title ?? w.kind}</span><span className="text-white/40">{w.duration_min} min</span></li>)}</ul>
                ) : !restDay && <p className="mt-2 text-[10px] text-white/30">No workout logged.</p>}
                {restDay && <p className="mt-2 flex items-center gap-1.5 text-[10px] text-sky-100/60"><Heart size={11} />Planned recovery</p>}
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-medium text-white/75"><BookOpen size={13} className="text-violet-200" />Journal</span><Link href={`/journal?date=${selected}`} className="flex items-center gap-1 text-[10px] text-lime-200/75 hover:text-lime-100">{day.entry ? "Open" : "Write"}<ArrowRight size={11} /></Link></div>
                <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-white/45">{day.entry ? journalPreview(day.entry) : "No reflection for this day."}</p>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-[11px] font-medium text-white/75"><WalletCards size={13} className="text-emerald-200" />Finance</span>{day.dayTx.length > 0 && <span className="text-[10px] text-white/40"><span className="text-emerald-100">+{money(day.income)}</span> · −{money(day.expenses)}</span>}</div>
                {day.dayTx.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1">{day.dayTx.map((t) => <li key={t.id} className="flex items-center justify-between gap-2 text-[10px]"><span className="truncate text-white/55">{t.description}</span><span className={t.kind === "income" ? "text-emerald-100" : "text-white/45"}>{t.kind === "income" ? "+" : "−"}{money(Number(t.amount))}</span></li>)}</ul>
                ) : <p className="mt-2 text-[10px] text-white/30">No transactions.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-center justify-between p-0"><CardTitle className="text-[13px]">{formatDate(toISODate(month), { month: "long", year: "numeric" })}</CardTitle><CalendarDays size={15} className="text-white/35" /></CardHeader>
            <CardContent className="mt-4 p-0">
              {monthStats.tracked === 0 ? <EmptyState icon={CalendarDays} title="Nothing to show yet" description={challenge.phase === "upcoming" ? "Your challenge hasn't started yet." : "This month is outside your tracked days."} /> : (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Active days", value: `${monthStats.active} / ${monthStats.tracked}` },
                    { label: "Average score", value: `${monthStats.avg}%` },
                    { label: "Practices done", value: monthStats.practices },
                    { label: "Workouts", value: monthStats.workouts },
                    { label: "Journal entries", value: monthStats.journals },
                    { label: "Challenge day", value: challenge.phase === "upcoming" ? "—" : `${challenge.day} / ${challenge.total}` },
                  ].map((s) => <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[9px] text-white/40">{s.label}</div><div className="mt-1.5 text-[15px] font-semibold">{s.value}</div></div>)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
