import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute } from "@/lib/admin-route"
import { getRecord, listRecords, resolveGroup, saveRecord } from "@/lib/store"
import { generateId } from "@/lib/utils"

const groupInput = z.object({
  name: z.string().trim().min(1).max(100),
  endpointIds: z.array(z.string()).min(1).max(50),
})

export const GET = adminRoute(async () => {
  const groups = await listRecords("groups")
  return NextResponse.json(await Promise.all(groups.map(resolveGroup)))
})

export const POST = adminRoute(async (request) => {
  const { name, endpointIds } = groupInput.parse(await request.json())
  const ids = [...new Set(endpointIds)]
  const endpoints = await Promise.all(ids.map((id) => getRecord("endpoints", id)))
  if (endpoints.some((endpoint) => !endpoint)) {
    return NextResponse.json({ error: "部分接口不存在" }, { status: 400 })
  }
  const now = new Date().toISOString()
  const group = await saveRecord("groups", {
    id: generateId(),
    name,
    status: "active",
    createdAt: now,
    updatedAt: now,
    endpointIds: ids,
  })
  return NextResponse.json({ ...group, endpoints })
})
