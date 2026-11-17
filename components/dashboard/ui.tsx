"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const tooltipStyle = { background: "#1b1e1c", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, color: "#f4f4f3", fontSize: 11 }
export const axisTick = { fill: "#777e79", fontSize: 10 }

export const inputClass = "w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5 text-xs text-white/85 placeholder:text-white/25 outline-none transition focus:border-lime-200/30 focus:ring-2 focus:ring-lime-200/10 disabled:opacity-50"
export const labelClass = "block text-[10px] font-medium uppercase tracking-[0.1em] text-white/40"
export const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 py-2.5 text-[11px] font-semibold text-[#171a14] transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
export const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-2.5 text-[11px] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
export const dialogClass = "border border-white/10 bg-[#171a18] text-white sm:max-w-[460px]"

export function PageHeading({ eyebrow, title, description, accent, action }: { eyebrow: string; title: React.ReactNode; description: string; accent: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>{eyebrow}</div>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.045em] sm:text-[32px]">{title}</h2>
        <p className="mt-2 text-[13px] text-white/45">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Delta({ value, suffix = "%", invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null) return <span className="text-white/35">new</span>
  const good = invert ? value <= 0 : value >= 0
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight
  return <span className={cn("inline-flex items-center gap-0.5", value === 0 ? "text-white/40" : good ? "text-lime-200/80" : "text-orange-200/80")}><Icon size={12} />{Math.abs(value)}{suffix}</span>
}

export function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: React.ReactNode; detail: React.ReactNode; icon: LucideIcon; tone: string }) {
  return (
    <Card className="panel-card rounded-2xl border border-white/[0.07] p-4 sm:p-5">
      <div className="flex items-start justify-between"><span className="text-[11px] text-white/45">{label}</span><span className={cn("grid size-8 place-items-center rounded-lg", tone)}><Icon size={15} /></span></div>
      <div className="mt-3 text-[23px] font-semibold tracking-[-0.04em]">{value}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-white/35">{detail}</div>
    </Card>
  )
}

export function ProgressBar({ value, className, barClassName = "bg-lime-300", barColor, label }: { value: number; className?: string; barClassName?: string; barColor?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-white/10", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className={cn("h-full rounded-full transition-all duration-500", !barColor && barClassName)} style={{ width: `${pct}%`, backgroundColor: barColor }} />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
      <span className="grid size-9 place-items-center rounded-xl bg-white/[0.04] text-white/40"><Icon size={16} /></span>
      <div className="mt-3 text-xs font-medium text-white/70">{title}</div>
      <p className="mt-1 max-w-[280px] text-[11px] leading-relaxed text-white/35">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-4 border-t border-white/[0.06] pt-3">
      {items.map((item) => <div className="flex items-center gap-2 text-[10px] text-white/45" key={item.label}><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</div>)}
    </div>
  )
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1.5 text-[10px] text-white/30">{hint}</p>}
    </div>
  )
}
