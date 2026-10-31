/**
 * TASK-2051 — «Explora por tema» v2: the orbit as the door to the blog's categories (approved by the operator on
 * 2026-10-24, canvas «Portada Blog Efeonce», page «Explora por tema · v2 (categorías)»; generator gen_temas.py in the
 * direction's tarball).
 *
 * The frozen canvases still carry «¿De qué escribimos más?» (share of what we publish). This module is the approved
 * replacement, applied by bind-canvas.cjs as a deviation to the reference and to the bound template of the three boards:
 * - Desktop/tablet: the intro (new title and copy, same «Todo el archivo» link), the orbit ring with the active topic's
 *   arc, six topic labels that ARE links to their category (hover or focus previews the topic), and the centre as a
 *   reading guide: description, three reads to start, «Ver todo <tema>».
 * - Mobile: a list sorted by reads; every row is the link to its category.
 * The data contract (one row per topic, both boards): key, name, promise, accent, ink, href, n, desc, reads[{t, href}],
 * pos, align, deg. EOBH_View mirrors LOGIC in PHP (first paint = browser first render; the arc starts at the topic's
 * angle and, in the browser, turns around the ring by the shortest way).
 */

const ARROW = '<svg class="ax" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></g></svg>'

const CSS = `/* Explora por tema v2 (lib/topics-v2.cjs) */
.tv-nav{display:contents}
.stage .tv-ring{overflow:visible}
.tv-ring .tv-turn{transform-origin:380px 380px;transition:transform 800ms cubic-bezier(0.22,1,0.36,1)}
.tv-ring .tv-turn path,.tv-ring .tv-turn circle{transition:stroke 400ms,fill 400ms}
.lab.tv-lab{color:#ffffff}
.tv-lab .tv-pr{display:inline-flex;align-items:center;gap:6px;font-size:13px;line-height:1.3;color:#cfe4fa}
.tv-lab .tv-pr .ax{opacity:0;transform:translateX(-4px);transition:opacity 250ms,transform 340ms cubic-bezier(0.2,0,0,1)}
.tv-lab:hover .tv-pr .ax,.tv-lab:focus-visible .tv-pr .ax{opacity:1;transform:none}
.v3:not(.v3t) .core.tv-core-box{left:610px;top:215px;width:420px;height:470px}
.v3t .core.tv-core-box{width:min(400px,72%)}
.tv-core{display:flex;flex-direction:column;align-items:center;text-align:center;width:100%}
.tv-name{font-size:40px;line-height:1;font-weight:760;letter-spacing:-.035em}
.tv-desc{margin:14px 0 0;font-size:15px;line-height:1.5;color:#cfe4fa;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.tv-start{margin:26px 0 8px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#cfe4fa}
.tv-reads{list-style:none;margin:0;padding:0;align-self:stretch;text-align:left;border-top:1px solid rgba(207,228,250,.16)}
.tv-reads li{border-bottom:1px solid rgba(207,228,250,.16)}
.tv-reads a{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;font-size:15px;line-height:1.35;font-weight:500}
.tv-reads a span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tv-reads a .ax{flex:none;opacity:.5;transition:opacity 200ms,transform 340ms cubic-bezier(0.2,0,0,1)}
.tv-reads a:hover .ax,.tv-reads a:focus-visible .ax{opacity:1;transform:translateX(4px)}
.tv-see{display:inline-flex;align-items:center;gap:10px;margin-top:22px;height:48px;padding:0 20px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;transition:transform 300ms cubic-bezier(0.2,0,0,1)}
.tv-see:hover{transform:translateY(-2px)}
.tv-see .tv-n{display:inline-grid;place-items:center;min-width:28px;height:24px;padding:0 8px;border-radius:999px;background:rgba(0,26,51,.16);font-size:13px;font-variant-numeric:tabular-nums}
.tv-msub{margin:18px 0 0;font-size:15px;line-height:1.55;color:#cfe4fa}
.tv-list{list-style:none;margin:24px 0 0;padding:0;border-top:1px solid rgba(207,228,250,.16)}
.tv-list li{border-bottom:1px solid rgba(207,228,250,.16)}
.tv-row{display:grid;grid-template-columns:4px minmax(0,1fr) auto auto;align-items:center;gap:14px;padding:18px 2px;color:#ffffff;text-decoration:none}
.tv-row .tv-dot{width:4px;height:36px;border-radius:2px}
.tv-row .tv-rn{display:block;font-size:24px;line-height:1.05;font-weight:740;letter-spacing:-.025em}
.tv-row .tv-pr{display:block;margin-top:4px;font-size:13px;color:#cfe4fa}
.tv-row .tv-n{display:inline-grid;place-items:center;min-width:28px;height:24px;padding:0 8px;border-radius:999px;background:rgba(207,228,250,.14);font-size:13px;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.tv-ring .tv-turn,.tv-lab .tv-pr .ax,.tv-reads a .ax,.tv-see{transition:none}}`

/** Desktop/tablet section; `intro` is the canvas intro block with the new title and copy (same «Todo el archivo» link). */
const DESKTOP = intro => `<section id="temas" data-site-nav-tone="dark" style="background: #001a33; padding: 120px 0 72px;">
  <div class="stage">
${intro}

    <svg class="ring tv-ring" viewBox="0 0 760 760" aria-hidden="true"><circle cx="380" cy="380" r="330" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="1"></circle><g class="tv-turn" style="transform: rotate({{ act.rot }});"><path d="M 697.2 289.0 A 330 330 0 0 1 697.2 471.0" fill="none" stroke="{{ act.accent }}" stroke-width="2" stroke-linecap="round"></path><circle cx="710" cy="380" r="4" fill="{{ act.accent }}"></circle></g></svg>

    <nav class="tv-nav" aria-label="Temas del blog">
      <sc-for list="{{ labels }}" as="l" hint-placeholder-count="6">
        <a href="{{ l.href }}" class="lnk lab tv-lab" style="position: absolute; {{ l.pos }}" aria-current="{{ l.current }}" onMouseEnter="{{ l.pick }}" onFocus="{{ l.pick }}">
          <span class="idea nm" style="white-space: pre-line; color: {{ l.color }};">{{ l.name }}</span>
          <span class="tv-pr">{{ l.promise }}${ARROW}</span>
          <span class="bar" style="width: {{ l.barW }}; background: {{ l.accent }}; align-self: {{ l.align }};"></span>
        </a>
      </sc-for>
    </nav>

    <div class="core tv-core-box" aria-live="polite">
      <div class="swap tv-core">
        <span class="idea tv-name" style="color: {{ act.accent }};">{{ act.name }}</span>
        <p class="tv-desc">{{ act.desc }}</p>
        <p class="tv-start">Para empezar</p>
        <ul class="tv-reads">
          <sc-for list="{{ act.reads }}" as="r" hint-placeholder-count="3"><li><a href="{{ r.href }}" class="lnk"><span>{{ r.t }}</span>${ARROW}</a></li></sc-for>
        </ul>
        <a href="{{ act.href }}" class="tv-see" style="background: {{ act.accent }}; color: {{ act.ink }};">Ver todo {{ act.name }} <span class="tv-n">{{ act.n }}</span>${ARROW}</a>
      </div>
    </div>
  </div>
</section>`

const MOBILE = `<section style="padding: 64px 16px 56px;">
  <p style="margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #cfe4fa;">Explora por tema</p>
  <h2 class="idea" style="margin: 12px 0 0; font-size: 48px; line-height: 0.92; font-weight: 760; letter-spacing: -0.045em;">Elige por dónde empezar.</h2>
  <p class="tv-msub">Seis temas para lo que hoy te ocupa: ventas, marketing, visibilidad en la IA y creatividad.</p>
  <ul class="tv-list" aria-label="Temas del blog">
    <sc-for list="{{ topicRows }}" as="l" hint-placeholder-count="6"><li><a href="{{ l.href }}" class="lnk tv-row"><span class="tv-dot" style="background: {{ l.accent }};"></span><span><span class="idea tv-rn">{{ l.name }}</span><span class="tv-pr">{{ l.promise }}</span></span><span class="tv-n">{{ l.n }}</span>${ARROW}</a></li></sc-for>
  </ul>
</section>`

const INTRO_TITLE = '¿De qué escribimos más?'
const NEW_TITLE = 'Elige por dónde empezar.'
const INTRO_SUB = 'Elige un tema en la órbita: verás cuánto escribimos de él y lo último que publicamos.'
const NEW_SUB = 'Seis temas para lo que hoy te ocupa: ventas, marketing, visibilidad en la IA y creatividad.'

// The six orbit slots (stage coordinates of the canvas) and the angle the arc turns to (0° = 3 o'clock on the ring).
const SLOTS = [
  { pos: 'left: 720px; top: 0px; width: 200px; align-items: center; text-align: center;', align: 'center', deg: -90 },
  { pos: 'left: 1078px; top: 96px; align-items: flex-start; text-align: left;', align: 'flex-start', deg: -52 },
  { pos: 'left: 1078px; top: 726px; align-items: flex-start; text-align: left;', align: 'flex-start', deg: 50 },
  { pos: 'left: 690px; top: 816px; width: 260px; align-items: center; text-align: center;', align: 'center', deg: 90 },
  { pos: 'right: 690px; top: 726px; align-items: flex-end; text-align: right;', align: 'flex-end', deg: 128 },
  { pos: 'right: 690px; top: 96px; align-items: flex-end; text-align: right;', align: 'flex-end', deg: -128 },
]

// The canvas content (efeoncepro.com on 2026-10-24) as the data contract, in orbit order.
const RAW = [
  ['hubspot', 'HubSpot', 'Ventas y CRM en orden', '#e86bd0', 12, 'https://efeoncepro.com/category/hubspot/', 'Cómo usamos HubSpot para ordenar ventas, marketing y servicio: casos reales, guías paso a paso y lo que aprendimos implementándolo.', [
    ['¿Qué necesita una IA para atender bien a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM', 'https://efeoncepro.com/hubspot/ia-atencion-cliente-caso-anam/'],
    ['Un dashboard no arregla un proceso comercial: cómo construimos paneles confiables en HubSpot para ANAM', 'https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/'],
    ['Cómo ejecutar Loop Marketing en tu empresa con las innovaciones de HubSpot 2025', 'https://efeoncepro.com/loop-marketing/ejecutar-loop-marketing-hubspot/'],
  ]],
  ['aeo', 'AEO', 'Aparecer en la IA', '#0375db', 4, 'https://efeoncepro.com/category/aeo/', 'Cómo aparecer en las respuestas de ChatGPT, Gemini y los buscadores con IA: visibilidad, citas y sitios listos para que los agentes te entiendan.', [
    ['El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA', 'https://efeoncepro.com/aeo/web-agentica-agentes-ia/'],
    ['Tu cliente ya no busca solo en Google. Tu estrategia SEO no debería hacerlo tampoco.', 'https://efeoncepro.com/aeo/surround-discovery-seo-google-video-marketplace/'],
    ['El 80% de lo que cita la IA no existe en Google. ¿Dónde estás tú?', 'https://efeoncepro.com/aeo/donde-cita-la-ia/'],
  ]],
  ['marketing-digital', 'Marketing digital', 'Decisiones con contexto', '#36c8bf', 6, 'https://efeoncepro.com/category/marketing-digital/', 'Decisiones de marketing digital con contexto de negocio: medios pagados, contenido, cuándo contratar una agencia y las reglas que cambian el juego.', [
    ['La Ley 21.719 no regula datos: obliga a rediseñar el marketing y el Go-To-Market', 'https://efeoncepro.com/marketing-digital/ley-21719-impacto-marketing-go-to-market/'],
    ['¿Es hora de contratar una agencia de marketing? Guía práctica para elegir la mejor opción', 'https://efeoncepro.com/marketing-digital/contratar-agencia-de-marketing/'],
    ['Qué es paid media y cómo combinarlo con el inbound marketing', 'https://efeoncepro.com/marketing-digital/inbound-marketing-paid-media/'],
  ]],
  ['inbound', 'Inbound', 'Que te encuentren', '#e86bd0', 10, 'https://efeoncepro.com/category/inbound/', 'Atraer en lugar de interrumpir: contenido, SEO, CRM y experiencia del cliente para que te encuentren, te elijan y vuelvan.', [
    ['Yo solo quería cambiar mis lentes: Una lección sobre cómo alinear marketing con experiencia del cliente', 'https://efeoncepro.com/inbound/como-alinear-marketing-con-experiencia-del-cliente/'],
    ['5 Pasos para transformar tu CRM en el motor de crecimiento de tu Negocio', 'https://efeoncepro.com/hubspot/5-pasos-para-transformar-tu-crm-en-motor-de-crecimiento/'],
    ['Qué es paid media y cómo combinarlo con el inbound marketing', 'https://efeoncepro.com/marketing-digital/inbound-marketing-paid-media/'],
  ]],
  ['design', 'Diseño', 'Creatividad con sistema', '#ff6500', 3, 'https://efeoncepro.com/category/design/', 'Cómo trabajamos la creatividad: procesos, flujos y criterio para producir más y mejor sin perder la idea.', [
    ['Creative Workflows: cómo escalar la creatividad sin automatizar el criterio', 'https://efeoncepro.com/design/creative-workflows/'],
    ['La fábrica que nadie ve: el viaje real de una pieza creativa desde el brief hasta el resultado', 'https://efeoncepro.com/design/creative-supply-chain/'],
  ]],
  ['loop-marketing', 'Loop Marketing', 'Después del funnel', '#36c8bf', 5, 'https://efeoncepro.com/category/loop-marketing/', 'El marco que reemplaza al funnel: cómo expresar, personalizar, amplificar y evolucionar tu marketing en ciclos, con HubSpot y con IA.', [
    ['Express en Loop Marketing: POV, voz única, buyer persona y Jobs-to-be-done', 'https://efeoncepro.com/loop-marketing/express-voz-marca-ia-loop-marketing/'],
    ['Cómo ejecutar Loop Marketing en tu empresa con las innovaciones de HubSpot 2025', 'https://efeoncepro.com/loop-marketing/ejecutar-loop-marketing-hubspot/'],
    ['Cómo aplicar Loop Marketing: estrategia, etapas y conexión con el consumidor actual', 'https://efeoncepro.com/loop-marketing/como-aplicar-loop-marketing/'],
  ]],
]

/** Text on a dark accent stays white; on a light accent, navy. Mirrored in EO_Home_Adapter. */
const ink = accent => (accent === '#0375db' ? '#ffffff' : '#001a33')

const FIXTURE = RAW.map(([key, name, promise, accent, n, href, desc, reads], i) => ({
  key, name, promise, accent, ink: ink(accent), href, n, desc,
  reads: reads.map(([t, h]) => ({ t, href: h })),
  pos: SLOTS[i].pos, align: SLOTS[i].align, deg: SLOTS[i].deg,
}))

/** `const T = [...]` in the canvas literal shape (bind-canvas replaces it with D.topics). */
const T_LITERAL = 'const T = [\n' + FIXTURE.map(t => '      ' + JSON.stringify(t)).join(',\n') + '\n    ];\n'

/** Labels, active topic and mobile rows; replaces the canvas block from `const cur` to `const act`. */
const LOGIC = `const cur = this.state.topic;
    const labels = T.map((t) => {
      const on = t.key === cur;
      return { name: t.name, promise: t.promise, href: t.href, n: String(t.n), pos: t.pos, align: t.align, accent: t.accent, color: on ? t.accent : '#ffffff', barW: on ? '48px' : '0px', current: on ? 'true' : 'false', pick: () => { if (t.key !== this.state.topic) this.setState({ topic: t.key }); } };
    });
    const a = T.find((t) => t.key === cur) || T[0];
    // The arc turns around the ring by the shortest way: the angle keeps winding from the last one shown.
    const prevRot = this._rot;
    const rot = typeof prevRot === 'number' ? prevRot + ((((a.deg - prevRot) % 360) + 540) % 360) - 180 : a.deg;
    this._rot = rot;
    const act = { key: a.key, name: a.name, accent: a.accent, ink: a.ink, desc: a.desc, reads: a.reads, href: a.href, n: String(a.n), rot: rot + 'deg' };
    const topicRows = labels.slice().sort((x, y) => Number(y.n) - Number(x.n));
`

module.exports = { CSS, DESKTOP, MOBILE, FIXTURE, T_LITERAL, LOGIC, SLOTS, INTRO_TITLE, NEW_TITLE, INTRO_SUB, NEW_SUB, ink }
