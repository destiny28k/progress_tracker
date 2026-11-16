import type { Metadata } from "next"
import { JournalPage } from "@/components/dashboard/journal-page"

export const metadata: Metadata = { title: "Daily journal" }

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
  return <JournalPage initialDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined} />
}
