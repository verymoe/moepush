import { redirect } from "next/navigation"
import { listRecords } from "@/lib/store"
import { auth } from "@/lib/auth"
import { EndpointsTabs } from "@/components/endpoints-tabs"

export default async function EndpointsPage() {
  const session = await auth()
  if (session?.user?.id !== "admin") redirect("/login?callbackUrl=/moe/endpoints")

  const [endpointList, channelList] = await Promise.all([
    listRecords("endpoints"),
    listRecords("channels"),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text">
          接口管理
        </h1>
        <p className="text-muted-foreground mt-2">
          管理您的推送接口
        </p>
      </div>

      <EndpointsTabs
        initialEndpoints={endpointList}
        channels={channelList}
      />
    </div>
  )
}
