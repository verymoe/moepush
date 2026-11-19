"use client"

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ChannelFormData } from "@/lib/models/channels"
import type { UseFormReturn } from "react-hook-form"

const inputs = [
  { name: "qqAppId", label: "机器人 AppID", type: "text" },
  { name: "secret", label: "机器人 ClientSecret", type: "password" },
] as const

export function QQBotFields({ form }: { form: UseFormReturn<ChannelFormData> }) {
  return (
    <>
      {inputs.map(({ name, label, type }) => (
        <FormField key={name} control={form.control} name={name} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl><Input {...field} type={type} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      ))}
      <FormField control={form.control} name="qqTargetType" render={({ field }) => (
        <FormItem>
          <FormLabel>接收对象</FormLabel>
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <FormControl><SelectTrigger><SelectValue placeholder="选择群聊或单聊" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value="group">QQ群聊</SelectItem>
              <SelectItem value="user">QQ单聊</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="qqOpenId" render={({ field }) => (
        <FormItem>
          <FormLabel>接收对象 OpenID</FormLabel>
          <FormControl><Input {...field} value={field.value ?? ""} /></FormControl>
          <FormDescription>填写同一机器人收到的群 OpenID 或用户 OpenID。普通 QQ 号和群号无法用于此接口。</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
    </>
  )
}
