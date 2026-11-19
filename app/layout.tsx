import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "MoePush - 可爱又强大的消息推送服务",
  description: "MoePush 是一个可爱又强大的消息推送服务，支持多种消息推送渠道，包括钉钉机器人、企业微信应用等",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={cn(
        GeistSans.variable,
        GeistMono.variable,
        "min-h-screen bg-background antialiased",
      )}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
