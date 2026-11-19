import { redirect } from "next/navigation"
import { listRecords } from "@/lib/store"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChannelTable } from "@/components/channel-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function ChannelsPage() {
  const session = await auth()
  if (session?.user?.id !== "admin") redirect("/login?callbackUrl=/moe/channels")

  const channelList = await listRecords("channels")

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text">
          渠道管理
        </h1>
        <p className="text-muted-foreground mt-2">
          管理您的推送渠道
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/moe/qq-openid">临时获取 QQ OpenID</Link>
        </Button>
      </div>

      <Card className="bg-white/50 border-blue-100">
        <CardHeader>
          <CardTitle>推送渠道</CardTitle>
          <CardDescription>
            管理所有的推送渠道
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelTable
            channels={channelList}
          />
        </CardContent>
      </Card>
    </div>
  )
}
