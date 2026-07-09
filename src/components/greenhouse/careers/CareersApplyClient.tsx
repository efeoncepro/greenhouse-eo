'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import Link from 'next/link'

import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { RenderContract } from '@/growth-forms-renderer/contract'
import {
  formatNationalPhoneDisplay,
  nationalFromStored,
  parseE164,
  PHONE_COUNTRIES,
  stripNationalDigits,
  toE164,
} from '@/growth-forms-renderer/mask'
import { createTelemetryEmitter, type TelemetryEmitter } from '@/growth-forms-renderer/telemetry'
import { TurnstileTokenClient } from '@/growth-forms-renderer/turnstile'
import { RENDERER_VERSION } from '@/growth-forms-renderer/version'
import type { CareersCopy } from '@/lib/copy'
import { validateE164PhoneValue } from '@/lib/growth/forms/validators/phone'
import {
  PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES,
  formatPublicCareersCvFileSize,
  validatePublicCareersCvUpload,
  type PublicCareersCvValidationError,
} from '@/lib/hiring/public-careers/cv-upload-contract'
import { formatCareersTemplate, type CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'

import styles from './careers.module.css'

interface CareersApplyClientProps {
  copy: CareersCopy
  formContract: RenderContract
  opening: CareersOpeningViewModel
}

type CaptchaState = 'pending' | 'verified' | 'error'
type SubmitState = 'idle' | 'invalid' | 'submitting' | 'success'

interface ApplicationFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  portfolioUrl: string
  linkedinUrl: string
  availability: string
  message: string
  consent: boolean
}

type ApplicationField = keyof ApplicationFormValues
type ApplicationErrorField = ApplicationField | 'captcha' | 'server' | 'cv'
type ApplicationErrors = Partial<Record<ApplicationErrorField, string>>

const INITIAL_VALUES: ApplicationFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  portfolioUrl: '',
  linkedinUrl: '',
  availability: '',
  message: '',
  consent: false,
}

const FIELD_ORDER: Array<ApplicationField | 'captcha'> = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'portfolioUrl',
  'linkedinUrl',
  'consent',
  'captcha',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CV_ACCEPT = PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES.join(',')
const DEFAULT_PHONE_COUNTRY = 'CL'

const resolvePhoneCountry = (contract: RenderContract): string =>
  (
    contract.fields.find(field => field.key === 'phone')?.validatorParams?.country ??
    DEFAULT_PHONE_COUNTRY
  ).toUpperCase()

const isHttpsUrl = (value: string): boolean => {
  const trimmed = value.trim()

  if (!trimmed) return true

  try {
    return new URL(trimmed).protocol === 'https:'
  } catch {
    return false
  }
}

const resolveCvValidationMessage = (copy: CareersCopy, error: PublicCareersCvValidationError): string => {
  if (error === 'file_too_large') return copy.apply.cv.tooLarge
  if (error === 'file_empty') return copy.apply.cv.empty

  return copy.apply.cv.invalidType
}

const resolveServerError = (copy: CareersCopy, outcome: unknown, status: number): string => {
  if (outcome === 'rate_limited') return copy.apply.errors.rateLimited
  if (outcome === 'captcha_failed') return copy.apply.errors.captchaFailed
  if (outcome === 'invalid') return copy.apply.errors.invalid
  if (outcome === 'not_open' || outcome === 'disabled' || status === 404) return copy.apply.errors.notOpen

  return copy.apply.errors.server
}

export const CareersApplyClient = ({ copy, formContract, opening }: CareersApplyClientProps) => {
  const turnstileSiteKey = formContract.security?.captcha?.siteKey ?? null
  const [values, setValues] = useState<ApplicationFormValues>(INITIAL_VALUES)
  const [phoneCountry, setPhoneCountry] = useState(() => resolvePhoneCountry(formContract))
  const [errors, setErrors] = useState<ApplicationErrors>({})
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isCvDragActive, setIsCvDragActive] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [captchaState, setCaptchaState] = useState<CaptchaState>(turnstileSiteKey ? 'pending' : 'verified')
  const turnstileRef = useRef<TurnstileTokenClient | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const cvInputRef = useRef<HTMLInputElement | null>(null)
  const telemetryRef = useRef<TelemetryEmitter | null>(null)
  const viewedRef = useRef(false)
  const startedRef = useRef(false)
  const invalidSummaryRef = useRef<HTMLDivElement | null>(null)
  const successRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!rootRef.current || viewedRef.current) return

    const emitter = createTelemetryEmitter(rootRef.current, formContract.telemetryPolicy, {
      form_id: formContract.form.formId,
      form_key: formContract.form.formKey,
      form_slug: formContract.form.slug,
      form_version_id: formContract.form.formVersionId,
      form_kind: formContract.form.formKind,
      surface_id: formContract.surfacePolicy.surfaceId,
      renderer_version: RENDERER_VERSION,
      contract_version: formContract.contractVersion,
      page_uri: window.location.href,
      page_name: document.title,
      referrer: document.referrer,
      locale: formContract.form.locale,
    })

    telemetryRef.current = emitter
    viewedRef.current = true
    emitter.emit('gh_form_viewed', {})
  }, [formContract])

  useEffect(() => {
    return () => {
      turnstileRef.current?.destroy()
      turnstileRef.current = null
    }
  }, [])

  useEffect(() => {
    if (submitState === 'invalid') invalidSummaryRef.current?.focus()
    if (submitState === 'success') successRef.current?.focus()
  }, [submitState])

  const progress = useMemo(() => {
    const checkpoints = [
      values.firstName.trim(),
      values.lastName.trim(),
      EMAIL_RE.test(values.email.trim()),
      values.portfolioUrl.trim() || values.linkedinUrl.trim(),
      values.availability.trim() || values.message.trim(),
      values.consent,
    ]

    return Math.max(12, Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100))
  }, [values])

  const title = formatCareersTemplate(copy.apply.titleTemplate, { role: opening.title })

  const emitStarted = () => {
    if (startedRef.current) return

    startedRef.current = true
    telemetryRef.current?.emit('gh_form_started', {})
  }

  const setValue = (field: ApplicationField, value: string | boolean) => {
    emitStarted()
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => {
      if (!current[field]) return current

      const next = { ...current }

      delete next[field]

      return next
    })
  }

  const clearCvError = () => {
    setErrors(current => {
      if (!current.cv) return current

      const next = { ...current }

      delete next.cv

      return next
    })
  }

  const selectCvFile = (file: File | null) => {
    emitStarted()

    if (!file) {
      setCvFile(null)
      clearCvError()

      return
    }

    const validationError = validatePublicCareersCvUpload(file)

    if (validationError) {
      setCvFile(null)
      setErrors(current => ({ ...current, cv: resolveCvValidationMessage(copy, validationError) }))
      setSubmitState('invalid')

      if (cvInputRef.current) {
        cvInputRef.current.value = ''
      }

      return
    }

    setCvFile(file)
    clearCvError()
  }

  const removeCvFile = () => {
    setCvFile(null)
    clearCvError()

    if (cvInputRef.current) {
      cvInputRef.current.value = ''
    }
  }

  const handleCvInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectCvFile(event.target.files?.[0] ?? null)
  }

  const handleCvDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsCvDragActive(false)
    selectCvFile(event.dataTransfer.files?.[0] ?? null)
  }

  const validate = (): ApplicationErrors => {
    const nextErrors: ApplicationErrors = {}
    const email = values.email.trim()

    if (!values.firstName.trim()) nextErrors.firstName = copy.apply.errors.firstName
    if (!values.lastName.trim()) nextErrors.lastName = copy.apply.errors.lastName
    if (!email) nextErrors.email = copy.apply.errors.emailRequired
    else if (!EMAIL_RE.test(email)) nextErrors.email = copy.apply.errors.emailInvalid

    if (values.phone.trim()) {
      const phoneResult = validateE164PhoneValue(values.phone, { country: phoneCountry })

      if (!phoneResult.valid) nextErrors.phone = copy.apply.errors.phoneInvalid
    }

    if (!isHttpsUrl(values.portfolioUrl)) nextErrors.portfolioUrl = copy.apply.errors.urlInvalid
    if (!isHttpsUrl(values.linkedinUrl)) nextErrors.linkedinUrl = copy.apply.errors.urlInvalid
    if (!values.consent) nextErrors.consent = copy.apply.errors.consent
    const cvValidationError = cvFile ? validatePublicCareersCvUpload(cvFile) : null

    if (cvValidationError) nextErrors.cv = resolveCvValidationMessage(copy, cvValidationError)

    return nextErrors
  }

  const executeCaptcha = async (): Promise<string | null> => {
    setErrors(current => {
      if (!current.captcha) return current

      const next = { ...current }

      delete next.captcha

      return next
    })

    if (!turnstileSiteKey) {
      if (process.env.NODE_ENV !== 'production') {
        setCaptchaState('verified')

        return 'local-dev-captcha'
      }

      setCaptchaState('error')

      return null
    }

    try {
      turnstileRef.current ??= new TurnstileTokenClient(document, {
        provider: 'turnstile',
        required: true,
        mode: 'invisible',
        siteKey: turnstileSiteKey,
        execution: 'submit',
      })

      const token = await turnstileRef.current.execute()

      setCaptchaState('verified')

      return token
    } catch {
      turnstileRef.current?.reset()
      setCaptchaState('error')

      return null
    }
  }

  const focusFirstError = (nextErrors: ApplicationErrors) => {
    const first = FIELD_ORDER.find(field => nextErrors[field])

    if (!first || first === 'captcha') return

    window.setTimeout(() => document.getElementById(fieldId(first))?.focus(), 40)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate()

    if (Object.keys(nextErrors).length) {
      telemetryRef.current?.emit('gh_form_field_validation_failed', { reason_class: 'client_validation' })
      setErrors(nextErrors)
      setSubmitState('invalid')
      focusFirstError(nextErrors)

      return
    }

    setSubmitState('submitting')
    telemetryRef.current?.emit('gh_form_submitted', {})
    const captchaToken = await executeCaptcha()

    if (!captchaToken) {
      const captchaError = { captcha: copy.apply.errors.captcha }

      telemetryRef.current?.emit('gh_form_submission_rejected', { reason_class: 'captcha_failed' })
      setErrors(captchaError)
      setSubmitState('invalid')

      return
    }

    try {
      const applicationPayload = {
        openingPublicId: opening.publicId,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        portfolioUrl: values.portfolioUrl.trim() || null,
        linkedinUrl: values.linkedinUrl.trim() || null,
        availability: values.availability.trim() || null,
        message: values.message.trim() || null,
        consent: values.consent,
        consentPolicyVersion: formContract.consent?.consentPolicyVersion ?? 'efeonce-careers-2026-07',
        captchaToken,
      }

      const requestInit: RequestInit = cvFile
        ? {
            method: 'POST',
            body: Object.entries(applicationPayload).reduce((formData, [key, value]) => {
              if (value !== null && value !== undefined) {
                formData.set(key, String(value))
              }

              return formData
            }, new FormData()),
          }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationPayload),
          }

      if (cvFile && requestInit.body instanceof FormData) {
        requestInit.body.set('cvFile', cvFile, cvFile.name)
      }

      const response = await fetch('/api/public/hiring/applications', {
        ...requestInit,
      })

      const body = (await response.json().catch(() => null)) as { outcome?: string } | null
      const outcome = body?.outcome

      if (response.ok && (outcome === 'accepted' || outcome === 'spam_rejected')) {
        setErrors({})
        setSubmitState('success')
        telemetryRef.current?.emit('gh_form_submission_accepted', { success_behavior: formContract.successBehavior.kind })
        telemetryRef.current?.emit('gh_form_success_viewed', { success_behavior: formContract.successBehavior.kind })

        return
      }

      if (outcome === 'captcha_failed') {
        turnstileRef.current?.reset()
        setCaptchaState('error')
      }

      telemetryRef.current?.emit('gh_form_submission_rejected', { reason_class: String(outcome ?? 'server_error') })
      setErrors({ server: resolveServerError(copy, outcome, response.status) })
      setSubmitState('invalid')
    } catch {
      telemetryRef.current?.emit('gh_form_submission_rejected', { reason_class: 'network_error' })
      setErrors({ server: copy.apply.errors.server })
      setSubmitState('invalid')
    }
  }

  if (submitState === 'success') {
    return (
      <div
        className={styles.applyWrap}
        data-capture='careers-apply-success'
        data-form-kind={formContract.form.formKind}
        data-form-slug={formContract.form.slug}
        ref={rootRef}
      >
        <div className={`${styles.stateCard} ${styles.successCard}`} ref={successRef} tabIndex={-1} role='status'>
          <span className={styles.stateIcon}>
            <i className='tabler-circle-check' aria-hidden='true' />
          </span>
          <h1 className={styles.stateTitle}>{copy.apply.successTitle}</h1>
          <p className={styles.stateBody}>{copy.apply.successBody}</p>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href='/public/careers#gh-listing'>
            {copy.apply.moreJobs}
            <i className='tabler-arrow-right' aria-hidden='true' />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.applyWrap}
      data-capture='careers-apply-form'
      data-form-kind={formContract.form.formKind}
      data-form-slug={formContract.form.slug}
      ref={rootRef}
    >
      <section className={styles.applyHero}>
        <div className={styles.applyHeroInner}>
          <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>{copy.apply.eyebrow}</span>
          <h1 className={styles.applyTitle}>{title}</h1>
          <p className={styles.applyIntro}>{copy.apply.intro}</p>
        </div>
      </section>

      {submitState === 'invalid' && (errors.server || Object.keys(errors).length > 0) ? (
        <div className={`${styles.alert} ${styles.alertError}`} ref={invalidSummaryRef} tabIndex={-1} role='alert'>
          <i className='tabler-alert-triangle' aria-hidden='true' />
          <span>
            <strong>{copy.apply.invalidSummaryTitle}</strong>
            {errors.server ?? copy.apply.invalidSummaryBody}
          </span>
        </div>
      ) : null}

      <form className={styles.formCard} onSubmit={submit} noValidate aria-label={title}>
        <div className={styles.progressWrap} aria-hidden='true'>
          <div className={styles.progressTop}>
            <span className={styles.progressLabel}>{copy.apply.progressLabel}</span>
            <span className={styles.progressValue}>{progress}%</span>
          </div>
          <div className={styles.progressTrack}>
            <span className={styles.progressFill} style={{ width: `${progress}%` } as CSSProperties} />
          </div>
        </div>

        <FormSection number={1} title={copy.apply.sections.personal}>
          <div className={styles.fieldGrid}>
            <TextField
              autoComplete='given-name'
              error={errors.firstName}
              field='firstName'
              icon='tabler-user'
              label={copy.apply.fields.firstName}
              onChange={setValue}
              requiredLabel={copy.aria.required}
              value={values.firstName}
            />
            <TextField
              autoComplete='family-name'
              error={errors.lastName}
              field='lastName'
              icon='tabler-user'
              label={copy.apply.fields.lastName}
              onChange={setValue}
              requiredLabel={copy.aria.required}
              value={values.lastName}
            />
          </div>
          <TextField
            autoComplete='email'
            error={errors.email}
            field='email'
            icon='tabler-mail'
            inputMode='email'
            label={copy.apply.fields.email}
            onChange={setValue}
            placeholder={copy.apply.placeholders.email}
            requiredLabel={copy.aria.required}
            type='email'
            value={values.email}
          />
          <PhoneField
            country={phoneCountry}
            error={errors.phone}
            label={copy.apply.fields.phone}
            onCountryChange={setPhoneCountry}
            onChange={setValue}
            placeholder={copy.apply.placeholders.phone}
            value={values.phone}
            countryAriaLabel={copy.apply.phoneCountryAria}
          />
        </FormSection>

        <FormSection number={2} title={copy.apply.sections.profile}>
          <TextField
            autoComplete='url'
            error={errors.portfolioUrl}
            field='portfolioUrl'
            icon='tabler-link'
            inputMode='url'
            label={copy.apply.fields.portfolio}
            onChange={setValue}
            placeholder={copy.apply.placeholders.portfolio}
            type='url'
            value={values.portfolioUrl}
          />
          <TextField
            autoComplete='url'
            error={errors.linkedinUrl}
            field='linkedinUrl'
            icon='tabler-brand-linkedin'
            inputMode='url'
            label={copy.apply.fields.linkedin}
            onChange={setValue}
            placeholder={copy.apply.placeholders.linkedin}
            type='url'
            value={values.linkedinUrl}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor={fieldId('availability')}>
              {copy.apply.fields.availability}
            </label>
            <select
              className={styles.select}
              id={fieldId('availability')}
              name='availability'
              value={values.availability}
              onChange={event => setValue('availability', event.target.value)}
            >
              <option value=''>{copy.apply.placeholders.availability}</option>
              {copy.apply.availabilityOptions.map(option => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field} data-capture='careers-cv-uploader'>
            <span className={styles.label}>{copy.apply.cv.label}</span>
            <div
              className={`${styles.cvDrop} ${isCvDragActive ? styles.cvDropActive : ''} ${cvFile ? styles.cvDropSelected : ''} ${errors.cv ? styles.cvDropError : ''}`}
              onDragEnter={event => {
                event.preventDefault()
                setIsCvDragActive(true)
              }}
              onDragOver={event => {
                event.preventDefault()
                setIsCvDragActive(true)
              }}
              onDragLeave={() => setIsCvDragActive(false)}
              onDrop={handleCvDrop}
              role='group'
              aria-describedby={errors.cv ? errorId('cv') : undefined}
            >
              <input
                ref={cvInputRef}
                className={styles.cvInput}
                id={fieldId('cv')}
                name='cvFile'
                type='file'
                accept={CV_ACCEPT}
                onChange={handleCvInputChange}
                aria-label={copy.apply.cv.label}
              />
              <span className={styles.cvIcon}>
                <i className={cvFile ? 'tabler-file-type-pdf' : 'tabler-upload'} aria-hidden='true' />
              </span>
              <span className={styles.cvText}>
                <strong>{cvFile ? copy.apply.cv.selectedTitle : copy.apply.cv.title}</strong>
                <span>{cvFile ? `${cvFile.name} - ${formatPublicCareersCvFileSize(cvFile.size)}` : copy.apply.cv.body}</span>
                <span className={styles.cvHint}>{copy.apply.cv.hint}</span>
              </span>
              <span className={styles.cvActions}>
                <button
                  className={`${styles.button} ${styles.buttonOutlined} ${styles.cvButton}`}
                  type='button'
                  onClick={() => cvInputRef.current?.click()}
                >
                  {cvFile ? copy.apply.cv.replaceCta : copy.apply.cv.browseCta}
                </button>
                {cvFile ? (
                  <button className={styles.textButton} type='button' onClick={removeCvFile}>
                    {copy.apply.cv.removeCta}
                  </button>
                ) : null}
              </span>
            </div>
            {errors.cv ? (
              <span className={styles.errorText} id={errorId('cv')}>
                <i className='tabler-alert-circle' aria-hidden='true' />
                {errors.cv}
              </span>
            ) : null}
          </div>
        </FormSection>

        <FormSection number={3} title={copy.apply.sections.message}>
          <TextAreaField
            field='message'
            label={copy.apply.fields.message}
            onChange={setValue}
            placeholder={copy.apply.placeholders.message}
            value={values.message}
          />
          <label className={styles.consentCard} htmlFor={fieldId('consent')}>
            <input
              className={styles.consentInput}
              id={fieldId('consent')}
              name='consent'
              type='checkbox'
              checked={values.consent}
              onChange={event => setValue('consent', event.target.checked)}
              aria-describedby={errors.consent ? errorId('consent') : undefined}
              aria-invalid={Boolean(errors.consent)}
            />
            <span className={styles.consentBox} aria-hidden='true'>
              {values.consent ? <i className='tabler-check' aria-hidden='true' /> : null}
            </span>
            <span className={styles.consentText}>
              <strong>{copy.apply.consent.title}</strong>
              <span>
                {copy.apply.consent.bodyPrefix}{' '}
                <a href={`${EFEONCE_URL_HTTPS}/privacy`} target='_blank' rel='noreferrer'>
                  {copy.apply.consent.link}
                </a>{' '}
                {copy.apply.consent.bodySuffix}
              </span>
              {errors.consent ? (
                <span className={styles.errorText} id={errorId('consent')}>
                  <i className='tabler-alert-circle' aria-hidden='true' />
                  {errors.consent}
                </span>
              ) : null}
            </span>
          </label>
        </FormSection>

        <div className={styles.formFooter}>
          <CaptchaStatus copy={copy} state={captchaState} error={errors.captcha} />
          <button className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonFull} ${styles.buttonLarge}`} type='submit' disabled={submitState === 'submitting'}>
            {submitState === 'submitting' ? copy.apply.submitting : copy.apply.submit}
            <i className={submitState === 'submitting' ? 'tabler-loader-2' : 'tabler-send'} aria-hidden='true' />
          </button>
          <p className={styles.disclosure}>
            <i className='tabler-lock' aria-hidden='true' />
            {copy.apply.disclosure}
          </p>
        </div>
      </form>
    </div>
  )
}

const FormSection = ({ children, number, title }: { children: ReactNode; number: number; title: string }) => (
  <section className={styles.formSection}>
    <div className={styles.formSectionHeader}>
      <span className={styles.sectionNumber} aria-hidden='true'>
        {number}
      </span>
      <h2 className={styles.formSectionTitle}>{title}</h2>
      <span className={styles.formSectionRule} aria-hidden='true' />
    </div>
    {children}
  </section>
)

const fieldId = (field: ApplicationField | 'captcha' | 'cv') => `careers-apply-${field}`
const errorId = (field: ApplicationField | 'captcha' | 'cv') => `${fieldId(field)}-error`

const TextField = ({
  autoComplete,
  error,
  field,
  icon,
  inputMode,
  label,
  onChange,
  placeholder,
  requiredLabel,
  type = 'text',
  value,
}: {
  autoComplete?: string
  error?: string
  field: ApplicationField
  icon?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  label: string
  onChange: (field: ApplicationField, value: string) => void
  placeholder?: string
  requiredLabel?: string
  type?: string
  value: string
}) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={fieldId(field)}>
      {label}
      {requiredLabel ? <span className={styles.visuallyHidden}> {requiredLabel}</span> : null}
    </label>
    <span className={styles.fieldShell}>
      {icon ? <i className={`${icon} ${styles.fieldIcon}`} aria-hidden='true' /> : null}
      <input
        autoComplete={autoComplete}
        className={`${styles.input} ${icon ? styles.inputWithIcon : ''}`}
        id={fieldId(field)}
        inputMode={inputMode}
        name={field}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field, event.target.value)}
        aria-describedby={error ? errorId(field) : undefined}
        aria-invalid={Boolean(error)}
      />
    </span>
    {error ? (
      <span className={styles.errorText} id={errorId(field)}>
        <i className='tabler-alert-circle' aria-hidden='true' />
        {error}
      </span>
    ) : null}
  </div>
)

const PhoneField = ({
  country,
  countryAriaLabel,
  error,
  label,
  onChange,
  onCountryChange,
  placeholder,
  value,
}: {
  country: string
  countryAriaLabel: string
  error?: string
  label: string
  onChange: (field: ApplicationField, value: string) => void
  onCountryChange: (country: string) => void
  placeholder?: string
  value: string
}) => {
  const national = nationalFromStored(value, country)
  const displayValue = national ? formatNationalPhoneDisplay(national, country) : ''

  const updateStored = (nextCountry: string, nextNational: string) => {
    onChange('phone', toE164(nextCountry, nextNational))
  }

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId('phone')}>
        {label}
      </label>
      <div className={styles.phoneControl}>
        <select
          aria-label={countryAriaLabel}
          className={styles.phoneCountry}
          value={country}
          onChange={event => {
            const nextCountry = event.target.value.toUpperCase()

            onCountryChange(nextCountry)
            updateStored(nextCountry, national)
          }}
        >
          {PHONE_COUNTRIES.map(option => (
            <option key={option.code} value={option.code}>
              {option.flag} +{option.callingCode}
            </option>
          ))}
        </select>
        <span className={styles.fieldShell}>
          <i className={`tabler-phone ${styles.fieldIcon}`} aria-hidden='true' />
          <input
            autoComplete='tel'
            className={`${styles.input} ${styles.inputWithIcon} ${styles.phoneInput}`}
            id={fieldId('phone')}
            inputMode='tel'
            name='phone'
            placeholder={placeholder}
            type='tel'
            value={displayValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const parsed = parseE164(event.target.value)

              if (parsed) {
                onCountryChange(parsed.country)
                onChange('phone', toE164(parsed.country, parsed.national))

                return
              }

              updateStored(country, stripNationalDigits(event.target.value))
            }}
            aria-describedby={error ? errorId('phone') : undefined}
            aria-invalid={Boolean(error)}
          />
        </span>
      </div>
      {error ? (
        <span className={styles.errorText} id={errorId('phone')}>
          <i className='tabler-alert-circle' aria-hidden='true' />
          {error}
        </span>
      ) : null}
    </div>
  )
}

const TextAreaField = ({
  field,
  label,
  onChange,
  placeholder,
  value,
}: {
  field: ApplicationField
  label: string
  onChange: (field: ApplicationField, value: string) => void
  placeholder?: string
  value: string
}) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={fieldId(field)}>
      {label}
    </label>
    <textarea
      className={styles.textarea}
      id={fieldId(field)}
      name={field}
      placeholder={placeholder}
      value={value}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(field, event.target.value)}
    />
  </div>
)

const CaptchaStatus = ({ copy, error, state }: { copy: CareersCopy; error?: string; state: CaptchaState }) => {
  const isError = state === 'error' || Boolean(error)
  const isVerified = state === 'verified' && !isError
  const title = isError ? copy.apply.captcha.failedTitle : isVerified ? copy.apply.captcha.verifiedTitle : copy.apply.captcha.pendingTitle
  const body = isError ? error ?? copy.apply.captcha.failedBody : isVerified ? copy.apply.captcha.verifiedBody : copy.apply.captcha.brand

  return (
    <div
      className={`${styles.captchaBox} ${isError ? styles.captchaBoxError : ''}`}
      id={fieldId('captcha')}
      role='status'
      aria-live='polite'
    >
      <span className={styles.captchaStatus}>
        <span className={`${styles.captchaIcon} ${isError ? styles.captchaIconError : ''}`} aria-hidden='true'>
          <i className={isError ? 'tabler-x' : isVerified ? 'tabler-check' : 'tabler-shield'} />
        </span>
        <span className={styles.captchaText}>
          <strong>{title}</strong>
          <span id={error ? errorId('captcha') : undefined}>{body}</span>
        </span>
      </span>
      <span className={styles.captchaBrand}>
        <i className='tabler-brand-cloudflare' aria-hidden='true' />
        {copy.apply.captcha.brand}
      </span>
    </div>
  )
}
