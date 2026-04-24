# Nexa Insights — Digest Semanal para Liderazgo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-16 por Codex
> **Ultima actualizacion:** 2026-04-24 por Claude (TASK-598 — narrativas al día con canonical vigente)
> **Documentacion tecnica:** [Greenhouse_ICO_Engine_v1.md](../../architecture/Greenhouse_ICO_Engine_v1.md), [GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md](../../architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md), [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md), [GREENHOUSE_EMAIL_CATALOG_V1.md](../../architecture/GREENHOUSE_EMAIL_CATALOG_V1.md)

## Actualizacion 2026-04-24 — Narrativas siempre al dia con la verdad actual

El digest ya no muestra nombres viejos ni referencias rotas cuando la realidad operativa cambio entre el momento en que se detecto la alerta y el momento en que el email se envia.

**Que cambio y por que**

Cada insight que llega al digest tiene adentro menciones a proyectos, responsables y spaces. Antes, esas menciones guardaban el nombre que tenian en el momento en que el sistema genero el texto. Eso producia tres problemas visibles al liderazgo:

- Un proyecto que se llamaba "Sin nombre" cuando se detecto la alerta seguia apareciendo como "Sin nombre" aunque despues alguien le hubiera puesto el nombre real.
- Alertas que ya fueron resueltas aparecian mezcladas con las actuales porque el email leia solamente el historial sin validar que la senal siguiera vigente.
- Un solo space con mucha actividad podia ocupar los 8 lugares del top y ocultar alertas de otros clientes.

**Como funciona ahora**

El email resuelve cada mencion en el momento de enviarse:

- Si el proyecto existe hoy en la base canonica, usa el nombre actual (aunque hace una semana se llamaba distinto).
- Si el proyecto ya no tiene nombre canonico (casos raros donde la fuente upstream lo perdio), usa la expresion neutra "este proyecto" — nunca muestra el placeholder crudo al ejecutivo.
- Si una alerta vieja ya no existe en la capa de signals (fue reemplazada o resuelta), se excluye del email automaticamente.
- El conteo de "insights incluidos" desduplica por senal — si la misma condicion genero alertas repetidas durante la semana, cuenta solamente la ultima version.
- Se limita a 3 insights por space para diversificar — si un tenant tiene 10 criticos, el email muestra los 3 mas importantes y deja espacio para los hallazgos de otros spaces.

**Que significa para el lector del email**

- Lo que ves en el email es lo vigente hoy, no una foto congelada de hace dias.
- Si un insight menciona un proyecto, el nombre del link es el canonico de hoy.
- El count de insights es representativo — no inflado por re-generaciones diarias.
- La distribucion por space es equilibrada.

**Que NO cambio**

- La forma del email (header, secciones por Space, cards por insight, footer) es la misma.
- Los destinatarios (liderazgo Efeonce) son los mismos.
- El schedule (lunes 7am hora Chile) es el mismo.
- El contenido de las narrativas LLM (explicacion, causa probable, accion sugerida) sigue siendo el que genera Nexa.

**Que sigue pendiente (EPIC-006)**

Esta correccion es una capa de presentacion sobre la arquitectura actual. El refactor estructural del sistema de signals — que preservara historial completo de alertas (detectadas, reconocidas, resueltas), habilitara inbox operativo, y expondra webhooks a integraciones externas — vive en EPIC-006 y llega en semanas siguientes. Cuando ese epic aterriza, el email hereda automaticamente el fix de narrativas sin cambios adicionales.

> Detalle tecnico: [`src/lib/ico-engine/ai/narrative-presentation.ts`](../../../src/lib/ico-engine/ai/narrative-presentation.ts), [`src/lib/nexa/digest/build-weekly-digest.ts`](../../../src/lib/nexa/digest/build-weekly-digest.ts), runbook de rollback en [`docs/runbooks/ico-weekly-digest-rollback.md`](../../runbooks/ico-weekly-digest-rollback.md).

---

# Nexa Insights — Digest Semanal para Liderazgo

El digest semanal de Nexa es un correo interno que resume los insights operativos mas importantes de la ultima semana y los entrega automaticamente al liderazgo de Efeonce.

La idea es simple: si una alerta o recomendacion solo vive dentro del portal, depende de que alguien entre a buscarla. El digest cambia eso y empuja lo relevante al inbox cada lunes por la manana.

---

## Que incluye

Cada envio resume los insights ya materializados por la lane advisory de Nexa sobre el serving del ICO Engine.

El digest incluye:

- periodo cubierto por el resumen
- total de insights incluidos
- distribucion por severidad (`critical`, `warning`, `info`)
- cantidad de Spaces afectados
- secciones por Space con los hallazgos mas relevantes
- narrativa explicativa en texto simple
- accion sugerida cuando el insight ya la trae materializada
- link al portal para abrir mas contexto

No intenta reemplazar el dashboard ni mostrar todo lo que existe. Es un recorte editorializado de los top insights de la semana.

---

## A quien llega

En este corte el digest se envia solo a liderazgo interno de Efeonce.

La resolucion de destinatarios se hace por rol:

- `efeonce_admin`
- `efeonce_operations`

Ademas, la lista se filtra explicitamente contra el identity store interno para evitar que un rol compartido o un destinatario externo termine recibiendo un correo que no corresponde.

---

## Cuando se envia

El envio esta programado para:

- **cada lunes**
- **07:00 AM**
- **timezone `America/Santiago`**

La ejecucion la hace Cloud Scheduler y el worker que lo procesa es `ops-worker` en Cloud Run.

---

## De donde salen los datos

El digest no calcula metricas inline dentro del correo ni corre analisis nuevos al momento de enviar.

Reutiliza:

- enrichments historicos ya materializados en `greenhouse_serving.ico_ai_signal_enrichment_history`
- deduplicacion por `enrichment_id` para no repetir reruns del mismo advisory
- ranking canonico de Nexa:
  - `critical > warning > info`
  - luego `quality_score DESC`
  - luego `processed_at DESC`

Esto mantiene el correo alineado con lo que ya consume el portal en `Pulse`, `Space 360`, `Person 360` y el workspace de agency, sin perder señales que ya salieron del snapshot actual del mes.

---

## Como se ven los enlaces

La narrativa reutiliza menciones ya materializadas por Nexa, pero el email las traduce a un formato mas natural para lectura en inbox:

- `space` -> link al Space en el portal
- `member` -> link a People
- `project` -> texto simple por ahora

Los proyectos quedan sin link porque este corte no fija todavia una ruta canonica unica para ese destino dentro del digest.

---

## Que no hace

Este digest todavia **no** hace lo siguiente:

- personalizacion por usuario
- frecuencia configurable
- delivery a Slack o Teams
- consolidacion cross-domain real fuera de ICO
- inclusion de datos financieros sensibles en el correo

En otras palabras: este es un digest **ICO-first**, interno y advisory-only.

---

## Como convive con el portal

El digest no crea una experiencia paralela. Funciona como una puerta de entrada rapida a surfaces que ya existen.

Flujo esperado:

1. liderazgo recibe el correo
2. identifica que Space o persona requiere atencion
3. abre el link al portal
4. revisa el detalle en la surface correspondiente

Si no hay insights relevantes para el periodo, el sistema puede optar por no enviar o por enviar un resumen muy corto segun la configuracion operativa vigente.

---

## Operacion manual y troubleshooting

La ejecucion programada vive fuera de Vercel. Si hace falta probarla manualmente, el endpoint canónico esta en el `ops-worker`:

```text
POST /nexa/weekly-digest
```

Ese endpoint:

1. construye el digest
2. resuelve destinatarios
3. usa el pipeline canonico de email (`sendEmail()`)
4. delega la entrega real a Resend

Si algo falla, el primer lugar para revisar es:

- Cloud Run / `ops-worker`
- Scheduler job `ops-nexa-weekly-digest`
- pipeline de email delivery

---

## Relacion con otras surfaces de Nexa

Hoy Nexa se hace visible en varias capas:

- `Agency > ICO Engine`
- `Pulse`
- `Space 360`
- `Person 360`
- `Digest semanal por email`

Todas consumen la misma base advisory ya materializada. La diferencia no esta en el calculo, sino en el formato y el momento de consumo.
