import { z } from "zod"
import { CHANNEL_TYPES } from "@/lib/channels"
import { statusSchema, type Status } from "./status"

const qqTargetSchema = z.enum(["group", "user"])

export const channelFields = z.object({
  name: z.string().min(1, "名称不能为空").max(50, "名称不能超过50个字符"),
  type: z.nativeEnum(CHANNEL_TYPES),
  webhook: z.string().optional(),
  secret: z.string().optional(),
  corpId: z.string().optional(),
  agentId: z.string().optional(),
  botToken: z.string().optional(),
  chatId: z.string().optional(),
  qqAppId: z.string().trim().max(64).optional(),
  qqTargetType: qqTargetSchema.optional(),
  qqOpenId: z.string().trim().max(256).optional(),
  status: statusSchema.optional(),
})

export const insertChannelSchema = channelFields.refine((data) => {
  if (data.type === CHANNEL_TYPES.WECOM_APP) {
    return !!data.corpId
  }
  return true
}, {
  message: "企业微信应用必须提供企业ID",
  path: ["corpId"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.WECOM_APP) {
    return !!data.agentId
  }
  return true
}, {
  message: "企业微信应用必须提供应用ID",
  path: ["agentId"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.WECOM_APP) {
    return !!data.secret
  }
  return true
}, {
  message: "企业微信应用必须提供应用Secret",
  path: ["secret"],
}).refine((data) => {
  const webhookTypes = new Set<string>([CHANNEL_TYPES.DINGTALK, CHANNEL_TYPES.WECOM, CHANNEL_TYPES.DISCORD])
  if (webhookTypes.has(data.type)) {
    if (!data.webhook) return false
    try {
      new URL(data.webhook)
      return true
    } catch {
      return false
    }
  }
  return true
}, {
  message: "请输入有效的 Webhook 地址",
  path: ["webhook"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.WEBHOOK) {
    if (!data.webhook) return false
    try {
      new URL(data.webhook)
      return true
    } catch {
      return false
    }
  }
  return true
}, {
  message: "通用 Webhook 必须提供有效的 URL 地址",
  path: ["webhook"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.FEISHU) {
    if (!data.webhook) return false
    try {
      new URL(data.webhook)
      return true
    } catch {
      return false
    }
  }
  return true
}, {
  message: "飞书机器人必须提供有效的 Webhook 地址",
  path: ["webhook"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.BARK) {
    if (!data.webhook) return false
    try {
      new URL(data.webhook)
      return true
    } catch {
      return false
    }
  }
  return true
}, {
  message: "Bark 必须提供有效的服务器地址",
  path: ["webhook"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.TELEGRAM) {
    return !!data.botToken
  }
  return true
}, {
  message: "Telegram 机器人必须提供 Bot Token",
  path: ["botToken"],
}).refine((data) => {
  if (data.type === CHANNEL_TYPES.TELEGRAM) {
    return !!data.chatId
  }
  return true
}, {
  message: "Telegram 机器人必须提供 Chat ID",
  path: ["chatId"],
}).superRefine((data, ctx) => {
  if (data.type !== CHANNEL_TYPES.QQ_BOT) return

  if (!data.qqAppId) ctx.addIssue({ code: "custom", path: ["qqAppId"], message: "请输入机器人 AppID" })
  if (!data.secret?.trim()) ctx.addIssue({ code: "custom", path: ["secret"], message: "请输入机器人 ClientSecret" })
  if (!data.qqTargetType) ctx.addIssue({ code: "custom", path: ["qqTargetType"], message: "请选择接收对象类型" })
  if (!data.qqOpenId || /\s|^\.{1,2}$/.test(data.qqOpenId)) {
    ctx.addIssue({ code: "custom", path: ["qqOpenId"], message: "请输入接收对象的 OpenID" })
  }
})

export type ChannelFormData = z.infer<typeof insertChannelSchema>

export interface Channel {
  id: string
  name: string
  type: ChannelFormData["type"]
  status: Status
  createdAt: string
  webhook: string | null
  secret: string | null
  corpId: string | null
  agentId: string | null
  botToken: string | null
  chatId: string | null
  qqAppId?: string
  qqTargetType?: z.infer<typeof qqTargetSchema>
  qqOpenId?: string
}
