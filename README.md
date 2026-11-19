<p align="center">
  <img src="public/moe_logo.png" alt="Arona" width="100">
  <h1 align="center">Arona · 又一个 push 服务</h1>
</p>

这是 Shiro 自用的消息推送服务，改自 [beilunyang/moepush](https://github.com/beilunyang/moepush)。

- 使用 EdgeOne Makers（原 EdgeOne Pages）部署，通过 EdgeOne Blob 保存渠道、接口和接口组。
- 后台采用单管理员登录，首页展示服务简介。
- 支持 QQ 官方机器人文本推送，可临时接收单聊和群 @ 事件来获取 OpenID。
- 其他程序可通过 HTTP POST 传入动态正文，由配置好的渠道转发。

## 已支持渠道

- 钉钉群机器人
- 企业微信应用
- 企业微信群机器人
- Telegram 机器人
- 飞书群机器人
- Discord Webhook
- Bark App
- 通用 Webhook
- QQ 官方机器人（QQ群聊和单聊文本推送）

QQ 渠道需要机器人 AppID、ClientSecret 和该机器人获取的目标 OpenID。群聊使用群 OpenID，单聊使用用户 OpenID。创建推送接口时选择「文本消息」，例如将内容设为 `${body.message}`。接收对象需要允许该机器人发送主动消息。 [QQ 机器人官方文档](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/overview.html)

在「渠道管理」点击「临时获取 QQ OpenID」生成回调地址，将它填入 QQ 开放平台的 Webhook 设置，并订阅单聊消息和群 @ 机器人消息。发送消息后页面会自动列出收到的用户或群 OpenID，点击对应项即可复制。回调有效 30 分钟，管理员可随时停止并清除。 [QQ Webhook 配置文档](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/webhook.html)

## 通过 Webhook 推送正文

在「接口管理」创建推送接口，选择已配置的渠道。QQ 文本消息可将内容字段填为 `${body}`，生成的模板为 `{ "content": "${body}" }`。从「接口示例」复制地址，向它发送一个 JSON 字符串。

```bash
curl -X POST 'https://push.example.com/api/push/接口ID' \
  -H 'Content-Type: application/json' \
  --data '"通知标题\n\n通知正文"'
```

在 JavaScript 中用 `JSON.stringify(content)` 生成请求体。完整推送地址可直接调用，请按密钥保管。

## 技术栈
- **框架**: [Next.js](https://nextjs.org/) (App Router)
- **平台**: [EdgeOne Makers（原 EdgeOne Pages）](https://makers.edgeone.link/)
- **存储**: [EdgeOne Blob](https://makers.edgeone.link/document/blob-storage)
- **认证**: [NextAuth](https://authjs.dev/getting-started/installation?framework=Next.js) 保护单管理员后台
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件**: 基于 [Radix UI](https://www.radix-ui.com/) 的自定义组件
- **类型安全**: [TypeScript](https://www.typescriptlang.org/)

## 本地运行

使用 Node.js 22 和 pnpm。将 `.env.example` 复制为 `.env`，设置管理员用户名、管理员密码哈希和随机会话密钥。通过标准输入将至少 16 个字符的密码传给 `pnpm --silent admin:hash`，并将输出填入 `ADMIN_PASSWORD_HASH`。使用 `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` 生成 `AUTH_SECRET`。

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

打开 http://localhost:3000。开发环境中的 `MOEPUSH_LOCAL_STORE` 将数据写入本地目录。

## 部署到 EdgeOne Pages

1. 在 EdgeOne Makers 导入 Git 仓库并选择 Next.js，或使用下方 CLI 命令直接部署。`edgeone.json` 定义了安装命令、构建命令、输出目录和 Node.js 版本。
2. 在项目生产环境设置以下变量，再重新部署。EdgeOne 自动为当前项目提供 Blob 运行时凭据。第一个已登录的管理请求会使用 `moepush` 命名空间。
3. 打开部署地址并以管理员身份登录。公开推送 URL 仍可直接调用，请将其当作密钥保管。

| 变量 | 用途 |
| --- | --- |
| `ADMIN_USERNAME` | 唯一的管理员用户名 |
| `ADMIN_PASSWORD_HASH` | `pnpm --silent admin:hash` 生成的密码哈希 |
| `AUTH_SECRET` | 独立的随机会话密钥 |
| `AUTH_TRUST_HOST` | 设为 `true`，使用当前部署域名 |
| `AUTH_SECURE_COOKIES` | 在 EdgeOne 设为 `true`，统一 HTTPS 会话 Cookie |
| `MOEPUSH_LOCAL_STORE` | 仅本地和 Docker 使用，EdgeOne 项目留空 |

```bash
npx edgeone login --site china
npx edgeone makers deploy -n moepush --skip-ai-gateway-sync
```

已有对象使用强一致读取。分别保存每个渠道、接口和接口组。并发修改同一条记录时以最后一次写入为准。接口组中失效或删除的接口会在执行时按当前记录处理。

### 使用 Docker 部署

```bash
docker build -t moepush .
docker run -d -p 3000:3000 -v moepush-data:/data --env-file .env.docker moepush
```

在 `.env.docker` 设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD_HASH` 和 `AUTH_SECRET`。容器将本地数据保存在 `/data`。

## 许可证

[MIT](LICENSE)
