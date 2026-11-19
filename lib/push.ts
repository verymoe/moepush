import "server-only"
import { sendChannelMessage } from "./channels"
import { ChannelDeliveryError } from "./channels/base"
import type { Endpoint } from "./models/endpoints"
import { getRecord } from "./store"
import { safeInterpolate } from "./template"

export class PushError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function pushToEndpoint(endpoint: Endpoint, body: unknown) {
  if (endpoint.status === "inactive") throw new PushError("接口已禁用", 403)
  const channel = await getRecord("channels", endpoint.channelId)
  if (!channel) throw new PushError("渠道不存在", 404)
  if (channel.status === "inactive") throw new PushError("渠道已禁用", 403)

  const message = JSON.parse(safeInterpolate(endpoint.rule, { body }))
  try {
    await sendChannelMessage(channel.type, message, channel)
  } catch (error) {
    if (error instanceof ChannelDeliveryError) throw new PushError(error.message, error.status)
    throw error
  }
}
