"use client"

import { useState } from "react"
import { CircleAlert, KeyRound, LoaderCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const input = "w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-lime-200/30 focus:ring-2 focus:ring-lime-200/10"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError("Password must be at least 8 characters.")
    if (password !== confirm) return setError("The two passwords don't match.")
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    window.location.assign("/")
  }

  return (
    <div className="dashboard-app flex min-h-screen items-center justify-center px-4 py-10 text-white">
      <div className="panel-card w-full max-w-[400px] rounded-2xl border border-white/[0.07] p-6 sm:p-7">
        <span className="grid size-10 place-items-center rounded-xl bg-lime-300/10 text-lime-200"><KeyRound size={18} /></span>
        <h1 className="mt-4 text-xl font-semibold tracking-[-0.03em]">Set a new password</h1>
        <p className="mt-1.5 text-xs text-white/45">Choose a password you&apos;ll use to sign in from now on.</p>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <div><label htmlFor="new-password" className="mb-1.5 block text-[11px] text-white/55">New password</label><input id="new-password" type="password" autoComplete="new-password" autoFocus required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="At least 8 characters" /></div>
          <div><label htmlFor="confirm-password" className="mb-1.5 block text-[11px] text-white/55">Confirm password</label><input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} /></div>
          {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-3 py-2.5 text-[11px] text-orange-100"><CircleAlert size={14} className="mt-px shrink-0" />{error}</p>}
          <button type="submit" disabled={busy} className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 text-xs font-semibold text-[#171a14] transition hover:bg-lime-200 disabled:opacity-60">{busy && <LoaderCircle size={14} className="animate-spin" />}Save password &amp; continue</button>
        </form>
      </div>
    </div>
  )
}
