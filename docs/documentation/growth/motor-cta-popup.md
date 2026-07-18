# Motor de CTAs y Popups — `growth.cta`

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-07-17 por Claude (TASK-1339)
> **Ultima actualizacion:** 2026-07-18 por Claude (TASK-1428: suppression/frequency capping en shadow + exposición Tier B + kill switches operables sin redeploy)
> **Documentacion tecnica:** [GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md)
> **Skill de dominio:** `greenhouse-growth-ctas` (Claude + Codex; se actualiza con cada cambio del motor)

## Qué es

El motor de CTAs es el sistema que decide **qué invitación a la acción (prompt de conversión) se muestra en cada página pública** de Efeonce (Think, sitio WordPress y futuras superficies), con gobernanza central en Greenhouse. En vez de pegar botones o banners a mano en cada página, un operador define el CTA una vez, lo publica, y todas las superficies muestran **el mismo contrato publicado** — con evidencia de conversión auditable y medición hacia Google Tag Manager / GA4.

## Estado actual (2026-07-18): EN PRODUCCIÓN

- La primera rebanada está **live en las dos superficies**: el CTA `ai-visibility-report-followup` ("¿Cómo ve la IA a tu marca?") se muestra al final del **reporte público de AI Visibility en Think** (`think.efeoncepro.com/brand-visibility/r/…`) y en la **página de prueba de WordPress** (`efeoncepro.com/greenhouse-cta-prueba/`, no indexable — el operador decidió validar en una página de prueba antes del despliegue amplio).
- El flag `GROWTH_CTA_ENGINE_ENABLED` está **encendido en staging y producción**.
- La medición está **completa y verificada de extremo a extremo en ambos hosts** (TASK-1427): eventos en el dataLayer, hits reales llegando a GA4, registro server-side en el ledger y rechazo comprobado de credenciales forjadas.
- Falta por decisión del negocio: el **placement amplio en WordPress** (qué páginas, tras validar la prueba), el placement **interruptivo** (popup/slide-in) y el cockpit de autoría visual (hoy se autora por API/CLI).

## Cómo funciona (en simple)

1. **Un CTA se define y se versiona.** Cada versión tiene su texto, su ubicación (embebido, banner…), su **variante visual** (`default`, `spotlight` con gradiente de marca, `minimal` editorial — es un dato de la versión, no código), su acción y sus reglas de dónde aparece. Una versión publicada **no se puede editar**: cualquier cambio crea una versión nueva. Así siempre se sabe exactamente qué vio el visitante.
2. **El servidor decide qué se muestra.** Cuando una página pregunta "¿qué CTA va aquí?", Greenhouse evalúa las reglas y responde con el resultado ya resuelto: **a lo sumo un prompt interruptivo** más los no-interruptivos que apliquen. El navegador nunca ve las reglas ni los candidatos descartados. Si nada aplica (o el motor está apagado), la página no muestra nada — jamás un card roto.
3. **La acción abre un Growth Form.** La única acción de esta etapa es abrir un formulario del motor Growth Forms (el del AI Visibility Grader). El CTA solo guarda la referencia al form — nunca copia sus campos, validación ni consentimiento; la conversión "de verdad" sigue siendo del formulario (`generate_lead`).
4. **La evidencia se guarda con desconfianza sana.** Lo que reporta el navegador queda marcado como `browser_reported` (direccional); solo lo confirmado por el servidor (`server_confirmed`) cuenta como conversión en reportes. Los intentos forjados (superficie o versión falsa, credencial inválida) se **rechazan y quedan registrados** sin datos personales — alimentan la señal de seguridad.
5. **Todo se mide.** Cada vista/click/cierre/apertura de form emite un evento `greenhouse_cta_*` al dataLayer (con una lista blanca dura de parámetros, sin PII) y además se registra server-side en el ledger. GTM los reenvía a GA4, donde se reportan por `cta_slug`/`cta_location`/`placement`.

> Detalle técnico: primitive en `src/lib/growth/ctas/`; renderer portable `src/growth-cta-renderer/` (`<greenhouse-cta>`, ~23KB sin frameworks); API pública `GET /api/public/growth/ctas/render` + `POST /api/public/growth/ctas/events`; API admin `/api/admin/growth/ctas/**`.

## Dónde se gobierna: `/growth/ctas` (menú Growth)

La superficie de gobernanza vive en el **menú Growth** (junto a AEO y Forms), visible para roles operadores internos (`efeonce_admin`, `efeonce_account`, `efeonce_operations`; los roles cliente nunca la ven). Ahí el operador:

- ve el **inventario** de CTAs con su estado (`Borrador → En revisión → Publicado → Pausado → Deprecado → Archivado`), campaña y versión;
- ejecuta el **lifecycle**: enviar a revisión, publicar (con confirmación — deprecia la versión anterior), **pausar** (freno de emergencia: deja de mostrarse en ~2 minutos) y reanudar;
- ve las **surfaces registradas** (hosts autorizados con sus origins y credencial — nunca el secreto);
- usa el **preview del renderer** con las variantes visuales, tal cual se ve en un host público.

## Quién puede operarlo

| Acción | Capability |
| --- | --- |
| Ver CTAs, versiones y reportes | `growth.cta.read` |
| Crear/editar borradores | `growth.cta.author` |
| Publicar, deprecar, archivar y gestionar superficies | `growth.cta.publish` |
| Pausar/reanudar (freno de emergencia) | `growth.cta.pause` |
| Kill switch global/per-surface (engage/release) | `growth.cta.pause` |

`pause` es una capability separada a propósito: frenar un CTA problemático no exige autoridad de publicación. El kill switch usa esa misma autoridad.

## Respeto al visitante (suppression) y frenos de emergencia — TASK-1428

El motor recuerda de forma pseudónima (solo hashes, nunca datos personales) si un visitante ya cerró un CTA, ya convirtió, o ya vio demasiados prompts interruptivos — y decide en el servidor no volver a mostrárselo dentro de la ventana correspondiente. Sin consentimiento del visitante el recuerdo dura solo la sesión, y los formatos interruptivos directamente no se muestran a visitantes sin identidad. Hoy esta decisión corre **en shadow**: se registra qué se habría suprimido, sin cambiar lo que se muestra; el enforcement se activa por flag tras comparar.

La exposición masiva (cuántas veces se mostró/suprimió/vio un CTA) se guarda **agregada por hora** en una tabla analítica aparte — nunca infla el ledger de conversión. Y ante un incidente, el operador puede apagar el motor completo o una sola superficie **al instante y sin deploy** (kill switch con auditoría de quién/cuándo/por qué); mientras esté activo, una señal en warning lo hace visible.

> Detalle técnico: `cta_visitor_state` + `cta_exposure_rollup` + `cta_kill_switch_event` (migración TASK-1428); decisión en [src/lib/growth/ctas/suppression.ts](../../../src/lib/growth/ctas/suppression.ts); kill switch en [src/lib/growth/ctas/kill-switch.ts](../../../src/lib/growth/ctas/kill-switch.ts) + `POST /api/admin/growth/ctas/kill-switch`. Arquitectura §24 (Delta 2026-07-18).

## Señales de salud

Visibles en `/admin/operations` (el dashboard transversal de salud de plataforma — la operación del *programa* vive en `/growth/ctas`; la salud de la *máquina* converge con la de todos los módulos): errores de render, errores de ingest, intentos no autorizados/forjados, handoffs rotos hacia formularios (un CTA publicado apuntando a un form despublicado se excluye del render y alerta), kill switch activo (visible mientras dure el retiro), colisiones de prioridad interruptiva y backpressure del sink de exposición. Todas en steady 0.

> Detalle técnico: [src/lib/reliability/queries/growth-cta-signals.ts](../../../src/lib/reliability/queries/growth-cta-signals.ts). Manual de operación: [operar-motor-cta.md](../../manual-de-uso/growth/operar-motor-cta.md).
