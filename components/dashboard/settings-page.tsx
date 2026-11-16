"use client"

import { useState } from "react"
import { Dumbbell, LoaderCircle, LogOut, Target, UserRound, WalletCards } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addDays, diffDays } from "@/lib/dates"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { currencies } from "./data"
import { useAppData, type Profile } from "./store"
import { Field, inputClass, PageHeading, primaryButton, secondaryButton } from "./ui"

type Form = {
  display_name: string
  challenge_name: string
  start_date: string
  end_date: string
  fitness_target_min: string
  communication_target_min: string
  journal_target_min: string
  monthly_savings_goal: string
  monthly_income_goal: string
  currency: string
}

const toForm = (p: Profile): Form => ({
  display_name: p.display_name,
  challenge_name: p.challenge_name,
  start_date: p.start_date,
  end_date: p.end_date,
  fitness_target_min: String(p.fitness_target_min),
  communication_target_min: String(p.communication_target_min),
  journal_target_min: String(p.journal_target_min),
  monthly_savings_goal: String(Number(p.monthly_savings_goal)),
  monthly_income_goal: String(Number(p.monthly_income_goal)),
  currency: p.currency,
})

function validate(f: Form) {
  if (!f.display_name.trim()) return "Display name can't be empty."
  if (!f.challenge_name.trim()) return "Give your challenge a name."
  if (!f.start_date || !f.end_date) return "Choose start and end dates."
  if (f.end_date < f.start_date) return "End date must be on or after the start date."
  if (diffDays(f.end_date, f.start_date) > 365) return "Keep the challenge to a year or less."
  for (const key of ["fitness_target_min", "communication_target_min", "journal_target_min"] as const) {
    const n = Number(f[key])
    if (!Number.isInteger(n) || n < 0 || n > 600) return "Daily targets must be whole minutes between 0 and 600."
  }
  for (const key of ["monthly_savings_goal", "monthly_income_goal"] as const) {
    const n = Number(f[key])
    if (!Number.isFinite(n) || n < 0) return "Financial targets must be zero or more."
  }
  return null
}

/** Not a <form>: it sits inside the settings form, and nested forms are invalid HTML. */
function ChangePassword() {
  const { notify } = useAppData()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const change = async () => {
    if (password.length < 8) return setError("Use at least 8 characters.")
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    setPassword("")
    setError(null)
    notify("Password updated")
  }
  return (
    <div>
      <Field label="New password" htmlFor="s-password">
        <div className="flex gap-2">
          <input id="s-password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null) }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void change() } }} placeholder="At least 8 characters" className={inputClass} />
          <button type="button" disabled={busy || !password} onClick={change} className={cn(secondaryButton, "shrink-0")}>{busy && <LoaderCircle size={13} className="animate-spin" />}Update</button>
        </div>
      </Field>
      {error && <p role="alert" className="mt-1.5 text-[10px] text-orange-200">{error}</p>}
    </div>
  )
}

export function SettingsPage() {
  const { profile, user, today, updateProfile, signOut } = useAppData()
  const [form, setForm] = useState<Form>(() => toForm(profile))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const original = toForm(profile)
  const dirty = (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== original[k])
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setForm((f) => ({ ...f, [key]: e.target.value })); setError(null) }
  const length = form.start_date && form.end_date && form.end_date >= form.start_date ? diffDays(form.end_date, form.start_date) + 1 : null

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const problem = validate(form)
    if (problem) return setError(problem)
    setBusy(true)
    const ok = await updateProfile({
      display_name: form.display_name.trim(),
      challenge_name: form.challenge_name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      fitness_target_min: Number(form.fitness_target_min),
      communication_target_min: Number(form.communication_target_min),
      journal_target_min: Number(form.journal_target_min),
      monthly_savings_goal: Number(form.monthly_savings_goal),
      monthly_income_goal: Number(form.monthly_income_goal),
      currency: form.currency,
    })
    setBusy(false)
    // Normalise the form to exactly what was stored so it no longer reads as "dirty".
    if (ok) setForm((f) => ({
      ...f,
      display_name: f.display_name.trim(),
      challenge_name: f.challenge_name.trim(),
      fitness_target_min: String(Number(f.fitness_target_min)),
      communication_target_min: String(Number(f.communication_target_min)),
      journal_target_min: String(Number(f.journal_target_min)),
      monthly_savings_goal: String(Number(f.monthly_savings_goal)),
      monthly_income_goal: String(Number(f.monthly_income_goal)),
    }))
  }

  const resetDefaults = () => {
    setForm((f) => ({ ...f, challenge_name: "45 Days of Growth", start_date: today, end_date: addDays(today, 44), fitness_target_min: "30", communication_target_min: "50", journal_target_min: "5", monthly_savings_goal: "2500", monthly_income_goal: "5000" }))
    setError(null)
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-7">
      <PageHeading eyebrow="YOUR SPACE · YOUR RULES" title={<>Make it yours<span className="text-lime-200">.</span></>} description="Adjust your challenge and the way you want to grow." accent="#d5ef9e" />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="flex flex-col gap-4">
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-center gap-3 p-0"><span className="grid size-9 place-items-center rounded-xl bg-violet-200/10 text-violet-100"><UserRound size={16} /></span><div><CardTitle className="text-[13px]">Profile</CardTitle><p className="mt-1 text-[10px] text-white/40">How you appear in your workspace.</p></div></CardHeader>
            <CardContent className="mt-5 grid gap-3 p-0">
              <Field label="Display name" htmlFor="s-name"><input id="s-name" maxLength={80} value={form.display_name} onChange={set("display_name")} className={inputClass} /></Field>
              <Field label="Email" htmlFor="s-email" hint="Your sign-in email can't be changed here."><input id="s-email" value={user.email} readOnly disabled className={inputClass} /></Field>
            </CardContent>
          </Card>
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="p-0"><CardTitle className="text-[13px]">Account</CardTitle><p className="mt-1 text-[10px] text-white/40">Your data is private to you and stored securely in Supabase.</p></CardHeader>
            <CardContent className="mt-4 grid gap-4 p-0">
              <ChangePassword />
              <div className="border-t border-white/[0.06] pt-4"><button type="button" onClick={signOut} className={secondaryButton}><LogOut size={13} />Sign out</button></div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-center gap-3 p-0"><span className="grid size-9 place-items-center rounded-xl bg-lime-200/10 text-lime-100"><Target size={16} /></span><div><CardTitle className="text-[13px]">Challenge</CardTitle><p className="mt-1 text-[10px] text-white/40">{length ? `${length} intentional days, from start to finish.` : "Intentional days, from start to finish."}</p></div></CardHeader>
            <CardContent className="mt-5 grid gap-3 p-0 sm:grid-cols-3">
              <Field label="Challenge name" htmlFor="s-challenge"><input id="s-challenge" maxLength={80} value={form.challenge_name} onChange={set("challenge_name")} className={inputClass} /></Field>
              <Field label="Start date" htmlFor="s-start"><input id="s-start" type="date" value={form.start_date} onChange={set("start_date")} className={cn(inputClass, "[color-scheme:dark]")} /></Field>
              <Field label="End date" htmlFor="s-end"><input id="s-end" type="date" min={form.start_date} value={form.end_date} onChange={set("end_date")} className={cn(inputClass, "[color-scheme:dark]")} /></Field>
            </CardContent>
          </Card>
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-center gap-3 p-0"><span className="grid size-9 place-items-center rounded-xl bg-sky-200/10 text-sky-100"><Dumbbell size={16} /></span><div><CardTitle className="text-[13px]">Daily activity targets</CardTitle><p className="mt-1 text-[10px] text-white/40">Flexible goals that help you build a rhythm.</p></div></CardHeader>
            <CardContent className="mt-5 flex flex-col gap-2 p-0">
              {([{ key: "fitness_target_min", label: "Fitness movement" }, { key: "communication_target_min", label: "Communication practice" }, { key: "journal_target_min", label: "Journal reflection" }] as const).map((t) => (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5" key={t.key}>
                  <label htmlFor={`s-${t.key}`} className="flex-1 text-[11px] text-white/70">{t.label}</label>
                  <input id={`s-${t.key}`} type="number" min={0} max={600} step={1} value={form[t.key]} onChange={set(t.key)} className="w-16 rounded-lg border border-white/[0.07] bg-black/15 px-2 py-1.5 text-center text-[11px] text-white/80 outline-none focus:border-sky-200/25" />
                  <span className="w-[80px] text-[9px] text-white/35">minutes / day</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="panel-card rounded-2xl border border-white/[0.07] p-5 sm:p-6">
            <CardHeader className="flex-row items-center gap-3 p-0"><span className="grid size-9 place-items-center rounded-xl bg-emerald-200/10 text-emerald-100"><WalletCards size={16} /></span><div><CardTitle className="text-[13px]">Financial targets</CardTitle><p className="mt-1 text-[10px] text-white/40">Set your own definition of financial progress.</p></div></CardHeader>
            <CardContent className="mt-5 grid gap-3 p-0 sm:grid-cols-3">
              <Field label="Currency" htmlFor="s-currency"><select id="s-currency" value={form.currency} onChange={set("currency")} className={cn(inputClass, "bg-[#1b1e1c]")}>{currencies.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Monthly savings goal" htmlFor="s-savings"><input id="s-savings" type="number" min={0} step="any" value={form.monthly_savings_goal} onChange={set("monthly_savings_goal")} className={inputClass} /></Field>
              <Field label="Monthly income goal" htmlFor="s-income"><input id="s-income" type="number" min={0} step="any" value={form.monthly_income_goal} onChange={set("monthly_income_goal")} className={inputClass} /></Field>
            </CardContent>
          </Card>
          {error && <p role="alert" className="rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-3 py-2.5 text-[11px] text-orange-100">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button type="button" onClick={resetDefaults} className="text-[10px] text-white/35 hover:text-white/60">Reset to defaults</button>
            <div className="flex items-center gap-2">
              {dirty && <button type="button" onClick={() => { setForm(original); setError(null) }} className="rounded-xl px-3 py-2.5 text-[11px] text-white/45 hover:text-white">Discard changes</button>}
              <button type="submit" disabled={busy || !dirty} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}{dirty ? "Save preferences" : "All changes saved"}</button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
