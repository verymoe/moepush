import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { channelFields, insertChannelSchema } from "@/lib/models/channels"
import { getRecord, removeRecord, saveRecord } from "@/lib/store"

type Context = { params: Promise<{ channelId: string }> }

export const PATCH = adminRoute(async (request, { params }: Context) => {
  const { channelId } = await params
  const channel = await getRecord("channels", channelId)
  if (!channel) return NextResponse.json({ error: "渠道不存在" }, { status: 404 })

  const fields = channelFields.partial().omit({ type: true }).parse(await request.json())
  const updated = { ...channel, ...fields }
  insertChannelSchema.parse(Object.fromEntries(Object.entries(updated).filter(([, value]) => value !== null)))
  return NextResponse.json(await saveRecord("channels", updated))
})

export const DELETE = adminRoute(async (_request, { params }: Context) => {
  const { channelId } = await params
  if (!await getRecord("channels", channelId)) {
    return NextResponse.json({ error: "渠道不存在" }, { status: 404 })
  }
  await removeRecord("channels", channelId)
  return new Response(null, { status: 204 })
})
