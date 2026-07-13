'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import type { HiringAssessmentCopy } from '@/lib/copy'
import type { PublicAssessmentQuestion, PublicAssessmentView } from '@/lib/hiring/assessment/public-taking'

import styles from './AssessmentTaking.module.css'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface AssessmentTakingClientProps {
  token: string
  copy: HiringAssessmentCopy
  initialAssessment: PublicAssessmentView | null
}

const formatTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template)

const formatMinutes = (minutes: number) => `${minutes} min`

const formatClock = (seconds: number | null) => {
  if (seconds == null) return '--:--'
  const safe = Math.max(0, seconds)
  const mins = Math.floor(safe / 60)
  const secs = safe % 60

  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const optionValue = (option: unknown, index: number): string => {
  if (typeof option === 'string' || typeof option === 'number') return String(option)

  if (option && typeof option === 'object') {
    const record = option as Record<string, unknown>
    const value = record.value ?? record.id ?? record.key ?? record.label ?? record.text

    if (value != null) return String(value)
  }

  return `option-${index + 1}`
}

const optionLabel = (option: unknown, index: number): string => {
  if (typeof option === 'string' || typeof option === 'number') return String(option)

  if (option && typeof option === 'object') {
    const record = option as Record<string, unknown>
    const value = record.label ?? record.text ?? record.title ?? record.value ?? record.id

    if (value != null) return String(value)
  }

  return `Opción ${index + 1}`
}

const answerKey = (answer: Record<string, unknown>) => JSON.stringify(answer)

const isAnswered = (question: PublicAssessmentQuestion | undefined, answer: Record<string, unknown>) => {
  if (!question) return false
  if (question.type === 'single_choice') return typeof answer.selected === 'string' && answer.selected.length > 0
  if (question.type === 'multi_choice') return Array.isArray(answer.selected) && answer.selected.length > 0
  if (question.type === 'likert') return Number.isFinite(Number(answer.value))

  return typeof answer.text === 'string' && answer.text.trim().length > 0
}

const responseAnswerFor = (assessment: PublicAssessmentView | null, question: PublicAssessmentQuestion | undefined) => {
  if (!assessment || !question) return {}

  return assessment.responses.find((response) => response.questionId === question.questionId)?.answer ?? {}
}

const apiRequest = async (token: string, body: Record<string, unknown>): Promise<PublicAssessmentView> => {
  const response = await fetch(`/api/public/assessment/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = await response.json() as { ok: boolean; assessment?: PublicAssessmentView; message?: string }

  if (!response.ok || !payload.ok || !payload.assessment) {
    throw new Error(payload.message ?? 'assessment_request_failed')
  }

  return payload.assessment
}

const scrollAssessmentToTop = () => {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  })
}

const AssessmentTakingClient = ({ copy, initialAssessment, token }: AssessmentTakingClientProps) => {
  const [assessment, setAssessment] = useState(initialAssessment)
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState(false)
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState<Record<string, unknown>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [timeNote, setTimeNote] = useState<string | null>(null)
  const cardRef = useRef<HTMLElement | null>(null)
  const currentQuestionIdRef = useRef<string | null>(null)
  const lastSavedRef = useRef<Record<string, string>>({})
  const saveTimerRef = useRef<number | null>(null)
  const saveFeedbackTimerRef = useRef<number | null>(null)

  const questions = assessment?.questions ?? []
  const currentQuestion = questions[step]
  const started = assessment?.assessment.status === 'in_progress'
  const submitted = assessment?.assessment.status === 'submitted' || assessment?.assessment.status === 'scored'

  const remainingSeconds = useMemo(() => {
    if (!assessment?.timing.expiresAt) return assessment?.timing.remainingSeconds ?? null

    return Math.max(0, Math.ceil((new Date(assessment.timing.expiresAt).getTime() - now) / 1000))
  }, [assessment?.timing.expiresAt, assessment?.timing.remainingSeconds, now])

  const expired = Boolean(started && remainingSeconds === 0 && !submitted)
  const timerTone = remainingSeconds != null && remainingSeconds <= 60 ? 'critical' : remainingSeconds != null && remainingSeconds <= 300 ? 'warning' : 'normal'
  const timerTotalSeconds = Math.max(1, (assessment?.timing.effectiveMinutes ?? 0) * 60)
  const timerPercent = remainingSeconds == null ? 100 : Math.max(0, Math.min(100, (remainingSeconds / timerTotalSeconds) * 100))
  const timerVisualNote = timerTone === 'critical' ? copy.taking.timeWarningOne : timerTone === 'warning' ? copy.taking.timeWarningFive : null
  const answeredIds = useMemo(() => new Set(assessment?.responses.map((response) => response.questionId).filter(Boolean) ?? []), [assessment?.responses])
  const progressPercent = questions.length === 0 ? 0 : ((step + 1) / questions.length) * 100

  useEffect(() => {
    if (!started || submitted) return undefined

    const id = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(id)
  }, [started, submitted])

  useEffect(() => {
    if (!started || !currentQuestion) return

    const questionChanged = currentQuestionIdRef.current !== currentQuestion.questionId

    currentQuestionIdRef.current = currentQuestion.questionId

    if (!questionChanged) return

    if (saveFeedbackTimerRef.current) window.clearTimeout(saveFeedbackTimerRef.current)
    setAnswer(responseAnswerFor(assessment, currentQuestion))
    setFieldError(null)
    setSaveState('idle')
    window.requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }))
  }, [assessment, currentQuestion, started])

  useEffect(() => () => {
    if (saveFeedbackTimerRef.current) window.clearTimeout(saveFeedbackTimerRef.current)
  }, [])

  useEffect(() => {
    if (remainingSeconds == null) return
    if (remainingSeconds === 300) setTimeNote(copy.taking.timeWarningFive)
    if (remainingSeconds === 60) setTimeNote(copy.taking.timeWarningOne)
  }, [copy.taking.timeWarningFive, copy.taking.timeWarningOne, remainingSeconds])

  const saveAnswer = async (question = currentQuestion, answerValue = answer): Promise<PublicAssessmentView | null> => {
    if (!question || !isAnswered(question, answerValue) || submitted || expired) return null

    const key = answerKey(answerValue)

    if (lastSavedRef.current[question.questionId] === key) return assessment

    setSaveState('saving')
    if (saveFeedbackTimerRef.current) window.clearTimeout(saveFeedbackTimerRef.current)

    try {
      const updated = await apiRequest(token, { action: 'save', questionId: question.questionId, answer: answerValue })

      lastSavedRef.current[question.questionId] = key
      setAssessment(updated)
      setSaveState('saved')
      setFieldError(null)
      saveFeedbackTimerRef.current = window.setTimeout(() => {
        setSaveState((current) => current === 'saved' ? 'idle' : current)
      }, 1800)

      return updated
    } catch {
      setSaveState('error')
      setFieldError(copy.taking.errorBody)

      return null
    }
  }

  useEffect(() => {
    if (!started || !currentQuestion || submitted || expired) return undefined
    if (!isAnswered(currentQuestion, answer)) return undefined

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      void saveAnswer(currentQuestion, answer)
    }, currentQuestion.type === 'open_text' || currentQuestion.type === 'situational' ? 450 : 150)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, currentQuestion?.questionId, started, submitted, expired])

  const start = async () => {
    if (!consent) return
    setLoading(true)

    try {
      const startedAssessment = await apiRequest(token, { action: 'start' })

      setAssessment(startedAssessment)
      setNow(Date.now())
      scrollAssessmentToTop()
    } finally {
      setLoading(false)
    }
  }

  const goNext = async () => {
    if (!currentQuestion) return

    if (!isAnswered(currentQuestion, answer)) {
      setFieldError(copy.taking.answerRequired)

      return
    }

    const savedAssessment = await saveAnswer()

    if (!savedAssessment) return

    if (step < questions.length - 1) {
      setStep((current) => current + 1)
      scrollAssessmentToTop()
    } else {
      const savedQuestionIds = new Set(savedAssessment.responses.map((response) => response.questionId).filter(Boolean))
      const missingIndex = questions.findIndex((question) => !savedQuestionIds.has(question.questionId))

      if (missingIndex >= 0) {
        setStep(missingIndex)
        setFieldError(copy.taking.answerRequired)
        scrollAssessmentToTop()

        return
      }

      setSubmitOpen(true)
    }
  }

  const submit = async () => {
    setSubmitting(true)

    try {
      const updated = await apiRequest(token, { action: 'submit' })

      setAssessment(updated)
      setSubmitOpen(false)
    } catch {
      setSubmitOpen(false)
      setFieldError(copy.taking.errorBody)
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter') return
    if ((event.target as HTMLElement).tagName === 'TEXTAREA') return

    event.preventDefault()
    void goNext()
  }

  const updateAnswer = (nextAnswer: Record<string, unknown>) => {
    setAnswer(nextAnswer)
    setFieldError(null)

    if (currentQuestion && isAnswered(currentQuestion, nextAnswer) && started && !submitted && !expired) {
      if (saveFeedbackTimerRef.current) window.clearTimeout(saveFeedbackTimerRef.current)
      setSaveState('saving')
    } else {
      setSaveState('idle')
    }
  }

  if (!assessment) {
    return (
      <section className={styles.assessmentRoot}>
        <article className={styles.terminalCard} data-capture='assessment-invalid'>
          <div className={styles.terminalIcon} aria-hidden='true'>
            <i className='tabler-link-off' />
          </div>
          <h1 className={styles.terminalTitle}>{copy.taking.invalidTitle}</h1>
          <p className={styles.terminalBody}>{copy.taking.invalidBody}</p>
        </article>
      </section>
    )
  }

  if (submitted) {
    return (
      <section className={styles.assessmentRoot}>
        <article className={styles.terminalCard} data-capture='assessment-submitted' role='status'>
          <div className={`${styles.terminalIcon} ${styles.terminalIconSuccess}`} aria-hidden='true'>
            <i className='tabler-circle-check' />
          </div>
          <h1 className={styles.terminalTitle}>{copy.taking.submittedTitle}</h1>
          <p className={styles.terminalBody}>{copy.taking.submittedBody}</p>
        </article>
      </section>
    )
  }

  if (expired) {
    return (
      <section className={styles.assessmentRoot}>
        <article className={styles.terminalCard} data-capture='assessment-expired' role='status'>
          <div className={`${styles.terminalIcon} ${styles.terminalIconWarn}`} aria-hidden='true'>
            <i className='tabler-hourglass-empty' />
          </div>
          <h1 className={styles.terminalTitle}>{copy.taking.expiredTitle}</h1>
          <p className={styles.terminalBody}>{copy.taking.expiredBody}</p>
        </article>
      </section>
    )
  }

  if (!started) {
    return (
      <section className={styles.assessmentRoot}>
        <article className={styles.instructionsCard} data-capture='assessment-instructions'>
          <span className={styles.eyebrow}>
            <i className='tabler-clipboard-check' aria-hidden='true' />
            {assessment.assessment.publicId}
          </span>
          <h1 className={styles.instructionsTitle}>{copy.taking.instructionsTitle}</h1>
          <p className={styles.instructionsBody}>
            {formatTemplate(copy.taking.instructionsBody, {
              sections: Math.max(assessment.competencies.length, questions.length),
              minutes: formatMinutes(assessment.timing.effectiveMinutes),
            })}
          </p>
          {assessment.timing.hasAccommodation ? (
            <div className={styles.accommodationBanner}>
              <i className='tabler-clock-plus' aria-hidden='true' />
              <strong>{formatTemplate(copy.taking.accommodation, { minutes: assessment.timing.extraMinutes })}</strong>
            </div>
          ) : null}
          <h2 className={styles.muted}>{copy.taking.sectionsTitle}</h2>
          <div className={styles.sectionList}>
            {assessment.competencies.map((competency) => (
              <div className={styles.sectionRow} key={competency.competencyId}>
                <span className={styles.sectionIcon} aria-hidden='true'>
                  <i className={competency.category === 'attitudinal' ? 'tabler-heart-handshake' : 'tabler-bulb'} />
                </span>
                <div>
                  <strong>{competency.name}</strong>
                  <div className={styles.muted}>{competency.targetLevel ?? competency.category}</div>
                </div>
              </div>
            ))}
          </div>
          {questions.length === 0 ? (
            <div className={styles.accommodationBanner}>
              <i className='tabler-alert-triangle' aria-hidden='true' />
              <div>
                <strong>{copy.taking.noQuestionsTitle}</strong>
                <p className={styles.timerNote}>{copy.taking.noQuestionsBody}</p>
              </div>
            </div>
          ) : null}
          <label className={styles.consentRow}>
            <input type='checkbox' checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{copy.taking.consent}</span>
          </label>
          <div className={styles.actionsRow}>
            <span />
            <button
              className={styles.primaryButton}
              type='button'
              data-capture='assessment-start'
              disabled={!consent || loading || questions.length === 0}
              onClick={() => void start()}
            >
              {loading ? copy.taking.loadingTitle : copy.taking.start}
            </button>
          </div>
        </article>
      </section>
    )
  }

  const saveCopy = saveState === 'saving' ? copy.taking.saving : saveState === 'saved' ? copy.taking.saved : saveState === 'error' ? copy.taking.errorTitle : ''

  return (
    <section className={`${styles.assessmentRoot} ${styles.assessmentRootActive}`}>
      <div className={styles.assessmentShell}>
        <div className={styles.sessionBar}>
          <span className={styles.sessionRole}>
            <i className='tabler-briefcase' aria-hidden='true' />
            {assessment.assessment.roleTitle}
          </span>
          <div
            className={`${styles.timerCard} ${timerTone === 'warning' ? styles.timerWarning : ''} ${timerTone === 'critical' ? styles.timerCritical : ''}`}
            data-capture='assessment-timer'
            role='timer'
            aria-label={`${copy.taking.timeRemaining} ${formatClock(remainingSeconds)}`}
          >
            <i className={`tabler-clock-hour-4 ${styles.timerIcon}`} aria-hidden='true' />
            <div className={styles.timerContent}>
              <div className={styles.timerMeta}>
                <span className={styles.timerLabel}>{copy.taking.timeRemaining}</span>
                {timerVisualNote ? <span className={styles.timerBadge}>{timerVisualNote}</span> : null}
              </div>
              <div className={styles.timerCountdown}>
                <span className={styles.timerValue}>{formatClock(remainingSeconds)}</span>
                <span className={styles.timerTrack} aria-hidden='true'>
                  <span className={styles.timerFill} style={{ width: `${timerPercent}%` }} />
                </span>
              </div>
            </div>
          </div>
          {timeNote ? <span className={styles.srOnly} aria-live='polite'>{timeNote}</span> : null}
        </div>
        <main className={styles.mainStack}>
          <div className={styles.wizardHeader}>
            <div className={styles.progressMeta}>
              <span>{formatTemplate(copy.taking.progressLabel, { current: step + 1, total: questions.length, competency: currentQuestion?.competencyName ?? '' })}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className={styles.progressTrack} aria-hidden='true'>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <div className={styles.steps} aria-label={copy.taking.sectionsTitle}>
              {questions.map((question, index) => {
                const active = index === step
                const done = answeredIds.has(question.questionId)

                return (
                  <button
                    key={question.questionId}
                    type='button'
                    className={`${styles.stepButton} ${active ? styles.stepButtonActive : ''} ${done ? styles.stepButtonDone : ''}`}
                    aria-current={active ? 'step' : undefined}
                    onClick={() => setStep(index)}
                  >
                    {done && !active ? <i className='tabler-check' aria-hidden='true' /> : index + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {currentQuestion ? (
            <article
              key={currentQuestion.questionId}
              ref={cardRef}
              tabIndex={-1}
              className={styles.questionCard}
              data-capture='assessment-question'
              onKeyDown={handleQuestionKeyDown}
            >
              <div className={styles.questionHeader}>
                <span className={styles.questionIcon} aria-hidden='true'>
                  <i className='tabler-target-arrow' />
                </span>
                <span className={styles.questionCompetency}>{currentQuestion.competencyName}</span>
              </div>
              <h1 className={styles.questionTitle}>{currentQuestion.prompt}</h1>
              <div className={`${styles.inputStack} ${currentQuestion.type === 'likert' ? styles.inputStackLikert : ''}`}>
                {currentQuestion.type === 'single_choice' || currentQuestion.type === 'multi_choice' ? (
                  currentQuestion.options.map((option, index) => {
                    const value = optionValue(option, index)

                    const selected = currentQuestion.type === 'multi_choice'
                      ? Array.isArray(answer.selected) && answer.selected.map(String).includes(value)
                      : answer.selected === value

                    return (
                      <label className={`${styles.option} ${selected ? styles.optionSelected : ''}`} key={value}>
                        <input
                          className={styles.optionControl}
                          type={currentQuestion.type === 'multi_choice' ? 'checkbox' : 'radio'}
                          name={currentQuestion.questionId}
                          checked={selected}
                          onChange={(event) => {
                            if (currentQuestion.type === 'multi_choice') {
                              const current = Array.isArray(answer.selected) ? answer.selected.map(String) : []
                              const next = event.target.checked ? [...current, value] : current.filter((entry) => entry !== value)

                              updateAnswer({ selected: next })
                            } else {
                              updateAnswer({ selected: value })
                            }
                          }}
                        />
                        <span className={`${styles.optionDot} ${currentQuestion.type === 'multi_choice' ? styles.optionDotSquare : ''}`} aria-hidden='true'>
                          <span />
                        </span>
                        <span>{optionLabel(option, index)}</span>
                      </label>
                    )
                  })
                ) : currentQuestion.type === 'likert' ? (
                  [1, 2, 3, 4, 5].map((value) => (
                    <label className={`${styles.option} ${styles.optionLikert} ${Number(answer.value) === value ? styles.optionSelected : ''}`} key={value}>
                      <input
                        className={styles.optionControl}
                        type='radio'
                        name={currentQuestion.questionId}
                        checked={Number(answer.value) === value}
                        onChange={() => updateAnswer({ value })}
                      />
                      <span className={styles.optionDot} aria-hidden='true'>
                        <span />
                      </span>
                      <span>{value}</span>
                    </label>
                  ))
                ) : (
                  <>
                    <textarea
                      className={styles.textArea}
                      value={typeof answer.text === 'string' ? answer.text : ''}
                      onChange={(event) => updateAnswer({ text: event.target.value.slice(0, 6000) })}
                      placeholder={copy.taking.textareaPlaceholder}
                      maxLength={6000}
                    />
                    <span className={styles.characterCount}>
                      {formatTemplate(copy.taking.characterCount, { count: typeof answer.text === 'string' ? answer.text.length : 0, max: 6000 })}
                    </span>
                  </>
                )}
              </div>
              <div className={styles.actionsRow}>
                <button
                  className={styles.secondaryButton}
                  type='button'
                  data-capture='assessment-previous'
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                >
                  {copy.taking.previous}
                </button>
                <button className={styles.primaryButton} type='button' data-capture='assessment-next' onClick={() => void goNext()}>
                  {step === questions.length - 1 ? copy.taking.submit : copy.taking.next}
                </button>
              </div>
              <div className={styles.saveState} role='status' aria-live='polite'>
                {saveState === 'saving' ? <i className={`tabler-loader-2 ${styles.saveIcon} ${styles.saveIconPending}`} aria-hidden='true' /> : null}
                {saveState === 'saved' ? <i className={`tabler-cloud-check ${styles.saveIcon} ${styles.saveIconSuccess}`} aria-hidden='true' /> : null}
                {saveState === 'error' ? <i className={`tabler-alert-circle ${styles.saveIcon} ${styles.saveIconError}`} aria-hidden='true' /> : null}
                {saveCopy}
              </div>
              {fieldError ? <p className={styles.fieldError}>{fieldError}</p> : null}
            </article>
          ) : null}
        </main>
      </div>

      {submitOpen ? (
        <div className={styles.modalBackdrop} role='presentation'>
          <div className={styles.modalCard} role='dialog' aria-modal='true' aria-labelledby='assessment-submit-title'>
            <h2 id='assessment-submit-title' className={styles.modalTitle}>{copy.taking.submitTitle}</h2>
            <p className={styles.terminalBody}>{copy.taking.submitBody}</p>
            <div className={styles.actionsRow}>
              <button className={styles.secondaryButton} type='button' disabled={submitting} onClick={() => setSubmitOpen(false)}>
                {copy.taking.cancel}
              </button>
              <button
                className={styles.primaryButton}
                type='button'
                data-capture='assessment-confirm-submit'
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? copy.taking.submitting : copy.taking.submit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AssessmentTakingClient
