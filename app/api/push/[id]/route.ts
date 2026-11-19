import { NextResponse } from "next/server"
import { getRecord } from "@/lib/store"
import { pushToEndpoint, PushError } from "@/lib/push"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const endpoint = await getRecord("endpoints", id)
    if (!endpoint) return NextResponse.json({ message: "接口不存在" }, { status: 404 })

    const body = await request.json().catch(() => {
      throw new PushError("请求体不是有效的 JSON", 400)
    })
    await pushToEndpoint(endpoint, body)
    return NextResponse.json({ message: "推送成功" })
  } catch (error) {
    if (error instanceof PushError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json({ message: "推送失败" }, { status: 500 })
  }
}
