import { z } from "zod"

export const statusSchema = z.enum(["active", "inactive"])
export type Status = z.infer<typeof statusSchema>
