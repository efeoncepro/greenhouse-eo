# Nexa Insights — Digest Semanal para Liderazgo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-16 por Codex
> **Ultima actualizacion:** 2026-04-16 por Codex
> **Documentacion tecnica:** [GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md](../../architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md), [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md), [GREENHOUSE_EMAIL_CATALOG_V1.md](../../architecture/GREENHOUSE_EMAIL_CATALOG_V1.md)

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

- enrichments ya materializados en `greenhouse_serving.ico_ai_signal_enrichments`
- ranking canonico de Nexa:
  - `critical > warning > info`
  - luego `quality_score DESC`
  - luego `processed_at DESC`

Esto mantiene el correo alineado con lo que ya consume el portal en `Pulse`, `Space 360`, `Person 360` y el workspace de agency.

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
