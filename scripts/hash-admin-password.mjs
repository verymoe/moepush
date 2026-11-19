import { randomBytes, scryptSync } from "node:crypto"
import { readFileSync } from "node:fs"

const password = readFileSync(0, "utf8").replace(/\r?\n$/, "")
if (password.length < 16 || Buffer.byteLength(password) > 512) {
  throw new Error("Use a password between 16 characters and 512 UTF-8 bytes")
}

const salt = randomBytes(16)
const digest = scryptSync(password, salt, 32)
console.log(`${salt.toString("hex")}:${digest.toString("hex")}`)
