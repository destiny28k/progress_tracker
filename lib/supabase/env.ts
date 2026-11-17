export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local.")
}

/** Keep people signed in for 115 days. The cookie is renewed every time the session refreshes. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 115

export const cookieOptions = {
  maxAge: SESSION_MAX_AGE,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
}
