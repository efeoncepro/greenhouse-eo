import type { CaptureScenario } from '../lib/scenario'

/** TASK-2037: contextual, read-only evidence; never submits a commercial form. */
export const scenario: CaptureScenario = {
  name: 'growth-measurement-policy', route: '/admin/growth/forms', qualityProfile: 'premium',
  viewport: {width:1440,height:1000}, viewports:[{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}],
  readiness: {selector:'[data-capture="measurement-policy-panel"][data-state="ready"]',timeout:60000},
  assertions:[{kind:'noErrorBoundary'},{kind:'noLoginRedirect'},{kind:'visible',selector:'[data-capture="measurement-policy-panel"]'}],
  quality: {
    accessibility: { enabled:true, includeSelector:'[data-capture="measurement-policy-panel"]', failOnViolations:true },
    layout: { enabled:true, includeSelector:'[data-capture="measurement-policy-panel"]', minTargetSize:24, failOnViolations:true },
    runtime: { failOnConsoleError:true, failOnPageError:true, failOnHttpStatus:true },
    keyboard: {enabled:true,failOnViolations:true,reducedMotionCheck:true,probes:[{name:'source-focus',startSelector:'[data-capture="measurement-policy-panel"] [role="combobox"]',keys:['Tab'],requireVisibleFocusRing:true}]},
    performance: {enabled:true,severity:'warning',maxDomNodes:8000,maxRequests:200,maxTransferBytes:30000000,maxFcpMs:15000},
    enterpriseRubric: {enabled:true,includeSelector:'[data-capture="measurement-policy-panel"]',failOnViolations:true,expectedDataCaptureRegions:['measurement-policy-panel']},
  },
  steps:[{kind:'wait',selector:'[data-capture="measurement-policy-panel"][data-state="ready"]',timeout:60000},
    {kind:'scroll',selector:'[data-capture="measurement-policy-panel"]'},
    {kind:'mark',label:'measurement-policy-first-fold',clipSelector:'[data-capture="measurement-policy-panel"]',note:'Published source, typed matching mapping, independent destinations and lifecycle action.'}],
}
