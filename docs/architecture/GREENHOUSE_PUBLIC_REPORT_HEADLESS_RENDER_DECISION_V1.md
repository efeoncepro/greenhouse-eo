# Greenhouse Public AI Visibility Report — Headless Render Decision V1

> **Tipo:** ADR / Decision record · **Estado:** Accepted (2026-06-28) · **Dominio:** growth · ai-visibility · EPIC-020
> **Repos:** `efeoncepro/greenhouse-eo` (data owner) · `efeoncepro/efeonce-web` (render) · `efeoncepro/efeonce-public-site-runtime` (WordPress, queda fuera de este flujo)

## Decisión

El **informe en pantalla** del AI Visibility Grader (lead magnet, EPIC-020) **se renderiza nativamente en `efeonce-web` (Astro + Tailwind)**, consumiendo a **Greenhouse como headless**: Greenhouse expone el **modelo render-ready público** (`ReportArtifactModel`, variant `publicWeb`) por API token-gated, y `efeonce-web` lo pinta con su propio stack y marca pública.

- **NO iframe.** **NO** se reconstruye el scoring/derivación en Astro. **NO** se trae MUI/AXIS al sitio público.
- El **formulario + landing** del lead magnet viven en `efeonce-web`; postean al intake gobernado de Greenhouse.
- El **PDF + email** (TASK-1273/1250) y el **portal cliente** (variant `clientPortal`) siguen en Greenhouse/React sin cambio.

## Contexto

El formulario del lead magnet vive en el sitio público (hoy WordPress; estratégicamente `efeonce-web` en Astro, que ya consume WordPress headless y deploya en Vercel). El resultado debe abrir el **informe en pantalla** (no el PDF) en una superficie **medible con Google Tag Manager**, con marca pública, sin login.

Greenhouse es un app Next.js con login para clientes (`(dashboard)`), pero **ya sirve superficies públicas sin sesión y token-gated** (`src/app/public/quote/[…]/[token]` — cotizador). El informe público ya existe como contrato de datos: `GET /api/public/growth/ai-visibility/report/[token]` devuelve `{ report: PublicGraderReport, asOf, expiresAt }` (JSON, snapshot congelado, no-leak, 256-bit token = auth).

## Alternativas rechazadas

| Alternativa | Por qué NO |
|---|---|
| **iframe del informe Greenhouse en el sitio público** | GTM/medición rota: iframe cross-origin tiene dataLayer separado, eventos atrapados, atribución de conversión inservible. Razón decisiva del operador. |
| **Reconstruir el informe desde cero en Astro** | Duplica el diseño + drift; el informe es "diseño", no "datos" — no se re-deriva de un JSON simple como un form. |
| **Web component envolviendo el React/MUI** | Arrastra MUI+emotion al sitio Astro; shadow DOM atrapa eventos de GTM (mismo problema que el iframe) o filtra estilos sin shadow. Stack equivocado para marketing. |
| **Paquete React compartido (MUI) importado como isla Astro** | Mete MUI/AXIS en un sitio Tailwind de marketing — pesado, complejo, stack equivocado. Reservado solo si un día se exige paridad visual 1:1 con el portal (no es el caso: el informe público debe verse como el sitio público). |

## El contrato headless (lo que ambos repos acuerdan)

**Greenhouse = dueño del dato/modelo. `efeonce-web` = render tonto (presentación).** La lógica de scoring/derivación (niveles, severidad, gaps, recomendaciones) vive SOLO en Greenhouse.

### Endpoints (Greenhouse, públicos, sin sesión)

| Paso | Endpoint | Hoy | Acción |
|---|---|---|---|
| Intake | `POST /api/public/growth/ai-visibility/run` | ✅ existe | reusar |
| Poll status | `GET /api/public/growth/ai-visibility/run/[handle]` | ✅ existe (`queued/running/ready/in_review/unavailable`; `ready`→`reportToken`) | reusar |
| Informe | `GET /api/public/growth/ai-visibility/report/[token]` | ✅ existe (devuelve `PublicGraderReport`) | **extender:** exponer el **`ReportArtifactModel` render-ready** (variant `publicWeb`) como contrato, no el DTO crudo |

### Por qué exponer `ReportArtifactModel` y no `PublicGraderReport` crudo

`modelFromPublicReport(publicReport, 'publicWeb')` ya construye el modelo render-ready (niveles, severidad, ejes, gaps, recomendaciones) en Greenhouse. Si el endpoint entrega **ese modelo**, `efeonce-web` solo mapea modelo→componentes Tailwind, **sin re-implementar la derivación** (que es justo lo que causaría drift). El builder queda como SSOT único.

- **Versionado:** el payload lleva `modelVersion` (semver del contrato) para que los dos repos evolucionen seguro. Cambios additive no rompen; breaking changes suben major + el render lo maneja.
- **No-leak por construcción:** el endpoint solo serializa el modelo `publicWeb` (nunca `engineSnapshot`, raw provider text ni hallazgos internos). `efeonce-web` **no puede filtrar lo que nunca recibe** — la frontera de no-filtración se mueve al servidor (más fuerte que confiar en el render). Tests no-leak existentes (`report-artifact-no-leak.test`) cubren el modelo.
- **Auth:** el `reportToken` (256 bits, no enumerable) ES la autenticación. Sin sesión. Expirado/inexistente → 404 indistinto.

### Transporte: fetch server-side (sin CORS)

`efeonce-web` es Astro SSR en Vercel → **fetchea el modelo server-side** (en su page/endpoint Astro), no desde el browser. Beneficios: sin CORS, el `reportToken` no se expone al cliente, y el HTML llega listo (mejor LCP + GTM ve contenido real). El intake POST del form también vía un endpoint Astro server-side (proxy) → no se expone la API pública a CORS abierto.

## División de responsabilidades

| | Greenhouse (`greenhouse-eo`) | efeonce-web (Astro) |
|---|---|---|
| Motor (run/scoring/snapshot/token) | ✅ dueño | — |
| `ReportArtifactModel` (builder + versionado + no-leak) | ✅ SSOT | consume |
| Render del informe (HTML/CSS/animación) | — | ✅ dueño (Tailwind + marca pública + React islands/framer-motion) |
| Form + landing | contrato intake | ✅ render + GTM |
| PDF + email + portal cliente | ✅ sin cambio | — |
| Medición (GTM/dataLayer/conversión) | — | ✅ DOM nativo |

## 4 pilares

- **Safety:** token-gated; el modelo público es lo único que cruza (no-leak server-side); `efeonce-web` nunca recibe evidencia cruda. Rate-limit por IP ya existe.
- **Robustness:** run async + poll + degradación honesta (`in_review`/`unavailable` sin token) ya implementados; el modelo versionado evita rupturas silenciosas.
- **Resilience:** snapshot inmutable + token reader; `efeonce-web` degrada a estado "preparando/enlace expiró" según status; observabilidad del run en Greenhouse.
- **Scalability:** informe = read de snapshot cacheable; `efeonce-web` estático/edge; Greenhouse sirve JSON. El cuello (el run) ya es async.

## Roadmap por slices

**Greenhouse:**
1. Exponer `ReportArtifactModel` (publicWeb) + `modelVersion` en `GET /report/[token]` (o `?format=model` / endpoint `/model` paralelo, manteniendo back-compat del DTO crudo si algún consumer lo usa).
2. Test de contrato: el payload público nunca incluye campos internos (`engineSnapshot`/raw); snapshot del JSON versionado.

**efeonce-web:**
3. Page del informe (Astro SSR, fetch server-side por token) → render del modelo con Tailwind + marca pública + islands para la animación "se arma" (framer-motion).
4. Form del lead magnet + endpoint proxy al intake + pantalla de status/poll ("preparando tu análisis").
5. Wiring GTM/dataLayer (view del informe, scroll, CTA, conversión).

## Hard rules (anti-regresión)

- **NUNCA** renderizar el informe público dentro de un iframe (rompe GTM) ni dentro del grupo `(dashboard)` de Greenhouse (eso pide login).
- **NUNCA** re-implementar la derivación del modelo (niveles/severidad/gaps) en `efeonce-web` — consumir el `ReportArtifactModel` que Greenhouse construye (SSOT único).
- **NUNCA** exponer en el endpoint público campos internos (`engineSnapshot`, raw provider text, hallazgos privados). El contrato es el modelo `publicWeb`.
- **NUNCA** fetchear el reporte client-side con el token expuesto si se puede server-side (Astro SSR) — token server-side, sin CORS abierto.
- **SIEMPRE** versionar el payload (`modelVersion`); breaking change = major + render adaptado en el mismo ciclo.

## Open questions (deliberadamente no decididas)

1. **Forma de exponer el modelo:** extender `GET /report/[token]` para devolver el modelo vs endpoint `/model` paralelo vs `?format=model`. (Recomendado: extender con `model` en el payload + `modelVersion`, back-compat.)
2. **Marca del informe:** ¿usa 100% los tokens de marca pública de `efeonce-web` (midnight/azure/royal), o un blend con AXIS para que "se sienta producto"? Decisión de diseño (product-design), no de arquitectura.
3. **Dominio/URL:** la página del informe vive bajo el dominio de `efeonce-web` (resuelve el tema de dominio sin DNS nuevo) — confirmar ruta (`/informe/[publicId]` u otra).
4. **Landing:** ¿se migra de WordPress a `efeonce-web`, o el form sigue en WP posteando al mismo intake? (No bloquea el contrato.)
