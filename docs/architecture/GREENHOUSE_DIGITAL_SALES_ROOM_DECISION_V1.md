# Greenhouse Digital Sales Room (Sala de Ventas) — Decision V1

## Status

`Proposed (direction endorsed, implementation deferred)` — **no runtime changes yet.**

El operador endosó la dirección (2026-07-15) tras comparar con Trumpet; la construcción se
difiere a un EPIC formal futuro. Este documento fija la **forma** para que, cuando llegue el
momento, no se improvise ni se construya un producto paralelo. **NO** autoriza schema, endpoints,
tablas, deploy ni una task de implementación.

## Date

2026-07-15

## Owner

Commercial / Licitaciones + Growth (superficie pública) + Platform (Full API Parity). Consumidor
de: Proposal Studio (aggregate `Proposal`), Artifact Composer, efeonce-think (render headless).

## Scope

- La **Sala de Ventas Digital** (working name; ver Open Questions): un micrositio por deal, servido
  al **comprador** (que **no** es usuario de Greenhouse), que reemplaza el PDF estático de una
  propuesta comercial por una superficie **viva, versionada, trackeable y actualizable**.
- Aplica a cualquier `Proposal` (`origin ∈ {public_tender, private_rfp, direct_sales}`).
- **NO** cubre: la construcción de la propuesta (eso es el Proposal Studio), el portal interno de
  descarga (TASK-1413, ya shipped), ni la venta a clientes de "sus propias salas" (eso depende de
  Creative Studio / ASaaS y es una fase posterior explícita).

## Reversibility

`Two-way but slow`. La sala es una **proyección** sobre `Proposal` — si se descarta, se apaga sin
tocar el aggregate. Pero el **tracking primitive** (event log + viewers) y la **frontera de
exposición pública** (token, audience gate en el render headless) son decisiones que, una vez con
datos reales de compradores, cuestan revertir. Hoy **no existe ninguna tabla** → decidir la forma
ahora cuesta cero.

## Confidence

`High` en la forma (es un clon estructural de decisiones ya aceptadas — ver §"Precedentes"). `Medium`
en el *timing* y en build-vs-buy (ver Open Questions — es la pregunta honesta).

## Context

Hoy, cuando una propuesta de Efeonce sale por la puerta, entra en un **agujero negro**: se sube el
PDF al portal del cliente (o se manda por email) y perdemos toda visibilidad. ¿Lo abrió el comité?
¿Qué lámina miró? ¿Descargó la económica? ¿Sigue vivo el deal o ya está muerto? No sabemos nada —y
en clientes Globe (comités de 6-10 personas, ciclos largos), esa ceguera es justo donde se pierden
los deals por **indecisión**, no por competencia (el hallazgo JOLT: 40-60% de las pérdidas son "no
decision", no "perdimos contra otro").

Trumpet (y la categoría "Digital Sales Room") resuelve esto reemplazando el PDF por un **micrositio
por deal**: contenido interactivo, siempre en su última versión, con analítica de engagement por
comprador. Su tesis —*estático → vivo y medido*— es **exactamente la misma** que Efeonce ya ejecuta
en dos frentes:

1. **La Radiografía AEO** (`think.efeoncepro.com/muestras/<slug>-<token>`) ya es una "muestra viva":
   en vez de decir "optimizamos para IA" en un PDF, abre una pieza interactiva que lo demuestra. Es
   el patrón *modelo-headless-en-Greenhouse / render-tonto-en-Think*, ya probado.
2. **El Proposal Studio** (aggregate `Proposal` + artefactos versionados + descarga gobernada,
   TASK-1392/1412/1413) es **la mitad interna** de una sala: el sistema de récord del deal, con
   artefactos ya versionados y con un **audience gate** que separa lo `client_facing` de lo
   `internal`.

**La observación clave: el backend ya existe.** Una Sala de Ventas es, arquitectónicamente, una
**nueva superficie externa + un primitive de tracking + un primitive de acceso**, montada sobre
primitives que ya tenemos. No es un producto nuevo; es una **proyección** del `Proposal` servida por
el mismo split headless que el informe del Grader.

## Decision

Cuando se construya, la Sala de Ventas será:

> Una **proyección pública, token-gated y trackeable del aggregate `Proposal`**, servida bajo el
> split **modelo-headless-en-Greenhouse / render-tonto-en-efeonce-think** (el mismo de la Radiografía
> y del informe del AI Visibility Grader), que expone **solo** artefactos `client_facing`, registra
> engagement en un **event log append-only de dos niveles** (analítico best-effort + conversiones
> audit-grade), y nace con **contrato gobernado a nivel capability** (Full API Parity → Nexa la crea,
> comparte y lee por construcción). **NUNCA** es fuente de verdad del deal: el deal vive en
> `Proposal`; la sala lo lee.

Seis afirmaciones duras que la decisión fija:

1. **Proyección, no aggregate nuevo.** La sala vive en `greenhouse_commercial.sales_room*` con FK a
   `proposal_id`. Extiende el dominio comercial; **no** crea una identidad 360 paralela ni una
   segunda fuente de verdad del deal. Se puede reconstruir idempotentemente desde `Proposal`.
2. **El render es tonto y vive en Think.** Greenhouse computa el **modelo render-ready** (no-leak,
   solo `client_facing`) y lo expone token-gated; efeonce-think (Astro) lo pinta nativo, embebe la
   Radiografía viva y postea eventos. **NUNCA** MUI/AXIS en el sitio público, **NUNCA** iframe (mata
   la medición GTM — decidido ya en el informe del Grader), **NUNCA** reconstruir lógica en Astro.
3. **El audience gate se reusa, no se reinventa.** El modelo headless de la sala **falla cerrado**
   ante cualquier artefacto `internal` (defense-in-depth: exclusión en el build del modelo + la
   descarga re-valida audiencia como ya hace el endpoint de TASK-1412). Una sala jamás sirve el
   blueprint del squad, los costos ni el piso de negociación.
4. **El tracking es forjable, por lo tanto analítico.** El ingest de eventos viene del navegador del
   comprador en Think = **write público forjable**. Igual que el CTA/Popup engine: los eventos de
   engagement son **best-effort/sampled**; **NUNCA** un evento posteado por un browser decide dinero,
   acceso o estado del deal. Una conversión real ("aceptó la propuesta") es un **command gobernado**,
   no un evento de tracking.
5. **Nace con Full API Parity.** Capabilities `commercial.sales_room.{create,publish,share,expire,
   read,read_analytics}`. Nexa la opera por construcción: *"crea una sala para la propuesta de SKY"*
   (propose→confirm→execute), *"¿quién abrió la sala de SKY?"* (read), *"avísame cuando el comité la
   abra"* (signal reactiva). No se construye nada "Nexa-específico".
6. **Vive en todo el moño (bow-tie), no solo en el cierre.** Una sala por deal se reutiliza en
   onboarding, renovación y expansión (los casos de uso propios de Trumpet). Es la instrumentación
   ASaaS de la venta: convierte el handoff de la propuesta de agujero negro a superficie medida.

## Alternatives rejected

| Alternativa | Por qué NO |
|---|---|
| **Servir la sala desde greenhouse-eo** (`/public/room/[token]`) | Existe el precedente token-gated (`public/quote`), pero el informe del Grader **ya decidió** que la superficie pública viva en Think (Astro): bundle liviano, medición GTM con `dataLayer` propio, marca pública (no AXIS interno). Servirla desde el portal interno repetiría la discusión ya cerrada. |
| **Producto standalone / app nueva** | Paraleliza el aggregate (pecado de proliferación de identidad) y duplica el pipeline de render. La sala es una proyección de `Proposal` + consumer del patrón Radiografía — no un producto. |
| **PDF por email + pixel de tracking** | Los pixels los bloquean los clientes de correo (poco fiable), no dan engagement por sección, y no resuelven el "siempre en su última versión". Mata justo lo que da valor. |
| **La sala como fuente de verdad del deal** | Viola SSOT. El deal es `Proposal`. La sala es proyección de lectura + sus propios eventos. |
| **Comprar Trumpet** (la alternativa aburrida — se nombra explícito) | **Es una opción real y más barata a corto plazo.** Se rechaza para *construir* —no para descartar— por tres razones: (a) ya tenemos el backend (Proposal + Radiografía + Composer), la sala es incremental; (b) al ser el Composer/brand-pack multi-tenant, la sala se vuelve **vendible como ASaaS** (el cliente tiene sus propias salas), un producto, no una herramienta interna; (c) cierra el loop Full API Parity / Nexa. **Pero honesto:** si el único objetivo a corto plazo es "tracking interno de deals el próximo trimestre", Trumpet es más rápido. La justificación de construir aparece cuando esto es **superficie de producto**, no solo utilería interna. Ver Open Questions. |

## Precedentes (el repo YA tiene las 3 piezas — la sala las COMBINA, no las inventa)

El hallazgo que ordena todo el diseño (auditoría 2026-07-15): **una Sala de Ventas es `quote-share`
generalizado de un PDF de cotización suelto a una sala completa de `Proposal`.** El patrón
token-público + tracking + página pública ya está shipped para quotes; la sala lo sube de nivel al
aggregate `Proposal` (que ya trae los artefactos versionados y el audience gate).

1. **`quote-share` — el precedente MÁS fuerte (token + tracking + página pública, ya en producción).**
   - Página pública token-gated: `src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx`
     (`export const dynamic = 'force-dynamic'`; token inválido → error state, cero fuga).
   - **Token HMAC firmado** (no oscuridad): `computeVerificationToken` en
     `src/lib/finance/pdf/qr-verification.ts` (secret `GREENHOUSE_QUOTE_VERIFICATION_SECRET`,
     **fail-closed** si falta el secret); la verificación **recomputa y compara** en
     `load-quote-for-public-view.ts:196-212`.
   - Short-link base62 con **revoke/expiry**: `src/lib/finance/quote-share/short-link.ts`
     (`generateShortCode` 7-char, `createQuoteShortLink` con retry en colisión, `resolveQuoteShortLink`
     con estados active/revoked/expired, `revokeQuoteShortLink` soft-revoke) + tabla `quote_short_links`
     (`migrations/20260425010847591_task-631-quote-short-links.sql`).
   - **Endpoint de acción pública donde el token ES la auth**:
     `src/app/api/public/quote/.../[token]/accept/route.ts` (re-valida el token, idempotente).
   - **Tracking de engagement append-only**: tabla `quote_share_views`
     (`migrations/20260425013645028_task-631-fase2-acceptance-tracking.sql`) + `view-tracker.ts`
     (`recordShareView` **best-effort** — no bloquea el render, detecta first-view, Slack solo la 1ª;
     `getShareViewAggregate` cuenta views/uniques). **Este es el tracking primitive de la sala,
     verbatim, extendido a eventos por-sección/por-artefacto.**
2. **Informe headless del AI Visibility Grader** (`GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`)
   — el split de render: modelo render-ready en Greenhouse (SSOT del builder), render nativo Astro en
   `think.efeoncepro.com`, no-leak server-side, **sin iframe por GTM**. Para la sala, el "modelo en
   Greenhouse" ya existe: **`buildProposalRenderProjection`** (`src/lib/commercial/tenders/proposals/
   render-projection.ts:90`) + el allowlist fail-closed **`assertEvidenceAllowedForAudience`** (`:223`):
   un artefacto `client_facing` con **una sola** evidencia `internal` **rechaza el artefacto entero**.
   La sala se sirve **solo** desde esa proyección.
3. **Proposal Studio + audience gate** (`GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`,
   TASK-1392/1412) — el aggregate `Proposal`, los artefactos versionados y el **audience gate**
   (`proposal_assets.audience ∈ {internal, client_facing}`, default seguro por kind en
   `assets.ts:31-39`) que la sala reusa como frontera dura. La sala **lee** este aggregate; no lo
   reimplementa. El outbox ya está cableado en cada command (`store.ts`, `assets.ts`) → los eventos
   `salesroom.*` viajan por el mismo bus reactivo.

**La brecha real que la decisión abre** (identificada en la auditoría): el gate actual
`canAccessProposalDocument` (`src/lib/commercial/tenders/proposals/access.ts:16`) **niega a los
tenants `client`** — correcto para el portal interno, pero un comprador **no es un tenant**. El acceso
del comprador **no puede** pasar por ese predicado de sesión: necesita un **carril de autorización por
token** (como el `/accept` público de quote), que respete el audience gate `internal → nunca cruza`.
Ese carril nuevo es el corazón del delta de implementación.

Consumidores canónicos que heredan el contrato (Full API Parity #16): UI portal, Nexa, MCP/ecosystem,
efeonce-think (render), async runtime (signals de engagement), CLI/runbooks.

## Consequences

**Habilita:** visibilidad de engagement por comprador (quién abrió, cuánto tiempo por sección, qué
descargó, intent score); "siempre en su última versión" (la sala referencia el artefacto vigente del
`Proposal`, no una copia); alcance a más stakeholders del comité (link compartible); la Radiografía
viva embebida como prueba dentro de la sala; y —fase posterior— salas **de marca del cliente**
vendibles como ASaaS.

**Cuesta:** una nueva superficie pública (aumenta la superficie de ataque — mitigado por token +
audience gate + ingest forjable-por-diseño); un primitive de tracking con PII de compradores (emails)
que exige minimización + consentimiento; y un modelo de intent-score que hay que calibrar para que no
mienta (un "abrió 1 vez" no es "hot").

**No cambia:** el `Proposal` sigue siendo SSOT del deal; el Proposal Studio interno (TASK-1413) sigue
igual; el Composer y el artifact-worker no se tocan.

## 4-Pillar Score

### Safety
- **What can go wrong**: un token filtrado expone una propuesta; un browser forja eventos de
  engagement; un artefacto `internal` se cuela a un comprador.
- **Gates**: token unguessable per-room + opcional soft email-gate; **audience gate reusado** (el
  modelo headless excluye `internal` en el build **y** la descarga re-valida — defense-in-depth de 2
  capas, igual que el render-projection contract de TASK-1391 que falla cerrado ante una evidencia
  `internal` en un artefacto `client_facing`); ingest público forjable-por-diseño → analítico, nunca
  decide estado/dinero; capabilities granulares por acción (no un `commercial.admin` catch-all).
- **Blast radius if wrong**: un deal. Un token filtrado expone artefactos **solo `client_facing`** de
  UNA propuesta — nunca costos, margen, blueprint del squad ni otro deal.
- **Verified by**: (a construir) test de no-leak sobre el modelo headless (un `internal` en la sala
  rompe el build), audience gate del endpoint de descarga (ya existe, TASK-1412), rate-limit del
  ingest, reliability signal de exposición.
- **Residual risk**: un comprador con el link puede reenviarlo (fuera de nuestro control — como
  cualquier PDF); se mitiga con expiración de token + revocación, no se elimina.

### Robustness
- **Idempotency**: la sala se **reconstruye** desde `Proposal` (proyección determinista); eventos con
  event-id idempotente.
- **Atomicity**: crear/publicar/expirar = command transaccional con outbox v1 (patrón state machine +
  CHECK + audit).
- **Race protection**: un solo token activo por sala (índice único parcial); state machine en CHECK.
- **Constraint coverage**: FK a `proposal_id`; CHECK de estados; anti-`internal` en las secciones;
  append-only en el event log (anti-UPDATE/DELETE trigger).
- **Verified by**: (a construir) test de rebuild idempotente + test de que una sección `internal` es
  rechazada por constraint, no solo por app.

### Resilience
- **Retry policy**: eventos best-effort (perder un evento analítico ≠ corrupción); el ingest no
  reintenta agresivo.
- **Dead letter**: N/A para analítico; las conversiones audit-grade van por el command gobernado (con
  su propio outbox + dead_letter).
- **Reliability signal**: `commercial.sales_room.ingest_lag` (steady=0) + `..exposure_drift` (una sala
  publicada cuyo modelo incluiría un `internal` = error inmediato).
- **Audit trail**: event log append-only + audit de transiciones de estado de la sala.
- **Recovery**: la sala se re-materializa desde `Proposal`; el runbook es "republicar".
- **Degradation honesty**: si un artefacto referenciado 404ea, la sección muestra "no disponible", no
  un embed roto ni un $0 fingido.

### Scalability
- **Hot path Big-O**: lectura de la sala = O(secciones) (chico y acotado); el **intent-score** es el
  path caliente → **materializado/rolled-up**, nunca recomputado por view.
- **Index coverage**: `sales_room_events` indexado por `(room_id, occurred_at)`; el modelo headless
  cacheado (token-gated → `force-dynamic` por token, como `public/quote`; o ISR si el token no
  personaliza).
- **Async paths**: ingest de eventos async + sampled; agregación de analytics en materializer, no en
  request.
- **Cost at 10x**: sub-lineal (render cacheado + eventos sampleados). El riesgo de costo es el
  volumen de eventos si no se samplea — mitigado por el tier analítico.
- **Pagination**: la lista de salas (interna) paginada; el event log se consume agregado, no crudo.

## Hard rules (para cuando se construya)

- **NUNCA** la sala es fuente de verdad del deal — es proyección de `Proposal` (SSOT).
- **NUNCA** un artefacto `internal` cruza a la sala (audience gate en el build del modelo **y** en la
  descarga; falla cerrado, no se vigila).
- **NUNCA** MUI/AXIS ni iframe en el render público de Think (rompe bundle y medición GTM — decidido
  en el informe del Grader).
- **NUNCA** un evento posteado por el browser del comprador decide estado, dinero o acceso (ingest
  forjable → analítico; las conversiones van por command gobernado).
- **NUNCA** exponer `gs://`/URLs de storage ni el RFP crudo/costos en el modelo headless (mismo
  no-leak que la proyección de render de TASK-1391).
- **SIEMPRE** capability granular por acción + grant en `runtime.ts` mismo PR (no `commercial.admin`).
- **SIEMPRE** nace bilingüe (es-CL + en-US) por construcción — el comprador puede ser Globe.
- **SIEMPRE** minimizar PII del comprador (email con consentimiento; guardar engagement, no perfilar).

## Open Questions (deliberadamente no decididas)

1. **Build vs buy Trumpet** — la pregunta honesta. Esta decisión argumenta *construir* (por el backend
   que ya tenemos + el ángulo ASaaS + el loop Nexa), pero si el objetivo a corto plazo fuera solo
   tracking interno, Trumpet es más rápido. **Se difiere a un checkpoint con volumen real de deals.**
2. **Naming.** "Sala de Ventas" / "Deal Room" / "Pod" / otro — decisión de copy/marca
   (`greenhouse-ux-writing` + `copywriting`). La URL propuesta es `think.efeoncepro.com/sala/<slug>-<token>`
   espejando `/muestras/`.
3. **Soft email-gate vs viewer anónimo** — capturar el email del comprador antes de mostrar (más
   señal, más fricción) vs cookie de viewer anónima. Trade-off de conversión.
4. **La Radiografía embebida** — ¿ruta nativa de Think compuesta, o embed? (iframe ya rechazado por
   GTM; probablemente composición nativa Astro).
5. **Granularidad del tier analítico** — qué es audit-grade vs sampled.
6. **Cuándo / qué EPIC.** Depende de la madurez del Proposal Studio (el aggregate sigue parcialmente
   `Proposed`) y de Creative Studio (para las salas de marca del cliente en la fase ASaaS).
7. **Salas de marca del cliente (ASaaS)** — la fase que convierte esto de herramienta interna a
   producto vendible; depende del brand-pack multi-tenant del Composer y de la gobernanza de Creative
   Studio (EPIC-028). Fase explícitamente posterior.

## Roadmap por fases (indicativo — no autoriza tasks)

- **F0 — Sala interna sobre un deal real.** Proyección + token + render en Think + audience gate, sin
  tracking. Prueba el split con la propuesta de SKY (o la siguiente). Vertical delgado.
- **F1 — Tracking analítico.** Event log de dos niveles + ingest forjable-por-diseño + intent score +
  reader de analytics + capability `read_analytics`.
- **F2 — Full API Parity + Nexa.** Las 6 capabilities + acciones gobernadas de Nexa + signal reactiva
  "el comité abrió la sala".
- **F3 — Bow-tie.** Reutilizar la sala en onboarding/renovación/expansión (no solo cierre).
- **F4 — ASaaS.** Salas de marca del cliente (depende de Creative Studio / brand-pack multi-tenant).

Cada fase, cuando se autorice, nace vía `greenhouse-task-planner` con su `## Modular Placement
Contract` (el control plane en `src/lib/commercial/sales-room/**` server-only; el render en Think, ya
desacoplado; sin `apps/*`/`packages/*` nuevos en greenhouse-eo).

## Dependencies & Impact

- **Depende de**: `Proposal` aggregate (TASK-1392, parcialmente `Proposed`) + audience gate +
  artifact-versions reader (TASK-1412) + el rail Astro de efeonce-think + el patrón headless del
  informe del Grader.
- **Impacta a**: nada en runtime hoy (deferred). A futuro, extiende el dominio comercial y agrega una
  superficie pública en Think.
- **Boundary**: Commercial (dueño de la proyección + commands) · Growth/efeonce-think (render público)
  · Platform (Full API Parity). No cruza a Finance ni a HR.
