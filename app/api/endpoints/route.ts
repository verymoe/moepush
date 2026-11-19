import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { insertEndpointSchema } from "@/lib/models/endpoints"
import { getRecord, listRecords, saveRecord } from "@/lib/store"
import { generateId } from "@/lib/utils"

export const GET = adminRoute(async () => NextResponse.json(await listRecords("endpoints")))

export const POST = adminRoute(async (request) => {
  const fields = insertEndpointSchema.parse(await request.json())
  if (!await getRecord("channels", fields.channelId)) {
    return NextResponse.json({ error: "渠道不存在" }, { status: 400 })
  }
  const endpoint = await saveRecord("endpoints", {
    ...fields,
    id: generateId(),
    status: fields.status ?? "active",
    createdAt: new Date().toISOString(),
  })
  return NextResponse.json(endpoint)
})
