"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, LoaderCircle, Pencil, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { areaColors, practiceIconNames, tint, type AreaColor, type FocusArea, type PracticeIcon } from "./data"
import { PracticeAreaPage } from "./communication-page"
import { practiceIcons } from "./practice-icons"
import { useAppData } from "./store"
import { dialogClass, EmptyState, Field, inputClass, primaryButton, secondaryButton } from "./ui"

/** Create a new focus area (editing = null) or edit an existing one. Navigates to a newly created area. */
export function AreaDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: FocusArea | null }) {
  const router = useRouter()
  const { addArea, updateArea } = useAppData()
  const [name, setName] = useState(editing?.name ?? "")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [icon, setIcon] = useState<PracticeIcon>(editing?.icon ?? "target")
  const [color, setColor] = useState<AreaColor>(editing?.color ?? "violet")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const accent = areaColors[color]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError("Give your area a name.")
    setBusy(true)
    const input = { name: name.trim(), description: description.trim(), icon, color }
    if (editing) {
      const ok = await updateArea(editing.id, input)
      setBusy(false)
      if (ok) onOpenChange(false)
      return
    }
    const created = await addArea(input)
    setBusy(false)
    if (created) {
      onOpenChange(false)
      router.push(`/areas/${created.id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{editing ? "Edit area" : "New focus area"}</DialogTitle>
            <DialogDescription className="text-white/45">{editing ? "Rename it or change how it looks." : "A new tab in your sidebar with its own daily tasks, like Content Creation or Learning Guitar."}</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="a-name"><input id="a-name" autoFocus maxLength={60} value={name} onChange={(e) => { setName(e.target.value); setError("") }} placeholder="e.g. Content Creation" className={inputClass} /></Field>
          <Field label="Why it matters · optional" htmlFor="a-desc"><input id="a-desc" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Build an audience by sharing what I learn" className={inputClass} /></Field>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">Colour</div>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {(Object.keys(areaColors) as AreaColor[]).map((c) => <button type="button" role="radio" aria-checked={color === c} aria-label={c} key={c} onClick={() => setColor(c)} className={cn("size-8 rounded-full border-2 transition", color === c ? "border-white" : "border-transparent hover:border-white/30")} style={{ backgroundColor: areaColors[c] }} />)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/40">Icon</div>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
              {practiceIconNames.map((n) => {
                const Icon = practiceIcons[n]
                const selected = icon === n
                return <button type="button" role="radio" aria-checked={selected} aria-label={n} key={n} onClick={() => setIcon(n)} className={cn("grid size-9 place-items-center rounded-xl border transition", !selected && "border-white/[0.08] text-white/45 hover:text-white/80")} style={selected ? { borderColor: tint(accent, 0.45), backgroundColor: tint(accent, 0.12), color: accent } : undefined}><Icon size={16} /></button>
              })}
            </div>
          </div>
          {error && <p role="alert" className="text-[11px] text-orange-200">{error}</p>}
          <DialogFooter className="border-white/[0.07] bg-white/[0.025]">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06] hover:text-white">Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy && <LoaderCircle size={13} className="animate-spin" />}{editing ? "Save changes" : "Create area"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CustomAreaPage({ id }: { id: string }) {
  const router = useRouter()
  const { areas, deleteArea } = useAppData()
  const area = areas.find((a) => a.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [editKey, setEditKey] = useState(0)

  if (!area) {
    return <div className="mx-auto mt-16 max-w-md"><EmptyState icon={Compass} title="This area doesn't exist" description="It may have been deleted." action={<Link href="/" className={secondaryButton}>Back to overview</Link>} /></div>
  }

  const accent = areaColors[area.color]
  const remove = async () => {
    if (!confirm(`Delete the "${area.name}" area?\n\nIt will be removed from your sidebar along with its daily tasks.`)) return
    if (await deleteArea(area.id)) router.push("/")
  }

  return (
    <>
      <PracticeAreaPage
        key={area.id}
        areaId={area.id}
        theme={{
          eyebrow: "YOUR FOCUS AREA",
          title: area.name,
          subtitle: area.description || "Small daily steps toward something that matters to you.",
          heroLabel: "Daily progress",
          heroHeadline: "Showing up is how it grows.",
          noun: "task",
          accent,
          icon: practiceIcons[area.icon],
          headerActions: (
            <>
              <button onClick={() => { setEditKey((k) => k + 1); setEditOpen(true) }} className={secondaryButton}><Pencil size={13} />Edit area</button>
              <button onClick={remove} aria-label={`Delete ${area.name}`} className={cn(secondaryButton, "hover:border-orange-300/30 hover:text-orange-200")}><Trash2 size={13} /></button>
            </>
          ),
        }}
      />
      <AreaDialog key={editKey} open={editOpen} onOpenChange={setEditOpen} editing={area} />
    </>
  )
}
