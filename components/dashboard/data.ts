export type ActivityStatus = "completed" | "pending" | "skipped" | "rest-day"

export const practiceIconNames = ["voice", "video", "story", "thought", "grammar", "reading", "pen", "brain", "music", "target"] as const
export type PracticeIcon = (typeof practiceIconNames)[number]

/** A daily practice the user has chosen. `id` is the practice key stored in activity logs; `rowId` is the database row. */
export type ActivityItem = {
  id: string
  rowId: string
  /** null = the built-in Communication area. */
  areaId: string | null
  title: string
  description: string
  minutes: number
  icon: PracticeIcon
}

/** Colours a custom focus area can use (hex, so they work in inline styles). */
export const areaColors = {
  violet: "#c9b5f2",
  sky: "#9acde7",
  pink: "#f2a7c3",
  amber: "#f2cf8a",
  teal: "#8fdcc9",
  lime: "#c9ed83",
  orange: "#f2bd98",
} as const
export type AreaColor = keyof typeof areaColors

export type FocusArea = {
  id: string
  name: string
  description: string
  icon: PracticeIcon
  color: AreaColor
}

/** Hex colour with alpha, e.g. tint("#c9b5f2", 0.1). */
export function tint(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export const skipReasons = ["Busy", "Not feeling well", "Unexpected work", "Personal reasons", "Other"]

export const workoutKinds = {
  gym: { title: "Gym workout", detail: "Strength training" },
  home: { title: "Home workout", detail: "Bodyweight" },
  cardio: { title: "Walk / cardio", detail: "Easy movement" },
} as const
export type WorkoutKind = keyof typeof workoutKinds

export const currencies = ["USD", "INR", "EUR", "GBP", "AED", "CAD", "AUD"] as const

export const transactionCategories = {
  income: ["Project income", "Client payment", "Salary", "Investment", "Other income"],
  expense: ["Living expenses", "Food", "Transport", "Software", "Health", "Education", "Entertainment", "Other"],
}
