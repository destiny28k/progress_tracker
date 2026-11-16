"use client"

import { useMemo, useState } from "react"
import { BookOpen, ChevronLeft, ChevronRight, FileText, LoaderCircle, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, monthKey, relativeDay, shiftMonth } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { journalHasContent, journalPreview, journalText, readingTime } from "./metrics"
import { useAppData, type JournalFields } from "./store"
import { EmptyState, PageHeading, primaryButton } from "./ui"

const emptyFields: JournalFields = { accomplished: "", went_wrong: "", learned: "", improve: "", priorities: "" }

const prompts: { key: keyof JournalFields; label: string; hint: string; tint: string; icon: typeof FileText }[] = [
  { key: "accomplished", label: "What did I accomplish today?", hint: "The wins, big or small…", tint: "bg-lime-200/10 text-lime-100", icon: FileText },
  { key: "went_wrong", label: "What didn't go as planned?", hint: "Name it without judgment…", tint: "bg-amber-200/10 text-amber-100", icon: FileText },
  { key: "learned", label: "What did I learn?", hint: "A new perspective, a useful lesson…", tint: "bg-sky-200/10 text-sky-100", icon: FileText },
  { key: "improve", label: "What could I improve?", hint: "One thing to try differently…", tint: "bg-violet-200/10 text-violet-100", icon: FileText },
  { key: "priorities", label: "Tomorrow's priorities", hint: "The one thing I want to make time for…", tint: "bg-lime-200/10 text-lime-100", icon: Target },
]

function JournalEditor({ date }: { date: string }) {
  const { journal, today, saveJournal } = useAppData()
  const saved = journal.find((j) => j.entry_date === date)
  const savedFields: JournalFields = saved ? { accomplished: saved.accomplished, went_wrong: saved.went_wrong, learned: saved.learned, improve: saved.improve, priorities: saved.priorities } : emptyFields
  const [draft, setDraft] = useState<JournalFields | null>(null)
  const [busy, setBusy] = useState(false)
  const fields = draft ?? savedFields
  const dirty = draft !== null && prompts.some((p) => draft[p.key] !== savedFields[p.key])
  const isToday = date === today

  const save = async () => {
    setBusy(true)
    const trimmed = Object.fromEntries(prompts.map((p) => [p.key, fields[p.key].trim()])) as JournalFields
    if (await saveJournal(date, trimmed)) setDraft(null)
    setBusy(false)
  }

  return (
    <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
      <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[15px]">{isToday ? "Today, in your words" : formatDate(date, { weekday: "long", month: "long", day: "numeric" })}</CardTitle><p className="mt-1.5 text-[10px] text-white/40">{isToday ? "There's no perfect way to journal. Start wherever you are." : saved ? "Editing a past reflection." : "Add a reflection for this day."}</p></div><span className="grid size-9 place-items-center rounded-xl bg-violet-200/10 text-violet-100"><BookOpen size={17} /></span></CardHeader>
      <CardContent className="mt-5 flex flex-col gap-4 p-0">
        {prompts.map((prompt) => (
          <div key={prompt.key}>
            <label htmlFor={`journal-${prompt.key}`} className="flex items-center gap-2 text-[11px] font-medium text-white/75"><span className={`grid size-6 place-items-center rounded-lg ${prompt.tint}`}><prompt.icon size={12} /></span>{prompt.label}</label>
            <textarea id={`journal-${prompt.key}`} value={fields[prompt.key]} maxLength={4000} onChange={(e) => setDraft({ ...fields, [prompt.key]: e.target.value })} rows={2} placeholder={prompt.hint} className="mt-2 w-full resize-y rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5 text-xs leading-relaxed text-white/80 placeholder:text-white/25 outline-none transition focus:border-violet-200/25 focus:bg-black/20" />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <span className="text-[10px] text-white/35">{dirty ? "Unsaved changes" : saved ? `Saved · ${new Date(saved.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Private to you · about 2 min"}</span>
          <div className="flex items-center gap-2">
            {dirty && <button onClick={() => setDraft(null)} className="rounded-xl px-3 py-2.5 text-[11px] text-white/45 hover:text-white">Discard</button>}
            <button onClick={save} disabled={busy || !dirty} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}{saved && !dirty ? "Reflection saved" : "Save reflection"}</button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function JournalPage({ initialDate }: { initialDate?: string }) {
  const { today, journal } = useAppData()
  const start = initialDate && initialDate <= today ? initialDate : today
  const [selected, setSelected] = useState(start)
  const [month, setMonth] = useState(monthKey(start))

  const entryDates = useMemo(() => new Set(journal.filter(journalHasContent).map((j) => j.entry_date)), [journal])
  const recent = useMemo(() => journal.filter(journalHasContent).slice(0, 3), [journal])
  const [year, mon] = month.split("-").map(Number)
  const offset = (new Date(year, mon - 1, 1).getDay() + 6) % 7
  const count = new Date(year, mon, 0).getDate()
  const monthEntries = [...entryDates].filter((d) => monthKey(d) === month).length

  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow="YOUR DAILY RESET" title={<>Make space to reflect<span className="text-violet-200">.</span></>} description="A few honest minutes can help you see how far you've come." accent="#d4c0f5" action={selected !== today ? <button onClick={() => { setSelected(today); setMonth(monthKey(today)) }} className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-white/55 hover:text-white">Back to today</button> : <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-white/45">{formatDate(today, { weekday: "long", month: "short", day: "numeric" })}</span>} />
      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <JournalEditor key={selected} date={selected} />
        <Card className="panel-card h-fit rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0"><div><CardTitle className="text-[14px]">Journal history</CardTitle><p className="mt-1 text-[10px] text-white/40">Pick a day to read or edit it.</p></div><div className="flex items-center gap-1"><button aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="grid size-7 place-items-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white"><ChevronLeft size={14} /></button><button aria-label="Next month" disabled={month >= monthKey(today)} onClick={() => setMonth((m) => shiftMonth(m, 1))} className="grid size-7 place-items-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white disabled:opacity-30"><ChevronRight size={14} /></button></div></CardHeader>
          <CardContent className="mt-5 p-0">
            <div className="mb-4 text-[12px] font-medium text-white/80">{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</div>
            <div className="grid grid-cols-7 gap-y-2 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`${d}${i}`} className="pb-2 text-[9px] text-white/30">{d}</span>)}
              {Array.from({ length: offset }).map((_, i) => <span key={`blank-${i}`} />)}
              {Array.from({ length: count }).map((_, i) => {
                const date = `${month}-${String(i + 1).padStart(2, "0")}`
                const hasEntry = entryDates.has(date)
                const isSelected = date === selected
                const future = date > today
                return (
                  <button key={date} disabled={future} onClick={() => setSelected(date)} aria-pressed={isSelected} aria-label={`${formatDate(date, { month: "long", day: "numeric" })}${hasEntry ? ", has reflection" : ""}${date === today ? ", today" : ""}`} className={cn("relative mx-auto grid size-8 place-items-center rounded-full text-[10px] transition disabled:cursor-default disabled:text-white/15", isSelected ? "bg-violet-200 font-semibold text-[#1b1720]" : date === today ? "ring-1 ring-violet-200/50 text-white" : hasEntry ? "text-white/80 hover:bg-white/[0.07]" : "text-white/35 hover:bg-white/[0.05]")}>
                    <span>{i + 1}</span>
                    {hasEntry && <span className={cn("absolute bottom-1 size-1 rounded-full", isSelected ? "bg-[#1b1720]" : "bg-violet-200")} />}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4"><span className="flex items-center gap-1.5 text-[10px] text-white/35"><span className="size-1.5 rounded-full bg-violet-200" /> Days with reflections</span><span className="text-[10px] text-white/55">{monthEntries} entr{monthEntries === 1 ? "y" : "ies"}</span></div>
          </CardContent>
        </Card>
      </section>
      <section>
        <h3 className="mb-4 text-[13px] font-semibold text-white/85">Recent reflections</h3>
        {recent.length === 0 ? <EmptyState icon={BookOpen} title="Your reflections will appear here" description="Save your first entry above to start building your story." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{recent.map((entry) => (
            <button key={entry.id} onClick={() => { setSelected(entry.entry_date); setMonth(monthKey(entry.entry_date)) }} className="panel-card rounded-2xl border border-white/[0.07] p-4 text-left transition hover:border-white/[0.13]">
              <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-violet-100/75">{relativeDay(entry.entry_date, today)}</span><span className="text-[9px] text-white/30">{readingTime(journalText(entry))}</span></div>
              <p className="mt-3 line-clamp-3 text-[11px] leading-relaxed text-white/55">{journalPreview(entry)}</p>
            </button>
          ))}</div>
        )}
      </section>
    </div>
  )
}
