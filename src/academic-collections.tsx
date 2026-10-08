import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, ChevronRight, FileText } from 'lucide-react'
import './academic-collections.css'
import './resource-status.css'

export type AcademicSubject = { id?: string; code: string; name: string; shortName: string; credits: number }
export type AcademicDocument = { id: string; title: string; exam_type: string | null; unit_number: number | null; academic_year: string | null; file_name: string; storage_key: string }
type Subject = AcademicSubject
type Document = AcademicDocument
type SubjectApiRow = { id: string; subject_code: string; subject_name: string; short_name: string; credits: number }

const fallbackSubjects: Subject[] = [
  { code: '21MAB201T', name: 'Transforms and Boundary Value Problems', shortName: 'TBVP', credits: 4 },
  { code: '21CSS201T', name: 'Computer Organization and Architecture', shortName: 'COA', credits: 4 },
  { code: '21CSC201J', name: 'Data Structures and Algorithms', shortName: 'DSA', credits: 4 },
  { code: '21CSC202J', name: 'Operating Systems', shortName: 'OS', credits: 4 },
  { code: '21CSC203P', name: 'Advanced Programming Practice', shortName: 'APP', credits: 4 },
]

function useNeonSubjects() {
  const [subjects, setSubjects] = useState(fallbackSubjects)
  const [source, setSource] = useState<'loading' | 'neon' | 'sample'>('loading')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/subjects?semester=3', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Subjects API unavailable'); return response.json() })
      .then(({ subjects: rows }: { subjects: SubjectApiRow[] }) => {
        setSubjects(rows.map(row => ({ id: row.id, code: row.subject_code, name: row.subject_name, shortName: row.short_name, credits: row.credits })))
        setSource('neon')
      })
      .catch(error => { if (error.name !== 'AbortError') setSource('sample') })
    return () => controller.abort()
  }, [])
  return { subjects, source }
}

function useNeonDocuments(subjectCode: string | undefined, type: 'question_paper' | 'question_bank' | 'study_note') {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    if (!subjectCode) { setDocuments([]); return }
    const controller = new AbortController()
    setLoading(true)
    setConnected(false)
    fetch(`/api/documents?subjectCode=${encodeURIComponent(subjectCode)}&type=${type}`, { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Documents API unavailable'); return response.json() })
      .then(({ documents: rows }: { documents: Document[] }) => { setDocuments(rows); setConnected(true); setLoading(false) })
      .catch(error => { if (error.name !== 'AbortError') { setDocuments([]); setConnected(false); setLoading(false) } })
    return () => controller.abort()
  }, [subjectCode, type])
  return { documents, loading, connected }
}

function SemesterPicker({ semester, onChange }: { semester: number; onChange: (semester: number) => void }) {
  return <div className="semester-grid">{Array.from({ length: 8 }, (_, index) => index + 1).map(number =>
    <button onClick={() => onChange(number)} key={number} className={'semester-card ' + (semester === number ? 'selected' : '')}>
      <span>SEMESTER {String(number).padStart(2, '0')}</span><b>{number === 3 ? '5' : 'Coming soon'}</b><small>{number === 3 ? 'Beta subjects' : 'Not in beta'}</small>{semester === number && <i />}
    </button>)}</div>
}

function ComingSoon({ semester, content }: { semester: number; content: string }) {
  return <section className="semester-coming-soon" aria-live="polite"><p className="eyebrow">SEMESTER {String(semester).padStart(2, '0')}</p><h2>Coming soon</h2><p>{content} for this semester are not part of the beta yet.</p></section>
}

function SubjectList({ subjects, source, title, onSelect }: { subjects: Subject[]; source: 'loading' | 'neon' | 'sample'; title: string; onSelect: (subject: Subject) => void }) {
  const credits = subjects.reduce((total, subject) => total + subject.credits, 0)
  return <section className="collection-section"><div className="collection-heading"><div><p className="eyebrow">SEMESTER 03</p><h2>{title}</h2></div><span>{source === 'loading' ? 'Loading…' : `${subjects.length} subjects · ${credits} credits`}</span></div><div className="curriculum-list"><div className="curriculum-labels" aria-hidden="true"><span>Subject</span><span>Code</span><span>Credits</span><span /></div>{subjects.map(subject =>
    <button key={subject.code} onClick={() => onSelect(subject)}><span className="subject-identity"><b>{subject.name}</b><small>{subject.shortName}</small></span><span className="subject-code">{subject.code}</span><span className="credit-badge">{subject.credits} credits</span><ChevronRight size={18} /></button>)}</div></section>
}

function CollectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <section className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{subtitle}</p></section>
}

function EmptyResources({ loading, connected, label }: { loading: boolean; connected: boolean; label: string }) {
  return <div className="resource-empty"><FileText size={22} /><b>{loading ? 'Loading…' : connected ? 'No files yet' : 'Couldn’t load files'}</b><p>{connected ? `Published ${label} will appear here.` : 'Please check your connection and try again.'}</p></div>
}

export function QuestionBanksV2({ onOpen }: { onOpen: (document: AcademicDocument, subject: AcademicSubject, category: string) => void }) {
  const [semester, setSemester] = useState(3)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [materialType, setMaterialType] = useState<'question_paper' | 'question_bank'>('question_paper')
  const { subjects, source } = useNeonSubjects()
  const { documents, loading, connected } = useNeonDocuments(subject?.code, materialType)
  const changeSemester = (number: number) => { setSemester(number); setSubject(null); setMaterialType('question_paper') }
  return <><CollectionHeader eyebrow="ACADEMIC ARCHIVE" title="Question Papers" subtitle="Browse papers by semester and subject." /><SemesterPicker semester={semester} onChange={changeSemester} />{semester !== 3 ? <ComingSoon semester={semester} content="Question papers" /> : subject ?
    <section className="collection-section resource-view"><button className="collection-back" onClick={() => setSubject(null)}><ArrowLeft size={15} /> All semester 3 subjects</button><div className="resource-title"><div><p className="eyebrow">{subject.code} · {subject.credits} CREDITS</p><h2>{subject.name}</h2></div></div><div className="admin-material-tabs"><button className={materialType==='question_paper'?'active':''} onClick={()=>setMaterialType('question_paper')}>Question papers</button><button className={materialType==='question_bank'?'active':''} onClick={()=>setMaterialType('question_bank')}>Question banks</button></div>{documents.length ? <div className="resource-grid">{documents.map(document =>
      <button className="resource-card" onClick={() => onOpen(document, subject, document.exam_type ?? (materialType === 'question_bank' ? 'Question bank' : 'Question paper'))} key={document.id}><FileText size={21} /><div><span>{document.exam_type ?? (materialType==='question_bank' ? 'QUESTION BANK' : 'QUESTION PAPER')} · {document.academic_year ?? 'YEAR NOT SET'}</span><b>{document.title}</b><small>Open in STDiO Viewer <ChevronRight size={14} /></small></div></button>)}</div> : <EmptyResources loading={loading} connected={connected} label={materialType==='question_bank' ? 'question banks' : 'question papers'} />}</section>
    : <SubjectList subjects={subjects} source={source} title="Choose a subject" onSelect={setSubject} />}</>
}

export function StudyNotesV2({ onOpen }: { onOpen: (document: AcademicDocument, subject: AcademicSubject, category: string) => void }) {
  const [semester, setSemester] = useState(3)
  const [subject, setSubject] = useState<Subject | null>(null)
  const { subjects, source } = useNeonSubjects()
  const { documents, loading, connected } = useNeonDocuments(subject?.code, 'study_note')
  const changeSemester = (number: number) => { setSemester(number); setSubject(null) }
  return <><CollectionHeader eyebrow="MATERIAL LIBRARY" title="Study Notes" subtitle="Focused notes, organized around your semester and subjects." /><SemesterPicker semester={semester} onChange={changeSemester} />{semester !== 3 ? <ComingSoon semester={semester} content="Study notes" /> : subject ?
    <section className="collection-section resource-view"><button className="collection-back" onClick={() => setSubject(null)}><ArrowLeft size={15} /> All semester 3 subjects</button><div className="resource-title"><div><p className="eyebrow">{subject.code} · {subject.credits} CREDITS</p><h2>{subject.name}</h2></div></div>{documents.length ? <div className="resource-grid notes-resources">{documents.map(document =>
      <article className="resource-card" key={document.id}><BookOpen size={21} /><div><span>{document.unit_number ? `UNIT ${document.unit_number}` : 'STUDY NOTE'}</span><b>{document.title}</b><small>{document.file_name}</small><button className="btn outline" onClick={() => onOpen(document, subject, document.unit_number ? `Unit ${document.unit_number}` : 'Study note')}>Open in STDiO Viewer</button></div></article>)}</div> : <EmptyResources loading={loading} connected={connected} label="study notes" />}</section>
    : <SubjectList subjects={subjects} source={source} title="Choose a subject" onSelect={setSubject} />}</>
}
