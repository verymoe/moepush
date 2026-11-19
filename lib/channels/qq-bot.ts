import { BaseChannel, ChannelDeliveryError, type ChannelConfig, type SendMessageOptions } from "./base"

const apiBase = "https://api.bot.qq.com"
const requestTimeout = 8000

interface QQResponse {
  access_token?: string
  expires_in?: number | string
  id?: string
  code?: number | string
  err_code?: number | string
}

interface CachedToken {
  secret: string
  expiresAt: number
  token: Promise<string>
}

function errorCode(result: QQResponse | null) {
  return [result?.err_code, result?.code].find((code) =>
    /^-?\d{1,10}$/.test(String(code)) && Number(code) !== 0,
  )
}

export class QQBotChannel extends BaseChannel {
  readonly config: ChannelConfig = {
    type: "qq_bot",
    label: "QQ 官方机器人",
    templates: [{
      type: "text",
      name: "文本消息",
      description: "向指定的 QQ 群或好友推送文本",
      fields: [{ key: "content", description: "消息内容", required: true, component: "textarea" }],
    }],
  }

  private readonly tokens = new Map<string, CachedToken>()

  private async fetchToken(appId: string, clientSecret: string) {
    const response = await fetch(`${apiBase}/app/getAppAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, clientSecret }),
      signal: AbortSignal.timeout(requestTimeout),
      redirect: "error",
    }).catch(() => { throw new ChannelDeliveryError("QQ 机器人凭证接口连接失败") })
    const result = await response.json().catch(() => null) as QQResponse | null
    const code = errorCode(result)
    const expiresIn = Number(result?.expires_in)
    if (!response.ok || code !== undefined || typeof result?.access_token !== "string"
      || !result.access_token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new ChannelDeliveryError(`QQ 机器人获取凭证失败（${code ?? `HTTP ${response.status}`}）`)
    }

    return { token: result.access_token, expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000 }
  }

  private getToken(appId: string, secret: string) {
    const cached = this.tokens.get(appId)
    if (cached?.secret === secret && cached.expiresAt > Date.now()) return cached

    const entry: CachedToken = {
      secret,
      expiresAt: Infinity,
      token: this.fetchToken(appId, secret).then(({ token, expiresAt }) => {
        entry.expiresAt = expiresAt
        return token
      }).catch((error) => {
        if (this.tokens.get(appId) === entry) this.tokens.delete(appId)
        throw error
      }),
    }
    this.tokens.set(appId, entry)
    return entry
  }

  async sendMessage(message: { content?: unknown } | null, options: SendMessageOptions) {
    const { qqAppId, qqTargetType, qqOpenId } = options
    const secret = options.secret?.trim()
    if (!qqAppId || !secret || !qqOpenId || (qqTargetType !== "group" && qqTargetType !== "user")) {
      throw new ChannelDeliveryError("QQ 机器人渠道配置不完整", 400)
    }
    const content = message?.content
    if (typeof content !== "string" || !content.trim()) {
      throw new ChannelDeliveryError("QQ 机器人消息内容不能为空", 400)
    }

    const entry = this.getToken(qqAppId, secret)
    const token = await entry.token
    const target = qqTargetType === "group" ? "groups" : "users"
    const response = await fetch(`${apiBase}/v2/${target}/${encodeURIComponent(qqOpenId)}/messages`, {
      method: "POST",
      headers: { Authorization: `QQBot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: 0, content }),
      signal: AbortSignal.timeout(requestTimeout),
      redirect: "error",
    }).catch(() => { throw new ChannelDeliveryError("QQ 机器人消息接口连接失败") })
    if (response.status === 401 && this.tokens.get(qqAppId) === entry) this.tokens.delete(qqAppId)

    const result = await response.clone().json().catch(() => null) as QQResponse | null
    const code = errorCode(result)
    if (!response.ok || code !== undefined || typeof result?.id !== "string" || !result.id) {
      throw new ChannelDeliveryError(`QQ 机器人发送失败（${code ?? `HTTP ${response.status}`}）`)
    }
    return response
  }
}
