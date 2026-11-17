// Mirrors the Supabase schema (project xgnfzcrhzjfcaeuicwct). Update when the schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Partial<Row> & Pick<Row, Required>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      profiles: Table<{
        id: string
        display_name: string
        challenge_name: string
        start_date: string
        end_date: string
        fitness_target_min: number
        communication_target_min: number
        journal_target_min: number
        monthly_savings_goal: number
        monthly_income_goal: number
        currency: string
        created_at: string
        updated_at: string
      }, "id">
      activity_logs: Table<{
        id: string
        user_id: string
        log_date: string
        activity_id: string
        status: "completed" | "skipped" | "rest-day"
        skip_reason: string | null
        note: string | null
        created_at: string
        updated_at: string
      }, "log_date" | "activity_id" | "status">
      practices: Table<{
        id: string
        user_id: string
        key: string
        title: string
        description: string
        minutes: number
        icon: string
        position: number
        archived: boolean
        created_at: string
      }, "title">
      practice_notes: Table<{
        id: string
        user_id: string
        note_date: string
        note: string
        updated_at: string
      }, "note_date">
      transactions: Table<{
        id: string
        user_id: string
        description: string
        category: string
        kind: "income" | "expense"
        amount: number
        occurred_on: string
        created_at: string
      }, "description" | "kind" | "amount">
      clients: Table<{
        id: string
        user_id: string
        name: string
        note: string
        created_at: string
      }, "name">
      workouts: Table<{
        id: string
        user_id: string
        workout_date: string
        kind: "gym" | "home" | "cardio" | "rest"
        duration_min: number
        created_at: string
      }, "workout_date" | "kind">
      body_metrics: Table<{
        id: string
        user_id: string
        measured_on: string
        weight_kg: number | null
        chest_cm: number | null
        waist_cm: number | null
        hips_cm: number | null
        body_fat_pct: number | null
        created_at: string
      }, "measured_on">
      journal_entries: Table<{
        id: string
        user_id: string
        entry_date: string
        accomplished: string
        went_wrong: string
        learned: string
        improve: string
        priorities: string
        created_at: string
        updated_at: string
      }, "entry_date">
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicTables = Database["public"]["Tables"]
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"]
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"]
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"]
