import { scrypt, timingSafeEqual } from "node:crypto"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { generateAvatarUrl } from "./avatar"

export const { handlers: { GET, POST }, auth } = NextAuth({
  pages: { signIn: "/login" },
  // EdgeOne terminates HTTPS before the Next.js server receives the request.
  useSecureCookies: process.env.AUTH_SECURE_COOKIES === "true" || undefined,
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        username: { label: "管理员用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const username = process.env.ADMIN_USERNAME
        const match = /^([0-9a-f]{32}):([0-9a-f]{64})$/.exec(process.env.ADMIN_PASSWORD_HASH || "")
        const password = credentials.password
        if (!username || !match || typeof password !== "string" || Buffer.byteLength(password) > 512) {
          return null
        }

        const salt = Buffer.from(match[1], "hex")
        const key = await new Promise<Buffer>((resolve, reject) => {
          scrypt(password, salt, 32, (error, result) => error ? reject(error) : resolve(result))
        })
        if (!timingSafeEqual(key, Buffer.from(match[2], "hex")) || credentials.username !== username) {
          return null
        }
        return { id: "admin", name: username, image: generateAvatarUrl(username) }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub || ""
      return session
    },
  },
})
