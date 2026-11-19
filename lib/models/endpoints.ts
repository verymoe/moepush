import { z } from "zod"
import { statusSchema, type Status } from "./status"

export const insertEndpointSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(50, "名称不能超过50个字符"),
  channelId: z.string().min(1, "请选择推送渠道"),
  rule: z.string().min(1, "消息模版不能为空").max(65536),
  status: statusSchema.optional(),
})

export type NewEndpoint = z.infer<typeof insertEndpointSchema>
export type Endpoint = NewEndpoint & { id: string; status: Status; createdAt: string }
