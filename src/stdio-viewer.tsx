import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, BookOpen, FileText, MessageSquareText, RotateCw, Send, Sparkles } from 'lucide-react'
import type { AcademicDocument, AcademicSubject } from './academic-collections'
import { StdioLogo } from './stdio-logo'
import './stdio-viewer.css'

type Source = { id: string; page: number; excerpt: string }
type Message = { id: string; role: 'user' | 'assistant'; content: string; sources?: Source[]; error?: boolean }
type Props = {
  document: AcademicDocument
  subject: AcademicSubject
  category: string
  onBack: () => void
}

const starterQuestions = [
  'Give me a clear summary of this material',
  'Explain the most important concepts simply',
  'What should I focus on for an exam?',
]

export function StdioViewer({ document, subject, category, onBack }: Props) {
  const [reload, setReload] = useState(0)
  const [pdfPage, setPdfPage] = useState<number | null>(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([])
    setQuestion('')
    setPdfPage(null)
  }, [document.id])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  async function ask(event?: FormEvent<HTMLFormElement>, suggestedQuestion?: string) {
    event?.preventDefault()
    const prompt = (suggestedQuestion ?? question).trim()
    if (!prompt || loading) return
    const priorMessages = messages
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: prompt }
    setMessages(previous => [...previous, userMessage])
    setQuestion('')
    setLoading(true)

    try {
      const response = await fetch('/api/rag', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          question: prompt,
          history: priorMessages.slice(-6).map(message => ({ role: message.role, content: message.content })),
        }),
      })
      const data = await response.json() as { error?: string; answer?: string; sources?: Source[] }
      if (!response.ok) throw new Error(data.error || 'STDiO Bot could not answer right now. Please try again.')
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: 'assistant', content: data.answer || 'I could not find a supported answer in this file.',
        sources: data.sources ?? [],
      }])
    } catch (error) {
      setMessages(previous => [...previous, {
        id: crypto.randomUUID(), role: 'assistant',
        content: error instanceof Error ? error.message : 'STDiO Bot could not answer right now. Please try again.',
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

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
        <iframe key={reload} className="stdio-pdf-frame" src={`/api/file?id=${encodeURIComponent(document.id)}${pdfPage ? `#page=${pdfPage}` : ''}`} title={`${document.title} PDF`} />
        <p className="stdio-pdf-hint">Select a source below to jump to that page. You can also copy a passage and ask about it.</p>
      </div>

      <aside className="stdio-rag-panel" aria-label="Ask STDiO Bot about this document">
        <div className="stdio-rag-title"><span><StdioLogo className="stdio-rag-logo" /></span><div><p>STDiO BOT</p><h2>Ask about this file</h2></div></div>
        <div className="stdio-context-card"><span>DOCUMENT CONTEXT</span><b>{document.title}</b><p>{subject.code} · {subject.name}</p><small><Sparkles size={12} /> Answers grounded in this PDF</small></div>

        <div className="stdio-rag-chat" aria-live="polite" aria-label="Conversation">
          {!messages.length && <div className="stdio-rag-welcome">
            <div><Sparkles size={15} /> Your study partner is ready</div>
            <p>Ask a question, get an explanation, or use a starter prompt.</p>
            <div className="stdio-rag-starters">{starterQuestions.map(starter => <button key={starter} disabled={loading} onClick={() => void ask(undefined, starter)}>{starter}</button>)}</div>
          </div>}
          {messages.map(message => <article key={message.id} className={`stdio-chat-message ${message.role}${message.error ? ' error' : ''}`}>
            <span className="stdio-chat-role">{message.role === 'user' ? 'YOU' : 'STDiO BOT'}</span>
            <p>{message.content}</p>
            {message.sources?.length ? <div className="stdio-chat-sources"><span>IN THIS PDF</span>{message.sources.map(source => <button key={`${message.id}-${source.id}`} onClick={() => setPdfPage(source.page)} title={source.excerpt}>p. {source.page}</button>)}</div> : null}
          </article>)}
          {loading && <div className="stdio-chat-thinking"><span className="stdio-thinking-dots"><i /><i /><i /></span>{messages.length < 2 ? 'Reading this PDF and finding the best passages…' : 'Checking the PDF for your answer…'}</div>}
          <div ref={chatEnd} />
        </div>

        <form className="stdio-rag-composer" onSubmit={event => void ask(event)}>
          <label className="stdio-question-label" htmlFor="stdio-viewer-question">Your question</label>
          <textarea id="stdio-viewer-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1200} disabled={loading} placeholder="Ask about a concept, a page, or paste a question from the PDF…" />
          <div className="stdio-composer-footer"><span>Relevant PDF text is sent to Google Gemini to answer.</span><button className="stdio-ask-button" disabled={!question.trim() || loading} type="submit"><MessageSquareText size={15} /> {loading ? 'Thinking…' : 'Ask STDiO Bot'} <Send size={13} /></button></div>
        </form>
      </aside>
    </div>
  </section>
}
