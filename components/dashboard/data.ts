export type ActivityStatus = "completed" | "pending" | "skipped" | "rest-day"

export const practiceIconNames = ["voice", "video", "story", "thought", "grammar", "reading", "pen", "brain", "music", "target"] as const
export type PracticeIcon = (typeof practiceIconNames)[number]

/** A daily practice the user has chosen. `id` is the practice key stored in activity logs; `rowId` is the database row. */
export type ActivityItem = {
  id: string
  rowId: string
  title: string
  description: string
  minutes: number
  icon: PracticeIcon
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
