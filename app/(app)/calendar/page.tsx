import type { Metadata } from "next"
import { CalendarPage } from "@/components/dashboard/calendar-page"

export const metadata: Metadata = { title: "Calendar" }

export default function Page() {
  return <CalendarPage />
}
