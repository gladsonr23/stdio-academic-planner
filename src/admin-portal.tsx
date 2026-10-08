import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, FileUp, LogOut, Pencil, ShieldCheck, Trash2, X } from 'lucide-react'
import './admin-portal.css'
import './admin-files.css'

type Subject = { subject_code: string; subject_name: string; short_name: string; semester: number }
type MaterialType = 'question_bank' | 'study_note'
type AdminDocument = { id: string; title: string; document_type: 'question_paper' | MaterialType; exam_type: string | null; academic_year: string | null; file_name: string; created_at: string; semester: number; subject_code: string; short_name: string; subject_name: string }

export function AdminPortal() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [semester, setSemester] = useState('3')
  const [subjectCode, setSubjectCode] = useState('')
  const [type, setType] = useState<MaterialType>('question_bank')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsError, setDocumentsError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [renamingId, setRenamingId] = useState('')
  const [renameTitle, setRenameTitle] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [documentsVersion, setDocumentsVersion] = useState(0)

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

  useEffect(() => {
    if (!authenticated) return
    let active = true
    setDocumentsLoading(true); setDocumentsError('')
    fetch('/api/admin-documents')
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Could not load uploaded files'); return data })
      .then(data => { if (active) setDocuments(data.documents ?? []) })
      .catch(cause => { if (active) setDocumentsError(cause instanceof Error ? cause.message : 'Could not load uploaded files') })
      .finally(() => { if (active) setDocumentsLoading(false) })
    return () => { active = false }
  }, [authenticated, documentsVersion])

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
      setDocumentsVersion(version => version + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed') }
    finally { setBusy(false) }
  }

  async function removeDocument(document: AdminDocument) {
    const accepted = window.confirm(`Remove “${document.title}” from the planner and delete its PDF from Neon Storage? This cannot be undone.`)
    if (!accepted) return
    setDeletingId(document.id); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/admin-documents?id=${encodeURIComponent(document.id)}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not remove this file')
      setMessage(`${document.title} was removed from the planner and Storage.`)
      setDocumentsVersion(version => version + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove this file') }
    finally { setDeletingId('') }
  }

  async function renameDocument(document: AdminDocument) {
    const title = renameTitle.trim()
    if (!title || title.length > 180) { setError('Enter a title between 1 and 180 characters.'); return }
    if (title === document.title) { setRenamingId(''); setError(''); return }
    setRenameBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch(`/api/admin-documents?id=${encodeURIComponent(document.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not rename this file')
      setDocuments(rows => rows.map(row => row.id === document.id ? { ...row, title: data.document.title } : row))
      setRenamingId(''); setMessage('Display title updated. The saved PDF file was not moved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not rename this file') }
    finally { setRenameBusy(false) }
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
              <label>Material type<select value={type} onChange={event => setType(event.target.value as MaterialType)}><option value="question_bank">Question bank</option><option value="study_note">Study note</option></select></label>
              <label className="admin-wide">Subject<select value={subjectCode} onChange={event => setSubjectCode(event.target.value)} required><option value="">{subjects.length ? 'Select a subject' : 'No subjects found for this semester'}</option>{subjects.map(subject => <option value={subject.subject_code} key={subject.subject_code}>{subject.subject_code} · {subject.short_name} — {subject.subject_name}</option>)}</select></label>
              <label className="admin-wide">Display title<input name="title" maxLength={180} placeholder="e.g. OS CT1 07.09.2026" required/></label>
              {type === 'study_note' && <label>Unit number <span className="admin-optional">(optional)</span><input name="unitNumber" inputMode="numeric" type="number" min="1" max="20" placeholder="e.g. 3"/></label>}
              <label>{type === 'study_note' ? 'Academic year' : 'Year'} <span className="admin-optional">(optional)</span><input name="academicYear" inputMode="numeric" type="number" min="2000" max="2100" placeholder="e.g. 2026"/></label>
              <label className="admin-wide">PDF file<input className="admin-file" name="file" type="file" accept="application/pdf,.pdf" required/><small>PDF only · maximum 4 MB</small></label>
            </div>
            <div className="admin-submit-row"><button className="admin-submit" disabled={busy || !subjectCode}><FileUp size={16}/>{busy ? 'Uploading…' : 'Upload and publish'}</button><span>Published files appear in the planner right away.</span></div>
          </form>
          {message && <p className="admin-alert success" role="status"><Check size={16}/>{message}</p>}
          {error && <p className="admin-alert error" role="alert">{error}</p>}
        </section>
        <section className="admin-files" aria-labelledby="admin-files-title">
          <div className="admin-files-heading"><div><p className="admin-eyebrow">LIBRARY MANAGEMENT</p><h2 id="admin-files-title">Uploaded files</h2></div><span>{documents.length} active</span></div>
          {documentsLoading ? <div className="admin-files-empty">Loading uploaded files…</div> : documentsError ? <div className="admin-files-empty error">{documentsError}<button onClick={() => setDocumentsVersion(version => version + 1)}>Try again</button></div> : documents.length === 0 ? <div className="admin-files-empty">No active uploads yet. Files you publish will appear here.</div> : <div className="admin-files-list">{documents.map(document => <article className="admin-file-row" key={document.id}>
            <div className="admin-file-main">{renamingId === document.id ? <input className="admin-rename-input" aria-label={`New display title for ${document.title}`} maxLength={180} value={renameTitle} onChange={event => setRenameTitle(event.target.value)} disabled={renameBusy}/> : <b>{document.title}</b>}<span>{document.subject_code} · {document.short_name} · Semester {String(document.semester).padStart(2, '0')}</span><small>{document.file_name}</small></div>
            <div className="admin-file-meta"><span>{document.document_type === 'study_note' ? 'Study note' : 'Question bank'}</span><span>{document.academic_year ?? 'Year not set'}</span></div>
            <div className="admin-file-actions">{renamingId === document.id ? <><button className="admin-rename-save" disabled={renameBusy} onClick={() => renameDocument(document)} aria-label="Save new title">{renameBusy ? 'Saving…' : <><Check size={15}/> Save</>}</button><button className="admin-rename-cancel" disabled={renameBusy} onClick={() => setRenamingId('')} aria-label="Cancel rename"><X size={15}/><span>Cancel</span></button></> : <button className="admin-rename" disabled={Boolean(deletingId) || renameBusy} onClick={() => { setRenamingId(document.id); setRenameTitle(document.title); setError('') }} title="Change the title shown in the planner; the stored PDF stays unchanged." aria-label={`Rename ${document.title}`}><Pencil size={15}/> Rename</button>}
              <button className="admin-delete" disabled={Boolean(deletingId) || renameBusy} onClick={() => removeDocument(document)} aria-label={`Delete ${document.title}`} title="Delete file"><Trash2 size={16}/>{deletingId === document.id ? 'Removing…' : 'Delete'}</button></div>
          </article>)}</div>}
        </section>
        <section className="admin-guidance"><b>Organized for you</b><p>Files go into <code>semester-{semester}/{subjectCode || 'subject-code'}/{type === 'question_bank' ? 'question-banks' : 'study-notes'}/</code>. You won’t need to add a SQL row manually.</p></section>
      </>}
    </div>
  </main>
}
