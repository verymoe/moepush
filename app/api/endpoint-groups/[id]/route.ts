import { NextResponse } from "next/server"
import { adminRoute } from "@/lib/admin-route"
import { getRecord, removeRecord } from "@/lib/store"

export const DELETE = adminRoute(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  if (!await getRecord("groups", id)) {
    return NextResponse.json({ error: "接口组不存在" }, { status: 404 })
  }
  await removeRecord("groups", id)
  return NextResponse.json({ success: true })
})
