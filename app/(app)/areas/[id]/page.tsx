import type { Metadata } from "next"
import { CustomAreaPage } from "@/components/dashboard/area-page"

export const metadata: Metadata = { title: "Focus area" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CustomAreaPage id={id} />
}
