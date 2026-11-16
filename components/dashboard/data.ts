export type ActivityStatus = "completed" | "pending" | "skipped" | "rest-day"

export type ActivityItem = {
  id: string
  title: string
  description: string
  minutes: number
  icon: "voice" | "video" | "story" | "thought" | "grammar" | "reading"
}

/** The daily communication programme. These are the practice definitions, not user data. */
export const activities: ActivityItem[] = [
  { id: "record", title: "Record yourself speaking", description: "Pick a topic and speak freely. Listen back with curiosity, not judgment.", minutes: 6, icon: "voice" },
  { id: "shadow", title: "Video shadowing", description: "Follow along with a speaker you admire. Match their rhythm and pace.", minutes: 10, icon: "video" },
  { id: "story", title: "Storytelling practice", description: "Turn a small moment from your day into a story with a beginning and end.", minutes: 10, icon: "story" },
  { id: "thought", title: "Thought-to-sentence practice", description: "Take one thought and express it in three clear, different ways.", minutes: 10, icon: "thought" },
  { id: "grammar", title: "Grammar & tongue twisters", description: "Warm up your words with a short articulation and grammar drill.", minutes: 5, icon: "grammar" },
  { id: "reading", title: "Reading", description: "Read a few pages aloud or quietly. Let your vocabulary grow naturally.", minutes: 10, icon: "reading" },
]

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
