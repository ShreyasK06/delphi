import { useState } from 'react'
import { knowledgeQuiz } from '../lib/score'

interface KnowledgeQuizProps {
  initialAnswers?: Record<string, string>
  onComplete: (answers: Record<string, string>, correctCount: number) => void
  onCancel?: () => void
}

export default function KnowledgeQuiz({ initialAnswers = {}, onComplete, onCancel }: KnowledgeQuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(() => {
    const existing = initialAnswers[knowledgeQuiz[0]?.id]
    return existing !== undefined ? Number(existing) : null
  })
  const [revealed, setRevealed] = useState(() => {
    return initialAnswers[knowledgeQuiz[0]?.id] !== undefined
  })

  const current = knowledgeQuiz[index]
  const total = knowledgeQuiz.length
  const isLast = index === total - 1

  const handleSelect = (optionIndex: number) => {
    if (revealed) return
    setSelected(optionIndex)
    setRevealed(true)
    setAnswers((prev) => ({ ...prev, [current.id]: String(optionIndex) }))
  }

  const handleNext = () => {
    if (isLast) {
      const finalAnswers = { ...answers }
      const correctCount = knowledgeQuiz.reduce((count, q) => {
        const a = finalAnswers[q.id]
        return a !== undefined && Number(a) === q.correct ? count + 1 : count
      }, 0)
      onComplete(finalAnswers, correctCount)
      return
    }
    const nextIndex = index + 1
    const nextQ = knowledgeQuiz[nextIndex]
    const existingAnswer = answers[nextQ.id]
    setIndex(nextIndex)
    setSelected(existingAnswer !== undefined ? Number(existingAnswer) : null)
    setRevealed(existingAnswer !== undefined)
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
          {current.topic}
        </span>
        <span className="text-xs text-ink-faint tabular-nums">
          {index + 1} / {total}
        </span>
      </div>

      {/* Step dots */}
      <div className="flex gap-1">
        {knowledgeQuiz.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
              i <= index ? 'bg-brand' : 'bg-surface-2'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-ink leading-relaxed">{current.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {current.options.map((opt, i) => {
          let cls =
            'w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors '
          if (!revealed) {
            cls +=
              selected === i
                ? 'border-brand bg-brand-soft text-brand-ink'
                : 'border-line-strong text-ink-mid hover:border-brand hover:bg-brand-soft/50'
          } else if (i === current.correct) {
            cls += 'border-ok bg-ok-soft text-ok-ink font-medium'
          } else if (i === selected && i !== current.correct) {
            cls += 'border-bad bg-bad-soft text-bad-ink'
          } else {
            cls += 'border-line text-ink-faint'
          }
          return (
            <button key={i} type="button" className={cls} onClick={() => handleSelect(i)}>
              {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback and advance */}
      {revealed && (
        <div className="mt-2 space-y-3">
          <div
            className={`rounded-lg px-4 py-2.5 text-sm ${
              selected === current.correct ? 'bg-ok-soft text-ok-ink' : 'bg-bad-soft text-bad-ink'
            }`}
          >
            {selected === current.correct
              ? 'Correct.'
              : `Not quite, the answer is: ${current.options[current.correct]}.`}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-xl bg-brand text-on-brand py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
          >
            {isLast ? 'Finish' : 'Next question'}
          </button>
        </div>
      )}

      {!revealed && (
        <p className="text-xs text-ink-faint text-center">Select an answer to continue</p>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-ink-faint hover:text-ink py-1 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
