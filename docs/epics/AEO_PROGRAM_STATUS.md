# Programa AEO / AI Visibility — Estado y Qué Sigue

> **Tipo de documento:** Estado de programa + roadmap operativo (SSOT de "dónde estamos / qué sigue")
> **Versión:** 1.0
> **Creado:** 2026-07-16 por Claude (auditoría multi-agente del programa AEO)
> **Última actualización:** 2026-07-16
> **Documentación técnica:** [`../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
> **Epics que agrupa:** EPIC-020, EPIC-021, EPIC-022, EPIC-023, EPIC-024

Este documento existe para no volver a perder visibilidad de un programa que está repartido en **5 epics + tasks sueltas + 2 repos (greenhouse-eo y efeonce-think) + blockers de config multi-runtime**. Si quieres saber "qué sigue ahora", empieza acá. El detalle por epic vive en cada spec; este doc es el mapa.

---

## Veredicto en una línea

**El motor está terminado y en producción. Lo que falta no es el motor: es la cara (que el cliente/prospecto lo vea) y la operación (el cockpit interno para operarlo como herramienta de venta y de servicio recurrente).** Hoy tienes una máquina cara y bien construida sin las puertas por donde el cliente entra ni el tablero desde donde el operador la maneja.

---

## 1. Qué YA está live (no reconstruir)

- **Motor brand-aware en producción.** `EPIC-021` `complete` (2026-06-30, flags ON en prod y staging). Eliminó el falso-0 (caso Sky Airlines = 0): mide cualquier marca por su **categoría canónica + modelo de negocio real**, no solo el ICP de agencias. 7 dimensiones ponderadas, 5 providers (OpenAI / Anthropic / Perplexity / Gemini / Google AI Overview vía DataForSEO), 3 ejes de probes (answer-engine + site-readiness + entity: Knowledge Graph / Wikidata / Reddit).
- **Full API Parity de 3 consumers cerrada a nivel backend.** Un solo `buildGraderReport`; carriles público / cliente / operador-admin, todos gateados.
- **Runs async corriendo en prod** (`ops-worker` + Cloud Scheduler `ops-growth-grader-drain`) + re-grade recurrente.
- **Render del informe por token, live:** `think.efeoncepro.com/brand-visibility/r/<token>` (headless, `noindex`) + email transaccional ya apuntando a esa URL.
- **Landing de servicio `/aeo-2/`** publicada en WordPress → captura comercial a HubSpot.
- **Radiografía AEO** (muestra de venta viva) publicada — caso SKY, en `think.efeoncepro.com/muestras/…`.
- **Entitlement per-ORG** vía `greenhouse_client_portal.module_assignments` (módulo `ai_visibility_v1`, tiers `contracted`/`pilot`/`trial` con allowance mensual). Modelo bien construido.
- **UI cliente `/aeo`** (workbench por tier) construida — pero deep-link, ver §2.

---

## 2. Las tres brechas reales

### A. Que el CLIENTE lo VEA (visibilidad-para-cliente)

| Qué | Estado | Falta |
|---|---|---|
| UI cliente `/aeo` | Construida (TASK-1248 `complete`) | Es **deep-link, no está en el menú** — diferido en el reachability manifest "hasta que exista el monitor recurrente". El cliente no la encuentra navegando. |
| Binding de datos | — | Poblar `grader_profiles.organization_id` para que un cliente real vea su reporte. |
| Run self-serve del cliente (PLG) | Flags `PORTAL_RUN` / `TRIAL` | Verificar/encender (probablemente OFF). Sin ellos no hay botón "correr mi diagnóstico". |
| Tiering + trial PLG | **En mockup**, no runtime | Teaser / Locked / upsell no shippeados como productivos. |
| Monitoreo recurrente + Plan AEO status | Re-grade paused en prod; TASK-1275 sin UI | El cliente contratado no ve avance de su plan mes a mes. |

### B. OPERARLO desde el portal (operabilidad interna) — **gap #1**

- **`TASK-1276` (cockpit operador `/growth/aeo` + facet "AEO" en Account 360) está `to-do`, no construida.** Sin ella el operador no puede, desde el portal: ver runs cross-cliente, correr el motor sobre un prospecto, ver la brecha competitiva, registrar el estado del Plan AEO, ni disparar "enviar informe + abrir oportunidad" con UI.
- Lo único interno que existe es `/admin/growth/ai-visibility`, que es **solo la cola de revisión pre-publicación** (gate humano YMYL), no un cockpit.
- **Su backend ya está completo:** readers scoped (`TASK-1287`), command de cross-sell (`TASK-1279`), status de recomendaciones (`TASK-1275`), `operator-run` — todos `complete`. **TASK-1276 es trabajo UI puro cableando cosas que ya existen**, y sus 3 dependencias están cerradas → desbloqueada.

### C. Herramienta de VENTA (cara pública + loop comercial)

- **No existe una entrada pública self-serve LIVE.** Un prospecto puede *ver* un informe si le mandas un token, pero **no hay puerta pública donde meta su dominio solo y reciba un score**. Las dos candidatas están code-complete sin encender: `/aeo-2/` auto-grader (`TASK-1321`, `in-progress`, el grader no está desplegado ahí) y la landing `think/brand-visibility` (`TASK-1327`, sin deploy). Hoy `/aeo-2/` promete diagnóstico y entrega lead comercial, no score automático → **0 tráfico self-serve real.**
- **Radiografía AEO: un solo caso (SKY) y payload 100% manual.** No hay pipeline Greenhouse→Radiografía; el JSON se escribe a mano en el repo `efeonce-think`. Por diseño no captura leads. Falta un segundo caso real y, si se quiere como activo de captación, una versión genérica indexable.
- **Cero casos citables / un solo cliente.** Solo Grupo Berel está contratado; ningún trial PLG provisionado. Sin volumen no hay proof social.

---

## 3. Blockers de config — encender lo que YA está hecho (días, no meses)

No requieren construir nada; son rollout/config que frenan lo ya construido:

1. 🔴 **Property HubSpot `aeo_check_result` puede no existir en el portal** (verificada ausente el 2026-06-29). Sin ella el upsert de Company da 400 y **el loop cross-sell se rompe en el write.** Fix: correr `scripts/growth/provision-ai-visibility-hubspot-properties.ts` + confirmar objeto `leads` habilitado.
2. 🔴 **Estado de flags AEO contradictorio en el ledger** (`OPERATOR_SEND_ENABLED`, `PORTAL_RUN`, `TRIAL`). Los flags son **multi-runtime** (el write corre en `ops-worker`, no en Vercel). Nadie sabe hoy si el cross-sell está vivo. Fix: reconciliar contra `vercel env ls` + revisión activa del ops-worker y actualizar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
3. 🟠 **`TASK-1341` — DataForSEO AIO en prod** cae como `missing_secret` en el ops-worker → los informes quedan `partial`. Falta el secret en la revisión efectiva.
4. 🟠 **Rollout de la entrada pública (`TASK-1246`, único freno formal de EPIC-020):** sign-off legal de consent + secret Turnstile + resolver la decisión de ADR abierta (¿la cara pública se embebe con `<greenhouse-form>` o se hace en el repo público?) + smoke `form→run→status→report→email`.

---

## 4. Estado por EPIC

| EPIC | Título | Lifecycle | Lectura |
|---|---|---|---|
| **EPIC-020** | Public AI Visibility Lead Magnet Program | `to-do` (spec) · **12/13 childs `complete`** | Solo **`TASK-1246` (H) `in-progress`** bloquea el cierre. El gap real: la cara pública self-serve no está encendida. |
| **EPIC-021** | AEO Brand-Aware Prompt Generation Engine | ✅ `complete` (2026-06-30) | Motor brand-aware live. Follow-up: UI de review del operador (no bloquea). |
| **EPIC-022** | Growth SEO Module (Search Visibility 360) | `to-do` (diseño) | Módulo SEO clásico, casi todo sin construir. Único avance: GSC multi-tenant (`TASK-1282`, `in-progress`, Berel conectado en staging). Bloqueador fundacional `TASK-1299` (schema) sin empezar. |
| **EPIC-023** | Growth CTA & Popup CRO Engine | `to-do` | Adyacente. Vertical-slice ancla = follow-up CTA del reporte AI Visibility en Think. No arrancado. |
| **EPIC-024** | HubSpot Portal Grader | `to-do` | Segundo lead magnet (motor en Kortex). No arrancado; childs desde `TASK-1353`. Fase 2 (OAuth) depende del cutover prod de Kortex. |

---

## 5. Inventario de tasks abiertas del programa (lifecycle real por carpeta)

> Verificado 2026-07-16. La carpeta manda sobre el texto de cabecera.

### `in-progress`

| Task | Título | Faceta | Qué desbloquea / bloquea |
|---|---|---|---|
| `TASK-1246` | (H) Public Launch Readiness + Rollout | Venta pública | **Único freno formal de EPIC-020.** Legal consent + Turnstile + flags + smoke + release. |
| `TASK-1321` | `/aeo-2/` submit auto-runs grader + emails report | Venta pública | Candidato #1 para cerrar la entrada self-serve. El grader aún no está desplegado en esa ruta. |
| `TASK-1327` | Public lead magnet landing form embed (Think) | Venta pública | Candidato #2 (landing `brand-visibility`). Sin deploy. |
| `TASK-1251` | Growth Forms ↔ Grader convergence | Venta pública | Converge el intake sobre el motor Growth Forms (wiring del self-serve). |
| `TASK-1270` | Recurring SoV + scheduled re-grade | Operativa cliente | Cadencia recurrente. Staging aplicado; E2E cliente pendiente. |
| `TASK-1269` | Fix-It Artifacts (JSON-LD / llms.txt / briefs) | Operativa cliente | Entregables accionables del diagnóstico. |
| `TASK-1330` | AI Visibility report short links | Venta / distribución | Short links para compartir el reporte. |

### `to-do`

| Task | Título | Faceta | Nota |
|---|---|---|---|
| `TASK-1276` | **AEO Operator View (Growth + Account 360)** | **Operabilidad interna — gap #1** | **Desbloqueada** (deps `TASK-1275/1279/1287` `complete`). UI pura sobre backend listo. |
| `TASK-1341` | DataForSEO AIO runtime config guard | Config / calidad | Sube informes de `partial` a completos. |
| `TASK-1281` | Headless probe runtime (CWV + WebMCP en ops-worker) | Motor / agentic-readiness | Probes de Core Web Vitals + WebMCP. |

### Config sin task formal

- Provisionar property HubSpot `aeo_check_result` (script) — ver §3.1.
- Reconciliar flags AEO multi-runtime + actualizar ledger — ver §3.2.
- Poblar `grader_profiles.organization_id` + encender `PORTAL_RUN`/`TRIAL` — ver §2.A.
- Provisionar clientes/trials más allá de Berel (decisión comercial) — ver §2.C.

---

## 6. Qué sigue ahora — secuencia recomendada (en olas)

Ordenado por ratio impacto/esfuerzo, minimizando código nuevo:

**Ola 1 — Encender lo ya hecho (config/rollout, días).** Provisionar property HubSpot (§3.1) → reconciliar flags (§3.2) → cerrar DataForSEO AIO / `TASK-1341` (§3.3). Reactiva el loop CRM y sube los informes a completos. Sin esto, lo que construyas encima nace roto.

**Ola 2 — Cara operativa interna (`TASK-1276`, UI pura sobre backend listo).** Cockpit operador + facet AEO en Account 360. Es el gap #1 y el de mejor ratio: convierte el AEO en herramienta operativa y de venta *desde donde el AM ya trabaja al cliente*.

**Ola 3 — Puerta pública self-serve (decidir y rematar `TASK-1321` o `TASK-1327` + `TASK-1246`).** Una sola entrada donde el prospecto entre solo. Es lo que hoy da 0 tráfico y es el corazón del AEO-como-herramienta-de-venta.

**Ola 4 — Cara del cliente contratado.** Promover `/aeo` a item de nav, poblar `organization_id`, encender `PORTAL_RUN`/`TRIAL` en shadow para medir costo, shippear tiering+trial fuera de mockup, activar re-grade recurrente (`TASK-1270`). En paralelo: segundo caso real de Radiografía + runbook del ciclo AEO recurrente (hoy inexistente; el conocimiento está disperso en 3 skills y 2 manuales).

**Diferido (no bloquea lo anterior):** EPIC-022 (SEO clásico, empezar por `TASK-1299` schema), EPIC-023 (CRO), EPIC-024 (HubSpot Portal Grader).

---

## 7. Nota de higiene documental (corregida 2026-07-16)

La cabecera de `EPIC-020` y su one-liner en `docs/epics/README.md` describían las child tasks C–M como "planificadas", cuando el lifecycle real (carpeta) las tiene `complete` — el único abierto es `TASK-1246`. Corregido en esta pasada para que el estado sea legible sin re-auditar. Fuente del estado: auditoría multi-agente 2026-07-16 (motor/operabilidad, cara pública, backlog, comercial) + verificación de lifecycle por carpeta.
