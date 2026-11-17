import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"
import { cookieOptions, supabaseKey, supabaseUrl } from "./env"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseKey, { cookieOptions })
  return browserClient
}
