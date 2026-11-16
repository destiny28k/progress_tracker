import type { Metadata } from "next"
import { ProgressPage } from "@/components/dashboard/progress-page"

export const metadata: Metadata = { title: "Progress & analytics" }

export default function Page() {
  return <ProgressPage />
}
