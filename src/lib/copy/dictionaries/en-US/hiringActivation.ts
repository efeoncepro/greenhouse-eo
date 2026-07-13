import type { HiringActivationCopy } from '../../types'

export const hiringActivation: HiringActivationCopy = {
  eyebrow: 'Lifecycle / Onboarding & Offboarding',
  title: 'Onboarding & Offboarding',
  subtitle: 'Convert approved hires into operational collaborators without bypassing readiness, onboarding, or HRIS traceability.',
  tabs: {
    onboarding: 'Onboarding',
    offboarding: 'Offboarding',
    readyHires: 'Ready hires'
  },
  navigation: {
    hr: 'HR',
    lifecycle: 'Onboarding & Offboarding',
    overview: 'Overview',
    templates: 'Templates'
  },
  kpis: {
    queue: 'In activation queue',
    queueHint: 'Approved handoffs',
    ready: 'Ready to activate',
    readyHint: 'Confirmed in detail',
    blockers: 'With blockers',
    blockersHint: 'Need follow-up',
    activated: 'Activated this month',
    activatedHint: 'From available queue',
    unavailable: 'No data'
  },
  queue: {
    title: 'Activation queue',
    subtitle: 'approved hires ready for review',
    emptyTitle: 'No hires pending activation',
    emptyBody: 'When Hiring approves an internal_hire handoff, it will appear here for HRIS activation.',
    flagOffTitle: 'Activation bridge disabled',
    flagOffBody: 'The queue exists, but HIRING_ACTIVATION_ENABLED / HIRING_HANDOFF_BRIDGES_ENABLED are not enabled in this environment.',
    errorTitle: 'Could not load the queue',
    retry: 'Retry'
  },
  detail: {
    title: 'Activation detail',
    pendingTitle: 'Select a hire',
    pendingBody: 'Open a queue case to review its journey, readiness, and next actions.',
    people360: 'View People 360',
    source: 'Source',
    handoff: 'Handoff',
    decision: 'Decision',
    entity: 'Legal entity',
    manager: 'Manager',
    area: 'Area',
    journeyTitle: 'Hiring journey',
    readinessTitle: 'HRIS readiness',
    readinessDegraded: 'Full readiness appears after the collaborator is created or linked.',
    blockerTitle: 'Active blocker',
    noBlockers: 'No critical blockers detected.',
    activateDisabled: 'Activate is enabled only when Workforce Activation marks readiness OK.',
    activateReady: 'Readiness complete. You can close the activation bridge.',
    completeWorkforceProfile: 'Complete the workforce profile in Workforce Activation before activating.'
  },
  journey: {
    selection: 'Selection approved',
    handoff: 'Handoff received',
    member: 'Collaborator created',
    onboarding: 'Onboarding opened',
    activation: 'HRIS activation',
    done: 'Done',
    waiting: 'Pending',
    blocked: 'Blocked'
  },
  readiness: {
    ready: 'Ready',
    warning: 'Warning',
    blocked: 'Blocked',
    notApplicable: 'Not applicable',
    noRowsTitle: 'No detailed checklist yet',
    score: 'Readiness score',
    blockers: 'Blockers',
    warnings: 'Warnings'
  },
  statuses: {
    pending_hr_review: 'Pending HR review',
    blocked: 'Blocked',
    member_created: 'Collaborator created',
    onboarding_open: 'Onboarding open',
    ready_to_activate: 'Ready to activate',
    active: 'Active',
    cancelled: 'Cancelled',
    approved: 'Approved',
    in_setup: 'In setup',
    completed: 'Completed',
    pending: 'Pending'
  },
  blockedReasons: {
    ambiguous_identity: 'Ambiguous identity',
    member_conflict: 'Collaborator conflict',
    member_already_active: 'Collaborator already active',
    onboarding_template_missing: 'Missing onboarding template',
    handoff_not_approved: 'Handoff not approved',
    legal_data_missing: 'Missing legal data',
    unknown: 'Blocker needs review'
  },
  actions: {
    review: 'Review hire',
    createMember: 'Create collaborator',
    openOnboarding: 'Open onboarding',
    resolveBlocker: 'Resolve blocker',
    activate: 'Activate',
    cancel: 'Cancel process',
    close: 'Close',
    confirm: 'Confirm',
    goToWorkforceActivation: 'Go to Workforce Activation',
    openTemplates: 'Open templates',
    loading: 'Processing…'
  },
  dialogs: {
    activateTitle: 'Activate this hire?',
    activateBody: 'This closes the Hiring bridge with collaborator and onboarding evidence already prepared. It does not replace the workforce profile.',
    cancelTitle: 'Cancel activation',
    cancelBody: 'Record a reason so the manual closure remains traceable.',
    cancelReasonLabel: 'Cancellation reason',
    resolveTitle: 'Blocker resolution',
    resolveBody: 'This blocker needs a backend command with governed payloads. Until TASK-1400 is complete, this UI can only guide you to the right surface.',
    resolvePendingTask: 'Backend follow-up: TASK-1400.'
  },
  feedback: {
    reviewOk: 'Hire taken for review.',
    createMemberOk: 'Collaborator created or linked.',
    openOnboardingOk: 'Onboarding opened.',
    completeOk: 'Activation bridge closed.',
    cancelOk: 'Activation cancelled.',
    commandError: 'Could not complete the action.',
    loadError: 'Could not load Hiring Activation.'
  },
  aria: {
    activationTabs: 'Onboarding & Offboarding lanes',
    closeDetail: 'Close activation detail',
    closeDialog: 'Close dialog',
    queue: 'Ready hires queue',
    readiness: 'HRIS readiness checklist'
  }
}
