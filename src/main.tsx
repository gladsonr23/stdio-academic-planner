import React, { useState } from 'react'
import { BookOpen, Bot, ChevronRight, FileText, MessageSquare, Minimize2, Presentation, Send, Sparkles, Video, X } from 'lucide-react'
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
  const nav: [View, string][] = [['questions', 'Question Bank'], ['notes', 'Study Notes'], ['library', 'Tools']]

  return <div className="app-shell">
    <header className="topnav">
      <div className="brand"><StdioLogo className="brand-logo"/><i/><b>Academic Planner</b></div>
      <nav>{nav.map(([key, label]) => <button key={key} onClick={() => setView(key)} className={view === key ? 'active' : ''}>{label}</button>)}</nav>
    </header>
    <main>{children}</main>
    <aside className="rail">
      <button className={drawer ? 'rail-active' : ''} onClick={() => setDrawer(!drawer)} aria-label="Open AI Assistant"><Bot /></button>
      <button onClick={() => setView('library')} aria-label="Open Tools" title="Tools"><Sparkles /></button>
      <button onClick={() => setView('notes')} aria-label="Open Study Notes" title="Study Notes"><FileText /></button>
    </aside>
    {drawer && <ToolDrawer close={() => setDrawer(false)} />}
    <nav className="bottomnav">
      <button className={view === 'questions' ? 'mobile-active' : ''} onClick={() => setView('questions')}><FileText size={18}/><span>Question Bank</span></button>
      <button className={view === 'notes' ? 'mobile-active' : ''} onClick={() => setView('notes')}><BookOpen size={18}/><span>Study Notes</span></button>
      <button className={view === 'library' ? 'mobile-active' : ''} onClick={() => setView('library')}><Sparkles size={18}/><span>Tools</span></button>
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

function Tools() {
  const tools = [
    { title: 'YouTube video to notes', detail: 'Turn a lecture video into clear study notes.', icon: Video, available: true },
    { title: 'PDF/PPT to notes', detail: 'Create study notes from a PDF or presentation.', icon: Presentation, available: true },
    ...Array.from({ length: 6 }, (_, index) => ({ title: 'Coming soon', detail: 'More study tools are on the way.', icon: Sparkles, available: false })),
  ]
  return <><section className="page-heading"><p className="eyebrow">STUDY SUPPORT</p><h1>Tools</h1><p className="lede">Choose a tool to turn your learning materials into useful study resources.</p></section><div className="tool-grid">{tools.map(({ title, detail, icon: Icon, available }, index) => <article className={'tool-card' + (available ? ' tool-card-ready' : '')} key={`${title}-${index}`}><span className="tool-card-kicker">{available ? 'STUDY TOOL' : 'COMING SOON'}</span><Icon size={21}/><h2>{title}</h2><p>{detail}</p></article>)}</div></>
}

function App() {
  const [view, setView] = useState<View>('questions')
  const [drawer, setDrawer] = useState(false)
  const [viewer, setViewer] = useState<{ document: AcademicDocument; subject: AcademicSubject; category: string } | null>(null)
  const openDocument = (document: AcademicDocument, subject: AcademicSubject, category: string) => setViewer({ document, subject, category })
  const content = view === 'questions' ? <QuestionBanksV2 onOpen={openDocument}/> : view === 'notes' ? <StudyNotesV2 onOpen={openDocument}/> : <Tools/>

  return <AppShell view={view} setView={nextView => { setViewer(null); setView(nextView) }} drawer={drawer} setDrawer={setDrawer}>
    <div className={'page ' + (viewer ? 'stdio-source-hidden' : '')} aria-hidden={viewer ? true : undefined}>{content}<FloatingAI/></div>
    {viewer && <StdioViewer {...viewer} onBack={() => setViewer(null)} />}
  </AppShell>
}

const isAdminPath = window.location.pathname.replace(/\/$/, '') === '/admin'
createRoot(document.getElementById('root')!).render(isAdminPath ? <AdminPortal/> : <App/> )
