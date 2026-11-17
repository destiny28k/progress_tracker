"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  AudioLines,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Dumbbell,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Search,
  Settings2,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { skipReasons } from "./data"
import { challengeInfo, journalHasContent } from "./metrics"
import { useStore, type Profile } from "./store"
import { dialogClass, primaryButton, ProgressBar } from "./ui"

type NavigationItem = { href: string; label: string; title: string; icon: LucideIcon; keywords: string }

export const navigation: NavigationItem[] = [
  { href: "/", label: "Overview", title: "Overview", icon: LayoutDashboard, keywords: "home dashboard today" },
  { href: "/finance", label: "Finance", title: "Financial stability", icon: WalletCards, keywords: "money income expenses savings transactions clients" },
  { href: "/communication", label: "Communication", title: "Communication", icon: AudioLines, keywords: "speaking practice reading storytelling" },
  { href: "/physique", label: "Physique", title: "Physique", icon: Dumbbell, keywords: "workout fitness weight measurements gym" },
  { href: "/journal", label: "Daily Journal", title: "Daily journal", icon: BookOpen, keywords: "reflection diary notes" },
  { href: "/calendar", label: "Calendar", title: "Calendar", icon: CalendarDays, keywords: "calendar history days month schedule" },
  { href: "/progress", label: "Progress & Analytics", title: "Progress & analytics", icon: ChartNoAxesCombined, keywords: "stats charts consistency streak" },
  { href: "/settings", label: "Settings", title: "Settings", icon: Settings2, keywords: "profile preferences targets goals account" },
]

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="brand-mark grid size-9 place-items-center rounded-xl"><Sparkles aria-hidden="true" size={18} strokeWidth={1.8} /></span>
      <div className="leading-none">
        <div className="text-[14px] font-bold tracking-[0.16em] text-white">LEVEL UP</div>
        <div className="mt-1.5 text-[10px] tracking-[0.08em] text-white/45">DAYS OF GROWTH</div>
      </div>
    </Link>
  )
}

function ChallengeMini({ profile, today }: { profile: Profile; today: string }) {
  const c = challengeInfo(profile, today)
  return (
    <div className="challenge-mini rounded-2xl p-4">
      <div className="flex items-center justify-between"><span className="eyebrow">YOUR CHALLENGE</span>{c.phase === "active" && <span className="challenge-dot" aria-hidden="true" />}</div>
      <div className="mt-3 truncate text-[15px] font-semibold text-white">{profile.challenge_name}</div>
      <div className="mt-1 text-xs text-white/45">{formatDate(profile.start_date, { month: "short", day: "numeric" })} — {formatDate(profile.end_date)}</div>
      <ProgressBar className="mt-4" value={c.pct} label="Challenge progress" />
      <div className="mt-2 flex justify-between text-[10px] text-white/45">
        <span>{c.phase === "upcoming" ? `Starts in ${c.startsIn}d` : c.phase === "finished" ? "Completed" : `Day ${String(c.day).padStart(2, "0")}`}</span>
        <span>{c.total}</span>
      </div>
    </div>
  )
}

function NavLinks({ pathname, onNavigate, compact = false }: { pathname: string; onNavigate?: () => void; compact?: boolean }) {
  return navigation.map(({ href, label, icon: Icon }) => {
    const active = isActive(pathname, href)
    return (
      <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("nav-link flex w-full items-center gap-3 rounded-xl px-3 text-left transition-colors", compact ? "py-3 text-sm" : "py-2.5 text-[13px]", active && "nav-link-active")}>
        <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
        <span>{label}</span>
        {active && !compact && <span className="ml-auto size-1.5 rounded-full bg-lime-300" />}
      </Link>
    )
  })
}

function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])
  return { open, setOpen, ref }
}

function useReminders() {
  const store = useStore()
  return useMemo(() => {
    if (!store.profile) return []
    const c = challengeInfo(store.profile, store.today)
    const items: { text: string; href: string; done: boolean }[] = []
    if (c.phase === "upcoming") return [{ text: `Your challenge starts in ${c.startsIn} day${c.startsIn === 1 ? "" : "s"}`, href: "/settings", done: false }]
    if (c.phase === "finished") return [{ text: "Challenge complete — set new dates to start another round", href: "/settings", done: false }]
    const statuses = Object.values(store.todayStatus)
    const pending = statuses.filter((s) => s === "pending").length
    items.push({ text: pending ? `${pending} communication practice${pending === 1 ? "" : "s"} still open` : "Communication practice handled for today", href: "/communication", done: pending === 0 })
    const todaysWorkouts = store.workouts.filter((w) => w.workout_date === store.today)
    const minutes = todaysWorkouts.reduce((sum, w) => sum + w.duration_min, 0)
    const moved = todaysWorkouts.some((w) => w.kind === "rest") || minutes >= store.profile.fitness_target_min
    items.push({ text: moved ? "Movement target reached" : `${Math.max(store.profile.fitness_target_min - minutes, 0)} min of movement to go`, href: "/physique", done: moved })
    const journaled = store.journal.some((j) => j.entry_date === store.today && journalHasContent(j))
    items.push({ text: journaled ? "Today's reflection is saved" : "Write today's journal reflection", href: "/journal", done: journaled })
    return items
  }, [store.profile, store.today, store.todayStatus, store.workouts, store.journal])
}

function NotificationsMenu() {
  const { open, setOpen, ref } = usePopover()
  const reminders = useReminders()
  const outstanding = reminders.filter((r) => !r.done).length
  return (
    <div className="relative" ref={ref}>
      <button aria-label={`Reminders${outstanding ? `, ${outstanding} open` : ""}`} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="relative grid size-9 place-items-center rounded-xl text-white/60 transition hover:bg-white/[0.05] hover:text-white">
        <Bell size={17} />
        {outstanding > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-lime-300" />}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[290px] rounded-2xl border border-white/10 bg-[#171a18] p-2 shadow-2xl">
          <div className="px-3 pb-2 pt-2 text-[11px] font-semibold text-white/80">Today&apos;s reminders</div>
          {reminders.map((r) => (
            <Link key={r.text} href={r.href} onClick={() => setOpen(false)} className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-[11px] text-white/65 transition hover:bg-white/[0.04]">
              {r.done ? <CircleCheck size={14} className="mt-px shrink-0 text-lime-200/80" /> : <CircleAlert size={14} className="mt-px shrink-0 text-amber-200/80" />}
              <span>{r.text}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileMenu({ name, email, onSignOut }: { name: string; email: string; onSignOut: () => void }) {
  const { open, setOpen, ref } = usePopover()
  return (
    <div className="relative" ref={ref}>
      <button aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition hover:bg-white/[0.04]">
        <span className="avatar-initials grid size-8 place-items-center rounded-full text-[10px] font-semibold">{initials(name)}</span>
        <span className="hidden max-w-[120px] truncate text-xs font-medium text-white/75 sm:block">{name.split(" ")[0]}</span>
        <ChevronDown size={14} className="hidden text-white/35 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[240px] rounded-2xl border border-white/10 bg-[#171a18] p-2 shadow-2xl">
          <div className="border-b border-white/[0.06] px-3 pb-3 pt-2"><div className="truncate text-xs font-medium text-white/85">{name}</div><div className="mt-1 truncate text-[10px] text-white/40">{email}</div></div>
          <Link href="/settings" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] text-white/65 hover:bg-white/[0.04] hover:text-white"><Settings2 size={14} />Settings</Link>
          <button onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[11px] text-white/65 hover:bg-white/[0.04] hover:text-white"><LogOut size={14} />Sign out</button>
        </div>
      )}
    </div>
  )
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const { practices: userPractices } = useStore()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const items = useMemo(() => {
    const pages = navigation.map((n) => ({ label: n.label, hint: "Page", href: n.href, icon: n.icon, keywords: n.keywords }))
    const practices = userPractices.map((a) => ({ label: a.title, hint: "Practice", href: "/communication", icon: AudioLines, keywords: a.description }))
    const q = query.trim().toLowerCase()
    const all = [...pages, ...practices]
    return q ? all.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(q)) : pages
  }, [query, userPractices])
  const go = (href: string) => { onOpenChange(false); setQuery(""); router.push(href) }
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery("") }}>
      <DialogContent className={cn(dialogClass, "gap-0 p-0 sm:max-w-[520px]")} showCloseButton={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
          <Search size={15} className="text-white/35" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, items.length - 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
              if (e.key === "Enter" && items[selected]) go(items[selected].href)
            }}
            placeholder="Search pages and practices…"
            aria-label="Search"
            className="h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/30">ESC</kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-2" role="listbox">
          {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-white/35">No results for “{query}”</div>}
          {items.map((item, i) => (
            <button key={`${item.hint}-${item.label}`} role="option" aria-selected={i === selected} onMouseEnter={() => setSelected(i)} onClick={() => go(item.href)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs", i === selected ? "bg-white/[0.06] text-white" : "text-white/60")}>
              <item.icon size={15} className="text-white/45" /><span className="flex-1">{item.label}</span><span className="text-[10px] text-white/30">{item.hint}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SkipDialog() {
  const { skipTarget, requestSkip, setActivityStatus } = useStore()
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const close = () => { requestSkip(null); setReason(""); setNote("") }
  const confirm = () => {
    if (!skipTarget) return
    void setActivityStatus(skipTarget.id, "skipped", { skipReason: reason || null, note: note.trim() || null })
    close()
  }
  return (
    <Dialog open={!!skipTarget} onOpenChange={(open) => !open && close()}>
      <DialogContent className={cn(dialogClass, "skip-dialog sm:max-w-[440px]")} showCloseButton>
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-amber-300/10 text-amber-200"><CalendarDays size={18} /></div>
          <DialogTitle className="text-lg font-semibold">Take today at your pace</DialogTitle>
          <DialogDescription className="text-white/50">Skipping {skipTarget?.title} today is okay. A little context can help you notice patterns, but it&apos;s entirely optional.</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <div className="text-xs font-medium text-white/75">What&apos;s the reason?</div>
          <div className="mt-3 flex flex-wrap gap-2">{skipReasons.map((r) => <button key={r} aria-pressed={reason === r} className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", reason === r ? "border-lime-300/40 bg-lime-300/10 text-lime-100" : "border-white/10 text-white/55 hover:border-white/20 hover:text-white/80")} onClick={() => setReason(reason === r ? "" : r)}>{r}</button>)}</div>
          <label className="mt-5 block text-xs font-medium text-white/65" htmlFor="skip-note">Add a note <span className="font-normal text-white/30">· optional</span></label>
          <textarea id="skip-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="A sentence for your future self…" rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-lime-300/40 focus:outline-none focus:ring-2 focus:ring-lime-300/10" />
        </div>
        <DialogFooter className="mt-2 border-white/[0.07] bg-white/[0.025]">
          <button className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white" onClick={close}>Keep it pending</button>
          <button className="rounded-lg bg-lime-300 px-4 py-2 text-xs font-semibold text-[#151812] transition hover:bg-lime-200" onClick={confirm}>Save as skipped</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(360px,calc(100%-2rem))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs shadow-2xl", t.tone === "error" ? "border-orange-300/20 bg-[#2a1d17] text-orange-100" : "border-lime-200/15 bg-[#1a1f17] text-lime-50")}>
          {t.tone === "error" ? <CircleAlert size={15} className="mt-px shrink-0" /> : <CircleCheck size={15} className="mt-px shrink-0 text-lime-200" />}
          <span className="flex-1">{t.message}</span>
          <button aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="text-white/40 hover:text-white"><X size={13} /></button>
        </div>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your data">
      <div className="h-20 w-2/3 animate-pulse rounded-2xl bg-white/[0.03]" />
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><div className="h-56 animate-pulse rounded-2xl bg-white/[0.03]" /><div className="h-56 animate-pulse rounded-2xl bg-white/[0.03]" /></div>
      <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/[0.03]" />)}</div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const store = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const current = navigation.find((n) => isActive(pathname, n.href)) ?? navigation[0]
  const name = store.profile?.display_name || store.user.email.split("@")[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="dashboard-app flex min-h-screen text-white">
      <aside className="sidebar sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] px-4 py-6 md:flex">
        <div className="px-2"><Brand /></div>
        <div className="mt-9">{store.profile ? <ChallengeMini profile={store.profile} today={store.today} /> : <div className="h-[138px] animate-pulse rounded-2xl bg-white/[0.03]" />}</div>
        <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Workspace</div>
        <nav aria-label="Main navigation" className="mt-3 flex flex-col gap-1"><NavLinks pathname={pathname} /></nav>
        <div className="mt-auto pt-6">
          <div className="sidebar-note rounded-2xl p-4">
            <div className="flex size-8 items-center justify-center rounded-xl bg-lime-300/10 text-lime-200"><Activity size={16} /></div>
            <p className="mt-3 text-xs font-medium text-white/85">Small steps count.</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/40">Show up for the person you&apos;re becoming.</p>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <button className="fixed inset-0 z-30 bg-black/60 md:hidden" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      {mobileMenuOpen && (
        <aside className="mobile-drawer fixed inset-y-0 left-0 z-40 w-[280px] overflow-y-auto border-r border-white/10 p-5 md:hidden">
          <div className="flex items-center justify-between"><Brand /><button aria-label="Close navigation" className="rounded-lg p-2 text-white/60" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button></div>
          {store.profile && <div className="mt-7"><ChallengeMini profile={store.profile} today={store.today} /></div>}
          <nav aria-label="Mobile navigation" className="mt-6 flex flex-col gap-1"><NavLinks pathname={pathname} compact onNavigate={() => setMobileMenuOpen(false)} /></nav>
        </aside>
      )}

      <div className="min-w-0 flex-1">
        <header className="topbar sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-white/[0.06] bg-[#111411]/85 px-4 backdrop-blur sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-white/70 md:hidden" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={18} /></button>
            <div className="hidden text-xs text-white/35 sm:block">Workspace <span className="mx-2 text-white/20">/</span></div>
            <h1 className="text-[13px] font-medium text-white/85">{current.title}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setPaletteOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 transition hover:border-white/15 lg:flex"><Search size={14} className="text-white/35" /><span className="text-[11px] text-white/35">Search anything</span><kbd className="ml-5 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/30">Ctrl K</kbd></button>
            <button onClick={() => setPaletteOpen(true)} aria-label="Search" className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-white/[0.05] hover:text-white lg:hidden"><Search size={17} /></button>
            <NotificationsMenu />
            <div className="ml-1 border-l border-white/[0.08] pl-2 sm:pl-3"><ProfileMenu name={name} email={store.user.email} onSignOut={store.signOut} /></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-7 sm:px-7 sm:pt-9 lg:px-10 lg:pt-10">
          {store.status === "loading" && <LoadingState />}
          {store.status === "error" && (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-orange-300/15 bg-orange-300/[0.04] p-6 text-center">
              <CircleAlert className="mx-auto text-orange-200" size={22} />
              <h2 className="mt-3 text-sm font-semibold">We couldn&apos;t load your data</h2>
              <p className="mt-1.5 text-xs text-white/45">{store.loadError}</p>
              <RetryButton onRetry={store.reload} />
            </div>
          )}
          {store.status === "ready" && children}
        </main>
      </div>
      <SkipDialog />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toasts />
    </div>
  )
}

function RetryButton({ onRetry }: { onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return <button disabled={busy} onClick={async () => { setBusy(true); await onRetry(); setBusy(false) }} className={cn(primaryButton, "mt-5")}>{busy && <LoaderCircle size={13} className="animate-spin" />}Try again</button>
}
