import { adminCookie, clearedAdminCookie, isAdminRequest, passwordMatches } from './lib/admin-auth'
import { env } from './lib/runtime'

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdminRequest(request) }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: 'Admin sign-in is not configured on the server' }, { status: 503 })
  }
  try {
    const { password } = await request.json() as { password?: string }
    if (typeof password !== 'string' || !passwordMatches(password)) {
      return Response.json({ error: 'Incorrect password' }, { status: 401 })
    }
    return Response.json({ authenticated: true }, {
      headers: { 'Set-Cookie': await adminCookie(new URL(request.url).protocol === 'https:'), 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Admin sign-in failed', error)
    return Response.json({ error: 'Unable to sign in' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  return Response.json({ authenticated: false }, {
    headers: { 'Set-Cookie': clearedAdminCookie(new URL(request.url).protocol === 'https:'), 'Cache-Control': 'no-store' },
  })
}
