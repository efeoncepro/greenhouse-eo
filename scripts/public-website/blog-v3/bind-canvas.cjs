/**
 * TASK-2051 — Binds the frozen canvas (source/Portada-v3.dc.html, approved 2026-10-24) to WordPress data.
 *
 * Output: source/Portada-v3.bound.dc.html — the same template with (a) the closed list of allowed deviations
 * (canonical site header/footer instead of the mock nav/footer, invisible a11y fixes) and (b) every piece of content
 * that comes from WordPress turned into a lookup. Each replacement declares how many times it must match, so a
 * changed canvas fails loudly instead of binding the wrong thing.
 *
 * Fidelity proof: `node test-bound-equivalence.cjs` renders the deviated original canvas (its own logic and literals)
 * and the bound template fed with `source/fixture.json` (the canvas literals as data) and requires identical HTML.
 */
const fs = require('node:fs')
const path = require('node:path')

const SRC = path.join(__dirname, 'source')
const assets = JSON.parse(fs.readFileSync(path.join(SRC, 'assets.json'), 'utf8'))

function rep(text, from, to, times = 1) {
  const n = typeof from === 'string' ? text.split(from).length - 1 : [...text.matchAll(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'))].length

  if (n !== times) throw new Error(`Expected ${times} match(es), found ${n}: ${String(from).slice(0, 90)}`)

  return typeof from === 'string' ? text.split(from).join(to) : text.replace(from, typeof to === 'string' ? to.replace(/\$(?![1-9&])/g, '$$$$') : to)
}

/** Allowed deviations, applied identically to the reference and to the bound template (README of the direction). */
function deviate(src) {
  // 1. Canonical site header: the mock navigation island goes away (the MCM logo under it stays).
  src = rep(src, /\n\s*<nav aria-label="Navegación global del sitio \(heredada\)"[\s\S]*?<\/nav>/, '')
  // 1b. Canonical footer: the mock footer goes away.
  src = rep(src, /\n<footer style="background: #f7f8f6;[\s\S]*?<\/footer>\n/, '\n')
  // 3. Invisible a11y fixes: the giant year does not announce; slide labels read the short title.
  src = rep(src, '<p class="idea" aria-live="polite" style="margin: 12px 0 0; font-size: 184px;', '<p class="idea" style="margin: 12px 0 0; font-size: 184px;')
  src = rep(src, "aria: (i + 1) + ' de ' + n + ': ' + x.label,", "aria: (i + 1) + ' de ' + n + ': ' + x.short,")

  return src
}

const CARD_ARROW = '<svg class="card__a" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M8 7h9v9"/></g></svg>'

function bindMarkup(src) {
  // Assets: every canvas file becomes a lookup into the asset map.
  for (const [key, a] of Object.entries(assets)) {
    const n = src.split('/_blob/' + a.id).length - 1
    const inLogic = src.slice(src.indexOf('data-dc-script')).split('/_blob/' + a.id).length - 1

    if (n - inLogic > 0) {
      const head = src.slice(0, src.indexOf('data-dc-script'))
      const tail = src.slice(src.indexOf('data-dc-script'))

      src = head.split('/_blob/' + a.id).join('{{ asset.' + key + ' }}') + tail
    }
  }

  // Slider: real links and the real author.
  src = rep(src, '<a href="#" class="lnk" tabindex="{{ s.tab }}" aria-label="{{ s.titleFull }}">', '<a href="{{ s.href }}" class="lnk" tabindex="{{ s.tab }}" aria-label="{{ s.titleFull }}">')
  src = rep(src, '<a href="#" class="ab ab--engine ab--xl live" tabindex="{{ s.tab }}">', '<a href="{{ s.href }}" class="ab ab--engine ab--xl live" tabindex="{{ s.tab }}">')
  src = rep(src, '<a href="#" class="rl live" tabindex="{{ s.tab }}">', '<a href="{{ s.href }}" class="rl live" tabindex="{{ s.tab }}">')
  src = rep(src, '<span class="hs-av" aria-hidden="true">[AA]</span><span>Por <strong style="color: #ffffff; font-weight: 500;">[Autor real]</strong></span>', '<span class="hs-av" aria-hidden="true">{{ s.authorInitials }}</span><span>Por <strong style="color: #ffffff; font-weight: 500;">{{ s.authorName }}</strong></span>')

  // Ask the blog: GET search without JavaScript, real result links.
  src = rep(src, '<form role="search" action="#" class="sf"', '<form role="search" action="{{ searchAction }}" method="{{ searchMethod }}" class="sf"')
  src = rep(src, '<input id="v3-q" type="search" value="{{ q }}"', '<input id="v3-q" type="search" name="{{ searchName }}" value="{{ q }}"')
  src = rep(src, '<a href="#" class="lnk sres__row">', '<a href="{{ r.href }}" class="lnk sres__row">')

  // Glitch: latest edition, latest Flash and the three previous numbers.
  src = rep(src, '<a href="#" class="lnk" style="display: block; max-width: 780px; margin-top: 96px;">', '<a href="{{ glitch.edition.href }}" class="lnk" style="display: block; max-width: 780px; margin-top: 96px;">')
  src = rep(src, '</span>EDICIÓN #17 · 28 JUL 2026</div>', '</span>{{ glitch.edition.label }}</div>')
  src = rep(src, '>Agente rompe la jaula, la confianza reordena el frontier, la correa manda.</p>', '>{{ glitch.edition.title }}</p>')
  src = rep(src, '<a href="#" class="lnk" style="display: block; margin: 28px 28px 0 0; padding: 28px; border-radius: 28px; background: #ffffff; color: #001a33;">', '<a href="{{ glitch.flash.href }}" class="lnk" style="display: block; margin: 28px 28px 0 0; padding: 28px; border-radius: 28px; background: #ffffff; color: #001a33;">')
  src = rep(src, '>GLITCH FLASH · 28 SEP</span>', '>{{ glitch.flash.label }}</span>')
  src = rep(src, '>Sonnet 5.5 roza a Opus, a mitad de precio</span>\n      </a>', '>{{ glitch.flash.title }}</span>\n      </a>')
  src = rep(
    src,
    /\n      <a href="#" class="lnk" style="padding: 28px 28px 0;"><span class="idea gx-num"[\s\S]*?El modelo a centavos, el checkout en vivo, el acceso con dueño<\/span><\/a>/,
    '\n      <sc-for list="{{ glitch.back }}" as="g" hint-placeholder-count="3"><a href="{{ g.href }}" class="lnk" style="{{ g.style }}"><span class="idea gx-num" style="display: block; font-size: 96px; font-weight: 760; letter-spacing: -0.06em; line-height: 0.9;">{{ g.num }}</span><span class="u" style="display: block; margin-top: 16px; font-size: 15px; line-height: 1.45; font-weight: 500;">{{ g.t }}</span></a></sc-for>'
  )
  src = rep(src, '<form action="#" class="gxs__form" aria-label="Suscripción rápida a Glitch"', '<form action="{{ subAction }}" class="gxs__form" aria-label="Suscripción rápida a Glitch"')

  // Events: the next live event, its speakers, takeaways, agenda, the upcoming ones and the recordings.
  src = rep(src, /(<!-- ═══════════ 4b · EVENTOS Y WEBINARS: EN VIVO ═══════════ -->\n)(<section id="eventos"[\s\S]*?<\/section>\n)/, '$1<sc-if value="{{ ev.show }}" hint-placeholder-val="{{ true }}">\n$2</sc-if>\n')
  src = rep(src, '<a href="#" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>Ver todos los eventos</span><span aria-hidden="true">Ver todos los eventos</span></span></span><span class="nl__n">4</span>', '<a href="{{ ev.allHref }}" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>Ver todos los eventos</span><span aria-hidden="true">Ver todos los eventos</span></span></span><span class="nl__n">{{ ev.total }}</span>')
  src = rep(src, '</span>Webinar en vivo · Gratis · Cupos limitados</span>', '</span>{{ ev.chip }}</span>')
  src = rep(src, '>Cómo aparecer en las respuestas de ChatGPT</h2>', '>{{ ev.title }}</h2>')
  src = rep(src, '>45 minutos con el equipo de Efeonce | AEO: qué miran los motores de respuesta, cómo medir tu visibilidad y qué cambiar en tu sitio esta misma semana.</p>', '>{{ ev.dek }}</p>')
  src = rep(src, '</svg>Jueves 12 de noviembre · 10:00 (Chile)</li>', '</svg>{{ ev.when }}</li>')
  src = rep(src, '</svg>45 minutos</li>', '</svg>{{ ev.duration }}</li>')
  src = rep(src, '</svg>En línea</li>', '</svg>{{ ev.modality }}</li>')
  src = rep(src, '<form action="#" class="gxs__form" aria-label="Reservar lugar en el webinar"', '<form action="{{ ev.formAction }}" class="gxs__form" aria-label="Reservar lugar en el webinar"')
  src = rep(src, '<span class="gxs__t2">Te esperamos el 12 de noviembre</span>', '<span class="gxs__t2">{{ ev.doneLabel }}</span>')
  src = rep(src, '<a href="#" class="nl nl--dark live"><svg width="20" height="20"', '<a href="{{ ev.calendarHref }}" class="nl nl--dark live"><svg width="20" height="20"')
  src = rep(src, /(<div class="evproof">[\s\S]*?personas ya reservaron su lugar<\/span><\/div>)/, '<sc-if value="{{ ev.showSeats }}" hint-placeholder-val="{{ true }}">$1</sc-if>')
  src = rep(src, '<div class="evx__art"><img src="{{ asset.slideAeo }}" alt="" loading="lazy"><span class="evx__tag">Efeonce | AEO · Webinar</span></div>', '<div class="evx__art"><img src="{{ ev.art }}" alt="" loading="lazy"><span class="evx__tag">{{ ev.tag }}</span></div>')
  src = rep(src, '<span style="font-weight: 500; letter-spacing: 0; text-transform: none;">Jue 12 nov · 10:00</span>', '<span style="font-weight: 500; letter-spacing: 0; text-transform: none;">{{ ev.short }}</span>')
  src = rep(src, '<h3 class="ev-sub">Agenda · 45 minutos</h3>', '<h3 class="ev-sub">{{ ev.agendaTitle }}</h3>')
  src = rep(src, '<a href="#" class="lnk evt" style="--lc: {{ e.c }};">', '<a href="{{ e.href }}" class="lnk evt" style="--lc: {{ e.c }};">')
  src = rep(src, '<a href="#" class="lnk evr__c">', '<a href="{{ r.href }}" class="lnk evr__c">')

  // Reading rail: four card variants fed by data, markup unchanged.
  const railStart = src.indexOf('<div class="rail" id="v3-rail" role="list" onScroll="{{ onRail }}">')
  const railEnd = src.indexOf('  </div>\n</section>', railStart)

  if (railStart < 0 || railEnd < 0) throw new Error('Rail not found')

  const rail = `<div class="rail" id="v3-rail" role="list" onScroll="{{ onRail }}">
    <sc-for list="{{ rail }}" as="c" hint-placeholder-count="6">
    <sc-if value="{{ c.isPhoto }}" hint-placeholder-val="{{ true }}"><a href="{{ c.href }}" role="listitem" class="lnk card" style="background: #001a33; color: #ffffff;">${CARD_ARROW}
      <img src="{{ c.img }}" alt="" style="width: 100%; height: 330px; object-fit: cover; display: block;">
      <div style="padding: 32px; display: flex; flex-direction: column; flex: 1;">
        <span style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: #cfe4fa;"><span style="width: 28px; height: 5px; border-radius: 3px; background: {{ c.accent }};"></span>{{ c.kicker }}</span>
        <span class="idea u" style="margin-top: 16px; font-size: 34px; line-height: 1; font-weight: 760; letter-spacing: -0.035em;">{{ c.title }}</span>
        <sc-if value="{{ c.minutesLabel }}" hint-placeholder-val="{{ true }}"><span style="margin-top: auto; font-size: 14px; color: #cfe4fa;">{{ c.minutesLabel }}</span></sc-if>
      </div>
    </a></sc-if>
    <sc-if value="{{ c.isMinutes }}" hint-placeholder-val="{{ false }}"><a href="{{ c.href }}" role="listitem" class="lnk card" style="{{ c.style }}">${CARD_ARROW}
      <span style="{{ c.kickerStyle }}"><span style="width: 28px; height: 5px; border-radius: 3px; background: {{ c.accent }};"></span>{{ c.kicker }}</span>
      <span class="idea" style="font-size: 240px; line-height: 0.8; font-weight: 760; letter-spacing: -0.07em;">{{ c.minutes }}<span style="font-size: 28px; letter-spacing: 0; font-weight: 500;"> min</span></span>
      <span class="idea u" style="font-size: 32px; line-height: 1.02; font-weight: 740; letter-spacing: -0.03em;">{{ c.title }}</span>
    </a></sc-if>
    <sc-if value="{{ c.isDownload }}" hint-placeholder-val="{{ false }}"><a href="{{ c.href }}" role="listitem" class="lnk card" style="background: #023c70; color: #ffffff; padding: 36px; justify-content: space-between;">${CARD_ARROW}
      <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #cfe4fa;">{{ c.kicker }}</span>
      <img src="{{ c.img }}" alt="" style="width: 70%; aspect-ratio: 3/4; object-fit: cover; border-radius: 14px; align-self: center;">
      <span class="idea u" style="font-size: 32px; line-height: 1.02; font-weight: 740; letter-spacing: -0.03em;">{{ c.title }}</span>
    </a></sc-if>
    <sc-if value="{{ c.isDiag }}" hint-placeholder-val="{{ false }}"><a href="{{ c.href }}" role="listitem" class="lnk card" style="background: #091951; color: #ffffff; padding: 36px; justify-content: space-between;">${CARD_ARROW}
      <div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #cfe4fa;">{{ c.kicker }}</span><img src="{{ c.img }}" alt="{{ c.imgAlt }}" style="height: 26px; width: auto;"></div>
      <span class="idea" style="font-size: 104px; line-height: 0.86; font-weight: 760; letter-spacing: -0.055em;">{{ c.title }}</span>
      <span class="u" style="font-size: 16px; font-weight: 600;">{{ c.sub }}</span>
    </a></sc-if>
    </sc-for>
`

  src = src.slice(0, railStart) + rail + src.slice(railEnd)

  // Topics: real totals, latest link and source line.
  src = rep(src, '<span class="nl__n">44</span>', '<span class="nl__n">{{ totalPosts }}</span>')
  src = rep(src, '<a href="#" class="lnk" style="margin-top: 26px; max-width: 360px;">', '<a href="{{ act.href }}" class="lnk" style="margin-top: 26px; max-width: 360px;">')
  src = rep(src, '>Fuente: blog de Efeonce, 44 publicaciones al 23 oct 2026</span>', '>{{ act.source }}</span>')

  // Archive: real title, links and «more».
  src = rep(src, '>Todo el archivo · 44 publicaciones</p>', '>{{ archiveTitle }}</p>')
  src = rep(src, '<a href="#" class="lnk arch-row">', '<a href="{{ r.href }}" class="lnk arch-row">')
  src = rep(src, '<a href="#" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>{{ moreLabel }}', '<a href="{{ moreHref }}" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>{{ moreLabel }}')

  // Subscription.
  src = rep(src, '<form action="#" aria-label="Suscripción a Glitch"', '<form action="{{ subAction }}" aria-label="Suscripción a Glitch"')

  return src
}

function bindLogic(src) {
  src = rep(src, '  renderVals() {\n    const S = [', '  renderVals() {\n    const D = this.props.data;\n    const S0 = [')
  src = rep(src, /const S0 = \[[\s\S]*?\n    \];\n/, 'const S = D.slides;\n')
  src = rep(src, /const T = \[[\s\S]*?\n    \];\n/, 'const T = D.topics;\n')
  src = rep(src, /const Y = \{[\s\S]*?\n    \};\n/, 'const Y = D.archive;\n')
  src = rep(src, "const chips = ['Cómo aparecer en ChatGPT', 'Ordenar mi CRM en HubSpot', 'Qué es Loop Marketing', 'Escalar la producción creativa'].map(", 'const chips = D.questions.map(')
  src = rep(src, "const years = ['2026', '2025', '2024', '2023'].map(", 'const years = D.years.map(')
  src = rep(src, "yearShift: (['2026', '2025', '2024', '2023'].indexOf(this.state.year) * 100) + '%',", "yearShift: (D.years.indexOf(this.state.year) * 100) + '%',")
  src = rep(src, "this.state = { topic: 'hubspot', year: '2026',", "this.state = { topic: props.data.topicDefault, year: props.data.years[0],")
  src = rep(src, "pct: Math.round((a.n / 44) * 100) + ' %', share: a.n + ' de 44' }", "pct: Math.round((a.n / D.total) * 100) + ' %', share: a.n + ' de ' + D.total, href: a.href, source: D.topicsSource }")
  src = rep(src, /evSpk: \[[\s\S]*?\n      \],\n      evSeats: '312',\n      evLearn: \[[\s\S]*?\n      \],\n      evAgenda: \[[\s\S]*?\n      \],\n      evNext: \[[\s\S]*?\n      \],\n      evRec: \[[\s\S]*?\n      \],\n/, 'evSpk: D.event.speakers, evSeats: D.event.seats, evLearn: D.event.takeaways, evAgenda: D.event.agenda, evNext: D.event.upcoming, evRec: D.event.recordings,\n      ev: D.event, glitch: D.glitch, rail: D.rail, asset: D.assets, totalPosts: D.total, archiveTitle: D.archiveTitle, moreHref: Y[yr].moreHref,\n      searchAction: D.search.action, searchMethod: D.search.method, searchName: D.search.name, subAction: D.subscribe.action,\n')
  src = rep(src, 'const at = Date.UTC(2026, 10, 12, 13, 0, 0);', 'const at = D.event.startMs;')

  return src
}

/* ---------- Mobile board (Movil-v3) ---------- */

function deviateMobile(src) {
  // 1. Canonical site header and footer replace the mock ones. The mock navigation island marked the slot the fixed
  //    canonical bar occupies on mobile, so it becomes an empty spacer of the same height (the MCM logo keeps its
  //    canvas position under the bar instead of sliding beneath it).
  src = rep(src, /\n(\s*)<nav aria-label="Navegación global del sitio \(heredada\)"[\s\S]*?<\/nav>/, '\n$1<div aria-hidden="true" style="height: 56px;"></div>')
  src = rep(src, /\n<footer style="background: #f7f8f6; padding: 40px 16px;[\s\S]*?<\/footer>\n/, '\n')
  // 2. Fluid root: the artboard size (390 × 6400, clipped) becomes the viewport width with natural height.
  src = rep(src, '<div class="m3" style="width: 390px; height: 6400px; overflow: hidden; background: #001a33;', '<div class="m3" style="background: #001a33;')
  // 3. Below 390 px (not designed) the topics orbit scales to the available width: hook for assets/css/eobh-host.css.
  src = rep(src, '<div style="position: relative; width: 358px; height: 358px; margin-top: 32px;">', '<div data-fluid="orbit" style="position: relative; width: 358px; height: 358px; margin-top: 32px;">')
  // 4. Invisible a11y fix: the giant year does not announce.
  src = rep(src, '<p class="idea" aria-live="polite" style="margin: 8px 0 0; font-size: 140px;', '<p class="idea" style="margin: 8px 0 0; font-size: 140px;')

  return src
}

function bindMarkupMobile(src) {
  for (const [key, a] of Object.entries(assets)) src = src.split('/_blob/' + a.id).join('{{ asset.' + key + ' }}')
  if (src.includes('/_blob/')) throw new Error('Unmapped canvas asset in mobile markup')

  // Slider links.
  src = rep(src, '<a href="#" class="lnk" tabindex="{{ s.tab }}" aria-label="{{ s.titleFull }}">', '<a href="{{ s.href }}" class="lnk" tabindex="{{ s.tab }}" aria-label="{{ s.titleFull }}">')
  src = rep(src, '<a href="#" class="rl live" tabindex="{{ s.tab }}">', '<a href="{{ s.href }}" class="rl live" tabindex="{{ s.tab }}">')

  // Ask the blog: GET search and suggested questions.
  src = rep(src, '<form role="search" action="#" class="sf"', '<form role="search" action="{{ searchAction }}" method="{{ searchMethod }}" class="sf"')
  src = rep(src, '<input id="m3-q" type="search" onInput="{{ pulseIn }}"', '<input id="m3-q" type="search" name="{{ searchName }}" onInput="{{ pulseIn }}"')
  src = rep(src, /\n    <a href="#" class="chip live">Ordenar mi CRM<\/a>\n    <a href="#" class="chip live">Qué es Loop Marketing<\/a>/, '\n    <sc-for list="{{ chips }}" as="c" hint-placeholder-count="2"><a href="{{ c.href }}" class="chip live">{{ c.t }}</a></sc-for>')

  // Glitch.
  src = rep(src, '<a href="#" class="lnk" style="margin-top: 36px;">', '<a href="{{ glitch.edition.href }}" class="lnk" style="margin-top: 36px;">')
  src = rep(src, '</span>EDICIÓN #17 · 28 JUL</div>', '</span>{{ glitch.edition.label }}</div>')
  src = rep(src, '>Agente rompe la jaula, la confianza reordena el frontier, la correa manda.</p>', '>{{ glitch.edition.title }}</p>')
  src = rep(src, '<a href="#" class="lnk" style="margin-top: 24px; padding: 24px;', '<a href="{{ glitch.flash.href }}" class="lnk" style="margin-top: 24px; padding: 24px;')
  src = rep(src, '>GLITCH FLASH · 28 SEP</span>', '>{{ glitch.flash.label }}</span>')
  src = rep(src, '>Sonnet 5.5 roza a Opus, a mitad de precio</p></a>', '>{{ glitch.flash.title }}</p></a>')
  src = rep(
    src,
    /\n    <a href="#" class="lnk"><span class="idea gx-num"[\s\S]*?Token barato, criterio caro<\/span><\/a>/,
    '\n    <sc-for list="{{ glitch.back }}" as="g" hint-placeholder-count="2"><a href="{{ g.href }}" class="lnk"><span class="idea gx-num" style="font-size: 64px; font-weight: 760; letter-spacing: -0.06em; line-height: 0.9;">{{ g.num }}</span><span style="display: block; margin-top: 10px; font-size: 13px; line-height: 1.4;">{{ g.t }}</span></a></sc-for>'
  )
  src = rep(src, '<form action="#" class="gxs__form" aria-label="Suscripción rápida a Glitch"', '<form action="{{ subAction }}" class="gxs__form" aria-label="Suscripción rápida a Glitch"')

  // Events.
  src = rep(src, /(<!-- Eventos y webinars -->\n)(<section id="eventos-m"[\s\S]*?<\/section>\n)/, '$1<sc-if value="{{ ev.show }}" hint-placeholder-val="{{ true }}">\n$2</sc-if>\n')
  src = rep(src, '</span>Webinar en vivo · Gratis</span>', '</span>{{ ev.chip }}</span>')
  src = rep(src, '>Cómo aparecer en las respuestas de ChatGPT</h2>', '>{{ ev.title }}</h2>')
  src = rep(src, '>45 minutos con el equipo de Efeonce | AEO: qué miran los motores de respuesta y qué cambiar en tu sitio esta misma semana.</p>', '>{{ ev.dek }}</p>')
  src = rep(src, '</svg>Jueves 12 de noviembre · 10:00 (Chile)</li>', '</svg>{{ ev.when }}</li>')
  src = rep(src, '</svg>45 minutos</li>', '</svg>{{ ev.duration }}</li>')
  src = rep(src, '</svg>En línea</li>', '</svg>{{ ev.modality }}</li>')
  src = rep(src, '<div class="evx__art"><img src="{{ asset.slideAeo }}" alt="" loading="lazy"><span class="evx__tag">Efeonce | AEO · Webinar</span></div>', '<div class="evx__art"><img src="{{ ev.art }}" alt="" loading="lazy"><span class="evx__tag">{{ ev.tag }}</span></div>')
  src = rep(src, '<form action="#" class="gxs__form" aria-label="Reservar lugar en el webinar"', '<form action="{{ ev.formAction }}" class="gxs__form" aria-label="Reservar lugar en el webinar"')
  src = rep(src, '<span class="gxs__t2">Te esperamos el 12 de noviembre</span>', '<span class="gxs__t2">{{ ev.doneLabel }}</span>')
  src = rep(src, '<a href="#" class="nl nl--dark live"><svg width="20" height="20"', '<a href="{{ ev.calendarHref }}" class="nl nl--dark live"><svg width="20" height="20"')
  src = rep(src, /(<div class="evproof">[\s\S]*?personas ya reservaron su lugar<\/span><\/div>)/, '<sc-if value="{{ ev.showSeats }}" hint-placeholder-val="{{ true }}">$1</sc-if>')
  src = rep(src, '<h3 class="ev-sub" style="margin-top: 40px;">Agenda · 45 minutos</h3>', '<h3 class="ev-sub" style="margin-top: 40px;">{{ ev.agendaTitle }}</h3>')
  src = rep(src, '<a href="#" class="lnk evt" style="--lc: {{ e.c }};">', '<a href="{{ e.href }}" class="lnk evt" style="--lc: {{ e.c }};">')
  src = rep(src, '<a href="#" class="lnk evr__c">', '<a href="{{ r.href }}" class="lnk evr__c">')
  src = rep(src, '<a href="#" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>Ver todos los eventos</span><span aria-hidden="true">Ver todos los eventos</span></span></span><span class="nl__n">4</span>', '<a href="{{ ev.allHref }}" class="nl nl--light live"><span class="roll"><span class="roll__in"><span>Ver todos los eventos</span><span aria-hidden="true">Ver todos los eventos</span></span></span><span class="nl__n">{{ ev.total }}</span>')

  // Reading rail: three card variants fed by data.
  src = rep(
    src,
    /\n    <a href="#" role="listitem" class="lnk" style="flex: none; width: 300px; height: 440px; border-radius: 26px; overflow: hidden;[\s\S]*?Hacer el diagnóstico<\/span><\/a>/,
    `
    <sc-for list="{{ rail }}" as="c" hint-placeholder-count="3"><sc-if value="{{ c.isPhoto }}" hint-placeholder-val="{{ true }}"><a href="{{ c.href }}" role="listitem" class="lnk" style="flex: none; width: 300px; height: 440px; border-radius: 26px; overflow: hidden; background: #001a33; color: #ffffff; scroll-snap-align: start; display: flex; flex-direction: column;"><img src="{{ c.img }}" alt="" style="width: 100%; height: 220px; object-fit: cover; display: block;"><div style="padding: 22px;"><span style="font-size: 12px; color: #cfe4fa;">{{ c.kicker }}</span><span class="idea" style="display: block; margin-top: 10px; font-size: 26px; line-height: 1; font-weight: 760; letter-spacing: -0.03em;">{{ c.title }}</span></div></a></sc-if><sc-if value="{{ c.isMinutes }}" hint-placeholder-val="{{ false }}"><a href="{{ c.href }}" role="listitem" class="lnk" style="flex: none; width: 300px; height: 440px; border-radius: 26px; {{ c.tone }} padding: 26px; scroll-snap-align: start; display: flex; flex-direction: column; justify-content: space-between;"><span style="font-size: 12px;">{{ c.kicker }}</span><span class="idea" style="font-size: 160px; line-height: 0.8; font-weight: 760; letter-spacing: -0.07em;">{{ c.minutes }}<span style="font-size: 22px; font-weight: 500; letter-spacing: 0;"> min</span></span><span class="idea" style="font-size: 24px; line-height: 1.02; font-weight: 740;">{{ c.title }}</span></a></sc-if><sc-if value="{{ c.isDiag }}" hint-placeholder-val="{{ false }}"><a href="{{ c.href }}" role="listitem" class="lnk" style="flex: none; width: 300px; height: 440px; border-radius: 26px; background: #091951; color: #ffffff; padding: 26px; scroll-snap-align: start; display: flex; flex-direction: column; justify-content: space-between;"><img src="{{ c.img }}" alt="{{ c.imgAlt }}" style="height: 22px; width: auto; align-self: flex-start;"><span class="idea" style="font-size: 72px; line-height: 0.86; font-weight: 760; letter-spacing: -0.055em;">{{ c.title }}</span><span style="font-size: 15px; font-weight: 600; text-decoration: underline;">{{ c.sub }}</span></a></sc-if></sc-for>`
  )

  // Topics.
  src = rep(src, '>Fuente: blog de Efeonce, 44 publicaciones al 23 oct 2026</p>', '>{{ act.source }}</p>')
  src = rep(src, '<a href="#" class="lnk" style="margin-top: 20px; padding: 18px 0;', '<a href="{{ act.href }}" class="lnk" style="margin-top: 20px; padding: 18px 0;')

  // Archive.
  src = rep(src, '>Todo el archivo · 44</p>', '>{{ archiveTitle }}</p>')
  src = rep(src, '<a href="#" class="lnk" style="padding: 16px 0; border-top: 1px solid rgba(2,60,112,0.14);">', '<a href="{{ r.href }}" class="lnk" style="padding: 16px 0; border-top: 1px solid rgba(2,60,112,0.14);">')
  src = rep(src, '<a href="#" class="nl nl--light live" style="margin-top: 16px;">', '<a href="{{ moreHref }}" class="nl nl--light live" style="margin-top: 16px;">')

  // Subscription.
  src = rep(src, '<form action="#" aria-label="Suscripción a Glitch"', '<form action="{{ subAction }}" aria-label="Suscripción a Glitch"')

  if (/href="#"/.test(src)) throw new Error('Unbound href="#" left in mobile markup: ' + src.match(/.{60}href="#".{60}/)[0])

  return src
}

function bindLogicMobile(src) {
  src = rep(src, '  renderVals() {\n    const S = [', '  renderVals() {\n    const D = this.props.data;\n    const S0 = [')
  src = rep(src, /const S0 = \[[\s\S]*?\n    \];\n/, 'const S = D.slides;\n')
  src = rep(src, /const T = \[[\s\S]*?\n    \];\n/, 'const T = D.topics;\n')
  src = rep(src, /const Y = \{[\s\S]*?\n    \};\n/, 'const Y = D.archive;\n')
  src = rep(src, "const years = ['2026', '2025', '2024', '2023'].map(", 'const years = D.years.map(')
  src = rep(src, "yearShift: (['2026', '2025', '2024', '2023'].indexOf(yr) * 100) + '%',", "yearShift: (D.years.indexOf(yr) * 100) + '%',")
  src = rep(src, "this.state = { topic: 'hubspot', year: '2026',", "this.state = { topic: props.data.topicDefault, year: props.data.years[0],")
  src = rep(src, "pct: Math.round((a.n / 44) * 100) + ' %', share: a.n + ' de 44 publicaciones' }", "pct: Math.round((a.n / D.total) * 100) + ' %', share: a.n + ' de ' + D.total + ' publicaciones', href: a.href, source: D.topicsSource }")
  src = rep(src, /evSpk: \[[\s\S]*?\n      \],\n      evSeats: '312',\n      evLearn: \[[\s\S]*?\n      \],\n      evAgenda: \[[\s\S]*?\n      \],\n      evNext: \[[\s\S]*?\n      \],\n      evRec: \[[\s\S]*?\n      \],\n/, 'evSpk: D.event.speakers, evSeats: D.event.seats, evLearn: D.event.takeaways, evAgenda: D.event.agenda, evNext: D.event.upcoming, evRec: D.event.recordings,\n      ev: D.event, glitch: D.glitch, rail: D.rail, asset: D.assets, chips: D.chips, archiveTitle: D.archiveTitle, moreHref: Y[yr].moreHref,\n      searchAction: D.search.action, searchMethod: D.search.method, searchName: D.search.name, subAction: D.subscribe.action,\n')
  src = rep(src, 'const at = Date.UTC(2026, 10, 12, 13, 0, 0);', 'const at = D.event.startMs;')

  return src
}

// The canvas markup never lives loose in the repo (Tailwind would scan it): it is read from the frozen tarball.
const TARBALL = path.join(__dirname, '../../../docs/ui/visual-directions/TASK-2051-blog-portada-v3/fuente-canvas-2026-10-24.tar.gz')

function ensureSource(name) {
  const file = path.join(SRC, name + '.dc.html')

  if (!fs.existsSync(file)) {
    const out = require('node:child_process').execFileSync('tar', ['-xzOf', TARBALL, 'project/' + name + '.dc.html'])

    fs.writeFileSync(file, out)
  }
}

function buildBoard(name, dev, markup, logic) {
  ensureSource(name)
  const deviated = dev(fs.readFileSync(path.join(SRC, name + '.dc.html'), 'utf8'))
  const cut = deviated.indexOf('<script type="text/x-dc"')
  const bound = markup(deviated.slice(0, cut)) + logic(deviated.slice(cut))

  fs.writeFileSync(path.join(SRC, name + '.reference.dc.html'), deviated)
  fs.writeFileSync(path.join(SRC, name + '.bound.dc.html'), bound)
  console.log(`bound ${name}:`, bound.length, 'bytes; reference:', deviated.length, 'bytes')
}

if (require.main === module) {
  buildBoard('Portada-v3', deviate, bindMarkup, bindLogic)
  buildBoard('Movil-v3', deviateMobile, bindMarkupMobile, bindLogicMobile)
}

module.exports = { deviate, bindMarkup, bindLogic, deviateMobile, bindMarkupMobile, bindLogicMobile }
