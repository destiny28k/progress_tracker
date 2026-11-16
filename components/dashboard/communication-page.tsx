"use client"

import { useMemo, useState } from "react"
import { AudioLines, BookOpen, Check, CheckCheck, CircleDashed, Clock3, LoaderCircle, MessageSquareText, Mic2, Play, RotateCcw, SpellCheck, Volume2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addDays, formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { activities, type ActivityItem, type ActivityStatus } from "./data"
import { buildIndex, clampPct, practiceStreak } from "./metrics"
import { useAppData } from "./store"
import { primaryButton } from "./ui"

const activityIcons = { voice: Mic2, video: Play, story: BookOpen, thought: MessageSquareText, grammar: SpellCheck, reading: Volume2 }

function StatusBadge({ status }: { status: ActivityStatus }) {
  const meta = {
    completed: { label: "Completed", style: "text-lime-200 bg-lime-200/[0.08] border-lime-200/10", icon: Check },
    pending: { label: "Pending", style: "text-white/45 bg-white/[0.035] border-white/[0.07]", icon: CircleDashed },
    skipped: { label: "Skipped today", style: "text-amber-100/75 bg-amber-200/[0.07] border-amber-200/10", icon: RotateCcw },
    "rest-day": { label: "Rest day", style: "text-sky-100/75 bg-sky-200/[0.07] border-sky-200/10", icon: Clock3 },
  }[status]
  const Icon = meta.icon
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium", meta.style)}><Icon size={11} />{meta.label}</span>
}

function PracticeCard({ activity, status, skipReason, onStatusChange, onSkip }: { activity: ActivityItem; status: ActivityStatus; skipReason?: string | null; onStatusChange: (id: string, status: ActivityStatus) => void; onSkip: (activity: ActivityItem) => void }) {
  const Icon = activityIcons[activity.icon]
  const finished = status === "completed"
  return (
    <Card className={cn("practice-card rounded-2xl border p-4 transition duration-200 sm:p-5", finished ? "border-lime-200/15 bg-[#171b17]" : "border-white/[0.07] bg-[#171a18] hover:border-white/[0.13]")}>
      <div className="flex items-start justify-between gap-3"><span className={cn("grid size-10 place-items-center rounded-xl", finished ? "bg-lime-300/10 text-lime-200" : "bg-white/[0.045] text-white/55")}><Icon size={18} strokeWidth={1.8} /></span><StatusBadge status={status} /></div>
      <h3 className="mt-4 text-[13px] font-semibold text-white/85">{activity.title}</h3>
      <p className="mt-1.5 min-h-[42px] text-[11px] leading-[1.65] text-white/42">{status === "skipped" && skipReason ? `Skipped: ${skipReason}` : activity.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="flex items-center gap-1.5 text-[10px] text-white/40"><Clock3 size={12} />{activity.minutes} min</span>
        <div className="flex items-center gap-2">
          {status === "pending" && <button className="rounded-lg px-2 py-1.5 text-[10px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/75" onClick={() => onSkip(activity)}>Skip today</button>}
          {(status === "skipped" || status === "rest-day") && <button className="rounded-lg px-2 py-1.5 text-[10px] text-amber-100/65 transition hover:bg-amber-200/[0.07]" onClick={() => onStatusChange(activity.id, "pending")}>Undo</button>}
          <button aria-label={finished ? `Undo completion: ${activity.title}` : `Mark ${activity.title} completed`} aria-pressed={finished} className={cn("grid size-8 place-items-center rounded-lg border transition", finished ? "border-lime-200/20 bg-lime-300 text-[#172014] hover:bg-lime-200" : "border-white/10 text-white/35 hover:border-lime-200/30 hover:bg-lime-200/10 hover:text-lime-100")} onClick={() => onStatusChange(activity.id, finished ? "pending" : "completed")}><Check size={15} strokeWidth={2.5} /></button>
        </div>
      </div>
    </Card>
  )
}

function PracticeNote() {
  const { notes, today, savePracticeNote } = useAppData()
  const saved = notes.find((n) => n.note_date === today)?.note ?? ""
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const value = draft ?? saved
  const save = async () => {
    setBusy(true)
    if (await savePracticeNote(value.trim())) setDraft(null)
    setBusy(false)
  }
  return (
    <Card className="panel-card rounded-2xl border border-white/[0.07] p-5">
      <label htmlFor="practice-note" className="text-xs font-medium text-white/75">A thought about today&apos;s practice</label>
      <textarea id="practice-note" rows={3} maxLength={2000} value={value} onChange={(e) => setDraft(e.target.value)} placeholder="What felt easier today?" className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 text-xs text-white placeholder:text-white/25 focus:border-sky-200/30 focus:outline-none" />
      <div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-white/30">{draft !== null && draft !== saved ? "Unsaved changes" : saved ? "Saved" : ""}</span><button disabled={busy || draft === null || draft === saved} onClick={save} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}Save note</button></div>
    </Card>
  )
}

export function CommunicationPage() {
  const { profile, today, logs, workouts, journal, transactions, notes, todayStatus, setActivityStatus, setCommunicationRestDay, requestSkip } = useAppData()
  const [notesOpen, setNotesOpen] = useState(() => notes.some((n) => n.note_date === today && n.note))

  const stats = useMemo(() => {
    const index = buildIndex({ logs, workouts, journal, transactions })
    const statuses = Object.values(todayStatus)
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    const week = days.map((d) => {
      const c = index.comm.get(d)
      return { date: d, beforeStart: d < profile.start_date, kept: !!c && (c.completed > 0 || c.rest >= activities.length) }
    })
    const counted = week.filter((d) => !d.beforeStart)
    const kept = counted.filter((d) => d.kept).length
    return {
      completed: statuses.filter((s) => s === "completed").length,
      skipped: statuses.filter((s) => s === "skipped").length,
      rest: statuses.every((s) => s === "rest-day"),
      minutes: index.comm.get(today)?.minutes ?? 0,
      streak: practiceStreak(index, today),
      week,
      kept,
      counted: counted.length,
      skipReasons: Object.fromEntries(logs.filter((l) => l.log_date === today).map((l) => [l.activity_id, l.skip_reason])),
    }
  }, [logs, workouts, journal, transactions, todayStatus, today, profile.start_date])

  const target = profile.communication_target_min

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-sky-200/70">GOAL 02 · COMMUNICATION</div><h2 className="mt-3 text-[28px] font-semibold tracking-[-0.045em] sm:text-[32px]">Find your voice<span className="text-sky-200">.</span></h2><p className="mt-2 text-[13px] text-white/45">A little practice each day can change how you show up everywhere.</p></div>
        <button onClick={() => setCommunicationRestDay(!stats.rest)} aria-pressed={stats.rest} className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] transition", stats.rest ? "border-sky-200/20 bg-sky-200/[0.08] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-sky-200/25 hover:text-sky-100")}><Clock3 size={14} />{stats.rest ? "Rest day · tap to undo" : "Mark today as a rest day"}</button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="communication-hero relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardContent className="relative z-10 p-0">
            <div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/75"><AudioLines size={13} />Daily speaking practice</div><h3 className="mt-3 text-[19px] font-semibold tracking-[-0.03em]">{stats.completed === activities.length ? "All practices done today. Well spoken." : "Your words are getting stronger."}</h3><p className="mt-1.5 max-w-[380px] text-xs leading-relaxed text-white/45">{activities.length} small practices. About {target} minutes. A more confident you, one day at a time.</p></div><div className="hidden size-[76px] items-center justify-center rounded-full border border-sky-200/15 bg-sky-200/[0.06] text-sky-100 sm:flex"><div className="relative grid size-14 place-items-center rounded-full border border-sky-200/20"><AudioLines size={22} />{stats.completed > 0 && <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-[#171a1a] bg-lime-300" />}</div></div></div>
            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4">
              <div><div className="text-[21px] font-semibold tracking-tight">{stats.completed}<span className="text-[13px] text-white/35"> / {activities.length}</span></div><div className="mt-1 text-[10px] text-white/40">Practices done</div></div>
              <div><div className="text-[21px] font-semibold tracking-tight">{stats.minutes}<span className="ml-0.5 text-[12px] text-white/35"> / {target} min</span></div><div className="mt-1 text-[10px] text-white/40">Time practiced</div></div>
              <div><div className="text-[21px] font-semibold tracking-tight">{stats.streak}<span className="ml-1 text-[12px] text-white/35"> day{stats.streak === 1 ? "" : "s"}</span></div><div className="mt-1 text-[10px] text-white/40">Current streak</div></div>
            </div>
          </CardContent>
          <div className="communication-glow pointer-events-none absolute -right-16 -top-16 size-64 rounded-full" />
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[13px] font-semibold text-white/85">Weekly consistency</CardTitle><p className="mt-1 text-[10px] text-white/40">One day at a time.</p></div><span className="text-[11px] font-semibold text-lime-200">{stats.counted ? clampPct((stats.kept / stats.counted) * 100) : 0}%</span></CardHeader>
          <CardContent className="mt-5 grid grid-cols-7 gap-2 p-0">{stats.week.map((d) => <div className="flex flex-col items-center gap-2" key={d.date}><span className="text-[9px] text-white/35">{formatDate(d.date, { weekday: "narrow" })}</span><span className={cn("grid size-7 place-items-center rounded-full border", d.kept ? "border-lime-200/15 bg-lime-200/10 text-lime-100" : "border-white/[0.07] text-white/20", d.date === today && "ring-1 ring-white/20")} aria-label={`${formatDate(d.date, { weekday: "long" })}: ${d.kept ? "practiced" : "not practiced"}`}>{d.kept ? <Check size={12} /> : <span className="size-1 rounded-full bg-white/20" />}</span></div>)}</CardContent>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="text-[10px] text-white/35">Past 7 days</span><span className="text-[10px] text-white/60">{stats.kept} of {stats.counted} days practiced</span></div>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-[14px] font-semibold text-white/90">Today&apos;s practices</h3><p className="mt-1.5 text-[11px] text-white/40">Your pace, your progress. Pick up where you are.</p></div><button className="rounded-lg px-2 py-1.5 text-[10px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70" onClick={() => setNotesOpen((open) => !open)}>{notesOpen ? "Hide note" : "Add a note"}</button></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activities.map((activity) => <PracticeCard key={activity.id} activity={activity} status={todayStatus[activity.id] ?? "pending"} skipReason={stats.skipReasons[activity.id]} onStatusChange={setActivityStatus} onSkip={requestSkip} />)}</div>
      </section>

      {notesOpen && <PracticeNote />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"><div className="flex items-center gap-2 text-[10px] text-white/40"><CheckCheck size={14} className="text-lime-200/70" />{stats.completed} of {activities.length} complete <span className="mx-1 text-white/20">·</span>{stats.skipped ? `${stats.skipped} skipped today` : "No pressure to complete everything"}</div><span className="text-[10px] text-white/35">Your progress is yours alone.</span></div>
    </div>
  )
}
