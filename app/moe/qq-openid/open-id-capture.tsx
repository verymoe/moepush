"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Result {
  kind: "user" | "group"
  openId: string
  memberOpenId?: string
  receivedAt: string
  eventType: "C2C_MESSAGE_CREATE" | "GROUP_AT_MESSAGE_CREATE"
}

interface Capture {
  id: string
  appId: string
  expiresAt: number
  results: Result[]
}

const api = "/api/qq-openid"

export function OpenIdCapture() {
  const [capture, setCapture] = useState<Capture | null>(null)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState("")
  const [origin, setOrigin] = useState("")
  const expiresAt = capture?.expiresAt

  async function load() {
    setBusy(true)
    try {
      const response = await fetch(api, { cache: "no-store" })
      if (!response.ok) throw new Error()
      setCapture(await response.json())
    } catch {
      setMessage("读取接收状态失败")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    void fetch(api, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        setCapture(await response.json())
      })
      .catch(() => setMessage("读取接收状态失败"))
      .finally(() => setBusy(false))
  }, [])

  useEffect(() => {
    if (!expiresAt || busy) return
    const controller = new AbortController()
    let pending = false
    const timer = window.setInterval(() => {
      if (pending) return
      pending = true
      void fetch(api, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return
          const result = await response.json()
          if (!controller.signal.aborted) setCapture(result)
        })
        .catch(() => undefined)
        .finally(() => { pending = false })
    }, 5_000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [busy, expiresAt])

  async function update(method: "POST" | "DELETE", data: Record<string, unknown>) {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch(api, {
        method, cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = response.status === 204 ? null : await response.json()
      if (!response.ok) throw new Error(result?.error || "操作失败")
      setCapture(result)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    if (await update("POST", { appId: values.get("appId"), secret: values.get("secret") })) form.reset()
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(`${label}已复制`)
    } catch {
      setMessage(`无法自动复制${label}，请手动选择文本`)
    }
  }

  const callbackUrl = capture ? `${origin}${api}/callback/${capture.id}` : ""

  return (
    <Card>
      <CardHeader><CardTitle>{capture ? "接收结果" : "创建临时回调"}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {capture ? (
          <>
            <p className="text-sm text-muted-foreground">
              AppID {capture.appId} · 截止 {new Date(capture.expiresAt).toLocaleString("zh-CN")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="qq-callback-url">Webhook 回调地址</Label>
              <div className="flex gap-2">
                <Input id="qq-callback-url" readOnly value={callbackUrl} className="font-mono" />
                <Button variant="outline" disabled={busy} onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(callbackUrl)
                    setMessage("回调地址已复制")
                  } catch {
                    setMessage("请从输入框手动复制回调地址")
                  }
                }}>复制</Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              在 QQ 开放平台选择 Webhook 接入并填入回调地址，订阅单聊消息和群 @ 机器人消息。
              给机器人发一条单聊消息或在群里 @ 它，结果会自动刷新。
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">收到的 OpenID</p>
                <span className="text-xs text-muted-foreground">{capture.results.length} 条</span>
              </div>
              {capture.results.length === 0 ? (
                <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  等待消息
                </p>
              ) : (
                <ul className="space-y-3">
                  {capture.results.map((result) => {
                    const label = result.kind === "user" ? "单聊用户" : "QQ 群"
                    return (
                      <li key={`${result.kind}-${result.openId}-${result.memberOpenId ?? ""}`}
                        className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{label}</p>
                            <p className="break-all font-mono text-sm">{result.openId}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => copy(result.openId, label)}>
                            <Copy className="h-3.5 w-3.5" />
                            复制
                          </Button>
                        </div>
                        {result.memberOpenId && (
                          <p className="mt-2 break-all text-xs text-muted-foreground">
                            发消息成员 OpenID：<span className="font-mono">{result.memberOpenId}</span>
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(result.receivedAt).toLocaleString("zh-CN")}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => load()}>刷新结果</Button>
              <Button variant="outline" disabled={busy} onClick={() => update("DELETE", { id: capture.id })}>停止并清除</Button>
            </div>
          </>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="qq-capture-appid">机器人 AppID</Label>
              <Input id="qq-capture-appid" name="appId" inputMode="numeric" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qq-capture-secret">机器人 Bot Secret</Label>
              <Input id="qq-capture-secret" name="secret" type="password" autoComplete="off" required maxLength={256} />
            </div>
            <Button type="submit" disabled={busy}>生成回调地址</Button>
          </form>
        )}
        {message && <p className="text-sm" role="status">{message}</p>}
      </CardContent>
    </Card>
  )
}
