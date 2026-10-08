import { env } from './runtime'

const cookieName = 'stdio_admin'
const sessionSeconds = 60 * 60 * 8

function secret() {
  const value = env.ADMIN_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters')
  return value
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function signature(expiresAt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiresAt))
  return toBase64Url(new Uint8Array(signed))
}

function constantTimeEqual(left: string, right: string) {
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  return difference === 0
}

export async function isAdminRequest(request: Request) {
  try {
    const cookie = request.headers.get('cookie') ?? ''
    const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    if (!token) return false
    const [expiresAt, suppliedSignature] = token.split('.')
    if (!expiresAt || !suppliedSignature || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false
    return constantTimeEqual(await signature(expiresAt), suppliedSignature)
  } catch {
    return false
  }
}

export async function adminCookie(secure: boolean) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + sessionSeconds)
  return `${cookieName}=${expiresAt}.${await signature(expiresAt)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}${secure ? '; Secure' : ''}`
}

export function clearedAdminCookie(secure: boolean) {
  return `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`
}

export function passwordMatches(candidate: string) {
  const configured = env.ADMIN_PASSWORD
  if (!configured) return false
  return constantTimeEqual(configured, candidate)
}
