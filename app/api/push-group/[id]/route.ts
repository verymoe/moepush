import { NextResponse } from "next/server"
import { getRecord, resolveGroup } from "@/lib/store"
import { pushToEndpoint, PushError } from "@/lib/push"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const group = await getRecord("groups", id)
    if (!group) return NextResponse.json({ error: "接口组不存在" }, { status: 404 })
    if (group.status === "inactive") return NextResponse.json({ error: "接口组已禁用" }, { status: 403 })

    const body = await request.json().catch(() => {
      throw new PushError("请求体不是有效的 JSON", 400)
    })
    const { endpoints } = await resolveGroup(group)
    if (!endpoints.length) return NextResponse.json({ error: "接口组不包含任何接口" }, { status: 400 })

    const details = await Promise.all(endpoints.map(async (endpoint) => {
      try {
        await pushToEndpoint(endpoint, body)
        return { endpoint: endpoint.name, status: "success" }
      } catch (error) {
        return {
          endpoint: endpoint.name,
          status: "failed",
          error: error instanceof PushError ? error.message : "推送失败",
        }
      }
    }))
    const successCount = details.filter(({ status }) => status === "success").length
    return NextResponse.json({
      status: "success",
      message: `接口组 ${group.name} 处理完成`,
      total: details.length,
      successCount,
      failedCount: details.length - successCount,
      details,
    })
  } catch (error) {
    if (error instanceof PushError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: "处理接口组请求时出错" }, { status: 500 })
  }
}
