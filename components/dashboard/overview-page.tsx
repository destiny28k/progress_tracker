"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight, AudioLines, BookOpen, Check, ChevronRight, CircleCheck, Clock3, Dumbbell, Flame, Sparkles, Target, WalletCards } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addDays, formatDate, greeting, monthKey, relativeDay, shiftMonth } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ActivityStatus } from "./data"
import { activityCount, buildIndex, challengeInfo, clampPct, consistency, dailyScore, formatMoney, journalHasContent, journalPreview, journalText, monthTotals, percentChange, readingTime, streak, weekDates } from "./metrics"
import { useAppData } from "./store"
import { axisTick, Delta, EmptyState, tooltipStyle } from "./ui"

function SectionHeading({ title, action, href }: { title: string; action?: string; href?: string }) {
  return <div className="mb-4 flex items-center justify-between"><h2 className="text-[14px] font-semibold tracking-[-0.02em] text-white/90">{title}</h2>{action && href && <Link href={href} className="flex items-center gap-1 text-[11px] text-white/40 transition hover:text-lime-200">{action}<ChevronRight size={13} /></Link>}</div>
}

function GoalCard({ icon: Icon, title, caption, metric, metricLabel, progress, tone, href }: { icon: LucideIcon; title: string; caption: string; metric: string; metricLabel: string; progress: number; tone: string; href: string }) {
  return (
    <Link href={href} className="goal-card group flex min-h-[168px] flex-col rounded-2xl border border-white/[0.07] bg-[#171a18] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-[#1a1e1b]">
      <div className="flex w-full items-center justify-between"><span className={`goal-icon grid size-9 place-items-center rounded-xl ${tone}`}><Icon size={17} strokeWidth={1.8} /></span><span className="grid size-7 place-items-center rounded-lg text-white/30 transition group-hover:bg-white/[0.06] group-hover:text-white/80"><ArrowRight size={15} /></span></div>
      <div className="mt-4 flex w-full items-end justify-between gap-3"><div className="min-w-0"><div className="text-[13px] font-semibold text-white/90">{title}</div><div className="mt-1 truncate text-[11px] text-white/40">{caption}</div></div><div className="shrink-0 text-right"><div className="text-[16px] font-semibold tracking-tight text-white">{metric}</div><div className="mt-1 text-[10px] text-white/35">{metricLabel}</div></div></div>
      <div className="mt-auto flex w-full items-center gap-3 pt-4"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]"><div className={`h-full rounded-full ${tone.split(" ").find((c) => c.startsWith("text-"))?.replace("text-", "bg-")}`} style={{ width: `${progress}%` }} /></div><span className="text-[10px] tabular-nums text-white/40">{progress}%</span></div>
    </Link>
  )
}

function statusLabel(status: ActivityStatus) {
  if (status === "completed") return "Completed"
  if (status === "skipped") return "Skipped today"
  if (status === "rest-day") return "Rest day"
  return "Pending"
}

export function OverviewPage() {
  const { profile, today, practices, logs, workouts, journal, transactions, todayStatus, setActivityStatus, requestSkip } = useAppData()

  const m = useMemo(() => {
    const index = buildIndex({ practices, logs, workouts, journal, transactions })
    const challenge = challengeInfo(profile, today)
    const consistencyNow = consistency(index, profile, today)
    const consistencyPrev = consistency(index, profile, today, addDays(today, -7))
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({ date: d, score: d < profile.start_date ? 0 : dailyScore(index, d, profile.fitness_target_min) }))
    const week = weekDates(today)
    const weekBars = week.map((d) => ({ day: formatDate(d, { weekday: "narrow" }), date: d, Activities: d > today ? 0 : activityCount(index, d) }))
    const weekScores = week.map((d) => ({ day: formatDate(d, { weekday: "short" }), Consistency: d > today || d < profile.start_date ? null : dailyScore(index, d, profile.fitness_target_min) }))
    const weekTotal = weekBars.reduce((s, d) => s + d.Activities, 0)
    const lastWeekTotal = weekDates(today, -1).reduce((s, d) => s + activityCount(index, d), 0)
    const month = monthTotals(transactions, monthKey(today))
    const workoutsThisWeek = week.filter((d) => (index.fit.get(d)?.count ?? 0) > 0).length
    const elapsedThisWeek = week.filter((d) => d <= today).length
    const completedToday = Object.values(todayStatus).filter((s) => s === "completed").length
    const skippedToday = Object.values(todayStatus).filter((s) => s === "skipped").length
    const recentJournal = journal.filter(journalHasContent).slice(0, 2)
    const journalThisWeek = journal.filter((j) => j.entry_date >= week[0] && j.entry_date <= today && journalHasContent(j)).length
    return {
      challenge, consistencyNow, consistencyPrev, last14, weekBars, weekScores, weekTotal, lastWeekTotal, month, workoutsThisWeek, elapsedThisWeek,
      completedToday, skippedToday, recentJournal, journalThisWeek,
      streak: streak(index, profile, today),
      prevMonth: monthTotals(transactions, shiftMonth(monthKey(today), -1)),
    }
  }, [profile, today, practices, logs, workouts, journal, transactions, todayStatus])

  const { challenge } = m
  const name = profile.display_name.split(" ")[0] || "there"
  const todayActivities = practices.slice(0, 4)
  const savingsPct = profile.monthly_savings_goal > 0 ? clampPct((m.month.savings / profile.monthly_savings_goal) * 100) : 0
  const ringOffset = 138.23 * (1 - challenge.pct / 100)
  const headline = challenge.phase === "upcoming" ? "Your challenge is about to begin." : challenge.phase === "finished" ? "You finished the challenge." : challenge.day === 1 ? "Your next chapter starts now." : "Keep the momentum going."

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-lime-200/75"><span className="size-1.5 rounded-full bg-lime-300" />{formatDate(today, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.045em] text-white sm:text-[32px]">{greeting()}, {name}<span className="text-lime-200">.</span></h2>
          <p className="mt-2 text-[13px] text-white/45">{m.streak > 1 ? `${m.streak} days in a row. Let's keep it going.` : "A fresh start is a powerful thing. Let's make today count."}</p>
        </div>
        <Link href="/journal" className="inline-flex h-10 items-center gap-2 rounded-xl bg-lime-300 px-4 text-xs font-semibold text-[#171a14] transition hover:bg-lime-200"><BookOpen size={15} />Write a journal entry</Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="challenge-card relative min-h-[228px] overflow-hidden rounded-2xl border border-white/[0.07] p-0">
          <CardContent className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-lime-200/80"><Sparkles size={13} />{challenge.total}-day challenge</div><h3 className="mt-3 text-[20px] font-semibold tracking-[-0.03em] text-white">{headline}</h3><p className="mt-1.5 max-w-[340px] text-xs leading-relaxed text-white/45">Consistency isn&apos;t about being perfect. It&apos;s about coming back to what matters.</p></div>
              <div className="relative grid size-14 shrink-0 place-items-center" role="progressbar" aria-label="Challenge progress" aria-valuemin={0} aria-valuemax={challenge.total} aria-valuenow={challenge.day}>
                <svg aria-hidden="true" viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90"><circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="3" /><circle cx="26" cy="26" r="22" fill="none" stroke="#c9ed83" strokeDasharray="138.23" strokeDashoffset={ringOffset} strokeLinecap="round" strokeWidth="3" /></svg>
                <span className="text-[10px] font-semibold text-lime-100">{challenge.pct}%</span>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
              <div className="flex items-end gap-8">
                <div><div className="text-[32px] font-semibold leading-none tracking-[-0.06em] text-white">{challenge.phase === "upcoming" ? challenge.startsIn : String(challenge.day).padStart(2, "0")}<span className="ml-1 text-[17px] font-medium text-white/35">{challenge.phase === "upcoming" ? "days" : `/ ${challenge.total}`}</span></div><div className="mt-2 text-[10px] uppercase tracking-[0.12em] text-white/40">{challenge.phase === "upcoming" ? "Until you start" : "Day of your challenge"}</div></div>
                <div className="hidden h-9 w-px bg-white/10 sm:block" />
                <div><div className="text-[20px] font-semibold leading-none text-white">{challenge.daysLeft}</div><div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-white/40">Days to go</div></div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2"><span className="grid size-7 place-items-center rounded-lg bg-lime-300/10 text-lime-200"><Flame size={15} /></span><span className="text-[11px] text-white/60"><strong className="font-semibold text-white">{m.streak} day{m.streak === 1 ? "" : "s"}</strong> showing up</span></div>
            </div>
          </CardContent>
          <div className="challenge-glow pointer-events-none absolute -right-10 -top-24 size-[320px] rounded-full" />
          <div className="challenge-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0">
            <div><div className="text-[11px] text-white/42">Your consistency · last 7 days</div><CardTitle className="mt-2 text-[25px] font-semibold tracking-[-0.05em] text-white">{m.consistencyNow ?? 0}<span className="ml-0.5 text-[14px] font-medium text-white/35">%</span></CardTitle><div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/40">{m.consistencyPrev === null ? "Your first week" : <><Delta value={(m.consistencyNow ?? 0) - m.consistencyPrev} suffix=" pts" /> vs previous 7 days</>}</div></div>
            <div className="grid size-11 place-items-center rounded-2xl border border-lime-300/15 bg-lime-300/[0.07] text-lime-200"><Target size={19} /></div>
          </CardHeader>
          <CardContent className="mt-5 p-0">
            <div className="flex h-12 items-end gap-1.5" role="img" aria-label="Daily score over the last 14 days">{m.last14.map((d) => <span key={d.date} title={`${formatDate(d.date, { month: "short", day: "numeric" })}: ${d.score}%`} className={cn("flex-1 rounded-t-sm", d.date === today ? "bg-lime-200" : "bg-lime-200/30")} style={{ height: `${Math.max(d.score, 4)}%` }} />)}</div>
            <div className="mt-3 flex justify-between text-[10px] text-white/35"><span>Last 14 days</span><span>{(m.consistencyNow ?? 0) >= 70 ? "Great momentum" : (m.consistencyNow ?? 0) >= 40 ? "Building rhythm" : "Every day is a new start"}</span></div>
          </CardContent>
        </Card>
      </section>

      <section>
        <SectionHeading title="Your three focus areas" action="View progress" href="/progress" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <GoalCard icon={WalletCards} title="Financial stability" caption={`Income ${formatMoney(m.month.income, profile.currency)} · ${formatMoney(m.month.expenses, profile.currency)} expenses`} metric={formatMoney(m.month.savings, profile.currency)} metricLabel="net savings this month" progress={savingsPct} tone="bg-emerald-400/10 text-emerald-200" href="/finance" />
          <GoalCard icon={AudioLines} title="Communication" caption="Speaking · reading · storytelling" metric={`${m.completedToday}/${Math.max(practices.length, 1)}`} metricLabel="practices done today" progress={clampPct((m.completedToday / Math.max(practices.length, 1)) * 100)} tone="bg-sky-400/10 text-sky-200" href="/communication" />
          <GoalCard icon={Dumbbell} title="Physique" caption={`${profile.fitness_target_min}-minute daily movement target`} metric={`${m.workoutsThisWeek} / ${m.elapsedThisWeek}`} metricLabel="active days this week" progress={clampPct((m.workoutsThisWeek / Math.max(m.elapsedThisWeek, 1)) * 100)} tone="bg-orange-300/10 text-orange-200" href="/physique" />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px] font-semibold text-white/90">Today&apos;s rhythm</CardTitle><p className="mt-1.5 text-[11px] text-white/40">A few intentional minutes go a long way.</p></div><Link href="/communication" className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/[0.05] hover:text-white" aria-label="See all communication activities"><ArrowRight size={16} /></Link></CardHeader>
          <CardContent className="mt-5 flex flex-col gap-2 p-0">{todayActivities.map((item) => {
            const itemStatus = todayStatus[item.id] ?? "pending"
            return (
              <div key={item.id} className="activity-row flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
                <button aria-label={itemStatus === "completed" ? `Undo ${item.title}` : `Complete ${item.title}`} onClick={() => setActivityStatus(item.id, itemStatus === "completed" ? "pending" : "completed")} className={`grid size-[18px] shrink-0 place-items-center rounded-full border transition ${itemStatus === "completed" ? "border-lime-300 bg-lime-300 text-[#171a14]" : "border-white/20 text-transparent hover:border-lime-200/60"}`}><Check size={11} strokeWidth={3} /></button>
                <div className="min-w-0 flex-1"><div className={`truncate text-xs font-medium ${itemStatus === "completed" ? "text-white/45 line-through" : "text-white/80"}`}>{item.title}</div><div className="mt-1 text-[10px] text-white/35">{item.minutes} min <span className="mx-1">·</span> {statusLabel(itemStatus)}</div></div>
                {itemStatus === "pending" && <button onClick={() => requestSkip(item)} className="rounded-lg px-2 py-1.5 text-[10px] text-white/35 transition hover:bg-white/[0.05] hover:text-white/70">Skip</button>}
                {(itemStatus === "skipped" || itemStatus === "rest-day") && <button onClick={() => setActivityStatus(item.id, "pending")} className="rounded-lg px-2 py-1.5 text-[10px] text-amber-100/70 hover:bg-amber-200/[0.07]">Undo</button>}
              </div>
            )
          })}</CardContent>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4"><div className="flex flex-wrap items-center gap-3"><span className="text-[10px] text-white/35"><CircleCheck size={12} className="mr-1 inline text-lime-200/70" />{m.completedToday} completed</span><span className="inline-flex items-center gap-1.5 text-[10px] text-white/35"><span aria-hidden="true" className="size-1.5 rounded-full bg-amber-200/70" />{m.skippedToday} skipped</span></div><Link href="/communication" className="text-[10px] font-medium text-lime-200/80 hover:text-lime-100">See all {Math.max(practices.length, 1)} <ChevronRight size={12} className="ml-0.5 inline" /></Link></div>
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px] font-semibold text-white/90">This week</CardTitle><p className="mt-1.5 text-[11px] text-white/40">Your effort, adding up.</p></div><span className="rounded-lg border border-white/[0.07] px-2 py-1 text-[10px] text-white/45">{formatDate(m.weekBars[0].date, { month: "short", day: "numeric" })} — {formatDate(m.weekBars[6].date, { day: "numeric" })}</span></CardHeader>
          <CardContent className="mt-4 p-0"><div className="h-[180px] w-full" role="img" aria-label="Activities completed each day this week"><ResponsiveContainer width="100%" height="100%"><BarChart data={m.weekBars} margin={{ top: 8, right: 0, bottom: 0, left: -20 }}><CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisTick} tickMargin={9} /><Tooltip cursor={{ fill: "rgba(255,255,255,.035)" }} contentStyle={tooltipStyle} labelFormatter={(_, p) => (p?.[0]?.payload?.date ? formatDate(p[0].payload.date, { weekday: "long", month: "short", day: "numeric" }) : "")} /><Bar dataKey="Activities" fill="#bce96a" radius={[4, 4, 0, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div></CardContent>
          <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="text-[10px] text-white/35">Total activities</span><span className="text-xs font-semibold text-white">{m.weekTotal} <span className="ml-1 text-[10px] font-normal text-white/40"><Delta value={percentChange(m.weekTotal, m.lastWeekTotal)} /> vs last week</span></span></div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px] font-semibold text-white/90">Weekly overview</CardTitle><p className="mt-1.5 text-[11px] text-white/40">Daily score across communication, movement and reflection.</p></div><Link href="/progress" className="text-[10px] text-white/40 hover:text-lime-200">Details <ChevronRight className="ml-1 inline" size={13} /></Link></CardHeader>
          <CardContent className="mt-4 p-0"><div className="h-[150px] w-full" role="img" aria-label="Daily score this week"><ResponsiveContainer width="100%" height="100%"><AreaChart data={m.weekScores} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}><defs><linearGradient id="weekFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bce96a" stopOpacity={0.2} /><stop offset="100%" stopColor="#bce96a" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, "Daily score"]} /><Area type="monotone" dataKey="Consistency" stroke="#bce96a" strokeWidth={2} fill="url(#weekFill)" connectNulls={false} dot={false} activeDot={{ r: 4, fill: "#d7ff8d", stroke: "#1b1e1c", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div></CardContent>
        </Card>
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0"><CardTitle className="text-[14px] font-semibold text-white/90">Recent journal entries</CardTitle><span className="grid size-8 place-items-center rounded-lg bg-violet-300/10 text-violet-200"><BookOpen size={15} /></span></CardHeader>
          <CardContent className="mt-4 flex flex-col gap-4 p-0">
            {m.recentJournal.length === 0 ? (
              <EmptyState icon={BookOpen} title="No reflections yet" description="A few honest minutes at the end of the day help you see how far you've come." />
            ) : m.recentJournal.map((entry, i) => (
              <div key={entry.id} className={cn(i > 0 && "border-t border-white/[0.06] pt-3")}>
                <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-violet-100/75">{relativeDay(entry.entry_date, today)}</span><span className="text-[9px] text-white/30">{readingTime(journalText(entry))}</span></div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/55">{journalPreview(entry)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="text-[10px] text-white/35">{m.journalThisWeek} entr{m.journalThisWeek === 1 ? "y" : "ies"} this week</span><Link href="/journal" className="text-[10px] text-lime-200/80 hover:text-lime-100">Open journal <ArrowRight size={12} className="ml-1 inline" /></Link></div>
          </CardContent>
        </Card>
      </section>
      <div className="flex items-center justify-center gap-1.5 pb-1 text-[10px] text-white/25"><Clock3 size={11} /> Your progress is personal. Keep showing up at your own pace.</div>
    </div>
  )
}
