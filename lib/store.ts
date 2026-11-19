import "server-only"
import { getStore } from "@edgeone/pages-blob"
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { dirname, join } from "node:path"
import type { Channel } from "./models/channels"
import type { Endpoint } from "./models/endpoints"
import type { Status } from "./models/status"

export interface EndpointGroupRecord {
  id: string
  name: string
  status: Status
  createdAt: string
  updatedAt: string
  endpointIds: string[]
}

interface Records {
  channels: Channel
  endpoints: Endpoint
  groups: EndpointGroupRecord
}

let blobStore: ReturnType<typeof getStore> | undefined

export function getStorage() {
  const directory = process.env.MOEPUSH_LOCAL_STORE
  if (!directory) {
    const store = blobStore ??= getStore("moepush")
    return {
      read: (key: string) => store.get(key, { type: "text", consistency: "strong" }),
      write: (key: string, value: string) => store.set(key, value),
      remove: (key: string) => store.delete(key),
      async keys(prefix: string) {
        const { blobs } = await store.list({ prefix, consistency: "strong" })
        return blobs.map(({ key }) => key)
      },
    }
  }

  return {
    async read(key: string) {
      try {
        return await readFile(join(directory, key), "utf8")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        return null
      }
    },
    async write(key: string, value: string) {
      const target = join(directory, key)
      const temporary = `${target}.${randomUUID()}.tmp`
      await mkdir(dirname(target), { recursive: true })
      try {
        await writeFile(temporary, value)
        await rename(temporary, target)
      } finally {
        await rm(temporary, { force: true })
      }
    },
    remove: (key: string) => rm(join(directory, key), { force: true }),
    async keys(prefix: string) {
      try {
        const entries = await readdir(join(directory, prefix))
        return entries.filter((name) => name.endsWith(".json")).map((name) => prefix + name)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
        return []
      }
    },
  }
}

const validId = /^[0-9A-Za-z]{16}$/
const recordKey = (kind: keyof Records, id: string) => `v1/${kind}/${id}.json`
const deletedKey = (kind: keyof Records, id: string) => `v1/deleted/${kind}/${id}.json`

export async function getRecord<K extends keyof Records>(kind: K, id: string): Promise<Records[K] | null> {
  if (!validId.test(id)) return null
  const storage = getStorage()
  const data = await storage.read(recordKey(kind, id))
  if (data === null || await storage.read(deletedKey(kind, id)) !== null) return null
  return JSON.parse(data) as Records[K]
}

export async function listRecords<K extends keyof Records>(kind: K): Promise<Records[K][]> {
  const prefix = `v1/${kind}/`
  const keys = await getStorage().keys(prefix)
  const records = await Promise.all(keys.map((key) => getRecord(kind, key.slice(prefix.length, -5))))
  return records.filter((record) => record !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function saveRecord<K extends keyof Records>(kind: K, record: Records[K]): Promise<Records[K]> {
  if (!validId.test(record.id)) throw new Error("Invalid record ID")
  await getStorage().write(recordKey(kind, record.id), JSON.stringify(record))
  return record
}

export async function removeRecord(kind: keyof Records, id: string) {
  if (!validId.test(id)) return
  const storage = getStorage()
  // An overlapping edit cannot make a deleted ID visible again.
  await storage.write(deletedKey(kind, id), "true")
  await storage.remove(recordKey(kind, id))
}

export async function resolveGroup(group: EndpointGroupRecord) {
  const endpoints = (await Promise.all(group.endpointIds.map((id) => getRecord("endpoints", id))))
    .filter((endpoint): endpoint is Endpoint => endpoint !== null)
  return { ...group, endpoints, endpointIds: endpoints.map(({ id }) => id) }
}
