import { createPublicKey, sign, verify } from "node:crypto"
import { z } from "zod"
import { getBotSigningKey, readCapture, saveCapturedOpenId, type CapturedOpenId } from "@/lib/qq-openid"

const maxBytes = 256 * 1024
const payload = z.object({ op: z.number(), t: z.string().optional(), d: z.unknown() })
const challenge = z.object({
  event_ts: z.string().regex(/^\d{10}$/),
  plain_token: z.string().regex(/^[A-Za-z0-9_+\/=.-]{1,512}$/),
})
const openId = z.string().min(1).max(256).regex(/^[^\s\x00-\x1f\x7f]+$/)
const message = z.object({
  id: z.string().optional(),
  group_openid: openId.optional(),
  author: z.object({
    user_openid: openId.optional(),
    member_openid: openId.optional(),
  }).optional(),
})

function logCallback(
  stage: "received" | "ignored" | "saved" | "save_skipped" | "rejected" | "failed",
  details: Record<string, unknown>,
) {
  console.info("[qq-openid]", JSON.stringify({
    stage,
    ...details,
  }))
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  try {
    const capture = await readCapture(token)
    if (!capture || capture.expiresAt <= Date.now()) {
      if (capture) logCallback("rejected", { reason: "expired" })
      return new Response(null, { status: 404 })
    }
    const appId = request.headers.get("X-Bot-Appid")
    if (appId && appId !== capture.appId) {
      logCallback("rejected", { reason: "app_id_mismatch" })
      return new Response(null, { status: 401 })
    }

    if (Number(request.headers.get("Content-Length")) > maxBytes) return new Response(null, { status: 413 })
    const raw = Buffer.from(await request.arrayBuffer())
    if (raw.length > maxBytes) return new Response(null, { status: 413 })
    const incoming: unknown = JSON.parse(raw.toString("utf8"))
    const parsed = payload.safeParse(incoming)
    if (!parsed.success) return new Response(null, { status: 400 })

    const { op, t, d } = parsed.data
    const eventType = t === "C2C_MESSAGE_CREATE" || t === "GROUP_AT_MESSAGE_CREATE" ? t : null
    logCallback("received", {
      op,
      eventType,
      bytes: raw.length,
      appIdPresent: Boolean(appId),
      signaturePresent: Boolean(request.headers.get("X-Signature-Ed25519")),
    })
    if (op === 13) {
      if (appId !== capture.appId) {
        logCallback("rejected", { reason: "challenge_app_id_missing_or_mismatch" })
        return new Response(null, { status: 401 })
      }
      const check = challenge.safeParse(d)
      if (!check.success) {
        logCallback("rejected", { reason: "invalid_challenge" })
        return new Response(null, { status: 400 })
      }
      const { plain_token, event_ts } = check.data
      const data = Buffer.from(event_ts + plain_token)
      return Response.json({
        plain_token, signature: sign(null, data, getBotSigningKey(capture)).toString("hex"),
      }, { headers: { "Cache-Control": "no-store" } })
    }

    const timestamp = request.headers.get("X-Signature-Timestamp") ?? ""
    const signature = request.headers.get("X-Signature-Ed25519") ?? ""
    if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp) * 1000) > 300_000
      || !/^[\da-f]{128}$/i.test(signature)) {
      logCallback("rejected", {
        reason: "invalid_signature_headers",
        timestampValid: /^\d{10}$/.test(timestamp),
        timestampAgeSeconds: /^\d{10}$/.test(timestamp)
          ? Math.round(Date.now() / 1000 - Number(timestamp))
          : null,
        signatureFormatValid: /^[\da-f]{128}$/i.test(signature),
      })
      return new Response(null, { status: 401 })
    }

    const signed = Buffer.concat([Buffer.from(timestamp), raw])
    const publicKey = createPublicKey(getBotSigningKey(capture))
    if (!verify(null, signed, publicKey, Buffer.from(signature, "hex"))) {
      logCallback("rejected", { reason: "signature_verification_failed" })
      return new Response(null, { status: 401 })
    }

    if (op === 0 && (t === "C2C_MESSAGE_CREATE" || t === "GROUP_AT_MESSAGE_CREATE")) {
      const event = message.safeParse(d)
      if (event.success) {
        const receivedAt = new Date().toISOString()
        let captured: CapturedOpenId | null = null
        if (t === "C2C_MESSAGE_CREATE" && event.data.author?.user_openid) {
          captured = {
            kind: "user",
            openId: event.data.author.user_openid,
            receivedAt,
            eventType: t,
          }
        }
        if (t === "GROUP_AT_MESSAGE_CREATE" && event.data.group_openid) {
          captured = {
            kind: "group",
            openId: event.data.group_openid, memberOpenId: event.data.author?.member_openid, receivedAt,
            eventType: t,
          }
        }
        if (captured) {
          const saved = await saveCapturedOpenId(token, captured)
          logCallback(saved ? "saved" : "save_skipped", {
            kind: captured.kind,
            eventType: captured.eventType,
            hasMemberOpenId: Boolean(captured.memberOpenId),
            eventIdPresent: Boolean(event.data.id),
            reason: saved ? undefined : "capture_ended_during_write",
          })
        } else {
          logCallback("ignored", {
            reason: "expected_openid_field_missing",
            eventType: t,
            authorPresent: Boolean(event.data.author),
          })
        }
      } else {
        logCallback("ignored", {
          reason: "message_payload_shape_mismatch",
          fields: event.error.issues.map((issue) => issue.path.join(".")).slice(0, 10),
        })
      }
    } else {
      logCallback("ignored", { reason: "unsupported_event", op })
    }
    return Response.json({ op: 12, d: 0 }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof SyntaxError) {
      logCallback("rejected", { reason: "invalid_json" })
      return new Response(null, { status: 400 })
    }
    logCallback("failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    })
    return new Response(null, { status: 500 })
  }
}
