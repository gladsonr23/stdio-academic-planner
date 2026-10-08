import React, { useState } from 'react'
import { BookOpen, Bot, ChevronRight, FileText, FolderOpen, MessageSquare, Minimize2, Plus, Send, Sparkles, X } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './coming-soon.css'
import { QuestionBanksV2, StudyNotesV2 } from './academic-collections'
import type { AcademicDocument, AcademicSubject } from './academic-collections'
import { StdioViewer } from './stdio-viewer'
import { StdioLogo } from './stdio-logo'
import { AdminPortal } from './admin-portal'

type View = 'questions' | 'notes' | 'library'

function AppShell({ children, view, setView, drawer, setDrawer }: {
  children: React.ReactNode
  view: View
  setView: (view: View) => void
  drawer: boolean
  setDrawer: (open: boolean) => void
}) {
  const nav: [View, string][] = [['questions', 'Question Bank'], ['notes', 'Study Notes'], ['library', 'Library']]

  return <div className="app-shell">
    <header className="topnav">
      <div className="brand"><StdioLogo className="brand-logo"/><i/><b>Academic Planner</b></div>
      <nav>{nav.map(([key, label]) => <button key={key} onClick={() => setView(key)} className={view === key ? 'active' : ''}>{label}</button>)}</nav>
      <button className="avatar" aria-label="Open team upload portal" title="Team upload portal" onClick={() => window.location.assign(`${import.meta.env.BASE_URL}admin`)}>G</button>
    </header>
    <main>{children}</main>
    <aside className="rail">
      <button className={drawer ? 'rail-active' : ''} onClick={() => setDrawer(!drawer)} aria-label="Open AI Assistant"><Bot /></button>
      <button aria-label="Open One-Shot"><Sparkles /></button>
      <button onClick={() => setView('questions')} aria-label="Open question bank"><FileText /></button>
    </aside>
    {drawer && <ToolDrawer close={() => setDrawer(false)} />}
    <nav className="bottomnav">
      <button className={view === 'questions' ? 'mobile-active' : ''} onClick={() => setView('questions')}><FileText size={18}/><span>Question Bank</span></button>
      <button className={view === 'notes' ? 'mobile-active' : ''} onClick={() => setView('notes')}><BookOpen size={18}/><span>Study Notes</span></button>
      <button className={view === 'library' ? 'mobile-active' : ''} onClick={() => setView('library')}><FolderOpen size={18}/><span>Library</span></button>
    </nav>
  </div>
}

function ToolDrawer({ close }: { close: () => void }) {
  return <aside className="tool-drawer">
    <header><div><b>STDIO AI</b><p>Using your study material</p></div><button className="icon-button" onClick={close} aria-label="Close assistant"><X size={18}/></button></header>
    <div className="assistant-context"><span>Operating Systems</span><span>Question bank</span><span>Page 2</span></div>
    <h3>How can I help with this material?</h3>
    <div className="prompts">{['Explain this question', 'Give me a 5-mark answer', 'Has this concept appeared before?', 'What should I revise from Unit 3?'].map(prompt => <button key={prompt}>{prompt}<ChevronRight size={15}/></button>)}</div>
    <div className="sources"><b>Sources · 3</b><p>OS_Unit3.pdf · Faculty material<br/>OS_Question_Bank.pdf · Question bank</p></div>
    <label className="chat-input"><input aria-label="Ask STDIO AI" placeholder="Ask about your material…"/><button aria-label="Send"><Send size={16}/></button></label>
  </aside>
}

function FloatingAI() {
  const [open, setOpen] = useState(false)
  const [mini, setMini] = useState(false)
  return <>{open && <aside className={'floating-ai ' + (mini ? 'minimized' : '')}>
    <header><div><b>STDIO AI</b><p>Using your study material</p></div><div><button onClick={() => setMini(!mini)} aria-label="Minimize"><Minimize2 size={16}/></button><button onClick={() => setOpen(false)} aria-label="Close"><X size={16}/></button></div></header>
    {!mini && <><p className="ai-copy">I have your current study material in context.</p><button className="ai-suggest">Explain this question</button><label className="chat-input"><input placeholder="Ask anything…"/><button aria-label="Send"><Send size={16}/></button></label></>}
  </aside>}<button className="ai-fab" onClick={() => setOpen(!open)} aria-label="Toggle floating AI"><MessageSquare size={20}/><span>AI</span></button></>
}

function Library() {
  return <><section className="page-heading"><p className="eyebrow">YOUR MATERIALS</p><h1>Library</h1><p className="lede">A quiet place for all your source material.</p></section><div className="empty-library"><FolderOpen size={28}/><h2>Organize your course materials</h2><p>Add PDFs, PPTs and notes to build your personal academic archive.</p><button className="btn primary"><Plus size={16}/> Add material</button></div></>
}

function App() {
  const [view, setView] = useState<View>('questions')
  const [drawer, setDrawer] = useState(false)
  const [viewer, setViewer] = useState<{ document: AcademicDocument; subject: AcademicSubject; category: string } | null>(null)
  const openDocument = (document: AcademicDocument, subject: AcademicSubject, category: string) => setViewer({ document, subject, category })
  const content = view === 'questions' ? <QuestionBanksV2 onOpen={openDocument}/> : view === 'notes' ? <StudyNotesV2 onOpen={openDocument}/> : <Library/>

  return <AppShell view={view} setView={nextView => { setViewer(null); setView(nextView) }} drawer={drawer} setDrawer={setDrawer}>
    <div className={'page ' + (viewer ? 'stdio-source-hidden' : '')} aria-hidden={viewer ? true : undefined}>{content}<FloatingAI/></div>
    {viewer && <StdioViewer {...viewer} onBack={() => setViewer(null)} />}
  </AppShell>
}

const isAdminPath = window.location.pathname.replace(/\/$/, '') === '/admin'
createRoot(document.getElementById('root')!).render(isAdminPath ? <AdminPortal/> : <App/> )
