# EPIC-020 — AEO Program · Master UI Flow Contract

> **Qué es:** el contrato de flujo **cross-surface** de TODO el programa AEO (AI Engine Optimization). Conecta cada UI que existe o se va a crear — pública, email/PDF, portal cliente, operador, Account 360 — en un solo mapa de navegación, estados y commands. Cada task UI del epic referencia este doc en su Delta.
> **Esto NO reemplaza** los flow/wireframe por-task (TASK-####-…); es la **tela conectiva** que garantiza que todas las superficies son nodos de un mismo sistema, no pantallas sueltas.

## Meta

- Status: `draft`
- Epic: `EPIC-020` (AI Visibility / AEO Grader)
- Skills de product design aplicadas: `info-architecture` (líder, IA + flujo cross-surface), `state-design` (estados + honest degradation + Locked/upsell), `greenhouse-ux-writing` (copy es-CL, tono cliente/comercial), `modern-ui` (wayfinding, active state, restraint), `dataviz-design` (foco competitivo / charts del report)
- Tasks UI conectadas: 1241, 1245, 1247, 1248, 1250, 1252, 1257, 1273, 1275, 1276, 1277, 1278, 1279
- Flow files por-task: `TASK-1248-…-flow.md`, `TASK-1276-aeo-operator-view-flow.md` (+ wireframes 1248/1250/1252/1276/1278)

---

## 1. La espina dorsal: un motor, un modelo, cuatro renders

Todo el programa se apoya en **una sola fuente**: el motor del grader produce un run → del run se deriva el **`ReportArtifactModel`** (TASK-1252, SSOT) → ese modelo se renderiza en **cuatro formas**, cada una con su **variant de disclosure**:

| Render form | Componente | Variant disclosure | Dónde aparece | Task |
|---|---|---|---|---|
| **Web (interactivo)** | `report-artifact/web` | `publicWeb` / `clientPortal` / `adminPreview` | público, portal cliente, operador, admin | 1252 |
| **Print (HTML estático)** | `report-artifact/print` | `attachment` | export/print | 1252 |
| **PDF (vectorial A4)** | `report-artifact/pdf` (`renderAiVisibilityReportPdf`) | `attachment` | adjunto email, descarga | 1273 |
| **Email** | `EmailLayout brand='efeonce'` | resumen + `attachment` PDF | inbox del lead/cliente/prospecto | 1250 |

**Regla de oro (modern-ui · restraint):** ninguna superficie inventa su propio layout de reporte; toda lectura del diagnóstico es un render del MISMO modelo. La diferencia entre superficies es **disclosure** (qué se muestra) + **chrome** (dónde vive), nunca el contenido base.

**Approved Report Artifact v1 (TASK-1252):** el mockup `/growth/ai-visibility/report-artifact/mockup` queda como contrato visual/narrativo aprobado, con baseline GVC `surfaceId=growth.ai-visibility.report-artifact` / `baselineName=ai-visibility-report-artifact-approved-v1`.

**Disclosure matrix (qué ve cada quién):**
- Público / prospecto / cliente → `providerPresence` / presencia por motor (logos + conteos agregados), score, dimensiones, brecha, plan, tendencia, share-of-voice (**público-safe**).
- Internal-only (NUNCA al cliente/externo): `providerFindings` (narrativa cruda por motor), `accuracyFindings`, prompts, raw provider text, citation URLs crudas, IDs internos, razón de `review_required` y costo.

---

## 2. Actores y resolución de superficie por entitlement

La superficie que ve una persona **se deriva de su tier de entitlement** (TASK-1277), no de su rol:

| Actor | Contexto | Tier / puerta | Superficie resultante |
|---|---|---|---|
| **Prospecto anónimo** | sitio público | puerta pública (lead magnet) | Lead Magnet Page → report público + email |
| **Lead** (dejó email) | post-intake | puerta pública | report + email + handoff HubSpot |
| **Cliente contratado** (Grupo Berel) | portal | `module_assignment=active` | `/aeo` workbench completo + Plan AEO + re-grade |
| **Cliente existente sin AEO** | portal | `trial` (1–3/mes) o sin entitlement | teaser/Locked → trial run → upsell |
| **Operador / AM** (Growth) | interno | capability `…run.operator` (ilimitado) | cockpit `/growth/aeo` + detalle + run + enviar+oportunidad |
| **Admin reviewer** | interno | capability review | Admin Review UI (gate pre-publicación) |

**Máquina de estado maestra (state-design):** `tier → surface`. La MISMA ruta `/aeo` resuelve a workbench (contratado), teaser (sin trial), o trial-con-cupo (trial) según el entitlement — nunca se decide en cliente; siempre server-side (TASK-1277).

---

## 3. Inventario de superficies (todos los nodos)

| # | Superficie | Ruta / canal | Actor | Estado | Task |
|---|---|---|---|---|---|
| S1 | **Lead Magnet Page** + intake | público (sitio) | prospecto | a crear | 1241 |
| S2 | **Public Run Status + Report** | `/api/public/.../run/[handle]` + report `[token]` | prospecto/lead | hecho (API) | 1245 |
| S3 | **Email del informe** (+PDF) | inbox | lead/cliente/prospecto | hecho | 1250/1273 |
| S4 | **HubSpot handoff** | CRM (lead/deal) | comercial | hecho | 1242 |
| S5 | **Client `/aeo` workbench** | `/aeo` (portal) | cliente contratado | hecho | 1248 |
| S6 | **Client tiering + PLG trial** | `/aeo` (banner+CTA+upsell+locked) | cliente trial/sin AEO | a crear | 1278 |
| S7 | **Plan AEO status** (en workbench) | `/aeo` detail | cliente (read) / operador (write) | a crear | 1275/1276 |
| S8 | **Operator cockpit** | `/growth/aeo` | operador | a crear | 1276 |
| S9 | **Operator per-subject detail** | `/growth/aeo/[organizationId]` | operador | a crear | 1276 |
| S10 | **Subject picker + run operador** | en S8/S9 | operador | a crear | 1276+1277 |
| S11 | **Enviar informe + crear Lead** (HubSpot `leads`, no Deal) | confirm en S9 (consent gate) | operador | a crear | 1276+1279 |
| S12 | **Account 360 facet "AEO"** | Organization Workspace | operador | a crear | 1276 |
| S13 | **Admin Review UI** (gate pre-publicación) | `/api/admin/.../reviews` UI | admin reviewer | a crear | 1247 |
| S14 | **Report artifact (render compartido)** | web/print/pdf | todas | hecho | 1252/1273 |

---

## 4. Las journeys cross-surface (el detalle)

### Journey A — Lead magnet público (Motor 2: new business / top funnel)

```text
S1 Lead Magnet Page → intake (nombre+apellido [1257] + email corporativo [corp-gate 1263])
  → POST run público (captcha + abuse-guard: per-email/IP + budget diario global)
  → S2 Run Status ("tu revisión se está preparando", polling honesto)
  → [gate interno opcional: S13 Admin Review si review_required — el prospecto NUNCA ve la razón]
  → S2 Report público (web, variant publicWeb, público-safe)
  → S3 Email con resumen + PDF adjunto (marca Efeonce)
  → S4 HubSpot lead (pipeline New Business)
```
- **Estados (state-design):** preparing (neutral, sin razón interna) · ready · partial (honesto "sin histórico aún") · rejected→nunca expuesto · rate_limited/cost_blocked (público).
- **Consent/PII:** email solo en `grader_leads` con consent; nunca viaja al motor.

### Journey B — Cliente contratado (Berel) (servicio recurrente)

```text
Login portal → nav módulo AEO (gateado por module_assignment=active, TASK-1277)
  → S5 /aeo workbench (masterDetail: navigator Dimensiones+Plan AEO · detail canvas rico)
  → S7 Plan AEO con estado por foco (read del status, TASK-1275)
  → re-grade recurrente (TASK-1270, cadencia) materializa nuevos runs → trend
```
- **Wayfinding:** breadcrumb "Inicio / AEO"; título "AEO — Snapshot de visibilidad"; active state del foco seleccionado.

### Journey C — Cliente existente sin AEO (Motor 1: PLG cross-sell)

```text
Login portal → entra a /aeo
  ├─ sin entitlement → S6 teaser/Locked GRATIS ("Descubrí cómo te ve la IA → Hablá con tu equipo")  [no corre motor]
  └─ con trial → S6 banner "Te quedan N de 3 este mes" → CTA "Generar revisión"
        → requestGraderRunForOrganization (chokepoint, consume allowance) → preparing → S5 workbench
        → al agotar cupo → S6 upsell "Activá AEO recurrente"
```
- **Costo:** el teaser cuesta $0; el run consume cupo (cap mensual + tope global). PLG sin freepass.

### Journey D — Operador cross-sell / prospección (Motor 1+2)

```text
S8 cockpit /growth/aeo (lista clientes+prospectos con score+último run)
  → S10 subject picker (cliente contratado / sin AEO / prospecto HubSpot org-sincronizado)
  → S10 "Correr AEO" (requestGraderRunAsOperator, ilimitado, costo→sales) → preparing → S9
  → S9 detalle con FOCO COMPETITIVO (marca vs competidores / share-of-voice = gancho)  [dataviz-design]
  → S11 "Enviar informe + crear Lead":
        consent gate → prospecto requiere consentimiento capturado (post-conversación); cliente=relación
        → propose→confirm→execute → sendAeoReportAndCreateLead (TASK-1279)
        → S3 email al contacto + Lead HubSpot (objeto `leads`, tipo expansion cliente / new_business prospecto, asociado a Contact/Company) + aeo_check_result en el objeto asociado
  → estado "enviado · Lead creado" (link al Lead) o degradación honesta (email ok, Lead pendiente). NO crea Deal: la conversión Lead→Deal es posterior
```
- **Entrada alterna:** S12 Account 360 facet "AEO" → deep-link a S9 del cliente.

### Journey E — Operador gestiona el Plan AEO del contratado

```text
S8/S12 → S9 detalle del cliente → S7 control de estado por foco (write setRecommendationStatus, TASK-1275)
  → el cliente lo ve reflejado en S5/S7 (read)
```

### Journey F — Admin review gate (calidad antes de publicar)

```text
Run con review_required → S13 Admin Review UI → approve/publish | reject
  → solo tras approve el report sale a S2/S3 (público) o S5 (cliente)
```

---

## 5. Routing & wayfinding contract (modern-ui · info-architecture)

| Ruta | routeGroup | Superficie | Gate |
|---|---|---|---|
| sitio público (lead magnet) | público | S1/S2 | flag público + captcha + abuse-guard |
| `/aeo`, `/aeo/mockup` | client | S5/S6/S7 | módulo `ai_visibility_v1` (TASK-1277) — NO rol |
| `/growth/aeo` | internal | S8 | capability operador + sección Growth |
| `/growth/aeo/[organizationId]` | internal | S9/S10/S11 | capability operador |
| Account 360 (facet AEO) | internal | S12 → deep-link S9 | capability operador |
| Admin Review UI | internal | S13 | capability review |

- **Breadcrumbs:** cliente = "Inicio / AEO"; operador = "Inicio / Growth / AEO".
- **Active state:** sección Growth activa en nav interno; foco seleccionado en navigator (S5/S9).
- **Deep-links:** S12 (Account 360) y el cockpit (S8) deep-linkean al mismo S9 — un solo detalle por-sujeto, dos entradas (global nav vs contextual nav).
- **NO `/admin`** para el operador (admin = salud de plataforma).

---

## 6. Mapa de commands gobernados (Full API Parity)

Cada acción visible = un command server-side (UI/Nexa/MCP son clientes del mismo primitive):

| Acción UI | Command / reader | Task | Consumers |
|---|---|---|---|
| Correr (cliente self-serve) | `requestGraderRunForOrganization` | 1277 | S6 · Nexa |
| Correr (operador sobre target) | `requestGraderRunAsOperator` | 1277 | S10 · Nexa |
| Leer entitlement/cupo | `resolveAeoEntitlement` | 1277 | S6 · S8 |
| Leer report (cliente) | reader client-scoped (boundary) | 1243 | S5 |
| Leer status del Plan | `readRecommendationStatuses` | 1275 | S5/S7 |
| Escribir status del Plan | `setRecommendationStatus` | 1275 | S7 (operador) · Nexa |
| Enviar + crear Lead (no Deal) | `sendAeoReportAndCreateLead` | 1279 | S11 · Nexa |
| Aprobar/publicar run | review/approve · report/publish | 1247 | S13 |

→ Consecuencia: **Nexa puede operar todo el programa** ("corré AEO de Sky y mandáselo") por construcción.

---

## 7. Consent / PII boundaries (cross-surface)

- Email del lead → solo `grader_leads` con consent; nunca al motor.
- Envío operador a **prospecto** → consent capturado post-conversación + interés legítimo + audit (TASK-1279); **NUNCA cold send**.
- Email a externo → variant `attachment` público-safe (sin narrativa cruda/engine/costo).
- Recipient en audit → hasheado, no crudo.

---

## 8. Motion & continuidad (modern-ui · "armado del dato")

- El report "se arma" al montar (números cuentan, charts se dibujan) — entrada del contenido, reducida-motion safe (reusa el motion del workbench 1248; ver visión conversacional Nexa).
- Continuidad cross-surface: el MISMO artifact (S14) viaja de web → print → PDF → email; el usuario reconoce el mismo objeto en todos los canales (shared visual language, no re-skin por superficie).
- Sin motion nuevo gratuito en banners/CTAs (S6/S10/S11).

---

## 9. Cobertura GVC (qué scenario prueba qué nodo)

| Scenario | Nodos |
|---|---|
| `growth-ai-visibility-client-report` | S5 (+ S7 read) |
| `growth-aeo-client-tiering` (a crear) | S6 (contratado/trial/exhausted/locked) |
| `growth-aeo-operator` (a crear) | S8/S9/S10/S11 (cockpit→detalle→run→enviar) |
| report-artifact mockup | S14 (web/print) |

---

## 10. Mapa task → nodo (estado)

| Task | Nodo(s) | Estado |
|---|---|---|
| 1241 | S1 Lead Magnet Page | to-do |
| 1245 | S2 run status + report público | complete |
| 1247 | S13 Admin Review UI | to-do |
| 1248 | S5 client workbench | complete |
| 1250 | S3 email | complete |
| 1252 | S14 artifact (web/print) | complete |
| 1257 | S1 intake (nombre+apellido) | complete |
| 1273 | S14 PDF | complete |
| 1275 | S7 Plan AEO status (data) | to-do |
| 1276 | S8/S9/S10/S11/S12 operador | to-do |
| 1277 | resolución de superficie por tier (gate) | to-do |
| 1278 | S6 tiering + PLG | to-do |
| 1279 | S11 enviar + crear Lead (command) | to-do |

---

## Acceptance Checklist (del programa)

- [ ] Toda UI nueva del epic referencia este doc (Delta en su task).
- [ ] Ninguna superficie inventa layout de reporte: render del `ReportArtifactModel` (S14).
- [ ] La superficie por usuario se deriva del entitlement (TASK-1277), nunca del rol ni en cliente.
- [ ] Cada acción visible mapea a un command gobernado (parity; Nexa por construcción).
- [ ] Disclosure público-safe respetada en todo canal externo (público/email/prospecto).
- [ ] Consent + audit en envíos a externos; nunca cold send.
- [ ] Wayfinding: breadcrumbs + active state + deep-links coherentes; operador fuera de `/admin`.
- [ ] GVC desktop+mobile por nodo nuevo (S1,S6,S8-S12,S13).
