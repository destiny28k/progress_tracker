import type { Metadata } from "next"
import { CommunicationPage } from "@/components/dashboard/communication-page"

export const metadata: Metadata = { title: "Communication" }

export default function Page() {
  return <CommunicationPage />
}
