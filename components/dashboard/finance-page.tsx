"use client"

import { useMemo, useState } from "react"
import { ArrowDownRight, Banknote, ChevronRight, LoaderCircle, Plus, Receipt, Sparkles, Target, Trash2, UsersRound, WalletCards, X } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { daysInMonth, formatDate, formatMonth, monthKey, shiftMonth } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { transactionCategories } from "./data"
import { clampPct, formatMoney, monthlySeries, monthTotals, percentChange } from "./metrics"
import { useAppData, type Transaction } from "./store"
import { axisTick, Delta, dialogClass, EmptyState, Field, inputClass, Legend, MetricCard, PageHeading, primaryButton, secondaryButton, tooltipStyle } from "./ui"

const tones = ["text-violet-100 bg-violet-300/10", "text-sky-100 bg-sky-300/10", "text-rose-100 bg-rose-300/10", "text-emerald-100 bg-emerald-300/10", "text-amber-100 bg-amber-300/10"]

function AddTransactionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { today, profile, addTransaction } = useAppData()
  const [kind, setKind] = useState<Transaction["kind"]>("income")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState(transactionCategories.income[0])
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const reset = () => { setKind("income"); setDescription(""); setCategory(transactionCategories.income[0]); setAmount(""); setDate(today); setError("") }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!description.trim()) return setError("Add a short description.")
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than zero.")
    if (!date || date > today) return setError("Choose a date that isn't in the future.")
    setBusy(true)
    const ok = await addTransaction({ kind, description: description.trim(), category, amount: Math.round(value * 100) / 100, occurred_on: date })
    setBusy(false)
    if (ok) { reset(); onOpenChange(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className={dialogClass}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader><DialogTitle className="text-base font-semibold">Add transaction</DialogTitle><DialogDescription className="text-white/45">Record money coming in or going out.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-1">
            {(["income", "expense"] as const).map((k) => <button type="button" key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setCategory(transactionCategories[k][0]) }} className={cn("rounded-lg py-2 text-xs capitalize transition", kind === k ? (k === "income" ? "bg-emerald-200/15 text-emerald-100" : "bg-orange-200/15 text-orange-100") : "text-white/45 hover:text-white/75")}>{k}</button>)}
          </div>
          <Field label="Description" htmlFor="tx-description"><input id="tx-description" autoFocus maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === "income" ? "Brand strategy · Northstar" : "Groceries"} className={inputClass} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Amount (${profile.currency})`} htmlFor="tx-amount"><input id="tx-amount" inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputClass} /></Field>
            <Field label="Date" htmlFor="tx-date"><input id="tx-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputClass, "[color-scheme:dark]")} /></Field>
          </div>
          <Field label="Category" htmlFor="tx-category"><select id="tx-category" value={category} onChange={(e) => setCategory(e.target.value)} className={cn(inputClass, "bg-[#1b1e1c]")}>{transactionCategories[kind].map((c) => <option key={c}>{c}</option>)}</select></Field>
          {error && <p role="alert" className="text-[11px] text-orange-200">{error}</p>}
          <DialogFooter className="border-white/[0.07] bg-white/[0.025]">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}Save transaction</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ClientsCard() {
  const { clients, addClient, deleteClient } = useAppData()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const ok = await addClient({ name: name.trim(), note: note.trim() })
    setBusy(false)
    if (ok) { setName(""); setNote(""); setAdding(false) }
  }
  return (
    <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
      <CardHeader className="flex-row items-center justify-between p-0"><div><CardTitle className="text-[14px]">Client momentum</CardTitle><p className="mt-1 text-[10px] text-white/40">Keep the conversations going.</p></div><button aria-label={adding ? "Cancel adding client" : "Add client"} onClick={() => setAdding((v) => !v)} className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/[0.05] hover:text-white">{adding ? <X size={15} /> : <Plus size={15} />}</button></CardHeader>
      <CardContent className="mt-4 flex flex-col gap-2 p-0">
        {adding && (
          <form onSubmit={submit} className="mb-2 grid gap-2 rounded-xl border border-white/[0.07] bg-black/15 p-3">
            <input aria-label="Client name" autoFocus maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Client or lead name" className={inputClass} />
            <input aria-label="Next step" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Next step · e.g. follow up Thursday" className={inputClass} />
            <button type="submit" disabled={busy || !name.trim()} className={cn(primaryButton, "py-2")}>{busy && <LoaderCircle size={13} className="animate-spin" />}Add client</button>
          </form>
        )}
        {clients.length === 0 && !adding && <EmptyState icon={UsersRound} title="No clients yet" description="Track leads and clients with a quick note on the next step." action={<button onClick={() => setAdding(true)} className={secondaryButton}><Plus size={13} />Add client</button>} />}
        {clients.map((client, i) => (
          <div key={client.id} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.025]">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-medium", tones[i % tones.length])}>{client.name[0]?.toUpperCase()}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium text-white/75">{client.name}</div>{client.note && <div className="mt-1 truncate text-[9px] text-white/35">{client.note}</div>}</div>
            <button aria-label={`Remove ${client.name}`} onClick={() => { if (confirm(`Remove ${client.name}?`)) void deleteClient(client.id) }} className="rounded-lg p-1.5 text-white/25 opacity-0 transition hover:bg-white/[0.05] hover:text-orange-200 focus:opacity-100 group-hover:opacity-100"><Trash2 size={13} /></button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function FinancePage() {
  const { profile, today, transactions, deleteTransaction } = useAppData()
  const [months, setMonths] = useState(6)
  const [showAll, setShowAll] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const currency = profile.currency
  const money = (v: number) => formatMoney(v, currency)

  const m = useMemo(() => {
    const key = monthKey(today)
    const current = monthTotals(transactions, key)
    const previous = monthTotals(transactions, shiftMonth(key, -1))
    const series = monthlySeries(transactions, today, months).map((s) => ({ ...s, month: formatMonth(s.key) }))
    const dayOfMonth = Number(today.slice(8, 10))
    const projected = dayOfMonth > 0 ? (current.savings / dayOfMonth) * daysInMonth(key) : 0
    return { current, previous, series, projected }
  }, [transactions, today, months])

  const goal = Number(profile.monthly_savings_goal)
  const savingsPct = goal > 0 ? clampPct((m.current.savings / goal) * 100) : 0
  const remaining = Math.max(goal - m.current.savings, 0)
  const onTrack = m.projected >= goal
  const visible = showAll ? transactions : transactions.slice(0, 6)

  return (
    <div className="flex flex-col gap-7">
      <PageHeading eyebrow="GOAL 01 · FINANCIAL STABILITY" title={<>Money with a little more meaning<span className="text-emerald-200">.</span></>} description="Make thoughtful choices today. Build the kind of stability that lets you breathe." accent="#a5e7c3" action={<button onClick={() => setDialogOpen(true)} className={secondaryButton}><Plus size={14} />Add transaction</button>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Income this month" value={money(m.current.income)} detail={<><Delta value={percentChange(m.current.income, m.previous.income)} /> vs last month</>} icon={Banknote} tone="bg-emerald-200/10 text-emerald-100" />
        <MetricCard label="Total expenses" value={money(m.current.expenses)} detail={<><Delta value={percentChange(m.current.expenses, m.previous.expenses)} invert /> vs last month</>} icon={ArrowDownRight} tone="bg-orange-200/10 text-orange-100" />
        <MetricCard label="Net savings" value={money(m.current.savings)} detail={<><Delta value={percentChange(m.current.savings, m.previous.savings)} /> vs last month</>} icon={WalletCards} tone="bg-lime-200/10 text-lime-100" />
        <MetricCard label="Monthly target" value={money(goal)} detail={remaining > 0 ? `${money(remaining)} to go` : "Target reached"} icon={Target} tone="bg-sky-200/10 text-sky-100" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-start justify-between p-0"><div><CardTitle className="text-[14px] font-semibold">Your money, in motion</CardTitle><p className="mt-1.5 text-[10px] text-white/40">Income, expenses & savings · {currency}</p></div><select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Chart period" className="rounded-lg border border-white/[0.08] bg-[#1b1e1c] px-2.5 py-1.5 text-[10px] text-white/60 outline-none"><option value={6}>6 months</option><option value={12}>12 months</option></select></CardHeader>
          <CardContent className="mt-5 p-0">
            <div className="h-[250px] w-full" role="img" aria-label={`Income, expenses, and savings over the past ${months} months`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.series} margin={{ top: 12, right: 4, bottom: 0, left: -6 }}>
                  <defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#91d9b3" stopOpacity={0.16} /><stop offset="100%" stopColor="#91d9b3" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisTick} tickMargin={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 9 }} tickFormatter={(v) => formatMoney(Number(v), currency, true)} width={56} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [money(Number(value)), name]} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#91d9b3" strokeWidth={2} fill="url(#incomeFill)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#db9e76" strokeWidth={1.5} fill="transparent" />
                  <Area type="monotone" dataKey="savings" name="Savings" stroke="#c5e976" strokeWidth={1.5} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Legend items={[{ label: "Income", color: "#91d9b3" }, { label: "Expenses", color: "#db9e76" }, { label: "Savings", color: "#c5e976" }]} />
          </CardContent>
        </Card>
        <Card className="finance-target relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="relative z-10 flex-row items-start justify-between p-0"><div><div className="text-[10px] font-medium uppercase tracking-[0.13em] text-emerald-100/60">SAVINGS TARGET</div><CardTitle className="mt-2 text-[14px]">Your monthly cushion</CardTitle></div><Target size={17} className="text-emerald-100/55" /></CardHeader>
          <CardContent className="relative z-10 mt-7 p-0">
            <div className="flex items-end justify-between"><div><div className="text-[30px] font-semibold tracking-[-0.06em]">{money(m.current.savings)}</div><div className="mt-1 text-[10px] text-white/40">of {money(goal)} monthly target</div></div><span className="rounded-full bg-emerald-200/10 px-2.5 py-1 text-[10px] text-emerald-100">{savingsPct}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-200 to-lime-200 transition-all" style={{ width: `${savingsPct}%` }} /></div>
            <div className="mt-3 flex justify-between text-[10px] text-white/35"><span>{money(0)}</span><span>{remaining > 0 ? `${money(remaining)} left to goal` : "Goal reached"}</span><span>{formatMoney(goal, currency, true)}</span></div>
            <div className="mt-7 rounded-xl border border-white/[0.08] bg-black/15 p-3.5">
              <div className="flex items-center gap-2 text-[10px] text-white/55"><Sparkles size={13} className="text-lime-200" />{transactions.length === 0 ? "Start tracking" : onTrack ? "You're on track" : "A little behind pace"}</div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">{transactions.length === 0 ? "Add your first transaction to see your savings pace." : onTrack ? "At this pace, you'll reach your target before month end." : `At this pace you'll save about ${money(Math.max(m.projected, 0))} this month.`}</p>
            </div>
          </CardContent>
          <div className="finance-glow pointer-events-none absolute -bottom-16 -right-12 size-52 rounded-full" />
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.7fr]">
        <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
          <CardHeader className="flex-row items-center justify-between p-0"><div><CardTitle className="text-[14px]">Recent transactions</CardTitle><p className="mt-1 text-[10px] text-white/40">A clear view of where it goes.</p></div>{transactions.length > 6 && <button onClick={() => setShowAll((v) => !v)} className="text-[10px] text-white/40 hover:text-white/75">{showAll ? "Show less" : `View all ${transactions.length}`} <ChevronRight size={12} className="ml-1 inline" /></button>}</CardHeader>
          <CardContent className="mt-4 overflow-x-auto p-0">
            {transactions.length === 0 ? (
              <EmptyState icon={Receipt} title="No transactions yet" description="Log income and expenses to see your monthly picture come together." action={<button onClick={() => setDialogOpen(true)} className={secondaryButton}><Plus size={13} />Add transaction</button>} />
            ) : (
              <table className="w-full min-w-[520px] text-left">
                <thead><tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.1em] text-white/30"><th className="pb-3 font-medium">Description</th><th className="pb-3 font-medium">Category</th><th className="pb-3 font-medium">Date</th><th className="pb-3 text-right font-medium">Amount</th><th className="w-8 pb-3"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{visible.map((t) => (
                  <tr key={t.id} className="group border-b border-white/[0.045] last:border-0">
                    <td className="py-3"><div className="flex items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.045] text-[10px] text-white/55">{t.description[0]?.toUpperCase()}</span><span className="text-[10px] text-white/75">{t.description}</span></div></td>
                    <td className="py-3 text-[10px] text-white/40">{t.category}</td>
                    <td className="py-3 text-[10px] text-white/40">{formatDate(t.occurred_on)}</td>
                    <td className={`py-3 text-right text-[10px] font-medium tabular-nums ${t.kind === "income" ? "text-emerald-100" : "text-white/60"}`}>{t.kind === "income" ? "+" : "−"}{money(Number(t.amount))}</td>
                    <td className="py-3 pl-2 text-right"><button aria-label={`Delete ${t.description}`} onClick={() => { if (confirm(`Delete "${t.description}"?`)) void deleteTransaction(t.id) }} className="rounded-md p-1 text-white/25 opacity-0 transition hover:text-orange-200 focus:opacity-100 group-hover:opacity-100"><Trash2 size={12} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <ClientsCard />
      </section>
      <AddTransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
