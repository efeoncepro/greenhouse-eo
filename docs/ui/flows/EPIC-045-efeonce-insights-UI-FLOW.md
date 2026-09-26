# EPIC-045 — Efeonce Insights · Master UI Flow Contract

> **Qué es:** el contrato de flujo **cross-surface** del programa Efeonce Insights: un motor (dominio
> `src/lib/efeonce-insights/`), un modelo congelado por edición, y varias superficies que lo producen, revisan,
> distribuyen y leen. Conecta las tasks UI para que sean nodos de un mismo sistema, no pantallas sueltas.
> **No reemplaza** los wireframe/flow por task.

## Meta

- Status: `draft` (2026-09-15; delta 2026-09-25 por el rediseño premium aprobado)
- Epic: `EPIC-045` (+ integración `EPIC-046` P01/P02/P04/P09)
- Skills de product design aplicadas: `info-architecture` (líder), `state-design`, `greenhouse-ux-writing`,
  `modern-ui`, `dataviz-design`.
- Tasks conectadas: 1845 (motor, hecho), 1846 (render), 1847 (catálogos), 1848 (share/delivery/schedules),
  1849 (portal + email), 1875 (web compartida en Think), 1888 (contrato editorial v2 + portada por cliente,
  sin UI) y 1889 (catálogos premium A4 y deck, sin ruta de portal).
- Flow files por task: `TASK-1849-…-flow.md`, `TASK-1875-…-flow.md`.

## 1. La espina dorsal: un motor, un modelo, tres renders

`createEdition` (TASK-1845) congela **un** snapshot de evidencia y **un** plan editorial por edición. De ese par
salen tres renders con las mismas cifras: `deck_pdf` y `report_pdf` (Composer/Artifact Worker, TASK-1846/1847) y
`web` (proyección `InsightWebModelV1`, TASK-1848 → render en Think, TASK-1875). El portal (TASK-1849) muestra el
mismo plan desde los readers autenticados. Cambiar una cifra = nueva versión, nunca mutación.

**Delta 2026-09-25 — portada sellada y rediseño (planificado, no construido).** El operador aprobó un diseño premium
para todo informe (dirección visual:
`docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`). Para la espina dorsal esto
agrega una decisión más que se congela con la edición: la **portada** (navy o blanca). La resuelve el dominio
(TASK-1888): cambio en el encargo > preferencia del cliente > `auto`, donde `auto` = navy sólo si el cliente tiene logo
apto para fondo oscuro, si no blanca. Queda sellada en la edición, así que re-renderizar da la misma portada y ninguna
superficie la decide. Los PDFs (`report_pdf`, `deck_pdf`) la dibujan con una sola portada y variantes por módulo
(visibilidad `seo`/`aeo` con logos de canal; creativa `ico` sin logos), además de los roles de color de datos
(actual/anterior/oportunidad/ausencia) que TASK-1889 fija; la vista web (`InsightWebModelV1`) respeta los mismos roles.
Hasta el release de TASK-1889, producción sirve los catálogos v1 de TASK-1847.

## 2. Actores y resolución de superficie por autoridad

| Actor | Autoridad | Superficies |
|---|---|---|
| Cliente autenticado | `insights.report.read` + `insights.edition.create` sobre SU org (scope `own`); módulo `insights_v1` | Biblioteca cliente, encargo, detalle con estado redactado, descargas (S1–S3) |
| Colaborador interno autorizado | read/create/review/issue con scope `tenant`, target revalidado | Biblioteca interna, encargo, revisión, emisión, compartir, enviar, programar (S1–S5) |
| Destinatario de enlace | ShareGrant (token) | Sólo S6 (Think) y descargas por proxy; sin biblioteca |
| Agente (MCP) | consentimiento del binding | Catálogo/lectura/creación por API; nunca emite (sin UI) |

## 3. Inventario de superficies (todos los nodos)

| Nodo | Superficie | Dueña | Estado |
|---|---|---|---|
| S1 | Biblioteca Insights en el portal (cliente e interno, misma composición, permisos distintos) | TASK-1849 | diseño |
| S2 | Encargo (builder: módulos, período, comparación, audiencia, salidas) | TASK-1849 | diseño |
| S3 | Detalle de edición: progreso por fase, evidencia (emitida para cliente; siempre para interno), plan, descargas | TASK-1849 | diseño |
| S4 | Revisión y emisión (gate humano), retirada, recuperación por fase | TASK-1849 (UI) sobre commands de 1845 | diseño |
| S5 | Compartir (grants), enviar (delivery intents), programar (schedules) | TASK-1849 (UI) sobre 1848 | diseño |
| S6 | Vista web compartida por token en `think.efeoncepro.com/insights/r/<token>` | TASK-1875 sobre 1848 | diseño |
| S7 | Correo de entrega (resumen útil + deep link autenticado o ShareGrant) | TASK-1849 (presentación) sobre 1848 | diseño |
| S8 | Accesos contextuales desde Inicio/Mis servicios (EPIC-046 P04) | TASK-1854 | diseño |

**Delta 2026-09-25 (planificado) — qué suman S2 y las descargas.**

- **S2 (encargo):** muestra la preferencia de portada del cliente y permite cambiarla sólo para ese encargo
  (`brand.coverTheme`: `auto` | `dark` | `light`, opcional, dentro del mismo `InsightRequestV1`). Si TASK-1849 ofrece
  editar la preferencia del cliente, lo hace con el command `setInsightCoverPreference` y su reader (TASK-1888, Slice
  5); la superficie exacta se decide en su Discovery. En ambos casos es **consumer** del contrato de TASK-1888, sin
  lógica propia: no replica la regla `auto` ni ninguna otra resolución; la portada efectiva es la que el dominio sella
  en la edición.
- **S3 y S6 (descargas):** los PDF traerán la portada navy o blanca sellada por edición y sus variantes por módulo
  (TASK-1889). Ninguna superficie elige ni recalcula la portada al descargar.

## 4. Las journeys cross-surface

### Journey A — Cliente pide y lee su informe
S8/S1 → S2 (encargo con catálogo elegible) → S3 (progreso `in_progress` → `in_review`) → [revisión interna S4] →
S7 (correo con deep link autenticado) → S3 (lectura + descarga). Nunca S6 salvo que el cliente comparta.

### Journey B — Colaborador prepara, emite y comparte
S1 (cuentas a cargo) → S2 → S3 (evidencia completa + historial) → S4 (emitir con outputs validados) → S5
(crear grant) → S7 (correo con ShareGrant) → **S6** (el tercero lee en Think) → S5 (revocar) → S6 (410).

### Journey C — Recuperación
S3 muestra `failed` + fase → S4 recuperar → pipeline reanuda en la fase → S3 `ready_for_review`.

### Journey D — Recurrencia
S5 programar → cada ocurrencia crea edición en `draft/ready_for_review` → Journey A/B según policy.

## 5. Routing & wayfinding contract

Portal: destino canónico Insights en el menú cliente (module-driven) y accesos contextuales (S8); deep links
autenticados conservan edición y período al completar login; retorno sólo a destinos internos. Think: ruta única
por token, sin navegación privada, sin login, `noindex`. El token nunca cruza al portal ni el portal al token.

## 6. Mapa de commands gobernados (Full API Parity)

| Acción UI | Command/reader canónico | Lanes |
|---|---|---|
| Ver catálogo | `readInsightsCatalog` | app · ecosystem · MCP `get_insights_catalog` |
| Crear/revisar encargo | `createInsightEdition` / `reviseInsightEdition` | app · ecosystem (internal) · MCP `create_insight_edition` |
| Ver ediciones / detalle | `readInsightEditions` / `readInsightEdition` | app · ecosystem · MCP |
| Emitir / retirar / recuperar | `issueInsightEdition` / `withdrawInsightEdition` / `recoverInsightEdition` | app (persona autenticada); nunca MCP para emitir |
| Compartir / enviar / programar | TASK-1848 (`createShare`, `requestDelivery`, `createSchedule`, …) | app · ecosystem por definir |
| Leer compartido / descargar | TASK-1848 (`resolveSharedEdition`, `downloadSharedOutput`) | público por token (S6) |
| Cambiar la portada de un encargo *(en producción, TASK-1888)* | `createInsightEdition` con `brand.coverTheme` opcional (sin él, el hash del encargo no cambia) | mismas lanes que crear encargo |
| Ver / fijar la preferencia de portada del cliente *(en producción, TASK-1888)* | `setInsightCoverPreference` + su reader | app · ecosystem · MCP (tool federada en `efeonce-mcp`) |

## 7. Consent / PII boundaries

Cliente ve estado redactado y sólo audiencia `client`; evidencia sólo de emitidas; sin historial interno ni
provenance de IA. Think recibe únicamente `InsightWebModelV1` (sin ids de actor, prompts ni evidencia interna).
Correos con ShareGrant son token-sensitive; los deep links autenticados no llevan bearer.

## 8. Motion & continuidad

Portal: wrappers canónicos del shell (TASK-1849 motion). Think: motion self-contained de lectura (TASK-1875 motion).
Continuidad de identidad: código `EO-INS-…` + versión visibles en S3, S6, S7 y en el PDF.

## 9. Cobertura GVC

S1–S5, S7: escenarios GVC de TASK-1849 (desktop 1440 + 390). S6: `capture.mjs` del hub (TASK-1875). Ambos con
fixtures sintéticos de dos organizaciones; ningún cliente real como tester.

## 10. Mapa task → nodo (estado)

Estado al 2026-09-15 (se conserva como historia; el vigente está en el delta de abajo):

| Task | Nodos | Estado |
|---|---|---|
| TASK-1845 | motor (sin UI) | code complete, rollout pendiente |
| TASK-1846 / 1847 | render PDF (alimenta S3 descargas y S6 descargas) | to-do |
| TASK-1848 | S5 backend, S6 contrato, S7 backend | to-do |
| TASK-1849 | S1–S5, S7 | to-do |
| TASK-1875 | S6 | to-do (bloqueada por 1848) |
| TASK-1854 | S8 | to-do (EPIC-046) |

**Delta 2026-09-25 — estado vigente del mapa** (lifecycle leído de cada task):

| Task | Nodos | Estado |
|---|---|---|
| TASK-1845 | motor (sin UI) | complete (2026-09-16) |
| TASK-1846 | render durable (Job `artifact-worker`) | complete (2026-09-16), en producción |
| TASK-1847 | catálogos v1 `report_pdf` + `deck_pdf` (alimentan S3 y S6 descargas) | complete (2026-09-25), en producción desde 2026-09-24 |
| TASK-1848 | S5 backend, S6 contrato, S7 backend | in-progress; en producción con flags OFF |
| TASK-1888 | contrato de portada y editorial v2 (alimenta S2 y los PDF; sin UI) | complete (2026-09-26), en producción con `INSIGHTS_EDITORIAL_V2_ENABLED` ON |
| TASK-1889 | catálogos premium (los PDF de S3 y S6) | in-progress; ya no bloqueada por TASK-1888 |
| TASK-1849 | S1–S5, S7 (+ portada en S2 como consumer de TASK-1888) | to-do |
| TASK-1875 | S6 (+ mismos roles de color que los PDF) | to-do (desbloqueada por TASK-1848 el 2026-09-18) |
| TASK-1854 | S8 | to-do (EPIC-046; bloqueada por TASK-1852 y TASK-1853) |

## Acceptance Checklist (del programa)

- [ ] Mismo `EO-INS-…` + versión + cifras en S3, S6, S7 y PDF para una edición emitida.
- [ ] Un cliente nunca ve un draft interno ni evidencia de una edición no emitida; un tercero con token nunca ve la biblioteca.
- [ ] Revocar un grant corta S6 en la siguiente lectura; retirar una edición corta S6 y descargas.
- [ ] Emitir sólo desde una persona autenticada con `insights.edition.issue`; nunca desde MCP.
- [ ] (desde 2026-09-25, con TASK-1888/1889) La portada de una edición es la sellada por el dominio: S2 sólo la
  pide o la muestra, re-renderizar la edición da la misma portada y ninguna superficie la recalcula.
