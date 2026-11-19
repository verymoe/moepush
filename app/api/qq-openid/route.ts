import { z } from "zod"
import { adminRoute } from "@/lib/admin-route"
import { clearCapture, createCapture, getCaptureResults, readCapture } from "@/lib/qq-openid"

const setupSchema = z.object({
  appId: z.string().trim().regex(/^\d{1,32}$/, "请输入 QQ 机器人的数字 AppID"),
  secret: z.string().trim().min(1, "请输入 Bot Secret").max(256),
})

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } })
}

export const GET = adminRoute(async () => {
  const capture = await readCapture()
  if (!capture) return reply(null)
  if (capture.expiresAt <= Date.now()) {
    await clearCapture(capture.id)
    return reply(null)
  }

  const { id, appId, expiresAt } = capture
  return reply({ id, appId, expiresAt, results: await getCaptureResults(id) })
})

export const POST = adminRoute(async (request) => {
  const { appId, secret } = setupSchema.parse(await request.json())
  const { id, expiresAt } = await createCapture(appId, secret)
  return reply({ id, appId, expiresAt, results: [] }, 201)
})

export const DELETE = adminRoute(async (request) => {
  const { id } = z.object({ id: z.string().regex(/^[\da-f]{48}$/) }).parse(await request.json())
  await clearCapture(id)
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
})
