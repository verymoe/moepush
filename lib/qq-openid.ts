import "server-only"
import { createCipheriv, createDecipheriv, createHash, createPrivateKey, randomBytes } from "node:crypto"
import { getStorage } from "./store"

interface Capture {
  id: string
  appId: string
  sealedSeed: string
  expiresAt: number
}

export interface CapturedOpenId {
  kind: "user" | "group"
  openId: string
  memberOpenId?: string
  receivedAt: string
  eventType: "C2C_MESSAGE_CREATE" | "GROUP_AT_MESSAGE_CREATE"
}

const currentKey = "private/qq-openid/current.json"
const captureId = /^[\da-f]{48}$/
const captureKey = (id: string, entry: "setup" | "user" | "group") => `private/qq-openid/${id}-${entry}.json`
const resultPrefix = (id: string) => `private/qq-openid/${id}-results/`
const privateKeyPrefix = Buffer.from("302e020100300506032b657004220420", "hex")

function encryptionKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is required")
  return createHash("sha256").update("Arona QQ OpenID capture\0").update(secret).digest()
}

function parseCapture(value: string | null): Capture | null {
  if (!value) return null
  try {
    const capture = JSON.parse(value) as Partial<Capture>
    if (typeof capture.id !== "string" || !captureId.test(capture.id)
      || typeof capture.appId !== "string" || typeof capture.sealedSeed !== "string"
      || typeof capture.expiresAt !== "number") return null
    return capture as Capture
  } catch {
    return null
  }
}

export function getBotSigningKey(capture: Capture) {
  const sealed = Buffer.from(capture.sealedSeed, "base64url")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), sealed.subarray(0, 12))
  decipher.setAAD(Buffer.from(capture.id + ":" + capture.appId))
  decipher.setAuthTag(sealed.subarray(12, 28))
  const seed = Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()])
  return createPrivateKey({ key: Buffer.concat([privateKeyPrefix, seed]), format: "der", type: "pkcs8" })
}

export async function createCapture(appId: string, secret: string) {
  const previous = await readCapture()
  const id = randomBytes(24).toString("hex")
  const botSecret = Buffer.from(secret)
  const seed = Buffer.alloc(32)
  for (let index = 0; index < seed.length; index++) seed[index] = botSecret[index % botSecret.length]

  const iv = randomBytes(12)
  const encrypt = createCipheriv("aes-256-gcm", encryptionKey(), iv)
  encrypt.setAAD(Buffer.from(id + ":" + appId))
  const ciphertext = Buffer.concat([encrypt.update(seed), encrypt.final()])
  const capture: Capture = {
    id, appId, expiresAt: Date.now() + 30 * 60 * 1000,
    sealedSeed: Buffer.concat([iv, encrypt.getAuthTag(), ciphertext]).toString("base64url"),
  }

  const store = getStorage()
  await store.write(captureKey(id, "setup"), JSON.stringify(capture))
  try {
    await store.write(currentKey, id)
  } catch (error) {
    await clearCapture(id)
    throw error
  }
  if (previous) await clearCapture(previous.id)
  return capture
}

export async function readCapture(requestedId?: string): Promise<Capture | null> {
  if (requestedId !== undefined && !captureId.test(requestedId)) return null
  const store = getStorage()
  const id = (await store.read(currentKey))?.trim()
  if (!id || !captureId.test(id) || (requestedId !== undefined && id !== requestedId)) return null

  const capture = parseCapture(await store.read(captureKey(id, "setup")))
  return capture?.id === id ? capture : null
}

export async function clearCapture(id: string) {
  if (!captureId.test(id)) return
  const store = getStorage()
  await store.remove(captureKey(id, "setup"))
  const results = await store.keys(resultPrefix(id))
  await Promise.all([
    store.remove(captureKey(id, "user")),
    store.remove(captureKey(id, "group")),
    ...results.map((key) => store.remove(key)),
  ])
}

export async function getCaptureResults(id: string) {
  const active = await readCapture(id)
  if (!active || active.expiresAt <= Date.now()) return []

  const store = getStorage()
  const keys = await store.keys(resultPrefix(id))
  const current = await Promise.all(keys.map(async (key) => {
    const value = await store.read(key)
    return value ? JSON.parse(value) as CapturedOpenId : null
  }))
  const legacy = await Promise.all([
    store.read(captureKey(id, "user")),
    store.read(captureKey(id, "group")),
  ])

  const results = current.filter((result): result is CapturedOpenId => result !== null)
  if (legacy[0]) {
    const result = JSON.parse(legacy[0]) as Omit<CapturedOpenId, "kind" | "eventType">
    results.push({ ...result, kind: "user", eventType: "C2C_MESSAGE_CREATE" })
  }
  if (legacy[1]) {
    const result = JSON.parse(legacy[1]) as Omit<CapturedOpenId, "kind" | "eventType">
    results.push({ ...result, kind: "group", eventType: "GROUP_AT_MESSAGE_CREATE" })
  }

  const unique = new Map<string, CapturedOpenId>()
  for (const result of results) {
    const key = JSON.stringify([result.kind, result.openId, result.memberOpenId])
    if (!unique.has(key)) unique.set(key, result)
  }
  return [...unique.values()].sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
}

export async function saveCapturedOpenId(id: string, result: CapturedOpenId) {
  const active = await readCapture(id)
  if (!active || active.expiresAt <= Date.now()) return false

  const store = getStorage()
  const fingerprint = createHash("sha256")
    .update(result.eventType)
    .update("\0")
    .update(result.openId)
    .update("\0")
    .update(result.memberOpenId ?? "")
    .digest("hex")
  const key = `${resultPrefix(id)}${fingerprint}.json`
  await store.write(key, JSON.stringify(result))
  // A concurrent stop may have cleared this capture while the event was being written.
  if (!await readCapture(id)) {
    await store.remove(key)
    return false
  }
  return true
}
