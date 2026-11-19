import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { insertChannelSchema } from "@/lib/models/channels"
import { listRecords, saveRecord } from "@/lib/store"
import { generateId } from "@/lib/utils"

export const GET = adminRoute(async () => NextResponse.json(await listRecords("channels")))

export const POST = adminRoute(async (request) => {
  const fields = insertChannelSchema.parse(await request.json())
  const channel = await saveRecord("channels", {
    id: generateId(),
    name: fields.name,
    type: fields.type,
    status: fields.status ?? "active",
    createdAt: new Date().toISOString(),
    webhook: fields.webhook ?? null,
    secret: fields.secret ?? null,
    corpId: fields.corpId ?? null,
    agentId: fields.agentId ?? null,
    botToken: fields.botToken ?? null,
    chatId: fields.chatId ?? null,
    qqAppId: fields.qqAppId,
    qqTargetType: fields.qqTargetType,
    qqOpenId: fields.qqOpenId,
  })
  return NextResponse.json(channel)
})
