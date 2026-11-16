import type { Metadata } from "next"
import { PhysiquePage } from "@/components/dashboard/physique-page"

export const metadata: Metadata = { title: "Physique" }

export default function Page() {
  return <PhysiquePage />
}
