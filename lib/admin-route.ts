import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { auth } from "./auth"

export function adminRoute<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async function (request: Request, ...args: Args) {
    try {
      if ((await auth())?.user?.id !== "admin") {
        return NextResponse.json({ error: "未授权访问" }, { status: 401 })
      }
      return await handler(request, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 })
      }
      console.error("管理请求失败", error)
      return NextResponse.json({ error: "管理请求失败" }, { status: 500 })
    }
  }
}
