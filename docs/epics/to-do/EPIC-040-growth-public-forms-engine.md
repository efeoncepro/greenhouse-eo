# EPIC-040 — Growth Public Forms Engine

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Motor en producción sirviendo formularios reales (AEO, careers, ebooks) con 9 childs complete; 12 abiertas. Epic fundado 2026-08-05 para darle dueño a un motor que llevaba 21 tasks sin registro`
- Rank: `TBD`
- Domain: `growth`
- Owner: `unassigned`
- Branch: `epic/EPIC-040-growth-public-forms-engine`
- GitHub Issue: `none`

> **Por qué nace este epic (2026-08-05):** la reconciliación del registro del programa AEO ([`AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) § Delta 2026-08-05 (b)) encontró que el motor Growth Forms tenía **21 tasks sin epic dueño** — la mayoría con `Epic: none` u `optional` — y que cuatro de ellas habían quedado colgando de EPIC-020 sólo porque el AEO fue su primer consumer. El AEO **usa** el motor; no es su dueño. Este epic corrige el plano.

## Summary

Motor de formularios públicos gobernados de Greenhouse: definición versionada del formulario como **dato** (`form_definition`), renderer portable `<greenhouse-form>` embebible en cualquier host (WordPress, Astro/Think, portal), submit server-authoritative con validación, captcha, gate de email y anti-abuso, y **destination adapters** (HubSpot, ATS, outbox interno) que desacoplan el formulario de a dónde va el lead.

Un formulario nuevo es **configuración, no código**: se autora en el cockpit admin, se publica versionado y se embebe por `form_key` opaco. Greenhouse conserva la verdad transaccional (submissions, PII, consent, idempotencia); el host sólo pinta.

## Why This Epic Exists

El motor existe, está en producción y tiene arquitectura + ADR propios — pero **nunca tuvo epic**. La consecuencia práctica es la que se documentó al reconciliar el AEO:

- **21 tasks sin dueño.** Nueve `complete`, doce abiertas, casi todas con `Epic: none` u `optional`. Nadie podía responder "¿cuánto falta del motor de formularios?" porque no había denominador.
- **Trabajo de motor contabilizado como AEO.** `TASK-1335` (CORS/allowlist) y `TASK-1359` (funnel → GA4) figuraban como childs de EPIC-020: inflaban el alcance del AEO y escondían el del motor. El primer consumer se volvió dueño por accidente.
- **Consumers dispersos sin contrato de programa.** El motor ya sirve a **cuatro programas** (AEO/EPIC-020, careers/EPIC-011, ebooks y landings/EPIC-019, embed runtime/EPIC-035). Sin epic no hay dónde declarar la frontera ni evaluar el impacto cruzado de un cambio del motor.
- **Riesgo regulatorio sin owner.** `TASK-1255` (PII Ley 21.719) y `TASK-1254` (verificación de email) son transversales a todos los formularios. Colgadas de ningún epic, dependen de que alguien se acuerde.

## Outcome

- **Un formulario nuevo se lanza sin deploy:** autoría en el cockpit → publicación versionada → embed por `form_key` en cualquier host aprobado, con validación, captcha, consent y destino ya resueltos por el motor.
- **Contrato único de submit** server-authoritative: el cliente nunca decide validación, destino ni idempotencia. La verdad (submission, PII, consent, evidencia) vive en Greenhouse.
- **Frontera explícita con sus consumers y con la distribución:** el motor expone capacidades; los programas de dominio (AEO, careers, ebooks) las consumen sin volverse dueños, y `EPIC-035` distribuye el bundle sin gobernar el motor.
- **Postura PII/consent coherente** (Ley 21.719) aplicada en el motor, no formulario por formulario.
- **Full API Parity:** toda capacidad del cockpit tiene contrato programático gobernado; `TASK-1342` la extiende a tools WebMCP para que un agente opere un formulario como lo opera una persona.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md` — ADR del motor (definición como dato, submit server-authoritative, destination adapters).
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — arquitectura vigente.
- `docs/architecture/growth-public-forms-runtime-contract.md` — contrato de runtime del renderer portable.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` — encuadre del dominio growth.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.
- Código: `src/lib/growth/forms/**` · `src/lib/growth/public-submission/**` · rutas `src/app/api/public/growth/forms/**` y `src/app/api/admin/growth/forms/**`.

## Child Tasks

> **Fundado por reconciliación (2026-08-05).** Las 21 de abajo ya existían y ejecutaban; este epic les da dueño. **9 `complete`, 12 abiertas.** Método: barrido del corpus completo de tasks por señales del motor (`growth forms`, `greenhouse-form`, `form_definition`, `growth.forms`) — ver [`../AEO_PROGRAM_STATUS.md`](../AEO_PROGRAM_STATUS.md) § Delta 2026-08-05 (b).

### Foundation del motor (complete)

- `TASK-1229` ✅ — **Backend/API parity foundation.** Base del motor: definición versionada, contrato de submit, parity API desde el día uno.
- `TASK-1230` ✅ — **HubSpot secure submit adapter.** Primer destination adapter; el formulario deja de conocer a HubSpot.
- `TASK-1231` ✅ — **Portable renderer + host surfaces.** `<greenhouse-form>` embebible; registry de host surfaces aprobadas.
- `TASK-1232` ✅ — **Admin cockpit + primera migración.** Autoría y observabilidad del formulario como dato.
- `TASK-1256` ✅ — **Field masks + submit gate + admin validator config.**
- `TASK-1294` ✅ — **Turnstile `captchaToken` parity en el renderer.**
- `TASK-1297` ✅ — **Identidad estable + contrato de render/copy.** `form_key` UUID opaco e inmutable en `form_definition`.
- `TASK-1318` ✅ — **Captura de nombre completo + destination split.**
- `TASK-1319` ✅ — **Success card: contrato & compiler** (`success_behavior_json`).

### Abiertas — capacidades del motor

- `TASK-1320` 🚧 `in-progress` — **Success card: renderer** (ui-ux). Cierra el loop visible del submit.
- `TASK-1253` 🚧 `in-progress` — **Validator registry + autoridad server-side + `national_id` multi-país.** El cliente no valida; el servidor manda.
- `TASK-1254` 🚧 `in-progress` — **Servicio de verificación de email + gate corporativo.** Transversal: cualquier formulario puede exigir correo corporativo verificado.
- `TASK-1255` 🚧 `in-progress` — **PII hardening (Ley 21.719).** Postura PII tiered del motor. **Riesgo regulatorio: es la task de mayor consecuencia del epic.**
- `TASK-1335` 🚧 `in-progress` — **CORS público + surface allowlist governance.** Elimina el allowlist hardcodeado y alinea el transporte browser con el registry gobernado. *(Movida desde EPIC-020, donde colgaba por ser el AEO su primer consumer.)*
- `TASK-1342` 📋 `to-do` — **WebMCP agent tools.** Cada `<greenhouse-form>` publicado como tools browser-side: parity para agentes.
- `TASK-1359` 📋 `to-do` — **Instrumentación de funnel multi-step** (eventos step-level → GA4). Hoy sólo se emite el submit final. *(Movida desde EPIC-020.)*

### Abiertas — migración y lanzamiento productivo

- `TASK-1258` 🚧 `in-progress` — **Inventario de embeds HubSpot + control plane de migración.** Qué formularios existen hoy y cuáles migran.
- `TASK-1259` 🚧 `in-progress` — **Selector de formulario en WordPress + UX del embed.**
- `TASK-1261` 🚧 `in-progress` — **Primera migración comercial real**: form HubSpot "Lead Gen - Web" → Growth Form gobernado.
- `TASK-1264` 📋 `to-do` — **Lanzamiento productivo**: catálogo + selector + cutover del form.
- `TASK-1295` 📋 `to-do` — **Split del router de docs de arquitectura** del motor.

### Consumers del motor (NO son childs — dueño en otro epic)

> Se listan para trazabilidad de impacto cruzado: un cambio de contrato del motor los toca a todos.

| Consumer | Task(s) | Dueño |
|---|---|---|
| AEO / AI Visibility Grader | `TASK-1251`, `1257`, `1263`, `1296`, `1298`, `1327`, `1336` | EPIC-020 |
| Careers / ATS | `TASK-1372`, `1373` | EPIC-011 |
| Ebooks + landings públicas | `TASK-1375`, `1386` | EPIC-019 |
| Distribución del bundle | `TASK-1517` | EPIC-035 |

## Exit Criteria

- [ ] Las 12 childs abiertas están `complete` o explícitamente diferidas con razón, owner y condición de retiro documentados.
- [ ] `TASK-1255` cerrada: postura PII (Ley 21.719) aplicada **en el motor**, con evidencia de que ningún formulario la resuelve por su cuenta.
- [ ] Un formulario nuevo se lanza end-to-end **sin deploy de Greenhouse**: autoría → publicación versionada → embed → submit → destino, verificado con un caso real.
- [ ] Cutover comercial completo: `TASK-1261` + `TASK-1264` cerradas y el inventario de `TASK-1258` sin embeds HubSpot productivos pendientes de decisión.
- [ ] Full API Parity verificada a nivel capability: toda capacidad del cockpit tiene contrato programático gobernado, y `TASK-1342` expone las tools WebMCP equivalentes.
- [ ] Frontera declarada y respetada: ningún epic consumer (020/011/019/035) contiene tasks de motor, y este epic no contiene tasks de dominio de un consumer.
- [ ] Los 4 consumers verificados contra el contrato vigente del motor tras el último cambio de contrato (no-regresión de impacto cruzado).

## Non-goals

- **No es el runtime de distribución.** Dónde y cómo se sirve el bundle del renderer (`assets.efeoncepro.com`, hosting, promoción del release) es **EPIC-035**. Este epic gobierna el motor, no su frontera pública de entrega.
- **No es el CTA engine ni el scheduler.** `growth.cta` (EPIC-023) y Meetings comparten dominio y patrón portable, pero son motores distintos con su propio contrato.
- **No es dueño de la experiencia de ningún consumer.** El copy, la landing, la promesa comercial y el destino de negocio de un formulario concreto viven en el epic del consumer. Este epic provee la capacidad, no la campaña.
- **No reemplaza HubSpot como CRM.** El motor gobierna la captura y el contrato de destino; HubSpot sigue siendo el sistema comercial destino vía adapter.
- **No migra formularios por decreto.** Qué formulario migra y cuándo es decisión comercial (`TASK-1258`/`1264`), no un barrido técnico.
