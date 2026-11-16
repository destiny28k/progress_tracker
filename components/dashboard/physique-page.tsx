"use client"

import { useMemo, useState } from "react"
import { Check, Dumbbell, Footprints, Heart, LoaderCircle, Plus, Ruler, Scale, Trash2 } from "lucide-react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addDays, formatDate, monthKey } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { workoutKinds, type WorkoutKind } from "./data"
import { clampPct, weekDates } from "./metrics"
import { useAppData, type BodyMetric } from "./store"
import { axisTick, dialogClass, EmptyState, Field, inputClass, PageHeading, primaryButton, secondaryButton, tooltipStyle } from "./ui"

const kindIcons = { gym: Dumbbell, home: Heart, cardio: Footprints }

type MeasureKey = "weight_kg" | "chest_cm" | "waist_cm" | "hips_cm" | "body_fat_pct"
const measureFields: { key: MeasureKey; label: string; unit: string; max: number }[] = [
  { key: "weight_kg", label: "Weight", unit: "kg", max: 499 },
  { key: "chest_cm", label: "Chest", unit: "cm", max: 400 },
  { key: "waist_cm", label: "Waist", unit: "cm", max: 400 },
  { key: "hips_cm", label: "Hips", unit: "cm", max: 400 },
  { key: "body_fat_pct", label: "Body fat", unit: "%", max: 100 },
]

function MeasurementsDialog({ open, onOpenChange, latest }: { open: boolean; onOpenChange: (open: boolean) => void; latest?: BodyMetric }) {
  const { today, saveBodyMetric } = useAppData()
  const [date, setDate] = useState(today)
  const [values, setValues] = useState<Record<MeasureKey, string>>({ weight_kg: "", chest_cm: "", waist_cm: "", hips_cm: "", body_fat_pct: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const reset = () => { setDate(today); setValues({ weight_kg: "", chest_cm: "", waist_cm: "", hips_cm: "", body_fat_pct: "" }); setError("") }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed: Partial<Record<MeasureKey, number | null>> = {}
    for (const f of measureFields) {
      const raw = values[f.key].trim()
      if (!raw) { parsed[f.key] = null; continue }
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0 || n > f.max) return setError(`${f.label} must be between 0 and ${f.max} ${f.unit}.`)
      parsed[f.key] = n
    }
    if (Object.values(parsed).every((v) => v === null)) return setError("Enter at least one measurement.")
    if (!date || date > today) return setError("Choose a date that isn't in the future.")
    setBusy(true)
    const ok = await saveBodyMetric({ measured_on: date, ...parsed })
    setBusy(false)
    if (ok) { reset(); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className={dialogClass}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader><DialogTitle className="text-base font-semibold">Log measurements</DialogTitle><DialogDescription className="text-white/45">Fill in what you measured. Saving again on the same date updates that entry.</DialogDescription></DialogHeader>
          <Field label="Date" htmlFor="m-date"><input id="m-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputClass, "[color-scheme:dark]")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            {measureFields.map((f) => (
              <Field key={f.key} label={`${f.label} (${f.unit})`} htmlFor={`m-${f.key}`}>
                <input id={`m-${f.key}`} type="number" inputMode="decimal" step="0.1" min="0" max={f.max} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} placeholder={latest?.[f.key] != null ? String(latest[f.key]) : "—"} className={inputClass} />
              </Field>
            ))}
          </div>
          {error && <p role="alert" className="text-[11px] text-orange-200">{error}</p>}
          <DialogFooter className="border-white/[0.07] bg-white/[0.025]">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}Save</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PhysiquePage() {
  const { profile, today, workouts, bodyMetrics, addWorkout, deleteWorkout, setWorkoutRestDay } = useAppData()
  const target = profile.fitness_target_min
  const [kind, setKind] = useState<WorkoutKind>("gym")
  const [minutes, setMinutes] = useState(String(target || 30))
  const [busy, setBusy] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)

  const m = useMemo(() => {
    const todays = workouts.filter((w) => w.workout_date === today)
    const restDay = todays.some((w) => w.kind === "rest")
    const sessions = todays.filter((w) => w.kind !== "rest")
    const minutesToday = sessions.reduce((s, w) => s + w.duration_min, 0)
    const week = weekDates(today).map((d) => ({ date: d, active: workouts.some((w) => w.workout_date === d && w.kind !== "rest"), rest: workouts.some((w) => w.workout_date === d && w.kind === "rest") }))
    const monthMinutes = workouts.filter((w) => monthKey(w.workout_date) === monthKey(today)).reduce((s, w) => s + w.duration_min, 0)
    const weights = bodyMetrics.filter((b) => b.weight_kg != null).slice(-12).map((b) => ({ date: b.measured_on, label: formatDate(b.measured_on, { month: "short", day: "numeric" }), weight: Number(b.weight_kg) }))
    const latest = bodyMetrics.at(-1)
    // Compare each measurement with the most recent value at least 28 days older (or the first one recorded).
    const changeFor = (key: MeasureKey) => {
      const withValue = bodyMetrics.filter((b) => b[key] != null)
      const last = withValue.at(-1)
      if (!last) return { value: null as number | null, change: null as number | null }
      const cutoff = addDays(last.measured_on, -28)
      const base = [...withValue].reverse().find((b) => b.measured_on <= cutoff) ?? (withValue.length > 1 ? withValue[0] : undefined)
      return { value: Number(last[key]), change: base ? Number(last[key]) - Number(base[key]) : null }
    }
    return { restDay, sessions, minutesToday, week, monthMinutes, weights, latest, changeFor }
  }, [workouts, bodyMetrics, today])

  const reached = m.restDay || m.minutesToday >= target
  const pct = m.restDay ? 100 : clampPct((m.minutesToday / Math.max(target, 1)) * 100)
  const activeDays = m.week.filter((d) => d.active).length
  const firstWeight = m.weights[0]?.weight
  const lastWeight = m.weights.at(-1)?.weight
  const weightValues = m.weights.map((w) => w.weight)
  const yDomain = weightValues.length ? [Math.floor(Math.min(...weightValues) - 1), Math.ceil(Math.max(...weightValues) + 1)] : [0, 100]

  const log = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Math.round(Number(minutes))
    if (!Number.isFinite(value) || value <= 0 || value > 1440) return
    setBusy(true)
    await addWorkout({ kind, duration_min: value })
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow="GOAL 03 · PHYSICAL FITNESS" title={<>Strong in your own way<span className="text-orange-200">.</span></>} description="Build strength, energy, and trust with your body. Every kind of movement counts." accent="#f2bd98" action={<button onClick={() => setWorkoutRestDay(!m.restDay)} aria-pressed={m.restDay} className={cn("flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] transition", m.restDay ? "border-sky-200/20 bg-sky-200/[0.08] text-sky-100" : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/15 hover:text-white")}><Heart size={14} />{m.restDay ? "Rest day · tap to undo" : "Take a rest day"}</button>} />

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="fitness-hero relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardContent className="relative z-10 p-0">
            <div className="flex items-start justify-between"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-100/70">TODAY&apos;S MOVEMENT</div><h3 className="mt-3 text-[20px] font-semibold tracking-[-0.03em]">{m.restDay ? "Recovery is part of the work." : reached ? "Target reached. Nice work." : "Make a little room to move."}</h3><p className="mt-1.5 max-w-[380px] text-xs text-white/45">{m.restDay ? "Take a breath. You can come back tomorrow." : `Your target is ${target} minutes. Choose the movement that feels good.`}</p></div><div className="grid size-11 place-items-center rounded-xl bg-orange-200/10 text-orange-100"><Footprints size={20} /></div></div>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/[0.08] pt-4">
              <div><span className="text-[31px] font-semibold tracking-[-0.06em]">{m.minutesToday}</span><span className="ml-1.5 text-[13px] text-white/35">/ {target} min</span><div className="mt-2 h-1.5 w-[220px] max-w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Movement today" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-orange-200 transition-all" style={{ width: `${pct}%` }} /></div></div>
              <span className="flex items-center gap-2 rounded-full bg-lime-200/[0.08] px-3 py-1.5 text-[10px] text-lime-100/80"><span className="size-1.5 rounded-full bg-lime-200" />{m.restDay ? "Rest day" : reached ? "Daily target reached" : `${target - m.minutesToday} minutes to go`}</span>
            </div>
          </CardContent>
          <div className="fitness-glow pointer-events-none absolute -right-12 -top-16 size-64 rounded-full" />
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[13px]">This week</CardTitle><p className="mt-1 text-[10px] text-white/40">Movement adds up.</p></div><span className="text-[10px] text-orange-100">{activeDays} / 7 days</span></CardHeader>
          <CardContent className="mt-5 grid grid-cols-7 gap-2 p-0">{m.week.map((d) => <div className="flex flex-col items-center gap-2" key={d.date}><span className="text-[9px] text-white/35">{formatDate(d.date, { weekday: "narrow" })}</span><span title={d.rest ? "Rest day" : undefined} className={cn("grid size-7 place-items-center rounded-full", d.active ? "bg-orange-200/10 text-orange-100" : d.rest ? "bg-sky-200/10 text-sky-100" : "border border-white/[0.07] text-white/20", d.date === today && "ring-1 ring-white/20")}>{d.active ? <Check size={12} /> : d.rest ? <Heart size={11} /> : <span className="size-1 rounded-full bg-white/20" />}</span></div>)}</CardContent>
          <div className="mt-5 border-t border-white/[0.06] pt-4 text-[10px] text-white/40">{Math.floor(m.monthMinutes / 60)}h {m.monthMinutes % 60}m <span className="ml-1 text-white/30">active time this month</span></div>
        </Card>
      </section>

      <section>
        <div className="mb-4"><h3 className="text-[14px] font-semibold">Log your movement</h3><p className="mt-1 text-[11px] text-white/40">There&apos;s no one right way to be active.</p></div>
        <form onSubmit={log} className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Workout type">
            {(Object.keys(workoutKinds) as WorkoutKind[]).map((k) => {
              const Icon = kindIcons[k]
              return <button type="button" role="radio" aria-checked={kind === k} disabled={m.restDay} key={k} onClick={() => setKind(k)} className={cn("movement-card flex items-center gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40", kind === k ? "border-orange-200/25 bg-orange-200/[0.07]" : "border-white/[0.07] bg-[#171a18] hover:border-white/[0.14]")}><span className="grid size-10 place-items-center rounded-xl bg-orange-200/10 text-orange-100"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-white/85">{workoutKinds[k].title}</span><span className="mt-1 block text-[10px] text-white/40">{workoutKinds[k].detail}</span></span>{kind === k && <Check size={15} className="text-orange-100" />}</button>
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="workout-minutes" className="text-[11px] text-white/50">Duration</label>
            <input id="workout-minutes" type="number" min={1} max={1440} value={minutes} disabled={m.restDay} onChange={(e) => setMinutes(e.target.value)} className={cn(inputClass, "w-24 text-center")} />
            <span className="text-[11px] text-white/35">minutes</span>
            <button type="submit" disabled={busy || m.restDay || !(Number(minutes) > 0)} className={cn(primaryButton, "ml-auto")}>{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Plus size={13} />}Log workout</button>
          </div>
        </form>
        {m.sessions.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {m.sessions.map((w) => <div key={w.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"><Check size={14} className="text-orange-100" /><span className="flex-1 text-[11px] text-white/70">{workoutKinds[w.kind as WorkoutKind]?.title ?? w.kind} · {w.duration_min} min</span><button aria-label="Remove workout" onClick={() => deleteWorkout(w.id)} className="rounded-md p-1 text-white/30 hover:text-orange-200"><Trash2 size={13} /></button></div>)}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px]">Body weight</CardTitle><p className="mt-1 text-[10px] text-white/40">A trend, not a verdict.</p></div>{lastWeight != null && <div className="text-right"><div className="text-[20px] font-semibold">{lastWeight} <span className="text-[11px] font-normal text-white/35">kg</span></div>{firstWeight != null && m.weights.length > 1 && <span className="text-[9px] text-lime-200/75">{lastWeight - firstWeight > 0 ? "+" : "−"}{Math.abs(lastWeight - firstWeight).toFixed(1)} kg since {m.weights[0].label}</span>}</div>}</CardHeader>
          <CardContent className="mt-3 p-0">
            {m.weights.length === 0 ? (
              <div className="mt-4"><EmptyState icon={Scale} title="No weight logged yet" description="Log your weight once a week to see the trend." action={<button onClick={() => setMeasureOpen(true)} className={secondaryButton}><Plus size={13} />Log weight</button>} /></div>
            ) : (
              <div className="h-[190px] w-full" role="img" aria-label="Body weight trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.weights} margin={{ top: 12, right: 4, bottom: 0, left: -25 }}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 9 }} tickMargin={8} />
                    <YAxis domain={yDomain} axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 9 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} kg`, "Weight"]} />
                    <Line dataKey="weight" type="monotone" stroke="#f2bd98" strokeWidth={2} dot={{ r: 3, fill: "#f2bd98", stroke: "#171a18", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0"><div><CardTitle className="text-[14px]">Measurements</CardTitle><p className="mt-1 text-[10px] text-white/40">{m.latest ? `Updated ${formatDate(m.latest.measured_on)}` : "Track how your body changes"}</p></div><button onClick={() => setMeasureOpen(true)} className={cn(secondaryButton, "px-2.5 py-1.5 text-[10px]")}><Plus size={12} />Log</button></CardHeader>
          <CardContent className="mt-4 p-0">
            {!m.latest ? <EmptyState icon={Ruler} title="No measurements yet" description="Chest, waist, hips and body fat — log whatever you track." /> : (
              <div className="grid grid-cols-2 gap-2">
                {measureFields.filter((f) => f.key !== "weight_kg").map((f) => {
                  const { value, change } = m.changeFor(f.key)
                  return <div key={f.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="text-[9px] text-white/40">{f.label}</div><div className="mt-2 text-[17px] font-semibold">{value ?? "—"}<span className="ml-1 text-[9px] font-normal text-white/35">{value != null ? f.unit : ""}</span></div><div className="mt-1 text-[9px] text-white/40">{change == null ? "No earlier entry" : `${change > 0 ? "+" : change < 0 ? "−" : "±"}${Math.abs(change).toFixed(1)} since earlier`}</div></div>
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      <MeasurementsDialog open={measureOpen} onOpenChange={setMeasureOpen} latest={m.latest} />
    </div>
  )
}
