"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { PostgrestError } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types"
import { addDays, todayISO } from "@/lib/dates"
import { areaColors, practiceIconNames, type ActivityItem, type ActivityStatus, type AreaColor, type FocusArea, type PracticeIcon } from "./data"

export type Profile = Tables<"profiles">
export type PracticeRow = Tables<"practices">
export type AreaRow = Tables<"focus_areas">
export type PracticeInput = { title: string; description: string; minutes: number; icon: PracticeIcon }
export type AreaInput = { name: string; description: string; icon: PracticeIcon; color: AreaColor }

const asIcon = (value: string): PracticeIcon => ((practiceIconNames as readonly string[]).includes(value) ? (value as PracticeIcon) : "target")

const toArea = (row: AreaRow): FocusArea => ({
  id: row.id,
  name: row.name,
  description: row.description,
  icon: asIcon(row.icon),
  color: row.color in areaColors ? (row.color as AreaColor) : "violet",
})

const toActivity = (row: PracticeRow): ActivityItem => ({
  id: row.key,
  rowId: row.id,
  areaId: row.area_id,
  title: row.title,
  description: row.description,
  minutes: row.minutes,
  icon: (practiceIconNames as readonly string[]).includes(row.icon) ? (row.icon as PracticeIcon) : "thought",
})
export type ActivityLog = Tables<"activity_logs">
export type PracticeNote = Tables<"practice_notes">
export type Transaction = Tables<"transactions">
export type Client = Tables<"clients">
export type Workout = Tables<"workouts">
export type BodyMetric = Tables<"body_metrics">
export type JournalEntry = Tables<"journal_entries">
export type JournalFields = Pick<JournalEntry, "accomplished" | "went_wrong" | "learned" | "improve" | "priorities">

type Toast = { id: number; message: string; tone: "success" | "error" }

type StoreState = {
  profile: Profile | null
  areaRows: AreaRow[]
  practiceRows: PracticeRow[]
  logs: ActivityLog[]
  notes: PracticeNote[]
  transactions: Transaction[]
  clients: Client[]
  workouts: Workout[]
  bodyMetrics: BodyMetric[]
  journal: JournalEntry[]
}

const emptyState: StoreState = { profile: null, areaRows: [], practiceRows: [], logs: [], notes: [], transactions: [], clients: [], workouts: [], bodyMetrics: [], journal: [] }

type StoreValue = StoreState & {
  user: { id: string; email: string }
  today: string
  status: "loading" | "ready" | "error"
  loadError: string | null
  reload: () => Promise<void>
  toasts: Toast[]
  notify: (message: string, tone?: Toast["tone"]) => void
  dismissToast: (id: number) => void
  /** The user's custom focus areas (shown as sidebar tabs). */
  areas: FocusArea[]
  addArea: (input: AreaInput) => Promise<FocusArea | null>
  updateArea: (id: string, input: AreaInput) => Promise<boolean>
  deleteArea: (id: string) => Promise<boolean>
  /** Every active practice across all areas, in display order. */
  practices: ActivityItem[]
  /** Practices for one area; null = Communication. */
  practicesFor: (areaId: string | null) => ActivityItem[]
  addPractice: (input: PracticeInput, areaId: string | null) => Promise<boolean>
  updatePractice: (rowId: string, input: PracticeInput) => Promise<boolean>
  deletePractice: (rowId: string) => Promise<void>
  todayStatus: Record<string, ActivityStatus>
  skipTarget: ActivityItem | null
  requestSkip: (activity: ActivityItem | null) => void
  setActivityStatus: (activityId: string, status: ActivityStatus, extra?: { skipReason?: string | null; note?: string | null }) => Promise<void>
  setRestDay: (areaId: string | null, on: boolean) => Promise<void>
  savePracticeNote: (note: string) => Promise<boolean>
  addTransaction: (input: Omit<TablesInsert<"transactions">, "user_id">) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<void>
  addClient: (input: { name: string; note: string }) => Promise<boolean>
  deleteClient: (id: string) => Promise<void>
  addWorkout: (input: { kind: Workout["kind"]; duration_min: number }) => Promise<boolean>
  deleteWorkout: (id: string) => Promise<void>
  setWorkoutRestDay: (on: boolean) => Promise<void>
  saveBodyMetric: (input: Omit<TablesInsert<"body_metrics">, "user_id">) => Promise<boolean>
  saveJournal: (date: string, fields: JournalFields) => Promise<boolean>
  updateProfile: (patch: TablesUpdate<"profiles">) => Promise<boolean>
  signOut: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error("useStore must be used inside <DataProvider>")
  return value
}

/** Same as useStore, but guarantees the profile is loaded (use inside the ready app shell). */
export function useAppData() {
  const store = useStore()
  if (!store.profile) throw new Error("Profile not loaded")
  return store as StoreValue & { profile: Profile }
}

const byDateDesc = <T,>(key: keyof T) => (a: T, b: T) => String(b[key]).localeCompare(String(a[key]))

export function DataProvider({ user, children }: { user: { id: string; email: string }; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState<StoreState>(emptyState)
  const [status, setStatus] = useState<StoreValue["status"]>("loading")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [skipTarget, setSkipTarget] = useState<ActivityItem | null>(null)
  const toastId = useRef(0)

  // Roll over to a new day while the app stays open.
  useEffect(() => {
    const timer = setInterval(() => setToday((current) => (current === todayISO() ? current : todayISO())), 30_000)
    return () => clearInterval(timer)
  }, [])

  const dismissToast = useCallback((id: number) => setToasts((current) => current.filter((t) => t.id !== id)), [])
  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3000)
  }, [dismissToast])

  const reload = useCallback(async () => {
    const since = addDays(todayISO(), -400)
    const [profile, areaRows, practiceRows, logs, notes, transactions, clients, workouts, bodyMetrics, journal] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("focus_areas").select("*").eq("archived", false).order("position", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("practices").select("*").eq("archived", false).order("position", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("activity_logs").select("*").gte("log_date", since),
      supabase.from("practice_notes").select("*").gte("note_date", since),
      supabase.from("transactions").select("*").gte("occurred_on", since).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: true }),
      supabase.from("workouts").select("*").gte("workout_date", since),
      supabase.from("body_metrics").select("*").order("measured_on", { ascending: true }),
      supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }),
    ])
    const error = [profile, areaRows, practiceRows, logs, notes, transactions, clients, workouts, bodyMetrics, journal].find((r) => r.error)?.error
    if (error) {
      setLoadError(error.message)
      setStatus("error")
      return
    }
    let profileRow = profile.data
    if (!profileRow) {
      // Safety net in case the sign-up trigger did not create the profile.
      const created = await supabase.from("profiles").insert({ id: user.id, display_name: user.email.split("@")[0] }).select().single()
      if (created.error) {
        setLoadError(created.error.message)
        setStatus("error")
        return
      }
      profileRow = created.data
    }
    setState({
      profile: profileRow,
      areaRows: areaRows.data ?? [],
      practiceRows: practiceRows.data ?? [],
      logs: logs.data ?? [],
      notes: notes.data ?? [],
      transactions: transactions.data ?? [],
      clients: clients.data ?? [],
      workouts: workouts.data ?? [],
      bodyMetrics: bodyMetrics.data ?? [],
      journal: journal.data ?? [],
    })
    setLoadError(null)
    setStatus("ready")
  }, [supabase, user.id, user.email])

  useEffect(() => {
    // Initial fetch from Supabase; state is set once the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  /** Report a failed write and resync with the database so the UI never shows unsaved data. */
  const fail = useCallback((error: PostgrestError | Error, fallback = "Something went wrong. Please try again.") => {
    console.error(error)
    notify(error.message || fallback, "error")
    void reload()
  }, [notify, reload])

  const areas = useMemo(() => state.areaRows.map(toArea), [state.areaRows])
  const areaIds = useMemo(() => new Set(state.areaRows.map((a) => a.id)), [state.areaRows])
  // Practices in a deleted area are hidden everywhere.
  const practices = useMemo(() => state.practiceRows.filter((p) => !p.area_id || areaIds.has(p.area_id)).map(toActivity), [state.practiceRows, areaIds])
  const practicesFor = useCallback((areaId: string | null) => practices.filter((p) => p.areaId === areaId), [practices])

  const addArea = useCallback(async (input: AreaInput) => {
    const position = state.areaRows.reduce((max, a) => Math.max(max, a.position), -1) + 1
    const { data, error } = await supabase.from("focus_areas").insert({ ...input, position, user_id: user.id }).select().single()
    if (error) { fail(error); return null }
    setState((s) => ({ ...s, areaRows: [...s.areaRows, data] }))
    notify(`"${data.name}" added to your sidebar`)
    return toArea(data)
  }, [supabase, user.id, state.areaRows, fail, notify])

  const updateArea = useCallback(async (id: string, input: AreaInput) => {
    const { data, error } = await supabase.from("focus_areas").update(input).eq("id", id).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, areaRows: s.areaRows.map((a) => (a.id === id ? data : a)) }))
    notify("Area updated")
    return true
  }, [supabase, fail, notify])

  /** Archives the area; its tasks disappear from lists but past history stays in the database. */
  const deleteArea = useCallback(async (id: string) => {
    const { error } = await supabase.from("focus_areas").update({ archived: true }).eq("id", id)
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, areaRows: s.areaRows.filter((a) => a.id !== id) }))
    notify("Area deleted")
    return true
  }, [supabase, fail, notify])

  const todayStatus = useMemo(() => {
    const result: Record<string, ActivityStatus> = Object.fromEntries(practices.map((a) => [a.id, "pending" as ActivityStatus]))
    for (const log of state.logs) if (log.log_date === today && log.activity_id in result) result[log.activity_id] = log.status
    return result
  }, [state.logs, today, practices])

  const addPractice = useCallback(async (input: PracticeInput, areaId: string | null) => {
    const position = state.practiceRows.reduce((max, p) => Math.max(max, p.position), -1) + 1
    const { data, error } = await supabase.from("practices").insert({ ...input, area_id: areaId, position, user_id: user.id }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, practiceRows: [...s.practiceRows, data] }))
    notify(areaId ? "Task added" : "Practice added")
    return true
  }, [supabase, user.id, state.practiceRows, fail, notify])

  const updatePractice = useCallback(async (rowId: string, input: PracticeInput) => {
    const { data, error } = await supabase.from("practices").update(input).eq("id", rowId).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, practiceRows: s.practiceRows.map((p) => (p.id === rowId ? data : p)) }))
    notify("Practice updated")
    return true
  }, [supabase, fail, notify])

  /** Archives the practice: it leaves your daily list, but past completions stay in your history. */
  const deletePractice = useCallback(async (rowId: string) => {
    setState((s) => ({ ...s, practiceRows: s.practiceRows.filter((p) => p.id !== rowId) }))
    const { error } = await supabase.from("practices").update({ archived: true }).eq("id", rowId)
    if (error) fail(error)
    else notify("Practice removed")
  }, [supabase, fail, notify])

  const setActivityStatus = useCallback<StoreValue["setActivityStatus"]>(async (activityId, nextStatus, extra = {}) => {
    const date = today
    const now = new Date().toISOString()
    setState((s) => {
      const others = s.logs.filter((l) => !(l.log_date === date && l.activity_id === activityId))
      if (nextStatus === "pending") return { ...s, logs: others }
      return { ...s, logs: [...others, { id: `tmp-${activityId}-${date}`, user_id: user.id, log_date: date, activity_id: activityId, status: nextStatus, skip_reason: extra.skipReason ?? null, note: extra.note ?? null, created_at: now, updated_at: now }] }
    })
    const { error } = nextStatus === "pending"
      ? await supabase.from("activity_logs").delete().match({ user_id: user.id, log_date: date, activity_id: activityId })
      : await supabase.from("activity_logs").upsert({ user_id: user.id, log_date: date, activity_id: activityId, status: nextStatus, skip_reason: extra.skipReason ?? null, note: extra.note ?? null }, { onConflict: "user_id,log_date,activity_id" })
    if (error) fail(error)
  }, [today, user.id, supabase, fail])

  /** Marks (or clears) a rest day for one area only; null = Communication. */
  const setRestDay = useCallback(async (areaId: string | null, on: boolean) => {
    const date = today
    const now = new Date().toISOString()
    const scoped = practices.filter((p) => p.areaId === areaId)
    const keys = new Set(scoped.map((p) => p.id))
    if (keys.size === 0) return
    setState((s) => {
      const others = s.logs.filter((l) => l.log_date !== date || !keys.has(l.activity_id) || (!on && l.status !== "rest-day"))
      if (!on) return { ...s, logs: others }
      return { ...s, logs: [...others, ...scoped.map((a) => ({ id: `tmp-${a.id}-${date}`, user_id: user.id, log_date: date, activity_id: a.id, status: "rest-day" as const, skip_reason: null, note: null, created_at: now, updated_at: now }))] }
    })
    const { error } = on
      ? await supabase.from("activity_logs").upsert(scoped.map((a) => ({ user_id: user.id, log_date: date, activity_id: a.id, status: "rest-day" as const, skip_reason: null, note: null })), { onConflict: "user_id,log_date,activity_id" })
      : await supabase.from("activity_logs").delete().eq("user_id", user.id).eq("log_date", date).eq("status", "rest-day").in("activity_id", [...keys])
    if (error) fail(error)
    else notify(on ? "Rest day saved. Recovery counts too." : "Rest day removed")
  }, [today, user.id, supabase, fail, notify, practices])

  const savePracticeNote = useCallback(async (note: string) => {
    const { data, error } = await supabase.from("practice_notes").upsert({ user_id: user.id, note_date: today, note }, { onConflict: "user_id,note_date" }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, notes: [...s.notes.filter((n) => n.note_date !== today), data] }))
    notify("Note saved")
    return true
  }, [supabase, user.id, today, fail, notify])

  const addTransaction = useCallback<StoreValue["addTransaction"]>(async (input) => {
    const { data, error } = await supabase.from("transactions").insert({ ...input, user_id: user.id }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, transactions: [data, ...s.transactions].sort(byDateDesc("occurred_on")) }))
    notify("Transaction added")
    return true
  }, [supabase, user.id, fail, notify])

  const deleteTransaction = useCallback(async (id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }))
    const { error } = await supabase.from("transactions").delete().eq("id", id)
    if (error) fail(error)
    else notify("Transaction deleted")
  }, [supabase, fail, notify])

  const addClient = useCallback(async (input: { name: string; note: string }) => {
    const { data, error } = await supabase.from("clients").insert({ ...input, user_id: user.id }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, clients: [...s.clients, data] }))
    notify("Client added")
    return true
  }, [supabase, user.id, fail, notify])

  const deleteClient = useCallback(async (id: string) => {
    setState((s) => ({ ...s, clients: s.clients.filter((c) => c.id !== id) }))
    const { error } = await supabase.from("clients").delete().eq("id", id)
    if (error) fail(error)
  }, [supabase, fail])

  const addWorkout = useCallback(async (input: { kind: Workout["kind"]; duration_min: number }) => {
    const { data, error } = await supabase.from("workouts").insert({ ...input, workout_date: today, user_id: user.id }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, workouts: [...s.workouts, data] }))
    notify("Workout logged")
    return true
  }, [supabase, user.id, today, fail, notify])

  const deleteWorkout = useCallback(async (id: string) => {
    setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
    const { error } = await supabase.from("workouts").delete().eq("id", id)
    if (error) fail(error)
  }, [supabase, fail])

  const setWorkoutRestDay = useCallback(async (on: boolean) => {
    if (on) {
      const { data, error } = await supabase.from("workouts").insert({ kind: "rest", duration_min: 0, workout_date: today, user_id: user.id }).select().single()
      if (error) return fail(error)
      setState((s) => ({ ...s, workouts: [...s.workouts, data] }))
      notify("Rest day saved")
    } else {
      setState((s) => ({ ...s, workouts: s.workouts.filter((w) => !(w.workout_date === today && w.kind === "rest")) }))
      const { error } = await supabase.from("workouts").delete().match({ user_id: user.id, workout_date: today, kind: "rest" })
      if (error) fail(error)
    }
  }, [supabase, user.id, today, fail, notify])

  const saveBodyMetric = useCallback<StoreValue["saveBodyMetric"]>(async (input) => {
    const { data, error } = await supabase.from("body_metrics").upsert({ ...input, user_id: user.id }, { onConflict: "user_id,measured_on" }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, bodyMetrics: [...s.bodyMetrics.filter((m) => m.measured_on !== data.measured_on), data].sort((a, b) => a.measured_on.localeCompare(b.measured_on)) }))
    notify("Measurements saved")
    return true
  }, [supabase, user.id, fail, notify])

  const saveJournal = useCallback(async (date: string, fields: JournalFields) => {
    const { data, error } = await supabase.from("journal_entries").upsert({ ...fields, entry_date: date, user_id: user.id }, { onConflict: "user_id,entry_date" }).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, journal: [...s.journal.filter((j) => j.entry_date !== date), data].sort(byDateDesc("entry_date")) }))
    notify("Reflection saved")
    return true
  }, [supabase, user.id, fail, notify])

  const updateProfile = useCallback(async (patch: TablesUpdate<"profiles">) => {
    const { data, error } = await supabase.from("profiles").update(patch).eq("id", user.id).select().single()
    if (error) { fail(error); return false }
    setState((s) => ({ ...s, profile: data }))
    notify("Preferences saved")
    return true
  }, [supabase, user.id, fail, notify])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }, [supabase])

  const value: StoreValue = {
    ...state,
    user,
    today,
    status,
    loadError,
    reload,
    toasts,
    notify,
    dismissToast,
    areas,
    addArea,
    updateArea,
    deleteArea,
    practices,
    practicesFor,
    addPractice,
    updatePractice,
    deletePractice,
    todayStatus,
    skipTarget,
    requestSkip: setSkipTarget,
    setActivityStatus,
    setRestDay,
    savePracticeNote,
    addTransaction,
    deleteTransaction,
    addClient,
    deleteClient,
    addWorkout,
    deleteWorkout,
    setWorkoutRestDay,
    saveBodyMetric,
    saveJournal,
    updateProfile,
    signOut,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
