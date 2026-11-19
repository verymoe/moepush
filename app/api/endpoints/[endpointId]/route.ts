import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { insertEndpointSchema } from "@/lib/models/endpoints"
import { getRecord, removeRecord, saveRecord } from "@/lib/store"

type Context = { params: Promise<{ endpointId: string }> }

export const PATCH = adminRoute(async (request, { params }: Context) => {
  const { endpointId } = await params
  const endpoint = await getRecord("endpoints", endpointId)
  if (!endpoint) return NextResponse.json({ error: "接口不存在" }, { status: 404 })

  const fields = insertEndpointSchema.partial().parse(await request.json())
  if (fields.channelId && !await getRecord("channels", fields.channelId)) {
    return NextResponse.json({ error: "渠道不存在" }, { status: 400 })
  }
  return NextResponse.json(await saveRecord("endpoints", { ...endpoint, ...fields }))
})

export const DELETE = adminRoute(async (_request, { params }: Context) => {
  const { endpointId } = await params
  if (!await getRecord("endpoints", endpointId)) {
    return NextResponse.json({ error: "接口不存在" }, { status: 404 })
  }
  await removeRecord("endpoints", endpointId)
  return new Response(null, { status: 204 })
})
