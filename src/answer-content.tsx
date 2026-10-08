import type { ReactNode } from 'react'
import { plainAnswerText } from '../shared/plain-answer'

function inlineFormat(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    return part
  })
}

/** Render model Markdown as safe, semantic text blocks (no HTML or math renderer). */
export function AnswerContent({ content }: { content: string }) {
  const lines = plainAnswerText(content).split(/\r?\n/)
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let ordered = false

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}>{inlineFormat(paragraph.join(' '))}</p>)
    paragraph = []
  }
  const flushList = () => {
    if (list.length) {
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={`l-${blocks.length}`}>{list.map((item, index) => <li key={index}>{inlineFormat(item)}</li>)}</Tag>)
    }
    list = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { flushParagraph(); flushList(); continue }
    const heading = line.match(/^#{1,3}\s+(.+)$/)
    if (heading) {
      flushParagraph(); flushList()
      blocks.push(<h3 key={`h-${blocks.length}`}>{inlineFormat(heading[1])}</h3>)
      continue
    }
    const bullet = line.match(/^[-*+]\s+(.+)$/)
    const number = line.match(/^\d+[.)]\s+(.+)$/)
    if (bullet || number) {
      flushParagraph()
      const isOrdered = Boolean(number)
      if (list.length && ordered !== isOrdered) flushList()
      ordered = isOrdered
      list.push((bullet ?? number)![1])
      continue
    }
    flushList()
    paragraph.push(line.replace(/^\|\s*/, '').replace(/\s*\|\s*$/, ''))
  }
  flushParagraph(); flushList()
  return <div className="stdio-answer-content">{blocks}</div>
}
