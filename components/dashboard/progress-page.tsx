"use client"

import { useMemo } from "react"
import { BookOpen, Check, Dumbbell, Heart, Sparkles, Target, TrendingUp, WalletCards } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addDays, dateRange, formatDate, monthKey } from "@/lib/dates"
import { activityCount, buildIndex, challengeInfo, clampPct, consistency, dailyScore, formatMoney, monthTotals, percentChange, weekDates } from "./metrics"
import { areaColors } from "./data"
import { practiceIcons } from "./practice-icons"
import { useAppData } from "./store"
import { axisTick, Delta, Legend, MetricCard, PageHeading, ProgressBar, tooltipStyle } from "./ui"

export function ProgressPage() {
  const { profile, today, practices, practicesFor, areas, logs, workouts, journal, transactions } = useAppData()

  const m = useMemo(() => {
    const index = buildIndex({ practices, logs, workouts, journal, transactions })
    const c = challengeInfo(profile, today)
    const elapsed = c.phase === "upcoming" ? [] : dateRange(c.from, c.to)
    const overall = c.phase === "upcoming" ? null : consistency(index, profile, today, c.to, Math.max(elapsed.length, 1))
    const week = weekDates(today)
    const weekCount = week.filter((d) => d <= today).reduce((s, d) => s + activityCount(index, d), 0)
    const lastWeekCount = weekDates(today, -1).reduce((s, d) => s + activityCount(index, d), 0)
    const resets = logs.filter((l) => l.log_date >= c.from && l.log_date <= c.to && l.status === "skipped").length
      + elapsed.filter((d) => (index.comm.get(d)?.rest ?? 0) > 0 || index.fit.get(d)?.rest).length
    const bars = week.map((d) => ({
      day: formatDate(d, { weekday: "short" }),
      date: d,
      Finance: d > today ? 0 : index.tx.get(d) ?? 0,
      Communication: d > today ? 0 : index.comm.get(d)?.completed ?? 0,
      Physique: d > today ? 0 : index.fit.get(d)?.count ?? 0,
    }))
    const commDone = elapsed.reduce((s, d) => s + (index.comm.get(d)?.completed ?? 0), 0)
    const activeDays = elapsed.filter((d) => (index.fit.get(d)?.count ?? 0) > 0 || index.fit.get(d)?.rest).length
    const savings = monthTotals(transactions, monthKey(today)).savings
    const heat = Array.from({ length: c.total }, (_, i) => {
      const date = addDays(profile.start_date, i)
      return { date, day: i + 1, future: date > today, score: date > today ? 0 : dailyScore(index, date, profile.fitness_target_min) }
    })
    const areaDone = new Map(areas.map((a) => [a.id, elapsed.reduce((s, d) => s + (index.areas.get(a.id)?.days.get(d)?.completed ?? 0), 0)]))
    return { c, elapsed, overall, weekCount, lastWeekCount, resets, bars, commDone, activeDays, savings, heat, areaDone }
  }, [profile, today, practices, areas, logs, workouts, journal, transactions])

  const { c } = m
  const commCount = Math.max(practicesFor(null).length, 1)
  const goalRows: { icon: LucideIcon; label: string; pct: number; color?: string; accent?: string; description: string }[] = [
    { icon: WalletCards, label: "Financial stability", pct: profile.monthly_savings_goal > 0 ? clampPct((m.savings / profile.monthly_savings_goal) * 100) : 0, color: "bg-emerald-200", description: `${formatMoney(m.savings, profile.currency)} of ${formatMoney(profile.monthly_savings_goal, profile.currency)} saved this month` },
    { icon: BookOpen, label: "Communication", pct: m.elapsed.length ? clampPct((m.commDone / (m.elapsed.length * commCount)) * 100) : 0, color: "bg-sky-200", description: `${m.commDone} of ${m.elapsed.length * commCount} practices completed` },
    { icon: Dumbbell, label: "Physique", pct: m.elapsed.length ? clampPct((m.activeDays / m.elapsed.length) * 100) : 0, color: "bg-orange-200", description: `${m.activeDays} of ${m.elapsed.length} days with movement or planned rest` },
    ...areas.map((area) => {
      const count = practicesFor(area.id).length
      const done = m.areaDone.get(area.id) ?? 0
      const possible = m.elapsed.length * count
      return { icon: practiceIcons[area.icon], label: area.name, pct: possible ? clampPct((done / possible) * 100) : 0, accent: areaColors[area.color], description: count ? `${done} of ${possible} tasks completed` : "Add tasks to start tracking" }
    }),
  ]

  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow={`${c.total}-DAY CHALLENGE · ${c.phase === "upcoming" ? `STARTS IN ${c.startsIn} DAYS` : c.phase === "finished" ? "COMPLETE" : `DAY ${String(c.day).padStart(2, "0")}`}`} title={<>Look how far you&apos;re going<span className="text-lime-200">.</span></>} description="Progress is made in the small decisions you repeat. Here's your journey so far." accent="#d5ef9e" action={<span className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-[10px] text-white/55"><span className={c.phase === "active" ? "size-1.5 rounded-full bg-lime-200" : "size-1.5 rounded-full bg-white/30"} />{c.phase === "active" ? "Live challenge" : c.phase === "upcoming" ? "Upcoming" : "Finished"}</span>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Overall progress" value={`${c.pct}%`} detail={`Day ${c.day} of ${c.total}`} icon={Target} tone="bg-lime-200/10 text-lime-100" />
        <MetricCard label="Consistency score" value={m.overall === null ? "—" : `${m.overall}%`} detail="average daily score this challenge" icon={TrendingUp} tone="bg-sky-200/10 text-sky-100" />
        <MetricCard label="Activities this week" value={m.weekCount} detail={<><Delta value={percentChange(m.weekCount, m.lastWeekCount)} /> vs last week</>} icon={Check} tone="bg-emerald-200/10 text-emerald-100" />
        <MetricCard label="Gentle resets" value={m.resets} detail="skips and rest days · no judgment" icon={Heart} tone="bg-violet-200/10 text-violet-100" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px]">Weekly performance</CardTitle><p className="mt-1.5 text-[10px] text-white/40">Logged activities by focus area.</p></div><span className="rounded-lg border border-white/[0.07] px-2.5 py-1.5 text-[10px] text-white/45">This week</span></CardHeader>
          <CardContent className="mt-5 p-0">
            <div className="h-[240px] w-full" role="img" aria-label="Activities this week in finance, communication, and fitness">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.bars} margin={{ top: 8, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisTick} tickMargin={9} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.035)" }} />
                  <Bar dataKey="Finance" fill="#91d9b3" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Communication" fill="#9acde7" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="Physique" fill="#f2bd98" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: "Finance", color: "#91d9b3" }, { label: "Communication", color: "#9acde7" }, { label: "Physique", color: "#f2bd98" }]} />
          </CardContent>
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="p-0"><CardTitle className="text-[14px]">Goal-by-goal progress</CardTitle><p className="mt-1.5 text-[10px] text-white/40">Since your challenge started.</p></CardHeader>
          <CardContent className="mt-5 flex flex-col gap-5 p-0">
            {goalRows.map(({ icon: Icon, label, pct, color, accent, description }, i) => (
              <div key={i}>
                <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-white/[0.045] text-white/65"><Icon size={14} /></span><span className="flex-1 text-[11px] font-medium text-white/75">{label}</span><span className="text-[11px] font-semibold">{pct}%</span></div>
                <ProgressBar className="ml-9 mt-2 bg-white/[0.07]" value={pct} barClassName={color} barColor={accent} label={`${label} progress`} />
                <div className="ml-9 mt-1.5 text-[9px] text-white/35">{description}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px]">Your activity map</CardTitle><p className="mt-1 text-[10px] text-white/40">{c.total} days of showing up, in your own way.</p></div><span className="text-[10px] text-white/40">Day 1 — {c.total}</span></CardHeader>
          <CardContent className="mt-5 p-0">
            <div className="grid grid-cols-9 gap-2 sm:grid-cols-15">
              {m.heat.map((cell) => (
                <div key={cell.date} title={`Day ${cell.day} · ${formatDate(cell.date, { month: "short", day: "numeric" })}${cell.future ? "" : ` · ${cell.score}%`}`} aria-label={`Challenge day ${cell.day}: ${cell.future ? "upcoming" : `${cell.score}% of daily plan`}`} className={`heat-cell aspect-square rounded-md ${cell.date === today ? "ring-1 ring-lime-200/60" : ""}`} style={{ backgroundColor: cell.future ? "rgba(255,255,255,0.02)" : `rgba(194, 235, 119, ${0.05 + (cell.score / 100) * 0.4})` }} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between"><span className="text-[9px] text-white/35">Less activity</span><div className="flex gap-1">{[0.08, 0.18, 0.3, 0.45].map((o) => <span key={o} className="size-2.5 rounded-sm" style={{ backgroundColor: `rgba(194,235,119,${o})` }} />)}</div><span className="text-[9px] text-white/35">More activity</span></div>
          </CardContent>
        </Card>
        <Card className="reflection-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0"><CardTitle className="text-[14px]">Progress isn&apos;t linear</CardTitle><Heart size={16} className="text-rose-200/70" /></CardHeader>
          <CardContent className="mt-3 p-0"><p className="text-[12px] leading-relaxed text-white/60">Rest days, resets, and starting again all belong in your story. The goal is to build something that lasts.</p><div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-[10px] text-lime-100/75"><Sparkles size={13} />Celebrate showing up, not just the numbers.</div></CardContent>
        </Card>
      </section>
    </div>
  )
}
