"use client"

import { useState } from "react"
import { CircleAlert, CircleCheck, LoaderCircle, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up" | "reset"

const input = "w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-lime-200/30 focus:ring-2 focus:ring-lime-200/10"

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [mode, setMode] = useState<Mode>("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [info, setInfo] = useState<string | null>(null)

  const switchMode = (m: Mode) => { setMode(m); setError(null); setInfo(null) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (mode !== "reset" && password.length < 8) return setError("Password must be at least 8 characters.")
    if (mode === "sign-up" && !name.trim()) return setError("Tell us what to call you.")
    setBusy(true)
    const supabase = createClient()
    const callback = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.assign(next)
        return
      }
      if (mode === "sign-up") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: callback, data: { display_name: name.trim() } } })
        if (error) throw error
        if (data.session) {
          window.location.assign(next)
          return
        }
        setInfo("Check your inbox and click the confirmation link to finish creating your account.")
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/settings` })
        if (error) throw error
        setInfo("If an account exists for that email, a sign-in link is on its way.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
    setBusy(false)
  }

  return (
    <div className="dashboard-app flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="brand-mark grid size-10 place-items-center rounded-xl"><Sparkles size={19} strokeWidth={1.8} /></span>
          <div className="leading-none"><div className="text-[15px] font-bold tracking-[0.16em]">LEVEL UP</div><div className="mt-1.5 text-[10px] tracking-[0.08em] text-white/45">DAYS OF GROWTH</div></div>
        </div>
        <div className="panel-card rounded-2xl border border-white/[0.07] p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-[-0.03em]">{mode === "sign-in" ? "Welcome back" : mode === "sign-up" ? "Start your challenge" : "Reset your password"}</h1>
          <p className="mt-1.5 text-xs text-white/45">{mode === "sign-in" ? "Sign in to pick up where you left off." : mode === "sign-up" ? "Create an account to track your growth." : "We'll email you a link to sign in."}</p>

          {mode !== "reset" && (
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
              {(["sign-in", "sign-up"] as const).map((m) => <button key={m} type="button" onClick={() => switchMode(m)} aria-pressed={mode === m} className={cn("rounded-lg py-2 text-xs transition", mode === m ? "bg-white/[0.08] text-white" : "text-white/45 hover:text-white/75")}>{m === "sign-in" ? "Sign in" : "Create account"}</button>)}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 grid gap-3">
            {mode === "sign-up" && <div><label htmlFor="name" className="mb-1.5 block text-[11px] text-white/55">Your name</label><input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Alex Morgan" /></div>}
            <div><label htmlFor="email" className="mb-1.5 block text-[11px] text-white/55">Email</label><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@example.com" /></div>
            {mode !== "reset" && <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="password" className="block text-[11px] text-white/55">Password</label>{mode === "sign-in" && <button type="button" onClick={() => switchMode("reset")} className="text-[11px] text-white/40 hover:text-lime-200">Forgot password?</button>}</div><input id="password" type="password" required minLength={8} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="At least 8 characters" /></div>}

            {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-3 py-2.5 text-[11px] text-orange-100"><CircleAlert size={14} className="mt-px shrink-0" />{error}</p>}
            {info && <p role="status" className="flex items-start gap-2 rounded-xl border border-lime-200/15 bg-lime-200/[0.05] px-3 py-2.5 text-[11px] text-lime-50"><CircleCheck size={14} className="mt-px shrink-0 text-lime-200" />{info}</p>}

            <button type="submit" disabled={busy} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 text-xs font-semibold text-[#171a14] transition hover:bg-lime-200 disabled:opacity-60">
              {busy && <LoaderCircle size={14} className="animate-spin" />}
              {mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
            </button>
            {mode === "reset" && <button type="button" onClick={() => switchMode("sign-in")} className="text-[11px] text-white/45 hover:text-white">Back to sign in</button>}
          </form>
        </div>
        <p className="mt-6 text-center text-[10px] text-white/30">Your data is private to your account.</p>
      </div>
    </div>
  )
}
