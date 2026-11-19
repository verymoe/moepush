import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute } from "@/lib/admin-route"
import { statusSchema } from "@/lib/models/status"
import { getRecord, resolveGroup, saveRecord } from "@/lib/store"

export const POST = adminRoute(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const group = await getRecord("groups", id)
  if (!group) return NextResponse.json({ error: "接口组不存在" }, { status: 404 })

  const { status } = z.object({ status: statusSchema }).parse(await request.json())
  const updated = { ...group, status, updatedAt: new Date().toISOString() }
  const response = await resolveGroup(updated)
  await saveRecord("groups", updated)
  return NextResponse.json(response)
})
