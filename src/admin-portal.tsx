import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, FileUp, LogOut, ShieldCheck } from 'lucide-react'
import './admin-portal.css'

type Subject = { subject_code: string; subject_name: string; short_name: string; semester: number }
type MaterialType = 'question_paper' | 'question_bank' | 'study_note'

export function AdminPortal() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [semester, setSemester] = useState('3')
  const [subjectCode, setSubjectCode] = useState('')
  const [type, setType] = useState<MaterialType>('question_paper')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/admin-session').then(response => response.json()).then(data => setAuthenticated(Boolean(data.authenticated))).catch(() => setAuthenticated(false))
  }, [])

  useEffect(() => {
    if (!authenticated) return
    fetch(`/api/subjects?semester=${semester}`)
      .then(response => { if (!response.ok) throw new Error('Could not load subjects'); return response.json() })
      .then(data => { setSubjects(data.subjects ?? []); setSubjectCode('') })
      .catch(() => { setSubjects([]); setError('Could not load subjects from Neon. Please check the database connection.') })
  }, [authenticated, semester])

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to sign in')
      setAuthenticated(true); setPassword('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in') }
    finally { setBusy(false) }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    form.set('semester', semester); form.set('subjectCode', subjectCode); form.set('type', type)
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Upload failed')
      setMessage(`${data.document.title} is uploaded and now available in the planner.`)
      formElement.reset()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed') }
    finally { setBusy(false) }
  }

  async function signOut() {
    await fetch('/api/admin-session', { method: 'DELETE' })
    setAuthenticated(false); setMessage(''); setError('')
  }

  if (authenticated === null) return <main className="admin-page"><div className="admin-loading">Checking team access…</div></main>

  return <main className="admin-page">
    <header className="admin-topbar"><a href={import.meta.env.BASE_URL} className="admin-brand"><img src={`${import.meta.env.BASE_URL}stdio-logo.png`} alt="STDIO"/><span>Academic Planner</span></a><a href={import.meta.env.BASE_URL} className="admin-back"><ArrowLeft size={15}/> Back to planner</a></header>
    <div className="admin-wrap">
      {!authenticated ? <section className="admin-panel admin-signin">
        <div className="admin-mark"><ShieldCheck size={22}/></div><p className="admin-eyebrow">STDIO TEAM</p><h1>Admin sign-in</h1><p className="admin-intro">Sign in to add semester materials to the academic planner.</p>
        <form onSubmit={signIn}><label>Team password<input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required/></label><button className="admin-submit" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button></form>
        {error && <p className="admin-alert error" role="alert">{error}</p>}
        <p className="admin-footnote">Team access only. Do not share this password with students.</p>
      </section> : <>
        <div className="admin-heading"><div><p className="admin-eyebrow">CONTENT MANAGEMENT</p><h1>Upload materials</h1><p className="admin-intro">Choose where the file belongs. We’ll save it to Neon Storage and link it to the planner automatically.</p></div><button className="admin-signout" onClick={signOut}><LogOut size={15}/> Sign out</button></div>
        <section className="admin-panel upload-panel">
          <form onSubmit={upload}>
            <div className="admin-form-grid">
              <label>Semester<select value={semester} onChange={event => setSemester(event.target.value)}>{Array.from({ length: 8 }, (_, i) => <option value={String(i + 1)} key={i + 1}>Semester {String(i + 1).padStart(2, '0')}</option>)}</select></label>
              <label>Material type<select value={type} onChange={event => setType(event.target.value as MaterialType)}><option value="question_paper">Question paper</option><option value="question_bank">Question bank</option><option value="study_note">Study note</option></select></label>
              <label className="admin-wide">Subject<select value={subjectCode} onChange={event => setSubjectCode(event.target.value)} required><option value="">{subjects.length ? 'Select a subject' : 'No subjects found for this semester'}</option>{subjects.map(subject => <option value={subject.subject_code} key={subject.subject_code}>{subject.subject_code} · {subject.short_name} — {subject.subject_name}</option>)}</select></label>
              <label className="admin-wide">Display title<input name="title" maxLength={180} placeholder="e.g. OS CT1 07.09.2026" required/></label>
              {type === 'question_paper' && <label>Exam<select name="examType" required><option value="">Choose exam</option><option value="CT1">CT1</option><option value="CT2">CT2</option><option value="SEMESTER">Semester Exam</option></select></label>}
              {type === 'study_note' && <label>Unit number <span className="admin-optional">(optional)</span><input name="unitNumber" inputMode="numeric" type="number" min="1" max="20" placeholder="e.g. 3"/></label>}
              <label>{type === 'study_note' ? 'Academic year' : 'Year'} <span className="admin-optional">(optional)</span><input name="academicYear" inputMode="numeric" type="number" min="2000" max="2100" placeholder="e.g. 2026"/></label>
              <label className="admin-wide">PDF file<input className="admin-file" name="file" type="file" accept="application/pdf,.pdf" required/><small>PDF only · maximum 4 MB</small></label>
            </div>
            <div className="admin-submit-row"><button className="admin-submit" disabled={busy || !subjectCode}><FileUp size={16}/>{busy ? 'Uploading…' : 'Upload and publish'}</button><span>Published files appear in the planner right away.</span></div>
          </form>
          {message && <p className="admin-alert success" role="status"><Check size={16}/>{message}</p>}
          {error && <p className="admin-alert error" role="alert">{error}</p>}
        </section>
        <section className="admin-guidance"><b>Organized for you</b><p>Files go into <code>semester-{semester}/{subjectCode || 'subject-code'}/{type === 'question_paper' ? 'question-papers' : type === 'question_bank' ? 'question-banks' : 'study-notes'}/</code>. You won’t need to add a SQL row manually.</p></section>
      </>}
    </div>
  </main>
}
