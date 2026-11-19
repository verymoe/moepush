import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "又一个push服务",
  description: "Shiro 自用的消息推送服务，支持 QQ、钉钉、企业微信和通用 Webhook 等渠道。",
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
