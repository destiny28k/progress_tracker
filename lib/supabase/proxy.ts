import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "./database.types"
import { cookieOptions, supabaseKey, supabaseUrl } from "./env"

const PUBLIC_PATHS = ["/login", "/auth"]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Keep getClaims directly after creating the client: it refreshes an expiring session.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))

  const redirectTo = (pathname: string, keepNext = false) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = keepNext && path !== "/" ? `?next=${encodeURIComponent(path)}` : ""
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  if (!signedIn && !isPublic) return redirectTo("/login", true)
  if (signedIn && path === "/login") return redirectTo("/")
  return response
}
