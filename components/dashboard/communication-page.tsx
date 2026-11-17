"use client"

import { useMemo, useState } from "react"
import { AudioLines, Check, CheckCheck, CircleDashed, Clock3, ListPlus, LoaderCircle, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addDays, formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { practiceIconNames, type ActivityItem, type ActivityStatus, type PracticeIcon } from "./data"
import { buildIndex, clampPct, commKept, practiceStreak } from "./metrics"
import { practiceIcons } from "./practice-icons"
import { useAppData } from "./store"
import { dialogClass, EmptyState, Field, inputClass, primaryButton, secondaryButton } from "./ui"

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

function PracticeDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ActivityItem | null }) {
  const { addPractice, updatePractice } = useAppData()
  const [title, setTitle] = useState(editing?.title ?? "")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [minutes, setMinutes] = useState(String(editing?.minutes ?? 10))
  const [icon, setIcon] = useState<PracticeIcon>(editing?.icon ?? "thought")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const mins = Math.round(Number(minutes))
    if (!title.trim()) return setError("Give your practice a name.")
    if (!Number.isFinite(mins) || mins < 1 || mins > 600) return setError("Duration must be between 1 and 600 minutes.")
    setBusy(true)
    const input = { title: title.trim(), description: description.trim(), minutes: mins, icon }
    const ok = editing ? await updatePractice(editing.rowId, input) : await addPractice(input)
    setBusy(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{editing ? "Edit practice" : "Add a practice"}</DialogTitle>
            <DialogDescription className="text-white/45">{editing ? "Changes apply from today. Your past history is kept." : "It will appear in your daily list starting today."}</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="p-title"><input id="p-title" autoFocus maxLength={120} value={title} onChange={(e) => { setTitle(e.target.value); setError("") }} placeholder="e.g. Learn 5 new words" className={inputClass} /></Field>
          <Field label="Description · optional" htmlFor="p-desc"><textarea id="p-desc" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does doing this look like?" className={cn(inputClass, "resize-none")} /></Field>
          <Field label="Minutes per day" htmlFor="p-min"><input id="p-min" type="number" min={1} max={600} value={minutes} onChange={(e) => { setMinutes(e.target.value); setError("") }} className={cn(inputClass, "w-28")} /></Field>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">Icon</div>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
              {practiceIconNames.map((name) => {
                const Icon = practiceIcons[name]
                return <button type="button" role="radio" aria-checked={icon === name} aria-label={name} key={name} onClick={() => setIcon(name)} className={cn("grid size-9 place-items-center rounded-xl border transition", icon === name ? "border-sky-200/40 bg-sky-200/10 text-sky-100" : "border-white/[0.08] text-white/45 hover:text-white/80")}><Icon size={16} /></button>
              })}
            </div>
          </div>
          {error && <p role="alert" className="text-[11px] text-orange-200">{error}</p>}
          <DialogFooter className="border-white/[0.07] bg-white/[0.025]">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}{editing ? "Save changes" : "Add practice"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PracticeMenu({ activity, onEdit, onDelete }: { activity: ActivityItem; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button aria-label={`Options for ${activity.title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid size-7 place-items-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white"><MoreHorizontal size={15} /></button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-white/10 bg-[#1b1e1c] p-1 shadow-2xl">
          <button onClick={() => { setOpen(false); onEdit() }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white"><Pencil size={12} />Edit</button>
          <button onClick={() => { setOpen(false); onDelete() }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] text-orange-200/80 hover:bg-orange-300/10 hover:text-orange-100"><Trash2 size={12} />Delete</button>
        </div>
      )}
    </div>
  )
}

function PracticeCard({ activity, status, skipReason, onStatusChange, onSkip, onEdit, onDelete }: { activity: ActivityItem; status: ActivityStatus; skipReason?: string | null; onStatusChange: (id: string, status: ActivityStatus) => void; onSkip: (activity: ActivityItem) => void; onEdit: () => void; onDelete: () => void }) {
  const Icon = practiceIcons[activity.icon]
  const finished = status === "completed"
  return (
    <Card className={cn("practice-card flex flex-col rounded-2xl border p-4 transition duration-200 sm:p-5", finished ? "border-lime-200/15 bg-[#171b17]" : "border-white/[0.07] bg-[#171a18] hover:border-white/[0.13]")}>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", finished ? "bg-lime-300/10 text-lime-200" : "bg-white/[0.045] text-white/55")}><Icon size={18} strokeWidth={1.8} /></span>
        <div className="flex items-center gap-1"><StatusBadge status={status} /><PracticeMenu activity={activity} onEdit={onEdit} onDelete={onDelete} /></div>
      </div>
      <h3 className="mt-4 text-[13px] font-semibold text-white/85">{activity.title}</h3>
      <p className="mt-1.5 min-h-[42px] flex-1 text-[11px] leading-[1.65] text-white/42">{status === "skipped" && skipReason ? `Skipped: ${skipReason}` : activity.description || "No description."}</p>
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
  const { profile, today, practices, logs, workouts, journal, transactions, notes, todayStatus, setActivityStatus, setCommunicationRestDay, requestSkip, deletePractice } = useAppData()
  const [notesOpen, setNotesOpen] = useState(() => notes.some((n) => n.note_date === today && n.note))
  const [dialog, setDialog] = useState<{ open: boolean; editing: ActivityItem | null; key: number }>({ open: false, editing: null, key: 0 })
  const openDialog = (editing: ActivityItem | null) => setDialog((d) => ({ open: true, editing, key: d.key + 1 }))

  const stats = useMemo(() => {
    const index = buildIndex({ practices, logs, workouts, journal, transactions })
    const statuses = Object.values(todayStatus)
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    const week = days.map((d) => ({ date: d, beforeStart: d < profile.start_date, kept: commKept(index, d) }))
    const counted = week.filter((d) => !d.beforeStart)
    const kept = counted.filter((d) => d.kept).length
    const minutesPlanned = practices.reduce((s, p) => s + p.minutes, 0)
    return {
      completed: statuses.filter((s) => s === "completed").length,
      skipped: statuses.filter((s) => s === "skipped").length,
      rest: statuses.length > 0 && statuses.every((s) => s === "rest-day"),
      minutes: practices.filter((p) => todayStatus[p.id] === "completed").reduce((s, p) => s + p.minutes, 0),
      minutesPlanned,
      streak: practiceStreak(index, today),
      week,
      kept,
      counted: counted.length,
      skipReasons: Object.fromEntries(logs.filter((l) => l.log_date === today).map((l) => [l.activity_id, l.skip_reason])),
    }
  }, [practices, logs, workouts, journal, transactions, todayStatus, today, profile.start_date])

  const total = practices.length
  const remove = (activity: ActivityItem) => {
    if (confirm(`Delete "${activity.title}"?\n\nIt will be removed from your daily list. Days you already completed it stay in your history.`)) void deletePractice(activity.rowId)
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-sky-200/70">GOAL 02 · COMMUNICATION</div><h2 className="mt-3 text-[28px] font-semibold tracking-[-0.045em] sm:text-[32px]">Find your voice<span className="text-sky-200">.</span></h2><p className="mt-2 text-[13px] text-white/45">A little practice each day can change how you show up everywhere.</p></div>
        <button disabled={total === 0} onClick={() => setCommunicationRestDay(!stats.rest)} aria-pressed={stats.rest} className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] transition disabled:opacity-40", stats.rest ? "border-sky-200/20 bg-sky-200/[0.08] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-sky-200/25 hover:text-sky-100")}><Clock3 size={14} />{stats.rest ? "Rest day · tap to undo" : "Mark today as a rest day"}</button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="communication-hero relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardContent className="relative z-10 p-0">
            <div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/75"><AudioLines size={13} />Daily speaking practice</div><h3 className="mt-3 text-[19px] font-semibold tracking-[-0.03em]">{total > 0 && stats.completed === total ? "All practices done today. Well spoken." : "Your words are getting stronger."}</h3><p className="mt-1.5 max-w-[380px] text-xs leading-relaxed text-white/45">{total} practice{total === 1 ? "" : "s"}. About {stats.minutesPlanned} minutes. A more confident you, one day at a time.</p></div><div className="hidden size-[76px] items-center justify-center rounded-full border border-sky-200/15 bg-sky-200/[0.06] text-sky-100 sm:flex"><div className="relative grid size-14 place-items-center rounded-full border border-sky-200/20"><AudioLines size={22} />{stats.completed > 0 && <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full border-2 border-[#171a1a] bg-lime-300" />}</div></div></div>
            <div className="mt-7 grid grid-cols-3 gap-3 border-t border-white/[0.08] pt-4">
              <div><div className="text-[21px] font-semibold tracking-tight">{stats.completed}<span className="text-[13px] text-white/35"> / {total}</span></div><div className="mt-1 text-[10px] text-white/40">Practices done</div></div>
              <div><div className="text-[21px] font-semibold tracking-tight">{stats.minutes}<span className="ml-0.5 text-[12px] text-white/35"> / {profile.communication_target_min} min</span></div><div className="mt-1 text-[10px] text-white/40">Time practiced</div></div>
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
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-[14px] font-semibold text-white/90">Today&apos;s practices</h3><p className="mt-1.5 text-[11px] text-white/40">Your pace, your progress. Add, edit or remove practices to make the list yours.</p></div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg px-2 py-1.5 text-[10px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70" onClick={() => setNotesOpen((open) => !open)}>{notesOpen ? "Hide note" : "Add a note"}</button>
            <button onClick={() => openDialog(null)} className={cn(secondaryButton, "py-2")}><Plus size={13} />Add practice</button>
          </div>
        </div>
        {total === 0 ? (
          <EmptyState icon={ListPlus} title="No practices yet" description="Add the small daily practices you want to build into your routine." action={<button onClick={() => openDialog(null)} className={secondaryButton}><Plus size={13} />Add practice</button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {practices.map((activity) => <PracticeCard key={activity.rowId} activity={activity} status={todayStatus[activity.id] ?? "pending"} skipReason={stats.skipReasons[activity.id]} onStatusChange={setActivityStatus} onSkip={requestSkip} onEdit={() => openDialog(activity)} onDelete={() => remove(activity)} />)}
            <button onClick={() => openDialog(null)} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.1] text-white/40 transition hover:border-sky-200/30 hover:bg-sky-200/[0.03] hover:text-sky-100"><Plus size={18} /><span className="text-[11px]">Add a practice</span></button>
          </div>
        )}
      </section>

      {notesOpen && <PracticeNote />}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"><div className="flex items-center gap-2 text-[10px] text-white/40"><CheckCheck size={14} className="text-lime-200/70" />{stats.completed} of {total} complete <span className="mx-1 text-white/20">·</span>{stats.skipped ? `${stats.skipped} skipped today` : "No pressure to complete everything"}</div><span className="text-[10px] text-white/35">Your progress is yours alone.</span></div>
      <PracticeDialog key={dialog.key} open={dialog.open} editing={dialog.editing} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </div>
  )
}
