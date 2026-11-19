import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { OpenIdCapture } from "./open-id-capture"

export default async function QQOpenIdPage() {
  if ((await auth())?.user?.id !== "admin") redirect("/login?callbackUrl=/moe/qq-openid")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">临时获取 QQ OpenID</h1>
        <p className="mt-2 text-muted-foreground">接收指定机器人的单聊和群聊 @ 事件。每次接收开放 30 分钟。</p>
      </div>
      <OpenIdCapture />
    </div>
  )
}
