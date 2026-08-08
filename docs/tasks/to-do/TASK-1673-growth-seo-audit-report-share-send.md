# TASK-1673 — Growth SEO: compartir y enviar el informe de auditoría

## Delta 2026-08-08 — TASK-1309 cerrada

`TASK-1309` (Auditoría del sitio, `/admin/growth/seo/audit`) pasó a `complete`: suite completa en
10377/0, `pnpm build` de producción verde, `ui:quality` PASS 4.63. Lo que esta task da por existente
de 1309 —`groupAuditIssues`, las fichas es-CL de los checks con su drift test, `readSiteAuditReport`
con `run`/`findings`/`totals`/`previous`— **ya está en `develop` y verificado con datos reales de
Grupo Berel**, no es supuesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `TASK-1672`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Command gobernado para que el informe de auditoría **salga de la plataforma**: enlace compartible
con código corto, caducidad y **revocación**, tracking de apertura, y envío por correo desde la
pantalla del operador — **con enlace por defecto y PDF adjunto como opción declarada**. El
cliente genera y se lleva el documento; el reenvío a su agencia lo hace desde su propio inbox.

## Why This Task Exists

El escenario real: el cliente no ejecuta, **reenvía a una agencia**. Sin una forma de sacar el
documento, el diagnóstico muere en la pantalla y el equipo copia URLs a mano.

Y hay una asimetría que decide el diseño: **el audit tiene contrato de frescura**. La pantalla
dice "último crawl: ayer" y avisa cuando envejece; todo el trabajo de honestidad de TASK-1309
existe para que nadie lea el dato fuera de contexto. Un PDF adjunto **congela eso**: queda en un
inbox ajeno, sin caducidad y sin revocación, y se lee como vigente para siempre. Un enlace puede
declarar su propia edad.

El repo ya tiene los dos patrones y la división es deliberada: **adjunto para registros
inmutables** (cotización firmada, comprobante de pago a contractor), **enlace para diagnósticos
vivos** (el informe AEO se comparte por URL con código corto). La auditoría es del segundo grupo.

Beneficio adicional que responde a la pregunta comercial: el enlace **te dice si lo abrieron**.
Con adjunto no te enteras nunca de si el diagnóstico está vivo o murió en un inbox.

## Goal

- Sacar el informe de la plataforma **sin perder su contrato de frescura**.
- Enlace revocable y caducable, con tracking de apertura.
- Envío por correo del operador, con la consecuencia del adjunto declarada en la UI.
- Cero vectores de abuso nuevos desde nuestro dominio de envío.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `src/lib/finance/quote-share/{short-link,view-tracker}.ts` — el patrón de enlace corto +
  tracking de apertura ya canonizado.
- `src/lib/growth/ai-visibility/{public-report-url.ts,report/short-link.ts}` — cómo el informe
  hermano construye su URL pública larga y corta.
- `src/app/api/finance/quotes/[id]/share/[shortCode]/send-email/route.ts` — el patrón de envío
  con adjunto PDF.
- `src/lib/email/{delivery,rate-limit,types}.ts` — contrato de envío y límites.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- 🔴 **Enviar ≠ ver.** Capability propia para el envío. Quien puede leer el diagnóstico no
  necesariamente puede mandarlo a un tercero desde nuestro dominio.
- 🔴 **El cliente NO envía correos desde nuestro dominio.** Genera, descarga y copia el enlace;
  el reenvío lo hace desde su inbox — que además llega mejor a su agencia y no cruza su filtro de
  spam. Un botón que deje a un cliente disparar correos a direcciones arbitrarias desde nuestro
  remitente pone en riesgo la misma reputación con la que mandamos facturas y liquidaciones.
- 🔴 **El adjunto es irrevocable y la UI lo dice**, junto a la opción y no en un tooltip.
- **NUNCA** un enlace que muera solo antes de que la agencia lo abra: caducidad larga + revocación
  explícita, no expiración agresiva.
- **NUNCA** `Sentry.captureException` directo ni prosa cruda al cliente: `captureWithDomain` +
  `canonicalErrorResponse`.
- Todo envío queda registrado: quién, a quién, con qué modalidad y cuándo.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depende de

- `TASK-1672` — el artefacto. **Bloqueante**: sin documento no hay nada que compartir.
- `TASK-1670` — hallazgos de sitio (vía 1672).

### Blocks / Impacts

- Habilita el uso comercial real del audit: material de SOW que llega a quien ejecuta.

### Files owned

- `src/lib/growth/seo/audit-report/share/**` — token, enlace corto, revocación, tracking
- `src/app/api/admin/growth/seo/audit/report/share/**` — rutas del command
- ruta pública del informe compartido `[definir en Discovery: hub headless vs portal]`
- `src/lib/copy/growth.ts` — copy del panel de compartir y del correo
- migración: tabla/columnas del share token `[confirmar en Discovery]`

## Current Repo State

### Already exists

- `src/lib/shared/short-code.ts` — generación de códigos cortos.
- `quote-share/view-tracker.ts` — tracking de apertura de un documento compartido.
- `public-report-url.ts` — builder de URL larga y corta del informe AEO sobre el hub headless.
- `send-email` de cotizaciones — envío con adjunto PDF construido en el route handler.
- `src/lib/email/rate-limit.ts` + `email_deliveries` con `has_attachments`.

### Gap

- El audit no tiene token, enlace ni envío.
- No hay revocación explícita como concepto reusable (la cotización comparte, pero el ciclo de
  vida del enlace del audit es distinto: caduca por frescura del dato, no por estado comercial).

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/growth/seo/audit-report/share/**` + rutas `api/admin/growth/seo/...`
- Future candidate home: `remain-shared`
- Rationale del candidate home: el ciclo de vida del enlace es del dominio SEO; si un día tres
  dominios comparten artefactos, ahí recién corresponde un primitive de share.
- Boundary: command canónico en `src/lib/**`; las rutas son transporte.
- Server/browser split: server-only (tokens, envío, tracking).
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: tabla de share tokens del audit `[nombre en Discovery]` +
  `email_deliveries` (ya existente).
- Consumidores afectados: `UI` (panel de compartir), `external` (quien abre el enlace).
- Runtime target: `local`, `staging`, `production`.

### Contrato

- Contrato existente a respetar: `sendEmail` de `src/lib/email/delivery.ts`; el patrón de
  short-code; `readSiteAuditReport`.
- Contrato nuevo: command `shareSiteAuditReport` (crear enlace), `revokeSiteAuditReportShare`,
  `sendSiteAuditReportEmail`; ruta pública de lectura del informe compartido.
- Backward compatibility: `compatible` — todo aditivo.
- Full API parity: los tres son commands canónicos en `src/lib/**`; la UI es un cliente. Nexa y
  MCP pueden operarlos por construcción (el envío, vía el loop propose → confirm → execute).

### Datos e invariantes

- Entidades/tablas/views afectadas: share tokens del audit; `email_deliveries`.
- Invariantes que no se pueden romper:
  - **un enlace revocado deja de servir el documento inmediatamente**;
  - el enlace declara la fecha del crawl que sirve — nunca muestra un diagnóstico sin su as-of;
  - un envío siempre deja registro (quién, a quién, modalidad, cuándo);
  - el adjunto, una vez enviado, **no se puede revocar**, y la UI lo dijo antes.
- Tenant/space boundary: el token pertenece a un `audit_run_id` de un `seo_target` de una org;
  la ruta pública sirve **sólo** ese run, sin sesión y sin poder pivotar a otro.
- Idempotency/concurrency: crear un enlace para un run que ya lo tiene devuelve el existente en
  vez de multiplicar tokens.
- Audit/outbox/history: append-only de envíos y de aperturas; revocación como transición, no
  como borrado.

### Migración y rollback

- Migration posture: `additive`
- Default state: `flag OFF`
- Backfill plan: ninguno — no hay enlaces previos.
- Rollback path: flag OFF (deja de ofrecerse compartir) + revocación masiva si hiciera falta.
  Los enlaces ya emitidos se revocan, no se borran.
- External coordination: env var del flag en Vercel; dominio de la ruta pública si va al hub.

### Seguridad y errores

- Auth/access gate: capability propia de envío (≠ `observation.read`); la ruta pública se abre
  con token, sin sesión, y sólo sirve ese run.
- Sensitive data posture: el documento es client-safe por construcción (garantizado por 1672);
  el correo del destinatario es dato personal — se registra, no se expone.
- Error contract: `canonicalErrorResponse` con códigos propios (enlace revocado, enlace vencido,
  cupo de envío excedido) y `actionable` correcto: un enlace revocado NO ofrece reintentar.
- Abuse/rate-limit posture: rate limit por operador y por org; el destinatario queda registrado.
  **El cliente no envía**, lo que elimina el vector más ancho.

### Evidencia runtime

- Crear enlace, abrirlo en incógnito, verificar tracking de apertura.
- Revocar y verificar que deja de servir **de inmediato**.
- Enviar con enlace y con adjunto; verificar `email_deliveries` y el registro de ambos.
- Verificar que un cliente autenticado NO puede disparar el envío.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Enlace compartible con ciclo de vida

- Token + código corto por `audit_run_id`, idempotente.
- Ruta pública que sirve el informe con su as-of visible, sin sesión.
- Revocación explícita con efecto inmediato.

### Slice 2 — Tracking de apertura

- Registro de aperturas reusando el patrón de `quote-share/view-tracker`.
- Visible para el operador: si el cliente lo abrió, y si lo abrió alguien más.

### Slice 3 — Envío por correo (operador)

- Command de envío con **enlace por defecto**; adjunto PDF como opción.
- Plantilla de correo en la capa de copy, es-CL.
- Capability propia + rate limit + registro de destinatario.

### Slice 4 — Verificación runtime + ledger

- Los cuatro caminos ejercitados en vivo; fila del flag en el ledger.

## Out of Scope

- **Que el cliente envíe correos desde nuestro dominio.** Genera, descarga y copia el enlace; el
  reenvío lo hace desde su inbox. Si algún día se habilita, carga rate limit por org, allowlist
  de destinatarios y un plan para el abuso.
- Generar el documento (es `TASK-1672`).
- Un render propio de PDF: se imprime la variante `?print=1`.
- Firma electrónica o acuse de recibo formal.

## Detailed Spec

La decisión de fondo es **enlace por defecto, adjunto como excepción declarada**, y sale de la
división que el repo ya hace: adjunto para registros inmutables (una cotización acordada, un
comprobante), enlace para diagnósticos vivos (el informe AEO).

El audit es un diagnóstico **con contrato de frescura**: le construimos a la pantalla la
capacidad de decir "último crawl: ayer" y de advertir cuando envejece. Un PDF adjunto tira eso:
queda congelado, sin caducidad ni revocación, y se lee como vigente para siempre — con nuestro
nombre en la portada. El enlace puede declarar su propia edad y puede apagarse.

El adjunto igual existe porque hay casos reales donde gana: el correo corporativo de la agencia
bloquea enlaces externos, o el cliente quiere el documento en la carpeta del proyecto. Pero
elegirlo es aceptar una consecuencia, y la UI la pone **junto a la opción**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (enlace + revocación) → Slice 2 (tracking) → Slice 3 (envío) → Slice 4 (verificación).
- El envío (3) **NO** puede shippear antes que la revocación (1): habilitar la salida de un
  documento sin poder apagarlo es exactamente el riesgo que esta task existe para controlar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un enlace revocado sigue sirviendo el documento | seguridad / cliente | medium | Revocación verificada en runtime como criterio de aceptación; sin caché del documento en la ruta pública | verificación del slice 1 |
| Envío usado como vector de spam desde nuestro dominio | reputación de envío | medium | Capability propia, rate limit por operador y org, destinatario registrado; **el cliente no envía** | `email_deliveries` + monitor de deliverability |
| El adjunto se envía sin que nadie entienda que es irrevocable | reputación | medium | La consecuencia va junto a la opción en la UI, no en tooltip | revisión de diseño |
| El enlace caduca antes de que la agencia lo abra | UX / comercial | medium | Caducidad larga + revocación explícita en vez de expiración agresiva | tracking de aperturas fallidas |
| Un token permite pivotar a otro run u otra org | seguridad | low | El token sirve un `audit_run_id` y nada más; test dedicado | test |
| Se acumulan tokens duplicados por run | data quality | low | Creación idempotente | test |

### Feature flags / cutover

- Flag nuevo `[nombrar en Discovery]`, default **OFF**, leído por Vercel (rutas + UI). Fila en
  `FEATURE_FLAG_STATE_LEDGER.md`. Cutover: OFF → ON en staging con un enlace real → producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF + revocar los enlaces emitidos | <10 min | si |
| Slice 2 | revert PR (el tracking es aditivo) | <5 min | si |
| Slice 3 | flag OFF: deja de ofrecerse el envío. Los correos ya enviados **no se recuperan** | <10 min | parcialmente — el correo enviado es irreversible por naturaleza |
| Slice 4 | sin rollback propio: verifica y documenta, additive y sin impacto de runtime | — | no aplica |

### Production verification sequence

1. Crear enlace en staging, abrirlo en incógnito, confirmar que se registra la apertura.
2. Revocar y confirmar que deja de servir de inmediato.
3. Enviar con enlace a una casilla propia; verificar `email_deliveries` y el registro.
4. Enviar con adjunto; verificar el PDF y que quede marcado `has_attachments`.
5. Con identidad cliente, confirmar que el envío **no está disponible**.

### Out-of-band coordination required

- Env var del flag en Vercel.
- Dominio de la ruta pública si se decide servirla desde el hub headless.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: backend-data` y `Backend impact: command`.
- [ ] El enlace se crea de forma **idempotente** por `audit_run_id`.
- [ ] **Revocar apaga el enlace de inmediato**, verificado en runtime.
- [ ] El enlace sirve **sólo** ese run: no permite pivotar a otro run ni a otra org.
- [ ] El documento servido por enlace muestra la **fecha del crawl**.
- [ ] Las aperturas quedan registradas y son visibles para el operador.
- [ ] El envío requiere capability propia, distinta de `growth.seo.observation.read`.
- [ ] Una identidad cliente **no** puede disparar el envío, verificado en runtime.
- [ ] Enlace es el default del envío; el adjunto es opción y su consecuencia está declarada.
- [ ] Rate limit por operador y por org; destinatario registrado en cada envío.
- [ ] Códigos canónicos con `actionable` correcto: enlace revocado o vencido **no** ofrece reintentar.
- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.

## Verification

- `pnpm local:check`
- `pnpm test`
- `pnpm task:lint --task TASK-1673`
- `pnpm docs:closure-check`
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] manual de uso: cómo compartir, cuándo usar adjunto y cómo revocar
- [ ] `FEATURE_FLAG_STATE_LEDGER.md`

## Follow-ups

- Si el uso comercial lo pide, evaluar que el cliente pueda enviar — con rate limit por org,
  allowlist de destinatarios y plan de abuso declarados **antes**, no después.
- Métrica de negocio: qué proporción de informes compartidos se abre, y si abrir se correlaciona
  con que el trabajo se contrate.

## Open Questions

1. **Dónde vive la ruta pública del informe compartido**: ¿hub headless `efeonce-think` (como el
   informe AEO) o el propio portal con token? El hub es coherente con el hermano; el portal evita
   cruzar repos. Propuesta: portal con token, porque el documento consume el reader de Greenhouse
   y llevarlo al hub obligaría a exportar el modelo.
2. **Caducidad por defecto del enlace.** Propuesta: sin expiración automática y con revocación
   explícita — un enlace muerto cuando la agencia por fin lo abre es peor que uno vivo de más.
   Alternativa: caducidad larga (90 días) con aviso.
3. ¿El operador ve las aperturas en la pantalla de auditoría o en un lugar propio? Propuesta: en
   el panel de compartir, junto al enlace que las produjo.
