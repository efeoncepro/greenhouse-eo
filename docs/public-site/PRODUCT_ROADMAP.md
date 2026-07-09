# Public Site — Product Roadmap

> Roadmap del sitio público de Efeonce como **producto comercial**. No es un
> backlog de tareas (eso vive en `docs/tasks/`) ni un programa (eso vive en
> `docs/epics/`): es la **secuencia narrativa** de qué superficies existen o
> vienen y por qué, con enlaces a los EPICs/PDRs que las sostienen.
>
> Sello: 2026-07-05. Horizontes relativos convertidos a estado, no a fechas.

## North Star

El sitio público es la **puerta de adquisición** del modelo ASaaS: convierte
demanda (búsqueda clásica + motores de respuesta IA) en pipeline gobernado
(HubSpot portal 48713323), con el **AI Visibility Grader** como lead magnet e
instrumento de medición compartido. Toda superficie nueva se justifica por su
aporte al embudo Bow-tie, no por completitud de catálogo.

Marco de posicionamiento (skill `seo-aeo`, framework propietario Efeonce): las
superficies se ordenan por los 5 niveles — **Be Found · Readable · Correct ·
Actionable · Intrinsic**. SEO cubre el cimiento (Found/Readable); AEO cubre el
filo (Correct/Actionable/Intrinsic).

El sitio público es la **capa de adquisición** del ecosistema digital Efeonce
(modelo de capas en [PDR-003](decisions/PDR-003-layering-ecosistema-digital-efeonce.md):
adquisición · contenido/Think · experiencia, sobre plataformas Greenhouse/Kortex/Verk).

La categoría pública queda fijada por [PDR-012](decisions/PDR-012-growth-operating-system-global-positioning.md):
**Growth Operating System / ASaaS**, LATAM-first y global-ready. La Home debe vender
el sistema; About Us debe explicar el Why; cada spoke de servicio debe demostrar una
capability dentro del sistema, no presentarse como agencia suelta.

## Estado actual (baseline)

| Superficie | Estado | Rol | Fuente |
| --- | --- | --- | --- |
| `/aeo-2` (servicio AEO) | Live | Filo / diferenciador | EPIC-020 · skill `efeonce-public-site-wordpress` |
| AI Visibility Grader (lead magnet) | Motor robusto (eje AEO); hub en `think.efeoncepro.com` | Gancho compartido | EPIC-020 · grader architecture |
| Programa SEO (Search Visibility 360) | Planificado (ADR Accepted, tasks fundacionales) | Motor de datos SEO | EPIC-022 |
| Migración a Astro runtime | Dirección aceptada, sin cutover | Rail frontend objetivo | ADR Astro runtime strategy |

## Now

- **PDR-001 — Landing SEO complementaria al AEO** (decidido): posicionamiento SEO
  como *cimiento* de la promesa de visibilidad (no commodity), hermana de
  `/aeo-2`. Ver [PDR-001](decisions/PDR-001-seo-landing-complementaria-al-aeo.md).
- **PDR-002 — Arquitectura de información** (decidida, slugs data-backed): hub
  `/servicios` (no `/soluciones` — cliché de voz) con spokes por keyword real
  (Semrush CL): `/servicios/posicionamiento-seo` (title→"agencia seo" 880) +
  `/servicios/aeo` (term 320, uncontested ← 301 desde `/aeo-2`). El pillar de
  autoridad = **guía de contenido en Think**, no página de servicio. El grader es
  el nodo de conversión compartido. Ver [PDR-002](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md).

- **TASK-1343 — Landing SEO `/servicios/posicionamiento-seo`** (to-do, ui-ux):
  la spoke de conversión bajada a task ejecutable con wireframe + flow + motion
  robustos (diseño con `seo-aeo`·`commercial-expert`·`copywriting`·`modern-ui`).
  Reusa el `<greenhouse-form>` + grader (Full API Parity por reuso). UI ready no.
  Ver `docs/tasks/to-do/TASK-1343-servicios-posicionamiento-seo-landing.md`.

- **PDR-004 — Landing "Agencia Creativa"** (posicionamiento decidido) + **TASK-1350**
  (to-do, ui-ux/flow, UI ready no): posiciona la **capability creativa** (Globe) como
  partner de producción que **escala** el output de equipos de marketing in-house
  (mid-market/enterprise), con **Time-to-Market medible** (cadena ICO) como ventaja
  competitiva y ejecución **Design Engineer** (arte+color+ingeniería, assets con el
  stack IA propio) en WordPress code-custom. CTA "Agenda una reunión". Lidera Efeonce.
  Ver [PDR-004](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md) +
  `docs/tasks/to-do/TASK-1350-landing-agencia-creativa.md`. Pendiente: dirección de
  arte del hero + contrato de Motion antes de `UI ready: yes`.

- **PDR-005 — Landing "Redes Sociales"** (posicionamiento decidido; v1 live/noindex) +
  **TASK-1351** (formalmente `to-do`, ui-ux, UI ready no hasta cierre de lifecycle):
  spoke de servicio `/servicios/redes-sociales` para la gestión de redes (Community ·
  Creators/Influencers · Trendjacking · Reels · social listening) bajo el paraguas
  creativo (`PDR-004`). Ángulo **outcome + craft moderno + prueba** (no "manejamos tus
  redes"); build spoke Ohio + sección firma "muro social vivo"; oferta de dos escalones
  ("Agenda una reunión" + "Pide una auditoría de tus redes"). Head term comercial
  "agencia de redes sociales" (Semrush CL 170); "community manager" (4.400, job/how-to)
  → guía pillar en Think. Estado runtime: página WordPress `251300` publicada con
  `noindex`, hero artístico `El mural que alza vuelo` y muro social con 8 assets WebP
  premium ficticios. Pendiente: aprobar indexación/canonical, cutover HubSpot delivery,
  cierre formal de TASK-1351 y guía pillar Think.
  Ver [PDR-005](decisions/PDR-005-landing-redes-sociales-posicionamiento.md),
  `docs/tasks/to-do/TASK-1351-landing-redes-sociales.md` y
  `docs/operations/public-site-social-wall-media-production-20260708.md`.

- **PDR-006 — Landing "HubSpot" (Agentic Customer Platform + partnership)** (posicionamiento
  decidido) + **TASK-1352** (ui-ux, UI ready no): **reposiciona la página existente
  `/servicios-contratar-hubspot/`** (id `244079`) del relato "compra e implementa un CRM" al de
  **plataforma agéntica operada con software propio**. Ángulo teach-first ("HubSpot dejó de ser un
  CRM: hay que arquitecturarla, poblarla con datos limpios y gobernar a los agentes"); arco de las
  **4 capas de CRM Solutions** (licencia → implementación → managed ops → intelligence); diferenciador
  = **Kortex** (deployment programático trazable, "capacidad que ningún competidor LATAM replica").
  **No es spoke SEO** (la demanda de partner HubSpot es mínima en todo el bloque hispano — Semrush:
  `hubspot partner` MX 30 / CO 110 / ES 170 / CL 20; la categoría `crm`/`hubspot` sí es masiva → Think);
  su embudo es co-sell (PDM) + Solutions Directory + directo + cross-sell. Oferta de dos escalones
  ("Agenda una reunión" + "Solicita un diagnóstico de tu portal HubSpot"). Proof point: **Kortex validado y en el
  HubSpot Marketplace**. **Alcance pan-hispano** (es-LATAM neutro, `hreflang`-ready). Lidera Efeonce. Ver
  [PDR-006](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md). Pendiente de ejecución:
  wireframe/flow/motion + confirmar resultados HubSpot/CRM citables + link al listing del Marketplace antes de `UI ready: yes`.

- **PDR-007 + EPIC-024 — "HubSpot Portal Grader"** (posicionamiento + programa decididos): el
  "diagnóstico de portal HubSpot" de PDR-006 se construye como **lead magnet propio** con motor en
  Kortex, contrato gobernado en Greenhouse (`growth.hubspot_portal`) y superficie headless en Think —
  modelo híbrido de dos puertas (self-assessment público sin OAuth = **Fase 1**; auditoría conectada
  OAuth = **Fase 2** gateada). Espeja el AI Visibility Grader (EPIC-020) con motor distinto (peer
  Kortex). ADR: `GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`. Ver
  [PDR-007](decisions/PDR-007-hubspot-portal-grader-lead-magnet.md) + `docs/epics/to-do/EPIC-024-hubspot-portal-grader.md`.
  Child tasks desde `TASK-1353` (Fase 1 primero; no depende del cutover prod de Kortex).

- **PDR-010 — La Home ES el pitch; `/agencia` se pliega; About Us es el gap** (decidido, 2026-07-08):
  al escribir el copy quedó claro que el pitch de `/agencia` y el de la Home son el mismo discurso —una
  agencia tiene un solo trabajo de venta arriba del embudo. **`/agencia` NO se construye como página
  separada; su contenido es la Home** (que absorbe el head term "agencia de marketing digital" en title/H1
  + reencuadre + repartición a spokes). **TASK-1358 se reorienta** a rework de la Home. El material de
  identidad (4 unidades, ICO, ecosistema) se mueve al **About Us** — el gap real ahora, sobre la página
  existente `/about-us-efeonce/` (249770), pendiente de su propio PDR + task. Ver
  [PDR-010](decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md).

- **PDR-011 — About Us: página de identidad (Golden Circle)** (decidido, 2026-07-08) + **TASK-1369**
  (to-do, ui-ux, UI ready no): reconstruye `/about-us-efeonce/` (249770 → sugerido `/nosotros`) como
  **Golden Circle (Why→How→What)** liderando el **Why de marca** recién articulado (*no te entregamos
  crecimiento, lo construimos contigo —y te dejamos más capaz de sostenerlo*; SSOT
  `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce). Es identidad/E-E-A-T, **no un pitch**
  (la Home es el pitch, PDR-010): cuenta el sistema completo —capabilities descriptivas (NUNCA sub-marcas),
  método Loop/ICO, software propio— a fondo como identidad. **Supersede TASK-1322** (refresh de copy ligero
  cuya premisa "mantener el hero" quedó obsoleta). Bloqueada por **bios reales del equipo + dirección de
  arte del hero**. Ver [PDR-011](decisions/PDR-011-about-us-identidad-golden-circle.md) +
  `docs/tasks/to-do/TASK-1369-about-us-identidad.md`.

- **PDR-008 — Landing "Agencia" (`/agencia`)** (posicionamiento + IA decididos; **§IA refinada por PDR-010**
  — el pitch vive en la Home, no en `/agencia`) + **TASK-1358** (to-do, reorientada a rework de la Home):
  el **pillar de categoría** que faltaba — hoy el sitio solo tiene
  spokes de servicio + about-us, sin puerta comercial para la demanda de categoría completa. Resuelve
  la falsa dicotomía *growth-partner vs agencia-digital* con las **dos capas** de [PDR-002](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md):
  **posiciona** como growth partner con software propio + visibilidad total (NO "agencia digital"
  commodity, doctrina `09:53`) pero **captura** la demanda de categoría en la capa SEO — Semrush CL
  "agencia de marketing digital" 720 / "agencia de marketing" 1.000 / "partner de crecimiento" ~0 (0
  búsquedas = gran promesa, pésimo slug). Slug `/agencia` con head-term en `<title>`/H1 + remate reframe
  *no-es-X-es-Y*; full-service como **un solo motor** incl. **performance marketing** (capability listada,
  no cabecera: cluster performance ≤480) + creatividad/contenido + web/CRM/infra + data; audiencia
  mid-market/enterprise; casos citables (Sky/Bresler/Berel/SSilva, NUNCA GEA); reparte hacia las spokes
  `/servicios/*` y enlaza el about-us (E-E-A-T) + el grader. Distinto de `/servicios` (hub navegacional)
  y del about-us (identidad). es-LATAM neutro `hreflang`-ready (pan-hispano, LATAM-first→EEUU→mundo).
  Ver [PDR-008](decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md) +
  `docs/tasks/to-do/TASK-1358-landing-agencia.md`. Pendiente: art direction del hero + contrato de Motion +
  decisión del mecanismo del CTA "Agenda una reunión" (growth-form gobernado vs HubSpot Meetings) antes de `UI ready: yes`.

- **PDR-009 + TASK-1366 — mecanismo transversal "Agenda una reunión"** (decisión de validación):
  antes de reemplazar el iframe oficial de HubSpot Meetings, Greenhouse debe probar si una UI propia puede
  reservar por HubSpot Scheduler API conservando side effects nativos: calendario Office 365, Teams, invitación
  al invitado, contacto/timeline/meeting en HubSpot y atribución medible sin PII en `dataLayer`. La implementación
  live de `/servicios/redes-sociales/` queda como fallback seguro mientras se ejecuta el spike. Ver
  [PDR-009](decisions/PDR-009-hubspot-scheduler-native-booking.md) +
  `docs/tasks/to-do/TASK-1366-hubspot-scheduler-booking-equivalence.md`.

## Next

- **Guía pillar "community manager" en Think** (PDR-005 §Consecuencias): captura el
  término de alto volumen e intención job/how-to (Semrush CL 4.400/mes) como autoridad
  top-of-funnel que enlaza a la spoke `/servicios/redes-sociales`. TASK aparte bajo el
  eje Think/EPIC-020; no bloquea el diseño de la landing.
- **Crawl vivo** de `efeoncepro.com` (route-ownership matrix): confirmar si
  `/servicios` ya existe con contenido propio y el equity de `/aeo-2` para el 301.
  Los slugs ya están cerrados con datos (Semrush CL); el crawl es confirmación, no
  bloqueo del diseño.
- Extender el **nodo grader** del eje AEO al eje SEO (EPIC-022 "Search Visibility
  360") para que la spoke SEO tenga un diagnóstico de producto real detrás.
- Bajar PDR-001/PDR-002 a **TASK** bajo EPIC-019 (landing control plane) /
  EPIC-022 (SEO): guía pillar en Think + spoke `/servicios/posicionamiento-seo` +
  301 de `/aeo-2` → `/servicios/aeo`, con copy y build.

## Later

- Cutover del sitio público a **Astro** (tratar como migración: baseline,
  redirects 1:1, paridad de contenido, preservar entidad/schema). Ver ADR Astro
  runtime strategy.
- **Internacionalización del servicio (LATAM-first → EEUU → mundo).** El servicio
  se presta a toda LATAM de inicio (copy es-LATAM neutro; "agencia seo" = head term
  pan-LATAM ~8.000+/mes, Semrush), luego EEUU (spoke `en-US`: "seo agency"/"seo
  services" 60.500/mes, localización real + `hreflang`), luego mundo (Brasil pt-BR
  aparte). Preparar `hreflang` desde las primeras spokes para no re-migrar. Ver
  PDR-002 §Alcance regional.

## Cómo se mantiene

- Una decisión de producto nueva → PDR en `decisions/` + fila en el horizonte que
  corresponda acá.
- Una decisión que obliga arquitectura → ADR en `architecture/DECISIONS_INDEX.md`,
  citado desde el PDR (no duplicar).
- Cuando un horizonte se ejecuta → mover la línea a "baseline" y enlazar el
  EPIC/TASK que lo cerró.
