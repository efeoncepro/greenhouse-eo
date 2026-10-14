import type { CaptureScenario } from '../lib/scenario'

/** Local Think design candidate. No provider calls, persisted consent or tracking. */
export const scenario: CaptureScenario = {
  name: 'efeonce-cookie-design', route: '/preview/cookies', authentication: 'anonymous',
  mutating: false, safeForCapture: true, qualityProfile: 'premium',
  viewport: { width: 1440, height: 1000 },
  viewports: [{ name:'desktop', width:1440, height:1000 }, { name:'mobile', width:390, height:844 }],
  readiness: { selector:'[data-capture="cookie-banner"]', waitForFonts:true,postReadyDelayMs:400 },
  assertions: [{kind:'visible',selector:'[data-capture="cookie-banner"]'}, {kind:'noErrorBoundary'}],
  quality: {
    accessibility:{enabled:true,includeSelector:'.cookie-preview',failOnViolations:true},
    layout:{enabled:true,includeSelector:'.cookie-preview',minTargetSize:24,failOnViolations:true},
    runtime:{failOnConsoleError:true,failOnPageError:true,failOnHttpStatus:true},
    keyboard:{enabled:true,failOnViolations:true,reducedMotionCheck:true,probes:[{name:'footer-preferences-focus',startSelector:'.site-footer a',keys:['Tab'],requireVisibleFocusRing:true}]},
    performance:{enabled:true,severity:'error',maxDomNodes:1000,maxRequests:100,maxTransferBytes:5000000,maxFcpMs:10000},
    enterpriseRubric:{enabled:true,includeSelector:'.cookie-preview',failOnViolations:true,expectedDataCaptureRegions:['cookie-preview','cookie-banner','cookie-preferences']},
  },
  steps:[
    {kind:'mark',label:'banner',fullPage:false},
    {kind:'click',selector:'#customize button'},
    {kind:'wait',selector:'dialog[open]'},
    {kind:'sleep',ms:300},
    {kind:'mark',label:'preferences',fullPage:false},
    {kind:'press',key:'Escape'},
    {kind:'click',selector:'.consent-card [data-action="accept"] button'},
    {kind:'mark',label:'saved',fullPage:false},
  ],
}
