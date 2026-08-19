import { publicAssessmentResponseHeaders } from '@/lib/hiring/assessment/public-session/http'

export const dynamic = 'force-dynamic'

const bootstrap = `(()=>{let access=null;try{const raw=location.hash;const params=raw.startsWith('#access=')?new URLSearchParams(raw.slice(1)):null;if(params&&Array.from(params.keys()).length===1)access=params.get('access');}finally{history.replaceState(null,'',location.pathname+location.search)}if(!access){location.replace('/public/assessment/session?unavailable=1');return}const body=JSON.stringify({access});access=null;fetch('/api/public/assessment/access/exchange',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body}).then(response=>{location.replace(response.ok?'/public/assessment/session':'/public/assessment/session?unavailable=1')}).catch(()=>location.replace('/public/assessment/session?unavailable=1'))})();`

export async function GET(request: Request) {
  const nonce = request.headers.get('x-assessment-csp-nonce') ?? ''
  const escapedNonce = nonce.replaceAll('"', '')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><title>Acceso a evaluación</title><script nonce="${escapedNonce}">${bootstrap}</script></head><body><main aria-live="polite"><p>Abriendo tu evaluación…</p></main></body></html>`

  return new Response(html, {
    headers: {
      ...publicAssessmentResponseHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
