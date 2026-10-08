import { useState } from 'react'
import { ArrowLeft, BookOpen, Bot, Copy, FileText, MessageSquareText, RotateCw } from 'lucide-react'
import type { AcademicDocument, AcademicSubject } from './academic-collections'
import './stdio-viewer.css'

type Props = {
  document: AcademicDocument
  subject: AcademicSubject
  category: string
  onBack: () => void
}

export function StdioViewer({ document, subject, category, onBack }: Props) {
  const [reload, setReload] = useState(0)
  const [question, setQuestion] = useState('')

  return <section className="stdio-viewer" data-document-id={document.id} aria-label="STDiO Viewer">
    <header className="stdio-viewer-header">
      <button className="stdio-viewer-back" onClick={onBack}><ArrowLeft size={17} /> Back to materials</button>
      <div className="stdio-viewer-heading">
        <span className="stdio-viewer-mark"><BookOpen size={17} /></span>
        <div><p>STDiO VIEWER <span>·</span> {subject.shortName}</p><h1 title={document.title}>{document.title}</h1></div>
      </div>
      <div className="stdio-viewer-filemeta"><span>{category}</span><span>{document.academic_year ?? 'Academic material'}</span></div>
    </header>

    <div className="stdio-viewer-layout">
      <div className="stdio-pdf-pane">
        <div className="stdio-pdf-toolbar">
          <div><FileText size={16} /><span title={document.file_name}>{document.file_name}</span></div>
          <button onClick={() => setReload(value => value + 1)} aria-label="Reload PDF" title="Reload PDF"><RotateCw size={16} /></button>
        </div>
        <iframe key={reload} className="stdio-pdf-frame" src={`/api/file?id=${encodeURIComponent(document.id)}`} title={`${document.title} PDF`} />
        <p className="stdio-pdf-hint">Tip: select text in the paper, copy it, then paste it into the question panel.</p>
      </div>

      <aside className="stdio-rag-panel" aria-label="Ask STDiO Bot about this document">
        <div className="stdio-rag-title"><span><Bot size={18} /></span><div><p>STDiO BOT</p><h2>Ask about this file</h2></div></div>
        <div className="stdio-context-card"><span>DOCUMENT CONTEXT</span><b>{document.title}</b><p>{subject.code} · {subject.name}</p><small>Document ID attached for future RAG queries</small></div>
        <label className="stdio-question-label" htmlFor="stdio-viewer-question">Question or highlighted passage</label>
        <textarea id="stdio-viewer-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Copy a question from the PDF and paste it here, or write what you want to know…" />
        <p className="stdio-rag-note"><Copy size={14} /> The PDF is open in this viewer. Copy a passage from it and paste above to keep your question tied to this file.</p>
        <button className="stdio-ask-button" disabled title="RAG answers will be enabled when the backend is connected"><MessageSquareText size={16} /> Ask STDiO Bot</button>
        <div className="stdio-rag-status"><span /> RAG answers are not connected yet</div>
        <div className="stdio-rag-footnote">Your selected document and question are ready to pass to the RAG service once it is built.</div>
      </aside>
    </div>
  </section>
}
