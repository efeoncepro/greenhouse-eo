# PDR-007 — Posicionamiento del "HubSpot Portal Grader" (lead magnet + gancho a la venta)

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento) — sesión de diseño con el operador, 2026-07-07.
> **Skills:** `commercial-expert`, `growth-marketing-cro`, `seo-aeo`, `copywriting`, `arch-architect` (boundary), `efeonce-public-site-wordpress`.
> **Ejecución:** [`EPIC-024`](../../epics/to-do/EPIC-024-hubspot-portal-grader.md) (programa faseado). Arquitectura/contrato técnico: [`GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`](../../architecture/GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md) (ADR). Superficie hermana: [PDR-006](PDR-006-landing-hubspot-agentic-platform-posicionamiento.md) (la landing que la ofrece).
> **No-duplicación:** este PDR **cita**, no copia: [PDR-006](PDR-006-landing-hubspot-agentic-platform-posicionamiento.md) (posicionamiento de la landing HubSpot + RevOps programático), [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (Kortex = eje de plataformas; Greenhouse le pide comandos gobernados), [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md)/[PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (patrón de lead magnet + grader como nodo de conversión), el ADR técnico (arriba) y `docs/context/08_estrategia-comercial.md` (Kortex como capacidad diferencial).

## Contexto

PDR-006 posicionó la landing `/servicios-contratar-hubspot/` con oferta de dos escalones: "Agenda una reunión" + "Solicita un diagnóstico de tu portal HubSpot". El **diagnóstico** quedó como entregable diferido. El operador decidió construirlo como un **lead magnet propio**, con el mismo flywheel del **AI Visibility Grader** (motor → superficie pública en Think → captura gobernada → handoff HubSpot), pero con el motor en **Kortex** (que ya audita portales HubSpot). Este PDR fija el **posicionamiento** del lead magnet; el ADR fija su arquitectura.

La diferencia estructural con el AI Visibility Grader (que ancla el modelo de dos puertas): el grader AEO **no necesita datos del prospecto**; un diagnóstico de portal **sí**. Nadie conecta su HubSpot productivo por OAuth como gancho frío. Por eso el producto tiene **dos puertas sobre un motor** (mismo patrón "un motor, N puertas" del entitlement de la plataforma).

## Decisión — cuatro capas que se refuerzan

### 1. Ángulo: un diagnóstico honesto, no un "test de marketing"

Registro sobrio (validado con `copywriting`, coherente con PDR-006): el lead magnet entrega **un diagnóstico de madurez de tu operación en HubSpot** con hallazgos accionables — no un puntaje vanidoso ni un pretexto para pedir el correo.

- Idea única: **"Descubre qué tan lejos está tu HubSpot de operar solo (con agentes) — y qué falta para llegar."** Mide la base ordenada (datos, procesos, permisos) que el RevOps programático y los agentes necesitan.
- Regla dura: hallazgos concretos + siguiente paso claro; **nunca** un score sin sustancia ni una promesa que el diagnóstico no cumple.

### 2. Dos puertas sobre un motor (la puerta pública es el gancho; la conectada es la conversión)

- **Puerta pública — self-assessment de madurez (sin OAuth).** Cuestionario corto; el motor Kortex puntúa contra un modelo de madurez. Reporte público estilo grader en Think. Es el lead magnet self-serve — **fricción baja, sin tocar el portal del prospecto**.
- **Puerta conectada — auditoría real (OAuth).** El Portal Audit de Kortex sobre el HubSpot del prospecto, tras puerta **trial/contratada**. Es el entregable profundo que convierte: del "esto es lo que tu self-assessment sugiere" al "esto es lo que tu portal realmente muestra".
- El puente entre puertas es el argumento de venta: el self-assessment abre la conversación; la auditoría conectada la cierra.

### 3. Ejecución: superficie en Think, captura gobernada, sin motor nuevo

- Superficie pública en **Think** (`think.efeoncepro.com/hubspot-portal/...`), render headless (Think pinta, Greenhouse computa), espejo de `/brand-visibility`.
- Captura vía `<greenhouse-form>` (`efeonce-hubspot-portal-audit`, config del contrato existente; HubSpot delivery `disabled` hasta cutover) — reuso, no motor nuevo.
- **Motor en Kortex** (`kortex.audit.run`); Greenhouse orquesta. Contrato completo en el ADR.

### 4. Marca, oferta y conversión

- **Lidera Efeonce**; Kortex se nombra como la plataforma propia que hace el diagnóstico (y que está publicada en el HubSpot Marketplace — proof verificable). Tuteo es-LATAM neutro, pan-hispano, sin voseo.
- **Rol en el embudo:** nodo de conversión compartido — la landing HubSpot (PDR-006) enlaza a la puerta pública; la puerta pública ofrece la reunión + la auditoría conectada. Alimenta el portal HubSpot `48713323` (co-sell).
- **Prueba:** hallazgos reales del propio diagnóstico + Kortex-en-Marketplace. Sin tier de partner; sin sobre-claim.

## Consecuencias

- El "diagnóstico de portal" de PDR-006/TASK-1352 pasa de form a **producto real**; el CTA secundario de la landing apunta a esta superficie (Delta en PDR-006/TASK-1352).
- Think gana un **segundo lead magnet** (junto al AI Visibility Grader), reforzando el eje de adquisición.
- **Faseado:** la **puerta pública (self-assessment) va primero** — no depende del cutover a producción de la integración Kortex. La puerta conectada (OAuth) es Fase 2, gateada por seguridad/PII + Kortex prod.
- Superficie Think vive en el repo `efeonce-think` (cross-repo, Codex concurrente); coordinar con su control plane.
- Gaps a resolver en ejecución: modelo de madurez/rubric (autoría Kortex), OAuth app least-privilege para la puerta conectada, entregable operativo de la auditoría.

## Alternativas descartadas

- **Solo puerta conectada (OAuth desde el inicio)** — alta fricción; no funciona como lead magnet frío (queda como entregable de venta = la puerta contratada).
- **Solo self-assessment (sin auditoría conectada nunca)** — pierde la profundidad real de Kortex, que es el diferenciador y la conversión.
- **Reimplementar el motor en Greenhouse** — viola el boundary Kortex (PDR-003) y el SSOT; rompe la narrativa Kortex-en-Marketplace.
- **Meterlo en la landing (TASK-1352) como un form más** — subdimensiona el producto; el lead magnet merece superficie propia en Think (patrón del grader).
- **Extender EPIC-020 (AI Visibility)** — motor distinto (Kortex peer), boundary distinto; es un programa paralelo (EPIC-024) que espeja el patrón, no lo comparte.

## No-goals

- No es self-serve del portal Greenhouse ni expone datos de cliente.
- No afirma un tier de partner (Diamond/Platinum/Gold).
- No presenta la integración interna Greenhouse↔Kortex como productiva (es staging); posiciona el producto Kortex.
- No promete la puerta conectada (OAuth) en Fase 1.
- No reimplementa el motor de auditoría ni construye un motor de forms nuevo.
- No guarda el CRM crudo del prospecto (data-minimization; solo score/métricas — ver ADR).
