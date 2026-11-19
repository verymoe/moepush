import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { statusSchema } from "@/lib/models/status"
import { getRecord, saveRecord } from "@/lib/store"
import { z } from "zod"

export const POST = adminRoute(async (request, { params }: { params: Promise<{ endpointId: string }> }) => {
  const { endpointId } = await params
  const endpoint = await getRecord("endpoints", endpointId)
  if (!endpoint) return NextResponse.json({ error: "接口不存在" }, { status: 404 })

  const { status } = z.object({ status: statusSchema }).parse(await request.json())
  return NextResponse.json(await saveRecord("endpoints", { ...endpoint, status }))
})
