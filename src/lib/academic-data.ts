import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'

export type AcademicSubject = {
  id: string
  name: string
  papers: number
  questions: number
  years: string
}

export const mockSubjects: AcademicSubject[] = [
  { id: 'os', name: 'Operating Systems', papers: 8, questions: 124, years: '2024—26' },
  { id: 'coa', name: 'Computer Organisation & Architecture', papers: 7, questions: 101, years: '2024—26' },
  { id: 'dsa', name: 'Data Structures & Algorithms', papers: 9, questions: 146, years: '2024—26' },
  { id: 'ps', name: 'Probability & Statistics', papers: 7, questions: 92, years: '2024—26' },
]

type SubjectRow = { id: string; name: string }
type DocumentRow = { subject_id: string; exam_year: number }
type QuestionRow = { subject_id: string }

export function useSemesterSubjects(semester = 3) {
  const [subjects, setSubjects] = useState<AcademicSubject[]>(mockSubjects)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [source, setSource] = useState<'supabase' | 'mock'>(
    isSupabaseConfigured ? 'supabase' : 'mock',
  )

  useEffect(() => {
    if (!supabase) return

    let active = true

    async function loadSubjects() {
      setLoading(true)

      const [subjectResult, documentResult, questionResult] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name')
          .eq('semester', semester)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('documents')
          .select('subject_id, exam_year')
          .eq('semester', semester)
          .eq('status', 'published')
          .eq('document_type', 'question_paper'),
        supabase
          .from('questions')
          .select('subject_id')
          .eq('semester', semester)
          .eq('status', 'published'),
      ])

      if (!active) return

      if (subjectResult.error || documentResult.error || questionResult.error) {
        console.warn('STDIO is using sample academic data until Supabase is ready.', {
          subjects: subjectResult.error,
          documents: documentResult.error,
          questions: questionResult.error,
        })
        setSubjects(mockSubjects)
        setSource('mock')
        setLoading(false)
        return
      }

      const documentRows = (documentResult.data ?? []) as DocumentRow[]
      const questionRows = (questionResult.data ?? []) as QuestionRow[]

      const liveSubjects = ((subjectResult.data ?? []) as SubjectRow[]).map((subject) => {
        const papers = documentRows.filter((document) => document.subject_id === subject.id)
        const years = papers.map((paper) => paper.exam_year).sort()

        return {
          id: subject.id,
          name: subject.name,
          papers: papers.length,
          questions: questionRows.filter((question) => question.subject_id === subject.id).length,
          years: years.length ? `${years[0]}—${String(years.at(-1)).slice(-2)}` : 'No papers yet',
        }
      })

      setSubjects(liveSubjects.length ? liveSubjects : mockSubjects)
      setSource(liveSubjects.length ? 'supabase' : 'mock')
      setLoading(false)
    }

    loadSubjects()
    return () => {
      active = false
    }
  }, [semester])

  return { subjects, loading, source }
}

