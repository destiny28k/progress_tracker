import { redirect } from "next/navigation"
import { AppShell } from "@/components/dashboard/app-shell"
import { DataProvider } from "@/components/dashboard/store"
import { createClient } from "@/lib/supabase/server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect("/login")

  return (
    <DataProvider user={{ id: data.user.id, email: data.user.email ?? "" }}>
      <AppShell>{children}</AppShell>
    </DataProvider>
  )
}
