# Campañas — el trabajo en el harness

> **Greenhouse es el harness.** El **trabajo gobernado** de una campaña —epics, tasks, mini-tasks, issues y
> decisiones— vive **acá, en el repo**, con el mismo lifecycle que el resto.
> **El pensamiento y los assets viven en OneDrive** (`Alineación/2. Campañas/CMP-###_…` y
> `5. Contenidos/…`). Canon de esa parte: [`EFEONCE_CAMPAIGN_REGISTRY_V1.md`](../operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md).

## 🔴 La división, para no duplicar

| Vive en el REPO | Vive en ONEDRIVE |
|---|---|
| **Epics, tasks, mini-tasks, issues** | Brief, conceptos, copy, JTBD |
| **CDR** — decisiones de campaña | Índice de assets y su estado |
| Gates, scripts y medición instrumentada | **Los assets** (en la carpeta de su canal) |

**Regla:** si tiene lifecycle y alguien lo tiene que ejecutar y cerrar → **repo**. Si es criterio, narrativa
o archivo entregable → **OneDrive**. 🔴 **Nada se escribe en los dos lados**: se referencia.

## CDR · Campaign Decision Record

El equivalente de ADR/PDR para campañas. `CDR-###` correlativo, **nunca se reutiliza**.

| | Cuándo | Dónde |
|---|---|---|
| **ADR** | decisión de arquitectura o contrato técnico | `docs/architecture/` |
| **PDR** | decisión de producto del sitio público | `docs/public-site/` |
| 🆕 **CDR** | **decisión de UNA campaña**: territorio, canales, presupuesto, cortes, activación/pausa | `docs/campaigns/decisions/` |

⚠️ **Lo transversal NO es CDR.** El sistema de CTA, el contrato de safe zones o las reglas del registro
fotográfico **no pertenecen a una campaña**: siguen siendo ADR u operations. **Un CDR se reconoce porque, si
la campaña no existiera, la decisión no tendría sentido.**

**Estados:** `Proposed` · `Accepted` · `Superseded by CDR-###` · `Rejected` *(se conserva con su razón)*.

## Estructura

```
docs/campaigns/
├── decisions/   CDR-###-titulo.md
├── epics/       EPIC-CMP-###-titulo.md
├── tasks/       to-do · in-progress · complete   ← TASK-### del registry global
└── issues/      open · resolved                  ← ISSUE-### del registry global
```

🔴 **Los IDs de task e issue salen del registry global del repo** (`docs/tasks/TASK_ID_REGISTRY.md`), no de
uno paralelo. Una campaña no es un universo aparte: **es trabajo del mismo harness.**
Sólo `CDR-###` y `EPIC-CMP-###` tienen numeración propia.

## Para agentes
1. **Antes de abrir trabajo de campaña, lee su `BRIEF.md` en OneDrive.** El repo tiene el *qué hacer*; el
   brief tiene el *con qué criterio*.
2. **Una decisión que cambia la campaña se escribe como CDR** — si no, en tres semanas nadie sabe por qué
   se pausó un canal.
3. **No dupliques el brief acá.** Referencia su ruta.

## Registro de decisiones

- [CDR-010](decisions/CDR-010-cmp004-agencia-creativa-premium.md) · Accepted en alcance creativo: CMP-004, vía creativa premium para mid-market/enterprise. Brief completo y activación propuesta en OneDrive; email incluido; sin pauta/envíos.
- [CDR-011](decisions/CDR-011-cmp005-agencia-estrategica-premium.md) · Accepted en alcance creativo: CMP-005, vía estratégica premium para mid-market/enterprise. Brief completo y activación propuesta en OneDrive; email incluido; sin pauta/envíos.

- [CDR-009](decisions/CDR-009-cmp003-programacion-organica-octubre-2026.md) · Accepted: CMP-003 SKY programado en Metricool, IG Efeonce 13-oct 16:00, LinkedIn Efeonce 15-oct 11:00 y Julio 16-oct 11:00 (Santiago). V17 + portada V4 + copy por canal; PENDING verificado 24-sep. Registro vigente de activación; no duplicar.
- [CDR-001](decisions/CDR-001-cmp001-always-on-q4-2026.md) · Accepted: ventana, seasonality y derechos declarados.
- [CDR-002](decisions/CDR-002-cmp001-set-unico-produccion.md) · Proposed: acuerdo creativo Claude/Codex para pilotos; copy y fichas en OneDrive.
- [CDR-003](decisions/CDR-003-tu-ia-no-conoce-del-output-a-la-pieza.md) · Accepted: extensión 5B «Del output a la pieza», posición anti-AI Slop, sistema de prueba y límites de claims.
- [CDR-004](decisions/CDR-004-tu-ia-no-conoce-carril-hubspot.md) · Proposed: carril HubSpot de la narrativa; la unidad de producción es el dolor, no el Hub; gates de destino, partner y prueba.
- [CDR-005](decisions/CDR-005-cmp001-embudo-momento-y-accion.md) · Proposed: el embudo se ordena por momento del usuario y acción encadenada; mismo mundo otro ángulo; densidad de texto por etapa; el tamaño del momento manda sobre su urgencia.
- [CDR-006](decisions/CDR-006-cmp001-manifiesto-copy-y-pauta.md) · Proposed: países confirmados, copy externo y presupuesto sugerido; manifiesto operativo en OneDrive.
- [CDR-007](decisions/CDR-007-cmp001-bofu-conversion-a-landing.md) · Proposed: BOFU pasa a conversión con destino a las landings de servicio; dos bloqueos verificados (canonical AEO no propio · la landing AEO sólo ofrece la conversión de TOFU) y el evento medido como prerrequisito.
- [CDR-008](decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md) · Accepted: CMP-003 SKY, cartelas punch-v3 y cierre; película generativa y música/SFX sin voz. Correcciones y presupuesto futuro pendientes.
- [CMP-001 · Media plan Q4 2026](CMP-001-MEDIA-PLAN-Q4-2026.md) · Borrador: estructura por etapa×objetivo, reparto que cambia en el tiempo, rotación y convención UTM. Bloqueado por presupuesto, cuentas de pauta y las dos decisiones de CDR-007.

Handoff operativo de pauta: [contrato transversal](../operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md). El Markdown completo se genera junto a catálogo/CSV en Finales desde el JSON de Recursos; no duplicar copy en el repo.
