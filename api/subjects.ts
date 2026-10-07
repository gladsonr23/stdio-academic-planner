import { neon } from '@neondatabase/serverless'

export async function GET(request: Request) {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return Response.json({ error: 'DATABASE_URL is not configured' }, { status: 500 })
    const semester = Number(new URL(request.url).searchParams.get('semester') ?? '3')
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) return Response.json({ error: 'Semester must be between 1 and 8' }, { status: 400 })
    const sql = neon(databaseUrl)
    const subjects = await sql`SELECT id, semester, subject_code, short_name, subject_name, credits FROM subjects WHERE semester = ${semester} AND is_active = TRUE ORDER BY subject_name`
    return Response.json({ subjects }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } })
  } catch (error) {
    console.error('Failed to load Neon subjects', error)
    return Response.json({ error: 'Unable to load subjects' }, { status: 500 })
  }
}
